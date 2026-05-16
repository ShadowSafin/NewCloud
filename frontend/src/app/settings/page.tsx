"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { filesApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { User, Mail, Calendar, HardDrive } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(0);
  const [storageFree, setStorageFree] = useState(0);
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      filesApi.storage()
        .then((res) => {
          const d = res.data.data;
          setStorageUsed(d.used);
          setStorageTotal(d.totalDisk);
          setStorageFree(d.freeDisk);
          setFileCount(d.fileCount);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="w-6 h-6 border-2 border-hairline border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const usedPercent = storageTotal > 0 ? Math.min((storageUsed / storageTotal) * 100, 100) : 0;

  return (
    <AppShell>
      <div className="h-14 border-b border-hairline bg-canvas flex items-center px-6">
        <span className="text-sm text-ink">Settings</span>
      </div>

      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <span className="eyebrow-mono">Settings</span>
            <h1 className="display-sm mt-2">Account & Preferences</h1>
          </div>

          {/* Profile */}
          <div className="bg-canvas-card border border-hairline rounded-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-4 h-4 text-body-mid" />
              <span className="text-sm text-ink">Profile</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-canvas-mid flex items-center justify-center">
                <span className="text-lg text-ink">{user.username.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm text-ink">{user.username}</p>
                <p className="text-xs text-body-mid">{user.email}</p>
              </div>
            </div>

            <div className="h-px bg-hairline mb-6" />

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <User className="w-3 h-3 text-body-mid" />
                  <span className="text-xs text-body-mid">Username</span>
                </div>
                <p className="text-sm text-ink">{user.username}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Mail className="w-3 h-3 text-body-mid" />
                  <span className="text-xs text-body-mid">Email</span>
                </div>
                <p className="text-sm text-ink">{user.email}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3 h-3 text-body-mid" />
                  <span className="text-xs text-body-mid">Member Since</span>
                </div>
                <p className="text-sm text-ink">
                  {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-canvas-card border border-hairline rounded-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <HardDrive className="w-4 h-4 text-body-mid" />
              <span className="text-sm text-ink">Storage</span>
            </div>

            {/* Usage bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-body-mid">Your usage</span>
                <span className="text-xs text-body-mid font-mono">{usedPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-canvas-mid rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${usedPercent}%`,
                    background: usedPercent > 90 ? "#ef4444" : "#ff7a17",
                  }}
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-canvas-soft border border-hairline rounded-sm">
                <p className="text-xs text-body-mid mb-1">Used</p>
                <p className="text-lg text-ink font-mono">{formatBytes(storageUsed)}</p>
              </div>
              <div className="p-4 bg-canvas-soft border border-hairline rounded-sm">
                <p className="text-xs text-body-mid mb-1">Free</p>
                <p className="text-lg text-ink font-mono">{formatBytes(storageFree)}</p>
              </div>
              <div className="p-4 bg-canvas-soft border border-hairline rounded-sm">
                <p className="text-xs text-body-mid mb-1">Files</p>
                <p className="text-lg text-ink font-mono">{fileCount}</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-canvas-soft border border-hairline rounded-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-body-mid">Total Disk Space</span>
                <span className="text-sm text-ink font-mono">{formatBytes(storageTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
