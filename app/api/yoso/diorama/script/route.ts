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
You are "AI Studio Script Generator" for YosoApp (YOSOApps the Viral Creator).

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

STRICT RULES:
- Total scenes MUST be exactly 9.
- Every field must exist and be non-empty string.

NARRATIVE RULES (IMPORTANT):
- Language: Indonesian.
- Tone: STORYTELLING, natural, conversational, "mengalun" seperti bercerita (bukan membaca), ANTI-LEBAY.
- NO puisi, NO pantun, NO kata-kata puitis berlebihan.
- Total durasi narasi (semua 9 scene digabung) target: 35–50 detik (sekitar 110–140 kata).
- Scene 1: hook tinggi (langsung bikin penasaran).
- Scene 2–8: lanjutan cerita yang nyambung, padat, berbobot, jelas siapa melakukan apa, di mana, kenapa.
- Scene 9: penutup yang natural + CTA WAJIB di akhir (lihat CTA rules).

CTA RULES (HARD):
- Scenes 1–8: dilarang ada kata: follow, komen, komentar, part 2, part2.
- Scene 9: WAJIB mengandung kata "follow", "komen", dan "part 2" (boleh variasi kalimat, tapi tiga unsur itu harus ada).
- Scene 9: CTA harus jadi KALIMAT TERAKHIR.

IMAGE PROMPT RULES (FOR WHISK / CINEMATIC DIORAMA):
- imagePromptA/B MUST be ENGLISH.
- Style: cinematic hyperreal miniature diorama photography that looks like a real film set (NOT toy, NOT figurine).
- Strong tilt-shift lens effect (hard tilt-shift), shallow depth of field, but framed as medium-wide / wide (NO extreme close-up).
- Ultra detailed materials and textures: weathered wood, chipped paint, rust, dust, wet mud, stone pores, fabric weave, smoke haze.
- Lighting: cinematic film lighting, volumetric light, realistic shadows, high dynamic range, moody atmosphere.
- Composition: 9:16 vertical, documentary framing, realistic scale cues, miniature crowd scenes with depth.
- NEGATIVE (MUST AVOID): toy look, plastic, glossy, action figure, dollhouse, diorama base, display stand, foot stands, support rods, visible seams, studio backdrop, CGI render look, cartoon.
- No human hands, no watermark, no text.

VIDEO PROMPT RULES:
- videoPrompt MUST be ENGLISH, 1–2 sentences.
- Cinematic camera movement (push-in, dolly, crane, tracking), and describe what the camera reveals.

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
      {
        ok: false,
        error: "SCENES_COUNT_INVALID",
        count: scenes.length,
        raw: jsonData,
      },
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
        { ok: false, error: "SCENE_FIELD_INVALID", index: i, raw: s },
        500
      );
    }
    if (!String(s.id).trim() || !String(s.narrative).trim() || !String(s.imagePromptA).trim() || !String(s.imagePromptB).trim() || !String(s.videoPrompt).trim()) {
      return json(
        { ok: false, error: "SCENE_FIELD_EMPTY", index: i, raw: s },
        500
      );
    }
  }

  /* =====================================================
     CTA FLEXIBLE HARD VALIDATION (FIX GEN_FAILED)
     - Scene 1–8: no CTA words
     - Scene 9: must contain follow + komen + part 2
     - CTA must be in the LAST sentence of scene 9 (best-effort check)
  ===================================================== */
  const narratives = scenes.map((s: any) => String(s.narrative || ""));

  const forbiddenInFirst8 = narratives.slice(0, 8).some((t: string) =>
    /follow|komen|komentar|part\s?2|part2/i.test(t)
  );

  if (forbiddenInFirst8) {
    return json(
      {
        ok: false,
        error: "CTA_RULE_VIOLATION",
        message: "CTA must NOT appear in scenes 1–8.",
      },
      500
    );
  }

  const lastNarr = narratives[8] || "";
  const hasFollow = /follow/i.test(lastNarr);
  const hasKomen = /komen|komentar/i.test(lastNarr);
  const hasPart2 = /part\s?2|part2/i.test(lastNarr);

  if (!hasFollow || !hasKomen || !hasPart2) {
    return json(
      {
        ok: false,
        error: "CTA_MISSING_OR_INVALID",
        message:
          "Scene-9 must contain CTA with 'follow', 'komen/komentar', and 'part 2'.",
        scene9: lastNarr,
      },
      500
    );
  }

  // best-effort: CTA should be last sentence
  const lastTrim = lastNarr.trim();
  const pieces = lastTrim.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
  const lastSentence = pieces[pieces.length - 1] || lastTrim;
  const lastSentenceOk =
    /follow/i.test(lastSentence) && /komen|komentar/i.test(lastSentence) && /part\s?2|part2/i.test(lastSentence);

  if (!lastSentenceOk) {
    return json(
      {
        ok: false,
        error: "CTA_NOT_LAST_SENTENCE",
        message: "Scene-9 CTA must be the LAST sentence.",
        scene9_lastSentence: lastSentence,
        scene9: lastNarr,
      },
      500
    );
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
