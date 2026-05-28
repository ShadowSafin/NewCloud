"use client";

import { useEffect, useMemo, useState } from "react";
import { useFileStore } from "@/store/fileStore";
import { useToastStore } from "@/store/toastStore";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatFileSize } from "@/lib/utils";
import { Trash2, RotateCcw, FolderInput, Copy, Download, X, CheckSquare, Square } from "lucide-react";

interface BulkToolbarProps {
  onMove?: () => void;
  onCopy?: () => void;
}

export function BulkToolbar({ onMove, onCopy }: BulkToolbarProps) {
  const { files, folders, selectedIds, selectAll, clearSelection, trashMultiple, bulkRestore, permanentDeleteMultiple, downloadSelected } = useFileStore();
  const { addToast } = useToastStore();
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSummary, setDownloadSummary] = useState<string | null>(null);

  const count = selectedIds.size;
  const selectedSummary = useMemo(() => {
    let selectedFileCount = 0;
    let selectedFolderCount = 0;
    let selectedBytes = 0;

    for (const file of files) {
      if (selectedIds.has(file.id)) {
        selectedFileCount++;
        selectedBytes += file.size || 0;
      }
    }
    for (const folder of folders) {
      if (selectedIds.has(folder.id)) selectedFolderCount++;
    }

    const sizeLabel = selectedBytes > 0 ? formatFileSize(selectedBytes) : "0 B";
    const folderLabel = selectedFolderCount > 0 ? ` + ${selectedFolderCount} folder(s)` : "";
    return `${selectedFileCount} file(s)${folderLabel} - ${sizeLabel}`;
  }, [files, folders, selectedIds]);

  useEffect(() => {
    setDownloadSummary(null);
  }, [selectedIds]);

  if (count === 0) return null;

  const isTrashView = typeof window !== "undefined" && window.location.search.includes("view=trash");

  const handleTrash = async () => {
    if (isTrashView) {
      await permanentDeleteMultiple(Array.from(selectedIds));
    } else {
      await trashMultiple(Array.from(selectedIds));
    }
    clearSelection();
    setShowTrashConfirm(false);
  };

  const handleRestore = async () => {
    await bulkRestore(Array.from(selectedIds));
    clearSelection();
    setShowRestoreConfirm(false);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const summary = await downloadSelected(Array.from(selectedIds));
      const sizeLabel = summary.totalBytes > 0 ? formatFileSize(summary.totalBytes) : "unknown size";
      const label = `${summary.fileCount} file(s) - ${sizeLabel}`;
      setDownloadSummary(label);
      addToast(`Download started: ${label}`, "success", 5000);
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || "Failed to start download";
      addToast(message, "error", 7000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-canvas-card border border-hairline rounded-sm mb-4 animate-fade-in">
        <span className="text-sm text-ink font-mono mr-2">
          {count} selected <span className="text-body-mid">({selectedSummary})</span>
        </span>

        <div className="h-4 w-px bg-hairline" />

        {isTrashView ? (
          <>
            <button
              onClick={() => setShowRestoreConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-ink hover:bg-canvas-soft transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-ink hover:bg-canvas-soft transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isDownloading ? "Preparing..." : downloadSummary ? `Download (${downloadSummary})` : "Download"}
            </button>
            <button
              onClick={onMove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-ink hover:bg-canvas-soft transition-colors"
            >
              <FolderInput className="w-3.5 h-3.5" />
              Move
            </button>
            <button
              onClick={onCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-ink hover:bg-canvas-soft transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </>
        )}

        <button
          onClick={() => setShowTrashConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {isTrashView ? "Delete Forever" : "Move to Trash"}
        </button>

        <div className="flex-1" />

        <button
          onClick={selectAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-ink hover:bg-canvas-soft transition-colors"
          title="Select all"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Select All
        </button>
        <button
          onClick={clearSelection}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs text-ink hover:bg-canvas-soft transition-colors"
          title="Deselect all"
        >
          <Square className="w-3.5 h-3.5" />
          Deselect All
        </button>
        <button
          onClick={clearSelection}
          className="p-1.5 rounded-sm hover:bg-canvas-soft transition-colors"
          title="Close toolbar"
        >
          <X className="w-3.5 h-3.5 text-body-mid" />
        </button>
      </div>

      <ConfirmDialog
        open={showTrashConfirm}
        onOpenChange={setShowTrashConfirm}
        onConfirm={handleTrash}
        title={isTrashView ? "Permanently Delete" : "Move to Trash"}
        description={
          isTrashView
            ? `Are you sure you want to permanently delete ${count} item(s)? This cannot be undone.`
            : `Are you sure you want to move ${count} item(s) to trash?`
        }
        confirmLabel={isTrashView ? "Delete Forever" : "Move to Trash"}
        variant="destructive"
      />

      <ConfirmDialog
        open={showRestoreConfirm}
        onOpenChange={setShowRestoreConfirm}
        onConfirm={handleRestore}
        title="Restore Items"
        description={`Restore ${count} item(s) from trash?`}
        confirmLabel="Restore"
      />
    </>
  );
}
