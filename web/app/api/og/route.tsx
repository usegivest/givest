import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/** The real Givest mark, same path as components/LogoMark. */
const GIVEST_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill-rule="evenodd" clip-rule="evenodd" d="M 256 0 L 256 128 A 128 128 0 1 1 128 0 Z M 128 176 A 48 48 0 1 0 128 80 A 48 48 0 0 0 128 176 Z" fill="#ffffff"/></svg>`;

const GIVEST_MARK = `data:image/svg+xml;base64,${Buffer.from(
  GIVEST_MARK_SVG,
).toString("base64")}`;

/** Load the bundled stock logo and inline it, so satori never fetches mid-render. */
async function loadStockLogo(
  origin: string,
  symbol: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/logos/${symbol}.png`, {
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = req.nextUrl;
    const symbol = (searchParams.get("s") || "STOCK")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);
    const usd = Number(searchParams.get("u") || "");
    const from = (searchParams.get("f") || "")
      .replace(/^@/, "")
      .replace(/[^A-Za-z0-9_]/g, "")
      .slice(0, 20);
    const note = (searchParams.get("m") || "").slice(0, 80);
    const hasUsd = Number.isFinite(usd) && usd > 0;
    const headline = hasUsd
      ? `$${Math.round(usd).toLocaleString("en-US")} of ${symbol}`
      : `A ${symbol} gift`;

    const logo = await loadStockLogo(origin, symbol);

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
              <img
                src={GIVEST_MARK}
                width={44}
                height={44}
                style={{ marginRight: 16 }}
              />
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
                Givest
              </div>
            </div>
            <div style={{ fontSize: 22, color: "#9a9098" }}>Real stock gift</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 28,
                  backgroundColor: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 26,
                }}
              >
                {logo ? (
                  <img src={logo} width={76} height={76} />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 32,
                      fontWeight: 800,
                      color: "#17191f",
                    }}
                  >
                    {symbol.slice(0, 2)}
                  </div>
                )}
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
                <div style={{ fontSize: 26, color: "#b7aeb6", marginTop: 10 }}>
                  {from
                    ? `From @${from}  ·  claim with one tap`
                    : "Claim with one tap  ·  gas covered"}
                </div>
              </div>
            </div>

            {note ? (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  marginTop: 28,
                  marginLeft: 130,
                  padding: "14px 24px",
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(228,160,181,0.32)",
                  fontSize: 24,
                  color: "#e8e2e6",
                  maxWidth: 900,
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
