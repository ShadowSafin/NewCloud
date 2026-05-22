import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { storageService } from "./storageService";
import { versionCleanupQueue } from "../lib/queues";
import { NotFoundError, ForbiddenError } from "../utils/errors";
import { VersionRepository } from "../repositories/VersionRepository";
import { FileRepository } from "../repositories/FileRepository";

export class VersionService {
  private versionRepository: VersionRepository;
  private fileRepository: FileRepository;

  constructor(private prisma: PrismaClient) {
    this.versionRepository = new VersionRepository(prisma);
    this.fileRepository = new FileRepository(prisma);
  }

  async createVersion(userId: string, fileId: string): Promise<any> {
    const file = await this.fileRepository.findById(fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const latestVersion = await this.versionRepository.findLatest(fileId);
    const newVersion = (latestVersion?.version || 0) + 1;

    // Version storage directory
    const versionDir = storageService.getUserVersionsPath(userId);
    if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });

    const ext = path.extname(file.originalName);
    const versionStoredName = `${fileId}_v${newVersion}${ext}`;
    const versionPath = path.join(versionDir, versionStoredName);

    // Enforce path traversal defense
    if (!storageService.isSafePath(userId, file.path)) {
      throw new ForbiddenError("Access denied: Invalid source path");
    }
    if (!storageService.isSafePath(userId, versionPath)) {
      throw new ForbiddenError("Access denied: Invalid destination path");
    }

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

    const version = await this.versionRepository.create({
      fileId,
      version: newVersion,
      storedName: versionStoredName,
      path: versionPath,
      size: file.size,
      hash,
    });

    // Update file's current version
    await this.fileRepository.update(fileId, { currentVersion: newVersion });

    // Enqueue version cleanup
    await versionCleanupQueue.add("cleanup", { fileId }).catch(() => {});

    return version;
  }

  async listVersions(userId: string, fileId: string) {
    const file = await this.fileRepository.findById(fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    return this.versionRepository.findMany({ fileId });
  }

  async restoreVersion(userId: string, fileId: string, versionNumber: number) {
    const file = await this.fileRepository.findById(fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const version = await this.versionRepository.findFirst({ fileId, version: versionNumber });
    if (!version) throw new NotFoundError("Version not found");

    // Enforce path traversal defense
    if (!storageService.isSafePath(userId, version.path)) {
      throw new ForbiddenError("Access denied: Invalid version path");
    }
    if (!storageService.isSafePath(userId, file.path)) {
      throw new ForbiddenError("Access denied: Invalid destination path");
    }

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
    await this.fileRepository.update(fileId, {
      size: version.size,
      hash: version.hash,
      currentVersion: versionNumber,
    });

    return { restored: versionNumber, fileId };
  }

  async deleteVersion(userId: string, fileId: string, versionNumber: number) {
    const file = await this.fileRepository.findById(fileId);
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const version = await this.versionRepository.findFirst({ fileId, version: versionNumber });
    if (!version) throw new NotFoundError("Version not found");

    // Enforce path traversal defense
    if (!storageService.isSafePath(userId, version.path)) {
      throw new ForbiddenError("Access denied: Invalid version path");
    }

    // Delete physical file
    try {
      if (fs.existsSync(version.path)) fs.unlinkSync(version.path);
    } catch {}

    await this.versionRepository.delete(version.id);

    return { deleted: versionNumber, fileId };
  }
}
