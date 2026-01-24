import { NextResponse } from "next/server";

type Body = {
  apiKeys: string[];
  style: string;
  format: string;
  audience: string;
  genre: string;
  template: string;
};

function pickKey(keys: string[], i: number) {
  const k = String(keys[i % keys.length] || "").trim();
  return k;
}

async function callGemini(apiKey: string, prompt: string) {
  // best-effort endpoint (sesuai key kamu)
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
    encodeURIComponent(apiKey);

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 120,
      },
    }),
  });

  const j = await r.json();
  if (!r.ok) {
    const msg = j?.error?.message || "GEMINI_CALL_FAILED";
    throw new Error(msg);
  }

  const text =
    j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") || "";

  return String(text).trim();
}

function extractOneLineTopic(s: string) {
  const t = String(s || "").trim();
  if (!t) return "";
  const line = t.split("\n").map((x) => x.trim()).filter(Boolean)[0] || "";
  return line.replace(/^[-•*\d.]+\s*/, "").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const apiKeys = Array.isArray(body?.apiKeys) ? body.apiKeys.map((x) => String(x).trim()).filter(Boolean) : [];
    if (!apiKeys.length) return NextResponse.json({ ok: false, error: "API_KEY_MISSING" }, { status: 400 });

    const style = String(body?.style || "SEJARAH_PERJUANGAN");
    const format = String(body?.format || "SHORT");
    const audience = String(body?.audience || "LOCAL");
    const genre = String(body?.genre || "DRAMA");
    const template = String(body?.template || "VIRAL_DRAMA");

    const prompt = [
      "Buat 1 ide topik super menarik untuk diorama sejarah/legenda Indonesia.",
      "Syarat:",
      `- Kategori: ${style}`,
      `- Format: ${format}`,
      `- Audience: ${audience}`,
      `- Genre: ${genre}`,
      `- Template: ${template}`,
      "- Output: 1 baris saja, tanpa tanda kutip, tanpa bullet.",
      "- Harus spesifik (lokasi + waktu + konflik/rahasia) dan terdengar viral.",
      "",
      "Contoh gaya (JANGAN COPY PERSIS):",
      "Pertempuran rahasia di hutan Banten 1947 yang tak pernah dicatat",
      "Legenda pasar gaib di pesisir Jawa saat bulan gelap",
    ].join("\n");

    let lastErr = "";
    for (let i = 0; i < Math.min(apiKeys.length, 5); i++) {
      try {
        const key = pickKey(apiKeys, i);
        const out = await callGemini(key, prompt);
        const topic = extractOneLineTopic(out);
        if (topic) return NextResponse.json({ ok: true, topic });
      } catch (e: any) {
        lastErr = String(e?.message || e);
      }
    }

    return NextResponse.json({ ok: false, error: lastErr || "ALL_KEYS_FAILED" }, { status: 429 });
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }
}
