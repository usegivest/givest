import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { attestSender, readSession } from "@/lib/xAuth";

export const runtime = "nodejs";

/** Returns a server attestation that the signed-in X user created this drop. */
export async function POST(req: Request) {
  const user = await readSession();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { claimKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.claimKey || !isAddress(body.claimKey)) {
    return NextResponse.json({ error: "Invalid claimKey" }, { status: 400 });
  }

  return NextResponse.json({
    handle: user.u,
    sig: attestSender(body.claimKey, user.u),
  });
}
