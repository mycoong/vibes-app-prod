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
    <div className="bg">
      <div className="outer">
        <div className="sheet">
          <form onSubmit={onSubmit} className="stack">
            <input
              className="passkey"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="Masukkan Liesnsi"
              required
            />

            <button className="login" disabled={loading}>
              LOGIN
            </button>

            <a
              className="tg"
              href="https://t.me/VibesTheApp"
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M9.04 15.92l-.39 5.52c.56 0 .8-.24 1.09-.53l2.61-2.5 5.41 3.95c.99.55 1.69.26 1.95-.91L23.3 3.58c.33-1.47-.53-2.05-1.49-1.69L1.66 9.67c-1.43.55-1.41 1.33-.25 1.69l5.17 1.61L18.6 5.64c.57-.35 1.09-.16.66.2L9.04 15.92z"
                />
              </svg>
            </a>

            {err && <div className="err">ERROR: {err}</div>}
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
          height: 48px;
          border-radius: 10px;
          border: none;
          background: #28a745;
          color: white;
          font-weight: 700;
          cursor: pointer;
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
        }

        .err {
          color: white;
          background: #b91c1c;
          padding: 8px 12px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
