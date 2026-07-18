import { NextResponse } from "next/server";
import { formatEther, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "@/lib/chain";
import { CONTRACT_ADDRESS, stockByAddress, stockDropsAbi } from "@/lib/config";
import { decryptClaimKey, lockConfigured } from "@/lib/xAuth";

export const runtime = "nodejs";

/**
 * Shows what is inside a recipient-locked drop without revealing the claim
 * key. The server decrypts internally, reads the drop onchain, and returns
 * only display data, so the claim page can render the gift before the
 * recipient has verified.
 */
export async function POST(req: Request) {
  if (!lockConfigured()) {
    return NextResponse.json({ error: "Locking is not configured" }, { status: 503 });
  }
  const { blob, to } = (await req.json()) as { blob?: string; to?: string };
  if (!blob || !to || !/^[A-Za-z0-9_]{1,15}$/.test(to)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const claimPriv = decryptClaimKey(blob, to);
  if (!claimPriv) {
    return NextResponse.json({ error: "Invalid locked link" }, { status: 400 });
  }

  try {
    const claimKey = privateKeyToAccount(claimPriv as Hex).address;
    const [
      ,
      token,
      ,
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
      args: [claimKey],
    });
    const stock = stockByAddress(token as Address);
    return NextResponse.json({
      symbol: stock?.symbol ?? null,
      name: stock?.name ?? null,
      shares: Number(formatEther(amountPerClaim)),
      status,
      maxClaims: Number(maxClaims),
      claimsMade: Number(claimsMade),
      claimableAt: Number(claimableAt),
      expiresAt: Number(expiresAt),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read the drop from the chain" },
      { status: 502 },
    );
  }
}
