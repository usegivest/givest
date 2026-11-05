import { PROTOCOL_FEE } from "./config";

export type FeeStatus = {
  bps: number;
  label: string;
  grossFromGift: (gift: bigint) => bigint;
  feeFromGross: (gross: bigint) => bigint;
};

function labelForBps(bps: number): string {
  if (bps === 0) return "0% fee";
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}% protocol fee`;
}

export function feeStatusFromBps(bps: number): FeeStatus {
  return {
    bps,
    label: labelForBps(bps),
    grossFromGift: (gift) =>
      bps === 0 ? gift : (gift * (10_000n + BigInt(bps))) / 10_000n,
    feeFromGross: (gross) =>
      bps === 0 ? 0n : gross - (gross * 10_000n) / (10_000n + BigInt(bps)),
  };
}

/** Flat 1% on Solana. Holder discounts need a Solana token. */
export async function readFeeStatus(
  _account?: string | null,
): Promise<FeeStatus> {
  return feeStatusFromBps(PROTOCOL_FEE.baseBps);
}
