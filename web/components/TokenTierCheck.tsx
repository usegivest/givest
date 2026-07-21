"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { Check, Wallet } from "lucide-react";
import { publicClient } from "@/lib/chain";
import { GIVEST_TOKEN, PROTOCOL_FEE, erc20Abi } from "@/lib/config";
import { useWallet } from "@/lib/wallet";

const TIERS = [
  {
    name: "Standard",
    holding: "No $GIVEST",
    fee: `${(PROTOCOL_FEE.baseBps / 100).toFixed(2).replace(/\.?0+$/, "")}%`,
    threshold: 0n,
  },
  {
    name: "Holder",
    holding: "10,000+ $GIVEST",
    fee: `${(PROTOCOL_FEE.tier1Bps / 100).toFixed(2).replace(/\.?0+$/, "")}%`,
    threshold: PROTOCOL_FEE.tier1Threshold,
  },
  {
    name: "VIP",
    holding: "100,000+ $GIVEST",
    fee: "0%",
    threshold: PROTOCOL_FEE.tier2Threshold,
  },
] as const;

function tierIndexFor(balance: bigint): number {
  if (balance >= PROTOCOL_FEE.tier2Threshold) return 2;
  if (balance >= PROTOCOL_FEE.tier1Threshold) return 1;
  return 0;
}

export default function TokenTierCheck() {
  const { address, connect } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setError(null);
    setChecking(true);
    try {
      const acct = address ?? (await connect()).address;
      const bal = await publicClient.readContract({
        address: GIVEST_TOKEN,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [acct],
      });
      setBalance(bal);
    } catch (e) {
      setError(
        e instanceof Error ? e.message.split("\n")[0] : "Could not check balance",
      );
    } finally {
      setChecking(false);
    }
  }

  const myTier = balance !== null ? tierIndexFor(balance) : null;
  const myBalance = balance !== null ? Number(formatEther(balance)) : null;
  const nextTier = myTier !== null && myTier < 2 ? TIERS[myTier + 1] : null;
  const toNext =
    nextTier && balance !== null
      ? Number(formatEther(nextTier.threshold - balance))
      : null;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {TIERS.map((tier, i) => {
          const active = myTier === i;
          return (
            <div
              key={tier.name}
              className={`rounded-2xl border p-5 transition ${
                active
                  ? "border-gray-900 bg-gray-900 text-white shadow-md"
                  : "border-gray-200/80 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p
                  className={`text-[11px] font-semibold tracking-[0.15em] uppercase ${
                    active ? "text-gray-300" : "text-gray-400"
                  }`}
                >
                  {tier.name}
                </p>
                {active && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                    <Check className="h-3 w-3" /> You
                  </span>
                )}
              </div>
              <p
                className={`mt-3 text-3xl font-medium tracking-tight ${
                  active ? "text-white" : "text-gray-900"
                }`}
              >
                {tier.fee}
              </p>
              <p
                className={`mt-1 text-xs ${active ? "text-gray-300" : "text-gray-500"}`}
              >
                fee per send · {tier.holding}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200/80 bg-gray-50/80 p-5">
        {balance === null ? (
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-gray-600">
              Connect your wallet to see your tier and how close you are to the
              next one.
            </p>
            <button
              type="button"
              onClick={check}
              disabled={checking}
              className="btn-primary inline-flex shrink-0 items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
            >
              <Wallet className="h-4 w-4" />
              {checking ? "Checking..." : "Check my tier"}
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-700">
            <p>
              You hold{" "}
              <span className="font-semibold text-gray-900">
                {myBalance!.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}{" "}
                $GIVEST
              </span>{" "}
              — <span className="font-semibold">{TIERS[myTier!].name}</span>{" "}
              tier, {TIERS[myTier!].fee} fee on every send.
            </p>
            {nextTier && toNext !== null && (
              <p className="mt-1.5 text-gray-500">
                {toNext.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
                more $GIVEST unlocks {nextTier.name} ({nextTier.fee} fee).
              </p>
            )}
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
