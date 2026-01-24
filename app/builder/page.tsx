"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const LS_KEYS = {
  SLOTS: "YOSO_API_KEY_SLOTS",
  IDEA_META: "YOSO_IDEA_META",
  REF_IMAGE: "YOSO_REF_IMAGE_DATAURL",
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
    return parsed.map((s: any) => String(s?.apiKey || "").trim()).filter(Boolean);
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
    return { mediaId, description: description || "MAIN_CHARACTER", filename: filename || "ref.png" };
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

    // simpan meta biar konsisten
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

    // ini yang dibaca oleh /builder/panels
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
    <div className="wrap">
      <div className="topRow">
  <div className="badgeRow">
    <div className={`pill ${mounted && apiCount ? "ok" : "bad"}`}>
      {mounted ? (apiCount ? `${apiCount} API Keys Loaded` : "API Keys Missing") : "Loading..."}
    </div>
    {refImage ? <div className="pill ok">REF IMAGE: ON</div> : <div className="pill">REF IMAGE: OFF</div>}
  </div>

  <div className="topActions">
    <button
      className="settingsBtn"
      type="button"
      onClick={() => window.open("/whisk", "whisk_login", "width=760,height=760,noopener,noreferrer")}
    >
      🧪 LOGIN WHISK
    </button>

    <button className="settingsBtn" type="button" onClick={() => (window.location.href = "/settings")}>
      ⚙️ SETTINGS
    </button>
  </div>
