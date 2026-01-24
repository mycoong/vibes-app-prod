import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TTSBody = {
  apiKeys?: unknown;
  text?: unknown;
  model?: unknown;
  voiceName?: unknown;
  style?: unknown;
};

function pickKeys(body: TTSBody): string[] {
  const raw = body?.apiKeys;
  if (!Array.isArray(raw)) return [];

  const out: string[] = [];
  for (const item of raw as unknown[]) {
    const s = String(item ?? "").trim();
    if (s) out.push(s);
  }
  return out;
}

function clampText(t: string, max = 6000) {
  const s = String(t || "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function wavHeader(dataLen: number, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLen, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLen, 40);
  return buffer;
}

async function callGeminiTTS(apiKey: string, model: string, body: unknown) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json: j };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as TTSBody;

    const apiKeys = pickKeys(body);
    if (!apiKeys.length) return NextResponse.json({ ok: false, error: "API_KEY_MISSING" }, { status: 400 });

    const text = clampText(String(body?.text ?? ""), 8000);
    if (!text) return NextResponse.json({ ok: false, error: "TEXT_MISSING" }, { status: 400 });

    const model = String(body?.model ?? "gemini-2.5-flash-preview-tts");
    const voiceName = String(body?.voiceName ?? "Kore");
    const style = String(body?.style ?? "").trim();
    const prompt = style ? `${style}\n\n${text}` : text;

    const reqBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    };

    let lastErr: unknown = null;

    for (const key of apiKeys) {
      const res = await callGeminiTTS(key, model, reqBody);

      if (!res.ok) {
        lastErr = { http: res.status, raw: res.json };
        continue;
      }

      const pcmBase64 =
        (res.json as any)?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ||
        (res.json as any)?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;

      if (!pcmBase64) {
        lastErr = { http: res.status, raw: res.json, error: "NO_AUDIO_DATA" };
        continue;
      }

      const pcm = Buffer.from(String(pcmBase64), "base64");
      const header = wavHeader(pcm.length, 24000, 1, 16);
      const wav = Buffer.concat([header, pcm]);

      const wavBase64 = wav.toString("base64");
      const dataUrl = `data:audio/wav;base64,${wavBase64}`;

      return NextResponse.json({
        ok: true,
        audio: { mimeType: "audio/wav", sampleRate: 24000, channels: 1, dataUrl },
        meta: { model, voiceName },
      });
    }

    return NextResponse.json({ ok: false, error: "TTS_ALL_KEYS_FAILED", detail: lastErr }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "TTS_ROUTE_ERROR", message: String(e?.message || e) }, { status: 500 });
  }
}
