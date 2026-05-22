"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github, PlayCircle, ShieldCheck, Server, Zap, HardDrive } from "lucide-react";
import { AmbientBackground } from "./Background";
import { Nav } from "./Nav";
import { DashboardMock } from "./DashboardMock";
import {
  Features, SelfHost, HowItWorks, Performance, Collaboration,
  AISection, DevSection, Testimonials, Pricing, FAQ, FinalCTA, Footer,
} from "./Sections";

export function LandingPage() {
  return (
    <div className="apex-root apex-body relative min-h-screen overflow-hidden font-sans antialiased">
      <AmbientBackground />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <SelfHost />
        <HowItWorks />
        <Performance />
        <Collaboration />
        <AISection />
        <DevSection />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative px-6 pt-40 pb-20 md:pt-48">
      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground"
        >
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--gradient-brand)] text-[10px] text-background">v1</span>
          NewCloud — self-hosted cloud storage
          <ArrowRight className="h-3 w-3" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05 }}
          className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl"
        >
          Your files. <br className="hidden sm:block" />
          <span className="apex-text-gradient">Your server.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-balance text-base text-muted-foreground md:text-lg"
        >
          NewCloud is a modern, self-hosted cloud storage platform.
          Chunked resumable uploads, real-time sync, version history, and a file manager you'll actually love.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--gradient-brand)] px-6 py-3 text-sm font-medium text-background apex-shadow-glow transition hover:opacity-90">
            Get Started <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/[0.03] px-6 py-3 text-sm font-medium transition hover:bg-white/[0.06]">
            <PlayCircle className="h-4 w-4" /> See Features
          </a>
          <a href="https://github.com/ShadowSafin/NewCloud" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm text-muted-foreground transition hover:text-foreground">
            <Github className="h-4 w-4" /> GitHub
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-cyan)]"/> Zero telemetry</span>
          <span className="inline-flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-[var(--brand-cyan)]"/> Docker-native</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[var(--brand-cyan)]"/> Resumable uploads</span>
        </motion.div>
      </div>

      <div className="mt-20">
        <DashboardMock />
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["Self-hosters", "Developers", "Filmmakers", "Designers", "Homelabs", "NAS owners", "Privacy-first", "Students"];
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-black/20 py-6">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">Built for people who own their files</div>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground/80">
          {items.map((i) => (<span key={i} className="font-display tracking-wide">{i}</span>))}
        </div>
      </div>
    </section>
  );
}