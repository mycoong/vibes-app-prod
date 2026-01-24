"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Scene = {
  id: string;
  narrative: string;
  imagePromptA: string;
  imagePromptB: string;
  videoPrompt: string;

  // optional persisted
  audioBase64?: string;
  audioMime?: string;
};

type GenerateMeta = {
  topic: string;
  style: string;
  format: string;
  audience: string;
  genre: string;
  template: string;
};

const LS_KEYS = {
  LAST_SCENES: "YOSO_LAST_SCENES",
};

async function copyText(text: string) {
  const t = String(text || "").trim();
  if (!t) return;
  await navigator.clipboard.writeText(t);
}

function buildBulk18(scenes: Scene[], meta?: Partial<GenerateMeta>) {
  const header = [
    "GLOBAL STYLE (apply to every scene):",
    "- Vertical 9:16 cinematic diorama miniature",
    "- Macro tilt-shift, shallow depth of field, tiny handcrafted details",
    "- Ultra realistic miniature materials (wood, paint, fabric, dust), museum-grade diorama",
    "- Dramatic cinematic lighting, volumetric rays, rich texture",
    "- No text, no watermark, no hands, no modern objects, no CGI look",
    "",
    "CONTEXT (for consistency):",
    `- Topic: ${meta?.topic ?? "-"}`,
    `- Category: ${meta?.style ?? "-"}`,
    `- Format: ${meta?.format ?? "-"}`,
    `- Audience: ${meta?.audience ?? "-"}`,
    `- Genre: ${meta?.genre ?? "-"}`,
    `- Template: ${meta?.template ?? "-"}`,
    "",
    "OUTPUT FORMAT:",
    "",
  ].join("\n");

  const blocks: string[] = [header];
  scenes.forEach((s, i) => {
    const n = i + 1;
    blocks.push(`SCENE ${n}A:\n${String(s.imagePromptA || "").trim()}\n`);
    blocks.push(`SCENE ${n}B:\n${String(s.imagePromptB || "").trim()}\n`);
  });
  return blocks.join("\n");
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function CanvasHelperPage() {
  const [mounted, setMounted] = useState(false);
  const [msg, setMsg] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [meta, setMeta] = useState<Partial<GenerateMeta> | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    loadFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadFromStorage() {
    setMsg("");
    try {
      const raw = localStorage.getItem(LS_KEYS.LAST_SCENES);
      if (!raw) {
        setScenes([]);
        setMeta(null);
        setSavedAt(null);
        setMsg("NO_DATA: belum ada YOSO_LAST_SCENES. Generate 9 panel dulu di /builder/panels.");
        return;
      }

      const parsed = safeJsonParse(raw);
      const arr = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
      const m = parsed?.meta && typeof parsed.meta === "object" ? parsed.meta : null;
      const t = typeof parsed?.savedAt === "number" ? parsed.savedAt : null;

      const normalized: Scene[] = arr.map((s: any, idx: number) => ({
        id: String(s?.id || `scene-${idx}`),
        narrative: String(s?.narrative || ""),
        imagePromptA: String(s?.imagePromptA || ""),
        imagePromptB: String(s?.imagePromptB || ""),
        videoPrompt: String(s?.videoPrompt || ""),
        audioBase64: s?.audioBase64 ? String(s.audioBase64) : undefined,
        audioMime: s?.audioMime ? String(s.audioMime) : undefined,
      }));

      setScenes(normalized);
      setMeta(m);
      setSavedAt(t);
      setActiveIndex((prev) => Math.max(0, Math.min(prev, Math.max(0, normalized.length - 1))));
      if (!normalized.length) {
        setMsg("NO_SCENES: YOSO_LAST_SCENES ada tapi scenes kosong.");
      } else {
        setMsg(`OK: loaded ${normalized.length} scenes ✅`);
      }
    } catch (e: any) {
      setMsg(`LOAD_FAILED: ${String(e?.message || e)}`);
      setScenes([]);
      setMeta(null);
      setSavedAt(null);
    }
  }

  const active = scenes[activeIndex] || null;

  const metaLine = useMemo(() => {
    if (!meta) return "-";
    const parts = [
      meta.topic ? `TOPIC: ${meta.topic}` : null,
      meta.style ? `CAT: ${meta.style}` : null,
      meta.format ? `FMT: ${meta.format}` : null,
      meta.audience ? `AUD: ${meta.audience}` : null,
      meta.genre ? `GEN: ${meta.genre}` : null,
      meta.template ? `TPL: ${meta.template}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" • ") : "-";
  }, [meta]);

  const savedAtLabel = useMemo(() => {
    if (!savedAt) return "-";
    try {
      return new Date(savedAt).toLocaleString();
    } catch {
      return String(savedAt);
    }
  }, [savedAt]);

  async function onCopy(value: string, label: string) {
    try {
      await copyText(value);
      setMsg(`COPIED ✅ ${label}`);
    } catch {
      setMsg("COPY_FAILED: clipboard permission?");
    }
  }

  async function onCopyBulk18() {
    if (!scenes.length) return setMsg("NO_SCENES: generate dulu");
    try {
      await copyText(buildBulk18(scenes, meta || undefined));
      setMsg("COPIED ✅ BULK 18");
    } catch {
      setMsg("COPY_FAILED: clipboard permission?");
    }
  }

  function onCopyBulk18AndOpenAIStudio() {
    onCopyBulk18();
    window.open("https://aistudio.google.com", "_blank", "noopener,noreferrer");
  }

  function onBackPanels() {
    window.location.href = "/builder/panels";
  }

  function onBackBuilder() {
    window.location.href = "/builder";
  }

  function onOpenAIStudio() {
    window.open("https://aistudio.google.com", "_blank", "noopener,noreferrer");
  }

  function onOpenByScene(n: number) {
    setActiveIndex(Math.max(0, Math.min(n, scenes.length - 1)));
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          <div className="title">CANVAS HELPER</div>
          <div className="tag">YOSOApps the Viral Creator</div>
        </div>

        <div className="actions">
          <button className="linkBtn" type="button" onClick={onBackBuilder}>
            ← BACK TO IDE
          </button>
          <button className="linkBtn" type="button" onClick={onBackPanels}>
            ← BACK TO PANELS
          </button>

          <button className="linkBtn" type="button" onClick={onCopyBulk18} disabled={!mounted || !scenes.length}>
            COPY BULK 18
          </button>

          <button className="linkBtn" type="button" onClick={onCopyBulk18AndOpenAIStudio} disabled={!mounted || !scenes.length}>
            COPY BULK 18 + OPEN AI STUDIO
          </button>

          <button className="linkBtn" type="button" onClick={onOpenAIStudio}>
            OPEN AI STUDIO
          </button>

          <button className="linkBtn" type="button" onClick={loadFromStorage}>
            REFRESH
          </button>

          <Link className="linkBtn" href="/settings">
            SETTINGS
          </Link>
        </div>
      </div>

      <div className="metaCard">
        <div className="metaRow">
          <div className="metaTitle">META</div>
          <div className="pill">{metaLine}</div>
        </div>
        <div className="metaRow">
          <div className="metaTitle">SAVED AT</div>
          <div className="pill">{savedAtLabel}</div>
        </div>
      </div>

      <div className="grid">
        <aside className="card left">
          <div className="sectionTitle">SCENES</div>

          {!scenes.length ? (
            <div className="empty">
              <div className="emptyTitle">Belum ada data.</div>
              <div className="emptySub">
                Generate 9 panel dulu di <span className="mono">/builder/panels</span> agar tersimpan ke{" "}
                <span className="mono">YOSO_LAST_SCENES</span>.
              </div>
              <button className="bigBtn" type="button" onClick={onBackPanels}>
                BUKA PANELS
              </button>
            </div>
          ) : (
            <div className="sceneList">
              {scenes.map((s, idx) => {
                const active = idx === activeIndex;
                const hasAudio = !!s.audioBase64;
                return (
                  <button
                    key={s.id || idx}
                    type="button"
                    className={`sceneItem ${active ? "active" : ""}`}
                    onClick={() => onOpenByScene(idx)}
                    title={`Open scene #${idx + 1}`}
                  >
                    <span className="sceneIndex">#{idx + 1}</span>
                    <span className="sceneMini">
                      {String(s.narrative || "").slice(0, 60) || "(empty narrative)"}
                      {String(s.narrative || "").length > 60 ? "…" : ""}
                    </span>
                    <span className={`sceneBadge ${hasAudio ? "ok" : "bad"}`}>
                      {hasAudio ? "AUDIO ✓" : "AUDIO -"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="hint">
            <div className="hintTitle">Tips</div>
            <div className="hintText">
              - Ini hanya helper untuk copy prompt + buka AI Studio. <br />
              - Kalau data kosong, balik ke Panels lalu generate 9 panel (dan audio kalau mau).
            </div>
          </div>
        </aside>

        <main className="card right">
          <div className="sectionTitle">CANVAS</div>

          {!active ? (
            <div className="canvasEmpty">
              <div className="emptyTitle">Pilih scene di kiri.</div>
              <div className="emptySub">Nanti prompt A/B + video + narrative muncul di sini.</div>
            </div>
          ) : (
            <div className="canvas">
              <div className="canvasHead">
                <div className="canvasLabel">
                  <span className="badgePink">SCENE</span>
                  <span className="bigIndex">#{activeIndex + 1}</span>
                </div>

                <div className="canvasBtns">
                  <button className="miniBtn" type="button" onClick={() => onCopy(active.narrative, `NARRATIVE #${activeIndex + 1}`)}>
                    COPY NARRATIVE
                  </button>
                  <button className="miniBtn" type="button" onClick={() => onCopy(active.videoPrompt, `VIDEO #${activeIndex + 1}`)}>
                    COPY VIDEO
                  </button>
                </div>
              </div>

              <div className="row2">
                <div className="promptBox">
                  <div className="promptTop">
                    <div className="pTitle">
                      <span className="badgeA">A</span> IMAGE PROMPT A
                    </div>
                    <button className="copyBtn" type="button" onClick={() => onCopy(active.imagePromptA, `PROMPT A #${activeIndex + 1}`)}>
                      COPY
                    </button>
                  </div>
                  <textarea className="area" readOnly value={active.imagePromptA || ""} spellCheck={false} />
                </div>

                <div className="promptBox">
                  <div className="promptTop">
                    <div className="pTitle">
                      <span className="badgeB">B</span> IMAGE PROMPT B
                    </div>
                    <button className="copyBtn" type="button" onClick={() => onCopy(active.imagePromptB, `PROMPT B #${activeIndex + 1}`)}>
                      COPY
                    </button>
                  </div>
                  <textarea className="area" readOnly value={active.imagePromptB || ""} spellCheck={false} />
                </div>
              </div>

              <div className="wide">
                <div className="promptTop">
                  <div className="pTitle">
                    <span className="badgeC">V</span> VIDEO PROMPT
                  </div>
                  <button className="copyBtn" type="button" onClick={() => onCopy(active.videoPrompt, `VIDEO #${activeIndex + 1}`)}>
                    COPY
                  </button>
                </div>
                <textarea className="area" readOnly value={active.videoPrompt || ""} spellCheck={false} />
              </div>

              <div className="wide">
                <div className="promptTop">
                  <div className="pTitle">
                    <span className="badgeN">N</span> NARRATIVE
                  </div>
                  <button className="copyBtn" type="button" onClick={() => onCopy(active.narrative, `NARRATIVE #${activeIndex + 1}`)}>
                    COPY
                  </button>
                </div>
                <textarea className="area" readOnly value={active.narrative || ""} spellCheck={false} />
              </div>

              <div className="footerBtns">
                <button className="bigBtn" type="button" onClick={onCopyBulk18} disabled={!mounted || !scenes.length}>
                  COPY BULK 18 (ALL)
                </button>
                <button className="bigBtn alt" type="button" onClick={onCopyBulk18AndOpenAIStudio} disabled={!mounted || !scenes.length}>
                  COPY BULK 18 + OPEN AI STUDIO
                </button>
              </div>
            </div>
          )}

          <div className="debug">
            <div className="debugTitle">Debug</div>
            {msg ? <pre className="pre">{msg}</pre> : null}
          </div>
        </main>
      </div>

      <style>{`
        :global(html),
        :global(body) { overflow-x: hidden; }
        .wrap{
          min-height:100vh;
          padding:18px;
          background: radial-gradient(1200px 800px at 20% 0%, #0b1b3a 0%, #060a14 60%, #050712 100%);
          font-family: ui-rounded, "Comic Sans MS", "Trebuchet MS", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }

        .topbar{
          background:#ffd84a;
          border:4px solid #000;
          border-radius:18px;
          padding:14px 16px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          box-shadow:0 16px 40px rgba(0,0,0,.35);
          flex-wrap:wrap;
        }
        .brand{ color:#111; }
        .title{ font-weight:1000; font-size:18px; letter-spacing:.3px; text-transform:uppercase; }
        .tag{ font-size:12px; font-weight:900; opacity:.9; }

        .actions{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
        .linkBtn{
          text-decoration:none; color:#111; font-weight:1000; font-size:12px;
          padding:10px 12px; border-radius:14px; border:3px solid #000;
          background:#fff; box-shadow:0 6px 0 #000; cursor:pointer; text-transform:uppercase;
        }
        .linkBtn:active{ transform:translateY(2px); box-shadow:0 4px 0 #000; }
        .linkBtn:disabled{ opacity:.65; cursor:not-allowed; }

        .metaCard{
          margin-top:14px;
          background:#fff;
          border:4px solid #000;
          border-radius:18px;
          padding:12px 14px;
          box-shadow:0 16px 40px rgba(0,0,0,.35);
          display:grid;
          gap:10px;
        }
        .metaRow{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .metaTitle{ font-weight:1000; text-transform:uppercase; font-size:12px; color:#111; }
        .pill{
          font-size:12px; font-weight:1000; padding:10px 12px; border-radius:999px;
          border:3px solid #000; background:#f1f5f9; box-shadow:0 6px 0 #000; color:#111;
        }

        .grid{
          display:grid;
          grid-template-columns:360px 1fr;
          gap:16px;
          margin-top:16px;
          align-items:start;
        }

        .card{
          background:#fff;
          border-radius:22px;
          border:4px solid #000;
          padding:16px;
          box-shadow:0 18px 50px rgba(0,0,0,.35);
          min-width:0;
        }

        .sectionTitle{
          font-weight:1000;
          text-transform:uppercase;
          font-size:16px;
          margin-bottom:10px;
          color:#111;
        }

        .empty{
          border:4px dashed #000;
          border-radius:22px;
          padding:16px;
          background:#f1f5f9;
          color:#111;
        }
        .emptyTitle{ font-weight:1000; text-transform:uppercase; margin-bottom:6px; }
        .emptySub{ font-weight:900; font-size:12px; opacity:.85; line-height:1.45; }
        .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

        .sceneList{ display:grid; gap:10px; }
        .sceneItem{
          width:100%;
          display:grid;
          grid-template-columns:72px 1fr 86px;
          gap:10px;
          align-items:center;
          padding:10px 12px;
          border:3px solid #000;
          border-radius:18px;
          background:#fff;
          box-shadow:0 8px 0 #000;
          cursor:pointer;
          text-align:left;
        }
        .sceneItem:active{ transform:translateY(2px); box-shadow:0 6px 0 #000; }
        .sceneItem.active{ background:#dcfce7; }
        .sceneIndex{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:3px solid #000;
          border-radius:14px;
          padding:8px 10px;
          font-weight:1000;
          background:#ff66c4;
          box-shadow:0 6px 0 #000;
        }
        .sceneMini{
          font-weight:900;
          font-size:12px;
          color:#111;
          opacity:.9;
          word-break:break-word;
          overflow-wrap:anywhere;
        }
        .sceneBadge{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:3px solid #000;
          border-radius:999px;
          padding:8px 10px;
          font-weight:1000;
          font-size:11px;
          box-shadow:0 6px 0 #000;
          white-space:nowrap;
        }
        .sceneBadge.ok{ background:#4adee5; }
        .sceneBadge.bad{ background:#fee2e2; }

        .hint{
          margin-top:14px;
          padding:12px;
          border:3px solid #000;
          border-radius:16px;
          background:#f1f5f9;
        }
        .hintTitle{ font-weight:1000; text-transform:uppercase; font-size:12px; margin-bottom:6px; }
        .hintText{ font-weight:900; font-size:12px; opacity:.85; line-height:1.5; }

        .canvas{ display:grid; gap:12px; }
        .canvasHead{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .canvasLabel{ display:flex; align-items:center; gap:10px; }
        .badgePink{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:8px 10px;
          border:3px solid #000;
          border-radius:14px;
          background:#ffd84a;
          font-weight:1000;
          box-shadow:0 6px 0 #000;
          text-transform:uppercase;
        }
        .bigIndex{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:8px 12px;
          border:3px solid #000;
          border-radius:14px;
          background:#ff66c4;
          font-weight:1000;
          box-shadow:0 6px 0 #000;
        }
        .canvasBtns{ display:flex; gap:10px; flex-wrap:wrap; }
        .miniBtn{
          padding:10px 12px;
          border:3px solid #000;
          border-radius:14px;
          background:#4adee5;
          font-weight:1000;
          box-shadow:0 6px 0 #000;
          cursor:pointer;
          text-transform:uppercase;
          font-size:12px;
        }
        .miniBtn:active{ transform:translateY(2px); box-shadow:0 4px 0 #000; }

        .row2{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
          min-width:0;
        }

        .promptBox, .wide{
          border:4px solid #000;
          border-radius:22px;
          padding:10px;
          background:#fff;
          box-shadow:0 12px 0 rgba(0,0,0,.15);
          min-width:0;
        }

        .promptTop{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:8px;
        }
        .pTitle{
          font-weight:1000;
          text-transform:uppercase;
          font-size:12px;
          color:#111;
          display:flex;
          align-items:center;
          gap:8px;
        }
        .badgeA, .badgeB, .badgeC, .badgeN{
          width:28px;
          height:28px;
          border-radius:12px;
          border:3px solid #000;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          font-weight:1000;
          box-shadow:0 6px 0 #000;
        }
        .badgeA{ background:#ff66c4; }
        .badgeB{ background:#4adee5; }
        .badgeC{ background:#ffd84a; }
        .badgeN{ background:#dcfce7; }

        .copyBtn{
          padding:8px 10px;
          border:3px solid #000;
          border-radius:14px;
          background:#fff;
          font-weight:1000;
          box-shadow:0 6px 0 #000;
          cursor:pointer;
          text-transform:uppercase;
          font-size:12px;
        }
        .copyBtn:active{ transform:translateY(2px); box-shadow:0 4px 0 #000; }

        .area{
          width:100%;
          height:160px;
          resize:vertical;
          border:0;
          outline:none;
          background:rgba(241,245,249,.9);
          border-radius:16px;
          padding:12px;
          font-weight:900;
          font-size:12px;
          line-height:1.45;
          color:#111;
          box-shadow:inset 0 0 0 3px #000;
          white-space:pre-wrap;
          word-break:break-word;
          overflow-wrap:anywhere;
        }

        .footerBtns{
          display:flex;
          gap:12px;
          flex-wrap:wrap;
          margin-top:6px;
        }

        .bigBtn{
          width:auto;
          padding:14px 14px;
          border:4px solid #000;
          border-radius:20px;
          background:#ffd84a;
          font-weight:1000;
          font-size:14px;
          text-transform:uppercase;
          cursor:pointer;
          box-shadow:0 10px 0 #000;
        }
        .bigBtn:active{ transform:translateY(3px); box-shadow:0 7px 0 #000; }
        .bigBtn:disabled{ opacity:.65; cursor:not-allowed; }
        .bigBtn.alt{ background:#4adee5; }

        .canvasEmpty{
          border:4px dashed #000;
          border-radius:22px;
          padding:16px;
          background:#f1f5f9;
          color:#111;
        }

        .debug{
          margin-top:16px;
          padding-top:14px;
          border-top:3px dashed rgba(0,0,0,.25);
        }
        .debugTitle{
          font-weight:1000;
          text-transform:uppercase;
          font-size:13px;
          margin-bottom:8px;
          color:#111;
        }
        .pre{
          margin-top:10px;
          padding:12px;
          border-radius:16px;
          border:3px solid #000;
          background:#fff;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size:11px;
          white-space:pre-wrap;
          word-break:break-word;
          overflow-wrap:anywhere;
          max-width:100%;
          overflow:hidden;
          color:#111;
        }

        @media (max-width: 980px){
          .grid{ grid-template-columns:1fr; }
          .row2{ grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  );
}
