import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const apiKey = String(body?.apiKey || "").trim();
  if (!apiKey) return NextResponse.json({ ok: false, error: "API_KEY_MISSING" }, { status: 400 });

  // ✅ model baru (1.5 sudah retired / ga tersedia)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
      generationConfig: { maxOutputTokens: 8 },
    }),
  });

  if (r.status === 429) return NextResponse.json({ ok: false, error: "RESOURCE_EXHAUSTED" }, { status: 429 });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    if (t.includes("API key not valid")) return NextResponse.json({ ok: false, error: "API_KEY_INVALID" }, { status: 400 });
    return NextResponse.json({ ok: false, error: `GEMINI_HTTP_${r.status}:${t.slice(0, 200)}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
