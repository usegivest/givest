"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther, isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { ArrowUpRight, Check, Gift, KeyRound, ShieldCheck, Wallet } from "lucide-react";
import EditorialPageShell from "@/components/EditorialPageShell";
import StockLogo from "@/components/StockLogo";
import {
  CONTRACT_ADDRESS,
  stockByAddress,
  stockDropsAbi,
} from "@/lib/config";
import { publicClient, signClaim } from "@/lib/chain";
import { readUsdPrice } from "@/lib/prices";
import { useWallet } from "@/lib/wallet";

type DropInfo = {
  sender: Address;
  token: Address;
  amount: bigint;
  amountPerClaim: bigint;
  expiresAt: number;
  claimableAt: number;
  maxClaims: number;
  claimsMade: number;
  status: number;
};

type NewWallet = { privateKey: Hex; address: Address };
type Platform = "ios" | "android" | "desktop";

const RH_WALLET_IOS =
  "https://apps.apple.com/us/app/robinhood-wallet/id1634080733";
const RH_WALLET_ANDROID =
  "https://play.google.com/store/apps/details?id=com.robinhood.gateway";
const RH_WALLET_UNIVERSAL = "https://robinhood.com/us/en/download/wallet/";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function ClaimLayout({
  children,
  eyebrow = "Receive a stock drop",
  title = "A gift that can grow.",
  accent = "Claimed in one click.",
  subtitle = "Your private link unlocks real stock tokens. Choose where they should go. We cover the network fee.",
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
      media="/media/claim-drop-v2.jpg"
      video="/media/claim-drop-v2.mp4"
      mediaAlt="Ivory envelope containing a glass stock token"
      mediaLabel="Sent privately, owned by you"
      footer="Stock tokens provide economic exposure, not shareholder rights. Claims are settled on Robinhood Chain."
    >
      {children}
    </EditorialPageShell>
  );
}

function StatusCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="pop-in rounded-2xl border border-gray-200/60 bg-white/95 p-7 text-center shadow-lg backdrop-blur-md sm:p-9">
      {icon && (
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white">
          {icon}
        </div>
      )}
      <h2 className="text-2xl font-medium tracking-tighter text-gray-900 sm:text-3xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">{body}</p>
    </div>
  );
}

