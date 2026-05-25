import { motion } from "framer-motion";
import {
  Zap, Server, Eye, Film, Search, Boxes, Sparkles, Container,
  RefreshCw, Share2, ShieldCheck, Network, Database, Terminal,
  Activity, FolderTree, Lock, Globe, Code2,
  Github, BookOpen, ArrowRight, Check, HardDrive, History, Trash2, Star,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      className="mx-auto mb-14 max-w-2xl text-center"
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-cyan)]" /> {eyebrow}
      </div>
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-balance text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

/* ---------- Features ---------- */
const features = [
  { icon: Zap, title: "Resumable Uploads", desc: "Chunked, parallel uploads that resume where they left off — even after a crash." },
  { icon: Server, title: "Self-Hosted Freedom", desc: "Own the stack. Your data stays on your hardware. No vendor lock-in." },
  { icon: Eye, title: "Instant Previews", desc: "Images, videos, audio, code and documents — previewed right in the browser." },
  { icon: Film, title: "File Streaming", desc: "Stream video and audio files directly from your server. No download needed." },
  { icon: Share2, title: "Link Sharing", desc: "Generate public share links for any file with a single click." },
  { icon: Search, title: "File Search", desc: "Search across all your files by name, type, or category instantly." },
  { icon: Boxes, title: "Universal File Types", desc: "15+ file categories recognised — images, code, 3D models, datasets, and more." },
  { icon: Sparkles, title: "Beautiful UI", desc: "A glassmorphic file manager you'll actually want to use every day." },
  { icon: Container, title: "Docker Native", desc: "Production-ready in a single docker compose up. Five containers, zero friction." },
  { icon: RefreshCw, title: "Real-Time Sync", desc: "WebSocket-powered live updates. Changes appear across tabs instantly." },
  { icon: History, title: "Version History", desc: "Every file keeps a version history. Restore previous versions anytime." },
  { icon: Trash2, title: "Trash & Restore", desc: "Deleted files go to trash first. Restore them or empty trash permanently." },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow="Features"
        title="Everything your files deserve."
        sub="A modern, opinionated storage layer for people who care about ownership, speed and aesthetics."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            transition={{ delay: (i % 3) * 0.06 }}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white/[0.02] p-6 apex-shadow-card transition hover:border-white/15 hover:bg-white/[0.04]"
          >
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--gradient-brand)] opacity-0 blur-2xl transition group-hover:opacity-30" />
            <div className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl bg-white/[0.04] text-[var(--brand-cyan)] ring-1 ring-inset ring-white/10">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Self-Hosting ---------- */
export function SelfHost() {
  const items = [
    { icon: ShieldCheck, title: "Full Data Ownership", desc: "Your bytes never leave your hardware. No third-party reads." },
    { icon: Container, title: "Docker in 60 seconds", desc: "One compose file. Five services. Pre-tuned defaults. Production-grade." },
    { icon: HardDrive, title: "Local Storage Engine", desc: "Files stored directly on your filesystem. Mount any drive or volume." },
    { icon: Lock, title: "Privacy by Default", desc: "No telemetry, no tracking, no analytics. Your server, your rules." },
    { icon: Globe, title: "No Vendor Lock-in", desc: "Standard file formats on disk. Export or migrate anytime." },
    { icon: Network, title: "Background Workers", desc: "Thumbnails, deduplication, and trash cleanup — all handled automatically." },
  ];
  return (
    <section id="self-host" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-violet)]" /> Self-Hosting
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            The cloud, <span className="text-gradient">on your terms.</span>
          </h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            NewCloud runs where you do — your homelab, NAS, or VPS.
            One compose file. Zero telemetry. Total control.
          </p>
          <div className="mt-8 rounded-2xl border border-border/60 bg-black/40 p-1 apex-shadow-elegant">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
              <Terminal className="h-3.5 w-3.5" /> bash
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words p-5 text-xs leading-relaxed sm:text-sm">
<span className="text-muted-foreground">$</span> git clone https://github.com/ShadowSafin/NewCloud
<span className="text-muted-foreground">$</span> cd NewCloud
<span className="text-muted-foreground">$</span> docker compose up -d

