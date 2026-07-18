import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSession, xAuthEnabled } from "@/lib/xAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = xAuthEnabled();
  if (!enabled) return NextResponse.json({ enabled, user: null });
  const user = await readSession();
  return NextResponse.json({
    enabled,
    user: user ? { handle: user.u, name: user.n, avatar: user.p } : null,
  });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
