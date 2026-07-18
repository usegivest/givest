import { NextResponse } from "next/server";
import { encryptClaimKey, lockConfigured } from "@/lib/xAuth";

export const runtime = "nodejs";

/**
 * Locks a claim key to a specific X handle. Called by the sender right
 * after creating a drop. Returns an encrypted blob that replaces the raw
 * claim key in the link; the server only turns it back into a claim after
 * the recipient proves control of the handle (proof tweet or X session).
 */
export async function POST(req: Request) {
  if (!lockConfigured()) {
    return NextResponse.json({ error: "Locking is not configured" }, { status: 503 });
  }
  const { claimPriv, handle } = (await req.json()) as {
    claimPriv?: string;
    handle?: string;
  };
  if (!claimPriv || !/^0x[0-9a-fA-F]{64}$/.test(claimPriv)) {
    return NextResponse.json({ error: "Invalid claim key" }, { status: 400 });
  }
  if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }
  return NextResponse.json({ blob: encryptClaimKey(claimPriv, handle) });
}