</div>


      <div className="stage">
        <div className="card">
          <div className="hero">
            <img className="vibesLogo" src="/vibes-logo.png" alt="Vibes App" />
            <div className="vibesSlogan">moment that take you there</div>
          </div>

          <div className="section">
            <div className="label cyan">1. PILIH KATEGORI</div>
            <div className="grid2">
              {STYLE_OPTIONS.map((o) => {
                const active = o.value === style;
                return (
                  <button
                    key={o.value}
                    className={`box ${active ? "activeYellow" : ""}`}
                    type="button"
                    onClick={() => {
                      setStyle(o.value);
                      persistMeta({ ...meta, style: o.value });
                    }}
                  >
                    <span className="ico">{o.icon}</span>
                    <span className="txt">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="section row2">
            <div className="left">
              <div className="label pink">2. FORMAT</div>
              <div className="fmtRow">
                {FORMAT_OPTIONS.map((o) => {
                  const active = o.value === format;
                  return (
                    <button
                      key={o.value}
                      className={`fmt ${active ? "fmtActive" : ""}`}
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

            <div className="right refBox">
              <label className="refInner">
                <input
                  className="refInput"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPickRefImage(e.target.files?.[0] || null)}
                />
                {refImage ? (
                  <img className="refPreview" src={refImage} alt="Ref" />
                ) : (
                  <>
                    <div className="up">⬆️</div>
                    <div className="refTxt">REF IMAGE</div>
                    <div className="refHint">(tap untuk upload)</div>
                  </>
                )}
              </label>

              {refImage ? (
                <button className="refClear" type="button" onClick={onClearRefImage}>
                  ✖
                </button>
              ) : null}

              {isWhiskUploading ? <div className="miniLoading">Uploading…</div> : null}
            </div>
          </div>

          <div className="section">
            <div className="label cyan">3. TENTUKAN KISAH</div>

            <button className="randomBtn" type="button" onClick={onPickRandomTopic} disabled={!mounted || isSearching}>
              ⚡ {isSearching ? "MENCARI TOPIK..." : "CARI TOPIK (SEJARAH)"}
            </button>

            <textarea
              className="topicArea"
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

          <button className="buildBtn" type="button" onClick={onBuild} disabled={!mounted || isBuilding}>
            GENERATE
          </button>
        </div>
      </div>

      {isBuilding ? (
        <div className="loadingOverlay">
          <div className="loadingCard">
            <div className="spinnerWrap">
              <div className="spinner">C</div>
            </div>
            <div className="loadingTitle">MEMBANGUN DIORAMA...</div>
            <div className="loadingQuote">“{loadingMsg}”</div>
          </div>
        </div>
      ) : null}

      <style>{`
        *{ box-sizing: border-box; }
        html,body{ margin:0; padding:0; }
        .wrap{
          min-height: 100vh;
          background: radial-gradient(1200px 800px at 20% 0%, #0b1b3a 0%, #060a14 60%, #050712 100%);
          padding: 18px;
          color:#111;
          font-family: ui-rounded, "Comic Sans MS", "Trebuchet MS", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* TOP (bukan sticky/fixed, ikut scroll normal) */
        .topRow{
          width: 100%;
          display:flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }
        .badgeRow{
          display:flex;
          gap:10px;
          flex-wrap: wrap;
          justify-content: flex-start;
          min-width: 0;
        }
        .pill{
          font-size: 12px; font-weight: 1000;
          padding: 10px 12px;
          border-radius: 999px;
          border: 3px solid #000;
          background: #fff;
          box-shadow: 0 8px 0 rgba(0,0,0,.12);
          white-space: nowrap;
        }
        .pill.ok{ background:#dcfce7; }
        .pill.bad{ background:#fee2e2; }

        .settingsBtn{
          border: 4px solid #000;
          border-radius: 16px;
          padding: 10px 12px;
          background: #ffd84a;
          font-weight: 1000;
          box-shadow: 0 10px 0 rgba(0,0,0,.18);
          cursor: pointer;
          flex: 0 0 auto;
        }
        .settingsBtn:active{ transform: translateY(2px); box-shadow: 0 8px 0 rgba(0,0,0,.18); }

        .stage{ display:flex; justify-content:center; align-items:flex-start; }
        .card{
          width: min(520px, 94vw);
          background: radial-gradient(circle at 1px 1px, rgba(0,0,0,.08) 1px, transparent 1px), #fff;
          background-size: 8px 8px;
          border: 8px solid #000;
          border-radius: 28px;
          box-shadow: 0 22px 70px rgba(0,0,0,.45);
          padding: 16px;
        }

        .hero{ text-align:center; padding: 8px 0 10px; }
        .vibesLogo{
          width: 190px;
          height: 190px;
          object-fit: contain;
          display:block;
          margin: 0 auto;
        }
        .vibesSlogan{
          margin-top: 6px;
          font-weight: 1000;
          font-size: 12px;
          letter-spacing: .4px;
          text-transform: lowercase;
          opacity: .85;
        }

        .section{ margin-top: 14px; }

        .label{
          display:inline-block;
          font-weight: 1000;
          font-size: 12px;
          text-transform: uppercase;
          padding: 8px 10px;
          border: 4px solid #000;
          border-radius: 16px;
          background:#fff;
          box-shadow: 0 10px 0 rgba(0,0,0,.12);
        }
        .label.cyan{ background:#a7f3d0; }
        .label.pink{ background:#fbcfe8; }

        .grid2{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .box{
          border: 4px solid #000;
          border-radius: 18px;
          padding: 12px 12px;
          background:#fff;
          box-shadow: 0 10px 0 rgba(0,0,0,.12);
          font-weight: 1000;
          cursor: pointer;
          display:flex;
          align-items:center;
          gap: 10px;
          min-width: 0;
        }
        .box:active{ transform: translateY(2px); box-shadow: 0 8px 0 rgba(0,0,0,.12); }
        .activeYellow{ background:#ffd84a; }
        .ico{ width: 24px; text-align:center; flex: 0 0 auto; }
        .txt{ font-size: 12px; letter-spacing: .3px; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }

        .row2{
          display:grid;
          grid-template-columns: 1fr 150px;
          gap: 14px;
          align-items: stretch;
          margin-top: 14px;
        }

        .fmtRow{ display:flex; gap:10px; margin-top: 10px; }
        .fmt{
          flex:1;
          border: 4px solid #000;
          border-radius: 18px;
          padding: 12px 10px;
          background:#fff;
          box-shadow: 0 10px 0 rgba(0,0,0,.12);
          font-weight: 1000;
          cursor: pointer;
        }
        .fmt:active{ transform: translateY(2px); box-shadow: 0 8px 0 rgba(0,0,0,.12); }
        .fmtActive{ background:#ffd84a; }

        .refBox{
          position: relative;
          border: 4px solid #000;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 10px 0 rgba(0,0,0,.12);
          overflow:hidden;
          min-height: 120px;
        }
        .refInner{
          display:flex;
          flex-direction: column;
          align-items:center;
          justify-content:center;
          width: 100%;
          height: 100%;
          cursor: pointer;
          padding: 10px;
        }
        .refInput{ display:none; }
        .refPreview{ width:100%; height:100%; object-fit: cover; }
        .up{ font-weight:1000; font-size: 18px; }
        .refTxt{ font-weight:1000; font-size: 12px; margin-top: 4px; }
        .refHint{ font-weight:1000; font-size: 10px; opacity:.6; margin-top: 2px; }
        .refClear{
          position:absolute;
          top: 8px;
          right: 8px;
          border: 3px solid #000;
          border-radius: 12px;
          background: #fff;
          font-weight: 1000;
          padding: 6px 8px;
          cursor:pointer;
        }
        .miniLoading{
          position:absolute;
          left: 8px;
          bottom: 8px;
          font-size: 10px;
          font-weight: 1000;
          background:#fff;
          border: 3px solid #000;
          border-radius: 999px;
          padding: 6px 8px;
          box-shadow: 0 8px 0 rgba(0,0,0,.12);
        }

        .randomBtn{
          margin-top: 10px;
          width: 100%;
          border: 4px solid #000;
          border-radius: 18px;
          padding: 12px 12px;
          background:#a7f3d0;
          box-shadow: 0 10px 0 rgba(0,0,0,.12);
          font-weight: 1000;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: .3px;
        }
        .randomBtn:disabled{ opacity:.6; cursor:not-allowed; }
        .randomBtn:active{ transform: translateY(2px); box-shadow: 0 8px 0 rgba(0,0,0,.12); }

        .topicArea{
          margin-top: 10px;
          width: 100%;
          min-height: 120px;
          resize: vertical;
          border: 4px solid #000;
          border-radius: 18px;
          padding: 12px 12px;
          font-weight: 900;
          outline: none;
          background:#fff;
          box-shadow: inset 0 10px 0 rgba(0,0,0,.06);
        }
        .msg{
          margin-top: 10px;
          border: 4px solid #000;
          border-radius: 18px;
          padding: 10px 12px;
          font-weight: 1000;
          background:#fff;
        }

        .buildBtn{
          margin-top: 14px;
          width: 100%;
          border: 6px solid #000;
          border-radius: 22px;
          padding: 16px 12px;
          background:#ffd84a;
          box-shadow: 0 14px 0 rgba(0,0,0,.18);
          font-weight: 1000;
          font-size: 18px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: .6px;
        }
        .buildBtn:disabled{ opacity:.6; cursor:not-allowed; }
        .buildBtn:active{ transform: translateY(3px); box-shadow: 0 11px 0 rgba(0,0,0,.18); }

        .loadingOverlay{
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.72);
          display:flex;
          justify-content:center;
          align-items:center;
          z-index: 99999;
          padding: 18px;
        }
        .loadingCard{
          width: min(420px, 92vw);
          background:#fff;
          border: 8px solid #000;
          border-radius: 28px;
          box-shadow: 0 22px 70px rgba(0,0,0,.45);
          padding: 16px;
          text-align:center;
        }
        .spinnerWrap{ display:flex; justify-content:center; margin-top: 4px; }
        .spinner{
          width: 62px; height: 62px;
          border: 6px solid #000;
          border-top-color: transparent;
          border-radius: 999px;
          animation: spin .9s linear infinite;
          display:inline-block;
        }
        @keyframes spin{ to { transform: rotate(360deg); } }
        .loadingTitle{
          margin-top: 10px;
          font-weight: 1000;
          letter-spacing: .6px;
          text-transform: uppercase;
        }
        .loadingQuote{
          margin-top: 10px;
          font-weight: 1000;
          font-size: 12px;
          opacity:.85;
          border: 4px solid #000;
          border-radius: 18px;
          padding: 10px 12px;
          background:#fff;
        }

        /* MOBILE */
        @media (max-width: 560px){
          .wrap{ padding: 12px; }
          .topRow{
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .settingsBtn{ width: 100%; }
          .pill{ font-size: 11px; padding: 9px 10px; }
          .card{ padding: 14px; border-radius: 24px; }
          .vibesLogo{ width: 150px; height: 150px; }
          .grid2{ grid-template-columns: 1fr; }
          .row2{ grid-template-columns: 1fr; }
          .refBox{ min-height: 140px; }
          .txt{ font-size: 12px; }
        }
          .topActions{
  display:flex;
  gap:10px;
  align-items:center;
}

      `}</style>
    </div>
  );
}
