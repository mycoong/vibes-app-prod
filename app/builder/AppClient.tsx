"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";



type Scene = {
  id: string;
  narrative: string;
  imagePromptA: string;
  imagePromptB: string;
  videoPrompt: string;

  audioUrl?: string;
  audioLoading?: boolean;
  audioError?: string;

  imageADataUrl?: string;
  imageBDataUrl?: string;
  imageALoading?: boolean;
  imageBLoading?: boolean;
  imageAError?: string;
  imageBError?: string;
};

type GenerateMeta = {
  topic: string;
  style: string;
  format: string;
  audience: string;
  genre: string;
  template: string;
};

type WhiskRef = { mediaId: string; description: string; filename: string };

const LS_KEYS = {
  SLOTS: "YOSO_API_KEY_SLOTS",
  IDEA_META: "YOSO_IDEA_META",
  WHISK_TOKEN: "YOSO_WHISK_TOKEN",
  WHISK_REF: "YOSO_WHISK_REF",
  LAST_SCENES: "YOSO_LAST_SCENES",
};

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function getAllApiKeysFromStorage(): string[] {
  const parsed: any = readJSON(LS_KEYS.SLOTS, null);
  if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
    return parsed.map((s) => String(s || "").trim()).filter(Boolean);
  }
  if (Array.isArray(parsed)) {
    return parsed
      .map((s: any) => String(s?.apiKey || s?.key || s?.value || "").trim())
      .filter(Boolean);
  }
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.slots)) {
    return parsed.slots
      .map((s: any) => String(s?.apiKey || s?.key || s?.value || "").trim())
      .filter(Boolean);
  }
  return [];
}

function readWhiskToken(): string {
  try {
    return String(localStorage.getItem(LS_KEYS.WHISK_TOKEN) || "").trim();
  } catch {
    return "";
  }
}

function readWhiskRef(): WhiskRef | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.WHISK_REF);
    if (!raw) return null;
    const j = JSON.parse(raw);
    const mediaId = String(j?.mediaId || "").trim();
    const description = String(j?.description || "MAIN_CHARACTER").trim();
    const filename = String(j?.filename || "ref.png").trim();
    if (!mediaId) return null;
    return { mediaId, description, filename };
  } catch {
    return null;
  }
}

function saveLastScenes(scenes: Scene[], meta: GenerateMeta) {
  try {
    const strip = (s: Scene) => {
      const {
        audioUrl,
        audioLoading,
        audioError,
        imageADataUrl,
        imageBDataUrl,
        imageALoading,
        imageBLoading,
        imageAError,
        imageBError,
        ...rest
      } = s as any;
      return rest as Scene;
    };
    localStorage.setItem(
      LS_KEYS.LAST_SCENES,
      JSON.stringify({ scenes: scenes.map(strip), meta, savedAt: Date.now() })
    );
  } catch {}
}

async function copyText(text: string) {
  const t = String(text || "").trim();
  if (!t) return;
  await navigator.clipboard.writeText(t);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const href = String(dataUrl || "");
  if (!href.startsWith("data:")) return;
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadArrayBufferAsFile(ab: ArrayBuffer, filename: string, mime = "application/octet-stream") {
  const blob = new Blob([ab], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

function isCTAPrompt(prompt: string): boolean {
  const p = String(prompt || "").toLowerCase();
  const cta = [
    "subscribe",
    "like button",
    "notification",
    "bell icon",
    "social media",
    "follow",
    "comment",
    "share button",
    "cta",
    "call to action",
    "thumbs up",
    "youtube",
  ];
  return cta.some((kw) => p.includes(kw));
}

function buildLockedPrompt(basePrompt: string, ref: WhiskRef | null): { prompt: string; referenceId: string } {
  const raw = String(basePrompt || "").trim();
  if (!raw) return { prompt: "", referenceId: "" };
  if (isCTAPrompt(raw)) return { prompt: raw, referenceId: "" };
  if (!ref?.mediaId) return { prompt: raw, referenceId: "" };
  const label = String(ref.description || "MAIN_CHARACTER").trim() || "MAIN_CHARACTER";
  const locked = [
    raw,
    "",
    `CHARACTER LOCK (MUST FOLLOW):`,
    `- Use ONLY this reference for face/identity: ${label}.`,
    `- Hair/wardrobe/age/props may change to fit the scene context, but identity MUST remain the same.`,
    `- Do NOT invent new faces/characters. Do NOT merge identities. No extra characters unless explicitly stated in the prompt.`,
  ].join("\n");
  return { prompt: locked, referenceId: ref.mediaId };
}

function splitNarrative(narr: string): { a: string; b: string } {
  const t = String(narr || "").trim();
  if (!t) return { a: "", b: "" };

  const paras = t.split(/\n\s*\n+/).map((x) => x.trim()).filter(Boolean);
  if (paras.length >= 2) {
    const mid = Math.ceil(paras.length / 2);
    return { a: paras.slice(0, mid).join("\n\n"), b: paras.slice(mid).join("\n\n") };
  }

  const sents = t.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  if (sents.length >= 2) {
    const mid = Math.ceil(sents.length / 2);
    return { a: sents.slice(0, mid).join(" "), b: sents.slice(mid).join(" ") };
  }

  const mid = Math.ceil(t.length / 2);
  return { a: t.slice(0, mid).trim(), b: t.slice(mid).trim() };
}

function b64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function startsWithAscii(bytes: Uint8Array, s: string) {
  if (bytes.length < s.length) return false;
  for (let i = 0; i < s.length; i++) if (bytes[i] !== s.charCodeAt(i)) return false;
  return true;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const slice = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return slice as ArrayBuffer;
}

// ===== audio utils =====
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (sharedCtx) return sharedCtx;
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) throw new Error("AUDIO_CTX_UNAVAILABLE");
  const ctx: AudioContext = new AC({ sampleRate: 24000 });
  sharedCtx = ctx;
  return ctx;
}

async function ensureCtxResumed(ctx: AudioContext) {
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {}
  }
}

