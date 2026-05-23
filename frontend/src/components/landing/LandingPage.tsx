"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Github, PlayCircle, ShieldCheck, Server, Zap } from "lucide-react";
import { AmbientBackground } from "./Background";
import { Nav } from "./Nav";
import { DashboardMock } from "./DashboardMock";
import {
  Features, SelfHost, HowItWorks, Performance, Collaboration,
  AISection, DevSection, Testimonials, Pricing, FAQ, FinalCTA, Footer,
} from "./Sections";

export function LandingPage() {
  return (
    <div className="apex-root apex-body relative min-h-screen overflow-x-clip font-sans antialiased">
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
  const heroRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const cinematicProgress = useSpring(scrollYProgress, {
    stiffness: 72,
    damping: 28,
    mass: 0.35,
  });

  const glowY = useTransform(cinematicProgress, [0, 1], shouldReduceMotion ? ["0%", "0%"] : ["0%", "5%"]);
  const glowOpacity = useTransform(cinematicProgress, [0, 0.75, 1], [0.75, 0.5, 0.18]);
  const videoY = useTransform(cinematicProgress, [0, 1], shouldReduceMotion ? ["0%", "0%"] : ["0%", "12%"]);
  const videoScale = useTransform(cinematicProgress, [0, 1], shouldReduceMotion ? [1.08, 1.08] : [1.08, 1.22]);
  const videoOpacity = useTransform(cinematicProgress, [0, 0.72, 1], [0.95, 0.74, 0.2]);
  const overlayOpacity = useTransform(cinematicProgress, [0, 1], [0.62, 0.9]);
  const textY = useTransform(cinematicProgress, [0, 0.46], shouldReduceMotion ? [0, 0] : [0, -158]);
  const textOpacity = useTransform(cinematicProgress, [0, 0.28, 0.46], [1, 0.74, 0]);
  const textScale = useTransform(cinematicProgress, [0, 0.5], shouldReduceMotion ? [1, 1] : [1, 0.96]);
  const dashboardY = useTransform(cinematicProgress, [0, 0.56, 1], shouldReduceMotion ? [0, 0, 0] : [72, -154, -118]);
  const dashboardScale = useTransform(cinematicProgress, [0, 0.42, 1], [0.93, 1, 0.98]);
  const dashboardOpacity = useTransform(cinematicProgress, [0, 0.16, 0.82, 1], [0, 1, 0.96, 0.74]);
  const dashboardRotateX = useTransform(cinematicProgress, [0, 0.62, 1], shouldReduceMotion ? [0, 0, 0] : [8, -5, -2]);

  return (
    <section ref={heroRef} className="relative md:min-h-[230vh]">
      <div className="relative min-h-[100svh] overflow-hidden px-5 pb-14 pt-24 md:sticky md:top-0 md:min-h-screen md:px-6 md:pb-16 md:pt-32">
        <motion.div
          aria-hidden
          style={{ y: glowY, opacity: glowOpacity }}
          className="absolute inset-0 bg-[radial-gradient(ellipse_90%_64%_at_50%_16%,rgba(100,210,255,0.24),transparent_58%),linear-gradient(130deg,rgba(37,99,235,0.16),transparent_34%,rgba(168,85,247,0.14)_72%,transparent)]"
        />

        <motion.div
          aria-hidden
          style={{ y: videoY, scale: videoScale, opacity: videoOpacity }}
          className="absolute inset-[-8%] will-change-transform"
        >
          {shouldReduceMotion ? (
            <img
              src="/media/newcloud-hero-poster.jpg"
              alt=""
              className="h-full w-full scale-105 object-cover object-center"
              draggable={false}
            />
          ) : (
            <video
              className="h-full w-full scale-105 object-cover object-center"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/media/newcloud-hero-poster.jpg"
              aria-hidden
            >
              <source src="/media/newcloud-hero.mp4" type="video/mp4" />
            </video>
          )}
        </motion.div>

        <motion.div
          aria-hidden
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,4,12,0.56)_0%,rgba(5,7,17,0.5)_38%,rgba(8,10,22,0.86)_100%)]"
        />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_70%_38%_at_50%_44%,transparent_0%,rgba(0,0,0,0.34)_72%,rgba(0,0,0,0.76)_100%)]" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.55),transparent_18%,transparent_82%,rgba(0,0,0,0.55))]" />
        <div aria-hidden className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
        <div aria-hidden className="apex-hero-grain absolute inset-0 opacity-[0.16]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-6rem)] max-w-7xl flex-col items-center justify-start pt-[3vh] text-center md:min-h-[calc(100vh-7rem)] md:pt-[8vh]">
          <motion.div
            style={{ y: textY, opacity: textOpacity, scale: textScale }}
            className="mx-auto max-w-5xl will-change-transform"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs text-white/76 shadow-[0_0_30px_rgba(90,180,255,0.18)] backdrop-blur-2xl"
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] text-slate-950">v1</span>
              NewCloud cinematic self-hosted cloud
              <ArrowRight className="h-3 w-3" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.95, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="apex-text-shadow-cinematic font-display text-4xl font-bold leading-[0.98] text-white sm:text-5xl md:text-7xl lg:text-8xl"
            >
              Your private cloud, <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-white via-cyan-100 to-violet-100 bg-clip-text text-transparent">running like an OS.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-white/72 drop-shadow-[0_1px_22px_rgba(0,0,0,0.8)] md:text-lg"
            >
              A cinematic self-hosted storage platform with resilient uploads, secure media access, and a file manager that feels native to the future.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 md:mt-9"
            >
              <a href="/register" className="apex-hero-button apex-hero-button-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white">
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#features" className="apex-hero-button inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white/88">
                <PlayCircle className="h-4 w-4" /> See Features
              </a>
              <a href="https://github.com/ShadowSafin/NewCloud" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm text-white/62 transition hover:text-white">
                <Github className="h-4 w-4" /> GitHub
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/58 md:mt-8 md:gap-x-6"
            >
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-cyan)]" /> Zero telemetry</span>
              <span className="inline-flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-[var(--brand-cyan)]" /> Docker-native</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[var(--brand-cyan)]" /> Resumable uploads</span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mt-9 w-full max-w-[360px] pb-8 md:hidden"
          >
            <DashboardMock />
          </motion.div>

          <div className="pointer-events-none absolute bottom-[-30rem] left-0 right-0 z-10 hidden px-4 sm:bottom-[-20rem] md:block md:bottom-[-14rem]">
            <motion.div
              style={{ y: dashboardY, scale: dashboardScale, opacity: dashboardOpacity, rotateX: dashboardRotateX }}
              className="apex-perspective mx-auto w-full max-w-6xl origin-top will-change-transform"
            >
              <DashboardMock />
            </motion.div>
          </div>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 hidden h-56 bg-gradient-to-b from-transparent via-[var(--canvas)]/72 to-[var(--canvas)] md:block" />
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
