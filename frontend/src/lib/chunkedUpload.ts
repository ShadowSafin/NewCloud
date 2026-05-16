import { apiClient } from "./api";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CONCURRENT = 3;
const MAX_RETRIES = 3;
const STORAGE_KEY = "cloudstore-upload-queue";

export interface UploadSession {
  sessionId: string;
  chunkSize: number;
  totalChunks: number;
  filename: string;
  totalSize: number;
}

export interface UploadTask {
  id: string;
  file: File;
  sessionId: string;
  filename: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  failedChunks: Map<number, number>; // chunkIndex -> retryCount
  status: "pending" | "uploading" | "paused" | "merging" | "completed" | "failed" | "cancelled";
  progress: number;
  speed: number; // bytes per second
  error?: string;
  folderId?: string;
  startedAt?: number;
  completedAt?: number;
}

interface PersistedTask {
  id: string;
  sessionId: string;
  filename: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  status: string;
  folderId?: string;
}

// --- API helpers ---

export async function initiateUpload(
  filename: string,
  mimeType: string,
  totalSize: number,
  folderId?: string
): Promise<UploadSession> {
  const res = await apiClient.post("/uploads/initiate", {
    filename,
    mimeType,
    totalSize,
    folderId,
  });
  return res.data.data;
}

export async function uploadChunk(
  sessionId: string,
  chunkIndex: number,
  data: Blob,
  hash?: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const formData = new FormData();
  formData.append("chunk", data);
  if (hash) formData.append("hash", hash);

  await apiClient.post(`/uploads/${sessionId}/chunk/${chunkIndex}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(e.loaded, e.total);
    },
  });
}

export async function completeUpload(sessionId: string): Promise<any> {
  const res = await apiClient.post(`/uploads/${sessionId}/complete`);
  return res.data.data;
}

export async function cancelUpload(sessionId: string): Promise<void> {
  await apiClient.post(`/uploads/${sessionId}/cancel`);
}

export async function getUploadStatus(sessionId: string): Promise<any> {
  const res = await apiClient.get(`/uploads/status/${sessionId}`);
  return res.data.data;
}

export async function getResumeInfo(sessionId: string): Promise<any> {
  const res = await apiClient.get(`/uploads/${sessionId}/resume`);
  return res.data.data;
}

// --- Chunk hashing ---

async function computeChunkHash(data: Blob): Promise<string> {
  const buffer = await data.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --- Promise pool for concurrency control ---

async function promisePool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array(Math.min(concurrency, tasks.length))
    .fill(null)
    .map(() => worker());
  await Promise.all(workers);
  return results;
}

// --- Persistence ---

function persistQueue(tasks: Map<string, UploadTask>): void {
  const serializable: PersistedTask[] = [];
  tasks.forEach((task) => {
    if (task.status === "completed" || task.status === "cancelled") return;
    serializable.push({
      id: task.id,
      sessionId: task.sessionId,
      filename: task.filename,
      totalSize: task.totalSize,
      chunkSize: task.chunkSize,
      totalChunks: task.totalChunks,
      uploadedChunks: Array.from(task.uploadedChunks),
      status: task.status,
      folderId: task.folderId,
    });
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {}
}

export function loadPersistedTasks(): PersistedTask[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearPersistedTasks(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// --- Upload task management ---

const activeUploads = new Map<string, AbortController>();

export async function uploadFileChunked(
  file: File,
  folderId?: string,
  onProgress?: (task: UploadTask) => void,
  existingId?: string,
  existingTask?: UploadTask
): Promise<UploadTask> {
  // Initiate session
  const mimeType = file.type || "application/octet-stream";
  const session = await initiateUpload(file.name, mimeType, file.size, folderId);

  // Use existing task object if provided (shared reference with store)
  const task: UploadTask = existingTask || {
    id: existingId || `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    sessionId: session.sessionId,
    filename: file.name,
    totalSize: file.size,
    chunkSize: session.chunkSize,
    totalChunks: session.totalChunks,
    uploadedChunks: new Set(),
    failedChunks: new Map(),
    status: "uploading",
    progress: 0,
    speed: 0,
    folderId,
    startedAt: Date.now(),
  };

  // Update session info on the existing task
  task.sessionId = session.sessionId;
  task.chunkSize = session.chunkSize;
  task.totalChunks = session.totalChunks;

  // Start upload (don't await - let it run in background)
  runUpload(task, onProgress);
  return task;
}

