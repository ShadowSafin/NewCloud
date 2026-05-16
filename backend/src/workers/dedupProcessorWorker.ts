import { Worker, Job } from "bullmq";
import fs from "fs";
import { createRedisConnection } from "../lib/redis";
import { prisma } from "../db";

interface DedupJobData {
  fileId: string;
  hash: string;
}

export function createDedupProcessorWorker(): Worker {
  const worker = new Worker(
    "dedup-processor",
    async (job: Job<DedupJobData>) => {
      const { fileId, hash } = job.data;
      console.log(`Checking dedup for file ${fileId} (hash: ${hash})`);

      const file = await prisma.file.findUnique({ where: { id: fileId } });
      if (!file) throw new Error(`File ${fileId} not found`);
      if (!hash) return { deduplicated: false, reason: "no hash" };

      // Find other files with same hash for same user (not deleted, not this file)
      const duplicates = await prisma.file.findMany({
        where: {
          hash,
          userId: file.userId,
          deletedAt: null,
          id: { not: fileId },
          refCount: { gt: 0 },
        },
        orderBy: { createdAt: "asc" },
      });

      if (duplicates.length === 0) {
        return { deduplicated: false, reason: "no duplicates" };
      }

      // Found duplicate - reuse the oldest file's physical storage
      const original = duplicates[0];

      // Verify the original's physical file exists
      if (!fs.existsSync(original.path)) {
        console.log(`Original file ${original.id} physical file missing, skipping dedup`);
        return { deduplicated: false, reason: "original missing" };
      }

      // Delete the duplicate's physical file
      if (file.path !== original.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }

      // Update the duplicate to point to original's physical file
      await prisma.file.update({
        where: { id: fileId },
        data: {
          storedName: original.storedName,
          path: original.path,
        },
      });

      // Increment refCount on the original
      await prisma.file.update({
        where: { id: original.id },
        data: { refCount: { increment: 1 } },
      });

      console.log(`File ${fileId} deduplicated to original ${original.id}`);
      return { deduplicated: true, originalId: original.id };
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Dedup job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Dedup job ${job?.id} failed:`, err.message);
  });

  return worker;
}
