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
  const [pressed, setPressed] = useState(false);
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
    if (loading) return;

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

  function pressNow() {
    setPressed(true);
    window.setTimeout(() => setPressed(false), 140);
  }

  return (
    <div className="bg">
      <div className="outer">
        <div className="sheet">
          <form onSubmit={onSubmit} className="stack">
            <input
              className="passkey"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="Masukkan passkey"
              required
            />

            <button
              type="submit"
              className={
                "login" +
                (pressed ? " isPressed" : "") +
                (loading ? " isLoading" : "")
              }
              onPointerDown={pressNow}
              onClick={pressNow}
              disabled={loading}
            >
              <span className="btnInner">
                <span className="btnIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="currentColor"
                      d="M10 17l1.41-1.41L8.83 13H20v-2H8.83l2.58-2.59L10 7l-7 7 7 7z"
                    />
                  </svg>
                </span>
                <span className="btnText">{loading ? "Checking..." : "Login"}</span>
              </span>

              {/* visible spinner ring when loading */}
              <span className="spinner" aria-hidden="true" />

              {/* pulse overlay */}
              <span className="btnPulse" aria-hidden="true" />
            </button>

            <a
              className="tg"
              href="https://t.me/VibesTheApp"
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram"
              title="Telegram"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M9.04 15.92l-.39 5.52c.56 0 .8-.24 1.09-.53l2.61-2.5 5.41 3.95c.99.55 1.69.26 1.95-.91L23.3 3.58c.33-1.47-.53-2.05-1.49-1.69L1.66 9.67c-1.43.55-1.41 1.33-.25 1.69l5.17 1.61L18.6 5.64c.57-.35 1.09-.16.66.2L9.04 15.92z"
                />
              </svg>
            </a>

            {err && <div className="err">ERROR: {err}</div>}

            <div className="dev" aria-hidden="true">
              {maskedDevice}
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .bg {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: url('/login-bg.png') center / cover no-repeat;
        }

        .sheet {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          backdrop-filter: none !important;
        }

        .stack {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        /* 75% WIDTH */
        .passkey,
        .login {
          width: min(270px, 65vw);
        }

        .passkey {
          height: 44px;
          border-radius: 10px;
          border: 1px solid #ccc;
          padding: 0 14px;
          font-size: 16px;
        }

        .login {
          position: relative;
          overflow: hidden;
          height: 48px;
          border-radius: 10px;
          border: none;
          background: #28a745;
          color: white;
          font-weight: 800;
          cursor: pointer;

          box-shadow: 0 12px 26px rgba(0,0,0,.25);
          transition: transform 140ms ease, filter 140ms ease, box-shadow 160ms ease;
        }

        /* pressed feedback ALWAYS (even if click is fast) */
        .login.isPressed,
        .login:active {
          transform: translateY(2px) scale(0.985);
          filter: brightness(0.95);
          box-shadow: 0 6px 14px rgba(0,0,0,.22);
        }

        .login:disabled {
          opacity: 0.82;
          cursor: not-allowed;
        }

        .btnInner{
          position: relative;
          z-index: 3;
          height: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .btnIcon{ display:inline-flex; align-items:center; justify-content:center; }
        .btnText{ letter-spacing: .02em; }

        /* spinner on the right when loading */
        .spinner{
          position:absolute;
          right: 12px;
          top: 50%;
          width: 16px;
          height: 16px;
          margin-top: -8px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: rgba(255,255,255,1);
          opacity: 0;
          z-index: 4;
        }
        .login.isLoading .spinner{
          opacity: 1;
          animation: spin 800ms linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* subtle pulse overlay when loading */
        .btnPulse{
          position: absolute;
          inset: 0;
          z-index: 2;
          opacity: 0;
          background: radial-gradient(60% 120% at 50% 50%, rgba(255,255,255,.22), rgba(255,255,255,0));
          transform: scale(0.98);
        }
        .login.isLoading .btnPulse{
          opacity: 1;
          animation: pulse 900ms ease-in-out infinite;
        }
        @keyframes pulse{
          0%{ transform: scale(0.98); opacity: .45; }
          50%{ transform: scale(1.02); opacity: .8; }
          100%{ transform: scale(0.98); opacity: .45; }
        }

        .tg {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #2AABEE;
          color: white;
          text-decoration: none;
          transition: transform 110ms ease, filter 110ms ease;
        }
        .tg:active{
          transform: translateY(2px) scale(0.985);
          filter: brightness(0.96);
        }

        .err {
          color: white;
          background: #b91c1c;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .dev{ display:none; }
      `}</style>
    </div>
  );
}
