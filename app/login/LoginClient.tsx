"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function getOrCreateDeviceId() {
  const key = "ww_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = (crypto as any).randomUUID
    ? crypto.randomUUID()
    : `DEV-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(key, id);
  return id;
}

export default function LoginClient() {
  const router = useRouter();
  const [license, setLicense] = useState("");
  const [device, setDevice] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setDevice(getOrCreateDeviceId());
  }, []);

  const maskedDevice = useMemo(() => {
    if (!device) return "";
    if (device.length <= 8) return device;
    return `${device.slice(0, 4)}…${device.slice(-4)}`;
  }, [device]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license, device }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setErr(data?.error || "LOGIN_FAILED");
        setLoading(false);
        return;
      }

      router.replace("/builder");
    } catch {
      setErr("NETWORK_ERROR");
      setLoading(false);
    }
  }


  return (
    <div className="wrap">
      <div className="card">
        <div className="brand">
          <img src="/vibes-logo.png" alt="Vibes App" className="logo" />
          <div className="slogan">Moments that take you there.</div>
        </div>

        <form onSubmit={onSubmit} className="form">
          <div className="field">
            <label>License Key</label>
            <input
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="ENTER YOUR LICENSE"
            />
          </div>

          <button disabled={loading}>
            {loading ? "PLEASE WAIT..." : "LOGIN"}
          </button>

          {device && <div className="device">DEVICE: {device}</div>}
          {err && <div className="error">ERROR: {err}</div>}
        </form>

        <a href="https://t.me/VibesTheApp" target="_blank" className="telegram" aria-label="Telegram">
          <svg viewBox="0 0 240 240" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0zm58.2 82.3l-22.4 105.6c-1.7 7.5-6.2 9.4-12.5 5.9l-34.6-25.5-16.7 16.1c-1.8 1.8-3.3 3.3-6.7 3.3l2.4-34.9 63.6-57.4c2.8-2.4-.6-3.7-4.3-1.3l-78.6 49.5-33.8-10.6c-7.3-2.3-7.5-7.3 1.5-10.8l132-50.9c6.1-2.2 11.4 1.5 9.4 11z"/>
          </svg>
        </a>
      </div>

      <style>{`
        .wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-image: url('/login-bg.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          position: relative;
          overflow: hidden;
          padding: 24px;
          font-family: ui-rounded, "Trebuchet MS", system-ui, sans-serif;
        }

        .wrap::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,.65), rgba(0,0,0,.75));
          pointer-events: none;
        }

        .card {
          width: 100%;
          max-width: 440px;
          background: rgba(8,10,22,.75);
          border: 2px solid rgba(255,255,255,.08);
          border-radius: 28px;
          backdrop-filter: blur(10px);
          box-shadow: 0 30px 80px rgba(0,0,0,.6);
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          position: relative;
        }

        .brand { text-align: center; }
        .logo { height: 110px; margin: 0 auto 6px; display: block; }
        .slogan { font-weight: 900; font-size: 12px; letter-spacing: .14em; opacity: .8; text-transform: uppercase; }

        .form { display: flex; flex-direction: column; gap: 14px; }
        label { font-size: 12px; font-weight: 900; opacity: .85; }

        input {
          background: rgba(0,0,0,.4);
          border: 1.5px solid rgba(255,255,255,.12);
          border-radius: 16px;
          padding: 12px 14px;
          color: #fff;
          font-size: 14px;
          outline: none;
        }

        button {
          margin-top: 4px;
          background: linear-gradient(135deg, #6ea2ff, #a77bff);
          border: none;
          border-radius: 16px;
          padding: 12px;
          font-weight: 1000;
          cursor: pointer;
        }

        .telegram {
          position: absolute;
          top: 16px;
          right: 16px;
          color: rgba(255,255,255,.6);
        }

        .device { font-size: 11px; opacity: .6; }
        .error { background: #3b0b0b; border-radius: 14px; padding: 10px; font-size: 12px; }
      `}</style>
    </div>
  );
}
