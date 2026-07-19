import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import VolumeStatsCards from "@/components/VolumeStatsCards";
import { ESCROW_ADDRESSES, CONTRACT_ADDRESS } from "@/lib/config";
import { formatVolumeUsd, getProtocolStats } from "@/lib/protocolStats";

export const metadata: Metadata = {
  title: "Volume — Givest",
  description:
    "Verify Givest onchain volume on Robinhood Chain. Public escrow contracts, creates, and claims.",
};

export const revalidate = 300;
export const runtime = "nodejs";
export const maxDuration = 60;

const EXPLORER = "https://robinhoodchain.blockscout.com";

const PROOF = {
  title: "$1,000 TSLA · 10 winners · fully claimed",
  create: "0x03e3ffb8ae9954dae02189246d3c8767ecd3db38106b710510bdf1e0352ec33f",
  claims: [
    "0x8efd79d0f27ceb3c5d5bd3b6ac3b8c3a281dbd0ff904a0d5b707455c37594397",
    "0xc5413be7dce5b92864be653c525766c2c293b01213b3ceae79895ef40eebed48",
    "0x1360f6af03ed71bbcc9b2b965ac6afa1d2bba6a6171ba3b42c14644ef6c7a7c9",
    "0xc51b5d3c5d7f8b45b3f73911388f2a1ef25155e22603f955c50dbdfe6711f8e7",
    "0x70cc247fd1f92fcff1e4bd12eb9c57a21e00b4223257181f9d652e1c8153533b",
    "0x733b1b971822ccfa269fe53001dfa81dc0c2f999ee139cb2dbe9d02a9fc9c362",
    "0xd2d3b764c0c258afc38e575a436f1ce88d9ea589d47ec735834aa949dd1bdb0a",
    "0x84004fe18b6f07a1a93db947d09214f9432dd2e90cb0c4d396dd12d91761c21f",
    "0xc30fed3965e2d1e3943bb8bec54fee0608ba9c4f252d03c51e099c3361ccff6a",
    "0x5960f3d90a637575a12be100bdbacc07d680251bfa707c0d65807376e3385422",
  ],
};

function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

function TxLink({ hash, label }: { hash: string; label?: string }) {
  return (
    <a
      href={`${EXPLORER}/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-left transition hover:border-gray-200 hover:bg-gray-50"
    >
      <span className="min-w-0">
        {label && (
          <span className="block text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
            {label}
          </span>
        )}
        <span className="font-mono text-xs text-gray-800 sm:text-sm">
          {shortHash(hash)}
        </span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-gray-500" />
    </a>
  );
}

export default async function VolumePage() {
  let volumeLabel = "$0";
  let stockVolumeLabel = "$0";
  let dropCount = 0;

  try {
    const stats = await getProtocolStats(3_000);
    volumeLabel = formatVolumeUsd(stats.volumeUsd);
    stockVolumeLabel = formatVolumeUsd(stats.stockVolumeUsd);
    dropCount = stats.dropCount;
  } catch (e) {
    console.error("[volume]", e);
  }

  const escrows = ESCROW_ADDRESSES.length
    ? ESCROW_ADDRESSES
    : ([CONTRACT_ADDRESS].filter(Boolean) as string[]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f7f6f3]">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/40 backdrop-blur-[2px]" />
      <Navbar variant="page" />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pt-8 pb-24 sm:px-6 sm:pt-10">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Volume
          </p>
          <h1 className="mt-4 text-[2rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem]">
            Verify it onchain.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            Givest volume is public. ETH into escrow contracts on Robinhood
            Chain. No screenshots. No private ledgers.
          </p>
        </header>

        <VolumeStatsCards
          initial={{ volumeLabel, stockVolumeLabel, dropCount }}
        />

        <section className="mt-10 rounded-2xl border border-gray-200/70 bg-white/95 p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            How to verify
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600">
            <li>1. Open an escrow contract on Blockscout.</li>
            <li>
              2. Check incoming ETH transfers and{" "}
              <span className="font-medium text-gray-900">DropCreated</span> /{" "}
              <span className="font-medium text-gray-900">DropClaimed</span> events.
            </li>
            <li>
              3. Volume on this page sums successful ETH into those contracts.
            </li>
          </ol>

          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-400 uppercase">
              Escrow contracts
            </p>
            {escrows.map((addr) => (
              <a
                key={addr}
                href={`${EXPLORER}/address/${addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 font-mono text-xs text-gray-800 transition hover:border-gray-200 hover:bg-white sm:text-sm"
              >
                <span className="truncate">{addr}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-gray-500" />
              </a>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-gray-200/70 bg-white/95 p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            Proof drop
          </h2>
          <p className="mt-2 text-sm text-gray-500">{PROOF.title}</p>

          <div className="mt-5 space-y-2">
            <TxLink hash={PROOF.create} label="Create" />
            {PROOF.claims.map((hash, i) => (
              <TxLink key={hash} hash={hash} label={`Claim ${i + 1}/10`} />
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/send"
            className="btn-primary inline-flex items-center justify-center px-5 py-2.5 text-sm"
          >
            Send a drop
          </Link>
          <a
            href={EXPLORER}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            Open Blockscout
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </main>
    </div>
  );
}
