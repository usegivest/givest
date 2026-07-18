import { type Address } from "viem";
import { publicClient } from "@/lib/chain";
import {
  CONTRACT_ADDRESS,
  GIVEST_TOKEN,
  PROTOCOL_FEE,
  stockDropsAbi,
} from "@/lib/config";

export type FeeStatus = {
  bps: number;
  label: string;
  /** Gross ETH to send so the drop receives `giftEth` after fee. */
  grossFromGift: (giftEth: bigint) => bigint;
  feeFromGross: (gross: bigint) => bigint;
};

const erc20BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

function labelForBps(bps: number): string {
  if (bps === 0) return "0% fee · VIP holder";
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}% protocol fee`;
}

export function feeStatusFromBps(bps: number): FeeStatus {
  return {
    bps,
    label: labelForBps(bps),
    grossFromGift: (giftEth) =>
      bps === 0
        ? giftEth
        : (giftEth * (10_000n + BigInt(bps))) / 10_000n,
    feeFromGross: (gross) =>
      bps === 0 ? 0n : gross - (gross * 10_000n) / (10_000n + BigInt(bps)),
  };
}

/** Read live fee bps for a wallet (falls back to base 1% if contract/token unset). */
export async function readFeeStatus(
  account: Address | null | undefined,
): Promise<FeeStatus> {
  try {
    if (account) {
      const bps = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: stockDropsAbi,
        functionName: "feeBpsFor",
        args: [account],
      });
      return feeStatusFromBps(Number(bps));
    }

    const base = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: stockDropsAbi,
      functionName: "baseFeeBps",
    });
    return feeStatusFromBps(Number(base));
  } catch {
    // Token not set / old contract: apply published defaults client-side.
    if (account && GIVEST_TOKEN !== "0x0000000000000000000000000000000000000000") {
      try {
        const bal = await publicClient.readContract({
          address: GIVEST_TOKEN,
          abi: erc20BalanceAbi,
          functionName: "balanceOf",
          args: [account],
        });
        if (bal >= PROTOCOL_FEE.tier2Threshold) {
          return feeStatusFromBps(PROTOCOL_FEE.tier2Bps);
        }
        if (bal >= PROTOCOL_FEE.tier1Threshold) {
          return feeStatusFromBps(PROTOCOL_FEE.tier1Bps);
        }
      } catch {
        /* ignore */
      }
    }
    return feeStatusFromBps(PROTOCOL_FEE.baseBps);
  }
}
