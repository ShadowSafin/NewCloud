import {
  Fingerprint,
  Laptop,
  Server,
  ShieldCheck,
  UploadCloud,
  RefreshCw,
  Container,
  Smartphone,
  Wifi,
} from "lucide-react";

export default function Features() {
  const featureList = [
    {
      title: "Content-Addressed Storage",
      description: "Files reference immutable SHA-256 storage blobs, so identical binaries share safe physical storage.",
      icon: Fingerprint,
      accent: "text-blue-400 bg-blue-500/10",
    },
    {
      title: "Resumable Chunk Uploads",
      description: "Large transfers are uploaded in bounded chunks, retried, merged by a worker, and verified before final storage.",
      icon: UploadCloud,
      accent: "text-emerald-400 bg-emerald-500/10",
    },
    {
      title: "Signed Media Delivery",
      description: "Short-lived signed media URLs stream previews and downloads without exposing access JWTs in media requests.",
      icon: ShieldCheck,
      accent: "text-purple-400 bg-purple-500/10",
    },
    {
      title: "Integrity Workers",
      description: "Scheduled repair jobs reconcile storage totals, blob references, metadata, orphaned data, and stale chunks.",
      icon: RefreshCw,
      accent: "text-rose-400 bg-rose-500/10",
    },
    {
      title: "Docker Deployment",
      description: "One-command Docker setup runs Next.js, Express, PostgreSQL, Redis, and dedicated workers with health checks.",
      icon: Container,
      accent: "text-cyan-400 bg-cyan-500/10",
    },
    {
      title: "Native Server Host",
      description: "The Windows server host packages a local SQLite runtime with tray controls and automatic startup support.",
      icon: Server,
      accent: "text-indigo-400 bg-indigo-500/10",
    },
    {
      title: "Mobile Wrapper",
      description: "The Android wrapper connects the shared web interface to LAN-hosted NexxCloud servers.",
      icon: Smartphone,
      accent: "text-teal-400 bg-teal-500/10",
    },
    {
      title: "Desktop Client",
      description: "The Windows Electron client loads an existing NexxCloud deployment in a secured native application window.",
      icon: Laptop,
      accent: "text-pink-400 bg-pink-500/10",
    },
    {
      title: "LAN Access",
      description: "NexxCloud binds for local network access and exposes discovery details for computers and companion devices.",
      icon: Wifi,
      accent: "text-amber-400 bg-amber-500/10",
    },
  ];

  return (
    <section id="features" className="defer-render py-24 md:py-32 px-6 md:px-12 bg-zinc-950/20 relative z-10">
      <div className="max-w-6xl mx-auto">
        {/* Header Block */}
        <div className="text-center mb-20">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-cyan mb-3">
            Core capabilities
          </div>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-foreground">
            Built around storage integrity.
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto mt-4 leading-relaxed tracking-tight">
            Shipped architecture for reliable uploads, safe delivery, and self-hosted access.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureList.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group p-6 rounded-2xl border border-white/5 bg-zinc-900/10 hover:bg-zinc-900/30 hover:border-white/10 transition-all duration-500 flex flex-col items-start gap-4 relative overflow-hidden"
              >
                {/* Micro-glow hovering highlight */}
                <div className="absolute inset-0 bg-radial-bg opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />

                {/* Accent Icon Container */}
                <div className={`p-3 rounded-xl relative z-10 shrink-0 ${feat.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Typography details */}
                <div className="relative z-10 flex flex-col gap-2">
                  <h3 className="font-semibold text-[15px] tracking-tight text-zinc-200 group-hover:text-foreground transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors tracking-tight">
                    {feat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
