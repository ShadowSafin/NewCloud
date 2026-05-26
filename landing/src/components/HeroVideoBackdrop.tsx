"use client";

import { useEffect, useRef } from "react";

export default function HeroVideoBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const syncPlayback = () => {
      if (preference.matches) {
        video.pause();
        video.currentTime = 0;
      } else {
        void video.play().catch(() => {
          // Autoplay may be blocked until user interaction.
        });
      }
    };

    syncPlayback();
    preference.addEventListener("change", syncPlayback);
    return () => preference.removeEventListener("change", syncPlayback);
  }, []);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      className="hero-video-layer absolute inset-0 h-full w-full object-cover object-center"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      tabIndex={-1}
    >
      <source src="/hero-video.mp4" type="video/mp4" />
    </video>
  );
}
