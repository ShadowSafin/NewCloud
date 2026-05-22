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
  { label: "All files", href: "/" },
  { label: "Recent", href: "/?view=recent" },
  { label: "Starred", href: "/?view=starred" },
  { label: "Trash", href: "/?view=trash" },
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
          "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
          isActive ? "bg-cyan-500/10 text-cyan-400 font-medium" : "text-white/60 hover:text-white hover:bg-white/[0.02]"
        )}
        style={{ paddingLeft: `${level * 10 + 6}px` }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="p-0.5 hover:bg-white/[0.05] rounded cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="w-2.5 h-2.5 text-white/40" />
            ) : (
              <ChevronRight className="w-2.5 h-2.5 text-white/40" />
            )}
          </span>
        ) : (
          <span className="w-3.5" />
        )}
        <Folder className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
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
  const { currentFolderId, setCurrentFolder } = useFileStore();

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

  return (
    <aside className="w-56 h-full border-r border-white/[0.06] bg-black/15 flex flex-col shrink-0">
      {/* Quick Access */}
      <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  active
                    ? "bg-white/[0.04] text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                {/* Cyan active dot on left */}
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full mr-2.5 transition-all duration-300",
                  active ? "bg-cyan-400 glow-cyan scale-100" : "bg-transparent scale-0"
                )} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Folder Tree */}
        <div className="border-t border-white/[0.06] pt-4 mt-4">
          <div className="text-[10px] uppercase font-bold tracking-wider text-white/35 mb-2 px-2">
            Folders
          </div>
          {localTree.length > 0 ? (
            <div className="space-y-0.5">
              <button
                onClick={() => { setCurrentFolder(null); router.push("/"); }}
                className={cn(
                  "w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
                  currentFolderId === null 
                    ? "bg-white/[0.04] text-white font-medium" 
                    : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                <Folder className="w-3.5 h-3.5 text-cyan-400/80" />
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
            <p className="text-[10px] text-white/40 px-2 py-1 italic">No subfolders</p>
          )}
        </div>
      </div>

      {/* Bottom Section: Storage */}
      <div className="p-4 border-t border-white/[0.06] space-y-3">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/35">Storage</span>
            <span className="text-[10px] font-semibold text-white/70">
              {formatBytes(storageUsed)} / {formatBytes(storageTotal)}
            </span>
          </div>

          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 glow-cyan transition-all duration-500"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>

        {/* User profile & Settings */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => router.push("/settings")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-200",
              pathname === "/settings"
                ? "bg-white/[0.04] text-white font-medium"
                : "text-white/50 hover:text-white hover:bg-white/[0.02]"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
          
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.01]">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-[10px] text-white font-semibold">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80 font-medium truncate">{user?.username || "User"}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
