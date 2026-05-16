"use client";

import { useState, useRef } from "react";
import { FileItem, useFileStore } from "@/store/fileStore";
import { useClipboardStore } from "@/store/clipboardStore";
import { useToastStore } from "@/store/toastStore";
import { cn, formatFileSize, formatDate, authUrl } from "@/lib/utils";
import { getFileTypeInfo } from "@/lib/fileTypes";
import { filesApi } from "@/lib/api";
import {
  Download, Trash2, Pencil, MoreVertical, FileText, Share2, Star,
  RotateCcw, X, FolderInput, Copy, History, Link, Scissors, ClipboardPaste,
  CopyPlus,
} from "lucide-react";
import { RenameDialog } from "./rename-dialog";
import { ShareDialog } from "./share-dialog";
import { MoveDialog } from "./move-dialog";
import { CopyDialog } from "./copy-dialog";
import { VersionModal } from "./version-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContextMenu, useContextMenu, ContextMenuItem } from "@/components/ui/context-menu";

interface FileCardProps {
  file: FileItem;
  viewMode: "grid" | "list";
  onPreview?: () => void;
  isTrashView?: boolean;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function FileCard({
  file, viewMode, onPreview, isTrashView,
  isSelected: isSelectedProp, onSelect, onContextMenu: onContextMenuProp,
  draggable, onDragStart,
}: FileCardProps) {
  const store = useFileStore();
  const { downloadFile, trashFile, restoreFile, permanentDeleteFile, selectedIds, toggleSelect, duplicateFile } = store;
  const { copy: clipboardCopy, cut: clipboardCut } = useClipboardStore();
  const { addToast } = useToastStore();
  const { menu: contextMenu, open: openContextMenu, close: closeContextMenu } = useContextMenu();

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(file.isFavorite || false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fileTypeInfo = getFileTypeInfo(file.category);
  const Icon = fileTypeInfo.icon;
  const isSelected = isSelectedProp ?? selectedIds.has(file.id);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await filesApi.toggleFavorite(file.id);
      setIsFavorite(!isFavorite);
      addToast(isFavorite ? "Removed from favorites" : "Added to favorites", "info");
    } catch {}
  };

  const handleTrash = async () => {
    setIsProcessing(true);
    try {
      await trashFile(file.id);
      addToast(`"${file.originalName}" moved to trash`, "success");
    } catch {
      addToast("Failed to trash file", "error");
    }
    setIsProcessing(false);
  };

  const handlePermanentDelete = async () => {
    setIsProcessing(true);
    try {
      await permanentDeleteFile(file.id);
      addToast(`"${file.originalName}" permanently deleted`, "success");
    } catch {
      addToast("Failed to delete file", "error");
    }
    setIsProcessing(false);
  };

  const handleDuplicate = async () => {
    try {
      await duplicateFile(file.id);
      addToast(`"${file.originalName}" duplicated`, "success");
    } catch {
      addToast("Failed to duplicate file", "error");
    }
  };

  const handleCopyToClipboard = () => {
    clipboardCopy([{ id: file.id, type: "file", name: file.originalName }], file.folderId);
    addToast(`"${file.originalName}" copied`, "info");
  };

  const handleCutToClipboard = () => {
    clipboardCut([{ id: file.id, type: "file", name: file.originalName }], file.folderId);
    addToast(`"${file.originalName}" cut`, "info");
  };

