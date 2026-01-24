"use client";

import React, { useEffect, useMemo, useState } from "react";

function normalizeBearer(raw: string) {
  let t = String(raw || "").trim();
  if (!t) return "";
  if (!/^bearer\s+/i.test(t)) t = `Bearer ${t}`;
  return t;
}

export default function WhiskPopupPage() {
  const [msg, setMsg] = useState("Loading…");
  const [tokenInput, setTokenInput] = useState("");
  const [status, setStatus] = useState<{
    authenticated: boolean;
    hasToken: boolean;
    ttlSeconds: number | null;
    expiresAt: number | null;
    ageHours: number | null;
  }>({ authenticated: false, hasToken: false, ttlSeconds: null, expiresAt: null, ageHours: null });

  async function fetchStatus() {
    try {
      const r = await fetch("/api/whisk/status", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setMsg(`STATUS_ERROR: ${j?.error || r.status}`);
        setStatus({ authenticated: false, hasToken: false, ttlSeconds: null, expiresAt: null, ageHours: null });
        return;
      }
      setStatus({
        authenticated: !!j.authenticated,
        hasToken: !!j.hasToken,
        ttlSeconds: typeof j.ttlSeconds === "number" ? j.ttlSeconds : null,
        expiresAt: typeof j.expiresAt === "number" ? j.expiresAt : null,
        ageHours: typeof j.ageHours === "number" ? j.ageHours : null,
      });
      setMsg(j.authenticated ? "AUTH_OK ✅ (token tersimpan di server)" : "NOT_AUTH: simpan Bearer token dulu.");
    } catch (e: any) {
      setMsg(`STATUS_FAILED: ${String(e?.message || e)}`);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const badge = status.authenticated ? "AUTHENTICATED" : "NOT AUTH";
  const expiresLabel = useMemo(() => {
    if (!status.expiresAt) return "-";
    try {
      return new Date(status.expiresAt).toLocaleString();
    } catch {
      return String(status.expiresAt);
    }
  }, [status.expiresAt]);

  function openWhisk() {
    window.open("https://labs.google/fx/tools/whisk", "_blank", "noopener,noreferrer");
    setMsg('OPENED: Whisk dibuka. Login Google, lalu klik "Create" supaya request muncul (desktop).');
  }

  async function saveToken() {
    const token = normalizeBearer(tokenInput);
    if (!token) {
      setMsg("ERROR: token kosong.");
      return;
    }

    try {
      const r = await fetch("/api/whisk/save-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setMsg(`SAVE_ERROR: ${j?.error || r.status}`);
        return;
      }
      setTokenInput("");
      setMsg("SAVED ✅ token tersimpan 7 hari (KV).");
      await fetchStatus();
    } catch (e: any) {
      setMsg(`SAVE_FAILED: ${String(e?.message || e)}`);
    }
  }

  async function resetToken() {
    try {
      const r = await fetch("/api/whisk/reset", { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setMsg(`RESET_ERROR: ${j?.error || r.status}`);
        return;
      }
      setMsg("RESET ✅ token Whisk dihapus dari server.");
      await fetchStatus();
    } catch (e: any) {
      setMsg(`RESET_FAILED: ${String(e?.message || e)}`);
    }
  }

  function close() {
    window.close();
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="top">
          <div>
            <div className="title">Whisk Login</div>
            <div className="sub">Token disimpan di server (KV) per license — jadi HP ikut aktif.</div>
          </div>
          <button className="btn ghost" onClick={close} type="button">
            CLOSE ✕
          </button>
        </div>

        <div className="row">
          <span className={`pill ${status.authenticated ? "ok" : ""}`}>{badge}</span>
          <span className="pill">AGE: {status.ageHours ?? "-" }h</span>
          <span className="pill">EXPIRES: {expiresLabel}</span>
        </div>

        <div className="box">
          <div className="label">STEP 1 — OPEN WHISK + LOGIN (DESKTOP)</div>
          <button className="btn" type="button" onClick={openWhisk}>
            OPEN WHISK
          </button>
          <div className="hint">
            Desktop wajib untuk ambil Bearer (DevTools).
            Setelah token tersimpan di server, HP otomatis ikut aktif saat login license.
          </div>
        </div>

        <div className="box">
          <div className="label">STEP 2 — PASTE BEARER TOKEN</div>
          <textarea
            className="area"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder='Paste "Bearer ..." (atau token mentah, nanti otomatis jadi Bearer).'
          />
          <div className="hint">
            Cara ambil cepat (desktop): F12 → Network → filter <span className="mono">trpc</span> → klik <b>Create</b> di Whisk → pilih request <span className="mono">backbone.*</span> → Headers → Authorization → copy <span className="mono">Bearer …</span>
          </div>
          <div className="btnRow">
            <button className="btn" type="button" onClick={saveToken}>
              SAVE TOKEN (7 DAYS)
            </button>
            <button className="btn ghost" type="button" onClick={resetToken}>
              LOGOUT WHISK
            </button>
            <button className="btn ghost" type="button" onClick={fetchStatus}>
              REFRESH STATUS
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
          width: min(760px, 100%);
          border:4px solid #000;
          border-radius:18px;
          background: rgba(255,255,255,0.07);
          box-shadow: 0 12px 0 rgba(0,0,0,.35);
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
          font-weight:800;
          font-size:12px;
          line-height:1.35;
          max-width:520px;
        }
        .row{ display:flex; gap:10px; flex-wrap:wrap; }
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
        .box{
          border:3px solid #000;
          border-radius:16px;
          background: rgba(0,0,0,.22);
          box-shadow: 0 10px 0 rgba(0,0,0,.35);
          overflow:hidden;
        }
        .label{
          padding:10px;
          border-bottom:3px solid #000;
          background: rgba(255,255,255,0.06);
          font-weight:1000;
          letter-spacing:.6px;
          text-transform:uppercase;
          font-size:12px;
        }
        .area{
          width:100%;
          min-height:140px;
          border:none;
          outline:none;
          resize:vertical;
          padding:10px;
          background: rgba(0,0,0,.25);
          color:#fff;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size:12px;
          line-height:1.4;
        }
        .btnRow{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          padding:10px;
          border-top:2px dashed rgba(255,255,255,0.18);
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
        .hint{
          padding:10px;
          opacity:.85;
          font-weight:800;
          font-size:12px;
          line-height:1.35;
        }
        .msg{
          padding:10px;
          border-top:2px dashed rgba(255,255,255,0.18);
          font-weight:1000;
          font-size:12px;
        }
        .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      `}</style>
    </div>
  );
}
