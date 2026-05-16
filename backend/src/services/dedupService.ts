import { PrismaClient, File } from "@prisma/client";
import fs from "fs";
import crypto from "crypto";
import { storageService } from "./storageService";

export class DedupService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Compute SHA-256 hash of a file using streams (memory efficient)
   */
  async computeHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (data) => hash.update(data));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }

  /**
   * Find an existing file with the same hash for the same user
   */
  async findDuplicate(hash: string, userId: string): Promise<File | null> {
    return this.prisma.file.findFirst({
      where: {
        hash,
        userId,
        deletedAt: null,
        refCount: { gt: 0 },
      },
    });
  }

  /**
   * Deduplicate a newly uploaded file by reusing an existing physical file
   * Returns the final storedName, path, and whether dedup occurred
   */
  async deduplicate(
    userId: string,
    newFilePath: string,
    newStoredName: string,
    hash: string
  ): Promise<{ storedName: string; path: string; deduplicated: boolean; originalId?: string }> {
    const existing = await this.findDuplicate(hash, userId);

    if (!existing) {
      return { storedName: newStoredName, path: newFilePath, deduplicated: false };
    }

    // Verify the existing file's physical file exists
    if (!fs.existsSync(existing.path)) {
      return { storedName: newStoredName, path: newFilePath, deduplicated: false };
    }

    // Delete the newly uploaded file (it's a duplicate)
    try {
      if (fs.existsSync(newFilePath)) fs.unlinkSync(newFilePath);
    } catch {}

    // Increment refCount on ALL files sharing this physical path
    const newRefCount = existing.refCount + 1;
    await this.prisma.file.updateMany({
      where: { path: existing.path },
      data: { refCount: newRefCount },
    });

    // Return the NEW storedName (keeps @unique constraint happy) with the EXISTING shared path.
    // storedName becomes a unique DB identifier; path is the actual filesystem location used for all I/O.
    return {
      storedName: newStoredName,
      path: existing.path,
      deduplicated: true,
      originalId: existing.id,
    };
  }

  /**
   * Release a file's reference. Deletes physical file if refCount reaches 0.
   */
  async releaseFile(file: File): Promise<void> {
    if (file.refCount > 1) {
      // Decrement refCount on ALL files sharing this physical path
      await this.prisma.file.updateMany({
        where: { path: file.path },
        data: { refCount: { decrement: 1 } },
      });
    } else {
      // Last reference - delete physical file
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
  }
}

export const dedupService = new DedupService(
  // Will be injected via constructor in routes
  require("../db").prisma
);
