import type { Hex } from "viem";
import { WEB_APP_URL } from "./config";

export type ParsedClaimLink =
  | {
      kind: "key";
      claimPriv: Hex;
      message: string | null;
      fromX: string | null;
    }
  | { kind: "locked"; to: string | null; url: string }
  | { kind: "invalid" };

/**
 * Parse a Givest claim link (or a bare hash fragment).
 * Format: https://usegivest.app/claim#0x<64-hex-key>&m=<msg>&x=<handle>
 * Locked drops replace the key with "locked" and carry &lk=<blob>&to=<handle>.
 */
export function parseClaimLink(input: string): ParsedClaimLink {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "invalid" };

  let fragment = trimmed;
  const hashIndex = trimmed.indexOf("#");
  if (hashIndex >= 0) fragment = trimmed.slice(hashIndex + 1);

  const [key, ...rest] = fragment.split("&");
  const params = new URLSearchParams(rest.join("&"));

  if (key === "locked" || params.get("lk")) {
    const to = params.get("to");
    const url = trimmed.startsWith("http")
      ? trimmed
      : `${WEB_APP_URL}/claim#${fragment}`;
    return {
      kind: "locked",
      to: to && /^[A-Za-z0-9_]{1,15}$/.test(to) ? to : null,
      url,
    };
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) return { kind: "invalid" };

  const message = params.get("m");
  const x = params.get("x");
  return {
    kind: "key",
    claimPriv: key as Hex,
    message: message || null,
    fromX: x && /^[A-Za-z0-9_]{1,15}$/.test(x) ? x : null,
  };
}

/** Build a shareable claim link, mirroring the web send page. */
export function buildClaimLink(
  claimPriv: Hex,
  message: string,
  opts?: { symbol?: string; usd?: number; from?: string },
): string {
  const messagePart = message.trim()
    ? `&m=${encodeURIComponent(message.trim())}`
    : "";
  const preview = new URLSearchParams();
  if (opts?.symbol) preview.set("s", opts.symbol);
  if (opts?.usd && opts.usd > 0) preview.set("u", String(Math.round(opts.usd)));
  if (opts?.from) preview.set("f", opts.from.replace(/^@/, ""));
  if (message.trim()) preview.set("m", message.trim().slice(0, 80));
  const qs = preview.toString();
  return `${WEB_APP_URL}/claim${qs ? `?${qs}` : ""}#${claimPriv}${messagePart}`;
}
