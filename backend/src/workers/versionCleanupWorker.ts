import { Worker, Job } from "bullmq";
import fs from "fs";
import { createRedisConnection } from "../lib/redis";
import { prisma } from "../db";
import { config } from "../config";

interface VersionCleanupJobData {
  fileId: string;
}

export function createVersionCleanupWorker(): Worker {
  const worker = new Worker(
    "version-cleanup",
    async (job: Job<VersionCleanupJobData>) => {
      const { fileId } = job.data;
      const maxVersions = config.maxVersionsPerFile;

      console.log(`Cleaning up versions for file ${fileId} (max: ${maxVersions})`);

      const versions = await prisma.fileVersion.findMany({
        where: { fileId },
        orderBy: { version: "desc" },
      });

      if (versions.length <= maxVersions) {
        return { deleted: 0, remaining: versions.length };
      }

      // Delete oldest versions beyond the limit
      const toDelete = versions.slice(maxVersions);
      let deletedCount = 0;

      for (const version of toDelete) {
        try {
          if (fs.existsSync(version.path)) fs.unlinkSync(version.path);
        } catch {}

        await prisma.fileVersion.delete({ where: { id: version.id } });
        deletedCount++;
      }

      console.log(`Cleaned up ${deletedCount} versions for file ${fileId}`);
      return { deleted: deletedCount, remaining: versions.length - deletedCount };
    },
    {
      connection: createRedisConnection(),
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Version cleanup job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Version cleanup job ${job?.id} failed:`, err.message);
  });

  return worker;
}
