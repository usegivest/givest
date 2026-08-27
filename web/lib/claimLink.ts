import { isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export type ParsedClaimInput =
  | { kind: "key"; claimKey: Address }
  | { kind: "locked"; to: string; blob: string }
  | { kind: "invalid"; message: string };

function hashFromRaw(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hashIdx = trimmed.indexOf("#");
  if (hashIdx >= 0) return trimmed.slice(hashIdx + 1);

  try {
    const url = new URL(trimmed);
    if (url.hash) return url.hash.slice(1);
  } catch {
    // Not a URL. Treat the whole string as the fragment or a key.
  }
  return trimmed;
}

/**
 * Parse a pasted claim link, private key, or claim-key address.
 * Private keys are converted to an address in-memory and never returned.
 */
export function parseClaimInput(raw: string): ParsedClaimInput {
  const hash = hashFromRaw(raw);
  if (!hash) return { kind: "invalid", message: "Paste a claim link or a claim key." };

  const [head, ...rest] = hash.split("&");
  const params = new URLSearchParams(rest.join("&"));

  if (head === "locked" || params.get("lk")) {
    const to = params.get("to");
    const lk = params.get("lk");
    if (to && lk && /^[A-Za-z0-9_]{1,15}$/.test(to)) {
      return { kind: "locked", to, blob: lk };
    }
    return { kind: "invalid", message: "This locked link is missing its handle or key." };
  }

  const token = head.startsWith("0x") ? head : `0x${head}`;

  if (/^0x[0-9a-fA-F]{64}$/.test(token)) {
    return { kind: "key", claimKey: privateKeyToAccount(token as Hex).address };
  }

  if (isAddress(token)) {
    return { kind: "key", claimKey: token };
  }

  return {
    kind: "invalid",
    message: "That does not look like a Givest claim link or a claim key.",
  };
}
