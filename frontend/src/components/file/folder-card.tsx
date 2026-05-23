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
          "group flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.05] glass-card glass-card-hover cursor-pointer select-none",
          isDropTarget ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : isSelectedFinal ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "",
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
        <Folder className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-115 text-cyan-400 glow-cyan")} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 group-hover:text-white truncate">{folder.name}</p>
        </div>
        <p className="text-xs text-white/40 font-mono shrink-0 w-28 text-right hidden md:block">{formatDate(folder.createdAt)}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={(e) => { e.stopPropagation(); setIsRenameOpen(true); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all" title="Rename">
            <Pencil className="w-3.5 h-3.5 text-white/60 hover:text-white" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-red-500/20 hover:border-red-500/30 transition-all" title="Move to Trash">
            <Trash2 className="w-3.5 h-3.5 text-white/60 hover:text-red-400" />
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
        "group relative rounded-2xl border border-white/[0.05] glass-card glass-card-hover cursor-pointer select-none h-full flex flex-col justify-between overflow-hidden",
        isDropTarget ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]" : isSelectedFinal ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]" : "",
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
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
      >
        <MoreVertical className="w-3.5 h-3.5 text-white/60" />
      </button>

      {/* Folder Icon with ambient glow container */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] group-hover:scale-110 group-hover:border-cyan-500/20 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] transition-all duration-300">
          <Folder className="w-12 h-12 text-cyan-400 glow-cyan" />
        </div>
      </div>

      {/* Info Section */}
      <div className="px-4 pb-4 pt-2 shrink-0 bg-black/10 border-t border-white/[0.02]">
        <p className="text-sm font-semibold text-white/90 group-hover:text-white truncate mb-0.5">{folder.name}</p>
        <p className="text-[10px] text-white/40 font-mono">{formatDate(folder.createdAt)}</p>
      </div>

      <RenameDialog open={isRenameOpen} onOpenChange={setIsRenameOpen} itemId={folder.id} itemName={folder.name} itemType="folder" />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Move to Trash" description={`"${folder.name}" and all its contents will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleDelete} loading={isProcessing} />
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />}
    </div>
  );
}
