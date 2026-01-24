import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));

  const license = String(body.license ?? "").trim();
  const email = String(body.email ?? "").trim();
  const device_id = String(body.device_id ?? body.device ?? body.deviceId ?? "").trim();

  const base = new URL(req.url).origin;

  const r = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ license, email, device_id }),
    cache: "no-store",
  });

  const j = await r.json().catch(() => ({} as any));
  return NextResponse.json(j, { status: r.status });
}
