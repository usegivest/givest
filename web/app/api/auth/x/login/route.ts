import { NextResponse } from "next/server";
import { newPkcePair, newState, xAuthEnabled } from "@/lib/xAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!xAuthEnabled()) {
    return NextResponse.json(
      { error: "X sign-in is not configured" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/x/callback`;
  const { verifier, challenge } = newPkcePair();
  const state = newState();

  // Where to land after the OAuth round trip. Only same-site paths.
  const next = url.searchParams.get("next") ?? "";
  const returnTo = next.startsWith("/") && !next.startsWith("//") ? next : "/send";

  const authorize = new URL("https://x.com/i/oauth2/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", process.env.X_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", "users.read tweet.read");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authorize.toString());
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("gx_pkce", verifier, cookieOpts);
  res.cookies.set("gx_state", state, cookieOpts);
  res.cookies.set("gx_return", returnTo, cookieOpts);
  return res;
}
