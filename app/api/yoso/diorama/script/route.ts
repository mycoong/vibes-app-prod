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
You are "AI Studio Script Generator" for Vibes App (YosoApp legacy).

Return ONLY valid JSON. No markdown. No explanations. No code fences.

The JSON structure MUST be:
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

HARD RULES (MUST FOLLOW):
- Total scenes MUST be exactly 9.
- Every field must exist and be non-empty string.
- Output MUST feel like ONE connected story across 9 scenes (scene-1 -> scene-9).
- Narrative language: Indonesian, natural storytelling, not poetic, not pantun, not lebay.
- TOTAL narration across 9 scenes MUST be 85–120 Indonesian words (target 35–50 seconds voiceover).
- Scene-1 MUST be a high-hook opener (12–22 words). Make people instantly curious.
- Scene-2..Scene-8 MUST be short story beats (8–14 words each). Keep it direct.
- Scene-9 MUST contain a CTA at the END ONLY (HARD RULE):
  - Must include BOTH: "follow" and "komen"
  - CTA must be 10–18 words, natural, not salesy.
  - CTA MUST NOT appear in scene-1..scene-8.

IMAGE PROMPT HARD RULES (WHISK READY):
- imagePromptA/B MUST be ENGLISH.
- Style MUST be: cinematic miniature diorama that looks REAL (not toy-looking).
- ALWAYS WIDE / ESTABLISHING DIORAMA SHOT: full set visible, tiny figures visible head-to-toe.
- FORBIDDEN: close-up portraits, face closeup, extreme closeup, headshot, tight framing, single-person close-up, macro portrait.
- MUST include strong tilt-shift look with a very shallow focus plane, heavy bokeh, miniature scale illusion.
- MUST look like a handcrafted physical set with authentic materials: weathered wood, cloth fibers, dust, patina, scratches, chipped paint, mud, stone grains.
- MUST NOT show toy stands, support rods, display bases, transparent supports, foot stands, doll joints, plastic shine, action-figure seams.
- MUST NOT look like CGI / 3D render / game asset.
- Lighting: cinematic, moody documentary lighting, volumetric haze optional, realistic shadows.
- Composition: wide diorama table/set perspective, small human figures, environment tells the story.

GLOBAL DIORAMA LOCK (append to EVERY imagePromptA/B, word-for-word):
"PHYSICAL MINIATURE DIORAMA SET, WIDE ESTABLISHING SHOT, tiny full-body figures, handcrafted realism, no close-up portrait, no face closeup, no extreme closeup, strong tilt-shift lens effect, very shallow focus plane, heavy bokeh, miniature scale illusion, cinematic documentary lighting, realistic materials (dust, scratches, patina, cloth fibers, wood grain, chipped paint, mud), NOT CGI, NOT 3D render, NOT toy, no plastic shine, no doll joints, no stands, no support rods, no display base, no text, no watermark"

VIDEO PROMPT RULES:
- videoPrompt MUST be ENGLISH, 1 sentence only, cinematic camera move.
- Match the same "wide diorama establishing" constraint (no close-ups).

Context:
topic: ${topic}
style: ${style}
format: ${format}
audience: ${audience}
genre: ${genre}
template: ${template}

Now output JSON only.
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
     Accept API keys from request body (settings page)
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
     Call Gemini
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
      {
        ok: false,
        error: result.error,
        raw: result.raw,
      },
      500
    );
  }

  /* =====================================================
     Validate JSON strictly
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
    return json({ ok: false, error: "SCENES_NOT_ARRAY", raw: jsonData }, 500);
  }

  if (scenes.length !== 9) {
    return json(
      { ok: false, error: "SCENES_COUNT_INVALID", count: scenes.length, raw: jsonData },
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
      return json({ ok: false, error: "SCENE_FIELD_INVALID", index: i, raw: s }, 500);
    }
  }

  /* =====================================================
     Success
  ===================================================== */
  return json({
    ok: true,
    scenes,
    meta: { topic, style, format, audience, genre, template },
    usedKeyIndex: result.usedKeyIndex,
  });
}
