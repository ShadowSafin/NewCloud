"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useFileStore } from "@/store/fileStore";
import { cn } from "@/lib/utils";
import { filesApi, foldersApi } from "@/lib/api";
import {
  FolderOpen,
  Clock,
  Star,
  Settings,
  HardDrive,
  Home,
  Share2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  Plus,
} from "lucide-react";

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
}

const navItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: Clock, label: "Recent", href: "/?view=recent" },
  { icon: Star, label: "Starred", href: "/?view=starred" },
  { icon: Trash2, label: "Trash", href: "/?view=trash" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function FolderTreeItem({ 
  node, 
  level, 
  currentFolderId,
  onSelect 
}: { 
  node: FolderNode; 
  level: number; 
  currentFolderId: string | null;
  onSelect: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = node.id === currentFolderId;

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-sm transition-colors",
          isActive ? "bg-accent-sunset/10 text-accent-sunset" : "text-body-mid hover:text-ink hover:bg-canvas-soft/50"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="p-0.5 hover:bg-canvas-soft rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Folder className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentView = searchParams.get("view");
  const user = useAuthStore((state) => state.user);
  const { currentFolderId, setCurrentFolder, folderTree } = useFileStore();

  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(0);
  const [trashSize, setTrashSize] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [localTree, setLocalTree] = useState<FolderNode[]>([]);

  useEffect(() => {
    filesApi.storage()
      .then((res) => {
        const d = res.data.data;
        setStorageUsed(d.used);
        setStorageTotal(d.totalDisk);
        setFileCount(d.fileCount);
        setTrashSize(d.trashSize || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    foldersApi.tree()
      .then((res) => {
        setLocalTree(res.data.data || []);
      })
      .catch(() => {});
  }, []);

  const handleFolderSelect = (folderId: string) => {
    setCurrentFolder(folderId);
    router.push("/");
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    if (href === "/") {
      setCurrentFolder(null);
    }
  };

  const isActive = (href: string) => {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    const viewParam = new URLSearchParams(query).get("view");
    return viewParam === currentView || (!viewParam && !currentView && href === "/");
  };

  const usedPercent = storageTotal > 0 ? Math.min((storageUsed / storageTotal) * 100, 100) : 0;
  const barColor = "#ff7a17";

  return (
    <aside className="w-64 h-full border-r border-hairline bg-canvas flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 pb-3 border-b border-hairline">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm border border-hairline flex items-center justify-center bg-canvas-soft">
            <HardDrive className="w-4 h-4 text-ink" />
          </div>
          <span className="text-base font-medium text-ink">CloudStore</span>
        </Link>
      </div>

      {/* Quick Access */}
      <div className="p-3 pb-1">
        <div className="eyebrow-mono-sm text-body-mid mb-2">Quick access</div>
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors",
                isActive(item.href)
                  ? "bg-canvas-soft text-ink font-medium"
                  : "text-body-mid hover:text-ink hover:bg-canvas-soft/50"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 px-3 py-2 overflow-y-auto border-t border-hairline mt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="eyebrow-mono-sm text-body-mid">Folders</div>
        </div>
        {localTree.length > 0 ? (
          <div className="space-y-0.5">
            <button
              onClick={() => { setCurrentFolder(null); router.push("/"); }}
              className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-sm transition-colors",
                currentFolderId === null 
                  ? "bg-accent-sunset/10 text-accent-sunset" 
                  : "text-body-mid hover:text-ink hover:bg-canvas-soft/50"
              )}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>All Files</span>
            </button>
            {localTree.map((node) => (
              <FolderTreeItem
                key={node.id}
                node={node}
                level={0}
                currentFolderId={currentFolderId}
                onSelect={handleFolderSelect}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-body-mid px-2 py-1">No folders yet</p>
        )}
      </div>

      {/* Storage indicator */}
      <div className="p-4 mx-3 mb-3 rounded-sm bg-canvas-soft border border-hairline">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-3.5 h-3.5 text-body-mid" />
          <span className="eyebrow-mono-sm">Storage</span>
        </div>

        <div className="h-1.5 bg-canvas-mid rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${usedPercent}%`,
              background: barColor,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-body-mid">
            {formatBytes(storageUsed)} of {formatBytes(storageTotal)}
          </p>
          <p className="text-xs text-body-mid">{fileCount} files</p>
        </div>
        {trashSize > 0 && (
          <p className="text-xs text-mute mt-1">
            Trash: {formatBytes(trashSize)}
          </p>
        )}
      </div>

      {/* User & Settings */}
      <div className="p-3 border-t border-hairline">
        <button
          onClick={() => router.push("/settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors",
            pathname === "/settings"
              ? "bg-canvas-soft text-ink"
              : "text-body-mid hover:text-ink hover:bg-canvas-soft/50"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <div className="flex items-center gap-3 mt-3 px-3">
          <div className="w-7 h-7 rounded-full bg-canvas-mid flex items-center justify-center text-xs text-body font-medium">
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink truncate">{user?.username || "User"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
