"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Scene = {
  id: string;
  narrative: string;
  imagePromptA: string;
  imagePromptB: string;
  videoPrompt: string;
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

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildBulk18(scenes: Scene[], meta?: Partial<GenerateMeta>) {
  const header = [
    "VIBES CANVAS • BULK IMAGE PROMPTS (18)",
    "",
    "GLOBAL STYLE (apply to every scene):",
    "- Vertical 9:16 cinematic miniature diorama",
    "- Macro tilt-shift, shallow depth of field, tiny handcrafted details",
    "- Ultra realistic miniature materials (wood, paint, fabric, dust), museum-grade diorama",
    "- Dramatic cinematic lighting, volumetric rays, rich texture",
    "- No text, no watermark, no hands, no modern objects, no CGI look",
    "",
    "PROJECT CONTEXT:",
    `- Topic: ${meta?.topic ?? "-"}`,
    `- Category: ${meta?.style ?? "-"}`,
    `- Format: ${meta?.format ?? "-"}`,
    `- Audience: ${meta?.audience ?? "-"}`,
    `- Genre: ${meta?.genre ?? "-"}`,
    `- Template: ${meta?.template ?? "-"}`,
    "",
    "OUTPUT:",
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

function buildScenePack(scene: Scene, idx1: number) {
  const n = idx1;
  return [
    `VIBES CANVAS • SCENE PACK #${n}`,
    "",
    "IMAGE PROMPT A:",
    String(scene.imagePromptA || "").trim(),
    "",
    "IMAGE PROMPT B:",
    String(scene.imagePromptB || "").trim(),
    "",
    "VIDEO PROMPT:",
    String(scene.videoPrompt || "").trim(),
    "",
    "NARRATIVE:",
    String(scene.narrative || "").trim(),
    "",
  ].join("\n");
}

function buildChatPrompt(scene: Scene, idx1: number, meta?: Partial<GenerateMeta> | null) {
  const ctx = [
    `PROJECT: Vibes App (Diorama Panels)`,
    meta?.topic ? `TOPIC: ${meta.topic}` : null,
    meta?.style ? `CATEGORY: ${meta.style}` : null,
    meta?.format ? `FORMAT: ${meta.format}` : null,
    meta?.audience ? `AUDIENCE: ${meta.audience}` : null,
    meta?.genre ? `GENRE: ${meta.genre}` : null,
    meta?.template ? `TEMPLATE: ${meta.template}` : null,
  ].filter(Boolean);

  return [
    `VIBES CANVAS • CHAT PROMPT • SCENE #${idx1}`,
    "",
    ...ctx,
    "",
    "TASK:",
    "- Kamu adalah asisten kreatif. Aku akan memberi Narrative + Prompt A/B + Prompt Video.",
    "- Bantu rapikan (tanpa mengubah inti) dan hasilkan versi final yang lebih tajam, konsisten, dan siap dipakai.",
    "- Jangan tambahkan watermark/teks di gambar. Fokus detail miniature diorama, macro tilt-shift, cinematic lighting.",
    "",
    "NARRATIVE:",
    String(scene.narrative || "").trim(),
    "",
    "IMAGE PROMPT A:",
    String(scene.imagePromptA || "").trim(),
    "",
    "IMAGE PROMPT B:",
    String(scene.imagePromptB || "").trim(),
    "",
    "VIDEO PROMPT:",
    String(scene.videoPrompt || "").trim(),
    "",
    "OUTPUT RULES:",
    "- Kembalikan 3 blok: FINAL_IMAGE_PROMPT_A, FINAL_IMAGE_PROMPT_B, FINAL_VIDEO_PROMPT",
    "- Format plain text, tanpa markdown.",
    "",
  ].join("\n");
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

  const metaParts = useMemo(() => {
    if (!meta) return [];
    const p: Array<[string, string]> = [];
    if (meta.topic) p.push(["Topic", meta.topic]);
    if (meta.style) p.push(["Cat", meta.style]);
    if (meta.format) p.push(["Fmt", meta.format]);
    if (meta.audience) p.push(["Aud", meta.audience]);
    if (meta.genre) p.push(["Gen", meta.genre]);
    if (meta.template) p.push(["Tpl", meta.template]);
    return p;
  }, [meta]);

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

  async function onCopyScenePack() {
    if (!active) return;
    try {
      const pack = buildScenePack(active, activeIndex + 1);
      await copyText(pack);
      setMsg(`COPIED: SCENE PACK #${activeIndex + 1} ✅`);
    } catch {
      setMsg(`COPY_FAILED: SCENE PACK #${activeIndex + 1}`);
    }
  }

  async function onCopyChatPrompt() {
    if (!active) return;
    try {
      const p = buildChatPrompt(active, activeIndex + 1, meta);
      await copyText(p);
      setMsg(`COPIED: CHAT PROMPT #${activeIndex + 1} ✅`);
    } catch {
      setMsg(`COPY_FAILED: CHAT PROMPT #${activeIndex + 1}`);
    }
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
      <div className="stage">
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

            <button className="btn ghost" type="button" onClick={loadFromStorage}>
              REFRESH
            </button>

            <Link className="settingsBtn" href="/settings">
              SETTINGS
            </Link>
          </div>
        </div>

        <div className="card hero">
          <div className="heroLeft">
            <div className="vibesLogo">Vibes Canvas</div>
            <div className="vibesSlogan">Helper internal untuk copy/compose prompt (tanpa auto-open AI Studio).</div>
          </div>

          <div className="heroRight">
            <div className="metaWrap">
              {metaParts.length ? (
                metaParts.map(([k, v]) => (
                  <span className="metaChip" key={`${k}:${v}`}>
                    <span className="metaK">{k}</span>
                    <span className="metaV">{v}</span>
                  </span>
                ))
              ) : (
                <span className="metaChip muted">
                  <span className="metaK">Meta</span>
                  <span className="metaV">{metaLine}</span>
                </span>
              )}
            </div>

            {msg ? <div className="msg">{msg}</div> : <div className="msg muted">Ready.</div>}
          </div>
        </div>

        <div className="grid">
          <aside className="card left">
            <div className="sectionHead">
              <div className="label cyan">SCENES</div>
              <div className="smallMuted">{hasData ? "Klik scene untuk buka helper." : "Belum ada data."}</div>
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
                - Canvas ini helper internal: copy prompt siap tempel ke mana pun.
                <br />- Kalau kosong, balik ke Panels lalu generate 9 panel.
              </div>
            </div>
          </aside>

          <main className="card right">
            <div className="sectionHead">
              <div className="label pink">HELPER</div>
              <div className="smallMuted">{active ? `SCENE #${activeIndex + 1}` : "Pilih scene di atas."}</div>
            </div>

            {!active ? (
              <div className="canvasEmpty">
                <div className="emptyTitle">Pilih scene di atas.</div>
                <div className="emptySub">Nanti helper pack & chat prompt muncul di sini.</div>
              </div>
            ) : (
              <div className="canvas">
                <div className="canvasHead">
                  <div className="canvasLabel">
                    <span className="pill ok">SCENE</span>
                    <span className="bigIndex">#{activeIndex + 1}</span>
                  </div>

                  <div className="canvasBtns">
                    <button className="miniBtn" type="button" onClick={onCopyScenePack}>
                      COPY SCENE PACK
                    </button>
                    <button className="miniBtn" type="button" onClick={onCopyChatPrompt}>
                      COPY CHAT PROMPT
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
          background:
            radial-gradient(1100px 700px at 15% 0%, rgba(34,211,238,.22) 0%, rgba(11,18,32,0) 55%),
            radial-gradient(900px 600px at 90% 10%, rgba(255,107,214,.16) 0%, rgba(11,18,32,0) 60%),
            radial-gradient(1200px 800px at 30% 110%, rgba(255,216,74,.12) 0%, rgba(11,18,32,0) 55%),
            linear-gradient(180deg, #0b1220 0%, #070b14 55%, #050712 100%);
          padding: 12px;
          color: #e5e7eb;
          position: relative;
        }

        .stage{
          max-width: 520px;
          margin: 0 auto;
          display:flex;
          flex-direction:column;
          gap: 14px;
        }

        .topRow{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
          flex-wrap:wrap;
        }

        .badgeRow{
          display:flex;
          gap: 8px;
          flex-wrap:wrap;
          align-items:center;
        }

        .pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding: 7px 10px;
          border: 3px solid #000;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: .5px;
          box-shadow: 0 6px 0 rgba(0,0,0,.35);
          text-transform: uppercase;
          backdrop-filter: blur(6px);
        }
        .pill.ok{ background:#79ff86; color:#05120a; }

        .rightBtns{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-end;
          align-items:center;
        }

        .btn{
          background:#ffd84a;
          border: 3px solid #000;
          border-radius: 14px;
          padding: 8px 10px;
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
          background: rgba(255,255,255,0.08);
          color:#e5e7eb;
          backdrop-filter: blur(6px);
        }

        .settingsBtn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          background:#00e0ff;
          border: 3px solid #000;
          border-radius: 14px;
          padding: 8px 10px;
          font-weight: 1000;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
          text-decoration:none;
          color:#06131a;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: .6px;
        }
        .settingsBtn:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }

        .card{
          border: 4px solid #000;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(255,255,255,.92) 0%, rgba(245,247,250,.90) 100%);
          box-shadow: 0 12px 0 rgba(0,0,0,.35);
          color: #0b1220;
          position: relative;
          overflow: hidden;
        }
        .card::before{
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          opacity:.10;
          background:
            repeating-linear-gradient(
              0deg,
              rgba(0,0,0,.25) 0px,
              rgba(0,0,0,.25) 1px,
              rgba(255,255,255,0) 2px,
              rgba(255,255,255,0) 6px
            );
          mix-blend-mode: soft-light;
        }

        .hero{
          display:flex;
          gap: 12px;
          padding: 14px 14px 14px;
          align-items:flex-start;
          justify-content:space-between;
          flex-wrap:wrap;
        }
        .heroLeft{ min-width: 220px; position: relative; z-index: 1; }
        .heroRight{
          display:flex;
          flex-direction:column;
          gap:10px;
          min-width: 220px;
          flex:1;
          align-items:flex-end;
          position: relative;
          z-index: 1;
        }

        /* TITLE: professional (no all-caps scream) */
        .vibesLogo{
          font-weight: 1000;
          font-size: 20px;
          letter-spacing: .2px;
          text-transform: none;
          line-height: 1.15;
        }

        /* SLOGAN: calm + readable */
        .vibesSlogan{
          margin-top: 6px;
          font-weight: 800;
          font-size: 12px;
          line-height: 1.35;
          opacity: .82;
          max-width: 44ch;
        }

        /* META: chips wrap, looks “designed” */
        .metaWrap{
          display:flex;
          flex-wrap:wrap;
          gap: 8px;
          justify-content:flex-end;
          align-items:flex-start;
          max-width: 520px;
        }
        .metaChip{
          display:inline-flex;
          align-items:center;
          gap: 8px;
          padding: 6px 10px;
          border: 2px solid rgba(0,0,0,.85);
          border-radius: 999px;
          background: rgba(11,18,32,.06);
          box-shadow: 0 6px 0 rgba(0,0,0,.22);
          white-space: nowrap;
        }
        .metaChip.muted{ opacity:.75; }
        .metaK{
          font-weight: 1000;
          font-size: 10px;
          letter-spacing: .6px;
          text-transform: uppercase;
          color: rgba(11,18,32,.70);
        }
        .metaV{
          font-weight: 1000;
          font-size: 11px;
          color: rgba(11,18,32,.92);
        }

        .msg{
          font-weight: 1000;
          font-size: 11px;
          padding: 8px 10px;
          border: 3px solid #000;
          border-radius: 14px;
          background: rgba(11,18,32,.06);
          max-width: 520px;
          text-align:right;
          color: #0b1220;
        }
        .msg.muted{ opacity:.75; }

        @media (max-width: 520px){
          .heroRight{ align-items:flex-start; }
          .metaWrap{ justify-content:flex-start; }
          .msg{ text-align:left; }
          .metaChip{ white-space: normal; }
        }

        .grid{
          display:grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .left, .right{ padding: 12px; position: relative; z-index: 1; }

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
          opacity: .78;
          font-weight: 800;
          color: rgba(11,18,32,.85);
        }

        .empty{
          padding: 14px;
          border: 3px dashed rgba(0,0,0,0.22);
          border-radius: 14px;
          background: rgba(11,18,32,.04);
        }
        .emptyTitle{ font-size: 16px; font-weight: 1000; color:#0b1220; }
        .emptySub{
          margin-top: 6px;
          opacity:.9;
          font-weight: 800;
          font-size: 12px;
          line-height: 1.35;
          color: rgba(11,18,32,.85);
        }
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
          color:#05120a;
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
          background: rgba(11,18,32,.05);
          border: 3px solid #000;
          border-radius: 14px;
          padding: 10px;
          color:#0b1220;
          cursor:pointer;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
        }
        .sceneItem:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }
        .sceneItem.active{ background: rgba(255,216,74,.26); }

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
          max-width: 260px;
          color: rgba(11,18,32,.88);
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
        .sceneBadge.bad{ background: rgba(11,18,32,.10); color:#0b1220; }

        .hint{
          margin-top: 12px;
          padding-top: 12px;
          border-top: 2px dashed rgba(0,0,0,.18);
          color: rgba(11,18,32,.9);
        }
        .hintTitle{ font-weight: 1000; text-transform: uppercase; letter-spacing: .6px; font-size: 12px; }
        .hintText{ margin-top: 6px; opacity:.9; font-weight: 800; font-size: 12px; line-height: 1.35; }

        .canvasEmpty{
          padding: 14px;
          border: 3px dashed rgba(0,0,0,0.22);
          border-radius: 14px;
          background: rgba(11,18,32,.04);
          color: rgba(11,18,32,.92);
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
        .bigIndex{ font-weight: 1000; font-size: 18px; color:#0b1220; }

        .canvasBtns{ display:flex; gap: 10px; flex-wrap:wrap; }

        .miniBtn{
          background: rgba(11,18,32,.06);
          color:#0b1220;
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
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .promptBox{
          border: 3px solid #000;
          border-radius: 16px;
          background: rgba(11,18,32,.03);
          box-shadow: 0 10px 0 rgba(0,0,0,.35);
          overflow:hidden;
        }

        .promptTop{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding: 10px;
          border-bottom: 3px solid #000;
          background: rgba(255,255,255,.72);
        }

        .pTitle{
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: .6px;
          font-size: 12px;
          display:flex;
          align-items:center;
          gap: 8px;
          color:#0b1220;
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
          color:#111;
        }
        .copyBtn:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }

        .area{
          width: 100%;
          min-height: 180px;
          background: rgba(11,18,32,.06);
          color:#0b1220;
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
