import { stockByAddress, type Stock } from "./config";
import { readUsdPrice } from "./prices";
import { holdingOf } from "./solana";

export type DropView = {
  escrow: string;
  claimKey: string;
  sender: string;
  token: string;
  amount: bigint;
  amountPerClaim: bigint;
  uiAmount: number;
  expiresAt: number;
  claimableAt: number;
  maxClaims: number;
  claimsMade: number;
  status: number;
  stock: Stock | null;
  usdEach: number | null;
};

export function dropHeadline(drop: DropView, nowSec = Math.floor(Date.now() / 1000)) {
  const expired = drop.expiresAt > 0 && nowSec >= drop.expiresAt;
  const locked = drop.claimableAt > 0 && nowSec < drop.claimableAt;
  if (drop.status === 2) return "Claimed";
  if (drop.status === 3) return "Refunded";
  if (expired) return "Expired";
  if (locked) return "Sealed";
  if (drop.claimsMade >= drop.maxClaims) return "No shares left";
  return "Open";
}

export async function readDrop(claimKey: string): Promise<DropView | null> {
  const held = await holdingOf(claimKey);
  if (!held) return null;
  const stock = stockByAddress(held.mint);
  let usdEach: number | null = null;
  if (stock) {
    const price = await readUsdPrice(stock.feed);
    if (price !== null) usdEach = held.uiAmount * price;
  }
  const open = held.raw > 0n;
  return {
    escrow: "solana",
    claimKey,
    sender: "",
    token: held.mint,
    amount: held.raw,
    amountPerClaim: held.raw,
    uiAmount: held.uiAmount,
    expiresAt: 0,
    claimableAt: 0,
    maxClaims: 1,
    claimsMade: open ? 0 : 1,
    status: open ? 1 : 2,
    stock,
    usdEach,
  };
}

/** Sender history lives in the browser. The chain does not index it. */
export async function readDropsForSender(_sender: string): Promise<DropView[]> {
  return [];
}
