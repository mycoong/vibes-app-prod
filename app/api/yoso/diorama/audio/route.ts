import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* =========================
   STYLE PROMPTS (LOCKED)
========================= */

const STYLE_FEMALE = `
Bawakan narasi sebagai NARATOR PEREMPUAN profesional.
Gaya bicara hangat, tenang, dan percaya diri.
Intonasi mengalun rapi, jelas, dan mudah dipahami.
Penekanan halus pada fakta penting dan momen menarik.
Tempo sedang, tidak terburu-buru, tidak dramatis berlebihan.
Artikulasi jelas, pelafalan bahasa Indonesia baku.
`.trim();

const STYLE_MALE = `
Bawakan narasi sebagai NARATOR LAKI-LAKI dokumenter.
Gaya bicara tegas, mantap, dan berwibawa.
Nada suara rendah-menengah, stabil, tidak emosional berlebihan.
Tempo sedikit lebih cepat dari normal, fokus pada kejelasan fakta.
Penekanan kuat pada detail sejarah dan fakta penting.
Intonasi lurus dan serius, seperti dokumenter sejarah televisi.
`.trim();

const CTA_VARIANTS = [
  "Bagaimana pendapatmu tentang peristiwa ini?",
  "Menurutmu, apa hal paling menarik dari cerita ini?",
  "Kamu bisa berbagi pandanganmu tentang kisah ini di kolom komentar.",
];

function pickCTA() {
  return CTA_VARIANTS[Math.floor(Math.random() * CTA_VARIANTS.length)];
}

/**
 * REAL VOICE SWITCH:
 * - Try voice candidates for the selected gender.
 * - If a voice is not supported, fall back to the next.
 * - If all fail, fall back to a safe default.
 */
const FEMALE_VOICES = ["Algenib", "Aoede", "Callisto", "Nashira", "Sirius"];
const MALE_VOICES = ["Orion", "Puck", "Achernar", "Rigel", "Vega"];

/* =========================
   HELPERS
========================= */

function normalizeKeys(apiKeys: any): string[] {
  if (!Array.isArray(apiKeys)) return [];
  return apiKeys.map((k) => String(k || "").trim()).filter(Boolean);
}

function isExhausted(status: number, body: string) {
  return status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(body || "");
}

function isVoiceUnsupported(status: number, body: string) {
  const t = String(body || "");
  return (
    status === 400 &&
    /voiceName|voice config|voice/i.test(t) &&
    /invalid|unknown|not found|unsupported|unrecognized|does not exist/i.test(t)
  );
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/* =========================
   MAIN HANDLER
========================= */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const text = String(body?.text || "").trim();
    const voice = body?.voice === "male" ? "male" : "female";
    const apiKeys = normalizeKeys(body?.apiKeys);

    if (!text) return NextResponse.json({ ok: false, error: "TEXT_EMPTY" }, { status: 400 });
    if (!apiKeys.length) return NextResponse.json({ ok: false, error: "API_KEYS_MISSING" }, { status: 400 });

    const stylePrompt = voice === "male" ? STYLE_MALE : STYLE_FEMALE;
    const cta = pickCTA();

    const finalText = `
${stylePrompt}

ATURAN CTA:
- Gunakan SATU kalimat penutup.
- HANYA ajakan komentar ringan.
- Jangan menyebut simpan, follow, like, subscribe.

SCRIPT:
${text}

PENUTUP:
${cta}
`.trim();

    const candidates = voice === "male" ? MALE_VOICES : FEMALE_VOICES;

    const startKey = Date.now() % apiKeys.length;
    let lastErrText = "";

    for (let ki = 0; ki < apiKeys.length; ki++) {
      const key = apiKeys[(startKey + ki) % apiKeys.length];

      for (let vi = 0; vi < candidates.length; vi++) {
        const voiceName = candidates[vi];

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(
            key
          )}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: finalText }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName,
                    },
                  },
                },
              },
            }),
          }
        );

        const raw = await res.text().catch(() => "");
        lastErrText = raw || lastErrText;

        if (isExhausted(res.status, raw)) {
          break; // rotate key
        }

        if (isVoiceUnsupported(res.status, raw)) {
          continue; // try next voice
        }

        if (!res.ok) {
          return NextResponse.json(
            {
              ok: false,
              error: `TTS_FAILED_${res.status}`,
              detail: raw.slice(0, 260),
              voiceRequested: voice,
              voiceTried: voiceName,
            },
            { status: 400 }
          );
        }

        const json = safeJsonParse(raw) || {};
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const audio = parts.find((p: any) => p?.inlineData?.data);

        if (!audio?.inlineData?.data) {
          return NextResponse.json(
            { ok: false, error: "NO_AUDIO_RETURNED", voiceRequested: voice, voiceTried: voiceName },
            { status: 400 }
          );
        }

        return NextResponse.json({
          ok: true,
          audioBase64: audio.inlineData.data,
          audioMime: audio.inlineData.mimeType || "audio/wav",
          voice,
          voiceNameUsed: voiceName,
          cta,
        });
      }
    }

    // last resort fallback
    const key = apiKeys[startKey];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(
        key
      )}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: finalText }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Algenib",
                },
              },
            },
          },
        }),
      }
    );

    const raw = await res.text().catch(() => "");
    lastErrText = raw || lastErrText;

    if (res.ok) {
      const json = safeJsonParse(raw) || {};
      const parts = json?.candidates?.[0]?.content?.parts || [];
      const audio = parts.find((p: any) => p?.inlineData?.data);
      if (audio?.inlineData?.data) {
        return NextResponse.json({
          ok: true,
          audioBase64: audio.inlineData.data,
          audioMime: audio.inlineData.mimeType || "audio/wav",
          voice,
          voiceNameUsed: "Algenib",
          cta,
          fallback: true,
        });
      }
    }

    return NextResponse.json(
      { ok: false, error: "TTS_ALL_FAILED", detail: String(lastErrText).slice(0, 260) },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "TTS_ERROR" }, { status: 500 });
  }
}
