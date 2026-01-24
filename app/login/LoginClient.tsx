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
              placeholder="WW-XXXX-XXXX"
              required
            />
          </div>

          <button disabled={loading}>
            {loading ? "CHECKING..." : "LOGIN"}
          </button>

          <div className="device">
            Device: <span>{maskedDevice || "..."}</span>
          </div>

          {err && <div className="error">ERROR: {err}</div>}
        </form>
      </div>

      <style>{`
        .wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(1200px 800px at 20% 0%, #0b1b3a 0%, #060a14 60%, #050712 100%);
          padding: 20px;
          font-family: ui-rounded, "Comic Sans MS", "Trebuchet MS", system-ui, sans-serif;
        }

        .card {
          background: #fff;
          border: 4px solid #000;
          border-radius: 26px;
          padding: 26px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 20px 60px rgba(0,0,0,.45);
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .brand {
          text-align: center;
        }

        .logo {
          height: 140px;
          margin: 0 auto 10px;
          display: block;
          filter: drop-shadow(0 10px 0 #000);
        }

        .slogan {
          font-weight: 1000;
          font-size: 13px;
          letter-spacing: 0.12em;
          opacity: 0.85;
          text-transform: uppercase;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        label {
          font-weight: 1000;
          font-size: 12px;
          text-transform: uppercase;
        }

        input {
          padding: 14px;
          border-radius: 18px;
          border: 4px solid #000;
          font-weight: 900;
          font-size: 14px;
          outline: none;
          background: #f8fafc;
          box-shadow: 0 8px 0 rgba(0,0,0,.15);
        }

        button {
          padding: 16px;
          border-radius: 20px;
          border: 4px solid #000;
          background: #ffd84a;
          font-weight: 1000;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 10px 0 #000;
        }

        button:active {
          transform: translateY(3px);
          box-shadow: 0 7px 0 #000;
        }

        button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .device {
          font-size: 12px;
          font-weight: 900;
          opacity: 0.8;
        }

        .error {
          background: #fee2e2;
          border: 3px solid #000;
          border-radius: 16px;
          padding: 10px;
          font-weight: 900;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}