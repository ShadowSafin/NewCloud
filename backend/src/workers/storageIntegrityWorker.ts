import { Worker, Job } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { storageAccountingService } from "../services/storageAccountingService";

interface StorageIntegrityJobData {
  userId?: string;
}

export function createStorageIntegrityWorker(): Worker {
  const worker = new Worker(
    "storage-integrity",
    async (job: Job<StorageIntegrityJobData>) => {
      const repaired = await storageAccountingService.repairStorageIntegrity(job.data.userId);
      if (repaired.length > 0) {
        console.warn("[Integrity] Repaired storage accounting drift", repaired.map((issue) => ({
          ...issue,
          expected: issue.expected.toString(),
          actual: issue.actual.toString(),
        })));
      }
      return { repaired: repaired.length };
    },
    { connection: createRedisConnection(), concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`Storage integrity job ${job?.id} failed:`, err.message);
  });

  return worker;
}
