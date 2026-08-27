"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { ArrowUpRight, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import StockLogo from "@/components/StockLogo";
import { stockDropsAbi } from "@/lib/config";
import { parseClaimInput } from "@/lib/claimLink";
import { publicClient } from "@/lib/chain";
import { readDrop, type DropView } from "@/lib/dropLookup";
import { useWallet } from "@/lib/wallet";

const EXPLORER = "https://robinhoodchain.blockscout.com";

const STATUS_LABEL: Record<number, string> = {
  1: "Open",
  2: "Fully claimed",
  3: "Refunded",
};

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatWhen(sec: number) {
  return new Date(sec * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StatusPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropView | null>(null);
  const [lockedPreview, setLockedPreview] = useState<{
    to: string;
    symbol: string | null;
    shares: number;
    status: number;
    claimsMade: number;
    maxClaims: number;
  } | null>(null);

  const nowSec = Math.floor(Date.now() / 1000);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("k");
    if (key) {
      setInput(key);
      void lookup(key);
    }
    // First paint only: a shared link with ?k=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(raw: string) {
    const parsed = parseClaimInput(raw);
    setError(null);
    setDrop(null);
    setLockedPreview(null);

    if (parsed.kind === "invalid") {
      setError(parsed.message);
      return;
    }

    setLoading(true);
    try {
      if (parsed.kind === "locked") {
        const res = await fetch("/api/locked-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blob: parsed.blob, to: parsed.to }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.error ?? "Could not read this locked gift.");
        }
        setLockedPreview({
          to: parsed.to,
          symbol: body.symbol ?? null,
          shares: Number(body.shares ?? 0),
          status: Number(body.status ?? 0),
          claimsMade: Number(body.claimsMade ?? 0),
          maxClaims: Number(body.maxClaims ?? 1),
        });
        return;
      }

      const found = await readDrop(parsed.claimKey);
      if (!found) {
        setError("No gift on any Givest escrow for that key.");
        return;
      }
      setDrop(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this gift.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/55 backdrop-blur-[3px]" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-28 pb-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Gift status
          </p>
          <h1 className="mt-4 text-[2.35rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem]">
            Is it still there?{" "}
            <span className="text-zinc-400">Ask the chain.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            Paste a claim link or a claim key. We only read. A private key in
            the link is turned into an address in your browser and never sent
            to us.
          </p>
        </header>

        <form
          className="popup-card-animate mt-10 rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(input);
          }}
        >
          <label htmlFor="gift-input" className="sr-only">
            Claim link or claim key
          </label>
          <textarea
            id="gift-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="https://usegivest.app/claim#0x… or a 0x claim key"
            className="input w-full resize-none px-4 py-3 font-mono text-xs sm:text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-sm"
          >
            <Search className="h-4 w-4" />
            {loading ? "Reading the chain…" : "Check status"}
          </button>
          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>

        {lockedPreview && (
          <LockedCard preview={lockedPreview} />
        )}

        {drop && (
          <DropCard
            drop={drop}
            nowSec={nowSec}
            onRefresh={() => lookup(drop.claimKey)}
          />
        )}
      </main>
    </div>
  );
}

