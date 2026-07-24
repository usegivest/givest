"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createWalletClient,
  formatEther,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ArrowUpRight,
  Check,
  Copy,
  Gift,
  Link2,
  Lock,
  PartyPopper,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import EditorialPageShell from "@/components/EditorialPageShell";
import StockLogo from "@/components/StockLogo";
import {
  CONTRACT_ADDRESS,
  EXPIRY_DAYS,
  STOCKS,
  USDG,
  robinhoodChain,
  stockDropsAbi,
} from "@/lib/config";
import { newClaimKey, publicClient } from "@/lib/chain";
import { quoteBestStockSwap } from "@/lib/quotes";
import { readEthUsd, readUsdPrice } from "@/lib/prices";
import { readFeeStatus } from "@/lib/fees";
import { useWallet } from "@/lib/wallet";

const CHIP_PRESETS = [5, 10, 25, 50];
const GOAL_PRESETS = [50, 100, 250, 500];
const SLIPPAGE = 0.96;

type PoolMeta = {
  address: Address;
  adminKey: Hex | null;
  symbol: string;
  goalUsd: number;
  title: string | null;
  organizer: string | null;
};

type Contribution = {
  from: string;
  eth: number;
  txHash: string;
};

type SavedPool = {
  address: string;
  adminLink: string;
  symbol: string;
  goalUsd: number;
  title: string | null;
  createdAt: number;
};

const FOOTER = (
  <>
    A pool is a fresh onchain wallet. Contributions go straight to it - no
    middleman. The organizer link holds its key, so treat that link like cash.
  </>
);

function parsePoolHash(hash: string): PoolMeta | null {
  const params = new URLSearchParams(hash);
  const k = params.get("k");
  const a = params.get("a");
  const symbol = params.get("s") ?? "";
  if (!STOCKS.some((s) => s.symbol === symbol)) return null;
  const goalUsd = Number(params.get("g")) || 0;
  const title = params.get("t");
  const organizer = params.get("o");

  if (k && /^0x[0-9a-fA-F]{64}$/.test(k)) {
    return {
      address: privateKeyToAccount(k as Hex).address,
      adminKey: k as Hex,
      symbol,
      goalUsd,
      title,
      organizer,
    };
  }
  if (a && /^0x[a-fA-F0-9]{40}$/.test(a)) {
    return {
      address: a as Address,
      adminKey: null,
      symbol,
      goalUsd,
      title,
      organizer,
    };
  }
  return null;
}

function buildLink(meta: PoolMeta, withKey: boolean): string {
  const params = new URLSearchParams();
  if (withKey && meta.adminKey) params.set("k", meta.adminKey);
  else params.set("a", meta.address);
  params.set("s", meta.symbol);
  params.set("g", String(meta.goalUsd));
  if (meta.title) params.set("t", meta.title);
  if (meta.organizer) params.set("o", meta.organizer);
  return `${window.location.origin}/pool#${params.toString()}`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="gradient-border-btn flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-gray-900"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-600" /> Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" /> {label}
        </>
      )}
    </button>
  );
}

export default function PoolPage() {
  const [meta, setMeta] = useState<PoolMeta | null>(null);
  const [hashChecked, setHashChecked] = useState(false);

  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1);
      setMeta(hash ? parsePoolHash(hash) : null);
      setHashChecked(true);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (!hashChecked) {
    return (
      <PoolLayout>
        <div className="rounded-2xl border border-gray-200/60 bg-white/95 p-7 shadow-lg backdrop-blur-md">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-5 h-11 w-2/3" />
          <div className="skeleton mt-8 h-32 w-full rounded-2xl" />
        </div>
      </PoolLayout>
    );
  }

  return meta ? <PoolView meta={meta} /> : <PoolCreate />;
}

function PoolLayout({
  children,
  eyebrow = "Pool a gift",
  title = "Chip in together.",
  accent = "One gift. Many givers.",
  subtitle = "Start a pool, share one link, and let friends chip in ETH. When you are ready, the whole pot becomes one stock gift.",
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  accent?: string;
  subtitle?: string;
}) {
  return (
    <EditorialPageShell
      eyebrow={eyebrow}
      title={title}
      accent={accent}
      subtitle={subtitle}
      media="/media/send-drop-v2.jpg"
      video="/media/send-drop-v2.mp4"
      mediaAlt="Glass capsule representing a pooled stock gift"
      mediaLabel="Group gifting, onchain"
      footer={FOOTER}
    >
      {children}
    </EditorialPageShell>
  );
}

