import { NextResponse } from "next/server";
import { submitRelayedClaim } from "@/lib/solana";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { tx?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.tx || typeof body.tx !== "string") {
    return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
  }
  try {
    const txHash = await submitRelayedClaim(body.tx);
    return NextResponse.json({ txHash });
  } catch (e) {
    console.error("[relayer] claim failed:", e);
    const message = e instanceof Error ? e.message : "The claim transaction failed. Try again.";
    const status = /not configured/i.test(message) ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
