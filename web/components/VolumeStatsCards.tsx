"use client";

import { useLiveStats, type LiveStats } from "@/lib/useLiveStats";

export default function VolumeStatsCards({ initial }: { initial: LiveStats }) {
  const stats = useLiveStats(initial);

  return (
    <section className="mt-12 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-gray-200/70 bg-white/95 px-5 py-6 shadow-sm">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-400 uppercase">
          Volume
        </p>
        <p className="mt-3 text-3xl font-medium tracking-tight text-gray-900">
          {stats.volumeLabel}
        </p>
        <p className="mt-2 text-xs text-gray-500">ETH into protocol</p>
      </div>
      <div className="rounded-2xl border border-gray-200/70 bg-white/95 px-5 py-6 shadow-sm">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-400 uppercase">
          Drops
        </p>
        <p className="mt-3 text-3xl font-medium tracking-tight text-gray-900">
          {stats.dropCount}
        </p>
        <p className="mt-2 text-xs text-gray-500">Creates onchain</p>
      </div>
      <div className="rounded-2xl border border-gray-200/70 bg-white/95 px-5 py-6 shadow-sm">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-400 uppercase">
          Stock locked
        </p>
        <p className="mt-3 text-3xl font-medium tracking-tight text-gray-900">
          {stats.stockVolumeLabel}
        </p>
        <p className="mt-2 text-xs text-gray-500">Tokens in escrow events</p>
      </div>
      <p className="text-[11px] text-gray-400 sm:col-span-3">
        Live from Robinhood Chain. Updates automatically.
      </p>
    </section>
  );
}
