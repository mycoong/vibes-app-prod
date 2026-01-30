"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const LS_KEYS = {
  SLOTS: "YOSO_API_KEY_SLOTS",
  IDEA_META: "YOSO_IDEA_META",
  REF_IMAGE: "YOSO_REF_IMAGE_DATAURL",
  REF_ATMO: "YOSO_REF_ATMO_DATAURL",
  REF_LIGHT: "YOSO_REF_LIGHT_DATAURL",
  WHISK_TOKEN: "YOSO_WHISK_TOKEN",
  WHISK_REF: "YOSO_WHISK_REF",
};

const STYLE_OPTIONS = [
  { value: "ERA_KOLONIAL", label: "ERA KOLONIAL", icon: "🏰" },
  { value: "SEJARAH_PERJUANGAN", label: "PERJUANGAN", icon: "⏱️" },
  { value: "LEGENDA_RAKYAT", label: "LEGENDA", icon: "👻" },
  { value: "BUDAYA_NUSANTARA", label: "BUDAYA", icon: "🗺️" },
];

const FORMAT_OPTIONS = [
  { value: "SHORT", label: "SHORT" },
  { value: "LONG", label: "LONG" },
];

const LOADING_MESSAGES = [
  "Menganalisa metafora visual...",
  "Menyiapkan pondasi miniatur...",
  "Memahat detail diorama...",
  "Mencari sudut lensa makro...",
  "Menyesuaikan pencahayaan fajar...",
  "Merekam suara sejarah...",
  "Menghaluskan tekstur batu...",
  "Diorama Nusantara siap dipotret...",
  "Hampir selesai...",
];

type WhiskRef = { mediaId: string; description: string; filename: string };

function getAllApiKeysFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEYS.SLOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s: any) => String(s?.apiKey || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readRefImage(): string {
  try {
    return String(localStorage.getItem(LS_KEYS.REF_IMAGE) || "");
  } catch {
    return "";
  }
}

function writeRefImage(dataUrl: string) {
  try {
    localStorage.setItem(LS_KEYS.REF_IMAGE, dataUrl || "");
  } catch {}
}

function readRefAtmoImage(): string {
  try {
    return String(localStorage.getItem(LS_KEYS.REF_ATMO) || "");
  } catch {
    return "";
  }
}

function writeRefAtmoImage(dataUrl: string) {
  try {
    localStorage.setItem(LS_KEYS.REF_ATMO, dataUrl || "");
  } catch {}
}

function readRefLightImage(): string {
  try {
    return String(localStorage.getItem(LS_KEYS.REF_LIGHT) || "");
  } catch {
    return "";
  }
}

function writeRefLightImage(dataUrl: string) {
  try {
    localStorage.setItem(LS_KEYS.REF_LIGHT, dataUrl || "");
  } catch {}
}

function readWhiskToken(): string {
  try {
    return String(localStorage.getItem(LS_KEYS.WHISK_TOKEN) || "");
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
    const description = String(j?.description || "").trim();
    const filename = String(j?.filename || "").trim();
    if (!mediaId) return null;
    return {
      mediaId,
      description: description || "MAIN_CHARACTER",
      filename: filename || "ref.png",
    };
  } catch {
    return null;
  }
}

function writeWhiskRef(ref: WhiskRef | null) {
  try {
    if (!ref) localStorage.removeItem(LS_KEYS.WHISK_REF);
    else localStorage.setItem(LS_KEYS.WHISK_REF, JSON.stringify(ref));
  } catch {}
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("FILE_READ_FAILED"));
    r.readAsDataURL(file);
  });
}

function guessFilename(file: File | null): string {
  try {
    const n = String(file?.name || "").trim();
    return n || "ref.png";
  } catch {
    return "ref.png";
  }
}

