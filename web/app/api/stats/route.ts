import { NextResponse } from "next/server";
import { ESCROW_ADDRESSES } from "@/lib/config";
import { formatVolumeUsd, getProtocolStats } from "@/lib/protocolStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPLORER = "https://robinhoodchain.blockscout.com";

export async function GET() {
  try {
    const stats = await getProtocolStats();
    return NextResponse.json(
      {
        ...stats,
        volumeLabel: formatVolumeUsd(stats.volumeUsd),
        stockVolumeLabel: formatVolumeUsd(stats.stockVolumeUsd),
        explorer: EXPLORER,
        escrows: ESCROW_ADDRESSES.map((address) => ({
          address,
          url: `${EXPLORER}/address/${address}`,
        })),
        verifyUrl: "https://usegivest.app/volume",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (e) {
    console.error("[stats]", e);
    return NextResponse.json(
      { error: "Could not load protocol stats" },
      { status: 500 },
    );
  }
}
