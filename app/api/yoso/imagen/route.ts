import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const runtime = "nodejs";

const PRIMARY_MODEL = "gemini-2.5-flash-image";
const FALLBACK_MODEL = "gemini-3-pro-image-preview";
const ROUTE_VERSION = "yoso-imagen-sdk-zip-compatible-v1";

type Body = {
  prompt: string;
  aspectRatio?: string; // "9:16" | "16:9"
  apiKeys?: string[];   // from client localStorage slots (optional)
  refImageBase64?: string; // optional base64 (no dataUrl prefix)
  refImageMime?: string;   // e.g. "image/jpeg"
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 800): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const status = e?.status || e?.code;
      if ((status === 429 || status === 500 || status === 503) && i < retries - 1) {
        await wait(initialDelay * Math.pow(2, i));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function parseKeyList(v: string | undefined | null): string[] {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function extractInlineBase64(resp: GenerateContentResponse): string | null {
  const parts = resp?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (p?.inlineData?.data) return p.inlineData.data;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const prompt = (body.prompt || "").trim();
    const aspectRatio = body.aspectRatio || "9:16";

    if (!prompt) {
      return NextResponse.json({ ok: false, error: "PROMPT_EMPTY" }, { status: 400 });
    }

    const clientKeys = Array.isArray(body.apiKeys) ? body.apiKeys.filter(Boolean) : [];
    const serverKeys = parseKeyList(process.env.YOSO_SERVER_GEMINI_KEYS);

    const pool = [
      ...clientKeys.map((k) => ({ k, src: "client" as const })),
      ...serverKeys.map((k) => ({ k, src: "server" as const })),
    ];

    if (!pool.length) {
      return NextResponse.json(
        { ok: false, error: "NO_API_KEYS", debug: { routeVersion: ROUTE_VERSION } },
        { status: 400 }
      );
    }

    const limitedPool: { poolIndex: number; source: "client" | "server" }[] = [];

    for (let i = 0; i < pool.length; i++) {
      const { k, src } = pool[i];
      const ai = new GoogleGenAI({ apiKey: k });

      const parts: any[] = [{ text: prompt }];

      if (body.refImageBase64) {
        parts.unshift({
          inlineData: {
            mimeType: body.refImageMime || "image/jpeg",
            data: body.refImageBase64,
          },
        });
      }

      const call = async (model: string) =>
        ai.models.generateContent({
          model,
          contents: { parts }, // ZIP STYLE (bukan array contents)
          config: {
            imageConfig: { aspectRatio: aspectRatio as any }, // ZIP STYLE
          },
        });

      try {
        let resp = await retry(() => call(PRIMARY_MODEL), 2, 700);

        // fallback kalau kandidat kosong / model issue: coba model fallback sekali
        let b64 = extractInlineBase64(resp);
        if (!b64) {
          resp = await retry(() => call(FALLBACK_MODEL), 2, 700);
          b64 = extractInlineBase64(resp);
        }

        if (b64) {
          return NextResponse.json({
            ok: true,
            image: { dataUrl: `data:image/jpeg;base64,${b64}` },
            debug: {
              routeVersion: ROUTE_VERSION,
              usedPoolIndex: i,
              usedSource: src,
              aspectRatio,
            },
          });
        }
      } catch (e: any) {
        const status = e?.status || e?.code;
        if (status === 429) {
          limitedPool.push({ poolIndex: i, source: src });
          continue;
        }
        // permission/billing/other errors: lanjut coba key berikutnya
        continue;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "GEMINI_IMAGE_RATE_LIMIT",
        suggestedCooldownSec: 60,
        limitedPool,
        debug: { routeVersion: ROUTE_VERSION },
      },
      { status: 429 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
