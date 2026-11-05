import { NextResponse } from "next/server";
import { keypairFromSecret } from "@/lib/solana";
import { PROTOCOL_FEE } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const secret = process.env.SOLANA_RELAYER_SECRET;
  let relayer: string | null = null;
  if (secret) {
    try {
      relayer = keypairFromSecret(secret).publicKey.toBase58();
    } catch {
      relayer = null;
    }
  }
  return NextResponse.json({
    relayer,
    treasury: process.env.SOLANA_TREASURY || relayer,
    feeBps: PROTOCOL_FEE.baseBps,
  });
}
