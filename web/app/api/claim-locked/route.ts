import { NextResponse } from "next/server";
import {
  createWalletClient,
  formatEther,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, signClaim } from "@/lib/chain";
import {
  CONTRACT_ADDRESS,
  robinhoodChain,
  stockByAddress,
  stockDropsAbi,
} from "@/lib/config";
import { claimTweetCode, decryptClaimKey, lockConfigured, readSession } from "@/lib/xAuth";
import { extractTweetId, fetchPublicTweet } from "@/lib/tweetVerify";
import { fetchTokenInfo } from "@/lib/tokenInfo";

export const runtime = "nodejs";

/**
 * Claims a recipient-locked drop. The recipient proves control of the
 * required X handle either with a proof tweet containing the verification
 * code, or with a matching X session (when OAuth is configured). The claim
 * key is decrypted and used server-side only, so the recipient never sees
 * it and the payout can only go to the wallet bound into the code.
 */
export async function POST(req: Request) {
  if (!lockConfigured()) {
    return NextResponse.json({ error: "Locking is not configured" }, { status: 503 });
  }
  const relayerKey = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!relayerKey) {
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
    !isAddress(recipient)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Prove control of the handle: an X session with a matching handle, or
  // a public proof tweet from the handle containing the bound code.
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
    const claimKey = privateKeyToAccount(claimPriv as Hex).address;
    const [
      ,
      token,
      ,
      amountPerClaim,
      expiresAt,
      claimableAt,
      maxClaims,
      claimsMade,
      status,
    ] = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: stockDropsAbi,
      functionName: "drops",
      args: [claimKey],
    });
    if (status !== 1) {
      return NextResponse.json({ error: "This drop is not active" }, { status: 409 });
    }
    if (Number(claimsMade) >= Number(maxClaims)) {
      return NextResponse.json({ error: "No shares left" }, { status: 409 });
    }
    const already = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: stockDropsAbi,
      functionName: "hasClaimed",
      args: [claimKey, recipient as Address],
    });
    if (already) {
      return NextResponse.json(
        { error: "This wallet already claimed. One claim per wallet." },
        { status: 409 },
      );
    }
    const now = Date.now() / 1000;
    if (now < Number(claimableAt)) {
      return NextResponse.json({ error: "This drop is not open yet" }, { status: 409 });
    }
    if (now >= Number(expiresAt)) {
      return NextResponse.json({ error: "This drop has expired" }, { status: 409 });
    }

    const signature = await signClaim(
      claimPriv as Hex,
      CONTRACT_ADDRESS,
      recipient as Address,
    );
    const relayer = createWalletClient({
      account: privateKeyToAccount(relayerKey),
      chain: robinhoodChain,
      transport: http(robinhoodChain.rpcUrls.default.http[0]),
    });
    const txHash = await relayer.writeContract({
      address: CONTRACT_ADDRESS,
      abi: stockDropsAbi,
      functionName: "claim",
      args: [claimKey, recipient as Address, signature],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const stock =
      stockByAddress(token as Address) ??
      (await fetchTokenInfo(token as Address));
    return NextResponse.json({
      txHash,
      symbol: stock?.symbol ?? null,
      shares: Number(formatEther(amountPerClaim)),
    });
  } catch (e) {
    console.error("[claim-locked] failed:", e);
    return NextResponse.json(
      { error: "The claim transaction failed. Try again." },
      { status: 500 },
    );
  }
}
