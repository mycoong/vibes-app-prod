"use client";

import React, { useEffect, useMemo, useState } from "react";

const LS_KEYS = {
  SLOTS: "YOSO_API_KEY_SLOTS",
  WHISK_TOKEN: "YOSO_WHISK_TOKEN",
};

type Slot = { label: string; apiKey: string };

function defaultSlots(): Slot[] {
  return Array.from({ length: 5 }, (_, i) => ({ label: `Key ${i + 1}`, apiKey: "" }));
}

function loadSlots(): Slot[] {
  try {
    const raw = localStorage.getItem(LS_KEYS.SLOTS);
    if (!raw) return defaultSlots();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultSlots();
    const arr = parsed
      .slice(0, 5)
      .map((x: any, i: number) => ({ label: String(x?.label || `Key ${i + 1}`), apiKey: String(x?.apiKey || "") }));
    while (arr.length < 5) arr.push({ label: `Key ${arr.length + 1}`, apiKey: "" });
    return arr;
  } catch {
    return defaultSlots();
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

  const whiskOn = useMemo(() => !!whiskToken.trim(), [whiskToken]);

  function updateSlot(i: number, v: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, apiKey: v } : s)));
  }

  function onSave() {
    saveSlots(slots);
    saveWhiskToken(whiskToken);
    setMsg("SAVED ✅");
    setTimeout(() => setMsg(""), 1400);
  }

  function onClearWhisk() {
    setWhiskToken("");
    saveWhiskToken("");
    setMsg("WHISK TOKEN CLEARED ✅");
    setTimeout(() => setMsg(""), 1400);
  }

  function nav(href: string) {
    window.location.href = href;
  }

  return (
    <div className="wrap">
      <div className="polaroid">
        <div className="pin" aria-hidden="true" />

        <div className="header">
          <div>
            <div className="title">SETTINGS</div>
            <div className="sub">Simpan sampai 5 API key Gemini (BYOK) + Whisk token. Disimpan di localStorage.</div>
          </div>

          <div className="topActions">
            <button className="btn ghost" type="button" onClick={() => nav("/builder")} disabled={!mounted}>
              BACK TO MAIN MENU
            </button>
            <button className="btn ghost" type="button" onClick={() => nav("/builder/panels")} disabled={!mounted}>
              BACK TO PANELS
            </button>
          </div>
        </div>

        <div className="board">
          <div className="sectionRow">
            <div className="sectionTitle">GEMINI KEYS</div>
            <div className="hint">Pakai key mana saja. Kamu bisa ganti kapan pun.</div>
          </div>

          <div className="grid">
            {slots.map((s, i) => (
              <div key={i} className="slot">
                <div className="slotHead">{s.label.toUpperCase()}</div>
                <input
                  className="inp"
                  value={s.apiKey}
                  onChange={(e) => updateSlot(i, e.target.value)}
                  placeholder="Paste API key…"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            ))}
          </div>

          <div className="sectionRow" style={{ marginTop: 14 }}>
            <div className="sectionTitle">
              WHISK TOKEN <span className={`pill ${whiskOn ? "on" : ""}`}>{whiskOn ? "ON" : "OFF"}</span>
            </div>
            <div className="hint">
              Paste Authorization Bearer token (contoh: <span className="mono">Bearer ya29…</span>)
            </div>
          </div>

          <div className="tokenRow">
            <input
              className="inp"
              value={whiskToken}
              onChange={(e) => setWhiskToken(e.target.value)}
              placeholder="Bearer …"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button className="miniBtn" type="button" onClick={onClearWhisk} disabled={!mounted || !whiskOn}>
              CLEAR
            </button>
          </div>

          {msg ? <div className="msg">{msg}</div> : null}

          <div className="bottomActions">
            <button className="btn primary" type="button" onClick={onSave} disabled={!mounted}>
              SAVE
            </button>
            <div className="spacer" />
            <div className="note">Tip: kalau mau rekam layar, kosongkan token dulu.</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .wrap {
          min-height: 100vh;
          background: radial-gradient(1200px 800px at 20% 0%, #0b1b3a 0%, #060a14 60%, #050712 100%);
          padding: 18px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          color: #111;
          font-family: inherit; /* follow Builder font */
        }

        /* Outer = same width philosophy as builder/panels cards */
        .polaroid {
          position: relative;
          width: min(520px, 96vw);
          background: rgba(255, 255, 255, 0.92);
          border: 6px solid #000;
          border-radius: 26px;
          padding: 14px;
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.45);
          overflow: hidden;
        }

        /* stacked papers behind */
        .polaroid::before,
        .polaroid::after {
          content: "";
          position: absolute;
          left: 16px;
          right: 16px;
          top: 10px;
          bottom: 10px;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.55);
          border: 2px solid rgba(0, 0, 0, 0.25);
          z-index: -1;
        }
        .polaroid::before {
          transform: rotate(-1.4deg) translateY(8px);
          opacity: 0.7;
        }
        .polaroid::after {
          transform: rotate(1deg) translateY(16px);
          opacity: 0.55;
        }

        /* red pin */
        .pin {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 35%, #ff9aa4 0%, #ff2b2b 35%, #c40000 100%);
          border: 3px solid rgba(0, 0, 0, 0.75);
          box-shadow: 0 6px 0 rgba(0, 0, 0, 0.75);
          z-index: 3;
        }
        .pin::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 26px;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.18);
          filter: blur(1px);
        }

        .header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 16px; /* room for pin */
          align-items: flex-start;
        }

        .title {
          font-weight: 1000;
          font-size: 22px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        .sub {
          margin-top: 4px;
          font-weight: 800;
          font-size: 12px;
          opacity: 0.75;
          line-height: 1.3;
        }

        .topActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .board {
          margin-top: 12px;
          border-radius: 20px;
          border: 4px solid #000;
          background: #ffffff;
          padding: 12px;
        }

        .sectionRow {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          align-items: baseline;
        }

        .sectionTitle {
          font-weight: 1000;
          font-size: 14px;
          text-transform: uppercase;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .hint {
          font-weight: 800;
          font-size: 12px;
          opacity: 0.7;
        }

        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-weight: 800;
        }

        .pill {
          border: 3px solid #000;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 1000;
          background: rgba(0, 0, 0, 0.06);
        }
        .pill.on {
          background: #dcfce7;
        }

        .grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .slot {
          border: 3px solid #000;
          border-radius: 18px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.03);
        }

        .slotHead {
          font-weight: 1000;
          font-size: 12px;
          opacity: 0.75;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .inp {
          width: 100%;
          border: 3px solid #000;
          border-radius: 16px;
          padding: 10px 12px;
          background: #fff;
          outline: none;
          font-weight: 700;
          font-size: 13px;
        }

        .tokenRow {
          margin-top: 10px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .miniBtn {
          border: 3px solid #000;
          border-radius: 16px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.04);
          font-weight: 1000;
          cursor: pointer;
          text-transform: uppercase;
        }
        .miniBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .msg {
          margin-top: 10px;
          border: 4px solid #000;
          border-radius: 16px;
          padding: 10px 12px;
          background: #dcfce7;
          font-weight: 1000;
          text-transform: uppercase;
        }

        .bottomActions {
          margin-top: 12px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .spacer {
          flex: 1;
          min-width: 8px;
        }

        .note {
          font-weight: 800;
          font-size: 12px;
          opacity: 0.65;
        }

        .btn {
          border: 4px solid #000;
          border-radius: 18px;
          padding: 12px 14px;
          background: #fff;
          font-weight: 1000;
          cursor: pointer;
          box-shadow: 0 10px 0 rgba(0, 0, 0, 0.18);
          text-transform: uppercase;
          user-select: none;
        }
        .btn:active {
          transform: translateY(2px);
          box-shadow: 0 8px 0 rgba(0, 0, 0, 0.18);
        }
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .btn.primary {
          background: #ffd84a;
        }
        .btn.ghost {
          background: #fff;
          box-shadow: none;
          border-color: rgba(0, 0, 0, 0.35);
        }

        @media (min-width: 700px) {
          .grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
