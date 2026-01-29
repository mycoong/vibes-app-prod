import { NextResponse } from "next/server";
import { callGeminiWithRotation } from "../../../../../lib/geminiService";

export const runtime = "nodejs";

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function buildPrompt(input: {
  topic: string;
  style: string;
  format: string;
  audience: string;
  genre: string;
  template: string;
}) {
  const { topic, style, format, audience, genre, template } = input;

  return `
You are "YosoApp Fact Story Generator".

Return ONLY valid JSON. No markdown. No explanation.

JSON FORMAT:
{
  "scenes": [
    {
      "id": "scene-1",
      "narrative": "...",
      "imagePromptA": "...",
      "imagePromptB": "...",
      "videoPrompt": "..."
    }
    ... exactly 9 scenes
  ]
}

================================================
NARRATION RULES (VERY IMPORTANT)
================================================
Language: Indonesian

Style:
- Fakta nyata dikemas seperti storyteller edukatif
- Mengalir seperti orang bercerita (bukan potongan kalimat kaku)
- Tidak puitis
- Tidak lebay
- Tidak drama
- Tidak sok misterius
- Tidak seperti membaca artikel
- Harus terdengar natural kalau dibacakan voice over

Length:
- Total 9 scene ≈ 150–190 kata total
- Setara ±45–60 detik voice over
- Scene tidak boleh terlalu pendek (min 14 kata rata-rata)

Structure:
Scene 1: Hook fakta kuat, bikin penasaran
Scene 2–8: Cerita faktual mengalir, edukatif, tetap ringan
Scene 9: Penutup natural + CTA

CTA RULES:
- Scene 1–8: TIDAK BOLEH ada kata follow, komen, komentar, part 2
- Scene 9: WAJIB mengandung:
  - kata "follow"
  - kata "komen"
  - kata "part 2"
- CTA harus tetap natural, tidak maksa

ABSOLUTE PROHIBITIONS:
- Jangan bikin karakter fiktif (Budi, Andi, seorang pria, dll)
- Jangan pakai gaya cerpen
- Jangan buat dialog imajiner
- Semua harus berbasis fakta

================================================
IMAGE PROMPT RULES (LOCKED STYLE)
================================================
imagePromptA dan imagePromptB harus bahasa Inggris.

STYLE VISUAL (WAJIB):
- Cinematic hyperreal miniature photography
- Looks like real world captured with tilt-shift lens
- Strong tilt-shift effect
- Shallow depth of field
- Ultra realistic textures
- Cinematic lighting
- Atmospheric realism
- No CGI look
- No illustration
- No cartoon

FRAMING:
- Medium-wide or wide shot only
- NO close-up portraits
- NO extreme close framing
- Must feel like observing a miniature world from distance

FORMAT:
- Composition optimized for Instagram square (1:1 aspect ratio)
- Balanced center framing
- Subject must fit naturally inside square crop

STRICTLY FORBIDDEN WORDS:
toy, plastic, figurine, doll, dollhouse, action figure,
display base, stand, platform, support rod,
CGI, render, illustration, cartoon, fake miniature

PROMPT MUST EXPLICITLY INCLUDE:
- "shot on tilt-shift lens"
- "cinematic lighting"
- "hyperreal miniature environment"
- "square composition, 1:1 aspect ratio"
- "no visible base, no support, no toy look"

VIDEO PROMPT:
- English
- 1–2 sentences
- Must describe cinematic camera movement (slow dolly, pan, parallax, depth)

================================================
CONTEXT
================================================
topic: ${topic}
style: ${style}
format: ${format}
audience: ${audience}
genre: ${genre}
template: ${template}

Return JSON only.
`.trim();
}

export async function GET() {
  return json({
    ok: true,
    message: "OK. Use POST with valid payload to generate scenes.",
  });
}

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const topic = String(body?.topic || "").trim();
  const style = String(body?.style || "").trim();
  const format = String(body?.format || "").trim();
  const audience = String(body?.audience || "").trim();
  const genre = String(body?.genre || "").trim();
  const template = String(body?.template || "").trim();

  const missing: string[] = [];
  if (!topic) missing.push("topic");
  if (!style) missing.push("style");
  if (!format) missing.push("format");
  if (!audience) missing.push("audience");
  if (!genre) missing.push("genre");
  if (!template) missing.push("template");

  if (missing.length) {
    return json({ ok: false, error: "MISSING_FIELDS", missing }, 400);
  }

  let keys: string[] = [];
  if (Array.isArray(body?.apiKeys)) {
    keys = body.apiKeys.map((k: any) => String(k || "").trim()).filter(Boolean);
  } else {
    keys = [
      body?.apiKey1,
      body?.apiKey2,
      body?.apiKey3,
      body?.apiKey4,
      body?.apiKey5,
    ]
      .map((k: any) => String(k || "").trim())
      .filter(Boolean);
  }

  if (!keys.length) {
    return json(
      { ok: false, error: "API_KEY_MISSING" },
      400
    );
  }

  const prompt = buildPrompt({ topic, style, format, audience, genre, template });

  const result = await callGeminiWithRotation({ keys, prompt });

  if (!result.ok) {
    return json({ ok: false, error: result.error, raw: result.raw }, 500);
  }

  const data = result.json;

  if (!data || !Array.isArray(data.scenes)) {
    return json({ ok: false, error: "INVALID_JSON", raw: data }, 500);
  }

  if (data.scenes.length !== 9) {
    return json({ ok: false, error: "SCENE_COUNT_INVALID", count: data.scenes.length }, 500);
  }

  return json({
    ok: true,
    scenes: data.scenes,
    meta: { topic, style, format, audience, genre, template },
  });
}
