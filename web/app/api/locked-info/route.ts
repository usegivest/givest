import { NextResponse } from "next/server";
import { stockByAddress } from "@/lib/config";
import { decryptClaimKey, lockConfigured } from "@/lib/xAuth";
import { holdingOf, keypairFromSecret } from "@/lib/solana";

export const runtime = "nodejs";

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
    const claimKey = keypairFromSecret(claimPriv).publicKey.toBase58();
    const held = await holdingOf(claimKey);
    if (!held) {
      return NextResponse.json({ error: "Could not read the drop from the chain" }, { status: 502 });
    }
    const stock = stockByAddress(held.mint);
    const open = held.raw > 0n;
    return NextResponse.json({
      symbol: stock?.symbol ?? null,
      name: stock?.name ?? null,
      shares: held.uiAmount,
      status: open ? 1 : 2,
      maxClaims: 1,
      claimsMade: open ? 0 : 1,
      claimableAt: 0,
      expiresAt: 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read the drop from the chain" },
      { status: 502 },
    );
  }
}
