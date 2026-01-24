import { NextResponse } from "next/server";

export const runtime = "nodejs";

function clean(v: any) {
  return String(v ?? "").trim();
}

function getBaseUrl() {
  const v = (process.env.LICENSE_API_URL || "").trim();
  return v;
}

async function callGASValidate(base: string, license: string, device_id: string, email?: string) {
  const url = new URL(base);
  url.searchParams.set("action", "validate");
  url.searchParams.set("license", license);
  url.searchParams.set("device_id", device_id);
  if (email) url.searchParams.set("email", email);

  const r = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const text = await r.text();

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { ok: false, status: "UPSTREAM_NOT_JSON", error: "UPSTREAM_NOT_JSON", upstream_text: text.slice(0, 500) };
  }

  return { r, data };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const license = clean(searchParams.get("license"));
  const device_id = clean(searchParams.get("device_id"));
  const email = clean(searchParams.get("email"));

  if (!license || !device_id) {
    return NextResponse.json({ ok: false, status: "MISSING_PARAMS", error: "MISSING_PARAMS" }, { status: 400 });
  }

  const base = getBaseUrl();
  if (!base) {
    return NextResponse.json({ ok: false, status: "LICENSE_API_URL_NOT_SET", error: "LICENSE_API_URL_NOT_SET" }, { status: 500 });
  }

  const { r, data } = await callGASValidate(base, license, device_id, email);

  const ok = data?.ok === true;
  return NextResponse.json(
    ok ? data : { ok: false, status: data?.status || "ERROR", error: data?.error || data?.status || "ERROR" },
    { status: ok ? 200 : r.status || 401 }
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const license = clean(body.license);
  const device_id = clean(body.device_id || body.device || body.deviceId);
  const email = clean(body.email);

  if (!license || !device_id) {
    return NextResponse.json({ ok: false, status: "MISSING_FIELDS", error: "MISSING_FIELDS" }, { status: 400 });
  }

  const base = getBaseUrl();
  if (!base) {
    return NextResponse.json({ ok: false, status: "LICENSE_API_URL_NOT_SET", error: "LICENSE_API_URL_NOT_SET" }, { status: 500 });
  }

  const { r, data } = await callGASValidate(base, license, device_id, email);
  const ok = data?.ok === true;

  return NextResponse.json(
    ok ? data : { ok: false, status: data?.status || "ERROR", error: data?.error || data?.status || "ERROR" },
    { status: ok ? 200 : r.status || 401 }
  );
}
