import { NextResponse } from "next/server";

export const runtime = "nodejs";

function pickKey(apiKeys: any): string {
  if (Array.isArray(apiKeys)) {
    const k = apiKeys.map((x) => String(x || "").trim()).filter(Boolean);
    return k[0] || "";
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const apiKey = pickKey(body?.apiKeys);
    const text = String(body?.text || "").trim();

    if (!apiKey) return NextResponse.json({ ok: false, error: "API_KEY_MISSING" }, { status: 400 });
    if (!text) return NextResponse.json({ ok: false, error: "TEXT_MISSING" }, { status: 400 });

    const prompt = `Bawakan narasi dokumenter sejarah ini sebagai KARAKTER ALGENIB (Vokal Wanita yang cerdas, bersemangat, dan berwibawa).
Gaya bicara harus LUGAS, MENGALUN, dan TIDAK HIPERBOLA.
Suara antusias namun tetap tenang, menunjukkan penguasaan materi sejarah.
Fokus intonasi mengalir lancar, beri penekanan pada momen penting tanpa rima dipaksakan.
Teks Narasi: ${text}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Algenib" },
            },
          },
        },
      }),
    });

    if (r.status === 429) return NextResponse.json({ ok: false, error: "RESOURCE_EXHAUSTED" }, { status: 429 });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `GEMINI_HTTP_${r.status}:${t.slice(0, 240)}` }, { status: 400 });
    }

    const j = await r.json().catch(() => ({} as any));
    const partsOut = j?.candidates?.[0]?.content?.parts || [];
    const inline = partsOut.find((p: any) => p?.inlineData?.data);

    if (!inline?.inlineData?.data) return NextResponse.json({ ok: false, error: "NO_AUDIO_RETURNED" }, { status: 400 });

    return NextResponse.json({
      ok: true,
      audioMime: String(inline.inlineData.mimeType || "audio/wav"),
      audioBase64: String(inline.inlineData.data),
      voice: "Algenib",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "AUDIO_ERROR" }, { status: 500 });
  }
}
