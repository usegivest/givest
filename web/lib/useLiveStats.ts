"use client";

import { useEffect, useState } from "react";

export type LiveStats = {
  volumeLabel: string;
  stockVolumeLabel: string;
  dropCount: number;
};

/** Hydrates with SSR values, then polls /api/stats so numbers stay live 24/7. */
export function useLiveStats(initial: LiveStats, intervalMs = 30_000): LiveStats {
  const [stats, setStats] = useState<LiveStats>(initial);

  useEffect(() => {
    let stopped = false;

    async function load() {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        if (stopped || !d?.volumeLabel) return;
        setStats({
          volumeLabel: d.volumeLabel,
          stockVolumeLabel: d.stockVolumeLabel ?? "$0",
          dropCount: typeof d.dropCount === "number" ? d.dropCount : 0,
        });
      } catch {
        // keep last known values
      }
    }

    load();
    const id = window.setInterval(load, intervalMs);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return stats;
}
