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
- Tone: natural, informatif, seperti storyteller YouTube / TikTok sejarah.
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
- Do NOT use emotional storytelling like film script.
- Must feel like factual storytelling.

CTA RULES:
- Scene 1–8: must NOT contain words: follow, komen, komentar, part 2.
- Scene 9: MUST contain follow, komen, and part 2.
- CTA must be the LAST sentence of scene 9.

IMAGE PROMPT RULES (LOCKED DIORAMA LOOK FOR WHISK):
- imagePromptA/B must be in ENGLISH.
- Style: cinematic hyperreal miniature photography that feels like real world, not toy.
- Must use: strong tilt-shift lens, shallow depth of field, miniature scale illusion.
- Scene should feel like documentary film frame.
- Lighting: cinematic, realistic, volumetric.
- Textures: dust, rust, weathered surfaces, real materials.
- Composition: medium-wide or wide framing, not close-up.
- Avoid toy look.

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

/* route tetap sama seperti sebelumnya, tidak diubah */
