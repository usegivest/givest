"use client";

import { useScrollProgress } from "@/hooks/useScrollProgress";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ShowcaseSection from "@/components/ShowcaseSection";
import StatsSection from "@/components/StatsSection";
import { useLiveStats, type LiveStats } from "@/lib/useLiveStats";

export default function HomePage({ initial }: { initial: LiveStats }) {
  const scrollProgress = useScrollProgress();
  const stats = useLiveStats(initial);

  return (
    <div className="min-h-[200vh]">
      <Navbar />
      <div className="relative" style={{ zIndex: 10 }}>
        <Hero
          scrollProgress={scrollProgress}
          volumeLabel={stats.volumeLabel}
          dropCount={stats.dropCount}
        />
        <ShowcaseSection scrollProgress={scrollProgress} />
      </div>
      <StatsSection initial={initial} />
    </div>
  );
}
