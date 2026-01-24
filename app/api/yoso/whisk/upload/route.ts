import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const s = String(dataUrl || "");
  const m = s.match(/^data:([^;]+);base64,(.+)$/i);
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const token = String(body?.token || "").trim();
    const imageDataUrl = String(body?.imageDataUrl || "").trim();

    if (!token) return NextResponse.json({ success: false, error: "WHISK_TOKEN_MISSING" }, { status: 400 });
    if (!imageDataUrl) return NextResponse.json({ success: false, error: "IMAGE_DATAURL_MISSING" }, { status: 400 });

    const parsed = parseDataUrl(imageDataUrl);
    if (!parsed?.base64) return NextResponse.json({ success: false, error: "INVALID_DATAURL" }, { status: 400 });

    const upstream = await fetch("https://aisandbox-pa.googleapis.com/v1/media:uploadImage", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        Origin: "https://labs.google",
        Referer: "https://labs.google/",
      },
      body: JSON.stringify({ image: { encodedImage: parsed.base64 } }),
    });

    const text = await upstream.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (upstream.status === 401 || upstream.status === 403) {
      const msg = String(json?.error?.message || json?.message || "TOKEN_REJECTED");
      return NextResponse.json(
        { success: false, error: `HTTP ${upstream.status}: ${msg}`, tokenExpired: true },
        { status: 401 }
      );
    }

    if (!upstream.ok) {
      const msg = String(json?.error?.message || json?.message || `HTTP ${upstream.status}`);
      return NextResponse.json(
        { success: false, error: `WHISK_UPLOAD_FAILED: ${msg}`, statusCode: upstream.status, details: text.slice(0, 300) },
        { status: 500 }
      );
    }

    const mediaId = String(json?.mediaGenerationId || "").trim();
    if (!mediaId) {
      return NextResponse.json(
        { success: false, error: "NO_MEDIA_ID", details: text.slice(0, 300) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, mediaId });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "UPLOAD_ERROR" }, { status: 500 });
  }
}
