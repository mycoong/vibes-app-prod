import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const ck = cookies();
  const candidates = ["ww_session", "session", "auth", "token", "ww_auth"];
  const found = candidates.find((name) => ck.get(name)?.value);
  if (!found) return NextResponse.json({ ok: false, authed: false }, { status: 401 });
  return NextResponse.json({ ok: true, authed: true, cookie: found }, { status: 200 });
}
