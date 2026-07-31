import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signClaim } from "./chain";
import { CONTRACT_ADDRESS, RELAYER_CLAIM_URL } from "./config";

/**
 * Claim a drop gaslessly via the Givest relayer.
 * Signs the claim digest with the link's claim key and lets the relayer
 * pay for gas. Returns the claim transaction hash.
 */
export async function claimViaRelayer(
  claimPriv: Hex,
  recipient: Address,
): Promise<Hex> {
  const claimKey = privateKeyToAccount(claimPriv).address;
  const signature = await signClaim(claimPriv, CONTRACT_ADDRESS, recipient);

  const res = await fetch(RELAYER_CLAIM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claimKey, recipient, signature }),
  });

  const body = (await res.json().catch(() => null)) as
    | { txHash?: Hex; error?: string }
    | null;
  if (!res.ok || !body?.txHash) {
    throw new Error(body?.error ?? "The claim failed. Try again.");
  }
  return body.txHash;
}
