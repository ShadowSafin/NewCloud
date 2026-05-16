import { Worker } from "bullmq";
import { trashCleanupQueue } from "../lib/queues";
import { createThumbnailWorker } from "./thumbnailWorker";
import { createChunkMergeWorker } from "./chunkMergeWorker";
import { createTrashCleanupWorker } from "./trashCleanupWorker";
import { createFileHashWorker } from "./fileHashWorker";
import { createDedupProcessorWorker } from "./dedupProcessorWorker";
import { createVersionCleanupWorker } from "./versionCleanupWorker";
import { createStorageCalcWorker } from "./storageCalcWorker";

export function startAllWorkers(): Worker[] {
  const workers: Worker[] = [];

  // Thumbnail generation (existing)
  workers.push(createThumbnailWorker());

  // Chunk merge (new)
  workers.push(createChunkMergeWorker());

  // Trash cleanup (new)
  workers.push(createTrashCleanupWorker());

  // File hashing (new)
  workers.push(createFileHashWorker());

  // Deduplication (new)
  workers.push(createDedupProcessorWorker());

  // Version cleanup (new)
  workers.push(createVersionCleanupWorker());

  // Storage calculation (new)
  workers.push(createStorageCalcWorker());

  // Schedule daily trash cleanup at 2 AM
  trashCleanupQueue.add("cleanup", {}, {
    repeat: { pattern: "0 2 * * *" },
    removeOnComplete: 10,
    removeOnFail: 5,
  }).catch((err) => {
    console.error("Failed to schedule trash cleanup:", err.message);
  });

  console.log(`Started ${workers.length} workers`);
  return workers;
}

export async function stopAllWorkers(workers: Worker[]): Promise<void> {
  console.log("Stopping all workers...");
  await Promise.all(workers.map((w) => w.close()));
  console.log("All workers stopped");
}
