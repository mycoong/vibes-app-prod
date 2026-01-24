// app/api/whisk/reset/route.ts
import { cookies } from "next/headers";
import { whiskKv } from "@/lib/upstashKv";

export async function POST() {
  try {
    const jar = await cookies();
    const session = jar.get("ww_session")?.value || "";
    const license = jar.get("ww_license")?.value || "";

    if (session !== "ok" || !license) {
      return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const key = `whisk:token:${license}`;
    await whiskKv.del(key);

    return Response.json({ ok: true, cleared: true });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: "RESET_FAILED", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
