import type { Metadata } from "next";
import ClaimClient from "./ClaimClient";

type Search = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const params = await searchParams;
  const symbol = first(params.s || params.symbol).toUpperCase() || "STOCK";
  const usd = first(params.u || params.usd);
  const from = first(params.f || params.from).replace(/^@/, "");
  const msg = first(params.m || params.msg);

  const qs = new URLSearchParams();
  if (symbol) qs.set("s", symbol);
  if (usd) qs.set("u", usd);
  if (from) qs.set("f", from);
  if (msg) qs.set("m", msg);

  const title = usd
    ? `$${usd} of ${symbol} · Givest`
    : `A ${symbol} gift · Givest`;
  const description = from
    ? `@${from} sent you a real stock gift on Robinhood Chain. Claim it with one tap. Gas is covered.`
    : "Someone sent you a real stock gift on Robinhood Chain. Claim it with one tap. Gas is covered.";
  const og = `https://usegivest.app/api/og?${qs.toString() || "s=STOCK"}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://usegivest.app/claim",
      siteName: "Givest",
      type: "website",
      images: [{ url: og, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og],
    },
  };
}

export default function ClaimPage() {
  return <ClaimClient />;
}
