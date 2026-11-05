import { isClaimSecret, isSolanaAddress, keypairFromSecret } from "./solana";

export type ParsedClaimInput =
  | { kind: "key"; claimKey: string; secret: string | null }
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
    // Treat the whole string as the fragment.
  }
  return trimmed;
}

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

  const token = head.startsWith("sol:") ? head.slice(4) : head;
  if (isClaimSecret(token)) {
    return {
      kind: "key",
      claimKey: keypairFromSecret(token).publicKey.toBase58(),
      secret: token,
    };
  }
  if (isSolanaAddress(token)) {
    return { kind: "key", claimKey: token, secret: null };
  }
  if (/^0x[0-9a-fA-F]{64}$/.test(token) || /^0x[0-9a-fA-F]{40}$/.test(token)) {
    return {
      kind: "invalid",
      message: "That link is from the previous chain. Solana gifts use a new link.",
    };
  }
  return {
    kind: "invalid",
    message: "That does not look like a Givest claim link or a claim key.",
  };
}
