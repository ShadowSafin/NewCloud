import { Response } from "express";
import path from "path";
import fs from "fs";
import { FileService } from "../services/fileService";
import { AuthenticatedRequest } from "../types";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/errors";
import { storageService } from "../services/storageService";
import { fileTypeService } from "../services/fileTypeService";

const shouldSandbox = (mimeType: string, extension: string): boolean => {
  const category = fileTypeService.getCategory(mimeType, extension);
  const ext = (extension || "").toLowerCase();
  const mime = mimeType.toLowerCase();

  return (
    category === "code" ||
    category === "executables" ||
    category === "databases" ||
    category === "unknown" ||
    mime.startsWith("text/") ||
    ext === ".html" ||
    ext === ".htm" ||
    ext === ".svg" ||
    ext === ".xml" ||
    ext === ".js" ||
    ext === ".json"
  );
};

export class FileController {
  constructor(private fileService: FileService) {}

  upload = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    if (!req.file) {
      throw new BadRequestError("No file provided");
    }

    const userId = req.user!.id;
    const folderId = req.body.folderId || undefined;

    const file = await this.fileService.create(userId, req.file, folderId);

    res.status(201).json({
      success: true,
      data: file,
      message: "File uploaded successfully",
    });
  };

  uploadMultiple = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      throw new BadRequestError("No files provided");
    }

    const userId = req.user!.id;
    const folderId = req.body.folderId || undefined;
    const files = req.files as Express.Multer.File[];

    const uploadedFiles = await Promise.all(
      files.map((file) => this.fileService.create(userId, file, folderId))
    );

    res.status(201).json({
      success: true,
      data: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
    });
  };

  findAll = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const folderId = req.query.folderId as string | undefined;
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const minSize = req.query.minSize ? Number(req.query.minSize) : undefined;
    const maxSize = req.query.maxSize ? Number(req.query.maxSize) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    const { files, totalCount } = await this.fileService.findAll(userId, folderId, search, {
      category,
      minSize,
      maxSize,
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      data: files,
      pagination: {
        total: totalCount,
        limit: limit ?? files.length,
        offset: offset ?? 0,
      },
    });
  };

  findById = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await this.fileService.findById(userId, id);

    res.status(200).json({
      success: true,
      data: file,
    });
  };

  download = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await this.fileService.findById(userId, id);
    const filePath = await this.fileService.getFilePath(userId, id);

    // Enforce path traversal defense
    if (!storageService.isSafePathGlobal(filePath)) {
      throw new ForbiddenError("Access denied: Invalid file path");
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError("File not found on disk");
    }

    if (shouldSandbox(file.mimeType, file.extension)) {
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox;");
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.originalName)}"`
    );

    res.sendFile(path.resolve(filePath));
  };

  update = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { originalName } = req.body;

    const file = await this.fileService.update(userId, id, originalName);

    res.status(200).json({
      success: true,
      data: file,
      message: "File renamed successfully",
    });
  };

  delete = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    await this.fileService.delete(userId, id);

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  };

  recent = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const files = await this.fileService.getRecentFiles(userId, limit);

    res.status(200).json({
      success: true,
      data: files,
    });
  };

  favorites = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;

    const files = await this.fileService.getFavorites(userId);

    res.status(200).json({
      success: true,
      data: files,
    });
  };

  toggleFavorite = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await this.fileService.toggleFavorite(userId, id);

    res.status(200).json({
      success: true,
      data: file,
      message: file.isFavorite ? "Added to favorites" : "Removed from favorites",
    });
  };

  getThumbnail = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const size = (req.query.size as string) || "medium";

    console.log(`[Thumbnail] Request for file ${id}, size: ${size}, userId: ${userId}`);
    const file = await this.fileService.findById(userId, id);
    console.log(`[Thumbnail] File found, thumbnailSmall: ${file.thumbnailSmall}, thumbnailMedium: ${file.thumbnailMedium}, thumbnailLarge: ${file.thumbnailLarge}`);

    let thumbnailPath: string | null = null;
    switch (size) {
      case "small":
        thumbnailPath = file.thumbnailSmall;
        break;
      case "large":
        thumbnailPath = file.thumbnailLarge;
        break;
      default:
        thumbnailPath = file.thumbnailMedium || file.thumbnail;
    }

    console.log(`[Thumbnail] Selected path: ${thumbnailPath}`);
    if (thumbnailPath) {
      console.log(`[Thumbnail] File exists: ${fs.existsSync(thumbnailPath)}`);
    }

    if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
      console.log(`[Thumbnail] Thumbnail not found at path: ${thumbnailPath}`);
      throw new NotFoundError("Thumbnail not found");
    }

    // Enforce path traversal defense
    if (!storageService.isSafePath(userId, thumbnailPath)) {
      throw new ForbiddenError("Access denied: Invalid thumbnail path");
    }

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", "image/jpeg");
    res.sendFile(path.resolve(thumbnailPath));
  };

  move = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { folderId } = req.body;

    const file = await this.fileService.move(userId, id, folderId || null);

    res.json({
      success: true,
      data: file,
    });
  };

  stream = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await this.fileService.findById(userId, id);
    const filePath = await this.fileService.getFilePath(userId, id);

    // Enforce path traversal defense
    if (!storageService.isSafePathGlobal(filePath)) {
      throw new ForbiddenError("Access denied: Invalid file path");
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError("File not found on disk");
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (shouldSandbox(file.mimeType, file.extension)) {
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox;");
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end >= fileSize) {
        res.status(416).end();
        return;
      }
      const chunksize = end - start + 1;

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", chunksize);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Cache-Control", "public, max-age=3600");

      const stream = fs.createReadStream(filePath, { start, end });
      stream.on("error", () => { try { res.end(); } catch {} });
      stream.pipe(res);
    } else {
      res.status(200);
      res.setHeader("Content-Length", fileSize);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=3600");

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => { try { res.end(); } catch {} });
      stream.pipe(res);
    }
  };

  trash = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const file = await this.fileService.trash(userId, req.params.id);
    res.json({ success: true, data: file });
  };

  restore = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const file = await this.fileService.restore(userId, req.params.id);
    res.json({ success: true, data: file });
  };

  permanentDelete = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    await this.fileService.permanentDelete(userId, req.params.id);
    res.json({ success: true, message: "File permanently deleted" });
  };

  listTrash = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const files = await this.fileService.listTrash(userId);
    res.json({ success: true, data: files });
  };

  emptyTrash = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    await this.fileService.emptyTrash(userId);
    res.json({ success: true, message: "Trash emptied" });
  };

  copy = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { folderId } = req.body;
    const file = await this.fileService.copy(userId, id, folderId || null);
    res.json({ success: true, data: file });
  };

  duplicate = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const file = await this.fileService.copy(userId, id, null);
    res.json({ success: true, data: file });
  };

  bulkAction = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { action, fileIds, targetFolderId } = req.body;

    if (!action || !fileIds || !Array.isArray(fileIds)) {
      throw new BadRequestError("action and fileIds are required");
    }

    let result: number;
    switch (action) {
      case "trash":
        result = await this.fileService.bulkTrash(userId, fileIds);
        break;
      case "restore":
        result = await this.fileService.bulkRestore(userId, fileIds);
        break;
      case "move":
        result = await this.fileService.bulkMove(userId, fileIds, targetFolderId || null);
        break;
      case "copy":
        result = await this.fileService.bulkCopy(userId, fileIds, targetFolderId || null);
        break;
      default:
        throw new BadRequestError(`Unknown action: ${action}`);
    }

    res.json({ success: true, data: { processed: result } });
  };
}
