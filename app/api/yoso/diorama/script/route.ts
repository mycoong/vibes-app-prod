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
You are "AI Studio Script Generator" for Vibes App (YosoApp internal).

Return ONLY valid JSON. No markdown. No explanations. No code fences.

The JSON structure MUST be EXACTLY:
{
  "cta": "...",
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

ABSOLUTE RULES (NO EXCEPTIONS):
- Total scenes MUST be exactly 9.
- Every field must exist and be a non-empty string.
- Do NOT include extra keys.
- Do NOT use character names (NO "Budi", "Pak X", "si A", etc).
- The 9 narratives MUST be ONE continuous story: scene-1 starts the story, scene-9 closes it.
  Each scene continues the previous one (use connectors like "Lalu", "Di situ", "Sementara itu", "Akhirnya").
  No standalone one-liners per scene.
- Narrative language: Indonesian, tegas, bercerita, enak didengar (bukan puisi/pantun), anti-lebay, tidak puitis.
- Narrative must feel like "fakta unik dikemas cerita", bukan dongeng.
- Duration target for the WHOLE 9-scene narration: 35–50 seconds voiceover.
  => Keep total length around 140–190 words Indonesian (approx), spread across 9 scenes naturally.
- Hook is mandatory: scene-1 must open with a strong curiosity hook in 1–2 sentences.
- Closing is mandatory: scene-9 must land the point (payoff) and naturally lead into CTA.

CTA HARD RULES (HALUS, TANPA PART 2):
- Output "cta" MUST be Indonesian.
- CTA must be short (1–2 sentences), halus, natural, tegas, tidak lebay, tanpa emoji, tanpa "part 2".
- Must include BOTH actions: FOLLOW and KOMEN.
- Must relate to the story naturally (match the ending/punchline), not generic marketing.
- Comment instruction should be context-based (e.g., ask opinion/keyword tied to story), not "lanjut/part 2".
  Examples (do NOT copy verbatim):
  - "Kalau kamu suka gaya cerita fakta seperti ini, follow. Menurutmu bagian paling bikin merinding yang mana? Tulis di komentar."
  - "Follow biar kamu nggak ketinggalan cerita fakta berikutnya. Kalau kamu pernah dengar versi lain, tulis di komentar."

IMAGE PROMPT STYLE (FOR GOOGLE WHISK / IMAGE MODEL):
Goal: cinematic hyperreal scene that LOOKS like miniature via strong tilt-shift illusion,
NOT a toy/figurine/model on a base.

imagePromptA and imagePromptB must be ENGLISH and must:
- Use square composition 1:1.
- Force MEDIUM-WIDE or WIDE shot only (NO close-up portraits).
- Force strong tilt-shift lens illusion (hard tilt-shift).
- Look like real cinematic photography with atmospheric depth (volumetric light, haze, layered foreground/mid/background).
- Realistic textures and imperfections: wood grain, stone, rust, moss, wet dirt, fabric weave, scratches, dust, water specular, etc.
- Crowd of small-scale humans allowed, but they must look like real people photographed (not dolls).
- NO toy look, NO plastic, NO CGI render look.

NEGATIVE (must be embedded in prompt):
- MUST strongly ban: toy, figurine, doll, action figure, scale model, miniature model, diorama base, platform, stand, pedestal,
  plastic sheen, CGI, render, 3D, cartoon, illustration, anime, game asset.
- MUST ban "close-up", "macro product shot", "studio backdrop".

VIDEO PROMPT:
- ENGLISH, 1–2 sentences.
- Cinematic camera movement (push-in, crane, tracking).
- Must match the same scene as image prompts, no close-up.

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
   Helpers: strict validation
========================================================= */
function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidScene(s: any) {
  return (
    s &&
    isNonEmptyString(s.id) &&
    isNonEmptyString(s.narrative) &&
    isNonEmptyString(s.imagePromptA) &&
    isNonEmptyString(s.imagePromptB) &&
    isNonEmptyString(s.videoPrompt)
  );
}

/* =========================================================
   Route
========================================================= */
export async function GET() {
  return json(
    {
      ok: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST with JSON body: { topic, style, format, audience, genre, template, apiKeys[] }",
    },
    405
  );
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
    keys = [body?.apiKey1, body?.apiKey2, body?.apiKey3, body?.apiKey4, body?.apiKey5]
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

  const jsonData = result.json;

  if (!jsonData || typeof jsonData !== "object") {
    return json(
      { ok: false, error: "JSON_INVALID", raw: result.text?.slice(0, 2000) },
      500
    );
  }

  const cta = jsonData?.cta;
  const scenes = jsonData?.scenes;

  if (!isNonEmptyString(cta)) {
    return json(
      { ok: false, error: "CTA_MISSING_OR_INVALID", raw: jsonData },
      500
    );
  }

  if (!Array.isArray(scenes)) {
    return json(
      { ok: false, error: "SCENES_NOT_ARRAY", raw: jsonData },
      500
    );
  }

  if (scenes.length !== 9) {
    return json(
      { ok: false, error: "SCENES_COUNT_INVALID", count: scenes.length, raw: jsonData },
      500
    );
  }

  for (const [i, s] of scenes.entries()) {
    if (!isValidScene(s)) {
      return json(
        { ok: false, error: "SCENE_FIELD_INVALID", index: i, raw: s },
        500
      );
    }
  }

  return json({
    ok: true,
    cta,
    scenes,
    meta: { topic, style, format, audience, genre, template },
    usedKeyIndex: result.usedKeyIndex,
  });
}
