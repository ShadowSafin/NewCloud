"use client";

import { useState, useRef, useEffect, useState as useStateRef } from "react";
import { useFileStore } from "@/store/fileStore";
import { useAuthStore } from "@/store/authStore";
import {
  Search,
  Grid3X3,
  List,
  Upload,
  LogOut,
  FolderPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  onSearchChange?: (query: string) => void;
}

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "date", label: "Modified date" },
  { value: "size", label: "Size" },
  { value: "type", label: "Type" },
] as const;

export function Header({ onUploadClick, onNewFolderClick, onSearchChange }: HeaderProps) {
  const router = useRouter();
  const { viewMode, setViewMode, sortBy, setSortBy, sortOrder, setSortOrder } = useFileStore();
  const { logout } = useAuthStore();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || "Name";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchInput = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === "name" ? "asc" : "desc");
    }
    setSortOpen(false);
  };

  return (
    <header className="h-14 border-b border-hairline bg-canvas flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className={`relative flex items-center transition-all ${searchFocused ? "max-w-lg" : ""}`}>
          <Search className="absolute left-3 w-4 h-4 text-body-mid pointer-events-none" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="input-xai pl-9 pr-8 py-2 text-sm h-9"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); onSearchChange?.(""); }}
              className="absolute right-3 text-body-mid hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Sort dropdown - custom implementation */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="btn-pill h-9 px-3 gap-1.5 text-xs flex items-center"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{currentSortLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>
          
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-canvas-card border border-hairline rounded-sm shadow-lg z-50 py-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                    sortBy === option.value
                      ? "bg-canvas-soft text-ink font-medium"
                      : "text-body-mid hover:bg-canvas-soft/50 hover:text-ink"
                  }`}
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && (
                    sortOrder === "asc" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-accent-sunset" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-accent-sunset" />
                    )
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort direction toggle */}
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="p-2 text-body-mid hover:text-ink border border-hairline rounded-sm transition-colors"
          title={sortOrder === "asc" ? "Ascending" : "Descending"}
        >
          {sortOrder === "asc" ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
        </button>

        {/* View toggle */}
        <div className="flex items-center border border-hairline rounded-sm overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 transition-colors ${viewMode === "grid" ? "bg-canvas-soft text-ink" : "text-body-mid hover:text-ink"}`}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 transition-colors ${viewMode === "list" ? "bg-canvas-soft text-ink" : "text-body-mid hover:text-ink"}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* New folder */}
        <button onClick={onNewFolderClick} className="btn-pill h-9 px-3 gap-1.5 text-xs">
          <FolderPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Folder</span>
        </button>

        {/* Upload */}
        <button onClick={onUploadClick} className="btn-pill-primary h-9 px-3 gap-1.5 text-xs">
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {/* Logout */}
        <button onClick={handleLogout} className="btn-pill h-9 px-2.5 text-body-mid hover:text-ink" title="Logout">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
