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
   PROMPT BUILDER — FINAL LOCK
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
You are a professional Indonesian documentary storyteller and visual director.

Return ONLY valid JSON. No markdown. No explanation.

JSON structure (MUST be exact):
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

==============================
NARRATIVE HARD RULES
==============================
- MUST output exactly 9 scenes.
- All 9 narratives must form ONE continuous story (scene 2 continues scene 1, etc).
- Language: Indonesian.
- Tone: tegas, natural, seperti storyteller dokumenter.
- Must feel like factual storytelling, not fiction, not poetry.
- No hyperbole, no lebay, no pantun, no puitis.
- NO fictional names (no Budi, no invented characters).
- Total length across all scenes: 100–140 Indonesian words.
- Scene 1 must contain strong hook.
- Scene 9 must contain soft CTA (follow + comment), naturally embedded.

CTA rule:
- Must be subtle and natural.
- Must include BOTH actions: follow and comment.
- No "part 2".
- No marketing tone.
- Example style (do NOT copy literally):
  "Kalau kamu suka model cerita seperti ini, follow. Menurutmu bagian paling menarik yang mana? Tulis di komentar."

==============================
IMAGE PROMPT HARD LOCK
==============================
Every imagePromptA and imagePromptB MUST be English and MUST follow this style:

DOCUMENTARY MINIATURE REALIST STYLE:
- photorealistic historical miniature diorama
- documentary reconstruction photography
- museum-quality handcrafted environment
- ultra-detailed real textures: moss, mud, dust, cracked wood, worn stone, aged fabric, water surface, fog
- cinematic lighting, volumetric light, atmospheric depth
- strong tilt-shift lens effect (miniature illusion)
- wide or medium-wide framing only
- tiny human figures allowed ONLY if historically accurate and small in scale
- historically accurate clothing, tools, environment
- indigenous Southeast Asian environment when relevant
- feels like professional miniature photography of a museum diorama

STRICTLY FORBIDDEN (must be implicitly banned in prompt):
- no toy look
- no clay figure
- no doll aesthetic
- no plastic look
- no CGI render style
- no illustration style
- no anime/cartoon
- no modern clothing
- no modern objects
- no smartphone
- no glasses
- no sneakers
- no hoodie
- no vehicles
- no modern buildings
- no electricity
- no close-up portrait
- no macro face
- no stand
- no base
- no pedestal
- no visible support
- no human hands
- no studio background

==============================
VIDEO PROMPT RULE
==============================
- English
- 1–2 sentences
- Must describe cinematic camera movement (push-in, slow pan, crane, tracking, drift)
- Must match the narrative and image scene

==============================
CONTEXT
==============================
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
   ROUTE
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

  const result = await callGeminiWithRotation({ keys, prompt });

  if (!result.ok) {
    return json(
      { ok: false, error: result.error, raw: result.raw },
      500
    );
  }

  const jsonData = result.json;

  if (!jsonData || typeof jsonData !== "object") {
    return json({ ok: false, error: "JSON_INVALID" }, 500);
  }

  const scenes = jsonData?.scenes;

  if (!Array.isArray(scenes)) {
    return json({ ok: false, error: "SCENES_NOT_ARRAY" }, 500);
  }

  if (scenes.length !== 9) {
    return json({ ok: false, error: "SCENES_COUNT_INVALID", count: scenes.length }, 500);
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
      return json({ ok: false, error: "SCENE_FIELD_INVALID", index: i }, 500);
    }
  }

  return json({
    ok: true,
    scenes,
    meta: { topic, style, format, audience, genre, template },
    usedKeyIndex: result.usedKeyIndex,
  });
}