export default function BuilderIdeaPage() {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState("SEJARAH_PERJUANGAN");
  const [format, setFormat] = useState("SHORT");
  const [topic, setTopic] = useState("");
  const [refImage, setRefImage] = useState<string>("");
  const [refAtmoImage, setRefAtmoImage] = useState<string>("");
  const [refLightImage, setRefLightImage] = useState<string>("");
  const [apiCount, setApiCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [msg, setMsg] = useState("");
  const [isWhiskUploading, setIsWhiskUploading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setApiCount(getAllApiKeysFromStorage().length);
    setRefImage(readRefImage());
    setRefAtmoImage(readRefAtmoImage());
    setRefLightImage(readRefLightImage());
    readWhiskRef(); // keep side effects compatibility
    try {
      const raw = localStorage.getItem(LS_KEYS.IDEA_META);
      if (raw) {
        const m = JSON.parse(raw);
        if (m?.style) setStyle(String(m.style));
        if (m?.format) setFormat(String(m.format));
        if (m?.topic) setTopic(String(m.topic));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isBuilding) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    let idx = 0;
    intervalRef.current = window.setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 1200);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isBuilding]);

  const meta = useMemo(
    () => ({
      topic: String(topic || "").trim(),
      style,
      format,
      audience: "LOCAL",
      genre: "DRAMA",
      template: "VIRAL_DRAMA",
      refImageDataUrl: refImage ? "[HAS_REF_IMAGE]" : "",
    }),
    [topic, style, format, refImage]
  );

  function persistMeta(next: any) {
    try {
      localStorage.setItem(LS_KEYS.IDEA_META, JSON.stringify(next));
    } catch {}
  }

  async function onPickRandomTopic() {
    if (!mounted) return;
    setMsg("");
    setIsSearching(true);
    try {
      const apiKeys = getAllApiKeysFromStorage();
      setApiCount(apiKeys.length);
      if (!apiKeys.length) {
        setMsg("API_KEY_MISSING → buka Settings, isi dulu 1-5 API key");
        return;
      }
      const r = await fetch("/api/yoso/idea/random", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKeys,
          style,
          format,
          audience: "LOCAL",
          genre: "DRAMA",
          template: "VIRAL_DRAMA",
        }),
      });
      const j = await r.json();
      if (!j?.ok || !j?.topic) {
        setMsg(j?.error || "GAGAL_CARI_TOPIK");
        return;
      }
      setTopic(String(j.topic));
      persistMeta({ ...meta, topic: String(j.topic) });
    } catch {
      setMsg("GAGAL_CARI_TOPIK (network / key)");
    } finally {
      setIsSearching(false);
    }
  }

  async function uploadRefToWhisk(dataUrl: string, filename: string) {
    const token = readWhiskToken();
    if (!token) {
      setMsg("WHISK_TOKEN_MISSING → buka Settings, isi Whisk Token dulu (Bearer ...)");
      return;
    }
    setIsWhiskUploading(true);
    try {
      const description = "MAIN_CHARACTER";
      const r = await fetch("/api/yoso/whisk/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          imageDataUrl: dataUrl,
          description,
          filename,
        }),
      });
      const j = await r.json();
      if (!j?.success || !j?.mediaId) {
        const e = String(j?.error || "WHISK_UPLOAD_FAILED");
        setMsg(e);
        return;
      }
      writeWhiskRef({ mediaId: String(j.mediaId), description, filename });
      setMsg("WHISK_REF_OK ✅");
    } catch {
      setMsg("WHISK_UPLOAD_FAILED (network/token)");
    } finally {
      setIsWhiskUploading(false);
    }
  }

  async function onPickRefImage(file: File | null) {
    if (!mounted) return;
    if (!file) return;
    setMsg("");
    try {
      const dataUrl = await fileToDataUrl(file);
      setRefImage(dataUrl);
      writeRefImage(dataUrl);
      setMsg("REF_IMAGE_OK ✅");
      const fn = guessFilename(file);
      await uploadRefToWhisk(dataUrl, fn);
    } catch {
      setMsg("REF_IMAGE_GAGAL");
    }
  }

  function onClearRefImage() {
    setRefImage("");
    writeRefImage("");
    writeWhiskRef(null);
    setMsg("REF_IMAGE_CLEARED");
  }

async function onPickRefAtmoImage(file: File | null) {
  if (!mounted) return;
  if (!file) return;
  try {
    const dataUrl = await fileToDataUrl(file);
    setRefAtmoImage(dataUrl);
    writeRefAtmoImage(dataUrl);
    setMsg("REF_ATMO_OK ✅");
  } catch {
    setMsg("REF_ATMO_GAGAL");
  }
}

function onClearRefAtmoImage() {
  setRefAtmoImage("");
  writeRefAtmoImage("");
  setMsg("REF_ATMO_CLEARED");
}

async function onPickRefLightImage(file: File | null) {
  if (!mounted) return;
  if (!file) return;
  try {
    const dataUrl = await fileToDataUrl(file);
    setRefLightImage(dataUrl);
    writeRefLightImage(dataUrl);
    setMsg("REF_LIGHT_OK ✅");
  } catch {
    setMsg("REF_LIGHT_GAGAL");
  }
}

