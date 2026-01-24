// app/api/whisk/save-token/route.ts
import { cookies } from "next/headers";
import { whiskKv } from "@/lib/upstashKv";

const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function normalizeBearer(raw: string) {
  let t = String(raw || "").trim();
  if (!t) return "";
  if (!/^bearer\s+/i.test(t)) t = `Bearer ${t}`;
  return t;
}

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    const session = jar.get("ww_session")?.value || "";
    const license = jar.get("ww_license")?.value || "";

    if (session !== "ok" || !license) {
      return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const token = normalizeBearer(body?.token || "");
    if (!token) {
      return Response.json({ ok: false, error: "TOKEN_EMPTY" }, { status: 400 });
    }

    const key = `whisk:token:${license}`;
    const payload = { token, updatedAt: Date.now() };

    await whiskKv.setJson(key, payload, TTL_SECONDS);

    return Response.json({
      ok: true,
      saved: true,
      ttlSeconds: TTL_SECONDS,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: "SAVE_FAILED", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
