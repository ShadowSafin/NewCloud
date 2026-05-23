import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { PrismaClient, File } from "@prisma/client";
import { FileRepository } from "../repositories/FileRepository";
import { VersionService } from "./versionService";
import { storageService } from "./storageService";
import { fileTypeService } from "./fileTypeService";
import { storageBlobService } from "./storageBlobService";
import { storageAccountingService } from "./storageAccountingService";
import { thumbnailService } from "./thumbnailService";
import { config } from "../config";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/errors";

export class FileService {
  private fileRepository: FileRepository;
  private versionService: VersionService;

  constructor(private prisma: PrismaClient) {
    this.fileRepository = new FileRepository(prisma);
    this.versionService = new VersionService(prisma);
  }

  async create(userId: string, file: Express.Multer.File, folderId?: string): Promise<File> {
    await storageService.ensureUserDirectories(userId);

    const ext = path.extname(file.originalname).toLowerCase();
    const fileInfo = fileTypeService.getFileInfo(file.originalname, file.mimetype);
    const category = fileInfo.category;
    const mimeType = fileInfo.mimeType;

    if (config.blockDangerousUploads && fileTypeService.isDangerous(mimeType, ext)) {
      try { if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
      throw new BadRequestError(`File type ${ext || mimeType} is not allowed for security reasons`);
    }

    const storedName = `${uuidv4()}${ext}`;
    const tempPath = file.path;

    if (!tempPath || !fs.existsSync(tempPath)) {
      throw new BadRequestError("Temporary upload file not found");
    }

    // Dynamic Binary Signature Validation (Magic-Number validation)
    const isSignatureValid = await fileTypeService.validateSignature(tempPath, file.mimetype || mimeType);
    if (!isSignatureValid) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      throw new BadRequestError("File signature mismatch: the file contents do not match the expected type or extension");
    }

    const hash = await storageBlobService.computeHash(tempPath);
    const blob = await storageBlobService.ingestFile(tempPath, BigInt(file.size), hash);
    let createdOrUpdatedFile: File | null = null;
    let blobCleanupPath: string | null = null;

    try {
      await this.prisma.$transaction(async (tx) => {
        const existingFile = await tx.file.findFirst({
          where: {
            userId,
            originalName: file.originalname,
            folderId: folderId || null,
            deletedAt: null,
          },
        });

        if (existingFile) {
          await this.versionService.createVersion(userId, existingFile.id, tx);
          blobCleanupPath = await storageBlobService.releaseReference(existingFile.blobId, tx);

          createdOrUpdatedFile = await tx.file.update({
            where: { id: existingFile.id },
            data: {
              blobId: blob.id,
              storedName,
              path: blob.physicalPath,
              mimeType,
              extension: ext,
              category,
              size: BigInt(file.size),
              hash,
              refCount: blob.referenceCount,
              thumbnail: null,
              thumbnailSmall: null,
              thumbnailMedium: null,
              thumbnailLarge: null,
            },
          });
        } else {
          createdOrUpdatedFile = await tx.file.create({
            data: {
              userId,
              folderId: folderId || null,
              blobId: blob.id,
              originalName: file.originalname,
              storedName,
              path: blob.physicalPath,
              mimeType,
              extension: ext,
              category,
              size: BigInt(file.size),
              hash,
              refCount: blob.referenceCount,
            },
          });
        }

        await storageAccountingService.recalculateUserUsage(userId, tx);
      });
    } catch (error) {
      const cleanup = await storageBlobService.releaseReference(blob.id).catch(() => null);
      await storageBlobService.deletePhysicalBlob(cleanup);
      throw error;
    }

    await storageBlobService.deletePhysicalBlob(blobCleanupPath);

    if (!createdOrUpdatedFile) {
      throw new Error("Upload completed without creating or updating a file record");
    }

    const uploadedFile = createdOrUpdatedFile as File;
    if (fileTypeService.canThumbnail(mimeType, ext)) {
      thumbnailService.processUploadedFile(uploadedFile.id).catch((err) => {
        console.error(`[Thumbnail] Async thumbnail generation failed for ${uploadedFile.id}:`, err);
      });
    }

    return uploadedFile;
  }

  async findAll(
    userId: string,
    folderId?: string,
    search?: string,
    filters?: { category?: string; minSize?: number; maxSize?: number; limit?: number; offset?: number }
  ): Promise<{ files: File[]; totalCount: number }> {
    const { files, totalCount } = await this.fileRepository.findAll({
      userId,
      folderId: folderId === "root" ? null : folderId,
      search,
      category: filters?.category,
      minSize: filters?.minSize,
      maxSize: filters?.maxSize,
      deletedAt: null,
      limit: filters?.limit,
      offset: filters?.offset,
    });
    return { files, totalCount };
  }

  async findById(userId: string, id: string): Promise<File> {
    const file = await this.fileRepository.findById(id);
    if (!file) {
      throw new NotFoundError("File not found");
    }
    if (file.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }
    return file;
  }

  async getFilePath(userId: string, id: string): Promise<string> {
    const file = await this.findById(userId, id);
    return file.path;
  }

  async update(userId: string, id: string, originalName: string): Promise<File> {
    await this.findById(userId, id);
    return this.fileRepository.update(id, { originalName });
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.trash(userId, id);
  }

  async getRecentFiles(userId: string, limit: number): Promise<File[]> {
    return this.fileRepository.getRecent(userId, limit);
  }

  async getFavorites(userId: string): Promise<File[]> {
    return this.fileRepository.getFavorites(userId);
  }

