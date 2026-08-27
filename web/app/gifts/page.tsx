"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEther, type Address } from "viem";
import Navbar from "@/components/Navbar";
import StockLogo from "@/components/StockLogo";
import { useWallet } from "@/lib/wallet";
import {
  dropHeadline,
  readDrop,
  readDropsForSender,
  type DropView,
} from "@/lib/dropLookup";

type SavedDrop = {
  claimKey: string;
  link: string;
  symbol: string;
  usd: number;
  createdAt: number;
};

export default function GiftsPage() {
  const { address, connect, hasProvider } = useWallet();
  const [local, setLocal] = useState<SavedDrop[]>([]);
  const [onchain, setOnchain] = useState<DropView[]>([]);
  const [localLive, setLocalLive] = useState<DropView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLocal(JSON.parse(localStorage.getItem("stockdrops") ?? "[]"));
    } catch {
      setLocal([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(local.map((d) => readDrop(d.claimKey as Address))).then((rows) => {
      if (!cancelled) setLocalLive(rows.filter((d): d is DropView => d !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [local]);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    readDropsForSender(address)
      .then((rows) => {
        if (!cancelled) setOnchain(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not read your gifts.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const merged = mergeDrops(localLive, onchain);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/55 backdrop-blur-[3px]" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-28 pb-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Your gifts
          </p>
          <h1 className="mt-4 text-[2.35rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem]">
            What you sent.{" "}
            <span className="text-zinc-400">Read from the chain.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            Gifts this browser still remembers, plus every drop this wallet
            created onchain. Status is live.
          </p>
        </header>

        <div className="mt-10 flex justify-center">
          {address ? (
            <p className="font-mono text-xs text-gray-400">
              {address.slice(0, 6)}…{address.slice(-4)}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => connect().catch((e) => setError(e.message))}
              disabled={!hasProvider}
              className="btn-primary px-5 py-3 text-sm"
            >
              {hasProvider ? "Connect wallet" : "Install a wallet to see onchain gifts"}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {loading && (
          <p className="mt-4 text-center text-sm text-gray-400">
            Reading your drops…
          </p>
        )}

        {merged.length === 0 && !loading ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            No gifts yet.{" "}
            <Link href="/send" className="font-semibold text-gray-900 underline underline-offset-4">
              Send one
            </Link>
          </p>
        ) : (
          <ul className="mt-10 space-y-3">
            {merged.map((drop) => {
              const symbol = drop.stock?.symbol ?? "TOKEN";
              const saved = local.find(
                (d) => d.claimKey.toLowerCase() === drop.claimKey.toLowerCase(),
              );
              return (
                <li
                  key={`${drop.escrow}-${drop.claimKey}`}
                  className="popup-card-animate flex items-center justify-between gap-4 rounded-2xl border border-gray-200/60 bg-white/95 p-4 shadow-sm sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
                      <StockLogo symbol={symbol} size={36} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {Number(formatEther(drop.amountPerClaim)).toLocaleString("en-US", {
                          maximumFractionDigits: 6,
                        })}{" "}
                        {symbol}
                        {saved ? ` · $${saved.usd}` : ""}
                      </p>
                      <p className="text-xs text-gray-400">{dropHeadline(drop)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/status?k=${drop.claimKey}`}
                      className="text-xs font-semibold text-gray-700 underline-offset-2 hover:underline"
                    >
                      Status
                    </Link>
                    {saved && (
                      <a
                        href={saved.link}
                        className="text-xs font-semibold text-gray-400 underline-offset-2 hover:text-gray-900 hover:underline"
                      >
                        Link
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function mergeDrops(a: DropView[], b: DropView[]): DropView[] {
  const map = new Map<string, DropView>();
  for (const drop of [...a, ...b]) {
    map.set(drop.claimKey.toLowerCase(), drop);
  }
  return [...map.values()].sort((x, y) => y.expiresAt - x.expiresAt);
}
