import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { storageService } from "./storageService";
import { chunkMergeQueue } from "../lib/queues";
import { BadRequestError, NotFoundError } from "../utils/errors";

export class UploadService {
  constructor(private prisma: PrismaClient) {}

  async initiate(userId: string, filename: string, mimeType: string, totalSize: number, folderId?: string) {
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(totalSize / chunkSize);

    // Validate folder if provided
    if (folderId) {
      const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder || folder.userId !== userId) throw new NotFoundError("Folder not found");
    }

    // Create upload directory
    const uploadDir = path.join(storageService["rootPath"], userId, "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const session = await this.prisma.uploadSession.create({
      data: {
        userId,
        filename,
        mimeType,
        totalSize: BigInt(totalSize),
        chunkSize,
        totalChunks,
        folderId: folderId || null,
        status: "uploading",
      },
    });

    // Pre-create chunk records
    const chunkData = [];
    for (let i = 0; i < totalChunks; i++) {
      chunkData.push({
        sessionId: session.id,
        chunkIndex: i,
        path: path.join(uploadDir, `${session.id}_chunk_${i}`),
        size: BigInt(i < totalChunks - 1 ? chunkSize : totalSize - (chunkSize * (totalChunks - 1))),
        uploaded: false,
      });
    }

    await this.prisma.uploadChunk.createMany({ data: chunkData });

    return {
      sessionId: session.id,
      chunkSize,
      totalChunks,
      filename,
      totalSize,
    };
  }

  async uploadChunk(
    userId: string,
    sessionId: string,
    chunkIndex: number,
    data: Buffer,
    hash?: string
  ) {
    const session = await this.prisma.uploadSession.findUnique({
      where: { id: sessionId },
      include: { chunks: true },
    });

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");
    if (session.status === "completed" || session.status === "cancelled") {
      throw new BadRequestError(`Session is ${session.status}`);
    }

    const chunk = session.chunks.find((c) => c.chunkIndex === chunkIndex);
    if (!chunk) throw new NotFoundError("Chunk not found");

    // Stream-based write to disk
    const writeStream = fs.createWriteStream(chunk.path);
    writeStream.write(data);
    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Verify hash if provided
    if (hash) {
      const computedHash = crypto.createHash("sha256").update(data).digest("hex");
      if (computedHash !== hash) {
        throw new BadRequestError("Chunk hash mismatch - data corrupted");
      }
    }

    // Mark chunk as uploaded
    await this.prisma.uploadChunk.update({
      where: { id: chunk.id },
      data: { uploaded: true, hash: hash || null },
    });

    // Update session uploaded count
    const uploadedCount = await this.prisma.uploadChunk.count({
      where: { sessionId, uploaded: true },
    });

    await this.prisma.uploadSession.update({
      where: { id: sessionId },
      data: {
        uploadedChunks: uploadedCount,
        status: "uploading",
      },
    });

    return {
      chunkIndex,
      uploaded: true,
      progress: uploadedCount / session.totalChunks,
    };
  }

  async complete(userId: string, sessionId: string) {
    const session = await this.prisma.uploadSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");
    if (session.status === "completed") throw new BadRequestError("Session already completed");
    if (session.status === "cancelled") throw new BadRequestError("Session is cancelled");

    // Check all chunks are uploaded
    const unuploaded = await this.prisma.uploadChunk.count({
      where: { sessionId, uploaded: false },
    });

    if (unuploaded > 0) {
      throw new BadRequestError(`${unuploaded} chunks not yet uploaded`);
    }

    // Mark as merging - actual merge happens in background worker
    await this.prisma.uploadSession.update({
      where: { id: sessionId },
      data: { status: "merging" },
    });

    // Enqueue background merge job
    await chunkMergeQueue.add("merge", { sessionId, userId });

    return {
      sessionId,
      status: "merging",
      message: "Upload complete, merging chunks in background",
    };
  }

  async cancel(userId: string, sessionId: string) {
    const session = await this.prisma.uploadSession.findUnique({
      where: { id: sessionId },
      include: { chunks: true },
    });

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");

    // Clean up chunk files
    for (const chunk of session.chunks) {
      try {
        if (fs.existsSync(chunk.path)) fs.unlinkSync(chunk.path);
      } catch {}
    }

    await this.prisma.uploadSession.update({
      where: { id: sessionId },
      data: { status: "cancelled" },
    });

    return { sessionId, status: "cancelled" };
  }

  async getStatus(userId: string, sessionId: string) {
    const session = await this.prisma.uploadSession.findUnique({
      where: { id: sessionId },
      include: {
        chunks: {
          select: { chunkIndex: true, uploaded: true, hash: true },
          orderBy: { chunkIndex: "asc" },
        },
      },
    });

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");

    return {
      sessionId: session.id,
      filename: session.filename,
      status: session.status,
      progress: session.totalChunks > 0 ? session.uploadedChunks / session.totalChunks : 0,
      uploadedChunks: session.uploadedChunks,
      totalChunks: session.totalChunks,
      chunks: session.chunks,
    };
  }

  async listSessions(userId: string) {
    return this.prisma.uploadSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getResumeInfo(userId: string, sessionId: string) {
    const session = await this.prisma.uploadSession.findUnique({
      where: { id: sessionId },
      include: {
        chunks: {
          where: { uploaded: false },
          select: { chunkIndex: true },
          orderBy: { chunkIndex: "asc" },
        },
      },
    });

    if (!session) throw new NotFoundError("Session not found");
    if (session.userId !== userId) throw new BadRequestError("Access denied");

    return {
      sessionId: session.id,
      filename: session.filename,
      status: session.status,
      totalChunks: session.totalChunks,
      pendingChunks: session.chunks.map((c) => c.chunkIndex),
      chunkSize: session.chunkSize,
    };
  }
}
