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
   Prompt builder (LOCKED narrative + image style)
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
You are a professional Indonesian short documentary scriptwriter.

Return ONLY valid JSON. No markdown. No explanation.

JSON format:
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

HARD RULES (MANDATORY):
- Must output EXACTLY 9 scenes.
- Every field must be non-empty string.
- All 9 narratives MUST form ONE continuous story (not separate thoughts).
- Tone: Indonesian, tegas, natural, seperti storyteller dokumenter.
- NO poetry. NO lebay. NO hyperbole. NO drama berlebihan.
- NO fictional random names (no "Budi", no invented characters).
- Content must feel like factual storytelling / factual narrative.
- Total narrative length across all scenes: 100–140 words (≈35–50 sec VO).
- Each scene narrative should feel like continuation, not standalone sentence.

CTA RULE (SCENE 9 ONLY):
- Must include subtle CTA in last narrative:
  - Invite to follow AND comment naturally.
  - Example style: "Kalau kamu pernah dengar versi lain, tulis di komentar."
  - No "part 2", no marketing tone, no pushy CTA.

IMAGE PROMPT LOCK (ENGLISH ONLY):
Every imagePromptA and imagePromptB MUST strictly follow this style:

CINEMATIC PHOTOREALISTIC MINIATURE DIORAMA STYLE:
- photorealistic miniature world, ultra-detailed physical textures (moss, dirt, stone, cracked wood, fabric, water surface)
- strong tilt-shift effect (hard depth of field, miniature illusion)
- wide or medium-wide framing ONLY (no close-up, no portrait)
- tiny human figures allowed ONLY if they appear small in environment
- cinematic natural lighting, atmospheric haze, volumetric light
- documentary photography look, not fantasy art, not illustration

STRICTLY FORBIDDEN in image:
- no toy look
- no plastic look
- no doll face
- no visible base
- no pedestal
- no stand
- no human hands
- no CGI render look
- no close-up face
- no portrait photography
- no macro of faces

VIDEO PROMPT RULE:
- English
- 1–2 sentences only
- Must describe cinematic camera movement (push-in, slow pan, crane, tracking, drift)
- Must match the scene narrative

CONTEXT:
topic: ${topic}
style: ${style}
format: ${format}
audience: ${audience}
genre: ${genre}
template: ${template}

Now generate the JSON.
`.trim();
}

/* =========================================================
   Route
========================================================= */
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

  const missing = [];
  if (!topic) missing.push("topic");
  if (!style) missing.push("style");
  if (!format) missing.push("format");
  if (!audience) missing.push("audience");
  if (!genre) missing.push("genre");
  if (!template) missing.push("template");

  if (missing.length) {
    return json({ ok: false, error: "MISSING_FIELDS", missing }, 400);
  }

  /* =====================================================
     API Keys
  ===================================================== */
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
      {
        ok: false,
        error: "API_KEY_MISSING",
        message: "apiKeys[] or apiKey1..apiKey5 must be provided",
      },
      400
    );
  }

  /* =====================================================
     Build Prompt
  ===================================================== */
  const prompt = buildPrompt({
    topic,
    style,
    format,
    audience,
    genre,
    template,
  });

  const result = await callGeminiWithRotation({
    keys,
    prompt,
  });

  if (!result.ok) {
    return json(
      { ok: false, error: result.error, raw: result.raw },
      500
    );
  }

  /* =====================================================
     Validate JSON
  ===================================================== */
  const jsonData = result.json;

  if (!jsonData || typeof jsonData !== "object") {
    return json(
      { ok: false, error: "JSON_INVALID", raw: result.text?.slice(0, 2000) },
      500
    );
  }

  const scenes = jsonData?.scenes;

  if (!Array.isArray(scenes)) {
    return json(
      { ok: false, error: "SCENES_NOT_ARRAY", raw: jsonData },
      500
    );
  }

  if (scenes.length !== 9) {
    return json(
      { ok: false, error: "SCENES_COUNT_INVALID", count: scenes.length },
      500
    );
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
      return json(
        { ok: false, error: "SCENE_FIELD_INVALID", index: i },
        500
      );
    }
  }

  return json({
    ok: true,
    scenes,
    meta: { topic, style, format, audience, genre, template },
    usedKeyIndex: result.usedKeyIndex,
  });
}
