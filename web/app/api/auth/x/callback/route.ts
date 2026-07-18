import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  encodeSession,
  sessionCookieOptions,
  xAuthEnabled,
} from "@/lib/xAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  if (!xAuthEnabled()) {
    return NextResponse.redirect(`${origin}/send?x_error=not_configured`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    }),
  );

  const rawReturn = decodeURIComponent(cookies["gx_return"] ?? "");
  const returnTo =
    rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/send";

  if (!code || !state || state !== cookies["gx_state"] || !cookies["gx_pkce"]) {
    return NextResponse.redirect(`${origin}${returnTo}?x_error=state_mismatch`);
  }

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${origin}/api/auth/x/callback`,
      code_verifier: cookies["gx_pkce"],
      client_id: process.env.X_CLIENT_ID!,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (process.env.X_CLIENT_SECRET) {
      headers.Authorization = `Basic ${Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`,
      ).toString("base64")}`;
    }

    const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers,
      body,
    });
    if (!tokenRes.ok) {
      console.error("[x auth] token exchange failed", await tokenRes.text());
      return NextResponse.redirect(`${origin}${returnTo}?x_error=token`);
    }
    const token = (await tokenRes.json()) as { access_token: string };

    const meRes = await fetch(
      "https://api.x.com/2/users/me?user.fields=profile_image_url",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    if (!meRes.ok) {
      console.error("[x auth] users/me failed", await meRes.text());
      return NextResponse.redirect(`${origin}${returnTo}?x_error=profile`);
    }
    const me = (await meRes.json()) as {
      data: { username: string; name: string; profile_image_url?: string };
    };

    const session = encodeSession({
      u: me.data.username,
      n: me.data.name,
      p: (me.data.profile_image_url ?? "").replace("_normal", "_200x200"),
      iat: Math.floor(Date.now() / 1000),
    });

    const res = NextResponse.redirect(`${origin}${returnTo}?x_connected=1`);
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    res.cookies.delete("gx_pkce");
    res.cookies.delete("gx_state");
    return res;
  } catch (e) {
    console.error("[x auth]", e);
    return NextResponse.redirect(`${origin}${returnTo}?x_error=unknown`);
  }
}