function LockedCard({
  preview,
}: {
  preview: {
    to: string;
    symbol: string | null;
    shares: number;
    status: number;
    claimsMade: number;
    maxClaims: number;
  };
}) {
  return (
    <section className="popup-card-animate mt-6 rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg sm:p-7">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
        Locked gift
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
        {STATUS_LABEL[preview.status] ?? "Unknown"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        Locked to @{preview.to}. The claim key stays encrypted until that
        handle proves it.
      </p>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Row label="Token" value={preview.symbol ?? "Unknown"} />
        <Row
          label="Shares claimed"
          value={`${preview.claimsMade} / ${preview.maxClaims}`}
        />
        <Row
          label="Per claim"
          value={
            preview.shares
              ? `${preview.shares.toLocaleString("en-US", { maximumFractionDigits: 6 })} shares`
              : "Unknown"
          }
        />
      </dl>
    </section>
  );
}

function DropCard({
  drop,
  nowSec,
  onRefresh,
}: {
  drop: DropView;
  nowSec: number;
  onRefresh: () => void;
}) {
  const expired = nowSec >= drop.expiresAt;
  const locked = nowSec < drop.claimableAt;
  const sharesLeft = Math.max(0, drop.maxClaims - drop.claimsMade);
  const headline =
    drop.status === 2
      ? "Fully claimed"
      : drop.status === 3
        ? "Refunded to the sender"
        : expired
          ? "Expired, still onchain"
          : locked
            ? "Sealed until unlock"
            : sharesLeft === 0
              ? "No shares left"
              : "Open";

  const symbol = drop.stock?.symbol ?? "TOKEN";

  return (
    <section className="popup-card-animate mt-6 rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
            Onchain
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
            {headline}
          </h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
          <StockLogo symbol={symbol} size={40} />
        </div>
      </div>

      <p className="mt-3 text-2xl font-medium tracking-tight text-gray-900">
        {Number(formatEther(drop.amountPerClaim)).toLocaleString("en-US", {
          maximumFractionDigits: 6,
        })}{" "}
        {symbol}
        {drop.usdEach !== null && (
          <span className="ml-2 text-base font-normal text-gray-400">
            about ${Math.round(drop.usdEach).toLocaleString("en-US")} each
          </span>
        )}
      </p>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <Row label="Claims" value={`${drop.claimsMade} / ${drop.maxClaims}`} />
        <Row
          label="Unlocks"
          value={
            drop.claimableAt > 0 && locked
              ? formatWhen(drop.claimableAt)
              : "Now"
          }
        />
        <Row label="Expires" value={formatWhen(drop.expiresAt)} />
        <Row
          label="Sender"
          value={
            <a
              href={`${EXPLORER}/address/${drop.sender}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-gray-800 hover:underline"
            >
              {short(drop.sender)}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          }
        />
        <Row
          label="Claim key"
          value={
            <span className="font-mono text-gray-800">{short(drop.claimKey)}</span>
          }
        />
        <Row
          label="Escrow"
          value={
            <a
              href={`${EXPLORER}/address/${drop.escrow}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-gray-800 hover:underline"
            >
              {short(drop.escrow)}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          }
        />
      </dl>

      <div className="mt-6 flex flex-col gap-2">
        {drop.status === 1 && !expired && (
          <Link
            href="/claim"
            className="btn-secondary inline-flex w-full items-center justify-center px-5 py-3 text-sm"
          >
            Open the claim page
          </Link>
        )}
        {drop.status === 1 && (
          <RefundButton drop={drop} expired={expired} onDone={onRefresh} />
        )}
      </div>
    </section>
  );
}

function RefundButton({
  drop,
  expired,
  onDone,
}: {
  drop: DropView;
  expired: boolean;
  onDone: () => void;
}) {
  const { address, client, connect } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSender =
    address !== null && address.toLowerCase() === drop.sender.toLowerCase();

  if (!expired && !isSender && address) {
    return (
      <p className="text-center text-xs text-gray-400">
        Only the sender can refund this gift before it expires.
      </p>
    );
  }

  async function run() {
    setError(null);
    setBusy(true);
    try {
      let wallet = client;
      let from = address;
      if (!wallet || !from) {
        const next = await connect();
        wallet = next.client;
        from = next.address;
      }
      if (!wallet || !from) throw new Error("Connect a wallet to refund.");
      const fn = expired ? "refundExpired" : "refund";
      if (!expired && from.toLowerCase() !== drop.sender.toLowerCase()) {
        throw new Error("This wallet did not send the gift.");
      }
      const hash = await wallet.writeContract({
        address: drop.escrow,
        abi: stockDropsAbi,
        functionName: fn,
        args: [drop.claimKey],
        account: from,
        chain: wallet.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Refund failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="btn-secondary inline-flex w-full items-center justify-center px-5 py-3 text-sm"
      >
        {busy
          ? "Refunding…"
          : expired
            ? "Return remaining tokens to sender"
            : isSender || !address
              ? "Refund this gift"
              : "Connect sender wallet to refund"}
      </button>
      {error && (
        <p className="mt-2 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-3.5 py-3">
      <dt className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-gray-900">{value}</dd>
    </div>
  );
}