async function pcm16ToAudioBuffer(bytes: Uint8Array, ctx: AudioContext, sampleRate = 24000, numChannels = 1) {
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const dataInt16 = new Int16Array(bytes.buffer, bytes.byteOffset, sampleCount);
  const frameCount = Math.floor(dataInt16.length / numChannels);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) channelData[i] = (dataInt16[i * numChannels + ch] || 0) / 32768.0;
  }
  return buffer;
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples =
    numChannels === 2
      ? (() => {
          const L = buffer.getChannelData(0);
          const R = buffer.getChannelData(1);
          const out = new Float32Array(L.length + R.length);
          let k = 0;
          for (let i = 0; i < L.length; i++) {
            out[k++] = L[i];
            out[k++] = R[i];
          }
          return out;
        })()
      : buffer.getChannelData(0);

  const ab = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(ab);
  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };

  let offset = 0;
  writeStr(offset, "RIFF");
  offset += 4;
  view.setUint32(offset, 36 + samples.length * 2, true);
  offset += 4;
  writeStr(offset, "WAVE");
  offset += 4;
  writeStr(offset, "fmt ");
  offset += 4;
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * numChannels * 2, true);
  offset += 4;
  view.setUint16(offset, numChannels * 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeStr(offset, "data");
  offset += 4;
  view.setUint32(offset, samples.length * 2, true);
  offset += 4;

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] || 0));
    view.setInt16(offset + i * 2, (s < 0 ? s * 0x8000 : s * 0x7fff) as any, true);
  }
  return ab;
}

async function fetchAudioAsWavArrayBuffer(audioUrl: string): Promise<ArrayBuffer> {
  const r = await fetch(audioUrl);
  const ab = (await r.arrayBuffer()) as ArrayBuffer;
  const bytes = new Uint8Array(ab);
  if (startsWithAscii(bytes, "RIFF")) return ab;
  const ctx = getAudioContext();
  await ensureCtxResumed(ctx);
  const buf = await ctx.decodeAudioData((ab.slice(0) as ArrayBuffer) as ArrayBuffer);
  return audioBufferToWav(buf);
}

async function concatWavFromUrls(urls: string[]): Promise<ArrayBuffer | null> {
  if (!urls.length) return null;
  const ctx = getAudioContext();
  await ensureCtxResumed(ctx);
  const decoded: AudioBuffer[] = [];

  for (const u of urls) {
    try {
      const r = await fetch(u);
      const ab = (await r.arrayBuffer()) as ArrayBuffer;
      const b = await ctx.decodeAudioData((ab.slice(0) as ArrayBuffer) as ArrayBuffer);
      decoded.push(b);
    } catch {}
  }

  if (!decoded.length) return null;
  const sampleRate = decoded[0].sampleRate || 24000;
  const numChannels = decoded[0].numberOfChannels || 1;
  const totalFrames = decoded.reduce((sum, b) => sum + b.length, 0);

  const out = ctx.createBuffer(numChannels, totalFrames, sampleRate);
  let off = 0;
  for (const b of decoded) {
    for (let ch = 0; ch < numChannels; ch++) {
      const dst = out.getChannelData(ch);
      const src = b.getChannelData(Math.min(ch, b.numberOfChannels - 1));
      dst.set(src, off);
    }
    off += b.length;
  }
  return audioBufferToWav(out);
}

