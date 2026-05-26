"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

interface SpotlightShellProps {
  children: ReactNode;
}

export default function SpotlightShell({ children }: SpotlightShellProps) {
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reducedMotionRef.current = preference.matches;
    };

    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || reducedMotionRef.current) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--y", `${event.clientY - rect.top}px`);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      className="relative min-h-screen bg-[#030303] text-[#F4F4F5] flex flex-col overflow-hidden radial-spotlight"
    >
      {children}
    </div>
  );
}
