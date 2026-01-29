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

  // === Hard lock cinematic diorama style (anti-toy) ===
  const DIORAMA_LOCK = `
STYLE LOCK (MUST FOLLOW):
- Cinematic hyperrealistic miniature diorama photography (practical miniature set), NOT CGI.
- Looks like a real film set built as a physical scale model (museum-quality).
- Macro lens realism + cinematic lighting + film color grading.
- Tilt-shift depth of field: shallow DOF but main subject remains sharp and readable.

ANTI-TOY HARD RULES (NEVER DO):
- No toy look, no plastic look, no doll faces, no cartoon, no clay.
- No figurine bases, no display stands, no museum labels, no price tags.
- No visible table surface, no human hands, no behind-the-scenes.
- No LEGO, no papercraft, no action-figure vibe, no overly clean surfaces.

TEXTURE LOCK:
- Must show micro-textures: dust, scratches, chipped paint, weathering, moss, mud, worn wood grain, fabric fibers, stone pores.
- Realistic imperfections and grime (period-appropriate), not smooth/sterile.

CAMERA / LIGHT LOCK:
- Cinematic lighting (golden hour / rim light / dramatic shadows / volumetric light if relevant).
- High-end cinema camera feel, realistic contrast, natural highlights.
`.trim();

  return `
You are "AI Studio Script Generator" for YosoApp (Vibes App).

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

ABSOLUTE RULES (DO NOT BREAK):
- Total scenes MUST be exactly 9.
- Every field must exist and be non-empty string.
- Output must be STRICT JSON only.

NARRATIVE STYLE RULES (IMPORTANT):
- Language: Indonesian.
- Must read like a NATURAL STORY, not poetry, not pantun, not puitis.
- No over-embellished wording. Avoid flowery metaphors. Avoid "menggema di relung" type lines.
- Each scene narrative: 2–4 short paragraphs OR 4–7 sentences max. Clear, straightforward, cinematic but grounded.
- Make all 9 scenes one continuous story arc (same timeline, consistent characters/places).
- Scene-to-scene continuity: each scene should reference what just happened before (cause→effect).
- High hook in scene-1: start with a strong immediate situation/question/reveal in 1–2 sentences.
- Build tension across scenes 2–8, resolve in scene-9.

CTA HARD RULES (MUST FOLLOW):
- CTA ONLY appears in scene-9 narrative (last 2–3 sentences).
- Scenes 1–8: NO CTA, NO "follow", NO "komen", NO "like", NO "subscribe", NO "share", NO "lonceng", NO "tag teman".
- Scene-9 CTA must be NATURAL and not cringe:
  - Ask viewer to comment their opinion/teori/pertanyaan about the story.
  - Ask to follow for part lanjutan / cerita serupa.
  - Keep CTA short (max 2–3 sentences).
  - Do NOT mention "CTA" word.

IMAGE PROMPT RULES:
- imagePromptA/B must be ENGLISH.
- Must follow the DIORAMA_LOCK below.
- Must NOT look like a toy.
- Must be historical miniature diorama, crowded tiny figures when appropriate, practical textures.
- Ensure no "stand under feet" / "base plate" / "model display".
- Provide concrete details: location, time of day, weather, props, clothing, environment materials.
- Keep prompts focused and visual, no long narration.

VIDEO PROMPT RULES:
- videoPrompt must be ENGLISH, 1–2 sentences only.
- Must describe cinematic camera movement (push-in, tracking, crane, slow pan) + what is revealed.

Context:
topic: ${topic}
style: ${style}
format: ${format}
audience: ${audience}
genre: ${genre}
template: ${template}

GLOBAL VISUAL STYLE (apply to every imagePromptA/B):
${DIORAMA_LOCK}

SCENE DESIGN (9 panels):
- Each scene must include:
  - narrative: story beat
  - imagePromptA: SETUP shot for that scene (wide/establishing or key action start)
  - imagePromptB: CLIMAX shot for that scene (tension peak / consequence / reveal)
  - videoPrompt: camera move describing the best shot of the scene

Now output JSON only with exactly 9 scenes.
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
    if (!s.id.trim() || !s.narrative.trim() || !s.imagePromptA.trim() || !s.imagePromptB.trim() || !s.videoPrompt.trim()) {
      return json({ ok: false, error: "SCENE_FIELD_EMPTY", index: i, raw: s }, 500);
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
