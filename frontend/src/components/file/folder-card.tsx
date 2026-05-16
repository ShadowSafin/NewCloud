"use client";

import { useState } from "react";
import { FolderItem, useFileStore } from "@/store/fileStore";
import { useToastStore } from "@/store/toastStore";
import { cn, formatDate } from "@/lib/utils";
import { Folder, Pencil, Trash2, MoreVertical } from "lucide-react";
import { RenameDialog } from "./rename-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContextMenu, useContextMenu, ContextMenuItem } from "@/components/ui/context-menu";

interface FolderCardProps {
  folder: FolderItem;
  viewMode: "grid" | "list";
  onNavigate: (folderId: string) => void;
  isTrashView?: boolean;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  isDropTarget?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function FolderCard({
  folder, viewMode, onNavigate, isTrashView,
  isSelected, onSelect, isDropTarget,
  onDragOver, onDragLeave, onDrop,
}: FolderCardProps) {
  const store = useFileStore();
  const { deleteFolder, trashFolder, toggleSelect, selectedIds } = store;
  const { addToast } = useToastStore();
  const { menu: contextMenu, open: openContextMenu, close: closeContextMenu } = useContextMenu();

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isSelectedFinal = isSelected ?? selectedIds.has(folder.id);

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await trashFolder(folder.id);
      addToast(`"${folder.name}" moved to trash`, "success");
    } catch {
      addToast("Failed to trash folder", "error");
    }
    setIsProcessing(false);
  };

  const getContextMenuItems = (): ContextMenuItem[] => [
    { label: "Open", icon: <Folder className="w-4 h-4" />, shortcut: "Enter", onClick: () => onNavigate(folder.id) },
    { divider: true, label: "", onClick: () => {} },
    { label: "Rename", icon: <Pencil className="w-4 h-4" />, shortcut: "F2", onClick: () => setIsRenameOpen(true) },
    { divider: true, label: "", onClick: () => {} },
    { label: "Move to Trash", icon: <Trash2 className="w-4 h-4" />, shortcut: "Del", onClick: () => setConfirmDelete(true), destructive: true },
  ];

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e, getContextMenuItems());
  };

  const handleClick = (e: React.MouseEvent) => {
    console.log("FolderCard click", folder.id, e.detail);
    if (e.detail > 1) return;
    
    e.stopPropagation();
    toggleSelect(folder.id, e as any);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(folder.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify([{ id: folder.id, type: "folder", name: folder.name }]));
  };

  // List view
  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-sm border transition-all duration-150 cursor-pointer select-none",
          isDropTarget ? "border-accent-sunset bg-accent-sunset/10" : isSelectedFinal ? "border-accent-sunset/50 bg-accent-sunset/5" : "border-transparent hover:bg-canvas-soft/50",
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Folder className={cn("w-5 h-5 shrink-0", isDropTarget ? "text-accent-sunset" : "text-accent-sunset")} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink truncate">{folder.name}</p>
        </div>
        <p className="text-xs text-body-mid shrink-0 w-28 text-right hidden md:block">{formatDate(folder.createdAt)}</p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={(e) => { e.stopPropagation(); setIsRenameOpen(true); }} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors" title="Rename">
            <Pencil className="w-3.5 h-3.5 text-body-mid" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="p-1.5 rounded-sm hover:bg-canvas-mid transition-colors" title="Move to Trash">
            <Trash2 className="w-3.5 h-3.5 text-body-mid" />
          </button>
        </div>

        <RenameDialog open={isRenameOpen} onOpenChange={setIsRenameOpen} itemId={folder.id} itemName={folder.name} itemType="folder" />
        <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Move to Trash" description={`"${folder.name}" and all its contents will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleDelete} loading={isProcessing} />
        {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />}
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={cn(
        "group relative rounded-sm border transition-all duration-150 cursor-pointer select-none",
        isDropTarget ? "border-accent-sunset bg-accent-sunset/10" : isSelectedFinal ? "border-accent-sunset/50 bg-accent-sunset/5" : "border-hairline hover:border-body-mid bg-canvas-card",
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 3-dot menu */}
      <button
        onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any); }}
        className="absolute top-2.5 right-2.5 z-10 p-1 rounded-sm bg-canvas-card/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-canvas-mid"
      >
        <MoreVertical className="w-3.5 h-3.5 text-body-mid" />
      </button>

      <div className="aspect-square flex items-center justify-center p-6">
        <Folder className="w-12 h-12 text-accent-sunset" />
      </div>

      <div className="px-3 pb-3">
        <p className="text-sm text-ink truncate mb-1">{folder.name}</p>
        <p className="text-xs text-body-mid">{formatDate(folder.createdAt)}</p>
      </div>

      <RenameDialog open={isRenameOpen} onOpenChange={setIsRenameOpen} itemId={folder.id} itemName={folder.name} itemType="folder" />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Move to Trash" description={`"${folder.name}" and all its contents will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleDelete} loading={isProcessing} />
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />}
    </div>
  );
}