/* ------------------------------ Create mode ------------------------------ */

function PoolCreate() {
  const [symbol, setSymbol] = useState("NVDA");
  const [query, setQuery] = useState("");
  const [goalInput, setGoalInput] = useState("100");
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [created, setCreated] = useState<PoolMeta | null>(null);
  const [savedPools, setSavedPools] = useState<SavedPool[]>([]);

  useEffect(() => {
    try {
      setSavedPools(JSON.parse(localStorage.getItem("givest_pools") ?? "[]"));
    } catch {
      setSavedPools([]);
    }
  }, []);

  const stock = STOCKS.find((s) => s.symbol === symbol) ?? STOCKS[0];
  const goalUsd = Number(goalInput) || 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STOCKS.slice(0, 12);
    return STOCKS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [query]);

  function create() {
    const key = newClaimKey();
    const meta: PoolMeta = {
      address: key.address,
      adminKey: key.privateKey,
      symbol: stock.symbol,
      goalUsd,
      title: title.trim() || null,
      organizer: organizer.trim().replace(/^@/, "") || null,
    };
    const adminLink = buildLink(meta, true);
    const entry: SavedPool = {
      address: meta.address,
      adminLink,
      symbol: meta.symbol,
      goalUsd: meta.goalUsd,
      title: meta.title,
      createdAt: Date.now(),
    };
    const next = [entry, ...savedPools].slice(0, 20);
    setSavedPools(next);
    localStorage.setItem("givest_pools", JSON.stringify(next));
    setCreated(meta);
  }

  if (created) {
    const shareLink = buildLink(created, false);
    const adminLink = buildLink(created, true);
    return (
      <PoolLayout
        eyebrow="Pool created"
        title="Now rally the group."
        accent="Two links, two jobs."
        subtitle="Share the public link with everyone who wants to chip in. Keep the organizer link private - it controls the pot."
      >
        <div className="pop-in rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {created.title ?? `${created.symbol} gift pool`}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Goal ${created.goalUsd} · {created.symbol}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Public link · share with contributors
            </p>
            <p className="mt-2 line-clamp-2 break-all text-xs leading-5 text-gray-600">
              {shareLink}
            </p>
            <div className="mt-3">
              <CopyButton text={shareLink} label="Copy public link" />
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-amber-700/80 uppercase">
              <Lock className="h-3 w-3" /> Organizer link · keep private
            </p>
            <p className="mt-2 line-clamp-2 break-all text-xs leading-5 text-amber-800">
              {adminLink}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-amber-800/90">
              This link holds the pool&apos;s key. Anyone with it can move the
              pot. Save it - you need it to turn the pool into the gift.
            </p>
            <div className="mt-3">
              <CopyButton text={adminLink} label="Copy organizer link" />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              className="text-xs font-medium text-gray-500 transition hover:text-gray-900"
              onClick={() => setCreated(null)}
            >
              Create another pool
            </button>
            <a
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-gray-900"
              href={adminLink}
            >
              Open my pool <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </PoolLayout>
    );
  }

  return (
    <PoolLayout>
      <div className="flex h-full flex-col gap-4">
        <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              1
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-gray-900">
              What are you gifting?
            </h2>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${STOCKS.length} stocks`}
            className="mb-2.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
          />
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {filtered.map((s) => {
              const selected = symbol === s.symbol;
              return (
                <button
                  key={s.symbol}
                  type="button"
                  onClick={() => setSymbol(s.symbol)}
                  className={`group flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-[10px] font-semibold transition ${
                    selected
                      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md ${selected ? "bg-white" : "bg-gray-50"}`}
                  >
                    <StockLogo symbol={s.symbol} size={15} src={s.icon} />
                  </span>
                  <span className="max-w-full truncate">{s.symbol}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">{stock.name}</p>
        </section>

        <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              2
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-gray-900">
              Set a goal
            </h2>
          </div>
          <label className="flex items-baseline" htmlFor="pool-goal">
            <span className="text-2xl font-medium text-gray-400">$</span>
            <input
              id="pool-goal"
              inputMode="decimal"
              className="w-36 appearance-none border-0 bg-transparent p-0 text-4xl font-medium tracking-tighter text-gray-900 outline-none placeholder:text-gray-300"
              placeholder="0"
              value={goalInput}
              onChange={(e) => {
                if (/^\d*\.?\d{0,2}$/.test(e.target.value))
                  setGoalInput(e.target.value);
              }}
            />
          </label>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {GOAL_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setGoalInput(String(v))}
                className={`rounded-full border py-1.5 text-[11px] font-semibold transition ${
                  goalUsd === v
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            The goal is a target, not a cap. You can finalize the pool at any
            amount.
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              3
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-gray-900">
              Make it personal <span className="font-normal text-gray-400">(optional)</span>
            </h2>
          </div>
          <input
            className="input w-full px-4 py-2.5 text-sm"
            placeholder={`Sarah's graduation ${stock.symbol} fund`}
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-400">@</span>
            <input
              className="input w-full px-4 py-2.5 text-sm"
              placeholder="your X handle"
              value={organizer}
              maxLength={15}
              onChange={(e) =>
                setOrganizer(e.target.value.replace(/[^A-Za-z0-9_@]/g, ""))
              }
            />
          </div>

          <button
            className="gradient-border-btn mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={goalUsd <= 0}
            onClick={create}
          >
            <Users className="h-4 w-4" />
            Create the pool
          </button>
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Free to create. Contributions go straight onchain.
          </div>
        </section>

        {savedPools.length > 0 && (
          <div className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
            <h2 className="text-xs font-semibold tracking-wide text-gray-900 uppercase">
              Your pools
            </h2>
            <ul className="mt-3 space-y-2">
              {savedPools.slice(0, 5).map((p) => (
                <li
                  key={p.address}
                  className="flex items-center justify-between gap-3 border-t border-gray-100 py-3 text-sm first:border-0"
                >
                  <span className="min-w-0 truncate text-gray-700">
                    {p.title ?? `${p.symbol} pool`}
                    <span className="ml-2 text-xs text-gray-400">
                      ${p.goalUsd} goal
                    </span>
                  </span>
                  <a
                    href={p.adminLink}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-400"
                  >
                    <Link2 className="h-3 w-3" /> Open
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PoolLayout>
  );
}

/* ------------------------------- View mode ------------------------------- */

function PoolView({ meta }: { meta: PoolMeta }) {
  const { address, client, connect } = useWallet();
  const stock = STOCKS.find((s) => s.symbol === meta.symbol) ?? STOCKS[0];
  const [balance, setBalance] = useState<bigint | null>(null);
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [stockUsd, setStockUsd] = useState<number | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [chipUsd, setChipUsd] = useState("10");
  const [chipping, setChipping] = useState(false);
  const [chipTx, setChipTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeStep, setFinalizeStep] = useState<string | null>(null);
  const [claimLink, setClaimLink] = useState<string | null>(null);

  const isOrganizer = meta.adminKey !== null;

  const refresh = useCallback(async () => {
    try {
      const bal = await publicClient.getBalance({ address: meta.address });
      setBalance(bal);
    } catch {
      /* keep the last value */
    }
    try {
      const res = await fetch(
        `https://robinhoodchain.blockscout.com/api/v2/addresses/${meta.address}/transactions?filter=to`,
      );
      if (res.ok) {
        const data = await res.json();
        const items = (data.items ?? []) as Array<{
          from?: { hash?: string };
          value?: string;
          hash?: string;
        }>;
        setContributions(
          items
            .filter((t) => t.from?.hash && Number(t.value) > 0)
            .slice(0, 8)
            .map((t) => ({
              from: t.from!.hash!,
              eth: Number(formatEther(BigInt(t.value!))),
              txHash: t.hash ?? "",
            })),
        );
      }
    } catch {
      /* contributor list is best-effort */
    }
  }, [meta.address]);

  useEffect(() => {
    readEthUsd().then(setEthUsd);
    if (stock.feed) readUsdPrice(stock.feed).then(setStockUsd);
  }, [stock]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 6000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const balanceEth = balance !== null ? Number(formatEther(balance)) : null;
  const balanceUsd =
    balanceEth !== null && ethUsd !== null ? balanceEth * ethUsd : null;
  const progress =
    balanceUsd !== null && meta.goalUsd > 0
      ? Math.min(100, (balanceUsd / meta.goalUsd) * 100)
      : 0;
  const chipAmount = Number(chipUsd) || 0;

  async function chipIn() {
    setError(null);
    setChipTx(null);
    try {
      if (!ethUsd) throw new Error("Could not fetch the ETH price. Try again.");
      if (chipAmount <= 0) throw new Error("Enter an amount greater than $0.");
      const wallet = client && address ? { client, address } : await connect();
      const walletClient = "client" in wallet ? wallet.client : client!;
      const from = "address" in wallet ? wallet.address : address!;
      setChipping(true);
      const value = parseEther((chipAmount / ethUsd).toFixed(18));
      const hash = (await walletClient.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: meta.address,
            value: `0x${value.toString(16)}`,
          },
        ],
      })) as `0x${string}`;
      await publicClient.waitForTransactionReceipt({ hash });
      setChipTx(hash);
      refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message.split("\n")[0] : "Something went wrong",
      );
    } finally {
      setChipping(false);
    }
  }

  async function finalize() {
    if (!meta.adminKey) return;
    setError(null);
    setFinalizing(true);
    try {
      const account = privateKeyToAccount(meta.adminKey);
      const poolWallet = createWalletClient({
        account,
        chain: robinhoodChain,
        transport: http(),
      });

      setFinalizeStep("Checking the pot");
      const bal = await publicClient.getBalance({ address: account.address });
      const gasPrice = await publicClient.getGasPrice();
      const gasReserve = gasPrice * 2_500_000n;
      const gross = bal - gasReserve;
      if (gross <= 0n) {
        throw new Error("The pool is empty - nothing to turn into a gift yet.");
      }

      setFinalizeStep("Finding the best pool");
      const fee = await readFeeStatus(account.address);
      const gift = (gross * 10_000n) / (10_000n + BigInt(fee.bps));
      const usdNow =
        ethUsd !== null ? Number(formatEther(gift)) * ethUsd : 0;
      const quote = await quoteBestStockSwap(
        gift,
        stock.address,
        stockUsd,
        usdNow,
      );
      const minOut =
        (quote.amountOut * BigInt(Math.round(SLIPPAGE * 1000))) / 1000n;
      if (minOut <= 0n) throw new Error("The pot is too small to swap.");

      setFinalizeStep("Creating the gift onchain");
      const key = newClaimKey();
      const nowSec = Math.floor(Date.now() / 1000);
      const expiresAt = nowSec + EXPIRY_DAYS * 86400;
      const route = quote.route;
      let hash: `0x${string}`;
      if (route.kind === "v3") {
        hash = await poolWallet.writeContract({
          address: CONTRACT_ADDRESS,
          abi: stockDropsAbi,
          functionName: "createDropWithEth",
          args: [key.address, stock.address, route.path, minOut, expiresAt, nowSec, 1],
          value: gross,
        });
      } else if (route.kind === "v4") {
        hash = await poolWallet.writeContract({
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
            nowSec,
            1,
          ],
          value: gross,
        });
      } else {
        hash = await poolWallet.writeContract({
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
            nowSec,
            1,
          ],
          value: gross,
        });
      }
      setFinalizeStep("Waiting for confirmation");
      await publicClient.waitForTransactionReceipt({ hash });

      const parts = [
        meta.title ? `&m=${encodeURIComponent(meta.title)}` : "",
        meta.organizer ? `&x=${encodeURIComponent(meta.organizer)}` : "",
      ].join("");
      setClaimLink(`${window.location.origin}/claim#${key.privateKey}${parts}`);
      refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message.split("\n")[0] : "Something went wrong",
      );
    } finally {
      setFinalizing(false);
      setFinalizeStep(null);
    }
  }

  if (claimLink) {
    return (
      <PoolLayout
        eyebrow="Pool finalized"
        title="The pot became a gift."
        accent="Now hand it over."
        subtitle="The whole pool was swapped into one stock drop. Share this private claim link with the person it is for."
      >
        <div className="pop-in rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {meta.title ?? `${meta.symbol} gift`} is ready
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Escrow confirmed · {meta.symbol}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Private claim link
            </p>
            <p className="mt-2 line-clamp-2 break-all text-xs leading-5 text-gray-600">
              {claimLink}
            </p>
            <div className="mt-3">
              <CopyButton text={claimLink} label="Copy claim link" />
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            Only share it with the recipient. Whoever opens it can claim.
          </p>
        </div>
      </PoolLayout>
    );
  }

  return (
    <PoolLayout
      eyebrow={isOrganizer ? "Your pool" : "You are invited"}
      title={meta.title ?? `A ${meta.symbol} gift pool.`}
      accent={isOrganizer ? "Watch the pot grow." : "Chip in what you like."}
      subtitle={
        isOrganizer
          ? "Share the public link to collect contributions. When you are happy with the pot, finalize it into one stock gift."
          : `Everyone chips in ETH, and the whole pot becomes ${meta.symbol} stock for one lucky person. Every contribution lands onchain instantly.`
      }
    >
      <div className="flex h-full flex-col gap-4">
        <section className="pop-in rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white ring-1 ring-gray-200">
                <StockLogo symbol={stock.symbol} size={27} src={stock.icon} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {meta.title ?? `${stock.symbol} gift pool`}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {meta.organizer
                    ? `Organized by @${meta.organizer}`
                    : "Group gift pool"}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600">
              {stock.symbol}
            </span>
          </div>

          <div className="mt-7">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-[2.75rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-5xl">
                  {balanceUsd !== null ? `$${balanceUsd.toFixed(2)}` : "…"}
                </span>
                <span className="text-lg font-medium text-zinc-400">
                  of ${meta.goalUsd}
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-900 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            {balanceEth !== null && (
              <p className="mt-2 text-xs text-gray-400">
                {balanceEth.toFixed(5)} ETH in the pot
                {contributions.length > 0 &&
                  ` · ${contributions.length} contribution${contributions.length === 1 ? "" : "s"}`}
              </p>
            )}
          </div>

          {contributions.length > 0 && (
            <ul className="mt-5 space-y-1.5">
              {contributions.slice(0, 5).map((c) => (
                <li
                  key={c.txHash}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-2 text-xs"
                >
                  <span className="font-mono text-gray-500">
                    {c.from.slice(0, 6)}…{c.from.slice(-4)}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {ethUsd !== null
                      ? `$${(c.eth * ethUsd).toFixed(2)}`
                      : `${c.eth.toFixed(5)} ETH`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
          <h2 className="text-sm font-semibold tracking-tight text-gray-900">
            Chip in
          </h2>
          <div className="mt-3 flex items-end justify-between gap-4">
            <label className="flex items-baseline" htmlFor="chip-amount">
              <span className="text-2xl font-medium text-gray-400">$</span>
              <input
                id="chip-amount"
                inputMode="decimal"
                className="w-32 appearance-none border-0 bg-transparent p-0 text-4xl font-medium tracking-tighter text-gray-900 outline-none placeholder:text-gray-300"
                placeholder="0"
                value={chipUsd}
                onChange={(e) => {
                  if (/^\d*\.?\d{0,2}$/.test(e.target.value))
                    setChipUsd(e.target.value);
                }}
              />
            </label>
            {ethUsd !== null && chipAmount > 0 && (
              <p className="pb-1 text-xs text-gray-400">
                ≈ {(chipAmount / ethUsd).toFixed(5)} ETH
              </p>
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {CHIP_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setChipUsd(String(v))}
                className={`rounded-full border py-1.5 text-[11px] font-semibold transition ${
                  chipAmount === v
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-400"
                }`}
              >
                ${v}
              </button>
            ))}
          </div>

          <button
            className="gradient-border-btn mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={chipping || chipAmount <= 0}
            onClick={chipIn}
          >
            {chipping ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {chipping
              ? "Confirm in wallet"
              : address
                ? `Chip in $${chipAmount || 0}`
                : "Connect wallet to chip in"}
          </button>

          {chipTx && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
              <p className="text-xs font-semibold text-emerald-800">
                You are in! Contribution confirmed.
              </p>
              <a
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                href={`https://robinhoodchain.blockscout.com/tx/${chipTx}`}
                target="_blank"
              >
                Tx <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          )}
        </section>

        {isOrganizer && (
          <section className="rounded-2xl border border-gray-200/60 bg-white/95 p-5 shadow-lg backdrop-blur-md">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-900">
              <Lock className="h-4 w-4" /> Organizer controls
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Share the public link below to collect. When the pot looks right,
              finalize: the whole balance is swapped into {meta.symbol} and
              sealed behind one private claim link.
            </p>
            <div className="mt-3">
              <CopyButton
                text={buildLink(meta, false)}
                label="Copy public link to share"
              />
            </div>
            <button
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-gray-900 bg-gray-900 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={finalizing || balance === null || balance === 0n}
              onClick={finalize}
            >
              {finalizing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              {finalizing
                ? (finalizeStep ?? "Finalizing")
                : `Finalize into a ${meta.symbol} gift`}
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              Gas is paid from the pot. No wallet pop-up needed.
            </p>
          </section>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Contributions land directly in the pool wallet, visible onchain.
        </div>
      </div>
    </PoolLayout>
  );
}