function onClearRefLightImage() {
  setRefLightImage("");
  writeRefLightImage("");
  setMsg("REF_LIGHT_CLEARED");
}

  async function onBuild() {
    if (!mounted) return;
    const t = String(topic || "").trim();
    if (!t) {
      setMsg("TOPIC_EMPTY → isi kisah dulu");
      return;
    }
    setMsg("");
    setIsBuilding(true);
    try {
      const apiKeys = getAllApiKeysFromStorage();
      setApiCount(apiKeys.length);
      if (!apiKeys.length) {
        setMsg("API_KEY_MISSING → buka Settings, isi dulu 1-5 API key");
        setIsBuilding(false);
        return;
      }
      const payload = {
        topic: t,
        style,
        format,
        audience: "LOCAL",
        genre: "DRAMA",
        template: "VIRAL_DRAMA",
        apiKeys,
      };

      persistMeta({
        topic: t,
        style,
        format,
        audience: "LOCAL",
        genre: "DRAMA",
        template: "VIRAL_DRAMA",
        refImageDataUrl: refImage ? "[HAS_REF_IMAGE]" : "",
      });

      const r = await fetch("/api/yoso/diorama/script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok || !Array.isArray(j?.scenes) || j.scenes.length !== 9) {
        const err = String(j?.error || `HTTP_${r.status}`);
        setMsg(`GEN_FAILED: ${err}`);
        setIsBuilding(false);
        return;
      }

      localStorage.setItem(
        "YOSO_LAST_SCENES",
        JSON.stringify({ scenes: j.scenes, meta: j.meta || payload, savedAt: Date.now() })
      );

      window.location.href = "/builder/panels";
    } catch (e: any) {
      setMsg(`GEN_FAILED: ${String(e?.message || e)}`);
      setIsBuilding(false);
    }
  }

  return (
    <div className="pg">
      <div className="hdr">
        <div className="hdrInner">
          <div className="hdrLeft">
          <div className="hdrIcon" aria-hidden="true">🌀</div>
          <div className="hdrTitle">NUSANTARA DIORAMA AI</div>
        </div>
        <div className="hdrRight">
          <button
            className="hdrBtn"
            type="button"
            onClick={() => window.open("/whisk", "whisk_login", "width=760,height=760,noopener,noreferrer")}
            title="Login Whisk"
          >
            🧪
          </button>
          <button className="hdrBtn" type="button" onClick={() => (window.location.href = "/settings")} title="Settings">
            ⚙️
          </button>
        </div>
        </div>
      </div>

      <div className="outer">
        <div className="sheet">
          <div className="titleBlock">
            <div className="big">
              BUAT <span className="purple">DIORAMA</span>
            </div>
            <div className="big">SEJARAH</div>
            <div className="sub">PHYSICAL MACRO MINIATURE STORYTELLER</div>
          </div>

          <div className="sec">
            <div className="secHead">
              <div className="tag tagCyan">1. PILIH KATEGORI</div>
              <div className="miniInfo">
                <span className={`pill ${mounted && apiCount ? "ok" : "bad"}`}>
                  {mounted ? (apiCount ? `${apiCount} API` : "API Missing") : "Loading"}
                </span>
                <span className={`pill ${refImage ? "ok" : ""}`}>{refImage ? "REF ON" : "REF OFF"}</span>
              </div>
            </div>

            <div className="grid">
              {STYLE_OPTIONS.map((o) => {
                const active = o.value === style;
                return (
                  <button
                    key={o.value}
                    className={`choice ${active ? "active" : ""}`}
                    type="button"
                    onClick={() => {
                      setStyle(o.value);
                      persistMeta({ ...meta, style: o.value });
                    }}
                  >
                    <span className="ico" aria-hidden="true">{o.icon}</span>
                    <span className="lbl">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sec">
            <div className="secHead">
              <div className="tag tagPink">2. FORMAT</div>
            </div>

            <div className="formatRow">
              <div className="fmtBtns">
                {FORMAT_OPTIONS.map((o) => {
                  const active = o.value === format;
                  return (
                    <button
                      key={o.value}
                      className={`fmtBtn ${active ? "fmtOn" : ""}`}
                      type="button"
                      onClick={() => {
                        setFormat(o.value);
                        persistMeta({ ...meta, format: o.value });
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
  </div>

  <div className="refMiniStack">
    <div className="refMiniTitle">REF IMAGE (MASTER STYLE)</div>

    <div className="refMiniRow">
      <div className="refMiniLabel">Atmosphere</div>
      <div className="refMiniBox">
        <label className={`refMiniCard ${refAtmoImage ? "hasImg" : ""}`}>
          <input
            className="refInput"
            type="file"
            accept="image/*"
            onChange={(e) => onPickRefAtmoImage(e.target.files?.[0] || null)}
          />
          {refAtmoImage ? (
            <img className="refMiniImg" src={refAtmoImage} alt="Atmosphere" />
          ) : (
            <div className="refMiniEmpty">Upload</div>
          )}
        </label>
        {refAtmoImage ? (
          <button className="refMiniX" type="button" onClick={onClearRefAtmoImage} title="Clear atmosphere">
            ✖
          </button>
        ) : null}
      </div>
    </div>

    <div className="refMiniRow">
      <div className="refMiniLabel">Subject</div>
      <div className="refMiniBox">
        <label className={`refMiniCard ${refImage ? "hasImg" : ""}`}>
          <input
            className="refInput"
            type="file"
            accept="image/*"
            onChange={(e) => onPickRefImage(e.target.files?.[0] || null)}
          />
          {refImage ? <img className="refMiniImg" src={refImage} alt="Subject" /> : <div className="refMiniEmpty">Upload</div>}
        </label>
        {refImage ? (
          <button className="refMiniX" type="button" onClick={onClearRefImage} title="Clear subject">
            ✖
          </button>
        ) : null}
        {isWhiskUploading ? <div className="refMiniUploading">Uploading…</div> : null}
      </div>
    </div>

    <div className="refMiniRow">
      <div className="refMiniLabel">Lighting + Style</div>
      <div className="refMiniBox">
        <label className={`refMiniCard ${refLightImage ? "hasImg" : ""}`}>
          <input
            className="refInput"
            type="file"
            accept="image/*"
            onChange={(e) => onPickRefLightImage(e.target.files?.[0] || null)}
          />
          {refLightImage ? (
            <img className="refMiniImg" src={refLightImage} alt="Lighting and style" />
          ) : (
            <div className="refMiniEmpty">Upload</div>
          )}
        </label>
        {refLightImage ? (
          <button className="refMiniX" type="button" onClick={onClearRefLightImage} title="Clear lighting/style">
            ✖
          </button>
        ) : null}
      </div>
    </div>
  </div>
</div>

<div className="sec">
  <div className="secHead">
    <div className="tag tagCyan">3. TENTUKAN KISAH</div>
              <button className="zap" type="button" onClick={onPickRandomTopic} disabled={!mounted || isSearching}>
                ⚡ {isSearching ? "MENCARI..." : "CARI TOPIK (SEJARAH)"}
              </button>
            </div>

            <textarea
              className="ta"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                persistMeta({ ...meta, topic: e.target.value });
              }}
              placeholder="Tulis kejadian sejarah, tokoh, atau legenda..."
              spellCheck={false}
            />

            {msg ? <div className="msg">{msg}</div> : null}
          </div>

          <button className="cta" type="button" onClick={onBuild} disabled={!mounted || isBuilding}>
            BANGUN DIORAMA!
          </button>
        </div>
      </div>

      {isBuilding ? (
        <div className="ov">
          <div className="ovCard">
            <div className="spin" aria-hidden="true">C</div>
            <div className="ovT">MEMBANGUN DIORAMA...</div>
            <div className="ovQ">“{loadingMsg}”</div>
          </div>
        </div>
      ) : null}

      <style>{`
        :root{
          --ink:#151515;
          --paper:#fbfbfb;
          --yellow:#f7d54a;
          --purple:#7b56ff;
          --cyan:#3ddad8;
          --pink:#ff58a8;
        }

        .pg{ min-height:100vh; background:#0b0b0b; color:var(--ink); }

        .hdr{
          position:sticky; top:0; z-index:20;
          display:flex; justify-content:center;
          padding:10px 14px;
          background:transparent;
        }
        .hdrInner{
          width:min(520px, 100%);
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          padding:12px 14px;
          background:var(--yellow);
          border:4px solid var(--ink);
          border-radius:18px;
          box-shadow:0 8px 0 rgba(0,0,0,.25);
        }
        .hdrLeft{ display:flex; align-items:center; gap:10px; min-width:0; }
        .hdrIcon{
          width:34px; height:34px; border:3px solid var(--ink); border-radius:10px; background:#fff;
          display:flex; align-items:center; justify-content:center; font-size:18px; line-height:1;
          box-shadow:0 2px 0 rgba(0,0,0,.15); flex:0 0 auto;
        }
        .hdrTitle{
          font-weight:900; letter-spacing:.5px; font-size:16px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .hdrRight{ display:flex; align-items:center; gap:8px; flex:0 0 auto; }
        .hdrBtn{
          width:38px; height:38px; border-radius:12px; border:3px solid var(--ink); background:#fff;
          box-shadow:0 3px 0 rgba(0,0,0,.18); font-weight:900; cursor:pointer;
        }

        .outer{ display:flex; justify-content:center; padding:18px 14px 24px; }

        .sheet{
          width:min(520px, 100%);
          background: radial-gradient(rgba(0,0,0,.08) 1px, transparent 1px) 0 0/10px 10px, #fff;
          border:4px solid var(--ink); border-radius:26px;
          padding:16px 14px 14px; box-shadow:0 10px 0 rgba(0,0,0,.35);
        }

        .titleBlock{ text-align:center; padding:6px 8px 14px; }
        .big{
          font-weight:1000; font-size:34px; line-height:1.02; letter-spacing:.5px;
          text-transform:uppercase; text-shadow:0 2px 0 rgba(0,0,0,.10);
        }
        .purple{ color:var(--purple); }
        .sub{ margin-top:10px; font-size:12px; letter-spacing:1.5px; font-weight:800; opacity:.75; }

        .sec{ margin-top:12px; }
        .secHead{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }

        .tag{
          display:inline-block; padding:7px 10px; border-radius:10px; border:3px solid var(--ink);
          font-weight:950; font-size:13px; background:#fff; box-shadow:0 3px 0 rgba(0,0,0,.12);
        }
        .tagCyan{ background:rgba(61,218,216,.45); }
        .tagPink{ background:rgba(255,88,168,.35); }

        .miniInfo{ display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
        .pill{
          padding:6px 8px; border-radius:999px; border:2px solid var(--ink); background:#fff;
          font-weight:900; font-size:11px; opacity:.92;
        }
        .pill.ok{ background:rgba(61,218,216,.35); }
        .pill.bad{ background:rgba(255,88,168,.25); }

        .grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .choice{
          display:flex; align-items:center; gap:10px; padding:12px 12px;
          border-radius:14px; border:4px solid var(--ink); background:#fff;
          box-shadow:0 6px 0 rgba(0,0,0,.18); cursor:pointer; text-align:left; min-height:56px;
        }
        .choice .ico{ font-size:18px; }
        .choice .lbl{ font-weight:950; font-size:13px; letter-spacing:.2px; }
        .choice.active{ background:rgba(247,213,74,.9); }

        .formatRow{ display:flex; gap:10px; align-items:stretch; }
        .formatRow .fmtBtns{ flex:1; }
        .fmtBtns{ display:flex; gap:10px; }
        .fmtBtn{
          flex:1; border-radius:14px; border:4px solid var(--ink); background:#fff;
          box-shadow:0 6px 0 rgba(0,0,0,.18); padding:12px 10px;
          font-weight:1000; font-size:14px; cursor:pointer;
        }
        .fmtBtn.fmtOn{ background:rgba(247,213,74,.9); }

        .refMiniStack{
  margin-top:10px;
  border-radius:16px;
  border:4px solid var(--ink);
  background:#fff;
  box-shadow:0 8px 0 rgba(0,0,0,.18);
  padding:10px;
}
.refMiniTitle{
  font-weight:1000;
  font-size:12px;
  opacity:.85;
  margin-bottom:8px;
  letter-spacing:.4px;
  text-transform:uppercase;
}
.refMiniRow{
  display:grid;
  grid-template-columns: 118px 1fr;
  gap:10px;
  align-items:center;
  margin-bottom:8px;
}
.refMiniRow:last-child{ margin-bottom:0; }
.refMiniLabel{
  font-weight:1000;
  font-size:12px;
  padding:8px 10px;
  border-radius:12px;
  border:3px solid var(--ink);
  background:rgba(0,0,0,.04);
}
.refMiniBox{ position:relative; }
.refMiniCard{
  width:100%;
  height:56px;
  border-radius:12px;
  border:3px dashed var(--ink);
  background:rgba(0,0,0,.02);
  display:flex; align-items:center; justify-content:center;
  overflow:hidden;
  cursor:pointer;
}
.refMiniCard.hasImg{ border-style:solid; background:#fff; }
.refMiniImg{ width:100%; height:100%; object-fit:cover; display:block; }
.refMiniEmpty{ font-weight:1000; font-size:12px; opacity:.75; }
.refMiniX{
  position:absolute;
  top:-10px; right:-10px;
  width:28px; height:28px;
  border-radius:999px;
  border:3px solid var(--ink);
  background:#fff;
  font-weight:1000;
  cursor:pointer;
}
.refMiniUploading{
  position:absolute;
  left:10px;
  top:50%;
  transform:translateY(-50%);
  font-size:11px;
  font-weight:1000;
  padding:4px 8px;
  border-radius:999px;
  border:3px solid var(--ink);
  background:rgba(247,213,74,.95);
}

@media (max-width: 520px){
  .refMiniRow{ grid-template-columns: 98px 1fr; }
  .refMiniCard{ height:52px; }
}

.refWrap{ position:relative; width:100%; }
        .refCard{
          width:100%; height:100%;
          border-radius:14px; border:3px dashed var(--ink);
          background:rgba(0,0,0,.03); display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 0 rgba(0,0,0,.12); cursor:pointer; overflow:hidden; min-height:52px;
        }
        .refCard.hasImg{ border-style:solid; background:#fff; }
        .refInput{ display:none; }
        .refEmpty{ text-align:center; }
        .refUp{ font-size:18px; font-weight:900; }
        .refTxt{ font-weight:1000; font-size:12px; margin-top:2px; }
        .refHint{ font-size:11px; opacity:.7; margin-top:2px; }
        .refImg{ width:100%; height:100%; object-fit:cover; display:block; }
        .refX{
          position:absolute; top:-8px; right:-8px;
          width:30px; height:30px; border-radius:12px; border:3px solid var(--ink); background:#fff;
          font-weight:1000; cursor:pointer; box-shadow:0 4px 0 rgba(0,0,0,.18);
        }
        .refUploading{ position:absolute; bottom:-18px; right:2px; font-size:11px; font-weight:900; opacity:.8; }

        .zap{
          border-radius:12px; border:3px solid var(--ink); background:rgba(123,86,255,.16);
          box-shadow:0 4px 0 rgba(0,0,0,.14); padding:8px 10px;
          font-weight:1000; font-size:12px; cursor:pointer; white-space:nowrap;
        }
        .zap:disabled{ opacity:.6; cursor:not-allowed; }

        .ta{
          width:100%; min-height:120px; resize:none;
          border-radius:18px; border:4px solid var(--ink); background:#fff;
          padding:14px 14px; font-size:14px; outline:none;
          box-shadow:0 8px 0 rgba(0,0,0,.20);
        }
        .msg{
          margin-top:10px; padding:10px 12px; border-radius:14px; border:3px solid var(--ink);
          background:rgba(255,88,168,.12); font-weight:900; font-size:12px; word-break:break-word;
        }

        .cta{
          margin-top:14px; width:100%;
          border-radius:22px; border:4px solid var(--ink);
          background:rgba(247,213,74,.75);
          box-shadow:0 10px 0 rgba(0,0,0,.28);
          padding:16px 12px; font-weight:1000; font-size:20px; letter-spacing:.5px; cursor:pointer;
        }
        .cta:disabled{ opacity:.7; cursor:not-allowed; }

        .ov{
          position:fixed; inset:0; background:rgba(0,0,0,.55);
          display:flex; align-items:center; justify-content:center; padding:18px; z-index:60;
        }
        .ovCard{
          width:min(420px, 100%);
          background:#fff; border-radius:22px; border:4px solid var(--ink);
          padding:18px 16px; box-shadow:0 12px 0 rgba(0,0,0,.35); text-align:center;
        }
        .spin{
          width:54px; height:54px; border-radius:18px; border:4px solid var(--ink);
          margin:0 auto 10px; display:flex; align-items:center; justify-content:center;
          font-weight:1000; animation:rot 1s linear infinite; background:rgba(61,218,216,.25);
        }
        @keyframes rot { to { transform:rotate(360deg);} }
        .ovT{ font-weight:1000; font-size:16px; letter-spacing:.4px; }
        .ovQ{ margin-top:8px; font-weight:900; font-size:13px; opacity:.8; }

        @media (max-width:380px){
          .big{ font-size:30px; }
          .sheet{ padding:14px 12px 12px; }
          .choice{ padding:11px 10px; }
          .fmtBtn{ padding:11px 8px; }
        }
      `}</style>
    </div>
  );
}
