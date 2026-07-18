import { NextResponse } from "next/server";
import { decryptClaimKey, readSession, xAuthEnabled } from "@/lib/xAuth";

export const runtime = "nodejs";

/**
 * Unlocks a recipient-locked claim key. Requires an X session whose
 * handle matches the handle the drop was locked to.
 */
export async function POST(req: Request) {
  if (!xAuthEnabled()) {
    return NextResponse.json({ error: "X sign-in is not configured" }, { status: 503 });
  }
  const { blob, handle } = (await req.json()) as {
    blob?: string;
    handle?: string;
  };
  if (!blob || !handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (session.u.toLowerCase() !== handle.toLowerCase()) {
    return NextResponse.json(
      { error: `This drop is reserved for @${handle}` },
      { status: 403 },
    );
  }

  const claimPriv = decryptClaimKey(blob, handle);
  if (!claimPriv) {
    return NextResponse.json({ error: "Could not unlock this drop" }, { status: 400 });
  }
  return NextResponse.json({ claimPriv });
}