<span className="text-muted-foreground"># open http://localhost:3000 — that's it.</span>
            </pre>
          </div>
        </motion.div>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border/60 bg-white/[0.02] p-5"
            >
              <it.icon className="h-5 w-5 text-[var(--brand-cyan)]" />
              <div className="mt-3 font-display font-semibold">{it.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
export function HowItWorks() {
  const steps = [
    { n: "01", icon: Container, t: "Install", d: "Clone the repo, run docker compose up. Five services spin up automatically." },
    { n: "02", icon: HardDrive, t: "Upload", d: "Drag, drop, or click. Uploads are chunked, parallel, and resumable by default." },
    { n: "03", icon: Globe, t: "Access Anywhere", d: "Open the web UI from any browser. Your files are always a tab away." },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="How it works" title="Three steps. One cloud." />
      <div className="relative grid gap-6 md:grid-cols-3">
        <div className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp} transition={{ delay: i * 0.1 }}
            className="relative rounded-2xl border border-border/60 bg-white/[0.02] p-7 text-center"
          >
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--gradient-brand)] text-background apex-shadow-glow">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="font-display text-xs text-muted-foreground">{s.n}</div>
            <h3 className="mt-1 font-display text-xl font-semibold">{s.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Performance ---------- */
export function Performance() {
  const stats = [
    { k: "1 TB", l: "Max file size" },
    { k: "Parallel", l: "Chunk uploads" },
    { k: "15+", l: "File categories" },
    { k: "Live", l: "WebSocket sync" },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow="Performance"
        title="Built for real workloads."
        sub="Chunked uploads, background workers, and a storage engine designed to handle your entire library."
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-border/60 bg-white/[0.02] p-6 apex-shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Upload Architecture</div>
              <div className="font-display text-2xl font-semibold">Chunked & Resumable</div>
            </div>
            <Activity className="h-5 w-5 text-[var(--brand-cyan)]" />
          </div>
          <Sparkline />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l} className="rounded-xl border border-border/60 bg-black/20 p-4">
                <div className="font-display text-lg font-semibold text-gradient">{s.k}</div>
                <div className="text-[11px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {[
            { i: Database, t: "Deduplication engine", d: "Content-hash based dedup saves disk space automatically." },
            { i: FolderTree, t: "Smart file categorisation", d: "15+ categories auto-detected from MIME type and extension." },
            { i: RefreshCw, t: "Background workers", d: "Thumbnails, dedup, storage calc, and trash cleanup — all async." },
          ].map((x) => (
            <div key={x.t} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-white/[0.02] p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-[var(--brand-violet)] ring-1 ring-inset ring-white/10">
                <x.i className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display font-semibold">{x.t}</div>
                <p className="text-sm text-muted-foreground">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sparkline() {
  const points = [12, 28, 22, 40, 35, 56, 48, 70, 60, 84, 76, 92, 80, 96];
  const max = Math.max(...points);
  const path = points.map((p, i) => `${(i / (points.length - 1)) * 100},${100 - (p / max) * 90}`).join(" ");
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border/60 bg-black/20 p-3">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.16 200)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="oklch(0.68 0.22 295)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="url(#spark)" strokeWidth="1.4" points={path} />
        <polygon fill="url(#spark)" points={`0,100 ${path} 100,100`} opacity="0.4" />
      </svg>
    </div>
  );
}

/* ---------- File Management ---------- */
export function Collaboration() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <div className="rounded-2xl apex-glass p-6 apex-shadow-elegant">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display font-semibold">Activity Feed</div>
              <div className="text-xs text-muted-foreground">Live via WebSocket</div>
            </div>
            <div className="space-y-3">
              {[
                { who: "You", what: "uploaded design-system.fig", ago: "just now", i: Zap },
                { who: "You", what: "starred hero-final.png", ago: "2m", i: Star },
                { who: "You", what: "shared /Q4-launch via link", ago: "8m", i: Share2 },
                { who: "You", what: "restored keynote.mov from trash", ago: "15m", i: RefreshCw },
              ].map((e, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-white/[0.02] p-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.05] text-[var(--brand-cyan)]"><e.i className="h-4 w-4" /></div>
                  <div className="text-sm"><span className="font-medium">{e.who}</span> <span className="text-muted-foreground">{e.what}</span></div>
                  <div className="ml-auto text-[11px] text-muted-foreground">{e.ago}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="order-1 lg:order-2">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-cyan)]" /> File Management
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Organise your files <span className="text-gradient">effortlessly.</span>
          </h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Folders, favorites, trash, search, version history, and link sharing — everything you need to manage your library, built in from day one.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            {["Nested folders with breadcrumb navigation", "Favorites and starred files", "Trash with auto-cleanup", "Version history for every file", "Public share links", "Real-time WebSocket updates"].map((x) => (
              <li key={x} className="flex items-center gap-2 text-muted-foreground"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> {x}</li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Tech Stack ---------- */
export function AISection() {
  const items = [
    { i: Container, t: "Docker Compose", d: "Five services — frontend, backend, worker, PostgreSQL, Redis." },
    { i: Database, t: "PostgreSQL + Prisma", d: "Type-safe database layer with migration support." },
    { i: RefreshCw, t: "Redis + BullMQ", d: "Background job queues for thumbnails, dedup, and cleanup." },
    { i: Zap, t: "WebSocket Events", d: "Real-time file change notifications across all tabs." },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="Tech Stack" title="Modern infrastructure, no shortcuts." sub="Built on proven open-source technologies you already know." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((x, i) => (
          <motion.div key={x.t} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.06 }}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-white/[0.02] p-6">
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[var(--brand-violet)] opacity-20 blur-2xl" />
            <x.i className="h-5 w-5 text-[var(--brand-violet)]" />
            <div className="mt-3 font-display font-semibold">{x.t}</div>
            <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Dev ---------- */
export function DevSection() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <Code2 className="h-3.5 w-3.5" /> Built for developers
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">Open source & extensible.</h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            A REST API for every operation, a clean TypeScript codebase, and a modular architecture you can extend.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {[
              "Docker & Compose ready",
              "REST API for all operations",
              "TypeScript throughout",
              "Prisma + PostgreSQL",
              "Modular service layer",
              "Open source on GitHub",
            ].map((x) => (
              <div key={x} className="flex items-center gap-2 text-muted-foreground"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> {x}</div>
            ))}
          </div>
        </motion.div>
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          className="rounded-2xl border border-border/60 bg-black/40 p-1 apex-shadow-elegant">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" /> REST API
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words p-5 text-xs leading-relaxed sm:text-sm">
<span className="text-muted-foreground"># Upload a file (chunked)</span>
<span className="text-[var(--brand-violet)]">POST</span> <span className="text-[var(--brand-cyan)]">/api/uploads/initiate</span>
<span className="text-[var(--brand-violet)]">POST</span> <span className="text-[var(--brand-cyan)]">/api/uploads/:id/chunk/:index</span>
<span className="text-[var(--brand-violet)]">POST</span> <span className="text-[var(--brand-cyan)]">/api/uploads/:id/complete</span>

<span className="text-muted-foreground"># Manage files</span>
<span className="text-[var(--brand-violet)]">GET</span>  <span className="text-[var(--brand-cyan)]">/api/files</span>
<span className="text-[var(--brand-violet)]">GET</span>  <span className="text-[var(--brand-cyan)]">/api/files/:id/download</span>
<span className="text-[var(--brand-violet)]">GET</span>  <span className="text-[var(--brand-cyan)]">/api/files/:id/stream</span>

<span className="text-muted-foreground"># Share via link</span>
<span className="text-[var(--brand-violet)]">POST</span> <span className="text-[var(--brand-cyan)]">/api/shares</span>
<span className="text-[var(--brand-violet)]">GET</span>  <span className="text-[var(--brand-cyan)]">/api/shares/public/:token</span>
          </pre>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
export function Testimonials() {
  const t = [
    { q: "Replaced three SaaS subscriptions with a single docker compose. NewCloud sparks joy.", n: "Jonas R.", r: "Indie developer" },
    { q: "Finally a self-hosted drive that doesn't look like 2011. My team actually opens it.", n: "Sara L.", r: "Design lead" },
    { q: "Chunked uploads mean I can upload huge video files without worrying about timeouts.", n: "Marcus T.", r: "Filmmaker" },
    { q: "The real-time sync and file previews put other self-hosted solutions to shame.", n: "Priya K.", r: "Homelab enthusiast" },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="Loved by self-hosters" title="A community that ships." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.map((x, i) => (
          <motion.div key={i} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-border/60 bg-white/[0.02] p-6">
            <p className="text-sm leading-relaxed">"{x.q}"</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[var(--gradient-brand)]" />
              <div>
                <div className="text-sm font-medium">{x.n}</div>
                <div className="text-[11px] text-muted-foreground">{x.r}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */
export function Pricing() {
  return (
    <section id="pricing" className="relative mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="Pricing" title="Free. Self-hosted. Yours." />
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
        className="relative rounded-2xl border border-transparent bg-[linear-gradient(180deg,oklch(0.82_0.16_200_/_0.12),oklch(0.68_0.22_295_/_0.06))] ring-1 ring-[var(--brand-cyan)]/40 p-8 apex-shadow-card text-center">
        <div className="font-display text-sm uppercase tracking-wider text-muted-foreground">Self-Hosted</div>
        <div className="mt-3 font-display text-5xl font-semibold">Free</div>
        <p className="mt-3 text-muted-foreground">Forever. Everything included. No limits except your hardware.</p>
        <ul className="my-8 mx-auto max-w-xs space-y-2 text-sm text-left">
          {[
            "Unlimited storage (your disk)",
            "Chunked resumable uploads (up to 1TB/file)",
            "15+ auto-detected file categories",
            "Version history & trash",
            "Link sharing",
            "Real-time WebSocket sync",
            "Background workers (thumbnails, dedup)",
            "Docker Compose deployment",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand-cyan)] shrink-0" /> {f}</li>
          ))}
        </ul>
        <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--gradient-brand)] px-8 py-3 text-sm font-medium text-background apex-shadow-glow hover:opacity-90 transition">
          Get Started <ArrowRight className="h-4 w-4" />
        </a>
      </motion.div>
    </section>
  );
}

/* ---------- FAQ ---------- */
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function FAQ() {
  const qs: [string, string][] = [
    ["Is NewCloud open source?", "Yes. NewCloud is open source and developed in the open on GitHub."],
    ["Can I self-host it?", "That's the default. Run it on a NAS, a VPS, or any machine with Docker installed."],
    ["Does it support Docker?", "First-class. A single docker compose up starts all five services — frontend, backend, worker, PostgreSQL, and Redis."],
    ["Is it privacy focused?", "By design. Your files stay on your hardware. Zero telemetry, zero tracking."],
    ["Does it support large files?", "Files up to 1TB are supported. Uploads are chunked and resumable, so even huge files won't fail."],
    ["What file types are supported?", "All of them. NewCloud auto-categorises into 15+ types including images, video, audio, code, 3D models, datasets, and more."],
    ["Does it have version history?", "Yes. Every file keeps a version history. You can view and restore previous versions from the UI."],
    ["Can I share files?", "Yes. Generate a public share link for any file with one click. Anyone with the link can view or download."],
  ];
  return (
    <section id="faq" className="relative mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="FAQ" title="Questions, answered." />
      <Accordion type="single" collapsible className="w-full">
        {qs.map(([q, a], i) => (
          <AccordionItem key={i} value={`q-${i}`} className="border-b border-border/60">
            <AccordionTrigger className="text-left font-display text-base font-medium">{q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

/* ---------- CTA ---------- */
export function FinalCTA() {
  return (
    <section id="cta" className="relative mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-32">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-white/[0.02] p-12 text-center apex-shadow-elegant md:p-20">
        <div className="absolute inset-0 -z-10 bg-grid opacity-50" />
        <div className="absolute -top-32 left-1/2 -z-10 h-80 w-[700px] -translate-x-1/2 rounded-full bg-[var(--gradient-brand)] opacity-30 blur-3xl" />
        <h2 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">
          Take back control <br/>of <span className="text-gradient">your files.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Your files deserve a home you own. NewCloud makes it real — free, open source, and ready in minutes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--gradient-brand)] px-6 py-3 text-sm font-medium text-background apex-shadow-glow hover:opacity-90 transition">
            Start Self-Hosting <ArrowRight className="h-4 w-4" />
          </a>
          <a href="https://github.com/ShadowSafin/NewCloud" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-6 py-3 text-sm font-medium hover:bg-white/[0.06] transition">
            <Github className="h-4 w-4" /> View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
export function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <BrandMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold">NewCloud</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">The modern self-hosted cloud storage platform. Own your data.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          {[
            { h: "Product", l: [{ t: "Features", href: "#features" }, { t: "Pricing", href: "#pricing" }, { t: "FAQ", href: "#faq" }] },
            { h: "Developers", l: [{ t: "GitHub", href: "https://github.com/ShadowSafin/NewCloud" }, { t: "Docker Hub", href: "#" }, { t: "REST API", href: "#" }] },
            { h: "Account", l: [{ t: "Sign In", href: "/login" }, { t: "Register", href: "/register" }] },
          ].map((c) => (
            <div key={c.h}>
              <div className="mb-3 font-display text-xs uppercase tracking-wider text-muted-foreground">{c.h}</div>
              <ul className="space-y-2">{c.l.map((x) => (<li key={x.t}><a href={x.href} className="text-muted-foreground hover:text-foreground transition">{x.t}</a></li>))}</ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-border/60 pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} NewCloud. Built for people who own their files.
      </div>
    </footer>
  );
}
