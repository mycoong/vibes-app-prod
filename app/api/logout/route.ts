import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true }, { status: 200 });

  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  res.cookies.set("ww_session", "", opts);
  res.cookies.set("ww_license", "", opts);
  res.cookies.set("ww_device_id", "", opts);

  return res;
}
