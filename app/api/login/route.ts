import { NextResponse } from "next/server";

export const runtime = "nodejs";

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = clean(body.email);
    const license = clean(body.license);
    const device_id = clean(body.device_id || body.device || body.deviceId);

    if (!license || !device_id) {
      return NextResponse.json({ ok: false, status: "MISSING_FIELDS", error: "MISSING_FIELDS" }, { status: 400 });
    }

    const base = new URL(req.url).origin;

    const vr = await fetch(`${base}/api/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ license, device_id, email }),
      cache: "no-store",
    });

    const vj = await vr.json().catch(() => ({} as any));

    if (!vr.ok || vj?.ok !== true) {
      return NextResponse.json(
        { ok: false, status: vj?.status || "ERROR", error: vj?.error || vj?.status || "LOGIN_FAILED" },
        { status: vr.status || 401 }
      );
    }

    const out = NextResponse.json(
      {
        ok: true,
        status: "ACTIVE",
        license: vj?.license || license,
        device_id: vj?.device_id || device_id,
        email: vj?.email || email || "",
      },
      { status: 200 }
    );

    const cookieBase = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    };

    out.cookies.set("ww_session", "ok", cookieBase);
    out.cookies.set("ww_license", String(vj?.license || license), cookieBase);
    out.cookies.set("ww_device_id", String(vj?.device_id || device_id), cookieBase);

    return out;
  } catch (e: any) {
    return NextResponse.json({ ok: false, status: "ERROR", error: String(e?.message || e) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const license = clean(searchParams.get("license"));
  const device_id = clean(searchParams.get("device_id") || searchParams.get("device"));
  const email = clean(searchParams.get("email"));

  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ license, device_id, email }),
    })
  );
}
