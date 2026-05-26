import { Worker, Job } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { thumbnailService } from "../services/thumbnailService";

export function createThumbnailWorker(): Worker {
  const worker = new Worker(
    "thumbnail-generation",
    async (job: Job) => {
      const { fileId } = job.data;
      console.log(`[Worker] Processing thumbnail job for file ${fileId}`);
      try {
        await thumbnailService.processUploadedFile(fileId);
        console.log(`[Worker] Thumbnail job completed for file ${fileId}`);
      } catch (error) {
        console.error(`[Worker] Thumbnail job failed for file ${fileId}:`, error);
        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Thumbnail job ${job.id} completed for file ${job.data.fileId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Thumbnail job ${job?.id} failed:`, err.message);
  });

  return worker;
}
