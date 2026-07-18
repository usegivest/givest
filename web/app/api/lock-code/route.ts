import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { claimTweetCode, lockConfigured } from "@/lib/xAuth";

export const runtime = "nodejs";

/**
 * Returns the verification code a locked-drop recipient must include in
 * their proof tweet. The code is public by design (it ends up in a tweet);
 * it binds the drop, the handle, and the destination wallet together.
 */
export async function POST(req: Request) {
  if (!lockConfigured()) {
    return NextResponse.json({ error: "Locking is not configured" }, { status: 503 });
  }
  const { blob, to, recipient } = (await req.json()) as {
    blob?: string;
    to?: string;
    recipient?: string;
  };
  if (
    !blob ||
    !to ||
    !recipient ||
    !/^[A-Za-z0-9_]{1,15}$/.test(to) ||
    !isAddress(recipient)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const code = claimTweetCode(blob, to, recipient);
  return NextResponse.json({
    code,
    tweetText: `Verifying my @usegivest claim: ${code}`,
  });
}
