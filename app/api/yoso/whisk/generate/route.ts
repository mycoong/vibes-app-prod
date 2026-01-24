import { NextResponse } from "next/server";

export const runtime = "nodejs";

function mapAspect(aspectRatio: string): string {
  const ar = String(aspectRatio || "").trim();
  if (ar === "16:9") return "IMAGE_ASPECT_RATIO_LANDSCAPE";
  if (ar === "9:16") return "IMAGE_ASPECT_RATIO_PORTRAIT";
  return "IMAGE_ASPECT_RATIO_SQUARE";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const token = String(body?.token || "").trim();
    const prompt = String(body?.prompt || "").trim();
    const aspectRatio = String(body?.aspectRatio || "1:1").trim();
    const referenceId = String(body?.referenceId || "").trim(); // 1 reference only

    if (!token) return NextResponse.json({ success: false, error: "WHISK_TOKEN_MISSING" }, { status: 400 });
    if (!prompt) return NextResponse.json({ success: false, error: "PROMPT_EMPTY" }, { status: 400 });

    const whiskAspect = mapAspect(aspectRatio);
    const useRef = !!referenceId;

    const apiPath = useRef ? "/v1/whisk:runImageRecipe" : "/v1/whisk:generateImage";

    const requestData = useRef
      ? {
          clientContext: {
            workflowId: "9220cb1a-1624-422c-91a0-4ffc5ab2162f",
            tool: "BACKBONE",
            sessionId: `;${Date.now()}`,
          },
          seed: Math.floor(Math.random() * 900000) + 100000,
          imageModelSettings: {
            imageModel: "R2I",
            aspectRatio: whiskAspect,
          },
          userInstruction: prompt,
          recipeMediaInputs: [
            {
              caption: "MAIN_CHARACTER",
              mediaInput: {
                mediaCategory: "MEDIA_CATEGORY_SUBJECT",
                mediaGenerationId: referenceId,
              },
            },
          ],
        }
      : {
          clientContext: {
            workflowId: "2c729f8f-048a-435a-a6a7-1faad1ae294a",
            tool: "BACKBONE",
            sessionId: `;${Date.now()}`,
          },
          imageModelSettings: {
            imageModel: "IMAGEN_3_5",
            aspectRatio: whiskAspect,
          },
          prompt,
          mediaCategory: "MEDIA_CATEGORY_BOARD",
        };

    const upstream = await fetch(`https://aisandbox-pa.googleapis.com${apiPath}`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        Origin: "https://labs.google",
        Referer: "https://labs.google/",
      },
      body: JSON.stringify(requestData),
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
        { success: false, error: `HTTP ${upstream.status}: ${msg}`, tokenExpired: true, shouldRetry: false },
        { status: 401 }
      );
    }

    if (upstream.status === 429) {
      const msg = String(json?.error?.message || json?.message || "RATE_LIMITED");
      return NextResponse.json(
        { success: false, error: `HTTP 429: ${msg}`, shouldRetry: true, statusCode: 429, details: text.slice(0, 300) },
        { status: 429 }
      );
    }

    if (!upstream.ok) {
      const msg = String(json?.error?.message || json?.message || `HTTP ${upstream.status}`);
      const reason = String(json?.error?.details?.[0]?.reason || "");

      if (upstream.status === 400 && reason === "PUBLIC_ERROR_MINOR_INPUT_IMAGE") {
        return NextResponse.json(
          {
            success: false,
            error: "REFERENCE_IMAGE_REJECTED_MINOR",
            errorCode: "PUBLIC_ERROR_MINOR_INPUT_IMAGE",
            shouldRetry: false,
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: `WHISK_GEN_FAILED: ${msg}`, shouldRetry: upstream.status >= 500, statusCode: upstream.status, details: text.slice(0, 300) },
        { status: 500 }
      );
    }

    const encoded = json?.imagePanels?.[0]?.generatedImages?.[0]?.encodedImage;
    if (!encoded) {
      return NextResponse.json(
        { success: false, error: "NO_IMAGE_IN_RESPONSE", details: text.slice(0, 300) },
        { status: 500 }
      );
    }

    const s = String(encoded);
    const dataUrl = s.startsWith("data:") ? s : `data:image/png;base64,${s}`;

    return NextResponse.json({ success: true, dataUrl, mode: useRef ? "R2I" : "IMAGEN" });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "GEN_ERROR" }, { status: 500 });
  }
}
