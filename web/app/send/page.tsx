"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { ArrowUpRight, Check, Copy, CreditCard, Link2, ShieldCheck, Wallet } from "lucide-react";
import EditorialPageShell from "@/components/EditorialPageShell";
import StockLogo from "@/components/StockLogo";
import {
  STOCKS,
  CONTRACT_ADDRESS,
  EXPIRY_DAYS,
  USDG,
  PROTOCOL_FEE,
  stockDropsAbi,
} from "@/lib/config";
import { newClaimKey, publicClient } from "@/lib/chain";
import {
  formatShares,
  MAX_PRICE_IMPACT_PCT,
  quoteBestStockSwap,
  type StockQuote,
} from "@/lib/quotes";
import { readEthUsd, readUsdPrice } from "@/lib/prices";
import { readFeeStatus, feeStatusFromBps, type FeeStatus } from "@/lib/fees";
import { useWallet } from "@/lib/wallet";

type Phase = "form" | "confirming" | "done";

type SavedDrop = {
  claimKey: string;
  link: string;
  symbol: string;
  usd: number;
  createdAt: number;
};

const USD_PRESETS = [5, 10, 25, 50, 100];
const SHARE_PRESETS = [0.1, 0.5, 1, 2, 5];
const SLIPPAGE = 0.96;

type AmountMode = "usd" | "shares";
type DropMode = "normal" | "giveaway";

type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; quote: StockQuote; ethIn: bigint }
  | { status: "error"; message: string };

const GIVEAWAY_WINDOWS = [
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "30 min", seconds: 1800 },
] as const;

const SPLIT_PRESETS = [1, 5, 10, 20, 50] as const;

const FOOTER = (
  <>
    The escrow contract is open source and verified on Blockscout. Stock tokens
    are not shares. They provide economic exposure, not shareholder rights.
  </>
);

