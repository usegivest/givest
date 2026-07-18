import { NextResponse } from "next/server";
import {
  createWalletClient,
  http,
  isAddress,
  recoverMessageAddress,
  encodePacked,
  keccak256,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "@/lib/chain";
import { CONTRACT_ADDRESS, robinhoodChain, stockDropsAbi } from "@/lib/config";

export async function POST(req: Request) {
  const relayerKey = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!relayerKey) {
    return NextResponse.json(
      { error: "Relayer er ikke konfigureret" },
      { status: 500 },
    );
  }

  let body: { claimKey?: string; recipient?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig request" }, { status: 400 });
  }

  const { claimKey, recipient, signature } = body;
  if (
    !claimKey ||
    !recipient ||
    !signature ||
    !isAddress(claimKey) ||
    !isAddress(recipient) ||
    !/^0x[0-9a-fA-F]{130}$/.test(signature)
  ) {
    return NextResponse.json({ error: "Ugyldige parametre" }, { status: 400 });
  }

  try {
    // Verify signature and drop state before spending relayer gas.
    const inner = keccak256(
      encodePacked(
        ["uint256", "address", "address", "address"],
        [
          BigInt(robinhoodChain.id),
          CONTRACT_ADDRESS,
          claimKey as Address,
          recipient as Address,
        ],
      ),
    );
    const signer = await recoverMessageAddress({
      message: { raw: inner },
      signature: signature as Hex,
    });
    if (signer.toLowerCase() !== claimKey.toLowerCase()) {
      return NextResponse.json({ error: "Ugyldig signatur" }, { status: 403 });
    }

    const [
      sender,
      token,
      amount,
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
      args: [claimKey as Address],
    });
    if (status !== 1) {
      return NextResponse.json({ error: "Droppet er ikke aktivt" }, { status: 409 });
    }
    if (Number(claimsMade) >= Number(maxClaims)) {
      return NextResponse.json({ error: "Ingen shares tilbage" }, { status: 409 });
    }

    const already = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: stockDropsAbi,
      functionName: "hasClaimed",
      args: [claimKey as Address, recipient as Address],
    });
    if (already) {
      return NextResponse.json(
        { error: "This wallet already claimed. One claim per wallet." },
        { status: 409 },
      );
    }

    const now = Date.now() / 1000;
    if (now < Number(claimableAt)) {
      return NextResponse.json(
        { error: "Giveaway er ikke åben endnu. Prøv igen om lidt." },
        { status: 409 },
      );
    }
    if (now >= Number(expiresAt)) {
      return NextResponse.json({ error: "Droppet er udløbet" }, { status: 409 });
    }
    void sender;
    void token;
    void amount;
    void amountPerClaim;

    const relayer = createWalletClient({
      account: privateKeyToAccount(relayerKey),
      chain: robinhoodChain,
      transport: http(robinhoodChain.rpcUrls.default.http[0]),
    });

    const txHash = await relayer.writeContract({
      address: CONTRACT_ADDRESS,
      abi: stockDropsAbi,
      functionName: "claim",
      args: [claimKey as Address, recipient as Address, signature as Hex],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({ txHash });
  } catch (e) {
    console.error("[relayer] claim failed:", e);
    return NextResponse.json(
      { error: "Claim-transaktionen fejlede. Prøv igen." },
      { status: 500 },
    );
  }
}