  const handleDownload = () => {
    downloadFile(file.id, file.originalName);
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (isTrashView) {
      return [
        { label: "Restore", icon: <RotateCcw className="w-4 h-4" />, onClick: () => restoreFile(file.id) },
        { divider: true, label: "", onClick: () => {} },
        { label: "Delete Forever", icon: <Trash2 className="w-4 h-4" />, onClick: () => setConfirmPermanent(true), destructive: true },
      ];
    }

    return [
      { label: "Preview", icon: <FileText className="w-4 h-4" />, shortcut: "Space", onClick: () => onPreview?.() },
      { label: "Download", icon: <Download className="w-4 h-4" />, shortcut: "mod+S", onClick: handleDownload },
      { divider: true, label: "", onClick: () => {} },
      { label: "Copy", icon: <Copy className="w-4 h-4" />, shortcut: "mod+C", onClick: handleCopyToClipboard },
      { label: "Cut", icon: <Scissors className="w-4 h-4" />, shortcut: "mod+X", onClick: handleCutToClipboard },
      { label: "Duplicate", icon: <CopyPlus className="w-4 h-4" />, shortcut: "mod+D", onClick: handleDuplicate },
      { divider: true, label: "", onClick: () => {} },
      { label: "Rename", icon: <Pencil className="w-4 h-4" />, shortcut: "F2", onClick: () => setIsRenameOpen(true) },
      { label: "Move to", icon: <FolderInput className="w-4 h-4" />, onClick: () => setIsMoveOpen(true) },
      { label: "Copy to", icon: <Copy className="w-4 h-4" />, onClick: () => setIsCopyOpen(true) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Share", icon: <Share2 className="w-4 h-4" />, onClick: () => setIsShareOpen(true) },
      { label: isFavorite ? "Unfavorite" : "Favorite", icon: <Star className={cn("w-4 h-4", isFavorite && "fill-yellow-400 text-yellow-400")} />, onClick: () => toggleFavorite(new MouseEvent("click") as any) },
      { label: "Version History", icon: <History className="w-4 h-4" />, onClick: () => setIsVersionOpen(true) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Move to Trash", icon: <Trash2 className="w-4 h-4" />, shortcut: "Del", onClick: () => setConfirmDelete(true), destructive: true },
    ];
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenuProp) {
      onContextMenuProp(e);
    } else {
      openContextMenu(e, getContextMenuItems());
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    console.log("FileCard click", file.id, e.detail);
    if (e.detail > 1) return;
    
    e.stopPropagation();
    toggleSelect(file.id, e as any);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview?.();
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e);
    } else {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/json", JSON.stringify([{ id: file.id, type: "file", name: file.originalName }]));
    }
  };

