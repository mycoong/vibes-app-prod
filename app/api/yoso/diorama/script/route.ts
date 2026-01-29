import { NextResponse } from "next/server";
import { callGeminiWithRotation } from "../../../../../lib/geminiService";

export const runtime = "nodejs";

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/* =========================================================
   Prompt builder (strict JSON contract)
========================================================= */
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

Return ONLY valid JSON. No markdown. No explanations.

Output structure:
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

GLOBAL RULES:
- Exactly 9 scenes.
- All fields must be non-empty strings.
- Content must be BASED ON REALISTIC FACTUAL INFORMATION (history, phenomena, real events).
- DO NOT invent fictional characters.
- DO NOT use personal names unless they are real historical figures.

NARRATIVE STYLE RULES:
- Language: Indonesian.
- Format: fakta unik dikemas sebagai cerita mengalir.
- Tone: natural, informatif, seperti storyteller konten edukasi.
- No puisi.
- No lebay.
- No drama berlebihan.
- No dialog fiktif.
- Total durasi seluruh narasi (9 scene): 35–50 detik (~110–140 kata).
- Scene 1: strong hook berbasis fakta yang bikin penasaran.
- Scene 2–8: jelaskan fakta secara runtut dan menarik.
- Scene 9: penutup natural + CTA.

ABSOLUTE PROHIBITIONS:
- Do NOT create fictional people (e.g., "Budi", "Andi", "seorang pemuda", dll).
- Do NOT write like short story or novel.
- Must feel like factual storytelling.

CTA RULES:
- Scene 1–8: must NOT contain words: follow, komen, komentar, part 2.
- Scene 9: MUST contain follow, komen, and part 2.
- CTA must be the LAST sentence of scene 9.

IMAGE PROMPT RULES (LOCKED DIORAMA LOOK):
- imagePromptA/B must be in ENGLISH.
- Style: cinematic hyperreal miniature photography that feels like real world, not toy.
- Must use: STRONG tilt-shift lens, shallow depth of field, miniature scale illusion.
- Framing: medium-wide or wide framing, NOT close-up portraits.
- Lighting: cinematic realistic, volumetric.
- Textures: dust, rust, weathered surfaces, real materials.

NEGATIVE (must explicitly avoid):
toy, plastic, figurine, action figure, dollhouse, display stand, base platform, support rod, visible seam, CGI render, cartoon, illustration, fake miniature.

VIDEO PROMPT:
- English.
- 1–2 sentences.
- Must describe cinematic camera movement.

Context:
topic: ${topic}
style: ${style}
format: ${format}
audience: ${audience}
genre: ${genre}
template: ${template}

Return JSON only.
`.trim();
}

/* =========================================================
   Route: support GET + POST to avoid 405
========================================================= */
export async function GET() {
  return json({
    ok: true,
    message: "OK. Use POST with {topic, style, format, audience, genre, template, apiKeys[]} to generate scenes.",
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

  // Accept API keys from body
  let keys: string[] = [];
  if (Array.isArray(body?.apiKeys)) {
    keys = body.apiKeys.map((k: any) => String(k || "").trim()).filter(Boolean);
  } else {
    keys = [body?.apiKey1, body?.apiKey2, body?.apiKey3, body?.apiKey4, body?.apiKey5]
      .map((k: any) => String(k || "").trim())
      .filter(Boolean);
  }

  if (!keys.length) {
    return json(
      { ok: false, error: "API_KEY_MISSING", message: "apiKeys[] or apiKey1..apiKey5 must be provided" },
      400
    );
  }

  const prompt = buildPrompt({ topic, style, format, audience, genre, template });

  const result = await callGeminiWithRotation({ keys, prompt });

  if (!result.ok) {
    return json({ ok: false, error: result.error, raw: result.raw }, 500);
  }

  const jsonData = result.json;

  if (!jsonData || typeof jsonData !== "object") {
    return json({ ok: false, error: "JSON_INVALID", raw: result.text?.slice(0, 2000) }, 500);
  }

  const scenes = jsonData?.scenes;

  if (!Array.isArray(scenes)) {
    return json({ ok: false, error: "SCENES_NOT_ARRAY", raw: jsonData }, 500);
  }

  if (scenes.length !== 9) {
    return json({ ok: false, error: "SCENES_COUNT_INVALID", count: scenes.length, raw: jsonData }, 500);
  }

  for (const [i, s] of scenes.entries()) {
    if (
      !s ||
      typeof s.id !== "string" ||
      typeof s.narrative !== "string" ||
      typeof s.imagePromptA !== "string" ||
      typeof s.imagePromptB !== "string" ||
      typeof s.videoPrompt !== "string"
    ) {
      return json({ ok: false, error: "SCENE_FIELD_INVALID", index: i, raw: s }, 500);
    }
  }

  return json({
    ok: true,
    scenes,
    meta: { topic, style, format, audience, genre, template },
    usedKeyIndex: result.usedKeyIndex,
  });
}
