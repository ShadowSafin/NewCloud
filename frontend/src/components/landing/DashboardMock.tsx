import { motion } from "framer-motion";
import { Folder, FileText, Image as ImageIcon, Film, Music, Upload, Search, Cloud, MoreHorizontal } from "lucide-react";

const files = [
  { icon: Folder, name: "Folders", meta: "12 folders", color: "text-[var(--brand-cyan)]" },
  { icon: ImageIcon, name: "Photos", meta: "4,201 items", color: "text-[var(--brand-violet)]" },
  { icon: Film, name: "Recordings", meta: "62 items", color: "text-[var(--brand-blue)]" },
  { icon: FileText, name: "Documents", meta: "841 items", color: "text-[var(--brand-cyan)]" },
  { icon: Music, name: "Audio", meta: "320 items", color: "text-[var(--brand-violet)]" },
];

export function DashboardMock() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.9, ease: "easeOut" }}
        className="relative rounded-2xl apex-glass apex-shadow-elegant overflow-hidden"
      >
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-black/20 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <div className="ml-2 flex min-w-0 items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-xs text-muted-foreground sm:ml-4">
            <Cloud className="h-3.5 w-3.5" /> nexxcloud.local / drive
          </div>
          <div className="ml-auto hidden items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-xs text-muted-foreground sm:flex">
            <Search className="h-3.5 w-3.5" /> Search files…
          </div>
        </div>

        <div className="grid grid-cols-12 gap-0">
          {/* sidebar */}
          <aside className="col-span-3 hidden border-r border-border/60 bg-black/10 p-4 md:block">
            <div className="space-y-1 text-sm">
              {["All files", "Recent", "Starred", "Trash"].map((l, i) => (
                <div key={l} className={`flex items-center gap-2 rounded-md px-3 py-2 ${i === 0 ? "bg-white/5 text-foreground" : "text-muted-foreground"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-[var(--brand-cyan)]" : "bg-muted-foreground/40"}`} />
                  {l}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-border/60 p-3 text-xs">
              <div className="mb-2 flex justify-between text-muted-foreground"><span>Storage</span><span>312 / 1024 GB</span></div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-[30%] rounded-full bg-[var(--gradient-brand)]" />
              </div>
            </div>
          </aside>

          {/* main */}
          <main className="col-span-12 md:col-span-9 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">My Drive</h3>
              <div className="inline-flex items-center gap-2 rounded-md bg-[var(--gradient-brand)] px-3 py-1.5 text-xs font-medium text-background">
                <Upload className="h-3.5 w-3.5" /> Upload
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {files.map((f, i) => (
                <motion.div
                  key={f.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  className="group rounded-xl border border-border/60 bg-white/[0.02] p-3 transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className={`mb-3 grid h-10 w-10 place-items-center rounded-lg bg-white/5 ${f.color}`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground">{f.meta}</div>
                </motion.div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-border/60 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Uploading 3 files</span><MoreHorizontal className="h-4 w-4" />
              </div>
              <div className="space-y-3">
                {[
                  { name: "design-system.fig", pct: 96 },
                  { name: "interview-raw.mov", pct: 64 },
                  { name: "dataset.parquet", pct: 38 },
                ].map((u) => (
                  <div key={u.name}>
                    <div className="mb-1 flex justify-between text-xs"><span>{u.name}</span><span className="text-muted-foreground">{u.pct}%</span></div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${u.pct}%` }}
                        transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
                        className="h-full rounded-full bg-[var(--gradient-brand)]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </motion.div>
    </div>
  );
}

function FloatCard({ icon: Icon, title, sub, progress }: { icon: any; title: string; sub: string; progress: number }) {
  return (
    <div className="apex-glass apex-animate-float-slow w-64 rounded-xl p-4 apex-shadow-elegant">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--gradient-brand)] text-background">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{title}</div>
          <div className="text-[11px] text-muted-foreground">{sub}</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-[var(--gradient-brand)]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