  async toggleFavorite(userId: string, id: string): Promise<File> {
    const file = await this.findById(userId, id);
    return this.fileRepository.update(id, { isFavorite: !file.isFavorite });
  }

  async move(userId: string, id: string, folderId: string | null): Promise<File> {
    await this.findById(userId, id);
    return this.fileRepository.update(id, { folderId });
  }

  async trash(userId: string, id: string): Promise<File> {
    const file = await this.findById(userId, id);
    if (file.deletedAt) {
      return file; // Already trashed
    }

    let updated!: File;
    await this.prisma.$transaction(async (tx) => {
      updated = await tx.file.update({ where: { id }, data: { deletedAt: new Date() } });
      await storageAccountingService.recalculateUserUsage(userId, tx);
    });
    return updated;
  }

  async restore(userId: string, id: string): Promise<File> {
    const file = await this.findById(userId, id);
    if (!file.deletedAt) {
      return file; // Not in trash
    }

    let updated!: File;
    await this.prisma.$transaction(async (tx) => {
      updated = await tx.file.update({ where: { id }, data: { deletedAt: null } });
      await storageAccountingService.recalculateUserUsage(userId, tx);
    });
    return updated;
  }

  async permanentDelete(userId: string, id: string): Promise<void> {
    const file = await this.findById(userId, id);
    const versions = await this.prisma.fileVersion.findMany({ where: { fileId: id } });
    let blobCleanupPath: string | null = null;
    const versionBlobCleanupPaths: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      await tx.file.delete({ where: { id } });
      blobCleanupPath = await storageBlobService.releaseReference(file.blobId, tx);
      for (const version of versions) {
        const cleanupPath = await storageBlobService.releaseReference(version.blobId, tx);
        if (cleanupPath) versionBlobCleanupPaths.push(cleanupPath);
      }
      await storageAccountingService.recalculateUserUsage(userId, tx);
    });

    await storageBlobService.deletePhysicalBlob(blobCleanupPath);
    for (const cleanupPath of versionBlobCleanupPaths) {
      await storageBlobService.deletePhysicalBlob(cleanupPath);
    }
    if (!file.blobId && storageService.isSafePathGlobal(file.path)) {
      try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
    }
  }

  async listTrash(userId: string): Promise<File[]> {
    return this.fileRepository.getTrash(userId);
  }

  async emptyTrash(userId: string): Promise<void> {
    const trashedFiles = await this.listTrash(userId);
    const blobCleanupPaths: string[] = [];
    const versionsByFile = new Map<string, { blobId: string | null }[]>();
    for (const file of trashedFiles) {
      versionsByFile.set(file.id, await this.prisma.fileVersion.findMany({
        where: { fileId: file.id },
        select: { blobId: true },
      }));
    }

    await this.prisma.$transaction(async (tx) => {
      for (const file of trashedFiles) {
        await tx.file.delete({ where: { id: file.id } });
        const cleanupPath = await storageBlobService.releaseReference(file.blobId, tx);
        if (cleanupPath) blobCleanupPaths.push(cleanupPath);
        for (const version of versionsByFile.get(file.id) || []) {
          const versionCleanupPath = await storageBlobService.releaseReference(version.blobId, tx);
          if (versionCleanupPath) blobCleanupPaths.push(versionCleanupPath);
        }
      }
      await storageAccountingService.recalculateUserUsage(userId, tx);
    });

    for (const cleanupPath of blobCleanupPaths) {
      await storageBlobService.deletePhysicalBlob(cleanupPath);
    }
    for (const file of trashedFiles) {
      if (!file.blobId && storageService.isSafePathGlobal(file.path)) {
        try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
      }
    }
  }

  async copy(userId: string, id: string, folderId: string | null): Promise<File> {
    const file = await this.findById(userId, id);
    const newStoredName = `${uuidv4()}${file.extension}`;
    let copiedFile!: File;

    await this.prisma.$transaction(async (tx) => {
      const blob = file.blobId ? await storageBlobService.addReference(file.blobId, tx) : null;
      copiedFile = await tx.file.create({
        data: {
          userId,
          folderId,
          blobId: file.blobId,
          originalName: `Copy of ${file.originalName}`,
          storedName: newStoredName,
          path: blob?.physicalPath || file.path,
          mimeType: file.mimeType,
          extension: file.extension,
          category: file.category,
          size: file.size,
          hash: file.hash,
          refCount: blob?.referenceCount || file.refCount,
        },
      });
      await storageAccountingService.recalculateUserUsage(userId, tx);
    });

    return copiedFile;
  }

  async bulkTrash(userId: string, ids: string[]): Promise<number> {
    let processed = 0;
    for (const id of ids) {
      try {
        await this.trash(userId, id);
        processed++;
      } catch {}
    }
    return processed;
  }

  async bulkRestore(userId: string, ids: string[]): Promise<number> {
    let processed = 0;
    for (const id of ids) {
      try {
        await this.restore(userId, id);
        processed++;
      } catch {}
    }
    return processed;
  }

  async bulkMove(userId: string, ids: string[], folderId: string | null): Promise<number> {
    let processed = 0;
    for (const id of ids) {
      try {
        await this.move(userId, id, folderId);
        processed++;
      } catch {}
    }
    return processed;
  }

  async bulkCopy(userId: string, ids: string[], folderId: string | null): Promise<number> {
    let processed = 0;
    for (const id of ids) {
      try {
        await this.copy(userId, id, folderId);
        processed++;
      } catch {}
    }
    return processed;
  }
}
