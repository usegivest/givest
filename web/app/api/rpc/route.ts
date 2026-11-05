import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "getLatestBlockhash",
  "getAccountInfo",
  "getMultipleAccounts",
  "getTokenAccountsByOwner",
  "getTokenAccountBalance",
  "getSignatureStatuses",
  "getTransaction",
  "sendTransaction",
  "getFeeForMessage",
  "getMinimumBalanceForRentExemption",
  "getEpochInfo",
  "getBalance",
  "getParsedTokenAccountsByOwner",
]);

export async function POST(req: Request) {
  const url = process.env.SOLANA_RPC_URL;
  if (!url) {
    return NextResponse.json({ error: "SOLANA_RPC_URL is not set" }, { status: 500 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const calls = Array.isArray(body) ? body : [body];
  for (const call of calls) {
    const method = (call as { method?: string })?.method;
    if (!method || !ALLOWED.has(method)) {
      return NextResponse.json({ error: "Method not allowed" }, { status: 403 });
    }
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
