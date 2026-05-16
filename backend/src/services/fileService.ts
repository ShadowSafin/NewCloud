import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { storageService } from "./storageService";
import { fileTypeService } from "./fileTypeService";
import { DedupService } from "./dedupService";
import { thumbnailQueue } from "../lib/queues";
import { cacheInvalidate } from "../lib/redis";
import { NotFoundError, ForbiddenError, ConflictError } from "../utils/errors";
import { FileMetadata } from "../types";

export class FileService {
  private dedupService: DedupService;

  constructor(private prisma: PrismaClient) {
    this.dedupService = new DedupService(prisma);
  }

  async create(
    userId: string,
    file: Express.Multer.File,
    folderId?: string
  ): Promise<FileMetadata> {
    await storageService.ensureUserDirectories(userId);

    if (folderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: folderId },
      });

      if (!folder) {
        throw new NotFoundError("Folder not found");
      }

      if (folder.userId !== userId) {
        throw new ForbiddenError("Access denied");
      }
    }

    let originalName = file.originalname;
    const existingFile = await this.prisma.file.findFirst({
      where: {
        userId,
        folderId: folderId || null,
        originalName,
      },
    });

    if (existingFile) {
      const ext = path.extname(originalName);
      const nameWithoutExt = path.basename(originalName, ext);
      const timestamp = Date.now();
      originalName = `${nameWithoutExt} (${timestamp})${ext}`;
    }

    const storedPath = storageService.getFilePath(userId, file.filename);
    const fileInfo = fileTypeService.getFileInfo(file.originalname, file.mimetype);

    // Compute SHA-256 hash for deduplication
    const hash = await this.dedupService.computeHash(storedPath);

    // Check for deduplication
    const dedupResult = await this.dedupService.deduplicate(
      userId,
      storedPath,
      file.filename,
      hash
    );

    const createdFile = await this.prisma.file.create({
      data: {
        userId,
        folderId: folderId || null,
        originalName,
        storedName: dedupResult.storedName,
        path: dedupResult.path,
        mimeType: file.mimetype,
        category: fileInfo.category,
        size: file.size,
        hash,
      },
    });

    // Update user storage used
    await this.prisma.user.update({
      where: { id: userId },
      data: { storageUsed: { increment: file.size } },
    });

    // Enqueue thumbnail generation
    if (fileInfo.canThumbnail) {
      await thumbnailQueue.add("generate", { fileId: createdFile.id }).catch((err) => {
        console.error("Failed to enqueue thumbnail job:", err.message);
      });
    }

    // Invalidate caches
    await cacheInvalidate(`storage:${userId}`);
    await cacheInvalidate(`files:${userId}:*`);

    return this.mapToFileMetadata(createdFile);
  }

  async findAll(
    userId: string,
    folderId?: string,
    search?: string,
    filters?: { category?: string; minSize?: number; maxSize?: number }
  ): Promise<FileMetadata[]> {
    const where: Record<string, unknown> = { userId, deletedAt: null };

    if (folderId) {
      where.folderId = folderId;
    } else if (folderId === undefined) {
      where.folderId = null;
    }

    if (search) {
      where.originalName = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.minSize || filters?.maxSize) {
      const sizeFilter: Record<string, number> = {};
      if (filters.minSize) sizeFilter.gte = filters.minSize;
      if (filters.maxSize) sizeFilter.lte = filters.maxSize;
      where.size = sizeFilter;
    }

    const files = await this.prisma.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return files.map(this.mapToFileMetadata);
  }

  async findById(userId: string, id: string): Promise<FileMetadata> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundError("File not found");
    }

    if (file.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    return this.mapToFileMetadata(file);
  }

  async update(
    userId: string,
    id: string,
    originalName: string
  ): Promise<FileMetadata> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundError("File not found");
    }

    if (file.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    // Check for duplicate name in same folder
    const duplicate = await this.prisma.file.findFirst({
      where: {
        userId,
        folderId: file.folderId,
        originalName,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ConflictError("A file with this name already exists in this folder");
    }

    const updated = await this.prisma.file.update({
      where: { id },
      data: { originalName },
    });

    return this.mapToFileMetadata(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    // Release physical file (handles refCount)
    await this.dedupService.releaseFile(file);

    await this.prisma.file.delete({ where: { id } });
  }

  async getFilePath(userId: string, id: string): Promise<string> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    return file.path;
  }

  async getRecentFiles(userId: string, limit: number = 10): Promise<FileMetadata[]> {
    const files = await this.prisma.file.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return files.map(this.mapToFileMetadata);
  }

  async getStorageUsage(userId: string): Promise<{ used: number; fileCount: number }> {
    return await storageService.getStorageStats(userId);
  }

  async getFavorites(userId: string): Promise<FileMetadata[]> {
    const files = await this.prisma.file.findMany({
      where: { userId, isFavorite: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    return files.map(this.mapToFileMetadata);
  }

  async toggleFavorite(userId: string, id: string): Promise<FileMetadata> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const updated = await this.prisma.file.update({
      where: { id },
      data: { isFavorite: !file.isFavorite },
    });

    return this.mapToFileMetadata(updated);
  }

  async move(userId: string, fileId: string, targetFolderId: string | null): Promise<FileMetadata> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    if (targetFolderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: targetFolderId },
      });
      if (!folder) throw new NotFoundError("Target folder not found");
      if (folder.userId !== userId) throw new ForbiddenError("Access denied");
    }

    // Check for duplicate name in target folder
    const existing = await this.prisma.file.findFirst({
      where: {
        userId,
        folderId: targetFolderId,
        originalName: file.originalName,
        id: { not: fileId },
      },
    });

    let newName = file.originalName;
    if (existing) {
      const ext = path.extname(file.originalName);
      const nameWithoutExt = path.basename(file.originalName, ext);
      newName = `${nameWithoutExt} (${Date.now()})${ext}`;
    }

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: {
        folderId: targetFolderId,
        originalName: newName,
      },
    });

    return this.mapToFileMetadata(updated);
  }

  async copy(userId: string, fileId: string, targetFolderId: string | null): Promise<FileMetadata> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    if (targetFolderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: targetFolderId },
      });
      if (!folder) throw new NotFoundError("Target folder not found");
      if (folder.userId !== userId) throw new ForbiddenError("Access denied");
    }

    // Generate copy name and new stored name
    const copyName = await this.generateCopyName(userId, targetFolderId, file.originalName);
    const { v4: uuidv4 } = require("uuid");
    const newStoredName = `${uuidv4()}${path.extname(file.originalName)}`;

    // Copy the physical file
    const sourcePath = file.path;
    const targetPath = storageService.getFilePath(userId, newStoredName);
    
    try {
      const fs = require("fs");
      fs.copyFileSync(sourcePath, targetPath);
    } catch (err) {
      console.error("Failed to copy file:", err);
      throw new Error("Failed to copy file");
    }

    // Create new file record
    const newFile = await this.prisma.file.create({
      data: {
        userId,
        folderId: targetFolderId,
        originalName: copyName,
        storedName: newStoredName,
        path: targetPath,
        mimeType: file.mimeType,
        category: file.category,
        size: file.size,
        hash: file.hash,
        refCount: 1,
      },
    });

    // Update user storage
    await this.prisma.user.update({
      where: { id: userId },
      data: { storageUsed: { increment: Number(file.size) } },
    });

    // Enqueue thumbnail for copy
    const fileInfo = fileTypeService.getFileInfo(file.originalName, file.mimeType);
    if (fileInfo.canThumbnail) {
      await thumbnailQueue.add("generate", { fileId: newFile.id }).catch(() => {});
    }

    return this.mapToFileMetadata(newFile);
  }

  private async generateCopyName(
    userId: string,
    folderId: string | null,
    originalName: string
  ): Promise<string> {
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    let copyName = `${nameWithoutExt} (copy)${ext}`;

    let counter = 1;
    while (true) {
      const existing = await this.prisma.file.findFirst({
        where: { userId, folderId, originalName: copyName },
      });
      if (!existing) break;
      counter++;
      copyName = `${nameWithoutExt} (copy ${counter})${ext}`;
    }

    return copyName;
  }

  async trash(userId: string, fileId: string): Promise<FileMetadata> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    // Track trash size
    await this.prisma.user.update({
      where: { id: userId },
      data: { trashSize: { increment: Number(file.size) } },
    });

    return this.mapToFileMetadata(updated);
  }

  async restore(userId: string, fileId: string): Promise<FileMetadata> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: null },
    });

    // Update trash size
    await this.prisma.user.update({
      where: { id: userId },
      data: { trashSize: { decrement: Number(file.size) } },
    });

    return this.mapToFileMetadata(updated);
  }

  async permanentDelete(userId: string, fileId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError("File not found");
    if (file.userId !== userId) throw new ForbiddenError("Access denied");

    // Release physical file (handles refCount)
    await this.dedupService.releaseFile(file);

    // Update storage used
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        storageUsed: { decrement: Number(file.size) },
        trashSize: file.deletedAt ? { decrement: Number(file.size) } : undefined,
      },
    });

    await this.prisma.file.delete({ where: { id: fileId } });
  }

  async listTrash(userId: string): Promise<FileMetadata[]> {
    const files = await this.prisma.file.findMany({
      where: { userId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    });
    return files.map(this.mapToFileMetadata);
  }

  async emptyTrash(userId: string): Promise<void> {
    const files = await this.prisma.file.findMany({
      where: { userId, deletedAt: { not: null } },
    });

    let totalSize = 0;

    for (const file of files) {
      // Release physical file (handles refCount)
      await this.dedupService.releaseFile(file);
      totalSize += Number(file.size);
    }

    await this.prisma.file.deleteMany({
      where: { userId, deletedAt: { not: null } },
    });

    await this.prisma.folder.deleteMany({
      where: { userId, deletedAt: { not: null } },
    });

    // Update storage used and trash size
    if (totalSize > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          storageUsed: { decrement: totalSize },
          trashSize: 0,
        },
      });
    }
  }

  async bulkTrash(userId: string, fileIds: string[]): Promise<number> {
    const files = await this.prisma.file.findMany({
      where: { id: { in: fileIds }, userId },
    });

    if (files.length !== fileIds.length) {
      throw new NotFoundError("Some files not found");
    }

    let totalSize = 0;
    for (const file of files) {
      await this.prisma.file.update({
        where: { id: file.id },
        data: { deletedAt: new Date() },
      });
      totalSize += Number(file.size);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { trashSize: { increment: totalSize } },
    });

    return files.length;
  }

  async bulkRestore(userId: string, fileIds: string[]): Promise<number> {
    const files = await this.prisma.file.findMany({
      where: { id: { in: fileIds }, userId, deletedAt: { not: null } },
    });

    let totalSize = 0;
    for (const file of files) {
      await this.prisma.file.update({
        where: { id: file.id },
        data: { deletedAt: null },
      });
      totalSize += Number(file.size);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { trashSize: { decrement: totalSize } },
    });

    return files.length;
  }

  async bulkMove(userId: string, fileIds: string[], targetFolderId: string | null): Promise<number> {
    const files = await this.prisma.file.findMany({
      where: { id: { in: fileIds }, userId },
    });

    if (files.length !== fileIds.length) {
      throw new NotFoundError("Some files not found");
    }

    for (const file of files) {
      const existing = await this.prisma.file.findFirst({
        where: {
          userId,
          folderId: targetFolderId,
          originalName: file.originalName,
          id: { not: file.id },
        },
      });

      let newName = file.originalName;
      if (existing) {
        const ext = path.extname(file.originalName);
        const nameWithoutExt = path.basename(file.originalName, ext);
        newName = `${nameWithoutExt} (${Date.now()})${ext}`;
      }

      await this.prisma.file.update({
        where: { id: file.id },
        data: { folderId: targetFolderId, originalName: newName },
      });
    }

    return files.length;
  }

  async bulkCopy(userId: string, fileIds: string[], targetFolderId: string | null): Promise<number> {
    const files = await this.prisma.file.findMany({
      where: { id: { in: fileIds }, userId },
    });

    if (files.length !== fileIds.length) {
      throw new NotFoundError("Some files not found");
    }

    for (const file of files) {
      await this.copy(userId, file.id, targetFolderId);
    }

    return files.length;
  }

  private mapToFileMetadata(file: any): FileMetadata {
    return {
      id: file.id,
      originalName: file.originalName,
      storedName: file.storedName,
      path: file.path,
      mimeType: file.mimeType,
      category: file.category || "unknown",
      thumbnail: file.thumbnail || null,
      thumbnailSmall: file.thumbnailSmall || null,
      thumbnailMedium: file.thumbnailMedium || null,
      thumbnailLarge: file.thumbnailLarge || null,
      isFavorite: file.isFavorite || false,
      size: Number(file.size),
      createdAt: file.createdAt,
      userId: file.userId,
      folderId: file.folderId,
    };
  }
}
