import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { storageService } from "./storageService";
import { versionCleanupQueue } from "../lib/queues";
import { NotFoundError, ForbiddenError } from "../utils/errors";

export class VersionService {
  constructor(private prisma: PrismaClient) {}

  async createVersion(userId: string, fileId: string): Promise<any> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const latestVersion = await this.prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { version: "desc" },
    });

    const newVersion = (latestVersion?.version || 0) + 1;

    // Version storage directory
    const versionDir = path.join(storageService["rootPath"], userId, "versions");
    if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });

    const ext = path.extname(file.originalName);
    const versionStoredName = `${fileId}_v${newVersion}${ext}`;
    const versionPath = path.join(versionDir, versionStoredName);

    // Stream-based copy for large files (memory efficient)
    if (fs.existsSync(file.path)) {
      await pipeline(
        fs.createReadStream(file.path),
        fs.createWriteStream(versionPath)
      );
    }

    // Compute hash using stream
    let hash: string | null = null;
    if (fs.existsSync(versionPath)) {
      hash = await new Promise<string>((resolve, reject) => {
        const hashObj = crypto.createHash("sha256");
        const stream = fs.createReadStream(versionPath);
        stream.on("data", (data) => hashObj.update(data));
        stream.on("end", () => resolve(hashObj.digest("hex")));
        stream.on("error", reject);
      });
    }

    const version = await this.prisma.fileVersion.create({
      data: {
        fileId,
        version: newVersion,
        storedName: versionStoredName,
        path: versionPath,
        size: file.size,
        hash,
      },
    });

    // Update file's current version
    await this.prisma.file.update({
      where: { id: fileId },
      data: { currentVersion: newVersion },
    });

    // Enqueue version cleanup
    await versionCleanupQueue.add("cleanup", { fileId }).catch(() => {});

    return version;
  }

  async listVersions(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    return this.prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { version: "desc" },
    });
  }

  async restoreVersion(userId: string, fileId: string, versionNumber: number) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const version = await this.prisma.fileVersion.findFirst({
      where: { fileId, version: versionNumber },
    });

    if (!version) throw new NotFoundError("Version not found");

    // Save current version before restoring
    await this.createVersion(userId, fileId);

    // Restore the version file to the original path
    if (fs.existsSync(version.path)) {
      await pipeline(
        fs.createReadStream(version.path),
        fs.createWriteStream(file.path)
      );
    }

    // Update file size and hash
    await this.prisma.file.update({
      where: { id: fileId },
      data: {
        size: version.size,
        hash: version.hash,
        currentVersion: versionNumber,
      },
    });

    return { restored: versionNumber, fileId };
  }

  async deleteVersion(userId: string, fileId: string, versionNumber: number) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const version = await this.prisma.fileVersion.findFirst({
      where: { fileId, version: versionNumber },
    });

    if (!version) throw new NotFoundError("Version not found");

    // Delete physical file
    try {
      if (fs.existsSync(version.path)) fs.unlinkSync(version.path);
    } catch {}

    await this.prisma.fileVersion.delete({ where: { id: version.id } });

    return { deleted: versionNumber, fileId };
  }
}
