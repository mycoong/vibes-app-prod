"use client";

import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { Scene, VideoStyle, VideoProject } from "../types";
import { pickReadyKey, markCooldown, markUsed, msToHuman } from "../../lib/apikeyStore";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function statusOf(err: any) {
  return err?.status ?? err?.code ?? err?.response?.status ?? null;
}
function msgOf(err: any) {
  return String(err?.message || err || "");
}
function isRateLimit(err: any) {
  const s = statusOf(err);
  const m = msgOf(err);
  return s === 429 || /\b429\b/.test(m) || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(m);
}
function isAuthInvalid(err: any) {
  const s = statusOf(err);
  const m = msgOf(err);
  return s === 401 || s === 403 || /invalid api key|api key not valid|permission denied/i.test(m);
}
function isTransient(err: any) {
  const s = statusOf(err);
  const m = msgOf(err);
  return s === 500 || s === 503 || /timeout|timed out|fetch failed|ECONNRESET/i.test(m);
}
function shortErr(err: any) {
  const s = statusOf(err);
  const m = msgOf(err).split("\n")[0].slice(0, 180);
  return s ? `${s} ${m}`.trim() : m.trim() || "ERR";
}

async function withRotatingApiKey<T>(task: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  const tried = new Set<string>();
  let lastErr: any = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const pick = pickReadyKey();

    if (!pick.ok) {
      if (pick.reason === "NO_KEYS") {
        throw new Error("API_KEY_MISSING: buka /settings dan isi minimal 1 API key");
      }
      const now = Date.now();
      const ms = Math.max(0, (pick.nextReadyAt || now) - now);
      throw new Error(`ALL_KEYS_COOLDOWN: tunggu ${msToHuman(ms)} lalu coba lagi`);
    }

    const slot = pick.slot;
    if (tried.has(slot.id)) break;
    tried.add(slot.id);

    const ai = new GoogleGenAI({ apiKey: slot.key.trim() });

    try {
      const out = await task(ai);
      markUsed(slot.id);
      return out;
    } catch (err: any) {
      lastErr = err;

      if (isRateLimit(err)) {
        markCooldown(slot.id, 2 * 60 * 1000, "429");
        continue;
      }
      if (isAuthInvalid(err)) {
        markCooldown(slot.id, 30 * 60 * 1000, "INVALID");
        continue;
      }
      if (isTransient(err)) {
        markCooldown(slot.id, 20 * 1000, "TEMP");
        continue;
      }

      throw err;
    }
  }

  throw new Error(`ALL_KEYS_FAILED: ${shortErr(lastErr)}`);
}

const MASTER_VISUAL_LOCK = `
MASTER VISUAL LOCK — PROFESSIONAL DIORAMA MACRO PHOTOGRAPHY:
GAYA UTAMA:
Photorealistic historical miniature realism dengan efek TILT-SHIFT profesional. Visual harus terlihat seperti hasil foto makro tingkat tinggi menggunakan lensa khusus, menciptakan kesan dunia miniatur yang hidup.

SKALA & OPTIK (TILT-SHIFT):
- Gunakan SHALLOW DEPTH OF FIELD yang kuat.
- Bagian atas dan bawah frame harus BLUR (bokeh lembut) untuk memusatkan fokus pada subjek di tengah.
- Sharp focus hanya pada bidang horizontal utama (the miniature plane).
- Miniatur terlihat sangat detail namun tetap terasa kecil secara optik.

KAMERA:
- Eye-level atau slightly elevated human perspective (dokumenter).
- Lensa makro dengan detail tinggi pada tekstur fisik.
- Sudut pandang yang menciptakan rasa "berada di dalam" diorama tersebut.

LIGHTING & WARNA:
- Natural daylight dengan kontras yang sedikit ditingkatkan.
- Saturasi warna yang sedikit dinaikkan pada objek miniatur untuk memberikan kesan "physical model" yang berkualitas.
- Earthy tones (coklat tanah, hijau kusam, abu batu).

TEKSTUR & DETAIL:
- Tekstur fisik miniatur terlihat jelas: lumut, debu, retakan kayu, dan air dengan riak kristal.
- Detail kecil: kerikil acak, daun basah, lumpur, kayu tercecer, alat kerja sederhana.

MANUSIA:
- Figur manusia mini bekerja, mengamati, berjalan, memikul. Gesture natural, tidak pose.
- Ekspresi tenang, fokus, lelah, atau serius.

DILARANG:
- Jangan ada tangan manusia atau alat workshop di dalam frame.
- Jangan terlihat seperti ilustrasi digital atau 3D render glossy tanpa depth of field.
`;

const STYLE_PROMPTS: Record<VideoStyle, string> = {
  ERA_KOLONIAL: `Indonesian Colonial Era (Hindia Belanda). Fokus pada kanal lama Batavia, arsitektur VOC lapuk, pelabuhan ramai, dan infrastruktur masif. ${MASTER_VISUAL_LOCK}`,
  SEJARAH_PERJUANGAN: `Indonesian Independence Struggle. Fokus pada taktik gerilya, hutan tropis lembap, bambu runcing, reruntuhan batu berlumut, dan kerumunan warga. ${MASTER_VISUAL_LOCK}`,
  LEGENDA_RAKYAT: `Indonesian Folklore. Fokus pada lanskap mistis nusantara, desa tradisional terpencil, dan elemen mistis yang terasa sebagai miniatur fisik nyata. ${MASTER_VISUAL_LOCK}`,
  BUDAYA_NUSANTARA: `Indonesian Cultural Heritage. Fokus pada upacara adat kolosal, pasar tradisional ramai, rumah Joglo/Gadang, dan detail kostum tradisional. ${MASTER_VISUAL_LOCK}`,
};

