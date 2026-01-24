import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  apiKeys?: string[];
  text?: string;
  voiceName?: string; // optional
};

function cleanKeys(keys: any): string[] {
  if (!Array.isArray(keys)) return [];
  return keys.map((k) => String(k || "").trim()).filter(Boolean);
}

function pickText(v: any): string {
  return String(v || "").trim();
}

async function ttsWithKey(apiKey: string, text: string, voiceName: string) {
  const ai = new GoogleGenAI({ apiKey });

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [
      {
        parts: [
          {
            text:
              `Bawakan narasi dokumenter sejarah ini sebagai KARAKTER ALGENIB ` +
              `(Vokal Wanita yang cerdas, bersemangat, dan berwibawa). ` +
              `Gaya bicara harus LUGAS, MENGALUN, dan TIDAK HIPERBOLA. ` +
              `Suara antusias namun tetap tenang, dengan intonasi mengalir. ` +
              `Teks Narasi: ${text}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const audioBase64 =
    res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";

  if (!audioBase64) {
    throw new Error("EMPTY_AUDIO");
  }

  return audioBase64;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const apiKeys = cleanKeys(body.apiKeys);
    const text = pickText(body.text);
    const voiceName = String(body.voiceName || "Algenib").trim() || "Algenib";

    if (!apiKeys.length) {
      return NextResponse.json(
        { ok: false, error: "API_KEY_MISSING" },
        { status: 400 }
      );
    }
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "TEXT_EMPTY" },
        { status: 400 }
      );
    }

    let lastErr: any = null;

    for (const key of apiKeys) {
      try {
        const audioBase64 = await ttsWithKey(key, text, voiceName);
        return NextResponse.json({
          ok: true,
          audioBase64,
          audioMime: "audio/L16;rate=24000",
          voiceName,
        });
      } catch (e: any) {
        lastErr = e;
        continue;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "ALL_KEYS_FAILED",
        detail: String(lastErr?.message || lastErr || "UNKNOWN"),
      },
      { status: 500 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", detail: String(e?.message || e) },
      { status: 400 }
    );
  }
}
