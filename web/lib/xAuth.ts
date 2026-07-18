import { createHmac, randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";

export type XUser = {
  /** X username without @ */
  u: string;
  /** Display name */
  n: string;
  /** Profile image URL */
  p: string;
  /** Issued at (unix seconds) */
  iat: number;
};

export const SESSION_COOKIE = "gx_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET ?? process.env.RELAYER_PRIVATE_KEY;
  if (!s) throw new Error("SESSION_SECRET is not configured");
  return s;
}

export function xAuthEnabled(): boolean {
  return Boolean(
    process.env.X_CLIENT_ID &&
      (process.env.SESSION_SECRET ?? process.env.RELAYER_PRIVATE_KEY),
  );
}

function hmac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("hex");
}

function b64url(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function fromB64url(data: string): string {
  return Buffer.from(data, "base64url").toString();
}

export function encodeSession(user: XUser): string {
  const payload = b64url(JSON.stringify(user));
  return `${payload}.${hmac(payload)}`;
}

export function decodeSession(value: string | undefined): XUser | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  if (hmac(payload) !== sig) return null;
  try {
    const user = JSON.parse(fromB64url(payload)) as XUser;
    if (!user.u || typeof user.u !== "string") return null;
    if (Date.now() / 1000 - user.iat > SESSION_MAX_AGE) return null;
    return user;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<XUser | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

/** Attestation that a given X handle created the drop behind claimKey. */
export function attestSender(claimKey: string, handle: string): string {
  return hmac(`attest|${claimKey.toLowerCase()}|${handle.toLowerCase()}`);
}

export function verifySenderAttestation(
  claimKey: string,
  handle: string,
  sig: string,
): boolean {
  if (!/^[0-9a-f]{64}$/i.test(sig)) return false;
  return attestSender(claimKey, handle) === sig.toLowerCase();
}

/** PKCE helpers */
export function newPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function newState(): string {
  return randomBytes(16).toString("hex");
}
