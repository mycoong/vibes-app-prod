"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiKeySlot, clearApiKeySlots, loadApiKeySlots, msToHuman, saveApiKeySlots } from "../lib/apikeyStore";

const LS_KEYS = {
  WHISK_TOKEN: "YOSO_WHISK_TOKEN",
};

function loadWhiskToken(): string {
  try {
    return String(localStorage.getItem(LS_KEYS.WHISK_TOKEN) || "");
  } catch {
    return "";
  }
}

function saveWhiskToken(token: string) {
  try {
    localStorage.setItem(LS_KEYS.WHISK_TOKEN, String(token || ""));
  } catch {}
}

function maskKey(k: string) {
  const t = String(k || "").trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `••••••••${t.slice(-4)}`;
}

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [slots, setSlots] = useState<ApiKeySlot[]>([]);
  const [whiskToken, setWhiskToken] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    try {
      setSlots(loadApiKeySlots());
    } catch {
      setSlots([]);
    }
    setWhiskToken(loadWhiskToken());
  }, []);

  const hasAnyKey = useMemo(() => slots.some((s) => s.key.trim().length > 0), [slots]);

  const statusFor = (s: ApiKeySlot) => {
    const now = Date.now();
    if (!s.key.trim()) return { label: "EMPTY", kind: "empty" as const, sub: "Isi key" };
    if (s.cooldownUntil && s.cooldownUntil > now) {
      return {
        label: "COOLDOWN",
        kind: "cool" as const,
        sub: `${msToHuman(s.cooldownUntil - now)} • ${s.lastError || "429"}`,
      };
    }
    return { label: "READY", kind: "ready" as const, sub: s.lastError ? s.lastError : "OK" };
  };

  function onBackBuilder() {
    window.location.href = "/builder";
  }

  function onSaveKeys() {
    try {
      const cleaned = slots.map((s) => ({
        ...s,
        label: String(s.label || "").trim() || s.id.toUpperCase(),
        key: String(s.key || "").trim(),
      }));
      saveApiKeySlots(cleaned);
      setSlots(loadApiKeySlots());
      setMsg("SAVED: API keys ✅");
    } catch (e: any) {
      setMsg(`SAVE_FAILED: ${String(e?.message || e)}`);
    }
  }

  function onClearKeys() {
    try {
      clearApiKeySlots();
      setSlots(loadApiKeySlots());
      setMsg("CLEARED: API keys ✅");
    } catch (e: any) {
      setMsg(`CLEAR_FAILED: ${String(e?.message || e)}`);
    }
  }

  function onRefresh() {
    try {
      setSlots(loadApiKeySlots());
      setWhiskToken(loadWhiskToken());
      setMsg("REFRESHED ✅");
    } catch (e: any) {
      setMsg(`REFRESH_FAILED: ${String(e?.message || e)}`);
    }
  }

  function onSaveWhisk() {
    try {
      saveWhiskToken(whiskToken);
      setMsg("SAVED: Whisk token ✅");
    } catch (e: any) {
      setMsg(`SAVE_FAILED: ${String(e?.message || e)}`);
    }
  }

  return (
    <div className="wrap">
      <div className="stage">
        <div className="topRow">
          <div className="leftTop">
            <div className="title">Settings</div>
            <div className="sub">Kelola 5 BYOK API key (auto-rotate + cooldown anti 429).</div>
          </div>

          <div className="rightTop">
            <button className="btn ghost" type="button" onClick={onBackBuilder}>
              ← Back to Builder
            </button>
            <button className="btn ghost" type="button" onClick={onRefresh}>
              Refresh
            </button>
            <Link className="btn cyan" href="/canvas">
              Canvas
            </Link>
          </div>
        </div>

        {msg ? <div className="msg">{msg}</div> : null}

        <div className="card">
          <div className="cardHead">
            <div className="h">Gemini / Provider API Keys</div>
            <div className="muted">
              Status: {hasAnyKey ? "OK" : "BUTUH KEY"} • Isi minimal 1 key. Sistem akan muter 5 key + cooldown saat 429.
            </div>
          </div>

          <div className="slots">
            {slots.map((s, idx) => {
              const st = statusFor(s);
              return (
                <div className="slot" key={s.id || idx}>
                  <div className="slotTop">
                    <div className="slotLeft">
                      <div className="slotLabel">
                        <span className={`pill ${st.kind}`}>{st.label}</span>
                        <span className="slotName">Slot {idx + 1}</span>
                        <span className="slotMask">{maskKey(s.key)}</span>
                      </div>
                      <div className="slotSub">{st.sub}</div>
                    </div>
                  </div>

                  <div className="row">
                    <label className="lab">Label</label>
                    <input
                      className="input"
                      value={s.label}
                      onChange={(e) => setSlots((prev) => prev.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))}
                      placeholder={`KEY${idx + 1}`}
                    />
                  </div>

                  <div className="row">
                    <label className="lab">API Key</label>
                    <input
                      className="input mono"
                      value={s.key}
                      onChange={(e) => setSlots((prev) => prev.map((x) => (x.id === s.id ? { ...x, key: e.target.value } : x)))}
                      placeholder="Paste API key…"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="actions">
            <button className="btn" type="button" onClick={onSaveKeys} disabled={!mounted}>
              Save API Keys
            </button>
            <button className="btn ghost" type="button" onClick={onClearKeys} disabled={!mounted}>
              Clear Keys
            </button>
          </div>
        </div>

        <div className="card">
          <div className="cardHead">
            <div className="h">Whisk Token</div>
            <div className="muted">Opsional. Disimpan di localStorage.</div>
          </div>

          <div className="row">
            <label className="lab">Token</label>
            <input className="input mono" value={whiskToken} onChange={(e) => setWhiskToken(e.target.value)} placeholder="Paste token…" />
          </div>

          <div className="actions">
            <button className="btn" type="button" onClick={onSaveWhisk} disabled={!mounted}>
              Save Token
            </button>
          </div>
        </div>
      </div>

      <style>{`
        :global(html), :global(body){ margin:0; padding:0; }
        :global(html), :global(body){ overflow-x:hidden; }

        .wrap{
          min-height:100vh;
          background:
            radial-gradient(1100px 700px at 15% 0%, rgba(34,211,238,.22) 0%, rgba(11,18,32,0) 55%),
            radial-gradient(900px 600px at 90% 10%, rgba(255,107,214,.16) 0%, rgba(11,18,32,0) 60%),
            radial-gradient(1200px 800px at 30% 110%, rgba(255,216,74,.12) 0%, rgba(11,18,32,0) 55%),
            linear-gradient(180deg, #0b1220 0%, #070b14 55%, #050712 100%);
          padding:12px;
          color:#e5e7eb;
        }

        .stage{
          max-width:520px;
          margin:0 auto;
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .topRow{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        }
        .title{
          font-weight:1000;
          font-size:18px;
          color:#fff;
        }
        .sub{
          margin-top:4px;
          font-size:12px;
          opacity:.82;
          font-weight:700;
          max-width:52ch;
        }

        .rightTop{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .msg{
          padding:10px 12px;
          border:3px solid #000;
          border-radius:16px;
          background:rgba(255,255,255,.08);
          box-shadow:0 10px 0 rgba(0,0,0,.35);
          font-weight:1000;
          font-size:12px;
        }

        .card{
          border:4px solid #000;
          border-radius:22px;
          background:linear-gradient(180deg, rgba(255,255,255,.92) 0%, rgba(245,247,250,.90) 100%);
          box-shadow:0 12px 0 rgba(0,0,0,.35);
          color:#0b1220;
          padding:12px;
        }

        .cardHead{
          display:flex;
          flex-direction:column;
          gap:4px;
          margin-bottom:10px;
        }
        .h{
          font-weight:1000;
          font-size:14px;
        }
        .muted{
          font-size:12px;
          opacity:.8;
          font-weight:800;
        }

        .slots{
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .slot{
          border:3px solid #000;
          border-radius:18px;
          background:rgba(11,18,32,.05);
          padding:10px;
          box-shadow:0 10px 0 rgba(0,0,0,.25);
        }
        .slotTop{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:8px;
        }
        .slotLabel{
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
        }
        .slotName{
          font-weight:1000;
          font-size:12px;
        }
        .slotMask{
          font-weight:1000;
          font-size:12px;
          opacity:.75;
        }
        .slotSub{
          font-size:12px;
          font-weight:800;
          opacity:.8;
          margin-top:4px;
        }

        .pill{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:6px 10px;
          border:3px solid #000;
          border-radius:999px;
          font-weight:1000;
          font-size:11px;
          letter-spacing:.6px;
          text-transform:uppercase;
          box-shadow:0 6px 0 rgba(0,0,0,.25);
        }
        .pill.ready{ background:#79ff86; color:#05120a; }
        .pill.cool{ background:#ffd84a; color:#111; }
        .pill.empty{ background:rgba(11,18,32,.08); color:#0b1220; }

        .row{
          display:flex;
          flex-direction:column;
          gap:6px;
          margin-top:8px;
        }
        .lab{
          font-weight:1000;
          font-size:11px;
          letter-spacing:.6px;
          text-transform:uppercase;
          opacity:.8;
        }
        .input{
          width:100%;
          padding:10px 10px;
          border:3px solid #000;
          border-radius:14px;
          outline:none;
          font-weight:900;
          font-size:12px;
          background:rgba(255,255,255,.85);
          color:#0b1220;
        }
        .mono{
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        .actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:10px;
        }

        .btn{
          background:#ffd84a;
          border:3px solid #000;
          border-radius:14px;
          padding:10px 12px;
          font-weight:1000;
          cursor:pointer;
          box-shadow:0 7px 0 rgba(0,0,0,.35);
          transition: transform .06s ease;
          color:#111;
          text-transform:uppercase;
          font-size:12px;
          letter-spacing:.6px;
          text-decoration:none;
          display:inline-flex;
          align-items:center;
          justify-content:center;
        }
        .btn:active{ transform: translateY(2px); box-shadow:0 5px 0 rgba(0,0,0,.35); }
        .btn.ghost{ background:rgba(255,255,255,.10); color:#fff; }
        .btn.cyan{ background:#00e0ff; color:#06131a; }
        .btn:disabled{ opacity:.6; cursor:not-allowed; }
      `}</style>
    </div>
  );
}