  // Grid view
  if (viewMode === "grid") {
    return (
      <div
        className={cn(
          "group relative rounded-sm border transition-all duration-150 cursor-pointer select-none",
          isSelected ? "border-accent-sunset/50 bg-accent-sunset/5" : "border-hairline hover:border-body-mid bg-canvas-card",
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        draggable={draggable}
        onDragStart={handleDragStart}
      >
        {/* Checkbox */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <div
            className={cn(
              "w-4.5 h-4.5 rounded-sm border-2 flex items-center justify-center transition-all duration-150",
              isSelected ? "bg-accent-sunset border-accent-sunset" : "border-body-mid/40 opacity-0 group-hover:opacity-100",
            )}
          >
            {isSelected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>

        {/* Favorite star */}
        <button onClick={toggleFavorite} className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Star className={cn("w-4 h-4", isFavorite ? "fill-yellow-400 text-yellow-400 opacity-100" : "text-body-mid")} style={isFavorite ? { opacity: 1 } : undefined} />
        </button>

        {/* 3-dot menu */}
        <button
          onClick={(e) => { e.stopPropagation(); handleContextMenu(e); }}
          className="absolute top-2.5 right-8 z-10 p-1 rounded-sm bg-canvas-card/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-canvas-mid"
        >
          <MoreVertical className="w-3.5 h-3.5 text-body-mid" />
        </button>

        {/* Thumbnail */}
        <div className="aspect-square flex items-center justify-center p-4 overflow-hidden">
          {file.thumbnailSmall || file.thumbnail ? (
            <img src={authUrl(`/files/${file.id}/thumbnail?size=small`)} alt={file.originalName} className="w-full h-full object-cover rounded-sm" loading="lazy" />
          ) : (
            <Icon className="w-10 h-10 text-body-mid" />
          )}
        </div>

        {/* Info */}
        <div className="px-3 pb-3">
          <p className="text-sm text-ink truncate mb-1">{file.originalName}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-body-mid font-mono">{formatFileSize(file.size)}</p>
            {(file as any).refCount > 1 && (
              <span className="flex items-center gap-0.5 text-xs text-mute" title={`Shared with ${(file as any).refCount - 1} other(s)`}>
                <Link className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <RenameDialog open={isRenameOpen} onOpenChange={setIsRenameOpen} itemId={file.id} itemName={file.originalName} itemType="file" />
        <ShareDialog fileId={file.id} fileName={file.originalName} open={isShareOpen} onOpenChange={setIsShareOpen} />
        <MoveDialog fileId={file.id} fileName={file.originalName} open={isMoveOpen} onOpenChange={setIsMoveOpen} onMoved={() => {}} />
        <CopyDialog fileId={file.id} fileName={file.originalName} isOpen={isCopyOpen} onClose={() => setIsCopyOpen(false)} />
        <VersionModal fileId={file.id} fileName={file.originalName} isOpen={isVersionOpen} onClose={() => setIsVersionOpen(false)} />
        <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Move to Trash" description={`"${file.originalName}" will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleTrash} loading={isProcessing} />
        <ConfirmDialog open={confirmPermanent} onOpenChange={setConfirmPermanent} title="Delete Permanently" description={`"${file.originalName}" will be permanently deleted. This cannot be undone.`} confirmLabel="Delete Forever" variant="destructive" onConfirm={handlePermanentDelete} loading={isProcessing} />

        {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />}
      </div>
    );
  }

  // List view
  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-sm border transition-all duration-150 cursor-pointer select-none",
        isSelected ? "border-accent-sunset/50 bg-accent-sunset/5" : "border-transparent hover:bg-canvas-soft/50",
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {/* Checkbox */}
      <div
        className={cn(
          "w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 transition-all duration-150",
          isSelected ? "bg-accent-sunset border-accent-sunset" : "border-body-mid/40 opacity-0 group-hover:opacity-100",
        )}
      >
        {isSelected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Thumbnail */}
      <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden rounded-sm">
        {file.thumbnailSmall || file.thumbnail ? (
          <img src={authUrl(`/files/${file.id}/thumbnail?size=small`)} alt={file.originalName} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Icon className="w-5 h-5 text-body-mid" />
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">{file.originalName}</p>
      </div>

      {/* Size */}
      <p className="text-xs text-body-mid font-mono shrink-0 w-20 text-right">{formatFileSize(file.size)}</p>

      {/* Date */}
      <p className="text-xs text-body-mid shrink-0 w-28 text-right hidden md:block">{formatDate(file.createdAt)}</p>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(e); }} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors" title="Favorite">
          <Star className={cn("w-3.5 h-3.5", isFavorite ? "fill-yellow-400 text-yellow-400" : "text-body-mid")} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors" title="Download">
          <Download className="w-3.5 h-3.5 text-body-mid" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors" title="Share">
          <Share2 className="w-3.5 h-3.5 text-body-mid" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setIsRenameOpen(true); }} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors" title="Rename">
          <Pencil className="w-3.5 h-3.5 text-body-mid" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setIsMoveOpen(true); }} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors" title="Move to">
          <FolderInput className="w-3.5 h-3.5 text-body-mid" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors" title="Move to Trash">
          <Trash2 className="w-3.5 h-3.5 text-body-mid" />
        </button>
      </div>

      {/* Dialogs */}
      <RenameDialog open={isRenameOpen} onOpenChange={setIsRenameOpen} itemId={file.id} itemName={file.originalName} itemType="file" />
      <ShareDialog fileId={file.id} fileName={file.originalName} open={isShareOpen} onOpenChange={setIsShareOpen} />
      <MoveDialog fileId={file.id} fileName={file.originalName} open={isMoveOpen} onOpenChange={setIsMoveOpen} onMoved={() => {}} />
      <CopyDialog fileId={file.id} fileName={file.originalName} isOpen={isCopyOpen} onClose={() => setIsCopyOpen(false)} />
      <VersionModal fileId={file.id} fileName={file.originalName} isOpen={isVersionOpen} onClose={() => setIsVersionOpen(false)} />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Move to Trash" description={`"${file.originalName}" will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleTrash} loading={isProcessing} />
      <ConfirmDialog open={confirmPermanent} onOpenChange={setConfirmPermanent} title="Delete Permanently" description={`"${file.originalName}" will be permanently deleted. This cannot be undone.`} confirmLabel="Delete Forever" variant="destructive" onConfirm={handlePermanentDelete} loading={isProcessing} />

      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />}
    </div>
  );
}
