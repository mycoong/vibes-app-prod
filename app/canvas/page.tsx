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

  async function onCopy(text: string, label: string) {
    try {
      await copyText(text);
      setMsg(`COPIED: ${label} ✅`);
    } catch {
      setMsg(`COPY_FAILED: ${label}`);
    }
  }

  async function onCopyBulk18() {
    try {
      const bulk = buildBulk18(scenes, meta || undefined);
      await copyText(bulk);
      setMsg("COPIED: BULK 18 ✅");
    } catch {
      setMsg("COPY_FAILED: BULK 18");
    }
  }

  function onOpenAIStudio() {
    window.open("https://aistudio.google.com/app/prompts/new_chat", "_blank", "noopener,noreferrer");
  }

  async function onCopyBulk18AndOpenAIStudio() {
    await onCopyBulk18();
    onOpenAIStudio();
  }

  function onBackBuilder() {
    window.location.href = "/builder";
  }

  function onBackPanels() {
    window.location.href = "/builder/panels";
  }

  function onOpenByScene(idx: number) {
    setActiveIndex(Math.max(0, Math.min(idx, Math.max(0, scenes.length - 1))));
  }

  const hasData = !!scenes.length;

  return (
    <div className="wrap">
      <div className="topRow">
        <div className="badgeRow">
          <span className="pill ok">CANVAS</span>
          <span className="pill">{hasData ? `SCENES: ${scenes.length}` : "SCENES: -"}</span>
          <span className="pill">{`SAVED: ${savedAtLabel}`}</span>
        </div>

        <div className="rightBtns">
          <button className="btn ghost" type="button" onClick={onBackBuilder}>
            ← BACK IDE
          </button>
          <button className="btn ghost" type="button" onClick={onBackPanels}>
            ← PANELS
          </button>
          <button className="btn" type="button" onClick={onCopyBulk18} disabled={!mounted || !scenes.length}>
            COPY BULK 18
          </button>
          <button className="btn" type="button" onClick={onCopyBulk18AndOpenAIStudio} disabled={!mounted || !scenes.length}>
            COPY + AI STUDIO
          </button>
          <button className="btn ghost" type="button" onClick={onOpenAIStudio}>
            OPEN AI STUDIO
          </button>
          <button className="btn ghost" type="button" onClick={loadFromStorage}>
            REFRESH
          </button>
          <Link className="settingsBtn" href="/settings">
            SETTINGS
          </Link>
        </div>
      </div>

      <div className="stage">
        <div className="card hero">
          <div className="heroLeft">
            <div className="vibesLogo">Vibes Canvas</div>
            <div className="vibesSlogan">Helper untuk copy prompt + buka AI Studio (ngikut UI Builder/Panels).</div>
          </div>

          <div className="heroRight">
            <div className="metaLine">{metaLine}</div>
            {msg ? <div className="msg">{msg}</div> : <div className="msg muted">Ready.</div>}
          </div>
        </div>

        <div className="grid">
          <aside className="card left">
            <div className="sectionHead">
              <div className="label cyan">SCENES</div>
              <div className="smallMuted">{hasData ? "Klik scene untuk buka prompt." : "Belum ada data."}</div>
            </div>

            {!scenes.length ? (
              <div className="empty">
                <div className="emptyTitle">Belum ada data.</div>
                <div className="emptySub">
                  Generate 9 panel dulu di <span className="mono">/builder/panels</span> supaya tersimpan ke{" "}
                  <span className="mono">YOSO_LAST_SCENES</span>.
                </div>
                <button className="bigBtn" type="button" onClick={onBackPanels}>
                  BUKA PANELS
                </button>
              </div>
            ) : (
              <div className="sceneList">
                {scenes.map((s, idx) => {
                  const isActive = idx === activeIndex;
                  const hasAudio = !!s.audioBase64;
                  return (
                    <button
                      key={s.id || idx}
                      type="button"
                      className={`sceneItem ${isActive ? "active" : ""}`}
                      onClick={() => onOpenByScene(idx)}
                      title={`Open scene #${idx + 1}`}
                    >
                      <div className="sceneLeft">
                        <span className="sceneIndex">#{idx + 1}</span>
                        <span className="sceneMini">
                          {String(s.narrative || "").slice(0, 60) || "(empty narrative)"}
                          {String(s.narrative || "").length > 60 ? "…" : ""}
                        </span>
                      </div>
                      <span className={`sceneBadge ${hasAudio ? "ok" : "bad"}`}>{hasAudio ? "AUDIO ✓" : "AUDIO -"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="hint">
              <div className="hintTitle">Tips</div>
              <div className="hintText">
                - Ini helper untuk copy prompt + buka AI Studio.
                <br />- Kalau kosong, balik ke Panels lalu generate 9 panel.
              </div>
            </div>
          </aside>

          <main className="card right">
            <div className="sectionHead">
              <div className="label pink">CANVAS</div>
              <div className="smallMuted">{active ? `SCENE #${activeIndex + 1}` : "Pilih scene di kiri."}</div>
            </div>

            {!active ? (
              <div className="canvasEmpty">
                <div className="emptyTitle">Pilih scene di kiri.</div>
                <div className="emptySub">Nanti prompt A/B + video + narrative muncul di sini.</div>
              </div>
            ) : (
              <div className="canvas">
                <div className="canvasHead">
                  <div className="canvasLabel">
                    <span className="pill ok">SCENE</span>
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
                    <textarea className="area" value={active.imagePromptA} readOnly />
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
                    <textarea className="area" value={active.imagePromptB} readOnly />
                  </div>
                </div>

                <div className="promptBox wide">
                  <div className="promptTop">
                    <div className="pTitle">
                      <span className="badgeV">V</span> VIDEO PROMPT
                    </div>
                    <button className="copyBtn" type="button" onClick={() => onCopy(active.videoPrompt, `VIDEO #${activeIndex + 1}`)}>
                      COPY
                    </button>
                  </div>
                  <textarea className="area" value={active.videoPrompt} readOnly />
                </div>

                <div className="promptBox wide">
                  <div className="promptTop">
                    <div className="pTitle">
                      <span className="badgeN">N</span> NARRATIVE
                    </div>
                    <button className="copyBtn" type="button" onClick={() => onCopy(active.narrative, `NARRATIVE #${activeIndex + 1}`)}>
                      COPY
                    </button>
                  </div>
                  <textarea className="area" value={active.narrative} readOnly />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <style>{`
        :global(html), :global(body){ margin:0; padding:0; }
        :global(html), :global(body){ overflow-x:hidden; }

        .wrap{
          min-height: 100vh;
          background: radial-gradient(1200px 800px at 20% 0%, #0b1b3a 0%, #060a14 60%, #050712 100%);
          padding: 18px;
          font-family: ui-rounded, "Comic Sans MS", "Trebuchet MS", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          color: #fff;
          position: relative;
        }

        .topRow{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
          flex-wrap:wrap;
          margin-bottom: 12px;
        }

        .badgeRow{
          display:flex;
          gap: 10px;
          flex-wrap:wrap;
          align-items:center;
        }

        .pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding: 8px 12px;
          border: 3px solid #000;
          background: rgba(255,255,255,0.10);
          border-radius: 999px;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: .5px;
          box-shadow: 0 6px 0 rgba(0,0,0,.35);
          text-transform: uppercase;
        }
        .pill.ok{ background:#79ff86; color:#05120a; }

        .rightBtns{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          justify-content:flex-end;
          align-items:center;
        }

        .btn{
          background:#ffd84a;
          border: 3px solid #000;
          border-radius: 14px;
          padding: 10px 12px;
          font-weight: 1000;
          cursor:pointer;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
          transition: transform .06s ease;
          color:#111;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: .6px;
        }
        .btn:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }
        .btn:disabled{ opacity:.5; cursor:not-allowed; }
        .btn.ghost{
          background: rgba(255,255,255,0.10);
          color:#fff;
        }

        .settingsBtn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          background:#00e0ff;
          border: 3px solid #000;
          border-radius: 14px;
          padding: 10px 12px;
          font-weight: 1000;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
          text-decoration:none;
          color:#06131a;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: .6px;
        }
        .settingsBtn:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }

        .stage{
          max-width: 1200px;
          margin: 0 auto;
        }

        .card{
          border: 4px solid #000;
          border-radius: 18px;
          background: rgba(255,255,255,0.07);
          box-shadow: 0 12px 0 rgba(0,0,0,.35);
        }

        .hero{
          display:flex;
          gap: 14px;
          padding: 14px;
          align-items:stretch;
          justify-content:space-between;
          margin-bottom: 14px;
          flex-wrap:wrap;
        }
        .heroLeft{ min-width: 240px; }
        .heroRight{ display:flex; flex-direction:column; gap:8px; min-width: 260px; flex:1; align-items:flex-end; }
        .vibesLogo{
          font-weight: 1000;
          font-size: 22px;
          letter-spacing: .6px;
          text-transform: uppercase;
        }
        .vibesSlogan{
          opacity: .85;
          margin-top: 6px;
          font-weight: 800;
          font-size: 12px;
        }
        .metaLine{
          font-weight: 900;
          font-size: 12px;
          opacity: .9;
          text-align:right;
        }
        .msg{
          font-weight: 1000;
          font-size: 12px;
          padding: 8px 10px;
          border: 3px solid #000;
          border-radius: 14px;
          background: rgba(0,0,0,.25);
          max-width: 520px;
          text-align:right;
        }
        .msg.muted{ opacity:.75; }

        .grid{
          display:grid;
          grid-template-columns: 360px 1fr;
          gap: 14px;
        }
        @media (max-width: 980px){
          .grid{ grid-template-columns: 1fr; }
          .heroRight{ align-items:flex-start; }
          .metaLine, .msg{ text-align:left; }
        }

        .left, .right{ padding: 12px; }

        .sectionHead{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:10px;
          margin-bottom: 10px;
          flex-wrap:wrap;
        }

        .label{
          display:inline-flex;
          align-items:center;
          padding: 8px 12px;
          border: 3px solid #000;
          border-radius: 999px;
          font-weight: 1000;
          letter-spacing: .6px;
          text-transform: uppercase;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
          font-size: 12px;
          color:#111;
        }
        .label.cyan{ background:#00e0ff; }
        .label.pink{ background:#ff6bd6; }

        .smallMuted{
          font-size: 12px;
          opacity: .8;
          font-weight: 800;
        }

        .empty{
          padding: 14px;
          border: 3px dashed rgba(255,255,255,0.25);
          border-radius: 14px;
          background: rgba(0,0,0,.18);
        }
        .emptyTitle{ font-size: 16px; font-weight: 1000; }
        .emptySub{ margin-top: 6px; opacity:.9; font-weight: 800; font-size: 12px; line-height: 1.35; }
        .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

        .bigBtn{
          margin-top: 10px;
          width: 100%;
          background:#79ff86;
          border: 3px solid #000;
          border-radius: 14px;
          padding: 12px;
          font-weight: 1000;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
          cursor:pointer;
          text-transform: uppercase;
          letter-spacing: .6px;
        }
        .bigBtn:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }

        .sceneList{
          display:flex;
          flex-direction:column;
          gap: 10px;
        }
        .sceneItem{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          width:100%;
          text-align:left;
          background: rgba(0,0,0,.22);
          border: 3px solid #000;
          border-radius: 14px;
          padding: 10px;
          color:#fff;
          cursor:pointer;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
        }
        .sceneItem:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }
        .sceneItem.active{ background: rgba(255,216,74,.18); }

        .sceneLeft{ display:flex; align-items:center; gap: 10px; min-width: 0; }
        .sceneIndex{
          background:#ffd84a;
          color:#111;
          border: 3px solid #000;
          border-radius: 12px;
          padding: 6px 10px;
          font-weight: 1000;
          flex:0 0 auto;
        }
        .sceneMini{
          opacity:.95;
          font-weight: 800;
          font-size: 12px;
          line-height: 1.25;
          overflow:hidden;
          white-space:nowrap;
          text-overflow:ellipsis;
          max-width: 220px;
        }
        @media (max-width: 980px){
          .sceneMini{ max-width: 100%; }
        }

        .sceneBadge{
          border: 3px solid #000;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 1000;
          font-size: 11px;
          letter-spacing: .6px;
          text-transform: uppercase;
          flex:0 0 auto;
          box-shadow: 0 6px 0 rgba(0,0,0,.35);
        }
        .sceneBadge.ok{ background:#79ff86; color:#05120a; }
        .sceneBadge.bad{ background: rgba(255,255,255,0.15); color:#fff; }

        .hint{
          margin-top: 12px;
          padding-top: 12px;
          border-top: 2px dashed rgba(255,255,255,0.18);
        }
        .hintTitle{ font-weight: 1000; text-transform: uppercase; letter-spacing: .6px; font-size: 12px; }
        .hintText{ margin-top: 6px; opacity:.85; font-weight: 800; font-size: 12px; line-height: 1.35; }

        .canvasEmpty{
          padding: 14px;
          border: 3px dashed rgba(255,255,255,0.25);
          border-radius: 14px;
          background: rgba(0,0,0,.18);
        }

        .canvas{ display:flex; flex-direction:column; gap: 12px; }

        .canvasHead{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          flex-wrap:wrap;
        }
        .canvasLabel{ display:flex; align-items:center; gap: 10px; }
        .bigIndex{ font-weight: 1000; font-size: 18px; }

        .canvasBtns{ display:flex; gap: 10px; flex-wrap:wrap; }

        .miniBtn{
          background: rgba(255,255,255,0.10);
          color:#fff;
          border: 3px solid #000;
          border-radius: 14px;
          padding: 10px 12px;
          font-weight: 1000;
          cursor:pointer;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: .6px;
        }
        .miniBtn:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }

        .row2{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 980px){
          .row2{ grid-template-columns: 1fr; }
        }

        .promptBox{
          border: 3px solid #000;
          border-radius: 16px;
          background: rgba(0,0,0,.22);
          box-shadow: 0 10px 0 rgba(0,0,0,.35);
          overflow:hidden;
        }
        .promptBox.wide{ }
        .promptTop{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding: 10px;
          border-bottom: 3px solid #000;
          background: rgba(255,255,255,0.06);
        }
        .pTitle{
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: .6px;
          font-size: 12px;
          display:flex;
          align-items:center;
          gap: 8px;
        }
        .copyBtn{
          background:#ffd84a;
          border: 3px solid #000;
          border-radius: 12px;
          padding: 8px 10px;
          font-weight: 1000;
          cursor:pointer;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: .6px;
        }
        .copyBtn:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }

        .area{
          width: 100%;
          min-height: 180px;
          background: rgba(0,0,0,.25);
          color:#fff;
          border: none;
          outline: none;
          padding: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          line-height: 1.4;
          resize: vertical;
        }

        .badgeA, .badgeB, .badgeV, .badgeN{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width: 22px;
          height: 22px;
          border: 3px solid #000;
          border-radius: 10px;
          font-weight: 1000;
          color:#111;
          box-shadow: 0 6px 0 rgba(0,0,0,.35);
        }
        .badgeA{ background:#79ff86; }
        .badgeB{ background:#ff6bd6; }
        .badgeV{ background:#00e0ff; }
        .badgeN{ background:#ffd84a; }
      `}</style>
    </div>
  );
}
