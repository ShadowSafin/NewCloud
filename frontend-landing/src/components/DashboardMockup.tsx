import {
  FileText,
  Film,
  Folder,
  HardDrive,
  Music,
  Search,
  Share2,
  Upload,
} from "lucide-react";

const previewFiles = [
  {
    name: "Folders",
    type: "folder",
    size: "12 folders",
    modified: "Today",
    icon: Folder,
    accent: "text-brand-cyan bg-brand-cyan/10",
  },
  {
    name: "launch-film.mp4",
    type: "video",
    size: "824 MB",
    modified: "Yesterday",
    icon: Film,
    accent: "text-purple-400 bg-purple-500/10",
  },
  {
    name: "brand-assets.zip",
    type: "archive",
    size: "42 MB",
    modified: "2 days ago",
    icon: FileText,
    accent: "text-emerald-400 bg-emerald-500/10",
  },
  {
    name: "studio-mix.flac",
    type: "audio",
    size: "56 MB",
    modified: "Last week",
    icon: Music,
    accent: "text-rose-400 bg-rose-500/10",
  },
];

export default function DashboardMockup() {
  return (
    <div
      id="dashboard-preview"
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/20 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <div className="ml-3 flex min-w-0 items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-xs text-zinc-400">
          <HardDrive className="h-3.5 w-3.5 text-brand-cyan" />
          <span className="truncate">nexxcloud.local / drive</span>
        </div>
        <span className="ml-auto hidden rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-2.5 py-1 text-[10px] font-mono text-brand-cyan sm:block">
          WEB APP
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr]">
        <aside className="hidden border-r border-white/10 bg-black/20 p-4 md:flex md:flex-col">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Library</p>
          <div className="space-y-1 text-[13px]">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-zinc-200">
              <Folder className="h-4 w-4 text-brand-cyan" />
              All files
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-zinc-500">
              <Share2 className="h-4 w-4" />
              Shared
            </div>
          </div>
          <div className="mt-auto rounded-xl border border-white/10 p-3 text-[11px] text-zinc-500">
            <div className="mb-2 flex justify-between">
              <span>Storage</span>
              <span>312 / 1024 GB</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[30%] rounded-full bg-gradient-to-r from-brand-cyan to-brand-purple" />
            </div>
            <p className="mt-2 font-mono text-[10px]">Sample data</p>
          </div>
        </aside>

        <div className="p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">My Drive</h2>
              <p className="text-[11px] text-zinc-500">Sample library</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="dashboard-search" className="sr-only">Search preview files</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  id="dashboard-search"
                  placeholder="Search files"
                  readOnly
                  tabIndex={-1}
                  className="w-36 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-xs text-zinc-300 outline-none sm:w-44"
                />
              </div>
              <button
                type="button"
                disabled
                aria-label="Upload button shown for product demonstration"
                className="inline-flex items-center gap-1 rounded-lg bg-brand-cyan px-2.5 py-1.5 text-xs font-semibold text-black opacity-80"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-end gap-1 text-[10px] font-mono text-zinc-500">
            Preview
          </div>

          <div className="space-y-1">
              {previewFiles.map((file, index) => {
                const Icon = file.icon;
                return (
                  <div
                    key={file.name}
                    className={`grid w-full grid-cols-[1fr_auto] items-center rounded-lg border px-3 py-2.5 text-left transition-colors sm:grid-cols-[1fr_90px_100px] ${
                      index === 0
                        ? "border-white/10 bg-white/5"
                        : "border-transparent text-zinc-400"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`rounded-lg p-2 ${file.accent}`}><Icon className="h-4 w-4" /></span>
                      <span className="truncate text-[13px] font-medium">{file.name}</span>
                    </span>
                    <span className="hidden text-right text-[11px] font-mono text-zinc-500 sm:block">{file.size}</span>
                    <span className="text-right text-[11px] font-mono text-zinc-500">{file.modified}</span>
                  </div>
                );
              })}
          </div>

          <p className="mt-4 border-t border-white/10 pt-3 text-[11px] text-zinc-500">
            Selected: <span className="text-zinc-300">{previewFiles[0].name}</span> - sample folder collection
          </p>
        </div>
      </div>
    </div>
  );
}
