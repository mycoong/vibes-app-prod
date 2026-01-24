"use client";

import React, { useEffect, useState } from "react";

const LS_KEYS = {
  SLOTS: "YOSO_API_KEY_SLOTS",
  WHISK_TOKEN: "YOSO_WHISK_TOKEN",
};

type Slot = { label: string; apiKey: string };

function loadSlots(): Slot[] {
  try {
    const raw = localStorage.getItem(LS_KEYS.SLOTS);
    if (!raw) return Array.from({ length: 5 }, (_, i) => ({ label: `Key ${i + 1}`, apiKey: "" }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Array.from({ length: 5 }, (_, i) => ({ label: `Key ${i + 1}`, apiKey: "" }));
    const arr = parsed.slice(0, 5).map((x: any, i: number) => ({
      label: String(x?.label || `Key ${i + 1}`),
      apiKey: String(x?.apiKey || ""),
    }));
    while (arr.length < 5) arr.push({ label: `Key ${arr.length + 1}`, apiKey: "" });
    return arr;
  } catch {
    return Array.from({ length: 5 }, (_, i) => ({ label: `Key ${i + 1}`, apiKey: "" }));
  }
}

function saveSlots(slots: Slot[]) {
  try {
    localStorage.setItem(LS_KEYS.SLOTS, JSON.stringify(slots.slice(0, 5)));
  } catch {}
}

function loadWhiskToken(): string {
  try {
    return String(localStorage.getItem(LS_KEYS.WHISK_TOKEN) || "");
  } catch {
    return "";
  }
}

function saveWhiskToken(token: string) {
  try {
    const raw = String(token || "").trim();
    if (!raw) {
      localStorage.removeItem(LS_KEYS.WHISK_TOKEN);
      return;
    }
    const normalized = /^bearer\s+/i.test(raw) ? raw.replace(/^bearer\s+/i, "Bearer ") : `Bearer ${raw}`;
    localStorage.setItem(LS_KEYS.WHISK_TOKEN, normalized);
  } catch {}
}

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [whiskToken, setWhiskToken] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    setSlots(loadSlots());
    setWhiskToken(loadWhiskToken());
  }, []);

  function update(i: number, v: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, apiKey: v } : s)));
  }

  function onSave() {
    saveSlots(slots);
    saveWhiskToken(whiskToken);
    setMsg("SAVED ✅");
    setTimeout(() => setMsg(""), 1400);
  }

  function onBack() {
    window.location.href = "/builder";
  }

  function onClearWhisk() {
    setWhiskToken("");
    saveWhiskToken("");
    setMsg("WHISK TOKEN CLEARED ✅");
    setTimeout(() => setMsg(""), 1400);
  }

  const whiskHint = whiskToken ? "ON" : "OFF";

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">SETTINGS</div>
        <div className="sub">Simpan sampai 5 API key Gemini (BYOK) + Whisk token. Semua disimpan di localStorage.</div>

        <div className="sectionTitle">GEMINI KEYS</div>

        <div className="list">
          {slots.map((s, i) => (
            <div key={i} className="row">
              <div className="lbl">{s.label.toUpperCase()}</div>
              <input
                className="inp"
                value={s.apiKey}
                onChange={(e) => update(i, e.target.value)}
                placeholder="paste API key..."
                spellCheck={false}
              />
            </div>
          ))}
        </div>

        <div className="sectionTitle" style={{ marginTop: 16 }}>
          WHISK TOKEN <span className={`pill ${whiskToken ? "ok" : ""}`}>{whiskHint}</span>
        </div>
        <div className="sub2">
          Paste <b>Authorization Bearer</b> token Whisk (contoh: <span className="mono">Bearer ya29....</span>).
        </div>

        <div className="row">
          <div className="lbl">WHISK TOKEN</div>
          <input
            className="inp"
            value={whiskToken}
            onChange={(e) => setWhiskToken(e.target.value)}
            placeholder="Bearer ..."
            spellCheck={false}
          />
          <div className="miniRow">
            <button className="miniBtn" type="button" onClick={onClearWhisk} disabled={!mounted}>
              CLEAR
            </button>
          </div>
        </div>

        {msg ? <div className="msg">{msg}</div> : null}

        <div className="btnRow">
          <button className="btn" type="button" onClick={onSave} disabled={!mounted}>
            SAVE
          </button>
          <button className="btn ghost" type="button" onClick={onBack} disabled={!mounted}>
            BACK TO BUILDER
          </button>
        </div>
      </div>

      <style>{`
        .wrap{
          min-height: 100vh;
          background: radial-gradient(1200px 800px at 20% 0%, #0b1b3a 0%, #060a14 60%, #050712 100%);
          padding: 18px;
          color:#111;
          font-family: ui-rounded, "Comic Sans MS", "Trebuchet MS", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          display:flex;
          justify-content:center;
          align-items:flex-start;
        }
        .card{
          width: min(680px, 95vw);
          background:#fff;
          border: 6px solid #000;
          border-radius: 26px;
          padding: 16px;
          box-shadow: 0 22px 70px rgba(0,0,0,.45);
        }
        .title{
          font-weight:1000;
          font-size: 22px;
          text-transform: uppercase;
        }
        .sub{
          margin-top: 6px;
          font-weight: 900;
          font-size: 12px;
          opacity:.8;
        }
        .sub2{
          margin-top: 6px;
          font-weight: 900;
          font-size: 12px;
          opacity:.85;
          line-height: 1.35;
        }
        .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .sectionTitle{
          margin-top: 14px;
          font-weight:1000;
          font-size: 14px;
          text-transform: uppercase;
          display:flex;
          align-items:center;
          gap: 10px;
        }
        .pill{
          border: 3px solid #000;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 1000;
          background:#fff;
        }
        .pill.ok{ background:#dcfce7; }

        .list{ margin-top: 14px; display:grid; gap: 12px; }
        .row{
          margin-top: 10px;
          border: 4px solid #000;
          border-radius: 18px;
          padding: 12px;
          background: radial-gradient(circle at 1px 1px, rgba(0,0,0,.06) 1px, transparent 1px), #fff;
          background-size: 8px 8px;
        }
        .lbl{
          font-weight:1000;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .inp{
          width:100%;
          border: 3px solid #000;
          border-radius: 14px;
          padding: 12px;
          font-weight: 900;
          outline:none;
          background: #f8fafc;
        }
        .miniRow{ margin-top: 10px; display:flex; gap: 10px; flex-wrap: wrap; }
        .miniBtn{
          border: 3px solid #000;
          border-radius: 14px;
          padding: 10px 12px;
          background: #fff;
          font-weight: 1000;
          cursor: pointer;
          box-shadow: 0 8px 0 rgba(0,0,0,.18);
          text-transform: uppercase;
        }
        .miniBtn:active{ transform: translateY(2px); box-shadow: 0 6px 0 rgba(0,0,0,.18); }

        .msg{
          margin-top: 12px;
          border: 4px solid #000;
          border-radius: 16px;
          padding: 10px 12px;
          background: #dcfce7;
          font-weight: 1000;
        }
        .btnRow{
          margin-top: 14px;
          display:flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .btn{
          border: 4px solid #000;
          border-radius: 18px;
          padding: 12px 14px;
          background: #ffd84a;
          font-weight: 1000;
          cursor:pointer;
          box-shadow: 0 10px 0 rgba(0,0,0,.18);
          text-transform: uppercase;
        }
        .btn:active{ transform: translateY(2px); box-shadow: 0 8px 0 rgba(0,0,0,.18); }
        .btn:disabled{ opacity:.7; cursor:not-allowed; }
        .btn.ghost{ background:#fff; }
      `}</style>
    </div>
  );
}