export default function AppClient() {
  const [mounted, setMounted] = useState(false);
  const [msg, setMsg] = useState("");
  const [apiCount, setApiCount] = useState(0);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [whiskRef, setWhiskRef] = useState<WhiskRef | null>(null);
  const [whiskTokenOn, setWhiskTokenOn] = useState(false);

  // keep abort controllers (logic tetap ada tapi STOP button dihapus)
  const whiskSessionIdRef = useRef<string>(`whisk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const whiskControllersRef = useRef<Map<string, Set<AbortController>>>(new Map());

  // audio play/pause
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(true);

  const meta: GenerateMeta = useMemo(() => {
    const m: any = readJSON(LS_KEYS.IDEA_META, {});
    return {
      topic: String(m?.topic || "").trim(),
      style: String(m?.style || "SEJARAH_PERJUANGAN"),
      format: String(m?.format || "SHORT"),
      audience: String(m?.audience || "LOCAL"),
      genre: String(m?.genre || "DRAMA"),
      template: String(m?.template || "VIRAL_DRAMA"),
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    setApiCount(getAllApiKeysFromStorage().length);
    setWhiskTokenOn(!!readWhiskToken());
    setWhiskRef(readWhiskRef());

    try {
      const last = localStorage.getItem(LS_KEYS.LAST_SCENES);
      if (last) {
        const j = JSON.parse(last);
        if (Array.isArray(j?.scenes) && j.scenes.length) {
          const restored: Scene[] = j.scenes.map((s: any, idx: number) => ({
            id: String(s?.id || `scene_${idx + 1}`),
            narrative: String(s?.narrative || ""),
            imagePromptA: String(s?.imagePromptA || ""),
            imagePromptB: String(s?.imagePromptB || ""),
            videoPrompt: String(s?.videoPrompt || ""),
          }));
          setScenes(restored);
        }
      }
    } catch {}
  }, []);

  function registerWhiskController(ctrl: AbortController) {
    const sid = whiskSessionIdRef.current;
    let set = whiskControllersRef.current.get(sid);
    if (!set) {
      set = new Set();
      whiskControllersRef.current.set(sid, set);
    }
    set.add(ctrl);
    return () => {
      const cur = whiskControllersRef.current.get(sid);
      if (!cur) return;
      cur.delete(ctrl);
      if (cur.size === 0) whiskControllersRef.current.delete(sid);
    };
  }

  async function onGenerateWhiskImage(sceneIndex: number, which: "A" | "B") {
    const s = scenes[sceneIndex];
    if (!s) return;

    const basePrompt = which === "A" ? s.imagePromptA : s.imagePromptB;
    if (!String(basePrompt || "").trim()) return setMsg(`PROMPT_EMPTY: #${sceneIndex + 1}${which}`);

    const token = readWhiskToken();
    if (!token) return setMsg("WHISK_TOKEN_MISSING (Settings)");

    const ref = whiskRef || readWhiskRef();
    const locked = buildLockedPrompt(basePrompt, ref);

    const ctrl = new AbortController();
    const cleanup = registerWhiskController(ctrl);

    setScenes((prev) =>
      prev.map((x, idx) => {
        if (idx !== sceneIndex) return x;
        const next: Scene = { ...x };
        if (which === "A") {
          next.imageALoading = true;
          next.imageAError = "";
        } else {
          next.imageBLoading = true;
          next.imageBError = "";
        }
        return next;
      })
    );

    try {
      const r = await fetch("/api/yoso/whisk/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          token,
          prompt: locked.prompt,
          aspectRatio: "9:16",
          referenceId: locked.referenceId,
        }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.success) {
        const err = String(j?.error || `HTTP_${r.status}`);
        setScenes((prev) =>
          prev.map((x, idx) => {
            if (idx !== sceneIndex) return x;
            const next: Scene = { ...x };
            if (which === "A") {
              next.imageALoading = false;
              next.imageAError = err;
            } else {
              next.imageBLoading = false;
              next.imageBError = err;
            }
            return next;
          })
        );
        return setMsg(err);
      }

      const dataUrl = String(j?.dataUrl || "");
      if (!dataUrl.startsWith("data:")) throw new Error("INVALID_IMAGE_DATAURL");

      setScenes((prev) => {
        const nextAll = prev.map((x, idx) => {
          if (idx !== sceneIndex) return x;
          const next: Scene = { ...x };
          if (which === "A") {
            next.imageALoading = false;
            next.imageADataUrl = dataUrl;
            next.imageAError = "";
          } else {
            next.imageBLoading = false;
            next.imageBDataUrl = dataUrl;
            next.imageBError = "";
          }
          return next;
        });
        saveLastScenes(nextAll, meta);
        return nextAll;
      });

      setMsg(`OK: panel_${String(sceneIndex + 1).padStart(2, "0")}_${which}`);
    } catch (e: any) {
      const aborted = String(e?.name || "") === "AbortError";
      const err = aborted ? "CANCELLED" : String(e?.message || "WHISK_GEN_FAILED");
      setScenes((prev) =>
        prev.map((x, idx) => {
          if (idx !== sceneIndex) return x;
          const next: Scene = { ...x };
          if (which === "A") {
            next.imageALoading = false;
            next.imageAError = err;
          } else {
            next.imageBLoading = false;
            next.imageBError = err;
          }
          return next;
        })
      );
      setMsg(aborted ? "CANCELLED" : `WHISK_ERROR: ${err}`);
    } finally {
      cleanup();
    }
  }

  async function onGenerateAudio(sceneIndex: number) {
    const s = scenes[sceneIndex];
    if (!s) return;

    setScenes((prev) =>
      prev.map((x, idx) => (idx === sceneIndex ? { ...x, audioLoading: true, audioError: "" } : x))
    );

    try {
      const apiKeys = getAllApiKeysFromStorage();
      setApiCount(apiKeys.length);
      if (!apiKeys.length) throw new Error("API_KEY_MISSING");

      const res = await fetch("/api/yoso/diorama/audio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKeys, text: String(s.narrative || "") }),
      });

      const j = await res.json();
      if (!j?.ok || !j?.audioBase64) throw new Error(String(j?.error || "AUDIO_FAILED"));

      const base64 = String(j.audioBase64);
      const mime = String(j.audioMime || "audio/wav");

      const bytes = b64ToBytes(base64);

      let wavAb: ArrayBuffer;
      if (mime.toLowerCase().includes("wav") || startsWithAscii(bytes, "RIFF")) {
        wavAb = bytesToArrayBuffer(bytes);
      } else {
        const ctx = getAudioContext();
        await ensureCtxResumed(ctx);
        const buffer = await pcm16ToAudioBuffer(bytes, ctx, 24000, 1);
        wavAb = audioBufferToWav(buffer);
      }

      const blob = new Blob([wavAb], { type: "audio/wav" });
      const urlObj = URL.createObjectURL(blob);

      setScenes((prev) => {
        const nextAll = prev.map((x, idx) =>
          idx === sceneIndex ? { ...x, audioLoading: false, audioUrl: urlObj, audioError: "" } : x
        );
        saveLastScenes(nextAll, meta);
        return nextAll;
      });

      setMsg(`AUDIO READY: #${sceneIndex + 1}`);
    } catch (e: any) {
      const err = String(e?.message || e || "AUDIO_FAILED");
      setScenes((prev) =>
        prev.map((x, idx) => (idx === sceneIndex ? { ...x, audioLoading: false, audioError: err } : x))
      );
      setMsg(`AUDIO_ERROR: ${err}`);
    }
  }

  function onPlayOrPause(sceneIndex: number) {
    const s = scenes[sceneIndex];
    if (!s?.audioUrl) return;

    if (!audioElRef.current) {
      audioElRef.current = new Audio();
      audioElRef.current.onended = () => {
        setIsPaused(true);
        setPlayingIndex(null);
      };
      audioElRef.current.onpause = () => setIsPaused(true);
      audioElRef.current.onplay = () => setIsPaused(false);
    }

    const el = audioElRef.current;
    if (playingIndex !== sceneIndex) {
      try {
        el.pause();
      } catch {}
      el.src = s.audioUrl;
      setPlayingIndex(sceneIndex);
      el.play();
      return;
    }

    if (el.paused) el.play();
    else el.pause();
  }

  async function onCopyPrompt(sceneIndex: number, which: "A" | "B") {
    const s = scenes[sceneIndex];
    if (!s) return;
    const text = which === "A" ? s.imagePromptA : s.imagePromptB;
    if (!String(text || "").trim()) return setMsg(`PROMPT_EMPTY: #${sceneIndex + 1}${which}`);
    try {
      await copyText(text);
      setMsg(`COPIED: IMG PROMPT ${which} #${sceneIndex + 1}`);
    } catch {
      setMsg("COPY_FAILED");
    }
  }

  async function onCopyVideoPrompt(sceneIndex: number) {
    const s = scenes[sceneIndex];
    if (!s) return;
    const text = String(s.videoPrompt || "").trim();
    if (!text) return setMsg(`VIDEO_PROMPT_EMPTY: #${sceneIndex + 1}`);
    try {
      await copyText(text);
      setMsg(`COPIED: VIDEO PROMPT #${sceneIndex + 1}`);
    } catch {
      setMsg("COPY_FAILED");
    }
  }

  async function onDownloadAudioOnly() {
    try {
      if (!scenes.length) return setMsg("NO_SCENES");
      const audioUrls = scenes.map((s) => s.audioUrl).filter((u): u is string => !!u);
      if (!audioUrls.length) return setMsg("NO_AUDIO (Generate dulu)");
      const merged = await concatWavFromUrls(audioUrls);
      if (!merged) return setMsg("MERGE_AUDIO_FAILED");
      downloadArrayBufferAsFile(merged, "vibes_audio_only.wav", "audio/wav");
      setMsg("DOWNLOADED ✅ vibes_audio_only.wav");
    } catch (e: any) {
      setMsg(`AUDIO_ONLY_ERROR: ${String(e?.message || e)}`);
    }
  }

  async function onDownloadAllAssets() {
    try {
      if (!scenes.length) return setMsg("NO_SCENES");

      const zip = new JSZip();
      const imgFolder = zip.folder("images");
      const audioFolder = zip.folder("audio");

      const audioUrls: string[] = [];

      scenes.forEach((s, i) => {
        const n = String(i + 1).padStart(2, "0");
        if (s.imageADataUrl) {
          const b64 = String(s.imageADataUrl).split(",")[1] || "";
          imgFolder?.file(`panel_${n}_A.png`, b64, { base64: true });
        }
        if (s.imageBDataUrl) {
          const b64 = String(s.imageBDataUrl).split(",")[1] || "";
          imgFolder?.file(`panel_${n}_B.png`, b64, { base64: true });
        }
        if (s.audioUrl) audioUrls.push(s.audioUrl);
      });

      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        if (!s.audioUrl) continue;
        const n = String(i + 1).padStart(2, "0");
        const wav = await fetchAudioAsWavArrayBuffer(s.audioUrl);
        audioFolder?.file(`panel_${n}.wav`, wav);
      }

      const merged = await concatWavFromUrls(audioUrls);
      if (merged) zip.file("all_audio.wav", merged);

      zip.file("meta.json", JSON.stringify({ exportedAt: new Date().toISOString(), meta }, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vibes_assets.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setMsg("DOWNLOADED ✅ vibes_assets.zip");
    } catch (e: any) {
      setMsg(`DOWNLOAD_ALL_ERROR: ${String(e?.message || e)}`);
    }
  }

  // === UI RENDER (PART 2) ===
  return (
    <div className="wrap">
      <div className="headerRow">
        <div className="brandLeft">
          <img className="brandLogo" src="/vibes-logo.png" alt="Vibes App" />
        </div>

        <div className="actionsRight">
          <div className="btnRow">
            <button className="btn" type="button" onClick={() => (window.location.href = "/builder")}>
              ← BACK
            </button>
            <Link className="btn" href="/settings">
              SETTINGS
            </Link>
            <button className="btn" type="button" onClick={() => window.open("https://aistudio.google.com/", "_blank")}>
              CANVAS HELPER
            </button>

            <button className="btn" type="button" onClick={onDownloadAudioOnly} disabled={!mounted || !scenes.length}>
              DOWNLOAD AUDIO ONLY
            </button>

            <button className="btn" type="button" onClick={onDownloadAllAssets} disabled={!mounted || !scenes.length}>
              DOWNLOAD ALL
            </button>
          </div>

          <div className="pillRow">
            <div className={`pill ${mounted && apiCount ? "ok" : "bad"}`}>
              {mounted ? (apiCount ? `${apiCount} API Keys Loaded` : "API Keys Missing") : "Loading..."}
            </div>
            <div className={`pill ${mounted && whiskTokenOn ? "ok" : "bad"}`}>
              {mounted ? (whiskTokenOn ? "WHISK TOKEN: ON" : "WHISK TOKEN: OFF") : "..."}
            </div>
            <div className={`pill ${mounted && (whiskRef?.mediaId || readWhiskRef()?.mediaId) ? "ok" : "bad"}`}>
              {mounted ? ((whiskRef?.mediaId || readWhiskRef()?.mediaId) ? "WHISK REF: ON" : "WHISK REF: OFF") : "..."}
            </div>
            {msg ? <div className="pill msg">{msg}</div> : null}
          </div>
        </div>
      </div>

      {!scenes.length ? (
        <div className="empty">
          <div className="emptyTitle">Belum ada panel.</div>
          <div className="emptySub">Balik ke IDE page untuk isi topik, lalu masuk Panels lagi.</div>
        </div>
      ) : (
        <div className="panels">
          {scenes.map((s, i) => {
            const idx = i + 1;
            const panelNum = String(idx).padStart(2, "0");
            const narr = splitNarrative(s.narrative);
            const isThisPlaying = playingIndex === i;
            const showPause = isThisPlaying && !isPaused;

            return (
              <div key={s.id || i} className="panelCard">
                <div className="panelTop">
                  <div className="panelNo">#{idx}</div>
                  <div className="panelTitle">{meta.topic ? meta.topic.toUpperCase() : "PANELS"}</div>
                </div>

                <div className="imgGrid">
                  <div className="imgCol">
                    <div className="imgLabel a">A: SETUP</div>

                    <div className="imgFrame">
                      {s.imageAError ? <div className="err">{s.imageAError}</div> : null}
                      {s.imageADataUrl ? (
                        <img className="preview" src={s.imageADataUrl} alt={`panel_${panelNum}_A`} />
                      ) : (
                        <div className="ph">Preview A</div>
                      )}
                    </div>

                    <div className="imgBtns">
                      <button
                        className="miniBtn primary"
                        type="button"
                        onClick={() => onGenerateWhiskImage(i, "A")}
                        disabled={!!s.imageALoading}
                        title="Generate image A"
                      >
                        <span className="btnTitle">{s.imageALoading ? "WAIT..." : "GENERATE"}</span>
                        <span className="btnSub">IMG A</span>
                      </button>

                      <button
                        className="miniBtn"
                        type="button"
                        onClick={() => s.imageADataUrl && downloadDataUrl(s.imageADataUrl, `panel_${panelNum}_A.png`)}
                        disabled={!s.imageADataUrl}
                        title="Download image A"
                      >
                        <span className="btnTitle">DOWNLOAD</span>
                        <span className="btnSub">IMG A</span>
                      </button>

                      <button className="miniBtn" type="button" onClick={() => onCopyPrompt(i, "A")} title="Copy prompt image A">
                        <span className="btnTitle">COPY</span>
                        <span className="btnSub">PROMPT A</span>
                      </button>
                    </div>

                    <div className="narrBox">“{narr.a}”</div>
                  </div>

                  <div className="imgCol">
                    <div className="imgLabel b">B: KLIMAKS</div>

                    <div className="imgFrame">
                      {s.imageBError ? <div className="err">{s.imageBError}</div> : null}
                      {s.imageBDataUrl ? (
                        <img className="preview" src={s.imageBDataUrl} alt={`panel_${panelNum}_B`} />
                      ) : (
                        <div className="ph">Preview B</div>
                      )}
                    </div>

                    <div className="imgBtns">
                      <button
                        className="miniBtn primary"
                        type="button"
                        onClick={() => onGenerateWhiskImage(i, "B")}
                        disabled={!!s.imageBLoading}
                        title="Generate image B"
                      >
                        <span className="btnTitle">{s.imageBLoading ? "WAIT..." : "GENERATE"}</span>
                        <span className="btnSub">IMG B</span>
                      </button>

                      <button
                        className="miniBtn"
                        type="button"
                        onClick={() => s.imageBDataUrl && downloadDataUrl(s.imageBDataUrl, `panel_${panelNum}_B.png`)}
                        disabled={!s.imageBDataUrl}
                        title="Download image B"
                      >
                        <span className="btnTitle">DOWNLOAD</span>
                        <span className="btnSub">IMG B</span>
                      </button>

                      <button className="miniBtn" type="button" onClick={() => onCopyPrompt(i, "B")} title="Copy prompt image B">
                        <span className="btnTitle">COPY</span>
                        <span className="btnSub">PROMPT B</span>
                      </button>
                    </div>

                    <div className="narrBox">“{narr.b}”</div>
                  </div>
                </div>

                <div className="panelBottom">
                  <div className="audioGroup">
                    <button className="miniBtn wide" type="button" onClick={() => onGenerateAudio(i)} disabled={!!s.audioLoading}>
                      <span className="btnTitle">{s.audioLoading ? "WAIT..." : "GENERATE"}</span>
                      <span className="btnSub">SUARA / AUDIO</span>
                    </button>

                    <button className="miniBtn wide" type="button" onClick={() => onPlayOrPause(i)} disabled={!s.audioUrl}>
                      <span className="btnTitle">{showPause ? "PAUSE" : "PLAY"}</span>
                      <span className="btnSub">AUDIO</span>
                    </button>

                    <button
                      className="miniBtn wide"
                      type="button"
                      onClick={async () => {
                        if (!s.audioUrl) return;
                        const wav = await fetchAudioAsWavArrayBuffer(s.audioUrl);
                        downloadArrayBufferAsFile(wav, `panel_${panelNum}.wav`, "audio/wav");
                        setMsg(`DOWNLOADED ✅ panel_${panelNum}.wav`);
                      }}
                      disabled={!s.audioUrl}
                    >
                      <span className="btnTitle">DOWNLOAD</span>
                      <span className="btnSub">AUDIO</span>
                    </button>

                    <button className="miniBtn wide" type="button" onClick={() => onCopyVideoPrompt(i)} title="Copy video prompt">
                      <span className="btnTitle">COPY</span>
                      <span className="btnSub">PROMPT VIDEO</span>
                    </button>
                  </div>

                  {s.audioError ? <div className="err inline">AUDIO: {s.audioError}</div> : null}
                </div>
                </div>
            );
          })}
        </div>
      )}

      <style>{`
        .wrap{
          min-height:100vh;
          background: #050712;
          padding: 16px;
          font-family: ui-rounded, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          color:#fff;
        }

        /* HEADER (NO WHITE BANNER) */
        .headerRow{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 14px;
          flex-wrap:wrap;
          margin-bottom: 12px;
        }

        .brandLeft{
          display:flex;
          align-items:flex-start;
        }

        /* logo kiri, super gede */
        .brandLogo{
          height: 210px;
          width:auto;
          display:block;
          filter: drop-shadow(0 14px 0 rgba(0,0,0,.35));
        }

        .actionsRight{
          display:flex;
          flex-direction:column;
          gap: 10px;
          align-items:flex-end;
          flex: 1;
          min-width: 320px;
        }

        .btnRow{
          display:flex;
          gap: 10px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .btn{
          border:3px solid #000;
          border-radius:16px;
          padding: 10px 12px;
          background: rgba(255,255,255,.92);
          font-weight:900;
          cursor:pointer;
          box-shadow: 0 6px 0 #000;
          text-decoration:none;
          color:#111;
          text-transform:uppercase;
          font-size:12px;
        }
        .btn:active{ transform: translateY(2px); box-shadow: 0 4px 0 #000; }
        .btn:disabled{ opacity:.6; cursor:not-allowed; }

        .pillRow{
          display:flex;
          gap: 10px;
          flex-wrap:wrap;
          justify-content:flex-end;
          align-items:center;
        }
        .pill{
          border:3px solid #000;
          border-radius:999px;
          padding: 8px 10px;
          background: rgba(255,255,255,.92);
          font-weight:900;
          box-shadow: 0 6px 0 rgba(0,0,0,.25);
          font-size:12px;
          text-transform:uppercase;
          color:#111;
        }
        .pill.ok{ background:#dcfce7; }
        .pill.bad{ background:#fee2e2; }
        .pill.msg{ background:#e0e7ff; }

        .empty{
          margin-top: 14px;
          background: rgba(255,255,255,.92);
          border:6px solid #000;
          border-radius:24px;
          padding: 14px;
          box-shadow: 0 18px 50px rgba(0,0,0,.45);
          max-width: 980px;
          margin-left:auto;
          margin-right:auto;
          color:#111;
        }
        .emptyTitle{ font-weight: 1000; }
        .emptySub{ margin-top: 6px; font-weight: 800; opacity:.8; font-size: 12px; }

        .panels{
          margin-top: 12px;
          display:grid;
          gap: 14px;
          max-width: 1100px;
          margin-left:auto;
          margin-right:auto;
        }

        .panelCard{
          background: rgba(255,255,255,.92);
          border:7px solid #000;
          border-radius:26px;
          padding: 14px;
          box-shadow: 0 18px 60px rgba(0,0,0,.55);
          color:#111;
        }

        .panelTop{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          flex-wrap:wrap;
          margin-bottom: 10px;
        }

        .panelNo{
          width: 54px;
          height: 54px;
          border-radius:14px;
          border:4px solid #000;
          background:#f472b6;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:1000;
          box-shadow: 0 10px 0 rgba(0,0,0,.12);
          font-size:18px;
        }

        .panelTitle{
          flex:1;
          min-width: 220px;
          border:4px solid #000;
          border-radius:18px;
          padding: 12px 14px;
          font-weight:1000;
          box-shadow: 0 10px 0 rgba(0,0,0,.12);
          background:#fff;
          text-transform:uppercase;
          letter-spacing:.3px;
          text-align:center;
        }

        .imgGrid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 980px){
          .imgGrid{ grid-template-columns: 1fr; }
          .brandLogo{ height: 150px; }
        }

        .imgCol{
          border:4px solid #000;
          border-radius:22px;
          padding: 12px;
          box-shadow: 0 12px 0 rgba(0,0,0,.12);
          background:#fff;
        }

        .imgLabel{
          border:4px solid #000;
          border-radius:999px;
          padding: 10px 12px;
          font-weight:1000;
          box-shadow: 0 10px 0 rgba(0,0,0,.12);
          text-transform:uppercase;
          font-size:12px;
          display:inline-block;
          margin-bottom: 10px;
        }
        .imgLabel.a{ background:#f472b6; }
        .imgLabel.b{ background:#22c7c7; }

        .imgFrame{
          border:4px solid #000;
          border-radius:18px;
          overflow:hidden;
          background:#0b1220;
        }

        .ph{
          height: 360px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 900;
          opacity:.25;
          color:#fff;
        }

        .preview{
          width:100%;
          height:auto;
          display:block;
          background:#000;
        }

        .imgBtns{
          margin-top: 10px;
          display:flex;
          gap: 10px;
          flex-wrap:wrap;
          align-items:stretch;
        }

        .miniBtn{
          border:3px solid #000;
          border-radius:14px;
          padding: 10px 12px;
          background:#fff;
          font-weight: 1000;
          cursor:pointer;
          box-shadow: 0 6px 0 #000;
          text-transform:uppercase;
          font-size: 12px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          min-width: 120px;
        }
        .miniBtn:active{ transform: translateY(2px); box-shadow: 0 4px 0 #000; }
        .miniBtn.primary{ background:#dcfce7; }
        .miniBtn:disabled{ opacity:.65; cursor:not-allowed; }

        .miniBtn.wide{
          min-width: 160px;
        }

        .btnTitle{ font-size: 12px; line-height: 1.05; }
        .btnSub{ font-size: 10px; line-height: 1.05; opacity:.75; margin-top: 2px; }

        .narrBox{
          margin-top: 12px;
          border:4px solid #000;
          border-radius:18px;
          padding: 12px;
          font-weight: 900;
          background:#fff;
          box-shadow: 0 10px 0 rgba(0,0,0,.12);
          white-space: pre-wrap;
          line-height: 1.3;
          font-style: italic;
        }

        .panelBottom{
          margin-top: 14px;
          border-top:4px solid rgba(0,0,0,.15);
          padding-top: 12px;
        }

        .audioGroup{
          display:flex;
          gap: 10px;
          flex-wrap:wrap;
          align-items:stretch;
          justify-content:flex-start;
        }

        .err{
          margin-top: 10px;
          border:3px solid #000;
          border-radius:14px;
          padding: 8px 10px;
          background:#fee2e2;
          font-weight: 900;
          font-size: 12px;
          text-transform:uppercase;
          white-space: pre-wrap;
        }
        .err.inline{ margin-top: 12px; }

        /* =========================
   MOBILE ONLY OVERRIDES
   TIDAK SENTUH LOGIC
========================= */
@media (max-width: 900px) {
  .grid,
  .row2,
  .imgRow,
  .split {
    grid-template-columns: 1fr !important;
  }

  .panelCard {
    padding: 12px !important;
  }

  .btnRow {
    flex-direction: column !important;
    gap: 8px !important;
  }

  .btn,
  .miniBtn {
    width: 100% !important;
  }

  textarea,
  input {
    font-size: 16px !important;
  }
}

@media (max-width: 560px) {
  .wrap {
    padding: 10px !important;
  }

  .logo {
    width: 140px !important;
    height: auto !important;
  }

  .card {
    border-width: 4px !important;
  }

  .pill {
    font-size: 10px !important;
    padding: 6px 10px !important;
  }
}

      `}</style>
    </div>
  );
}

