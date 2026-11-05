import { NextResponse } from "next/server";
import { stockByAddress } from "@/lib/config";
import { claimTweetCode, decryptClaimKey, lockConfigured, readSession } from "@/lib/xAuth";
import { extractTweetId, fetchPublicTweet } from "@/lib/tweetVerify";
import {
  buildClaimTx,
  holdingOf,
  isSolanaAddress,
  keypairFromSecret,
  submitRelayedClaim,
} from "@/lib/solana";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!lockConfigured()) {
    return NextResponse.json({ error: "Locking is not configured" }, { status: 503 });
  }
  if (!process.env.SOLANA_RELAYER_SECRET) {
    return NextResponse.json({ error: "Relayer is not configured" }, { status: 500 });
  }

  let body: { blob?: string; to?: string; recipient?: string; tweetUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { blob, to, recipient, tweetUrl } = body;
  if (
    !blob ||
    !to ||
    !recipient ||
    !/^[A-Za-z0-9_]{1,15}$/.test(to) ||
    !isSolanaAddress(recipient)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const session = await readSession();
  const sessionOk = session?.u?.toLowerCase() === to.toLowerCase();
  if (!sessionOk) {
    if (!tweetUrl) {
      return NextResponse.json(
        { error: "Post the verification tweet and paste its link" },
        { status: 401 },
      );
    }
    const tweetId = extractTweetId(tweetUrl);
    if (!tweetId) {
      return NextResponse.json(
        { error: "That does not look like a link to a tweet" },
        { status: 400 },
      );
    }
    const tweet = await fetchPublicTweet(tweetId);
    if (!tweet) {
      return NextResponse.json(
        { error: "Could not read that tweet. Make sure it is public, then try again." },
        { status: 502 },
      );
    }
    if (tweet.handle.toLowerCase() !== to.toLowerCase()) {
      return NextResponse.json(
        { error: `That tweet was posted by @${tweet.handle}, but this drop is reserved for @${to}` },
        { status: 403 },
      );
    }
    const code = claimTweetCode(blob, to, recipient);
    if (!tweet.text.toUpperCase().includes(code.toUpperCase())) {
      return NextResponse.json(
        { error: "The tweet does not contain your verification code. Post the exact text and try again." },
        { status: 403 },
      );
    }
  }

  const claimPriv = decryptClaimKey(blob, to);
  if (!claimPriv) {
    return NextResponse.json({ error: "Invalid locked link" }, { status: 400 });
  }

  try {
    const claimKey = keypairFromSecret(claimPriv).publicKey.toBase58();
    const held = await holdingOf(claimKey);
    if (!held || held.raw <= 0n) {
      return NextResponse.json({ error: "This drop is not active" }, { status: 409 });
    }
    const relayer = process.env.SOLANA_RELAYER_SECRET
      ? keypairFromSecret(process.env.SOLANA_RELAYER_SECRET).publicKey.toBase58()
      : "";
    const tx = await buildClaimTx({
      claimSecret: claimPriv,
      recipient,
      relayer,
    });
    const txHash = await submitRelayedClaim(tx);
    const stock = stockByAddress(held.mint);
    return NextResponse.json({
      txHash,
      symbol: stock?.symbol ?? null,
      shares: held.uiAmount,
    });
  } catch (e) {
    console.error("[claim-locked] failed:", e);
    return NextResponse.json(
      { error: "The claim transaction failed. Try again." },
      { status: 500 },
    );
  }
}
