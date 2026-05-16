import { Worker, Job } from "bullmq";
import fs from "fs";
import { createRedisConnection } from "../lib/redis";
import { prisma } from "../db";
import { config } from "../config";

export function createTrashCleanupWorker(): Worker {
  const worker = new Worker(
    "trash-cleanup",
    async (_job: Job) => {
      const retentionDays = config.trashRetentionDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      console.log(`Trash cleanup: deleting items older than ${cutoffDate.toISOString()}`);

      // Find expired trashed files
      const expiredFiles = await prisma.file.findMany({
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      });

      let deletedSize = 0n;
      let deletedCount = 0;

      for (const file of expiredFiles) {
        // Handle refCount for dedup
        if (file.refCount > 1) {
          await prisma.file.update({
            where: { id: file.id },
            data: { refCount: { decrement: 1 } },
          });
        } else {
          // Delete physical file
          try {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          } catch {}

          // Delete thumbnails
          try {
            const thumbFiles = [file.thumbnail, file.thumbnailSmall, file.thumbnailMedium, file.thumbnailLarge].filter(Boolean);
            for (const t of thumbFiles) {
              if (t && fs.existsSync(t)) fs.unlinkSync(t);
            }
          } catch {}
        }

        // Update user trash size
        deletedSize += BigInt(Number(file.size));
        deletedCount++;

        await prisma.file.delete({ where: { id: file.id } });
      }

      // Update user trash sizes
      if (deletedCount > 0) {
        // Group files by user to update trash sizes
        const userSizes = new Map<string, bigint>();
        for (const file of expiredFiles) {
          const current = userSizes.get(file.userId) || 0n;
          userSizes.set(file.userId, current + BigInt(Number(file.size)));
        }

        for (const [userId, size] of userSizes) {
          await prisma.user.update({
            where: { id: userId },
            data: { trashSize: { decrement: Number(size) } },
          });
        }
      }

      // Find expired trashed folders
      const expiredFolders = await prisma.folder.findMany({
        where: {
          deletedAt: { not: null, lt: cutoffDate },
        },
      });

      for (const folder of expiredFolders) {
        await permanentDeleteFolderRecursive(folder.id);
      }

      console.log(`Trash cleanup complete: ${deletedCount} files, ${expiredFolders.length} folders deleted`);
      return { deletedFiles: deletedCount, deletedFolders: expiredFolders.length };
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Trash cleanup job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Trash cleanup job ${job?.id} failed:`, err.message);
  });

  return worker;
}

async function permanentDeleteFolderRecursive(folderId: string): Promise<void> {
  // Get all child folders
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
  });

  for (const child of children) {
    await permanentDeleteFolderRecursive(child.id);
  }

  // Delete all files in this folder
  const files = await prisma.file.findMany({
    where: { folderId },
  });

  for (const file of files) {
    if (file.refCount <= 1) {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {}
    }
    await prisma.file.delete({ where: { id: file.id } });
  }

  // Delete the folder
  await prisma.folder.delete({ where: { id: folderId } });
}
