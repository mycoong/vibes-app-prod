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
You are "Vibes App Script Generator".
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

HARD RULES (NON-NEGOTIABLE):
1) Total scenes MUST be exactly 9.
2) Every field must exist and be non-empty string.
3) Language:
   - narrative: Indonesian, conversational storytelling (seperti lagi cerita), NO puitis, NO pantun, NO kata-kata lebay, NO metafora berlebihan.
   - Keep it natural, berbobot, dan jelas (apa yang terjadi, siapa, di mana, kenapa).
4) Timing target:
   - Total narrative untuk 9 scenes harus kira-kira 35–50 detik voice-over.
   - Guideline: tiap scene 1–2 kalimat pendek (±8–14 kata per kalimat).
   - Jangan kepanjangan. Jangan juga potongan super pendek yang kaku.
5) Hook:
   - Scene-1 WAJIB punya hook kuat di kalimat pertama (bikin orang berhenti scroll).
6) Story flow:
   - Scene 1–8 harus nyambung sebagai satu cerita utuh (ada progression / eskalasi).
   - Scene-9 harus jadi penutup yang rapih (wrap-up / punchline ringan).
7) CTA HARD RULE (WAJIB dan HARUS di Scene-9 narrative, di baris terakhir):
   - Tambahkan 1 kalimat CTA yang NATURAL (bukan lebay) persis mengandung kata "follow" dan "komen".
   - Format CTA wajib:
     "Kalau kamu mau lanjut part berikutnya, follow dan komen: MAU PART 2."
   - CTA TIDAK BOLEH muncul di Scene 1–8. HANYA di Scene-9.
8) Image prompts:
   - imagePromptA/B: ENGLISH, cinematic historical miniature diorama, NOT toy photo, NOT plastic, NOT product shot.
   - MUST be WIDE establishing shot (full scene), NO close-up portrait, NO macro portrait of faces.
   - Must look like a real film set photographed with a tilt-shift lens: HARD tilt-shift, very shallow depth of field, strong bokeh, cinematic lighting.
   - Physical realism: visible textures (dust, patina, scratches, cloth fibers, wood grain, chipped paint, mud, stone, rain sheen).
   - Crowded tiny figures are allowed, but must NOT look like figurines.
   - STRICT NEGATIVE: NO display base, NO stands under feet, NO support rods, NO transparent supports, NO doll joints, NO plastic shine, NO toy-like proportions, NO CGI, NO 3D render, NO studio backdrop, NO watermark, NO text.
9) Consistency:
   - A = Setup (kejadian & konteks).
   - B = Klimaks (konflik/aksi puncak).
10) videoPrompt:
   - ENGLISH, 1–2 sentences, cinematic camera movement (push-in, tracking, crane).
   - Keep it wide/establishing; avoid close-ups.

CONTEXT:
topic: ${topic}
style: ${style}
format: ${format}
audience: ${audience}
genre: ${genre}
template: ${template}

SCENE BLUEPRINT (FOLLOW THIS):
- Scene-1: hook + situasi awal (langsung "kejadian aneh/tegang/menegangkan" yang bikin penasaran)
- Scene-2: siapa yang terlibat + tujuan/misi
- Scene-3: tanda bahaya/jejak
- Scene-4: tekanan naik (waktu mepet / risiko)
- Scene-5: keputusan sulit
- Scene-6: aksi berjalan
- Scene-7: hampir gagal
- Scene-8: twist / fakta penting
- Scene-9: penutup + CTA wajib

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

  // CTA HARD VALIDATION: must exist ONLY in scene-9, last line, with follow + komen
  const ctaLine = "Kalau kamu mau lanjut part berikutnya, follow dan komen: MAU PART 2.";
  const narratives = scenes.map((s: any) => String(s.narrative || ""));
  const hasCTAIn1to8 = narratives.slice(0, 8).some((t: string) => t.includes("follow") || t.includes("komen") || t.includes("MAU PART 2"));
  const lastNarr = narratives[8] || "";
  const lastLine = lastNarr.trim().split("\n").filter(Boolean).slice(-1)[0] || "";

  if (hasCTAIn1to8) {
    return json(
      { ok: false, error: "CTA_RULE_VIOLATION", message: "CTA must NOT appear in scenes 1–8." },
      500
    );
  }
  if (lastLine.trim() !== ctaLine) {
    return json(
      { ok: false, error: "CTA_MISSING_OR_INVALID", expectedLastLine: ctaLine, gotLastLine: lastLine },
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