export async function resumeUpload(
  persistedTask: PersistedTask,
  file: File,
  onProgress?: (task: UploadTask) => void
): Promise<UploadTask> {
  // Get current status from server
  const info = await getResumeInfo(persistedTask.sessionId);

  const task: UploadTask = {
    id: persistedTask.id,
    file,
    sessionId: persistedTask.sessionId,
    filename: persistedTask.filename,
    totalSize: persistedTask.totalSize,
    chunkSize: persistedTask.chunkSize,
    totalChunks: persistedTask.totalChunks,
    uploadedChunks: new Set(info.pendingChunks.length === 0 ? [] : persistedTask.uploadedChunks),
    failedChunks: new Map(),
    status: "uploading",
    progress: 0,
    speed: 0,
    folderId: persistedTask.folderId,
    startedAt: Date.now(),
  };

  // If all chunks are done, just complete
  if (info.pendingChunks.length === 0) {
    task.status = "merging";
    task.progress = 1;
    await completeUpload(task.sessionId);
    task.status = "completed";
    task.completedAt = Date.now();
    return task;
  }

  // Resume uploading remaining chunks
  await runUpload(task, onProgress, info.pendingChunks);
  return task;
}

async function runUpload(
  task: UploadTask,
  onProgress?: (task: UploadTask) => void,
  pendingChunkIndices?: number[]
): Promise<void> {
  const chunksToUpload = pendingChunkIndices || [];
  if (chunksToUpload.length === 0) {
    for (let i = 0; i < task.totalChunks; i++) {
      if (!task.uploadedChunks.has(i)) chunksToUpload.push(i);
    }
  }

  let bytesUploaded = task.uploadedChunks.size * task.chunkSize;
  const startTime = Date.now();

  const uploadSingleChunk = async (chunkIndex: number): Promise<void> => {
    if (task.status === "paused" || task.status === "cancelled") return;

    const start = chunkIndex * task.chunkSize;
    const end = Math.min(start + task.chunkSize, task.totalSize);
    const chunk = task.file.slice(start, end);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Re-check status before each attempt
        if ((task.status as string) === "paused" || (task.status as string) === "cancelled") return;

        const hash = await computeChunkHash(chunk);
        await uploadChunk(task.sessionId, chunkIndex, chunk, hash);

        task.uploadedChunks.add(chunkIndex);
        task.failedChunks.delete(chunkIndex);
        bytesUploaded += end - start;

        // Calculate speed
        const elapsed = (Date.now() - startTime) / 1000;
        task.speed = elapsed > 0 ? bytesUploaded / elapsed : 0;
        task.progress = task.uploadedChunks.size / task.totalChunks;

        onProgress?.(task);
        return;
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) {
          task.failedChunks.set(chunkIndex, MAX_RETRIES);
          throw err;
        }
        // Exponential backoff
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  };

  try {
    await promisePool(
      chunksToUpload.map((idx) => () => uploadSingleChunk(idx)),
      MAX_CONCURRENT
    );

    if (task.status === "cancelled") return;

    // All chunks uploaded, complete
    task.status = "merging";
    onProgress?.(task);

    await completeUpload(task.sessionId);
    task.status = "completed";
    task.progress = 1;
    task.completedAt = Date.now();
    onProgress?.(task);
  } catch (err: any) {
    if (task.status !== "paused" && task.status !== "cancelled") {
      task.status = "failed";
      task.error = err.message || "Upload failed";
      onProgress?.(task);
    }
  }
}

export function pauseUploadTask(task: UploadTask): void {
  task.status = "paused";
}

export function cancelUploadTask(task: UploadTask): void {
  task.status = "cancelled";
  cancelUpload(task.sessionId).catch(() => {});
}

export function retryFailedChunks(
  task: UploadTask,
  onProgress?: (task: UploadTask) => void
): Promise<void> {
  const failedIndices = Array.from(task.failedChunks.keys());
  task.failedChunks.clear();
  task.status = "uploading";
  return runUpload(task, onProgress, failedIndices);
}

// Check if file should use chunked upload (>10MB)
export function shouldUseChunkedUpload(file: File): boolean {
  return file.size > 10 * 1024 * 1024;
}
