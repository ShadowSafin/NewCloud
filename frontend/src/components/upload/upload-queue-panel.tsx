"use client";

import { useUploadStore } from "@/store/uploadStore";
import { formatFileSize } from "@/lib/utils";
import {
  X,
  Pause,
  Play,
  XCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Trash2,
  Upload,
} from "lucide-react";

export function UploadQueuePanel() {
  const { uploads, isVisible, setVisible, pauseUpload, resumeUpload, cancelUpload, retryUpload, removeUpload, clearCompleted } =
    useUploadStore();

  if (!isVisible || uploads.length === 0) return null;

  const activeUploads = uploads.filter(
    (u) => u.status === "uploading" || u.status === "merging" || u.status === "paused"
  );
  const completedUploads = uploads.filter((u) => u.status === "completed");
  const failedUploads = uploads.filter((u) => u.status === "failed");

  // Calculate overall progress
  const totalProgress = uploads.length > 0
    ? uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length
    : 0;
  const hasActive = activeUploads.length > 0;

  // Circular progress dimensions
  const size = 48;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (totalProgress * circumference);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 animate-fade-in">
      {/* Expanded panel */}
      <div className="w-80 max-h-[50vh] flex flex-col bg-canvas-card border border-hairline rounded-sm shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink">Uploads</span>
            <span className="text-xs text-mute font-mono">
              {activeUploads.length > 0
                ? `${activeUploads.length} active`
                : `${completedUploads.length} done`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {completedUploads.length > 0 && (
              <button
                onClick={clearCompleted}
                className="p-1 rounded-sm hover:bg-canvas-mid transition-colors"
                title="Clear completed"
              >
                <Trash2 className="w-3.5 h-3.5 text-body-mid" />
              </button>
            )}
          </div>
        </div>

        {/* Upload list */}
        <div className="flex-1 overflow-y-auto divide-y divide-hairline max-h-[40vh]">
          {uploads.map((upload) => (
            <div key={upload.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-ink truncate flex-1 mr-2">{upload.filename}</span>
                <StatusIcon status={upload.status} />
              </div>

              {/* Progress bar */}
              {(upload.status === "uploading" || upload.status === "merging") && (
                <div className="mb-1.5">
                  <div className="h-1 bg-canvas-mid rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-sunset transition-all duration-300 rounded-full"
                      style={{ width: `${Math.round(upload.progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Chunk visualization */}
              {upload.status === "uploading" && upload.totalChunks > 1 && (
                <div className="flex flex-wrap gap-0.5 mb-1.5">
                  {Array.from({ length: Math.min(upload.totalChunks, 50) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-sm ${
                        upload.uploadedChunks.has(i)
                          ? "bg-green-500"
                          : upload.failedChunks.has(i)
                          ? "bg-red-500"
                          : "bg-canvas-mid"
                      }`}
                    />
                  ))}
                  {upload.totalChunks > 50 && (
                    <span className="text-xs text-mute ml-1">+{upload.totalChunks - 50}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-mute">
                  {upload.status === "uploading" &&
                    `${Math.round(upload.progress * 100)}% \u00b7 ${formatFileSize(upload.speed)}/s`}
                  {upload.status === "merging" && "Merging chunks..."}
                  {upload.status === "completed" && formatFileSize(upload.totalSize)}
                  {upload.status === "failed" && (upload.error || "Upload failed")}
                  {upload.status === "paused" && "Paused"}
                  {upload.status === "cancelled" && "Cancelled"}
                </span>

                <div className="flex items-center gap-0.5">
                  {upload.status === "uploading" && (
                    <button onClick={() => pauseUpload(upload.id)} className="p-1 rounded-sm hover:bg-canvas-mid" title="Pause">
                      <Pause className="w-3 h-3 text-body-mid" />
                    </button>
                  )}
                  {upload.status === "paused" && (
                    <button onClick={() => resumeUpload(upload.id)} className="p-1 rounded-sm hover:bg-canvas-mid" title="Resume">
                      <Play className="w-3 h-3 text-body-mid" />
                    </button>
                  )}
                  {(upload.status === "uploading" || upload.status === "paused") && (
                    <button onClick={() => cancelUpload(upload.id)} className="p-1 rounded-sm hover:bg-canvas-mid" title="Cancel">
                      <XCircle className="w-3 h-3 text-body-mid" />
                    </button>
                  )}
                  {upload.status === "failed" && (
                    <button onClick={() => retryUpload(upload.id)} className="p-1 rounded-sm hover:bg-canvas-mid" title="Retry">
                      <RotateCcw className="w-3 h-3 text-body-mid" />
                    </button>
                  )}
                  {(upload.status === "completed" || upload.status === "cancelled") && (
                    <button onClick={() => removeUpload(upload.id)} className="p-1 rounded-sm hover:bg-canvas-mid" title="Remove">
                      <X className="w-3 h-3 text-body-mid" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Minimized circular progress indicator - always visible */}
      {hasActive && (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#ff7a17"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            {activeUploads[0]?.status === "merging" ? (
              <Loader2 className="w-4 h-4 text-accent-sunset animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-accent-sunset" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "uploading":
      return <Loader2 className="w-3.5 h-3.5 text-accent-sunset animate-spin" />;
    case "merging":
      return <Loader2 className="w-3.5 h-3.5 text-accent-dusk animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case "failed":
      return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
    case "paused":
      return <Pause className="w-3.5 h-3.5 text-body-mid" />;
    default:
      return null;
  }
}
