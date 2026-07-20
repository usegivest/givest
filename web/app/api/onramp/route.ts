import { NextResponse } from "next/server";
import { buildOnrampUrl, onrampEnabled } from "@/lib/onramp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const enabled = onrampEnabled();
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ enabled });
  }
  if (!enabled) {
    return NextResponse.json(
      { enabled: false, error: "Onramp is not configured" },
      { status: 503 },
    );
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const usd = Number(searchParams.get("usd") || "0");
  const url = buildOnrampUrl({
    walletAddress: address,
    usdAmount: usd > 0 ? usd : undefined,
  });
  return NextResponse.json({ enabled: true, url });
}
