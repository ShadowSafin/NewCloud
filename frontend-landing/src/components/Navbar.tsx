"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import GithubIcon from "./GithubIcon";
import { GlassEffect, GlassFilter } from "./ui/liquid-glass";

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Deployment", href: "#self-hosting" },
  { name: "Clients", href: "#apps" },
  { name: "GitHub", href: "https://github.com/ShadowSafin/NexxCloud", isExternal: true },
  { name: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      (previouslyFocused ?? menuButton)?.focus();
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <GlassFilter />
      <nav
        aria-label="Primary"
        id="navbar"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
          scrolled
            ? "mt-2 max-w-7xl mx-auto scale-[0.98] w-[95%]"
            : "w-full"
        }`}
      >
        <GlassEffect
          enabled={scrolled}
          className={scrolled ? "rounded-full border border-white/10" : ""}
          contentClassName={scrolled ? "py-3 px-4 md:px-8" : "py-6 px-6 md:px-12"}
        >
          <div className="flex items-center justify-between">
          <a
            href="#"
            className="flex items-center gap-2 group text-foreground font-semibold text-lg tracking-tight transition-opacity"
            id="nav-logo"
          >
            <div className="w-8 h-8 overflow-hidden rounded-lg border border-white/10 shadow-lg shadow-brand-purple/10 group-hover:scale-105 transition-transform duration-300">
              <span aria-hidden="true" className="block h-full w-full bg-[url('/icon.png')] bg-cover" />
            </div>
            <span className="font-medium tracking-tight">
              Nexx<span className="text-zinc-400 font-normal">Cloud</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-1 bg-zinc-950/20 px-1 py-1 rounded-full border border-white/5">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target={link.isExternal ? "_blank" : undefined}
                rel={link.isExternal ? "noopener noreferrer" : undefined}
                className="px-4 py-1.5 rounded-full text-[13px] font-medium text-zinc-400 hover:text-foreground transition-all duration-300 hover:bg-white/5 flex items-center gap-1 group/item"
              >
                {link.name}
                {link.isExternal && (
                  <ArrowUpRight className="w-3 h-3 opacity-40 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 group-hover/item:-translate-y-0.5 transition-all" />
                )}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://github.com/ShadowSafin/NexxCloud"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 hover:border-white/15 text-[13px] font-medium text-zinc-300 hover:text-foreground transition-all bg-white/5 hover:bg-white/10"
              id="btn-nav-github"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <a
              href="#self-hosting"
              className="px-4 py-2 rounded-full bg-foreground hover:bg-zinc-200 text-background text-[13px] font-semibold transition-all shadow-md hover:shadow-lg shadow-white/5 active:scale-95"
              id="btn-nav-host"
            >
              Deploy
            </a>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-zinc-400 hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            id="btn-mobile-menu-open"
          >
            <Menu className="w-5 h-5" />
          </button>
          </div>
        </GlassEffect>
      </nav>

      {mobileMenuOpen && (
        <div
          ref={dialogRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-50 bg-[#030303]/90 backdrop-blur-md md:hidden"
        >
          <div className="flex flex-col h-full p-6 justify-between">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <a href="#" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <div className="w-8 h-8 overflow-hidden rounded-lg border border-white/10">
                    <span aria-hidden="true" className="block h-full w-full bg-[url('/icon.png')] bg-cover" />
                  </div>
                  <span className="font-semibold text-lg">
                    Nexx<span className="text-zinc-400 font-normal">Cloud</span>
                  </span>
                </a>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-zinc-400 hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
                  aria-label="Close menu"
                  id="btn-mobile-menu-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4 mt-4">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target={link.isExternal ? "_blank" : undefined}
                    rel={link.isExternal ? "noopener noreferrer" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium text-zinc-400 hover:text-foreground transition-all flex items-center justify-between py-2 border-b border-white/5"
                  >
                    <span>{link.name}</span>
                    {link.isExternal && <ArrowUpRight className="w-4 h-4 opacity-45" />}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <a
                href="https://github.com/ShadowSafin/NexxCloud"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-white/10 text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 transition-all"
              >
                <GithubIcon className="w-5 h-5" />
                <span>GitHub</span>
              </a>
              <a
                href="#self-hosting"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-3.5 rounded-xl bg-foreground hover:bg-zinc-200 text-background text-sm font-semibold transition-all shadow-lg"
              >
                Deploy
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
