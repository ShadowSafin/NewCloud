import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { PrismaClient, File } from "@prisma/client";
import { FileRepository } from "../repositories/FileRepository";
import { UserRepository } from "../repositories/UserRepository";
import { VersionService } from "./versionService";
import { storageService } from "./storageService";
import { fileTypeService } from "./fileTypeService";
import { dedupService } from "./dedupService";
import { thumbnailService } from "./thumbnailService";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/errors";

export class FileService {
  private fileRepository: FileRepository;
  private userRepository: UserRepository;
  private versionService: VersionService;

  constructor(private prisma: PrismaClient) {
    this.fileRepository = new FileRepository(prisma);
    this.userRepository = new UserRepository(prisma);
    this.versionService = new VersionService(prisma);
  }

  async create(userId: string, file: Express.Multer.File, folderId?: string): Promise<File> {
    await storageService.ensureUserDirectories(userId);

    const ext = path.extname(file.originalname).toLowerCase();
    const fileInfo = fileTypeService.getFileInfo(file.originalname, file.mimetype);
    const category = fileInfo.category;
    const mimeType = fileInfo.mimeType;

    const storedName = `${uuidv4()}${ext}`;
    const targetPath = storageService.getFilePath(userId, storedName);

    // Move file from multer temp path to files path
    if (fs.existsSync(file.path)) {
      fs.renameSync(file.path, targetPath);
    } else {
      throw new BadRequestError("Temporary upload file not found");
    }

    // Dynamic Binary Signature Validation (Magic-Number validation)
    const isSignatureValid = await fileTypeService.validateSignature(targetPath, file.mimetype || mimeType);
    if (!isSignatureValid) {
      try {
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      } catch {}
      throw new BadRequestError("File signature mismatch: the file contents do not match the expected type or extension");
    }

    // Compute SHA-256 hash & deduplicate
    const hash = await dedupService.computeHash(targetPath);
    const dedup = await dedupService.deduplicate(userId, targetPath, storedName, hash);

    // Check for duplicate filename in the same folder
    const existingFile = await this.fileRepository.findByNameAndFolder(
      userId,
      file.originalname,
      folderId || null
    );

    if (existingFile) {
      // 1. Create a version backup of the existing file
      await this.versionService.createVersion(userId, existingFile.id);

      // 2. Safely release/delete the previous physical file
      await dedupService.releaseFile(existingFile);

      // 3. Update the existing file record with the new properties
      const updatedFile = await this.fileRepository.update(existingFile.id, {
        storedName: dedup.storedName,
        path: dedup.path,
        mimeType,
        extension: ext,
        category,
        size: BigInt(file.size),
        hash,
        refCount: dedup.deduplicated ? undefined : 1,
        thumbnail: null,
        thumbnailSmall: null,
        thumbnailMedium: null,
        thumbnailLarge: null,
      });

      // Update storage used net change
      await this.userRepository.updateStorageUsed(userId, BigInt(file.size) - BigInt(existingFile.size));
      await storageService.invalidateCache(userId);

      // Generate thumbnails asynchronously if not deduplicated
      if (!dedup.deduplicated && fileTypeService.canThumbnail(mimeType, ext)) {
        thumbnailService.processUploadedFile(updatedFile.id).catch((err) => {
          console.error(`[Thumbnail] Async thumbnail generation failed for ${updatedFile.id}:`, err);
        });
      }

      return updatedFile;
    }

    // No duplicate filename exists - create new file record
    const createdFile = await this.fileRepository.create({
      userId,
      folderId: folderId || null,
      originalName: file.originalname,
      storedName: dedup.storedName,
      path: dedup.path,
      mimeType,
      extension: ext,
      category,
      size: BigInt(file.size),
      hash,
      refCount: dedup.deduplicated ? undefined : 1,
    });

    // Update storage used
    await this.userRepository.updateStorageUsed(userId, BigInt(file.size));
    await storageService.invalidateCache(userId);

    // Generate thumbnails asynchronously if not deduplicated
    if (!dedup.deduplicated && fileTypeService.canThumbnail(mimeType, ext)) {
      thumbnailService.processUploadedFile(createdFile.id).catch((err) => {
        console.error(`[Thumbnail] Async thumbnail generation failed for ${createdFile.id}:`, err);
      });
    }

    return createdFile;
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
    const file = await this.findById(userId, id);
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

    const updated = await this.fileRepository.update(id, { deletedAt: new Date() });

    // Decrement storageUsed and increment trashSize
    await this.userRepository.updateStorageUsed(userId, -BigInt(file.size));
    await this.userRepository.updateTrashSize(userId, BigInt(file.size));
    await storageService.invalidateCache(userId);

    return updated;
  }

  async restore(userId: string, id: string): Promise<File> {
    const file = await this.findById(userId, id);
    if (!file.deletedAt) {
      return file; // Not in trash
    }

    const updated = await this.fileRepository.update(id, { deletedAt: null });

    // Increment storageUsed and decrement trashSize
    await this.userRepository.updateStorageUsed(userId, BigInt(file.size));
    await this.userRepository.updateTrashSize(userId, -BigInt(file.size));
    await storageService.invalidateCache(userId);

    return updated;
  }

  async permanentDelete(userId: string, id: string): Promise<void> {
    const file = await this.findById(userId, id);

    // Release file reference (dedup check & physical file delete if last ref)
    await dedupService.releaseFile(file);

    // Delete record from DB
    await this.fileRepository.delete(id);

    // Update user stats
    if (file.deletedAt) {
      await this.userRepository.updateTrashSize(userId, -BigInt(file.size));
    } else {
      await this.userRepository.updateStorageUsed(userId, -BigInt(file.size));
    }
    await storageService.invalidateCache(userId);
  }

  async listTrash(userId: string): Promise<File[]> {
    return this.fileRepository.getTrash(userId);
  }

  async emptyTrash(userId: string): Promise<void> {
    const trashedFiles = await this.listTrash(userId);
    for (const file of trashedFiles) {
      await dedupService.releaseFile(file);
      await this.fileRepository.delete(file.id);
    }

    // Set trash size to 0
    const user = await this.userRepository.findById(userId);
    if (user) {
      await this.userRepository.update(userId, { trashSize: 0 });
    }
    await storageService.invalidateCache(userId);
  }

  async copy(userId: string, id: string, folderId: string | null): Promise<File> {
    const file = await this.findById(userId, id);
    const newStoredName = `${uuidv4()}${file.extension}`;

    // Increment refCount on ALL files sharing this physical path
    const newRefCount = file.refCount + 1;
    await this.prisma.file.updateMany({
      where: { path: file.path },
      data: { refCount: newRefCount },
    });

    const copiedFile = await this.fileRepository.create({
      userId,
      folderId,
      originalName: `Copy of ${file.originalName}`,
      storedName: newStoredName,
      path: file.path,
      mimeType: file.mimeType,
      extension: file.extension,
      category: file.category,
      size: file.size,
      hash: file.hash,
      refCount: newRefCount,
    });

    await this.userRepository.updateStorageUsed(userId, file.size);
    await storageService.invalidateCache(userId);

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
