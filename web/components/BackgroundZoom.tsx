"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Keeps the shared background zoom stable across routes. */
export default function BackgroundZoom() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (!isHome) {
      setScrollProgress(0);
      return;
    }

    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      setScrollProgress(vh > 0 ? Math.min(window.scrollY / vh, 1) : 0);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    const zoom = isHome ? 1 + scrollProgress * 0.3 : 1.08;
    document.documentElement.style.setProperty("--bg-zoom", String(zoom));
  }, [isHome, scrollProgress]);

  return null;
}
