import { motion } from "framer-motion";
import { Github, HardDrive } from "lucide-react";

export function Nav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-full"
    >
      <div className="apex-glass flex items-center justify-between rounded-full px-3 py-2 apex-shadow-card">
        <a href="/" className="flex items-center gap-2 pl-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gradient-brand)] apex-shadow-glow">
            <HardDrive className="h-4 w-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">NewCloud</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a className="hover:text-foreground transition" href="#features">Features</a>
          <a className="hover:text-foreground transition" href="#self-host">Self-host</a>
          <a className="hover:text-foreground transition" href="#pricing">Pricing</a>
          <a className="hover:text-foreground transition" href="#faq">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href="https://github.com/ShadowSafin/NewCloud" target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition">
            <Github className="h-4 w-4" /> GitHub
          </a>
          <a href="/register" className="inline-flex items-center rounded-full bg-[var(--gradient-brand)] px-4 py-2 text-sm font-medium text-background apex-shadow-glow hover:opacity-90 transition">
            Get Started
          </a>
        </div>
      </div>
    </motion.header>
  );
}