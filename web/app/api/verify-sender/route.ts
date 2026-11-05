import { NextResponse } from "next/server";
import { verifySenderAttestation } from "@/lib/xAuth";
import { isSolanaAddress } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const claimKey = url.searchParams.get("claimKey") ?? "";
  const handle = url.searchParams.get("handle") ?? "";
  const sig = url.searchParams.get("sig") ?? "";

  if (!isSolanaAddress(claimKey) || !/^[A-Za-z0-9_]{1,15}$/.test(handle) || !sig) {
    return NextResponse.json({ verified: false });
  }

  try {
    return NextResponse.json({
      verified: verifySenderAttestation(claimKey, handle, sig),
    });
  } catch {
    return NextResponse.json({ verified: false });
  }
}
