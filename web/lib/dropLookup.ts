import { formatEther, parseAbiItem, type Address } from "viem";
import {
  ESCROW_ADDRESSES,
  stockByAddress,
  stockDropsAbi,
  type Stock,
} from "@/lib/config";
import { publicClient } from "@/lib/chain";
import { fetchTokenInfo, tokenInfoToStock } from "@/lib/tokenInfo";
import { readUsdPrice } from "@/lib/prices";

const dropCreatedEvent = parseAbiItem(
  "event DropCreated(address indexed claimKey, address indexed sender, address indexed token, uint256 amount, uint128 amountPerClaim, uint16 maxClaims, uint40 expiresAt, uint40 claimableAt)",
);

export type DropView = {
  escrow: Address;
  claimKey: Address;
  sender: Address;
  token: Address;
  amount: bigint;
  amountPerClaim: bigint;
  expiresAt: number;
  claimableAt: number;
  maxClaims: number;
  claimsMade: number;
  status: number;
  stock: Stock | null;
  usdEach: number | null;
};

export function dropHeadline(drop: DropView, nowSec = Math.floor(Date.now() / 1000)) {
  const expired = nowSec >= drop.expiresAt;
  const locked = nowSec < drop.claimableAt;
  const sharesLeft = Math.max(0, drop.maxClaims - drop.claimsMade);
  if (drop.status === 2) return "Claimed";
  if (drop.status === 3) return "Refunded";
  if (expired) return "Expired";
  if (locked) return "Sealed";
  if (sharesLeft === 0) return "No shares left";
  return `${drop.claimsMade}/${drop.maxClaims} claimed`;
}

export async function readDrop(claimKey: Address): Promise<DropView | null> {
  for (const escrow of ESCROW_ADDRESSES) {
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
      address: escrow,
      abi: stockDropsAbi,
      functionName: "drops",
      args: [claimKey],
    });
    if (status === 0) continue;

    let stock = stockByAddress(token) ?? null;
    if (!stock) {
      const info = await fetchTokenInfo(token);
      if (info) stock = tokenInfoToStock(info);
    }

    let usdEach: number | null = null;
    if (stock?.feed) {
      const price = await readUsdPrice(stock.feed);
      if (price !== null) {
        usdEach = Number(formatEther(amountPerClaim)) * price;
      }
    }

    return {
      escrow,
      claimKey,
      sender,
      token,
      amount,
      amountPerClaim,
      expiresAt: Number(expiresAt),
      claimableAt: Number(claimableAt),
      maxClaims: Number(maxClaims),
      claimsMade: Number(claimsMade),
      status,
      stock,
      usdEach,
    };
  }
  return null;
}

export async function readDropsForSender(sender: Address): Promise<DropView[]> {
  const keys = new Set<string>();

  await Promise.all(
    ESCROW_ADDRESSES.map(async (escrow) => {
      try {
        const logs = await publicClient.getLogs({
          address: escrow,
          event: dropCreatedEvent,
          args: { sender },
          fromBlock: 0n,
          toBlock: "latest",
        });
        for (const log of logs) {
          if (log.args.claimKey) keys.add(log.args.claimKey.toLowerCase());
        }
      } catch {
        // Old contract versions or RPCs that refuse wide log queries.
      }
    }),
  );

  const drops = await Promise.all(
    [...keys].map((key) => readDrop(key as Address)),
  );
  return drops
    .filter((d): d is DropView => d !== null)
    .sort((a, b) => b.expiresAt - a.expiresAt);
}
