"use client";

import React, { useEffect, useMemo, useState } from "react";

const LS_KEY = "YOSO_WHISK_TOKEN";
const LS_OK = "YOSO_WHISK_OK";
const LS_OK_AT = "YOSO_WHISK_OK_AT";

function normalizeBearer(raw: string) {
  const t = String(raw || "").trim();
  if (!t) return "";
  if (/^bearer\s+/i.test(t)) return `Bearer ${t.replace(/^bearer\s+/i, "").trim()}`;
  return `Bearer ${t}`;
}

function nowTs() {
  return Date.now();
}

function formatTs(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function WhiskPage() {
  const [mounted, setMounted] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [msg, setMsg] = useState("Loading…");
  const [hasToken, setHasToken] = useState(false);
  const [okAt, setOkAt] = useState<number | null>(null);

  function readState() {
    try {
      const t = String(localStorage.getItem(LS_KEY) || "").trim();
      const ok = String(localStorage.getItem(LS_OK) || "") === "1";
      const atRaw = Number(localStorage.getItem(LS_OK_AT) || "");
      const at = Number.isFinite(atRaw) && atRaw > 0 ? atRaw : null;

      setHasToken(!!t);
      setOkAt(at);
      setMsg(!!t ? "WHISK OK ✅ (token sudah tersimpan di SETTINGS)" : "OFF — belum ada token. Ikuti tutorial di bawah.");
      return { t, ok, at };
    } catch {
      setHasToken(false);
      setOkAt(null);
      setMsg("ERROR: localStorage tidak bisa diakses (private mode / blocked).");
      return { t: "", ok: false, at: null };
    }
  }

  useEffect(() => {
    setMounted(true);
    readState();
  }, []);

  const badge = useMemo(() => (hasToken ? "WHISK OK" : "OFF"), [hasToken]);
  const okLabel = useMemo(() => (okAt ? `LAST OK: ${formatTs(okAt)}` : "LAST OK: -"), [okAt]);

  function openWhisk2() {
    window.open("https://labs.google/fx/tools/whisk2", "_blank", "noopener,noreferrer");
    setMsg('OPENED: Whisk2 dibuka. Ikuti langkah ambil Authorization di DevTools.');
  }

  function goSettings() {
    window.location.href = "/settings";
  }

  function saveToSettings() {
    const normalized = normalizeBearer(tokenInput);
    if (!normalized) {
      setMsg("ERROR: token kosong.");
      return;
    }

    try {
      localStorage.setItem(LS_KEY, normalized);
      localStorage.setItem(LS_OK, "1");
      localStorage.setItem(LS_OK_AT, String(nowTs()));
      setTokenInput("");
      readState();
      setMsg("SAVED ✅ Token sudah masuk SETTINGS. (Whisk tab hanya tampil status, token tidak ditampilkan.)");
    } catch {
      setMsg("ERROR: gagal menyimpan token ke localStorage.");
    }
  }

  function clearToken() {
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_OK);
      localStorage.removeItem(LS_OK_AT);
      setTokenInput("");
      readState();
      setMsg("CLEARED ✅ Token dihapus dari SETTINGS.");
    } catch {
      setMsg("ERROR: gagal menghapus token.");
    }
  }

  function refresh() {
    readState();
    setMsg(hasToken ? "WHISK OK ✅ (token tersimpan di SETTINGS)" : "OFF — belum ada token.");
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="top">
          <div>
            <div className="title">WHISK TOKEN</div>
            <div className="sub">
              Tab ini buat workflow Whisk/Gemini Canvas. Token disimpan ke <b>SETTINGS (localStorage)</b>. Tidak ada output token di sini.
            </div>
          </div>

          <div className="right">
            <span className={`pill ${hasToken ? "ok" : ""}`}>{badge}</span>
            <span className="pill ghost">{okLabel}</span>
          </div>
        </div>

        <div className="panel">
          <div className="panelHead">TUTORIAL (DESKTOP)</div>
          <ol className="steps">
            <li>
              Open Chrome dan buka <span className="mono">https://labs.google/fx/tools/whisk2</span>.
            </li>
            <li>
              Tekan <b>F12</b> untuk buka DevTools, lalu pindah ke tab <b>Network</b>.
            </li>
            <li>
              Generate <b>1 test image</b> di Whisk.
            </li>
            <li>
              Cari request <b>POST</b> ke <span className="mono">aisandbox-pa.googleapis.com</span>.
            </li>
            <li>
              Buka tab <b>Headers</b>, copy seluruh nilai header <b>authorization</b>.
            </li>
            <li>
              Paste token di bawah (kalau ada prefix <span className="mono">Bearer </span> biarkan; kalau tidak ada nanti otomatis ditambahkan).
            </li>
          </ol>

          <div className="btnRow">
            <button className="btn" type="button" onClick={openWhisk2} disabled={!mounted}>
              OPEN WHISK2
            </button>
            <button className="btn ghost" type="button" onClick={goSettings} disabled={!mounted}>
              GO TO SETTINGS
            </button>
            <button className="btn ghost" type="button" onClick={refresh} disabled={!mounted}>
              REFRESH
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panelHead">PASTE TOKEN</div>

          <textarea
            className="area"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder='Paste authorization value di sini (contoh: "Bearer ya29...." atau token mentah)'
            spellCheck={false}
          />

          <div className="hint">
            Setelah kamu klik <b>SAVE TO SETTINGS</b>, token masuk ke Settings dan Whisk tab hanya menampilkan status <b>WHISK OK ✅</b>.
          </div>

          <div className="btnRow">
            <button className="btn" type="button" onClick={saveToSettings} disabled={!mounted}>
              SAVE TO SETTINGS
            </button>
            <button className="btn danger" type="button" onClick={clearToken} disabled={!mounted}>
              CLEAR TOKEN
            </button>
          </div>

          <div className="msg">{msg}</div>
        </div>
      </div>

      <style>{`
        :global(html), :global(body){ margin:0; padding:0; }
        .wrap{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:18px;
          background: radial-gradient(1200px 800px at 20% 0%, #0b1b3a 0%, #060a14 60%, #050712 100%);
          color:#fff;
          font-family: ui-rounded, "Comic Sans MS", "Trebuchet MS", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }
        .card{
          width: min(900px, 100%);
          border:6px solid #000;
          border-radius:24px;
          background: rgba(255,255,255,0.07);
          box-shadow: 0 14px 0 rgba(0,0,0,.35);
          padding:14px;
          display:flex;
          flex-direction:column;
          gap:12px;
        }
        .top{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        }
        .title{
          font-weight:1000;
          font-size:22px;
          letter-spacing:.6px;
          text-transform:uppercase;
        }
        .sub{
          margin-top:6px;
          opacity:.85;
          font-weight:900;
          font-size:12px;
          line-height:1.35;
          max-width:620px;
        }
        .right{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        }
        .pill{
          display:inline-flex;
          align-items:center;
          padding:8px 12px;
          border:3px solid #000;
          border-radius:999px;
          font-weight:1000;
          letter-spacing:.6px;
          text-transform:uppercase;
          font-size:12px;
          background: rgba(255,255,255,0.10);
          box-shadow: 0 6px 0 rgba(0,0,0,.35);
        }
        .pill.ok{ background:#79ff86; color:#05120a; }
        .pill.ghost{ background: rgba(255,255,255,0.10); color:#fff; opacity:.92; }
        .panel{
          border:3px solid #000;
          border-radius:18px;
          background: rgba(0,0,0,.22);
          box-shadow: 0 10px 0 rgba(0,0,0,.35);
          overflow:hidden;
        }
        .panelHead{
          padding:10px 12px;
          border-bottom:3px solid #000;
          background: rgba(255,255,255,0.06);
          font-weight:1000;
          letter-spacing:.6px;
          text-transform:uppercase;
          font-size:12px;
        }
        .steps{
          margin:0;
          padding:12px 18px 0 30px;
          font-weight:900;
          font-size:12px;
          line-height:1.55;
          opacity:.92;
        }
        .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .area{
          width:100%;
          min-height:140px;
          border:none;
          outline:none;
          resize:vertical;
          padding:12px;
          background: rgba(0,0,0,.25);
          color:#fff;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size:12px;
          line-height:1.45;
        }
        .hint{
          padding:10px 12px 0 12px;
          opacity:.85;
          font-weight:900;
          font-size:12px;
          line-height:1.35;
        }
        .btnRow{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          padding:12px;
        }
        .btn{
          background:#ffd84a;
          border:3px solid #000;
          border-radius:14px;
          padding:10px 12px;
          font-weight:1000;
          cursor:pointer;
          box-shadow: 0 7px 0 rgba(0,0,0,.35);
          color:#111;
          text-transform:uppercase;
          font-size:12px;
          letter-spacing:.6px;
        }
        .btn:active{ transform: translateY(2px); box-shadow: 0 5px 0 rgba(0,0,0,.35); }
        .btn.ghost{ background: rgba(255,255,255,0.10); color:#fff; }
        .btn.danger{ background: rgba(255,70,70,.16); color:#ffd7d7; }
        .msg{
          padding:10px 12px 12px 12px;
          border-top:2px dashed rgba(255,255,255,0.18);
          font-weight:1000;
          font-size:12px;
          line-height:1.35;
        }
      `}</style>
    </div>
  );
}
