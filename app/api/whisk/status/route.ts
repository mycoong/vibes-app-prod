// app/api/whisk/status/route.ts
import { cookies } from "next/headers";
import { whiskKv } from "@/lib/upstashKv";

export async function GET() {
  try {
    const jar = await cookies();
    const session = jar.get("ww_session")?.value || "";
    const license = jar.get("ww_license")?.value || "";

    if (session !== "ok" || !license) {
      return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const key = `whisk:token:${license}`;
    const { value, ttl } = await whiskKv.getJsonWithTtl(key);

    const hasToken = !!value?.token;
    const updatedAt = typeof value?.updatedAt === "number" ? value.updatedAt : null;

    const now = Date.now();
    const ageHours = updatedAt ? Math.max(0, Math.round((now - updatedAt) / (60 * 60 * 1000))) : null;
    const expiresAt = ttl > 0 ? now + ttl * 1000 : null;

    return Response.json({
      ok: true,
      authenticated: hasToken && ttl !== -2 && ttl !== 0,
      hasToken,
      ttlSeconds: ttl,
      expiresAt,
      updatedAt,
      ageHours,
    });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: "STATUS_FAILED", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
