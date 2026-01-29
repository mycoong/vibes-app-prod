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

ABSOLUTE RULES:
- Total scenes MUST be exactly 9.
- Every field must exist and be non-empty string.
- Output must be STRICT JSON (double quotes, no trailing commas).
- Do NOT include extra keys outside the structure.
- Do NOT use poetry. Do NOT use pantun. Do NOT be overly dramatic. Do NOT be lyrical.
- Narration MUST feel like a natural story told by a human creator: clear, grounded, interesting, easy to understand.
- Use Indonesian that sounds modern and conversational, but still berbobot.
- Avoid flowery metaphors. Avoid "di balik kabut", "bara perjuangan", "membentang asa", etc.
- Keep each narrative suitable for voiceover: 2–4 sentences per scene.
- Max length per scene: 70 words.

STORY STRUCTURE (VERY IMPORTANT):
Scene-1 = STRONG HOOK (high curiosity, immediate stakes, makes viewer stop scrolling)
- Start with a punchy line that creates mystery or stakes.
- Mention a specific time/place/detail.
- End with a small cliffhanger / unanswered question.

Scene-2 to Scene-8 = STORY FLOW
- Continue naturally, chronological, cause-effect.
- Each scene reveals 1 new detail, not repeating.
- Keep it grounded: who/where/what happened, why it matters.
- Make it engaging but not exaggerated.

Scene-9 = CLOSING + CTA (FOLLOW + COMMENT) MUST be NATURAL and attached to the story.
- Scene-9 narrative MUST conclude the story first, then CTA.
- CTA must not feel like an ad. No shouting. No spam.

HARD CTA RULES (MUST FOLLOW, NO EXCUSES):
- ONLY Scene-9 may contain CTA.
- Scene-1 to Scene-8 MUST NOT contain any CTA, any engagement request, or any social words.
- Scene-1..8 MUST NOT include these words/phrases (case-insensitive), in any form:
  follow, follow me, following, komen, komentar, comment, like, share, subscribe, subcribe, subscribe dong,
  notif, notifikasi, lonceng, bell, caption, tag, DM, inbox, bio, link in bio, klik link, cek link, join,
  jangan lupa, dukung, support, viral, fyp, trending, part 2, lanjut part, next part, save, simpan, repost
- Scene-1..8 MUST NOT mention: "kalau kamu", "tulis di komentar", "klik", "follow untuk", "jangan lupa", or any equivalent CTA phrasing.
- If any CTA words appear in Scene-1..8, the output is INVALID and must be regenerated.

CTA FORMAT (Scene-9 ONLY):
- Scene-9 CTA must be 1–2 short sentences.
- CTA MUST include:
  (1) Ask to comment ONE keyword only: "LANJUT"
  (2) Invite to follow in a calm way.
- Scene-9 MUST be the only place where the word "LANJUT" appears.
- Scene-9 total max 55 words.

CONTENT CONTEXT:
topic: ${topic}
style: ${style}
format: ${format}
audience: ${audience}
genre: ${genre}
template: ${template}

NARRATIVE GUIDANCE (Indonesian):
- Use concrete details: waktu, tempat, suasana, tindakan.
- Keep sentences short-to-medium. No long run-on sentences.
- Make it "serius bold" like a real product, not a skin.
- Maintain one coherent story arc across 9 scenes.

IMAGE PROMPTS:
- imagePromptA/B: ENGLISH photorealistic historical miniature diorama, macro tilt-shift, shallow depth of field, visible physical textures (moss, dust, cracked wood, mud, stone), documentary lighting, no CGI look, no human hands, crowded tiny figures.
- For each scene:
  - Prompt A = setup/approach angle (calmer, establishing shot)
  - Prompt B = climax/impact angle (more tension/action)
- IMPORTANT: imagePromptA and imagePromptB MUST be different compositions/angles.
- No text on image. No captions. No logos.

VIDEO PROMPT:
- ENGLISH, 1–2 sentences, cinematic camera movement (push-in, crane, tracking).
- Mention subject and environment consistent with the scene.

CONSISTENCY:
- The 9 scenes must belong to ONE coherent story about the topic.
- The visuals must match the narrative for each scene.

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
    if (
      !s.id.trim() ||
      !s.narrative.trim() ||
      !s.imagePromptA.trim() ||
      !s.imagePromptB.trim() ||
      !s.videoPrompt.trim()
    ) {
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
