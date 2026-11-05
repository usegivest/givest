"use client";

import { useScrollProgress } from "@/hooks/useScrollProgress";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ShowcaseSection from "@/components/ShowcaseSection";

export default function HomePage() {
  const scrollProgress = useScrollProgress();

  return (
    <div className="min-h-[200vh]">
      <Navbar />
      <div className="relative" style={{ zIndex: 10 }}>
        <Hero scrollProgress={scrollProgress} />
        <ShowcaseSection scrollProgress={scrollProgress} />
      </div>
    </div>
  );
}
