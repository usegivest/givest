import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

const STOCK_COLORS: Record<string, string> = {
  NVDA: "#76B900",
  TSLA: "#E82127",
  AAPL: "#A2AAAD",
  AMZN: "#FF9900",
  META: "#0668E1",
  GOOGL: "#4285F4",
  MSFT: "#00A4EF",
  HOOD: "#CCFF00",
  SPY: "#1B4F9C",
  QQQ: "#5B2C8A",
  ETH: "#627EEA",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const symbol = (searchParams.get("s") || "STOCK").toUpperCase().slice(0, 12);
    const usdRaw = searchParams.get("u") || "";
    const from = (searchParams.get("f") || "").replace(/^@/, "").slice(0, 24);
    const note = (searchParams.get("m") || "").slice(0, 80);
    const usd = Number(usdRaw);
    const hasUsd = Number.isFinite(usd) && usd > 0;
    const accent = STOCK_COLORS[symbol] ?? "#e4a0b5";
    const headline = hasUsd
      ? `$${Math.round(usd).toLocaleString("en-US")} of ${symbol}`
      : `A ${symbol} gift`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px",
            backgroundColor: "#141419",
            backgroundImage:
              "radial-gradient(circle at 50% 18%, #2b2230 0%, #191a1f 52%, #121216 100%)",
            color: "#ffffff",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: "#17191f",
                  border: "1px solid #e4a0b5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#f3c9d7",
                  marginRight: 14,
                }}
              >
                g
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>Givest</div>
            </div>
            <div style={{ fontSize: 22, color: "#9a9098" }}>Real stock gift</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 26,
                  backgroundColor: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  fontWeight: 800,
                  color: "#111111",
                  marginRight: 22,
                }}
              >
                {symbol.slice(0, 2)}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: 68,
                    fontWeight: 700,
                    letterSpacing: -2,
                    lineHeight: 1.05,
                  }}
                >
                  {headline}
                </div>
                <div style={{ fontSize: 26, color: "#b7aeb6", marginTop: 8 }}>
                  {from
                    ? `From @${from}  ·  claim with one tap`
                    : "Claim with one tap  ·  gas covered"}
                </div>
              </div>
            </div>

            {note ? (
              <div
                style={{
                  marginTop: 28,
                  padding: "16px 22px",
                  borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(228,160,181,0.3)",
                  fontSize: 24,
                  color: "#e8e2e6",
                  maxWidth: 980,
                  display: "flex",
                }}
              >
                {note}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 26,
            }}
          >
            <div style={{ fontSize: 22, color: "#8d8390" }}>
              Escrowed on Robinhood Chain
            </div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#f3c9d7" }}>
              usegivest.app/claim
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (e) {
    console.error("[og]", e);
    return new Response("OG render failed", { status: 500 });
  }
}
