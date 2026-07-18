"use client";

import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { useLiveStats, type LiveStats } from "@/lib/useLiveStats";

const EXPLORER = "https://robinhoodchain.blockscout.com";
const LIVE_ESCROW = "0xA318294016823c058E9c4d4f7FA4F5aef41775cC";

export default function StatsSection({ initial }: { initial: LiveStats }) {
  const stats = useLiveStats(initial);

  return (
    <section className="relative z-30 px-4 pb-20 sm:px-6 sm:pb-24 md:px-16 lg:px-24">
      <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-2xl border border-gray-200/60 bg-white/95 shadow-lg backdrop-blur-md sm:rounded-3xl">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col justify-center p-6 sm:p-10 md:p-14">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
              Onchain
            </p>
            <h2 className="mt-4 text-2xl leading-tight font-medium tracking-tighter text-gray-900 sm:text-3xl md:text-[2.75rem] md:leading-[1.15]">
              Real volume.
              <br />
              <span className="text-zinc-400">Public txs.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-gray-500 md:text-base">
              Every drop is escrowed on Robinhood Chain. Volume is ETH that
              entered the protocol, priced live. Verify every transaction
              yourself.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/volume"
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm"
              >
                Verify volume
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href={`${EXPLORER}/address/${LIVE_ESCROW}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2 px-6 py-2.5 text-sm"
              >
                Escrow contract
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-gray-100 border-t border-gray-100 md:border-t-0 md:border-l">
            <div className="flex flex-col justify-center px-6 py-7 sm:px-10 sm:py-8 md:px-14">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
                Volume sent
              </p>
              <p className="mt-2 text-4xl font-medium tracking-tighter text-gray-900 sm:text-5xl">
                {stats.volumeLabel}
              </p>
              <p className="mt-1.5 text-sm text-gray-400">
                ETH into escrow, priced live
              </p>
            </div>
            <div className="flex flex-col justify-center px-6 py-7 sm:px-10 sm:py-8 md:px-14">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
                Drops created
              </p>
              <p className="mt-2 text-4xl font-medium tracking-tighter text-gray-900 sm:text-5xl">
                {stats.dropCount}
              </p>
              <p className="mt-1.5 text-sm text-gray-400">
                Settled on Robinhood Chain
              </p>
            </div>
            <div className="flex flex-col justify-center px-6 py-7 sm:px-10 sm:py-8 md:px-14">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
                Stock locked
              </p>
              <p className="mt-2 text-4xl font-medium tracking-tighter text-gray-900 sm:text-5xl">
                {stats.stockVolumeLabel}
              </p>
              <p className="mt-1.5 text-sm text-gray-400">
                Tokens escrowed in drops
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
