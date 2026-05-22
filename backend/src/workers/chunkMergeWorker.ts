import { Worker, Job } from "bullmq";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createRedisConnection } from "../lib/redis";
import { thumbnailQueue } from "../lib/queues";
import { prisma } from "../db";
import { storageService } from "../services/storageService";
import { fileTypeService } from "../services/fileTypeService";
import { dedupService } from "../services/dedupService";
import { VersionService } from "../services/versionService";

interface ChunkMergeJobData {
  sessionId: string;
  userId: string;
}

export function createChunkMergeWorker(): Worker {
  const worker = new Worker(
    "chunk-merge",
    async (job: Job<ChunkMergeJobData>) => {
      const { sessionId, userId } = job.data;
      console.log(`Merging chunks for session ${sessionId}`);

      const session = await prisma.uploadSession.findUnique({
        where: { id: sessionId },
        include: { chunks: { orderBy: { chunkIndex: "asc" } } },
      });

      if (!session) throw new Error(`Session ${sessionId} not found`);
      if (session.status === "completed" || session.status === "cancelled") {
        console.log(`Session ${sessionId} already ${session.status}, skipping`);
        return;
      }

      // Merge chunks into final file using streams
      const ext = path.extname(session.filename);
      const storedName = `${sessionId}${ext}`;
      const filePath = path.join(storageService.getUserFilesPath(userId), storedName);

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Stream-based merge with SHA-256 computation
      const hash = crypto.createHash("sha256");
      const writeStream = fs.createWriteStream(filePath);

      for (const chunk of session.chunks) {
        if (!fs.existsSync(chunk.path)) {
          throw new Error(`Chunk file missing: ${chunk.path}`);
        }

        await new Promise<void>((resolve, reject) => {
          const readStream = fs.createReadStream(chunk.path);
          readStream.on("data", (chunk: string | Buffer) => {
            const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            hash.update(data);
            if (!writeStream.write(data)) {
              readStream.pause();
              writeStream.once("drain", () => readStream.resume());
            }
          });
          readStream.on("end", () => resolve());
          readStream.on("error", reject);
        });
      }

      writeStream.end();
      await new Promise<void>((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      // Dynamic Binary Signature Validation (Magic-Number validation)
      const isSignatureValid = await fileTypeService.validateSignature(filePath, session.mimeType);
      if (!isSignatureValid) {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {}
        throw new Error("File signature mismatch: the file contents do not match the expected type or extension");
      }

      const fileHash = hash.digest("hex");
      const versionService = new VersionService(prisma);

      // Check for deduplication
      const existingFile = await prisma.file.findFirst({
        where: { hash: fileHash, userId, deletedAt: null },
      });

      let finalPath = filePath;
      let finalStoredName = storedName;

      if (existingFile) {
        finalPath = existingFile.path;
        finalStoredName = existingFile.storedName;
        try { fs.unlinkSync(filePath); } catch {}

        // Increment refCount on ALL files sharing this physical path
        const newRefCount = existingFile.refCount + 1;
        await prisma.file.updateMany({
          where: { path: existingFile.path },
          data: { refCount: newRefCount },
        });
      }

      // Check for duplicate filename in the same folder
      const existingFileWithName = await prisma.file.findFirst({
        where: {
          originalName: session.filename,
          folderId: session.folderId,
          userId,
          deletedAt: null,
        },
      });

      const fileInfo = fileTypeService.getFileInfo(session.filename, session.mimeType);
      let file;

      if (existingFileWithName) {
        // 1. Create a version backup of the existing file
        await versionService.createVersion(userId, existingFileWithName.id);

        // 2. Safely release/delete the previous physical file
        await dedupService.releaseFile(existingFileWithName);

        // 3. Update the existing file record with the new properties
        file = await prisma.file.update({
          where: { id: existingFileWithName.id },
          data: {
            storedName: finalStoredName,
            path: finalPath,
            mimeType: session.mimeType,
            category: fileInfo.category,
            size: BigInt(Number(session.totalSize)),
            hash: fileHash,
            refCount: existingFile ? existingFile.refCount + 1 : 1,
            thumbnail: null,
            thumbnailSmall: null,
            thumbnailMedium: null,
            thumbnailLarge: null,
          },
        });

        // Update user storage net change
        await prisma.user.update({
          where: { id: userId },
          data: {
            storageUsed: {
              increment: Number(session.totalSize) - Number(existingFileWithName.size),
            },
          },
        });
      } else {
        // No duplicate filename exists - create new file record
        file = await prisma.file.create({
          data: {
            userId,
            folderId: session.folderId,
            originalName: session.filename,
            storedName: finalStoredName,
            path: finalPath,
            mimeType: session.mimeType,
            category: fileInfo.category,
            size: BigInt(Number(session.totalSize)),
            hash: fileHash,
            refCount: existingFile ? existingFile.refCount + 1 : 1,
          },
        });

        // Update user storage
        await prisma.user.update({
          where: { id: userId },
          data: { storageUsed: { increment: Number(session.totalSize) } },
        });
      }

      // Mark session completed
      await prisma.uploadSession.update({
        where: { id: sessionId },
        data: { status: "completed", completedAt: new Date(), hash: fileHash, fileId: file.id },
      });

      // Clean up chunk files
      for (const chunk of session.chunks) {
        try { fs.unlinkSync(chunk.path); } catch {}
      }

      // Enqueue thumbnail generation
      if (fileInfo.canThumbnail) {
        await thumbnailQueue.add("generate", { fileId: file.id }).catch((err) => {
          console.error("Failed to enqueue thumbnail job:", err.message);
        });
      }

      console.log(`Session ${sessionId} merged successfully. File: ${file.id}`);
      return { fileId: file.id, hash: fileHash };
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Chunk merge job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Chunk merge job ${job?.id} failed:`, err.message);
    // Mark session as failed
    if (job?.data?.sessionId) {
      prisma.uploadSession.update({
        where: { id: job.data.sessionId },
        data: { status: "failed" },
      }).catch(() => {});
    }
  });

  return worker;
}
