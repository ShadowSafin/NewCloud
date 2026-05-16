import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/errors";

export class ShareService {
  constructor(private prisma: PrismaClient) {}

  async create(
    userId: string,
    fileId: string,
    options?: { password?: string; expiresIn?: number }
  ): Promise<{ id: string; token: string; expiresAt: Date | null; url: string }> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundError("File not found");
    }

    if (file.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    const token = randomBytes(32).toString("hex");
    let passwordHash: string | null = null;

    if (options?.password) {
      passwordHash = await bcrypt.hash(options.password, 12);
    }

    let expiresAt: Date | null = null;
    if (options?.expiresIn) {
      expiresAt = new Date(Date.now() + options.expiresIn * 1000);
    }

    const share = await this.prisma.share.create({
      data: {
        fileId,
        userId,
        token,
        passwordHash,
        expiresAt,
      },
    });

    return {
      id: share.id,
      token: share.token,
      expiresAt: share.expiresAt,
      url: `/share/${share.token}`,
    };
  }

  async findByToken(token: string, password?: string): Promise<{
    file: {
      id: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
    expiresAt: Date | null;
    requiresPassword: boolean;
  }> {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: { file: true },
    });

    if (!share) {
      throw new NotFoundError("Share not found");
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new BadRequestError("Share link has expired");
    }

    if (share.passwordHash) {
      if (!password) {
        return {
          file: {
            id: share.file.id,
            originalName: share.file.originalName,
            mimeType: share.file.mimeType,
            size: Number(share.file.size),
          },
          expiresAt: share.expiresAt,
          requiresPassword: true,
        };
      }

      const valid = await bcrypt.compare(password, share.passwordHash);
      if (!valid) {
        throw new ForbiddenError("Invalid password");
      }
    }

    await this.prisma.share.update({
      where: { id: share.id },
      data: { views: { increment: 1 } },
    });

    return {
      file: {
        id: share.file.id,
        originalName: share.file.originalName,
        mimeType: share.file.mimeType,
        size: Number(share.file.size),
      },
      expiresAt: share.expiresAt,
      requiresPassword: false,
    };
  }

  async findByFileId(userId: string, fileId: string): Promise<{
    id: string;
    token: string;
    expiresAt: Date | null;
    views: number;
    createdAt: Date;
  }[]> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    return await this.prisma.share.findMany({
      where: { fileId },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        views: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async delete(userId: string, shareId: string): Promise<void> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      throw new NotFoundError("Share not found");
    }

    if (share.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    await this.prisma.share.delete({
      where: { id: shareId },
    });
  }

  async getSharedFilePath(token: string, password?: string): Promise<{ filePath: string; file: { id: string; originalName: string; mimeType: string; size: number } }> {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: { file: true },
    });

    if (!share) {
      throw new NotFoundError("Share not found");
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new BadRequestError("Share link has expired");
    }

    if (share.passwordHash) {
      if (!password) {
        throw new ForbiddenError("Password required");
      }
      const bcrypt = require("bcryptjs");
      const valid = await bcrypt.compare(password, share.passwordHash);
      if (!valid) {
        throw new ForbiddenError("Invalid password");
      }
    }

    // Increment view counter
    await this.prisma.share.update({
      where: { id: share.id },
      data: { views: { increment: 1 } },
    });

    return {
      filePath: share.file.path,
      file: {
        id: share.file.id,
        originalName: share.file.originalName,
        mimeType: share.file.mimeType,
        size: Number(share.file.size),
      },
    };
  }
}

import { prisma } from "../db";
export const shareService = new ShareService(prisma);