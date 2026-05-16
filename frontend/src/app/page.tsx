"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useFileStore, FileItem } from "@/store/fileStore";
import { useClipboardStore } from "@/store/clipboardStore";
import { useToastStore } from "@/store/toastStore";
import { filesApi, foldersApi, filesApiMove, filesApiCopy } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/file/breadcrumb";
import { FileCard } from "@/components/file/file-card";
import { FolderCard } from "@/components/file/folder-card";
import { UploadDropzone } from "@/components/file/upload-dropzone";
import { NewFolderDialog } from "@/components/file/new-folder-dialog";
import { PreviewModal } from "@/components/file/preview-modal";
import { BulkToolbar } from "@/components/file/bulk-toolbar";
import { UploadQueuePanel } from "@/components/upload/upload-queue-panel";
import { ToastContainer } from "@/components/ui/toast-container";
import { ContextMenu, useContextMenu, ContextMenuItem } from "@/components/ui/context-menu";
import { useUploadStore } from "@/store/uploadStore";
import { useKeyboardShortcuts, formatShortcut } from "@/hooks/useKeyboardShortcuts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OperationProgressModal } from "@/components/ui/operation-progress";
import {
  FileX, Upload, Clock, Star, Trash2, Copy, Scissors, ClipboardPaste,
  FolderPlus, ArrowLeft, ArrowRight,
} from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const store = useFileStore();
  const { items: clipboardItems, action: clipboardAction, paste: clipboardPaste, hasClipboard, copy: clipboardCopy, cut: clipboardCut } = useClipboardStore();
  const { addToast } = useToastStore();
  const { recoverUploads } = useUploadStore();
  const { menu: bgContextMenu, open: openBgContextMenu, close: closeBgContextMenu } = useContextMenu();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [localSearch, setLocalSearch] = useState("");
  const [viewFiles, setViewFiles] = useState<FileItem[]>([]);
  const [viewFolders, setViewFolders] = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [confirmBatchTrash, setConfirmBatchTrash] = useState(false);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Cancel stale uploads on page load
  useEffect(() => { recoverUploads(); }, [recoverUploads]);

  const isSpecialView = !!view;
  const isTrashView = view === "trash";
  const isRecentView = view === "recent";
  const isStarredView = view === "starred";

  const currentDisplayFiles = isSpecialView ? viewFiles : store.files;
  const localFilteredFiles = localSearch
    ? currentDisplayFiles.filter((f) => f.originalName.toLowerCase().includes(localSearch.toLowerCase()))
    : currentDisplayFiles;

  // Fetch data on mount and when folder changes
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (isSpecialView) {
      setViewLoading(true);
      if (isRecentView) {
        filesApi.recent().then((res) => setViewFiles(res.data.data)).catch(() => setViewFiles([])).finally(() => setViewLoading(false));
      } else if (isStarredView) {
        filesApi.favorites().then((res) => setViewFiles(res.data.data)).catch(() => setViewFiles([])).finally(() => setViewLoading(false));
      } else if (isTrashView) {
        Promise.all([filesApi.listTrash(), foldersApi.listTrash()])
          .then(([filesRes, foldersRes]) => { setViewFiles(filesRes.data.data); setViewFolders(foldersRes.data.data); })
          .catch(() => { setViewFiles([]); setViewFolders([]); })
          .finally(() => setViewLoading(false));
      } else {
        setViewLoading(false);
      }
    } else {
      store.fetchFiles(store.currentFolderId);
      store.fetchFolders(store.currentFolderId);
      if (store.currentFolderId) store.fetchBreadcrumb(store.currentFolderId);
    }
  }, [isAuthenticated, authLoading, store.currentFolderId, view]);

  // Sort files - Google Drive style (folders first, then sort files)
  const sortItems = <T extends { originalName?: string; name?: string; createdAt: string; size?: number; category?: string }>(
    items: T[],
    sortBy: typeof store.sortBy,
    sortOrder: typeof store.sortOrder
  ): T[] => {
    return [...items].sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name": return dir * ((a.originalName || a.name || "").localeCompare(b.originalName || b.name || ""));
        case "size": return dir * ((a.size || 0) - (b.size || 0));
        case "type": return dir * ((a.category || "").localeCompare(b.category || ""));
        case "date":
        default: return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });
  };

  const sortedFiles = sortItems(isSpecialView ? localFilteredFiles : store.files, store.sortBy, store.sortOrder);
  const sortedFolders = sortItems(isSpecialView ? viewFolders : store.folders, store.sortBy, store.sortOrder);

  const allItems = isSpecialView
    ? (isTrashView
      ? [...sortedFolders.map((f) => ({ type: "folder" as const, data: f })), ...sortedFiles.map((f) => ({ type: "file" as const, data: f }))]
      : sortedFiles.map((f) => ({ type: "file" as const, data: f })))
    : [...sortedFolders.map((f) => ({ type: "folder" as const, data: f })), ...sortedFiles.map((f) => ({ type: "file" as const, data: f }))];

  const selectedCount = store.selectedIds.size;

  // Drag-and-drop handlers
  const handleFileDrop = useCallback(async (items: any[], targetFolderId: string | null) => {
    for (const item of items) {
      try {
        if (item.type === "file") {
          await filesApiMove(item.id, targetFolderId);
        }
      } catch {
        addToast(`Failed to move "${item.name}"`, "error");
      }
    }
    addToast(`Moved ${items.length} item(s)`, "success");
    store.fetchFiles(store.currentFolderId);
    store.fetchFolders(store.currentFolderId);
  }, [store, addToast]);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolder(folderId);
  }, []);

  const handleFolderDragLeave = useCallback(() => {
    setDragOverFolder(null);
  }, []);

  const handleFolderDrop = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    try {
      const data = e.dataTransfer.getData("application/json");
      if (data) {
        const items = JSON.parse(data);
        handleFileDrop(items, folderId);
      }
    } catch { }
  }, [handleFileDrop]);

  // Background context menu (right-click on empty space)
  const handleBgContextMenu = useCallback((e: React.MouseEvent) => {
    // Only trigger if clicking on the background, not on a file/folder
    if ((e.target as HTMLElement).closest('[data-file-card]')) return;

    const items: ContextMenuItem[] = [
      { label: "New Folder", icon: <FolderPlus className="w-4 h-4" />, shortcut: "mod+shift+N", onClick: () => setIsNewFolderOpen(true) },
      { divider: true, label: "", onClick: () => { } },
      { label: "Upload Files", icon: <Upload className="w-4 h-4" />, onClick: () => setIsUploadOpen(true) },
    ];

    if (hasClipboard()) {
      items.push(
        { divider: true, label: "", onClick: () => { } },
        { label: `Paste ${clipboardItems.length} item(s)`, icon: <ClipboardPaste className="w-4 h-4" />, shortcut: "mod+V", onClick: handlePaste },
      );
    }

    items.push(
      { divider: true, label: "", onClick: () => { } },
      { label: "Select All", icon: <Copy className="w-4 h-4" />, shortcut: "mod+A", onClick: () => store.selectAll() },
    );

    openBgContextMenu(e, items);
  }, [hasClipboard, clipboardItems, store, openBgContextMenu]);

  // Clipboard paste
  const handlePaste = useCallback(async () => {
    const result = await clipboardPaste(store.currentFolderId);
    if (result.success > 0) addToast(`Pasted ${result.success} item(s)`, "success");
    if (result.failed > 0) addToast(`Failed to paste ${result.failed} item(s)`, "error");
    store.fetchFiles(store.currentFolderId);
    store.fetchFolders(store.currentFolderId);
  }, [clipboardPaste, store, addToast]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    const { files, folders } = store;
    const items = [
      ...files.filter(f => store.selectedIds.has(f.id)).map(f => ({ id: f.id, type: "file" as const, name: f.originalName })),
      ...folders.filter(f => store.selectedIds.has(f.id)).map(f => ({ id: f.id, type: "folder" as const, name: f.name }))
    ];
    if (items.length > 0) {
      clipboardCopy(items, store.currentFolderId);
      addToast(`Copied ${items.length} item(s)`, "info");
    }
  }, [store, clipboardCopy, addToast]);

  // Cut to clipboard
  const handleCut = useCallback(() => {
    const { files, folders } = store;
    const items = [
      ...files.filter(f => store.selectedIds.has(f.id)).map(f => ({ id: f.id, type: "file" as const, name: f.originalName })),
      ...folders.filter(f => store.selectedIds.has(f.id)).map(f => ({ id: f.id, type: "folder" as const, name: f.name }))
    ];
    if (items.length > 0) {
      clipboardCut(items, store.currentFolderId);
      addToast(`Cut ${items.length} item(s)`, "info");
    }
  }, [store, clipboardCut, addToast]);

  // Delete (move to trash)
  const handleDelete = useCallback(() => {
    if (selectedCount > 0) setConfirmBatchTrash(true);
  }, [selectedCount]);

  // Permanent delete (shift+delete)
  const handlePermanentDelete = useCallback(async () => {
    if (isTrashView && selectedCount > 0) {
      setIsBatchProcessing(true);
      const ids = Array.from(store.selectedIds);
      for (const id of ids) {
        try {
          const file = store.files.find(f => f.id === id);
          if (file) await store.permanentDeleteFile(id);
        } catch { }
      }
      store.clearSelection();
      addToast(`Permanently deleted ${ids.length} item(s)`, "success");
      setIsBatchProcessing(false);
    }
  }, [store, selectedCount, isTrashView, addToast]);

  // Duplicate
  const handleDuplicate = useCallback(async () => {
    const ids = Array.from(store.selectedIds);
    for (const id of ids) {
      try {
        await store.duplicateFile(id);
      } catch { }
    }
    store.fetchFiles(store.currentFolderId);
    addToast(`Duplicated ${ids.length} item(s)`, "success");
  }, [store, addToast]);

  // Open/Enter
  const handleOpen = useCallback(() => {
    if (selectedCount === 1) {
      const id = Array.from(store.selectedIds)[0];
      const file = sortedFiles.find(f => f.id === id);
      if (file) {
        setPreviewFile(file);
        setPreviewIndex(sortedFiles.indexOf(file));
      }
    }
  }, [store.selectedIds, sortedFiles]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    // Selection
    "mod+a": () => store.selectAllInFolder(),
    "mod+d": () => { if (selectedCount > 0) handleDuplicate(); },
    "escape": () => { store.clearSelection(); setPreviewFile(null); },

    // Clipboard
    "mod+c": () => handleCopy(),
    "mod+x": () => handleCut(),
    "mod+v": () => { if (hasClipboard()) handlePaste(); },

    // File operations
    "delete": () => handleDelete(),
    "shift+delete": () => handlePermanentDelete(),

    // Navigation & Preview
    " ": (e) => {
      e.preventDefault();
      if (store.selectedIds.size === 1) {
        const id = Array.from(store.selectedIds)[0];
        const file = sortedFiles.find((f) => f.id === id);
        if (file) { setPreviewFile(file); setPreviewIndex(sortedFiles.indexOf(file)); }
      }
    },
    "enter": () => handleOpen(),
    "mod+f": (e) => { e.preventDefault(); document.querySelector<HTMLInputElement>('input[type="text"]')?.focus(); },
  }, [store, selectedCount, hasClipboard, handleCopy, handleCut, handlePaste, handleDelete, handlePermanentDelete, handleDuplicate, handleOpen, sortedFiles, isTrashView]);

  // Batch trash
  const handleBatchTrash = async () => {
    setIsBatchProcessing(true);
    try {
      await store.trashMultiple(Array.from(store.selectedIds));
      store.clearSelection();
      addToast(`Moved ${selectedCount} item(s) to trash`, "success");
    } catch {
      addToast("Failed to trash items", "error");
    }
    setIsBatchProcessing(false);
    setConfirmBatchTrash(false);
  };

  // Empty trash
  const handleEmptyTrash = async () => {
    setIsBatchProcessing(true);
    try {
      await store.emptyTrash();
      addToast("Trash emptied", "success");
    } catch {
      addToast("Failed to empty trash", "error");
    }
    setIsBatchProcessing(false);
    setConfirmEmptyTrash(false);
  };

  // Navigation
  const handleFolderNavigate = (folderId: string) => {
    store.setCurrentFolder(folderId);
    setLocalSearch("");
  };

  const handleBack = () => store.navigateBack();
  const handleForward = () => store.navigateForward();

  // Preview
  const handlePreviewNavigate = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" ? previewIndex - 1 : previewIndex + 1;
    if (newIndex >= 0 && newIndex < sortedFiles.length) {
      setPreviewIndex(newIndex);
      setPreviewFile(sortedFiles[newIndex]);
    }
  };

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-accent-sunset border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header
        onUploadClick={() => setIsUploadOpen(true)}
        onNewFolderClick={() => setIsNewFolderOpen(true)}
        onSearchChange={setLocalSearch}
      />

      <main className="flex-1 overflow-auto p-6" onContextMenu={handleBgContextMenu}>
        {/* Navigation bar */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBack}
            disabled={store.historyIndex <= 0}
            className="p-1.5 rounded-sm hover:bg-canvas-soft transition-colors disabled:opacity-30"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 text-body-mid" />
          </button>
          <button
            onClick={handleForward}
            disabled={store.historyIndex >= store.history.length - 1}
            className="p-1.5 rounded-sm hover:bg-canvas-soft transition-colors disabled:opacity-30"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4 text-body-mid" />
          </button>
          <Breadcrumb
            onNavigate={(id) => store.setCurrentFolder(id)}
          />
        </div>

        {/* View title */}
        {isRecentView && (
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-sm bg-canvas-soft border border-hairline flex items-center justify-center"><Clock className="w-5 h-5 text-body-mid" /></div>
            <div><h2 className="text-lg text-ink">Recent Files</h2><p className="text-sm text-body-mid">Recently uploaded files</p></div>
          </div>
        )}
        {isStarredView && (
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-sm bg-canvas-soft border border-hairline flex items-center justify-center"><Star className="w-5 h-5 text-body-mid" /></div>
            <div><h2 className="text-lg text-ink">Starred</h2><p className="text-sm text-body-mid">Your starred files</p></div>
          </div>
        )}
        {isTrashView && (
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-canvas-soft border border-hairline flex items-center justify-center"><Trash2 className="w-5 h-5 text-body-mid" /></div>
              <div><h2 className="text-lg text-ink">Trash</h2><p className="text-sm text-body-mid">Deleted files and folders</p></div>
            </div>
            {allItems.length > 0 && <button onClick={() => setConfirmEmptyTrash(true)} className="btn-pill text-xs text-destructive border-destructive/30 hover:bg-destructive/10">Empty Trash</button>}
          </div>
        )}

        {/* Batch selection toolbar */}
        {selectedCount > 0 && (
          <div className="mb-4">
            <BulkToolbar />
          </div>
        )}

        {/* Loading */}
        {(store.isLoading || viewLoading) ? (
          <div className={store.viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" : "flex flex-col gap-0.5"}>
            {(store.viewMode === "grid" ? Array(8).fill(null) : Array(6).fill(null)).map((_, i) => (
              <div key={i} className={store.viewMode === "grid" ? "aspect-square bg-canvas-soft rounded-sm animate-pulse" : "h-14 bg-canvas-soft rounded-sm animate-pulse"} />
            ))}
          </div>
        ) : allItems.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center mb-5">
              {isTrashView ? <Trash2 className="w-7 h-7 text-body-mid" /> : isRecentView ? <Clock className="w-7 h-7 text-body-mid" /> : isStarredView ? <Star className="w-7 h-7 text-body-mid" /> : <FileX className="w-7 h-7 text-body-mid" />}
            </div>
            <h3 className="text-lg text-ink mb-1">{isTrashView ? "Trash is empty" : isRecentView ? "No recent files" : isStarredView ? "No starred files" : localSearch ? "No files found" : "No files yet"}</h3>
            <p className="text-sm text-body-mid mb-6 max-w-sm">{isTrashView ? "Deleted files will appear here" : isRecentView ? "Your recently uploaded files will appear here" : isStarredView ? "Star your favorite files for quick access" : localSearch ? `No results for "${localSearch}"` : "Drag and drop files here or click the upload button"}</p>
            {!isTrashView && !isRecentView && !isStarredView && !localSearch && (
              <button onClick={() => setIsUploadOpen(true)} className="btn-pill-primary"><Upload className="w-4 h-4" /> Upload Files</button>
            )}
          </div>
        ) : (
          /* File grid/list */
          <div className={store.viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" : "flex flex-col gap-0.5"}>
            {allItems.map((item) =>
              item.type === "folder" ? (
                <FolderCard
                  key={(item.data as any).id}
                  folder={item.data as any}
                  viewMode={store.viewMode}
                  onNavigate={handleFolderNavigate}
                  isTrashView={isTrashView}
                  isDropTarget={dragOverFolder === (item.data as any).id}
                  onDragOver={(e) => handleFolderDragOver(e, (item.data as any).id)}
                  onDragLeave={handleFolderDragLeave}
                  onDrop={(e) => handleFolderDrop(e, (item.data as any).id)}
                />
              ) : (
                <FileCard
                  key={(item.data as any).id}
                  file={item.data as FileItem}
                  viewMode={store.viewMode}
                  onPreview={() => { setPreviewFile(item.data as FileItem); setPreviewIndex(sortedFiles.indexOf(item.data as FileItem)); }}
                  isTrashView={isTrashView}
                  draggable
                />
              )
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <UploadDropzone isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} folderId={store.currentFolderId} />
      <NewFolderDialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen} parentId={store.currentFolderId} />
      <PreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onPrev={() => handlePreviewNavigate("prev")}
        onNext={() => handlePreviewNavigate("next")}
        hasPrev={previewIndex > 0}
        hasNext={previewIndex < sortedFiles.length - 1}
      />
      <ConfirmDialog open={confirmBatchTrash} onOpenChange={setConfirmBatchTrash} title="Move to Trash" description={`${selectedCount} item(s) will be moved to trash.`} confirmLabel="Move to Trash" variant="destructive" onConfirm={handleBatchTrash} loading={isBatchProcessing} />
      <ConfirmDialog open={confirmEmptyTrash} onOpenChange={setConfirmEmptyTrash} title="Empty Trash" description="All files in trash will be permanently deleted. This cannot be undone." confirmLabel="Empty Trash" variant="destructive" onConfirm={handleEmptyTrash} loading={isBatchProcessing} />

      <UploadQueuePanel />
      <ToastContainer />
      <OperationProgressModal />

      {bgContextMenu && <ContextMenu x={bgContextMenu.x} y={bgContextMenu.y} items={bgContextMenu.items} onClose={closeBgContextMenu} />}
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-canvas"><div className="w-8 h-8 border-2 border-accent-sunset border-t-transparent rounded-full animate-spin" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