export default function SendPage() {
  const { address, client, connect } = useWallet();
  const [symbol, setSymbol] = useState("NVDA");
  const [stockQuery, setStockQuery] = useState("");
  const [stockLimit, setStockLimit] = useState(12);
  const [amountMode, setAmountMode] = useState<AmountMode>("usd");
  const [usdInput, setUsdInput] = useState("10");
  const [sharesInput, setSharesInput] = useState("1");
  const [customActive, setCustomActive] = useState(false);
  const [message, setMessage] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockHandle, setLockHandle] = useState("");
  const [xAuth, setXAuth] = useState<{
    enabled: boolean;
    user: { handle: string; name: string; avatar: string } | null;
  }>({ enabled: false, user: null });
  const [dropMode, setDropMode] = useState<DropMode>("normal");
  const [giveawayWindowSec, setGiveawayWindowSec] = useState(300);
  const [splits, setSplits] = useState(1);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimableAt, setClaimableAt] = useState<number | null>(null);
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [stockUsd, setStockUsd] = useState<number | null>(null);
  const [saved, setSaved] = useState<SavedDrop[]>([]);
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: "idle" });
  const [fee, setFee] = useState<FeeStatus>(() =>
    feeStatusFromBps(PROTOCOL_FEE.baseBps),
  );
  const [onrampAvailable, setOnrampAvailable] = useState(false);
  const [onrampOpening, setOnrampOpening] = useState(false);

  const stock = useMemo(() => STOCKS.find((s) => s.symbol === symbol)!, [symbol]);
  const filteredStocks = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    if (!q) return STOCKS;
    return STOCKS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q),
    );
  }, [stockQuery]);
  const visibleStocks = useMemo(
    () => filteredStocks.slice(0, stockQuery.trim() ? Math.max(stockLimit, 24) : stockLimit),
    [filteredStocks, stockLimit, stockQuery],
  );
  const hasMoreStocks = visibleStocks.length < filteredStocks.length;
  const shares = Number(sharesInput) || 0;
  const usd =
    amountMode === "usd"
      ? Number(usdInput) || 0
      : stockUsd
        ? shares * stockUsd
        : 0;

  useEffect(() => {
    readEthUsd().then(setEthUsd);
    fetch("/api/onramp")
      .then((r) => r.json())
      .then((d) => setOnrampAvailable(Boolean(d.enabled)))
      .catch(() => setOnrampAvailable(false));
  }, []);

  async function openOnramp() {
    if (!address || onrampOpening) return;
    setOnrampOpening(true);
    try {
      // Small buffer on top of the drop size so fees and gas are covered.
      const target = Math.max(Math.ceil(usd * 1.08) + 3, 20);
      const res = await fetch(
        `/api/onramp?address=${address}&usd=${target}`,
      );
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "moonpay", "width=470,height=740,noopener");
      }
    } finally {
      setOnrampOpening(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    readFeeStatus(address).then((next) => {
      if (!cancelled) setFee(next);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    setStockUsd(null);
    if (stock.feed) readUsdPrice(stock.feed).then(setStockUsd);
  }, [stock]);

  useEffect(() => {
    if (!stock.feed && amountMode === "shares") {
      setAmountMode("usd");
      setCustomActive(false);
    }
  }, [stock, amountMode]);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem("stockdrops") ?? "[]"));
    } catch {
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/x/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setXAuth({ enabled: Boolean(d.enabled), user: d.user ?? null });
      })
      .catch(() => {});
  }, []);

  const ethAmount = ethUsd && usd > 0 ? usd / ethUsd : null;
  const approxShares =
    amountMode === "shares"
      ? shares
      : stockUsd && usd > 0
        ? usd / stockUsd
        : null;

  useEffect(() => {
    if (!ethUsd || usd <= 0) {
      setQuoteState({ status: "idle" });
      return;
    }

    const ethIn = parseEther((usd / ethUsd).toFixed(18));
    if (ethIn <= 0n) {
      setQuoteState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setQuoteState({ status: "loading" });

    const timer = window.setTimeout(async () => {
      try {
        const quote = await quoteBestStockSwap(
          ethIn,
          stock.address,
          stockUsd,
          usd,
        );
        if (cancelled) return;
        setQuoteState({ status: "ready", quote, ethIn });
      } catch (e) {
        if (cancelled) return;
        setQuoteState({
          status: "error",
          message:
            e instanceof Error
              ? e.message.split("\n")[0]
              : "Not enough deep liquidity for this size.",
        });
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [stock.address, stock.symbol, usd, ethUsd, stockUsd]);

  const quotedShares =
    quoteState.status === "ready"
      ? Number(formatEther(quoteState.quote.amountOut))
      : null;
  const quotedUsd =
    quotedShares !== null && stockUsd !== null
      ? quotedShares * stockUsd
      : null;
  const priceImpactPct =
    approxShares !== null &&
    quotedShares !== null &&
    approxShares > 0
      ? ((approxShares - quotedShares) / approxShares) * 100
      : null;
  const liquidityBlocked =
    priceImpactPct !== null && priceImpactPct > MAX_PRICE_IMPACT_PCT;
  const liquidityBlockMessage = liquidityBlocked
    ? `Not enough liquidity for $${usd.toLocaleString()} of ${stock.symbol} on the best pool (impact −${priceImpactPct!.toFixed(1)}%). Try a smaller amount.`
    : null;

  function switchMode(next: AmountMode) {
    if (next === amountMode) return;
    setCustomActive(false);
    if (next === "shares") {
      if (!stock.feed || stockUsd === null) {
        setError(`No live price for ${stock.symbol} yet. Send in USD instead.`);
        return;
      }
      setError(null);
      const fromUsd = Number(usdInput) || 0;
      setSharesInput(fromUsd > 0 ? (fromUsd / stockUsd).toFixed(4).replace(/\.?0+$/, "") : "1");
    } else if (stockUsd !== null) {
      const fromShares = Number(sharesInput) || 0;
      setUsdInput(fromShares > 0 ? (fromShares * stockUsd).toFixed(2) : "10");
    }
    setAmountMode(next);
  }

  async function submit() {
    setError(null);
    try {
      if (amountMode === "shares" && !stockUsd) {
        throw new Error(`No live price for ${stock.symbol}. Send in USD instead.`);
      }
      if (usd <= 0) {
        throw new Error(
          amountMode === "shares"
            ? "Enter a share amount greater than 0."
            : "Enter an amount greater than $0.",
        );
      }
      if (lockEnabled && !lockHandle.trim().replace(/^@/, "")) {
        throw new Error("Enter the X handle that should claim this drop.");
      }
      const wallet = client && address ? { client, address } : await connect();
      const walletClient = "client" in wallet ? wallet.client : client!;
      const from = "address" in wallet ? wallet.address : address!;
      if (!ethUsd) throw new Error("Could not fetch the ETH price. Try again.");

      if (liquidityBlocked) {
        throw new Error(
          liquidityBlockMessage ??
            "Not enough liquidity for this size. Try a smaller amount.",
        );
      }

      setPhase("confirming");
      const key = newClaimKey();
      const giftEth = parseEther((usd / ethUsd).toFixed(18));
      const value = fee.grossFromGift(giftEth);

      let bestQuote: StockQuote;
      if (quoteState.status === "ready" && quoteState.ethIn === giftEth) {
        bestQuote = quoteState.quote;
      } else {
        bestQuote = await quoteBestStockSwap(
          giftEth,
          stock.address,
          stockUsd,
          usd,
        );
      }

      const route = bestQuote.route;
      const minOut =
        (bestQuote.amountOut * BigInt(Math.round(SLIPPAGE * 1000))) / 1000n;
      if (minOut <= 0n) {
        throw new Error("Quote too small. Try a different amount or stock.");
      }
      const expiresAt = Math.floor(Date.now() / 1000) + EXPIRY_DAYS * 86400;
      const nowSec = Math.floor(Date.now() / 1000);
      // Giveaway: unlock at a random second inside the window you set.
      // Normal: claimable immediately.
      const unlockAt =
        dropMode === "giveaway"
          ? nowSec + 1 + Math.floor(Math.random() * giveawayWindowSec)
          : nowSec;
      setClaimableAt(unlockAt);

      let hash: `0x${string}`;
      if (route.kind === "v3") {
        hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: stockDropsAbi,
          functionName: "createDropWithEth",
          args: [
            key.address,
            stock.address,
            route.path,
            minOut,
            expiresAt,
            unlockAt,
            splits,
          ],
          value,
          account: from,
          chain: walletClient.chain,
        });
      } else if (route.kind === "v4") {
        hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: stockDropsAbi,
          functionName: "createDropWithEthV4",
          args: [
            key.address,
            stock.address,
            route.fee,
            route.tickSpacing,
            route.hooks,
            minOut,
            expiresAt,
            unlockAt,
            splits,
          ],
          value,
          account: from,
          chain: walletClient.chain,
        });
      } else {
        hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: stockDropsAbi,
          functionName: "createDropWithEthViaUsdgV4",
          args: [
            key.address,
            stock.address,
            USDG,
            route.ethToUsdgPath,
            route.fee,
            route.tickSpacing,
            route.hooks,
            minOut,
            expiresAt,
            unlockAt,
            splits,
          ],
          value,
          account: from,
          chain: walletClient.chain,
        });
      }
      await publicClient.waitForTransactionReceipt({ hash });

      let senderPart = "";
      if (xAuth.user) {
        // Verified: server attests that the signed-in X account made this drop.
        try {
          const res = await fetch("/api/attest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claimKey: key.address }),
          });
          if (res.ok) {
            const { handle, sig } = await res.json();
            senderPart = `&x=${encodeURIComponent(handle)}&xv=${sig}`;
          }
        } catch {
          // fall through to manual handle
        }
      }
      if (!senderPart) {
        const cleanHandle = xHandle.trim().replace(/^@/, "");
        if (cleanHandle) senderPart = `&x=${encodeURIComponent(cleanHandle)}`;
      }

      // Recipient lock: swap the raw claim key for an encrypted blob that
      // only the intended X account can unlock via the server.
      let keyPart: string = key.privateKey;
      let lockPart = "";
      if (lockEnabled) {
        const cleanTo = lockHandle.trim().replace(/^@/, "");
        try {
          const res = await fetch("/api/lock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claimPriv: key.privateKey, handle: cleanTo }),
          });
          if (res.ok) {
            const { blob } = await res.json();
            keyPart = "locked";
            lockPart = `&lk=${blob}&to=${encodeURIComponent(cleanTo)}`;
          }
        } catch {
          // fall back to an unlocked link rather than losing the drop
        }
      }

      const url = `${window.location.origin}/claim#${keyPart}${lockPart}${
        message ? `&m=${encodeURIComponent(message)}` : ""
      }${senderPart}`;
      setLink(url);
      setTxHash(hash);
      setPhase("done");

      const entry: SavedDrop = {
        claimKey: key.address,
        link: url,
        symbol: stock.symbol,
        usd,
        createdAt: Date.now(),
      };
      const next = [entry, ...saved];
      setSaved(next);
      localStorage.setItem("stockdrops", JSON.stringify(next));
    } catch (e) {
      setPhase("form");
      setError(e instanceof Error ? e.message.split("\n")[0] : "Something went wrong");
    }
  }

  if (phase === "done" && link) {
    return (
      <EditorialPageShell
        eyebrow="Drop created"
        title="Ready to share."
        accent="Only they can open it."
        subtitle={
          dropMode === "giveaway" && claimableAt
            ? `Giveaway locked until ${new Date(claimableAt * 1000).toLocaleTimeString()}. Share the link anytime.`
            : `Your ${stock.symbol} tokens are now secured in escrow until the link is claimed.`
        }
        media="/media/send-drop-v2.jpg"
        video="/media/send-drop-v2.mp4"
        mediaAlt="Glass capsule representing a secured stock drop"
        mediaLabel="Secured onchain"
        footer={FOOTER}
      >
        <div className="pop-in rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white">
                <Check className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Stock drop created</p>
                <p className="mt-0.5 text-xs text-gray-400">Escrow confirmed</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Live
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">Asset</p>
              <div className="mt-2 flex items-center gap-2">
                <StockLogo symbol={stock.symbol} size={22} />
                <p className="text-lg font-semibold tracking-tight text-gray-900">{stock.symbol}</p>
              </div>
              <p className="text-xs text-gray-400">{stock.name}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">Value</p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-gray-900">~${usd}</p>
              <p className="text-xs text-gray-400">At creation</p>
            </div>
          </div>

          {dropMode === "giveaway" && claimableAt && (
            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
              <p className="text-[10px] font-semibold tracking-wider text-amber-700/70 uppercase">
                Giveaway unlock
              </p>
              <p className="mt-1 text-sm font-semibold text-amber-950">
                Claim opens at {new Date(claimableAt * 1000).toLocaleTimeString()}
              </p>
              <p className="mt-0.5 text-xs text-amber-800/80">
                Random inside your window. Share the link now - they wait onchain.
              </p>
            </div>
          )}

          {lockEnabled && lockHandle.trim() && link.includes("&lk=") && (
            <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/80 p-4">
              <p className="text-[10px] font-semibold tracking-wider text-violet-700/70 uppercase">
                Locked
              </p>
              <p className="mt-1 text-sm font-semibold text-violet-950">
                Only @{lockHandle.trim().replace(/^@/, "")} can claim
              </p>
              <p className="mt-0.5 text-xs text-violet-800/80">
                Safe to share publicly. They verify with a short X post before
                claiming.
              </p>
            </div>
          )}

          {splits > 1 && (
            <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
              <p className="text-[10px] font-semibold tracking-wider text-sky-700/70 uppercase">
                Split
              </p>
              <p className="mt-1 text-sm font-semibold text-sky-950">
                {splits} winners · ~${(usd / splits).toFixed(2)} each
              </p>
              <p className="mt-0.5 text-xs text-sky-800/80">
                One link. Each wallet can claim once.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">Private claim link</p>
            <p className="mt-2 line-clamp-2 break-all text-xs leading-5 text-gray-600">{link}</p>
            <button
              className="gradient-border-btn mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-gray-900"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 1600);
              }}
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              className="text-xs font-medium text-gray-500 transition hover:text-gray-900"
              onClick={() => {
                setPhase("form");
                setLink(null);
              }}
            >
              Create another drop
            </button>
            {txHash && (
              <a
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-gray-900"
                href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
                target="_blank"
              >
                Transaction <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </EditorialPageShell>
    );
  }

  return (
    <EditorialPageShell
      eyebrow="Create a stock drop"
      title="Send ownership."
      accent="Share the moment."
      subtitle="Choose a stock and amount. We swap it onchain, secure it in escrow, and give you one private claim link."
      media="/media/send-drop-v2.jpg"
      video="/media/send-drop-v2.mp4"
      mediaAlt="Glass capsule representing a secured stock drop"
      mediaLabel="A new way to send stocks"
      footer={FOOTER}
    >
      <div className="flex h-full flex-col gap-4">
        <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                1
              </span>
              <h2 className="text-sm font-semibold tracking-tight text-gray-900">
                Choose a stock
              </h2>
            </div>
            {stockUsd !== null && (
              <p className="text-right text-xs text-gray-400">
                ${stockUsd.toFixed(2)} per token
              </p>
            )}
          </div>

          <label className="mb-2.5 block">
            <span className="sr-only">Search stocks</span>
            <input
              type="search"
              value={stockQuery}
              onChange={(e) => {
                setStockQuery(e.target.value);
                setStockLimit(12);
              }}
              placeholder={`Search ${STOCKS.length} stocks`}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
            />
          </label>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {visibleStocks.map((s) => {
              const selected = s.symbol === symbol;
              return (
                <button
                  key={s.symbol}
                  type="button"
                  onClick={() => setSymbol(s.symbol)}
                  className={`group flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-semibold transition ${
                    selected
                      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md ${selected ? "bg-white" : "bg-gray-50"}`}>
                    <StockLogo symbol={s.symbol} size={15} />
                  </span>
                  {s.symbol}
                </button>
              );
            })}
          </div>
          {filteredStocks.length === 0 && (
            <p className="mt-2 text-[11px] text-gray-400">No stocks match that search.</p>
          )}
          {hasMoreStocks && (
            <button
              type="button"
              onClick={() => setStockLimit((n) => n + 18)}
              className="mt-2.5 w-full rounded-full border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
            >
              More stocks ({filteredStocks.length - visibleStocks.length} left)
            </button>
          )}
          <p className="mt-2 text-[11px] text-gray-400">{stock.name}</p>
        </section>

        <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                2
              </span>
              <h2 className="text-sm font-semibold tracking-tight text-gray-900">
                Set an amount
              </h2>
            </div>
            <div className="flex rounded-full border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => switchMode("usd")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  amountMode === "usd"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => switchMode("shares")}
                disabled={!stock.feed}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  amountMode === "shares"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Shares
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between gap-4">
            <label className="flex items-baseline" htmlFor="custom-amount">
              {amountMode === "usd" ? (
                <span className="text-2xl font-medium text-gray-400">$</span>
              ) : null}
              <input
                id="custom-amount"
                aria-label={
                  amountMode === "usd"
                    ? "Custom amount in USD"
                    : `Number of ${stock.symbol} shares`
                }
                inputMode="decimal"
                className="w-36 appearance-none border-0 bg-transparent p-0 text-4xl font-medium tracking-tighter text-gray-900 outline-none placeholder:text-gray-300"
                placeholder="0"
                value={amountMode === "usd" ? usdInput : sharesInput}
                onChange={(event) => {
                  const next = event.target.value;
                  setCustomActive(true);
                  if (amountMode === "usd") {
                    if (/^\d*\.?\d{0,2}$/.test(next)) setUsdInput(next);
                  } else if (/^\d*\.?\d{0,6}$/.test(next)) {
                    setSharesInput(next);
                  }
                }}
              />
              {amountMode === "shares" ? (
                <span className="ml-2 text-lg font-medium text-gray-400">
                  {stock.symbol}
                </span>
              ) : null}
            </label>
            <div className="pb-1 text-right text-xs leading-5 text-gray-400">
              {amountMode === "usd" ? (
                <>
                  {ethAmount !== null && <p>≈ {ethAmount.toFixed(5)} ETH</p>}
                  {quoteState.status === "ready" ? (
                    <p className="text-gray-600">
                      ≈ {formatShares(quoteState.quote.amountOut)} {stock.symbol}
                    </p>
                  ) : approxShares !== null ? (
                    <p>
                      ≈ {approxShares.toFixed(4)} {stock.symbol}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  {usd > 0 && <p>≈ ${usd.toFixed(2)}</p>}
                  {ethAmount !== null && <p>≈ {ethAmount.toFixed(5)} ETH</p>}
                </>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {(amountMode === "usd" ? USD_PRESETS : SHARE_PRESETS).map((v) => {
              const selected =
                !customActive &&
                (amountMode === "usd"
                  ? v === usd
                  : Math.abs(v - shares) < 1e-9);
              return (
                <button
                  key={`${amountMode}-${v}`}
                  type="button"
                  onClick={() => {
                    setCustomActive(false);
                    if (amountMode === "usd") setUsdInput(String(v));
                    else setSharesInput(String(v));
                  }}
                  className={`rounded-full border py-1.5 text-[11px] font-semibold transition ${
                    selected
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {amountMode === "usd" ? `$${v}` : String(v)}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setCustomActive(true);
                document.getElementById("custom-amount")?.focus();
              }}
              className={`rounded-full border py-1.5 text-[11px] font-semibold transition ${
                customActive
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
              }`}
            >
              Custom
            </button>
          </div>

          {usd > 0 && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
              {quoteState.status === "loading" && (
                <p className="text-xs text-gray-400">Fetching live Uniswap quote…</p>
              )}
              {quoteState.status === "idle" && (
                <p className="text-xs text-gray-400">Enter an amount to preview the swap.</p>
              )}
              {quoteState.status === "error" && (
                <p className="text-xs text-red-600">{quoteState.message}</p>
              )}
              {quoteState.status === "ready" && (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                      Live quote · best pool
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatShares(quoteState.quote.amountOut)} {stock.symbol}
                      {quotedUsd !== null && (
                        <span className="ml-1.5 font-normal text-gray-500">
                          ≈ ${quotedUsd.toFixed(2)}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      via {quoteState.quote.routeLabel}
                      {priceImpactPct !== null && Math.abs(priceImpactPct) >= 0.1 && (
                        <>
                          {" · "}
                          impact {priceImpactPct > 0 ? "−" : "+"}
                          {Math.abs(priceImpactPct).toFixed(1)}%
                        </>
                      )}
                    </p>
                    {liquidityBlockMessage && (
                      <p className="mt-2 text-[11px] font-medium text-red-600">
                        {liquidityBlockMessage}
                      </p>
                    )}
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      {fee.bps === 0 ? (
                        <span className="font-semibold text-emerald-700">
                          {fee.label}
                        </span>
                      ) : (
                        <>
                          {fee.label}
                          {ethUsd && (
                            <>
                              {" · "}~$
                              {(
                                (Number(formatEther(fee.feeFromGross(fee.grossFromGift(quoteState.ethIn)))) *
                                  ethUsd)
                              ).toFixed(2)}{" "}
                              on top
                            </>
                          )}
                          {" · "}
                          <span className="text-gray-400">
                            0% at 100k $GIVEST
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">
                    4% slippage floor
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                3
              </span>
              <h2 className="text-sm font-semibold tracking-tight text-gray-900">
                Drop type
              </h2>
            </div>
            <div className="flex rounded-full border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => setDropMode("normal")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  dropMode === "normal"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setDropMode("giveaway")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  dropMode === "giveaway"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Giveaway
              </button>
            </div>
          </div>
          {dropMode === "normal" ? (
            <p className="text-sm leading-relaxed text-gray-500">
              Claim opens instantly. Best for gifts and DMs.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-gray-500">
                Share the link now - claiming unlocks at a random time inside your
                window. Stops instant snipes.
              </p>
              <div className="flex flex-wrap gap-2">
                {GIVEAWAY_WINDOWS.map((w) => (
                  <button
                    key={w.seconds}
                    type="button"
                    onClick={() => setGiveawayWindowSec(w.seconds)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                      giveawayWindowSec === w.seconds
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                Unlock picks a random second within the next{" "}
                {giveawayWindowSec >= 60
                  ? `${giveawayWindowSec / 60} min`
                  : `${giveawayWindowSec}s`}
                . Exact time is set onchain when you create.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              4
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-gray-900">
              Winners
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">
            Split the drop across multiple wallets. One shared link - each address
            claims once.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SPLIT_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSplits(n)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                  splits === n
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                }`}
              >
                {n === 1 ? "1 winner" : `${n}`}
              </button>
            ))}
          </div>
          {splits > 1 && usd > 0 && (
            <p className="mt-3 text-[11px] text-gray-400">
              ~${(usd / splits).toFixed(2)} of {stock.symbol} per winner
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              5
            </span>
            <label className="text-sm font-semibold tracking-tight text-gray-900" htmlFor="drop-message">
              Add a note <span className="font-normal text-gray-400">(optional)</span>
            </label>
          </div>
          <input
            id="drop-message"
            className="input w-full px-4 py-2.5 text-sm"
            placeholder={`A little ${stock.symbol} for your future.`}
            value={message}
            maxLength={140}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="mt-4">
            <p className="text-sm font-semibold tracking-tight text-gray-900">
              Show it&apos;s from you{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </p>
            {xAuth.user ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={xAuth.user.avatar || `https://unavatar.io/x/${xAuth.user.handle}`}
                    alt=""
                    className="h-9 w-9 rounded-full bg-gray-200 object-cover ring-1 ring-gray-200"
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-sm font-semibold text-gray-900">
                      @{xAuth.user.handle}
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    </p>
                    <p className="text-xs text-gray-400">
                      Verified sender on your drops
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-gray-400 transition hover:text-gray-700"
                  onClick={async () => {
                    await fetch("/api/auth/x/me", { method: "DELETE" });
                    setXAuth((s) => ({ ...s, user: null }));
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <>
                {xAuth.enabled && (
                  <a
                    href="/api/auth/x/login"
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Connect X to verify it&apos;s you
                  </a>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {xAuth.enabled
                    ? "Or type a handle below (shown without the verified badge)."
                    : "Add your X handle and the recipient sees your name and picture."}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-400">@</span>
                  <input
                    id="drop-x-handle"
                    className="input w-full px-4 py-2.5 text-sm"
                    placeholder="yourhandle"
                    value={xHandle}
                    maxLength={15}
                    onChange={(e) =>
                      setXHandle(e.target.value.replace(/[^A-Za-z0-9_@]/g, ""))
                    }
                  />
                </div>
                {xHandle.trim() && (
                  <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://unavatar.io/x/${xHandle.trim().replace(/^@/, "")}`}
                      alt=""
                      className="h-8 w-8 rounded-full bg-gray-200 object-cover"
                    />
                    <p className="text-xs text-gray-500">
                      Recipient will see{" "}
                      <span className="font-semibold text-gray-900">
                        @{xHandle.trim().replace(/^@/, "")}
                      </span>{" "}
                      sent this drop
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-4">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-semibold tracking-tight text-gray-900">
                    Lock to one person{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-400">
                    Only a specific X account can claim, verified with a short
                    post from that account.
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={lockEnabled}
                  onClick={() => setLockEnabled((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    lockEnabled ? "bg-gray-900" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      lockEnabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </label>
              {lockEnabled && (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-400">@</span>
                    <input
                      className="input w-full px-4 py-2.5 text-sm"
                      placeholder="whocanclaim"
                      value={lockHandle}
                      maxLength={15}
                      onChange={(e) =>
                        setLockHandle(e.target.value.replace(/[^A-Za-z0-9_@]/g, ""))
                      }
                    />
                  </div>
                  {lockHandle.trim() && (
                    <p className="mt-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-2.5 text-xs text-gray-500">
                      You can share this link publicly. Only{" "}
                      <span className="font-semibold text-gray-900">
                        @{lockHandle.trim().replace(/^@/, "")}
                      </span>{" "}
                      can claim it, after posting a short verification code
                      from their account.
                    </p>
                  )}
                </>
              )}
            </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <button
            className="gradient-border-btn mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={
              phase === "confirming" ||
              usd <= 0 ||
              liquidityBlocked ||
              quoteState.status === "error" ||
              quoteState.status === "loading" ||
              quoteState.status === "idle"
            }
            onClick={submit}
          >
            {phase === "confirming" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {phase === "confirming"
              ? "Confirm in wallet"
              : address
                ? amountMode === "shares"
                  ? `Create ${shares} ${stock.symbol} drop`
                  : `Create ~$${usd} ${stock.symbol} drop`
                : "Connect wallet to continue"}
          </button>

          {onrampAvailable && address && (
            <button
              type="button"
              onClick={openOnramp}
              disabled={onrampOpening}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-gray-200 py-2.5 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900 disabled:opacity-50"
            >
              {onrampOpening ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
              ) : (
                <CreditCard className="h-3.5 w-3.5" />
              )}
              Need ETH? Buy with card or Apple Pay
            </button>
          )}

          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secured by the StockDrops escrow contract
          </div>
        </section>

        {saved.length > 0 && <SavedDrops saved={saved} />}
      </div>
    </EditorialPageShell>
  );
}

function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-400"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-600" /> Copied
        </>
      ) : (
        <>
          <Link2 className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}

function SavedDrops({ saved }: { saved: SavedDrop[] }) {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
      <h2 className="text-xs font-semibold tracking-wide text-gray-900 uppercase">Recent drops</h2>
      <ul className="mt-3 space-y-2">
        {saved.slice(0, 6).map((d) => (
          <li
            key={d.claimKey}
            className="flex items-center justify-between gap-3 border-t border-gray-100 py-3 text-sm first:border-0"
          >
            <span className="text-gray-700">
              ${d.usd} {d.symbol}
              <span className="ml-2 text-xs text-gray-400">
                {new Date(d.createdAt).toLocaleDateString("en-US")}
              </span>
            </span>
            <CopyLinkButton link={d.link} />
          </li>
        ))}
      </ul>
    </div>
  );
}