async function retryApiCall<T>(apiCall: () => Promise<T>, retries: number = 2, initialDelay: number = 1200): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const status = statusOf(error);
      if ((status === 500 || status === 503) && i < retries - 1) {
        await wait(initialDelay * Math.pow(2, i));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const findTrendingTopic = async (style: VideoStyle): Promise<string> => {
  return await withRotatingApiKey(async (ai) => {
    const styleDescriptions: Record<VideoStyle, string> = {
      ERA_KOLONIAL: "peristiwa sejarah spesifik, bangunan bersejarah, atau tokoh masa Hindia Belanda/VOC yang dramatis",
      SEJARAH_PERJUANGAN: "momen pertempuran revolusi, taktik gerilya, atau kisah heroik pahlawan Indonesia yang jarang diketahui",
      LEGENDA_RAKYAT: "legenda rakyat nusantara yang mistis, asal-usul tempat, atau cerita rakyat daerah yang populer",
      BUDAYA_NUSANTARA: "upacara adat, ritual sakral, atau tradisi suku bangsa di Indonesia yang unik dan visual",
    };

    const prompt = `Gunakan Google Search untuk menemukan 1 topik yang sangat menarik dan viral tentang ${styleDescriptions[style]}.
Topik harus memiliki potensi konflik, drama, atau visual epik untuk diorama makro.
Berikan HANYA judul pendek (maks 5 kata). Jangan ada penjelasan tambahan.`;

    const response = await retryApiCall<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      })
    );

    return response.text?.replace(/["']/g, "").trim() || "Misteri Gajah Mada";
  });
};

export const generateVideoScript = async (project: VideoProject): Promise<{ scenes: Scene[] }> => {
  return await withRotatingApiKey(async (ai) => {
    const systemInstruction = `
Kamu adalah "Director + Historian + Cinematographer" untuk serial NUSANTARA DIORAMA AI.
Fokus kamu: VISUAL EPIC, DAHSYAT, penuh aksi, tidak sepi, tidak monoton.

TUGAS: Buat 9 panel skrip sinematik untuk: "${project.topic}".

PROSEDUR WAJIB PER PANEL:
1. NARASI:
   - Gaya film dokumenter, cepat, lugas, mengalun.
   - 25 sampai 32 kata per panel.

2. Panel A (SETUP): establishing shot, ancaman, ramai.
3. Panel B (KLIMAKS): lebih dramatis, lebih ramai, lebih dekat.

ATURAN:
- JANGAN ADA FRAME SEPI. Minimal 8-20 figur manusia terlihat.
- No teks/watermark/modern objects/CGI look.
`;

    const response = await retryApiCall<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-3-pro-preview",
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    narrative: { type: Type.STRING },
                    imagePromptA: { type: Type.STRING },
                    imagePromptB: { type: Type.STRING },
                    videoPrompt: { type: Type.STRING },
                  },
                  required: ["narrative", "imagePromptA", "imagePromptB", "videoPrompt"],
                },
              },
            },
            required: ["scenes"],
          },
        },
        contents: `Buat 9 panel skrip diorama makro EPIC untuk: ${project.topic}. Gaya: ${project.style}.`,
      })
    );

    const text = response.text || '{"scenes":[]}';
    const res = JSON.parse(text);
    return {
      scenes: (res.scenes || []).map((s: any, i: number) => ({ id: `scene-${i}`, ...s })),
    };
  });
};

export const generateSceneImage = async (
  prompt: string,
  style: VideoStyle,
  aspectRatio: string,
  refImage?: string
): Promise<string> => {
  return await withRotatingApiKey(async (ai) => {
    const stylePrompt = STYLE_PROMPTS[style];

    const visualLockInstruction = `
EPIC SCENE RULES:
- NO EMPTY FRAMES. Crowded with at least 15+ tiny figurines in action.
- SENSE OF SCALE: Large infrastructures vs small workers.
- DOCUMENTARY STYLE: Archival photo look, earthy tones.
- TEXTURES: wet mud, weathered wood, mossy stones, rusted iron.
- ATMOSPHERE: humid, smoky, dusty, rainy Indonesian tropical vibes.
- TILT-SHIFT effect strong. Macro shallow DOF.
- No text, no watermark, no modern elements, no CGI glossy look.
`;

    const fullPrompt = `${stylePrompt}
SCENE: ${prompt}
ASPECT RATIO: ${aspectRatio}
${visualLockInstruction}`;

    const parts: any[] = [{ text: fullPrompt }];
    if (refImage) {
      parts.unshift({ inlineData: { mimeType: "image/jpeg", data: refImage } });
    }

    const response = await retryApiCall<GenerateContentResponse>(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts },
        config: { imageConfig: { aspectRatio: aspectRatio as any } },
      })
    );

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      const data = (part as any)?.inlineData?.data;
      if (typeof data === "string" && data.length > 0) return data;
    }
    throw new Error("Gagal generate gambar.");
  });
};

export const generateVoiceover = async (text: string): Promise<string | null> => {
  return await withRotatingApiKey(async (ai) => {
    try {
      const response = await retryApiCall<GenerateContentResponse>(() =>
        ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [
            {
              parts: [
                {
                  text: `Buat voiceover Bahasa Indonesia yang natural, tegas, jelas, dan enak didengar.\n\nSCRIPT:\n${text}`,
                },
              ],
            },
          ],
        })
      );

      const parts = (response as any)?.candidates?.[0]?.content?.parts || [];
      const audio = parts.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
      if (!audio) return null;
      return String(audio);
    } catch {
      return null;
    }
  });
};
