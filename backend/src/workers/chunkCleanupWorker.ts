import { Worker } from "bullmq";
import fs from "fs";
import { createRedisConnection } from "../lib/redis";
import { prisma } from "../db";

export function createChunkCleanupWorker(): Worker {
  const worker = new Worker(
    "chunk-cleanup",
    async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const staleSessions = await prisma.uploadSession.findMany({
        where: {
          status: { in: ["pending", "uploading", "failed", "cancelled"] },
          updatedAt: { lt: cutoff },
        },
        include: { chunks: true },
      });

      let chunksDeleted = 0;
      for (const session of staleSessions) {
        for (const chunk of session.chunks) {
          try {
            if (fs.existsSync(chunk.path)) {
              fs.unlinkSync(chunk.path);
              chunksDeleted++;
            }
          } catch {}
        }
        if (session.status !== "cancelled") {
          await prisma.uploadSession.update({
            where: { id: session.id },
            data: { status: "cancelled" },
          });
        }
      }

      if (chunksDeleted > 0) {
        console.warn(`[Integrity] Cleaned up ${chunksDeleted} stale upload chunk(s)`);
      }
      return { sessions: staleSessions.length, chunksDeleted };
    },
    { connection: createRedisConnection(), concurrency: 1 }
  );

  worker.on("failed", (job, err) => {
    console.error(`Chunk cleanup job ${job?.id} failed:`, err.message);
  });

  return worker;
}