export default function ClaimPage() {
  const { connect } = useWallet();
  const [claimPriv, setClaimPriv] = useState<Hex | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fromX, setFromX] = useState<string | null>(null);
  const [fromXSig, setFromXSig] = useState<string | null>(null);
  const [fromXVerified, setFromXVerified] = useState(false);
  const [drop, setDrop] = useState<DropInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [newWallet, setNewWallet] = useState<NewWallet | null>(null);
  const [savedKey, setSavedKey] = useState(false);
  const [noWalletOpen, setNoWalletOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [rhAddress, setRhAddress] = useState("");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);
  const [claiming, setClaiming] = useState(false);
  const [claimedTx, setClaimedTx] = useState<string | null>(null);
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const claimKeyAddress = useMemo(
    () => (claimPriv ? privateKeyToAccount(claimPriv).address : null),
    [claimPriv],
  );

  useEffect(() => {
    const id = window.setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setLoading(false);
      return;
    }
    const [key, ...rest] = hash.split("&");
    const params = new URLSearchParams(rest.join("&"));
    if (params.get("m")) setMessage(params.get("m"));
    const x = params.get("x");
    if (x && /^[A-Za-z0-9_]{1,15}$/.test(x)) {
      setFromX(x);
      const xv = params.get("xv");
      if (xv && /^[0-9a-f]{64}$/i.test(xv)) setFromXSig(xv);
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
      setError("Invalid claim link.");
      setLoading(false);
      return;
    }
    setClaimPriv(key as Hex);
  }, []);

  useEffect(() => {
    if (!claimKeyAddress || !fromX || !fromXSig) return;
    fetch(
      `/api/verify-sender?claimKey=${claimKeyAddress}&handle=${encodeURIComponent(fromX)}&sig=${fromXSig}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFromXVerified(Boolean(d?.verified)))
      .catch(() => {});
  }, [claimKeyAddress, fromX, fromXSig]);

  useEffect(() => {
    if (!claimKeyAddress) return;
    (async () => {
      try {
        const [
          sender,
          token,
          amount,
          amountPerClaim,
          expiresAt,
          claimableAt,
          maxClaims,
          claimsMade,
          status,
        ] = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: stockDropsAbi,
            functionName: "drops",
            args: [claimKeyAddress],
          });
        setDrop({
          sender,
          token,
          amount,
          amountPerClaim,
          expiresAt: Number(expiresAt),
          claimableAt: Number(claimableAt),
          maxClaims: Number(maxClaims),
          claimsMade: Number(claimsMade),
          status,
        });
        const stock = stockByAddress(token);
        if (stock?.feed) {
          const price = await readUsdPrice(stock.feed);
          if (price !== null)
            setUsdValue(Number(formatEther(amountPerClaim)) * price);
        }
      } catch {
        setError("Could not read the drop from the chain. Try reloading.");
      } finally {
        setLoading(false);
      }
    })();
  }, [claimKeyAddress]);

  async function claimTo(addr: Address) {
    if (!claimPriv || !claimKeyAddress) return;
    setClaiming(true);
    setError(null);
    try {
      const signature = await signClaim(claimPriv, CONTRACT_ADDRESS, addr);
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimKey: claimKeyAddress,
          recipient: addr,
          signature,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Claim failed");
      setClaimedTx(body.txHash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <ClaimLayout>
        <div className="rounded-2xl border border-gray-200/60 bg-white/95 p-7 shadow-lg backdrop-blur-md">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-5 h-11 w-2/3" />
          <div className="skeleton mt-8 h-32 w-full rounded-2xl" />
        </div>
      </ClaimLayout>
    );
  }

  const stock = drop ? stockByAddress(drop.token) : null;
  const shares = drop ? Number(formatEther(drop.amountPerClaim)) : 0;
  const remainingSlots = drop ? drop.maxClaims - drop.claimsMade : 0;

  if (claimedTx && stock) {
    return (
      <ClaimLayout
        eyebrow="Claim complete"
        title="It is yours."
        accent="Welcome to ownership."
        subtitle="The stock tokens have arrived in your wallet. No network fee was charged to you."
      >
        <StatusCard
          icon={<Check className="h-5 w-5" />}
          title={`${shares.toFixed(4)} ${stock.symbol} is yours`}
          body="The tokens were transferred to your wallet. Welcome to Robinhood Chain."
        />
        {newWallet && (
          <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 p-5 text-left text-sm">
            <p className="font-semibold text-amber-900">
              Save your key now. It will never be shown again:
            </p>
            <code className="mt-2 block break-all text-xs leading-5 text-amber-800">
              {newWallet.privateKey}
            </code>
          </div>
        )}
        <div className="mt-5 text-center">
          <a
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-900"
            href={`https://robinhoodchain.blockscout.com/tx/${claimedTx}`}
            target="_blank"
          >
            View transaction <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </ClaimLayout>
    );
  }

  if (!claimPriv) {
    return (
      <ClaimLayout
        eyebrow="Open your private link"
        title="Your stock drop"
        accent="starts with the link."
        subtitle="Claim links carry the private key that unlocks a drop. Open the exact link the sender shared with you."
      >
        <div className="rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200">
            <KeyRound className="h-5 w-5 text-gray-700" />
          </div>
          <h2 className="mt-6 text-lg font-semibold tracking-tight text-gray-900">Waiting for a private link</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
            Ask the sender to copy the complete Givest link. For your security,
            never post a claim link publicly.
          </p>
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-3 font-mono text-xs text-gray-400">
            usegivest.app/claim#0x••••••••••••
          </div>
        </div>
      </ClaimLayout>
    );
  }

  if (error && !drop) {
    return (
      <ClaimLayout>
        <StatusCard title="Something went wrong" body={error} />
      </ClaimLayout>
    );
  }

  if (!drop || drop.status === 0) {
    return (
      <ClaimLayout>
        <StatusCard
          title="Drop not found"
          body="This link does not point to an active drop on the contract."
        />
      </ClaimLayout>
    );
  }

  if (drop.status === 2) {
    return (
      <ClaimLayout>
        <StatusCard
          title="Fully claimed"
          body={
            drop.maxClaims > 1
              ? `All ${drop.maxClaims} shares of this drop have been claimed.`
              : "This drop has already been claimed."
          }
        />
      </ClaimLayout>
    );
  }

  if (drop.status === 3) {
    return (
      <ClaimLayout>
        <StatusCard title="Refunded" body="The sender has withdrawn this drop." />
      </ClaimLayout>
    );
  }

  const expired = nowSec >= drop.expiresAt;
  const locked = nowSec < drop.claimableAt;
  const unlockIn = Math.max(0, drop.claimableAt - nowSec);

  function formatCountdown(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m <= 0) return `${s}s`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <ClaimLayout
      eyebrow="Your drop has arrived"
      title="A piece of the future."
      accent="Now make it yours."
      subtitle={
        locked
          ? "This is a giveaway drop. Claiming unlocks at a random time - hang tight."
          : "Review the gift below, then choose your wallet. The claim is private, onchain, and free for you."
      }
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white/95 shadow-lg backdrop-blur-md">
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white ring-1 ring-gray-200">
                {stock ? (
                  <StockLogo symbol={stock.symbol} size={27} />
                ) : (
                  <Gift className="h-5 w-5 text-gray-700" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{stock?.name ?? "Stock token"}</p>
                <p className="mt-0.5 text-xs text-gray-400">Robinhood Chain</p>
              </div>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                locked
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {locked ? "Locked" : "Ready to claim"}
            </span>
          </div>

          {fromX && (
            <a
              href={`https://x.com/${fromX}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 transition hover:border-gray-200 hover:bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://unavatar.io/x/${fromX}`}
                alt={`@${fromX}`}
                className="h-10 w-10 rounded-full bg-gray-200 object-cover ring-1 ring-gray-200"
              />
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  @{fromX}
                  {fromXVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">sent you this drop</p>
              </div>
            </a>
          )}

          <div className="mt-7">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
              {drop.maxClaims > 1
                ? "Your share"
                : fromX
                  ? `From @${fromX}`
                  : "Someone sent you"}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[2.75rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-5xl">
                {shares.toFixed(4)}
              </span>
              <span className="text-xl font-medium text-zinc-400">{stock?.symbol ?? "stocks"}</span>
            </div>
          </div>

          {drop.maxClaims > 1 && (
            <p className="mt-2 text-sm text-gray-400">
              {drop.claimsMade}/{drop.maxClaims} claimed · {remainingSlots} left
            </p>
          )}

          {usdValue !== null && (
            <p className="mt-2 text-sm text-gray-400">
              Worth approximately ${usdValue.toFixed(2)} today
            </p>
          )}

          {message && (
            <div className="mt-6 border-l-2 border-gray-300 pl-4">
              <p className="text-sm leading-6 text-gray-600">&ldquo;{message}&rdquo;</p>
              <p className="mt-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {fromX ? `From @${fromX}` : "From the sender"}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-white/70 p-5 sm:p-7">
          {expired ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">
              This drop has expired and can no longer be claimed.
            </p>
          ) : locked ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/90 px-5 py-6 text-center">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-amber-700/70 uppercase">
                Giveaway unlocks in
              </p>
              <p className="mt-2 text-4xl font-medium tracking-tighter text-amber-950">
                {formatCountdown(unlockIn)}
              </p>
              <p className="mt-2 text-sm text-amber-800/80">
                Opens around{" "}
                {new Date(drop.claimableAt * 1000).toLocaleTimeString()}. Stay on
                this page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                className="gradient-border-btn flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-gray-900 disabled:opacity-45"
                disabled={claiming}
                onClick={async () => {
                  const { address } = await connect();
                  setRecipient(address);
                  await claimTo(address);
                }}
              >
                {claiming ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                {claiming ? "Claiming stock tokens" : "Claim to my wallet"}
              </button>
              <button
                className="w-full rounded-full border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900 disabled:opacity-45"
                disabled={claiming}
                onClick={() => setNoWalletOpen((v) => !v)}
              >
                I do not have a wallet
              </button>

              {noWalletOpen && !newWallet && !claimedTx && (
                <div className="pop-in mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/robinhood-wallet.png"
                        alt="Robinhood Wallet"
                        className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-gray-200"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Get Robinhood Wallet
                        </p>
                        <p className="text-xs text-gray-400">
                          Free self-custody wallet · takes about a minute
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 px-5 py-5">
                    <ol className="space-y-3">
                      {[
                        platform === "desktop"
                          ? "Scan the QR code with your phone and download Robinhood Wallet."
                          : "Download the Robinhood Wallet app.",
                        "Open the app and create your wallet (no Robinhood account needed).",
                        "Tap Receive, copy your address, and paste it below.",
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[10px] font-semibold text-white">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>

                    {platform === "desktop" ? (
                      <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(RH_WALLET_UNIVERSAL)}`}
                          alt="QR code to download Robinhood Wallet"
                          className="h-24 w-24 rounded-xl bg-white ring-1 ring-gray-200"
                        />
                        <div className="text-xs leading-5 text-gray-500">
                          <p className="font-semibold text-gray-700">Scan with your phone</p>
                          <p className="mt-1">
                            Or open{" "}
                            <a
                              href={RH_WALLET_UNIVERSAL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-gray-900 underline underline-offset-2"
                            >
                              robinhood.com/download/wallet
                            </a>{" "}
                            on your phone.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <a
                        href={platform === "ios" ? RH_WALLET_IOS : RH_WALLET_ANDROID}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                      >
                        {platform === "ios" ? "Download on the App Store" : "Get it on Google Play"}
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}

                    <div className="flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-full border border-gray-200 px-4 py-3 font-mono text-xs text-gray-700 outline-none focus:border-gray-500"
                        placeholder="Paste your wallet address (0x…)"
                        value={rhAddress}
                        onChange={(e) => setRhAddress(e.target.value.trim())}
                      />
                      <button
                        className="shrink-0 rounded-full bg-gray-900 px-5 py-3 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:opacity-40"
                        disabled={!isAddress(rhAddress) || claiming}
                        onClick={() => claimTo(rhAddress as Address)}
                      >
                        {claiming ? "Claiming…" : "Claim"}
                      </button>
                    </div>

                    <button
                      className="w-full text-center text-xs text-gray-400 underline-offset-2 transition hover:text-gray-700 hover:underline"
                      onClick={() => {
                        const privateKey = generatePrivateKey();
                        const address = privateKeyToAccount(privateKey).address;
                        setNewWallet({ privateKey, address });
                        setRecipient(address);
                      }}
                    >
                      No phone handy? Create an instant browser wallet instead
                    </button>
                  </div>
                </div>
              )}

              {newWallet && !claimedTx && (
                <div className="pop-in mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-amber-950">
                    <KeyRound className="h-4 w-4" />
                    Your new wallet
                  </div>
                  <p className="mt-3 break-all font-mono text-[11px] leading-5 text-amber-700">
                    {newWallet.address}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-amber-950">
                    Save this private key somewhere secure:
                  </p>
                  <code className="mt-2 block break-all rounded-xl bg-white/70 p-3 text-[11px] leading-5 text-amber-900">
                    {newWallet.privateKey}
                  </code>
                  <label className="mt-4 flex items-center gap-2 text-xs text-amber-900">
                    <input
                      type="checkbox"
                      checked={savedKey}
                      onChange={(e) => setSavedKey(e.target.checked)}
                    />
                    I saved the key
                  </label>
                  <button
                    className="mt-4 w-full rounded-full bg-amber-950 py-3 text-sm font-semibold text-white disabled:opacity-40"
                    disabled={!savedKey || claiming}
                    onClick={() => claimTo(newWallet.address)}
                  >
                    {claiming ? "Claiming…" : "Claim to my new wallet"}
                  </button>
                </div>
              )}

              <details className="pt-2 text-xs text-gray-400">
                <summary className="cursor-pointer text-center transition hover:text-gray-700">
                  Send to a different address
                </summary>
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-full border border-gray-200 px-4 py-2.5 font-mono text-xs text-gray-700 outline-none focus:border-gray-500"
                    placeholder="0x…"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                  <button
                    className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 disabled:opacity-40"
                    disabled={!isAddress(recipient) || claiming}
                    onClick={() => claimTo(recipient as Address)}
                  >
                    Claim
                  </button>
                </div>
              </details>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Claiming is free. Givest pays the gas.
          </div>
        </div>
      </div>
    </ClaimLayout>
  );
}
