import { PrismaClient } from "@prisma/client";
import { storageService } from "./storageService";
import { NotFoundError, ForbiddenError, ConflictError } from "../utils/errors";
import { FolderTree } from "../types";

export class FolderService {
  constructor(private prisma: PrismaClient) {}

  async create(
    userId: string,
    name: string,
    parentId?: string | null
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }> {
    if (parentId) {
      const parent = await this.prisma.folder.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundError("Parent folder not found");
      }

      if (parent.userId !== userId) {
        throw new ForbiddenError("Access denied to parent folder");
      }
    }

    const existing = await this.prisma.folder.findFirst({
      where: {
        userId,
        parentId: parentId || null,
        name,
      },
    });

    if (existing) {
      throw new ConflictError("A folder with this name already exists here");
    }

    const folder = await this.prisma.folder.create({
      data: {
        userId,
        parentId: parentId || null,
        name,
      },
    });

    await storageService.ensureUserDirectories(userId);

    return {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
    };
  }

  async findAll(
    userId: string,
    parentId?: string
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }[]> {
    const where: any = { userId, deletedAt: null };

    if (parentId) {
      where.parentId = parentId;
    } else {
      where.parentId = null;
    }

    const folders = await this.prisma.folder.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      createdAt: f.createdAt,
    }));
  }

  async findTree(userId: string): Promise<FolderTree[]> {
    const folders = await this.prisma.folder.findMany({
      where: { userId, deletedAt: null },
      orderBy: { name: "asc" },
    });

    const folderMap = new Map<string, FolderTree>();
    const roots: FolderTree[] = [];

    for (const folder of folders) {
      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
        children: [],
      });
    }

    for (const folder of folders) {
      const node = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        folderMap.get(folder.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findBreadcrumb(
    userId: string,
    folderId: string
  ): Promise<{ id: string; name: string }[]> {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.userId !== userId) {
      throw new NotFoundError("Folder not found");
    }

    const breadcrumb: { id: string; name: string }[] = [];
    let current: string | null = folderId;

    while (current) {
      const currentId: string = current;
      const f = await this.prisma.folder.findUnique({
        where: { id: currentId },
      });
      if (!f) break;
      breadcrumb.unshift({ id: f.id, name: f.name });
      current = f.parentId;
    }

    return breadcrumb;
  }

  async update(
    userId: string,
    id: string,
    name: string
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
    });

    if (!folder) {
      throw new NotFoundError("Folder not found");
    }

    if (folder.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    const duplicate = await this.prisma.folder.findFirst({
      where: {
        userId,
        parentId: folder.parentId,
        name,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ConflictError("A folder with this name already exists here");
    }

    const updated = await this.prisma.folder.update({
      where: { id },
      data: { name },
    });

    return {
      id: updated.id,
      name: updated.name,
      parentId: updated.parentId,
      createdAt: updated.createdAt,
    };
  }

  async delete(userId: string, id: string): Promise<void> {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        children: true,
        files: true,
      },
    });

    if (!folder) {
      throw new NotFoundError("Folder not found");
    }

    if (folder.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    for (const file of folder.files) {
      await storageService.deleteFile(userId, file.storedName);
    }

    for (const child of folder.children) {
      await this.delete(userId, child.id);
    }

    await storageService.deleteFolder(userId, folder.id);

    await this.prisma.folder.delete({
      where: { id },
    });
  }

  // === Trash operations (soft delete) ===

  async trash(userId: string, folderId: string): Promise<void> {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");

    const totalSize = await this.softDeleteRecursive(userId, folderId);

    // Update user trash size
    if (totalSize > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { trashSize: { increment: totalSize } },
      });
    }
  }

  private async softDeleteRecursive(userId: string, folderId: string): Promise<number> {
    let totalSize = 0;

    // Soft-delete all files in this folder
    const files = await this.prisma.file.findMany({
      where: { folderId, deletedAt: null },
    });

    for (const file of files) {
      await this.prisma.file.update({
        where: { id: file.id },
        data: { deletedAt: new Date() },
      });
      totalSize += Number(file.size);
    }

    // Recursively soft-delete child folders
    const children = await this.prisma.folder.findMany({
      where: { parentId: folderId, deletedAt: null },
    });

    for (const child of children) {
      totalSize += await this.softDeleteRecursive(userId, child.id);
    }

    // Soft-delete this folder
    await this.prisma.folder.update({
      where: { id: folderId },
      data: { deletedAt: new Date() },
    });

    return totalSize;
  }

  async restore(userId: string, folderId: string): Promise<void> {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");
    if (!folder.deletedAt) return; // Not trashed

    const totalSize = await this.restoreRecursive(userId, folderId);

    // Update user trash size
    if (totalSize > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { trashSize: { decrement: totalSize } },
      });
    }
  }

  private async restoreRecursive(userId: string, folderId: string): Promise<number> {
    let totalSize = 0;

    // Restore all files in this folder
    const files = await this.prisma.file.findMany({
      where: { folderId, deletedAt: { not: null } },
    });

    for (const file of files) {
      await this.prisma.file.update({
        where: { id: file.id },
        data: { deletedAt: null },
      });
      totalSize += Number(file.size);
    }

    // Recursively restore child folders
    const children = await this.prisma.folder.findMany({
      where: { parentId: folderId, deletedAt: { not: null } },
    });

    for (const child of children) {
      totalSize += await this.restoreRecursive(userId, child.id);
    }

    // Restore this folder
    await this.prisma.folder.update({
      where: { id: folderId },
      data: { deletedAt: null },
    });

    return totalSize;
  }

  async permanentDelete(userId: string, folderId: string): Promise<void> {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");

    const totalSize = await this.permanentDeleteRecursive(userId, folderId);

    // Update storage counters
    if (totalSize > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          storageUsed: { decrement: totalSize },
          trashSize: { decrement: totalSize },
        },
      });
    }
  }

  private async permanentDeleteRecursive(userId: string, folderId: string): Promise<number> {
    let totalSize = 0;

    // Get child folders
    const children = await this.prisma.folder.findMany({
      where: { parentId: folderId },
    });

    for (const child of children) {
      totalSize += await this.permanentDeleteRecursive(userId, child.id);
    }

    // Delete all files in this folder
    const files = await this.prisma.file.findMany({
      where: { folderId },
    });

    for (const file of files) {
      try {
        const fs = require("fs");
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {}
      totalSize += Number(file.size);
      await this.prisma.file.delete({ where: { id: file.id } });
    }

    // Delete the folder
    await this.prisma.folder.delete({ where: { id: folderId } });

    return totalSize;
  }

  async listTrash(userId: string): Promise<{ id: string; name: string; parentId: string | null; deletedAt: Date }[]> {
    const folders = await this.prisma.folder.findMany({
      where: { userId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    });

    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      deletedAt: f.deletedAt!,
    }));
  }

  private async isDescendant(
    potentialDescendantId: string,
    potentialAncestorId: string | null,
    userId: string
  ): Promise<boolean> {
    if (!potentialAncestorId) return false;
    if (potentialDescendantId === potentialAncestorId) return true;

    const folder = await this.prisma.folder.findUnique({
      where: { id: potentialDescendantId },
    });

    if (!folder || folder.userId !== userId) return false;
    if (!folder.parentId) return false;

    return this.isDescendant(folder.parentId, potentialAncestorId, userId);
  }

  async move(
    userId: string,
    folderId: string,
    targetParentId: string | null
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }> {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");

    if (targetParentId) {
      const targetParent = await this.prisma.folder.findUnique({ where: { id: targetParentId } });
      if (!targetParent) throw new NotFoundError("Target folder not found");
      if (targetParent.userId !== userId) throw new ForbiddenError("Access denied");

      if (await this.isDescendant(folderId, targetParentId, userId)) {
        throw new ForbiddenError("Cannot move folder into itself or its descendant");
      }
    }

    const existing = await this.prisma.folder.findFirst({
      where: {
        userId,
        parentId: targetParentId,
        name: folder.name,
        NOT: { id: folderId },
      },
    });

    if (existing) {
      const ext = "";
      const nameWithoutExt = folder.name;
      let newName = `${nameWithoutExt} (copy)${ext}`;
      let counter = 1;
      while (await this.prisma.folder.findFirst({
        where: { userId, parentId: targetParentId, name: newName },
      })) {
        counter++;
        newName = `${nameWithoutExt} (copy ${counter})${ext}`;
      }
      const updated = await this.prisma.folder.update({
        where: { id: folderId },
        data: { parentId: targetParentId, name: newName },
      });
      return {
        id: updated.id,
        name: updated.name,
        parentId: updated.parentId,
        createdAt: updated.createdAt,
      };
    }

    const updated = await this.prisma.folder.update({
      where: { id: folderId },
      data: { parentId: targetParentId },
    });

    return {
      id: updated.id,
      name: updated.name,
      parentId: updated.parentId,
      createdAt: updated.createdAt,
    };
  }

  async copy(
    userId: string,
    folderId: string,
    targetParentId: string | null
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }> {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");

    let copyName = folder.name;
    let counter = 1;
    while (await this.prisma.folder.findFirst({
      where: { userId, parentId: targetParentId, name: copyName },
    })) {
      copyName = `${folder.name} (copy ${counter})`;
      counter++;
    }

    const copiedFolder = await this.prisma.folder.create({
      data: {
        userId,
        parentId: targetParentId,
        name: copyName,
      },
    });

    const childFiles = await this.prisma.file.findMany({
      where: { folderId, deletedAt: null },
    });

    for (const file of childFiles) {
      await this.prisma.file.create({
        data: {
          userId,
          folderId: copiedFolder.id,
          originalName: file.originalName,
          storedName: file.storedName,
          path: file.path,
          mimeType: file.mimeType,
          category: file.category,
          size: file.size,
          hash: file.hash,
          refCount: file.refCount,
        },
      });
    }

    const childFolders = await this.prisma.folder.findMany({
      where: { parentId: folderId, deletedAt: null },
    });

    for (const child of childFolders) {
      await this.copyFolderRecursive(userId, child.id, copiedFolder.id);
    }

    return {
      id: copiedFolder.id,
      name: copiedFolder.name,
      parentId: copiedFolder.parentId,
      createdAt: copiedFolder.createdAt,
    };
  }

  private async copyFolderRecursive(
    userId: string,
    sourceFolderId: string,
    targetParentId: string
  ): Promise<void> {
    const sourceFolder = await this.prisma.folder.findUnique({ where: { id: sourceFolderId } });
    if (!sourceFolder) return;

    const newFolder = await this.prisma.folder.create({
      data: {
        userId,
        parentId: targetParentId,
        name: sourceFolder.name,
      },
    });

    const files = await this.prisma.file.findMany({
      where: { folderId: sourceFolderId, deletedAt: null },
    });

    for (const file of files) {
      await this.prisma.file.create({
        data: {
          userId,
          folderId: newFolder.id,
          originalName: file.originalName,
          storedName: file.storedName,
          path: file.path,
          mimeType: file.mimeType,
          category: file.category,
          size: file.size,
          hash: file.hash,
          refCount: file.refCount,
        },
      });
    }

    const children = await this.prisma.folder.findMany({
      where: { parentId: sourceFolderId, deletedAt: null },
    });

    for (const child of children) {
      await this.copyFolderRecursive(userId, child.id, newFolder.id);
    }
  }
}
