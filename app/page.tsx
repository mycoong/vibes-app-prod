"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function getOrCreateDeviceId() {
  const KEY = "ww_device_id_v1";
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && existing.trim()) return existing.trim();
    const v =
      globalThis.crypto?.randomUUID?.() ||
      `dev_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    localStorage.setItem(KEY, v);
    return v;
  } catch {
    return `dev_fallback_${Date.now()}`;
  }
}

function shortDevice(d: string) {
  if (!d) return "-";
  if (d.length <= 12) return d;
  return `${d.slice(0, 4)}...${d.slice(-4)}`;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [license, setLicense] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/me", { method: "GET", cache: "no-store" });
        if (!alive) return;
        if (res.ok) {
          router.replace("/builder");
          return;
        }
      } catch {}
      if (!alive) return;
      setCheckingSession(false);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const canSubmit = useMemo(
    () => license.trim().length >= 6 && !!deviceId && !loading,
    [license, deviceId, loading]
  );

  async function onLogin() {
    if (!canSubmit) return;
    setLoading(true);
    setErr("");

    try {
      const res = await fetchWithTimeout(
        "/api/login",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            license: license.trim(),
            device: deviceId,
          }),
        },
        12000
      );

      const data = await res.json().catch(() => ({}));

      if (data?.ok === true) {
        router.replace("/builder");
        return;
      }

      setErr(
        data?.error ||
          data?.status ||
          (res.ok ? "LOGIN_FAILED" : `HTTP_${res.status}`)
      );
    } catch (e: any) {
      if (String(e?.name) === "AbortError") setErr("TIMEOUT");
      else setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="brand">
          <img src="/vibes-logo.png" className="logo" alt="Vibes App" />

          <div className="sloganPill">
            <span className="sloganText">Moments that take you there.</span>
          </div>
        </div>

        <div className="field">
          <div className="label">License Key</div>
          <input
            className="input"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            placeholder="Masukkan License (WW-...)"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLogin();
            }}
          />
        </div>

        <button
          className="btn"
          disabled={!canSubmit || checkingSession}
          onClick={onLogin}
        >
          {checkingSession
            ? "CHECKING SESSION..."
            : loading
            ? "CHECKING..."
            : "LOGIN"}
        </button>

        <div className="deviceWrap">
          <div className="devicePill" title={deviceId}>
            <span className="deviceLabel">Device</span>
            <span className="mono deviceValue">{shortDevice(deviceId)}</span>
          </div>
        </div>

        {err && (
          <div className="errorBox">
            <div className="errorTitle">ERROR</div>
            <div className="errorText mono">{err}</div>
          </div>
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
:global(html), :global(body) { overflow-x: hidden; }

.wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 18px;
  background: radial-gradient(1200px 800px at 20% 0%, #0b1b3a 0%, #060a14 60%, #050712 100%);
  font-family: ui-rounded, "Comic Sans MS", "Trebuchet MS", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}

.card {
  width: 100%;
  max-width: 680px;
  background: #fff;
  border: 5px solid #000;
  border-radius: 30px;
  padding: 28px;
  box-shadow: 0 22px 70px rgba(0,0,0,.45);
  display: grid;
  gap: 18px;
}

.brand {
  display: grid;
  justify-items: center;
  gap: 14px;
  text-align: center;
}

.logo {
  width: 100%;
  height: auto;
  max-width: 560px;
  max-height: 420px;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 #000);
}

/* SLOGAN: orange + bold + outline vibe */
.sloganPill {
  border: 3px solid #000;
  border-radius: 999px;
  padding: 10px 16px;
  background: #fff;
  box-shadow: 0 8px 0 rgba(0,0,0,.18);
  max-width: 100%;
}

.sloganText {
  font-weight: 1000;
  font-size: 15px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: #ff7a18;
  text-shadow:
    1px 0 0 #000,
    -1px 0 0 #000,
    0 1px 0 #000,
    0 -1px 0 #000;
}

.field {
  border: 4px solid #000;
  border-radius: 22px;
  padding: 14px;
  background: #fff;
  box-shadow: 0 10px 0 rgba(0,0,0,.10);
}

.label {
  font-weight: 1000;
  font-size: 13px;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.input {
  width: 100%;
  border: 3px solid #000;
  border-radius: 16px;
  padding: 14px;
  font-weight: 900;
  font-size: 15px;
  background: #f8fafc;
  outline: none;
}

.btn {
  padding: 16px;
  border: 5px solid #000;
  border-radius: 22px;
  background: #ffd84a;
  font-weight: 1000;
  font-size: 17px;
  box-shadow: 0 12px 0 #000;
  cursor: pointer;
  text-transform: uppercase;
}

.btn:active {
  transform: translateY(3px);
  box-shadow: 0 9px 0 #000;
}

.btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

/* Device pill: abu-abu, kecil, rata kanan */
.deviceWrap {
  display: flex;
  justify-content: flex-end;
  margin-top: -4px;
}

.devicePill {
  border: 2px solid #000;
  border-radius: 999px;
  padding: 7px 12px;
  background: #f1f5f9;
  color: #111;
  box-shadow: 0 5px 0 rgba(0,0,0,.14);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.deviceLabel {
  opacity: .65;
  font-weight: 1000;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #6b7280;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.deviceValue {
  font-weight: 900;
  font-size: 11px;
  color: #6b7280;
}

.errorBox {
  background: #fee2e2;
  border: 4px solid #000;
  border-radius: 18px;
  padding: 14px;
}

.errorTitle {
  font-weight: 1000;
  font-size: 13px;
  text-transform: uppercase;
  color: #991b1b;
  margin-bottom: 6px;
}

.errorText {
  font-weight: 900;
  color: #111;
}

/* MOBILE FRIENDLY */
@media (max-width: 520px){
  .card { padding: 18px; border-width: 4px; border-radius: 26px; gap: 14px; }
  .logo { max-width: 360px; max-height: 280px; }
  .sloganPill { padding: 9px 12px; box-shadow: 0 6px 0 rgba(0,0,0,.16); }
  .sloganText { font-size: 12px; letter-spacing: .05em; }
  .field { padding: 12px; }
  .input { padding: 12px; font-size: 14px; }
  .btn { padding: 14px; font-size: 16px; box-shadow: 0 10px 0 #000; }
  .devicePill { padding: 6px 10px; }
  .deviceValue { font-size: 10px; }
}

@media (max-width: 380px){
  .logo { max-width: 320px; max-height: 240px; }
  .sloganText { font-size: 11px; }
}
`;
