"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const LS_ATMOS = "YOSO_REF_ATMOSPHERE_DATAURL";
const LS_SUBJECT = "YOSO_REF_IMAGE_DATAURL"; // reuse existing key for backward-compat
const LS_LIGHTING = "YOSO_REF_LIGHTING_DATAURL";

const LS_LOCK = "YOSO_MASTER_STYLE_LOCKED";
const LS_LOCK_AT = "YOSO_MASTER_STYLE_LOCKED_AT";

function readLS(key: string) {
  try {
    return String(localStorage.getItem(key) || "");
  } catch {
    return "";
  }
}

function writeLS(key: string, val: string) {
  try {
    if (!val) localStorage.removeItem(key);
    else localStorage.setItem(key, val);
  } catch {}
}

async function fileToDataURL(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read failed"));
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(file);
  });
}

function nowTs() {
  return Date.now();
}

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

type BlockKey = "atmos" | "subject" | "lighting";

export default function MasterVisualReference() {
  const [mounted, setMounted] = useState(false);

  const [atmos, setAtmos] = useState("");
  const [subject, setSubject] = useState("");
  const [lighting, setLighting] = useState("");

  const [lockAt, setLockAt] = useState<number | null>(null);

  const refInputAtmos = useRef<HTMLInputElement | null>(null);
  const refInputSubject = useRef<HTMLInputElement | null>(null);
  const refInputLighting = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const a = readLS(LS_ATMOS);
    const s = readLS(LS_SUBJECT);
    const l = readLS(LS_LIGHTING);
    setAtmos(a);
    setSubject(s);
    setLighting(l);

    const atRaw = Number(readLS(LS_LOCK_AT));
    setLockAt(Number.isFinite(atRaw) && atRaw > 0 ? atRaw : null);
  }, []);

  const locked = useMemo(() => !!(atmos || subject || lighting), [atmos, subject, lighting]);

  useEffect(() => {
    if (!mounted) return;
    // keep a simple "signal" for other parts of the app/UI
    if (locked) {
      writeLS(LS_LOCK, "1");
      const ts = nowTs();
      writeLS(LS_LOCK_AT, String(ts));
      setLockAt(ts);
    } else {
      writeLS(LS_LOCK, "");
      writeLS(LS_LOCK_AT, "");
      setLockAt(null);
    }
  }, [locked, mounted]);

  const pick = (k: BlockKey) => {
    if (k === "atmos") refInputAtmos.current?.click();
    if (k === "subject") refInputSubject.current?.click();
    if (k === "lighting") refInputLighting.current?.click();
  };

  const clear = (k: BlockKey) => {
    if (k === "atmos") { setAtmos(""); writeLS(LS_ATMOS, ""); }
    if (k === "subject") { setSubject(""); writeLS(LS_SUBJECT, ""); }
    if (k === "lighting") { setLighting(""); writeLS(LS_LIGHTING, ""); }
  };

  const onFile = async (k: BlockKey, file?: File | null) => {
    if (!file) return;
    const url = await fileToDataURL(file);
    if (k === "atmos") { setAtmos(url); writeLS(LS_ATMOS, url); }
    if (k === "subject") { setSubject(url); writeLS(LS_SUBJECT, url); }
    if (k === "lighting") { setLighting(url); writeLS(LS_LIGHTING, url); }
  };

  return (
    <div
      style={{
        margin: "12px 0 14px",
        border: "2px solid rgba(255,255,255,.08)",
        borderRadius: 16,
        padding: 12,
        background: "rgba(0,0,0,.18)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase", fontSize: 12, opacity: 0.9 }}>
            MASTER VISUAL STYLE (WHISK-LIKE)
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4, lineHeight: 1.4 }}>
            Upload sekali di awal. Ini jadi acuan gaya global untuk semua panel (A/B). <b>Subject</b> memakai key yang sama dengan REF IMAGE lama, jadi flow kamu tetap kompatibel.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.12)",
              fontSize: 12,
              fontWeight: 800,
              background: locked ? "rgba(0,255,170,.10)" : "rgba(255,255,255,.06)",
              color: locked ? "#b8ffda" : "rgba(255,255,255,.75)",
            }}
          >
            {locked ? "LOCKED ✅" : "OFF"}
          </span>
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.12)",
              fontSize: 12,
              fontWeight: 800,
              background: "rgba(255,255,255,.06)",
              color: "rgba(255,255,255,.75)",
            }}
          >
            {lockAt ? `Last: ${fmt(lockAt)}` : "Last: -"}
          </span>
        </div>
      </div>

      <div className="__mvr_grid"
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <Block
          title="Atmosphere"
          subtitle="Dunia / suasana / era"
          dataUrl={atmos}
          onPick={() => pick("atmos")}
          onClear={() => clear("atmos")}
        />
        <Block
          title="Subject"
          subtitle="Karakter / objek utama"
          dataUrl={subject}
          onPick={() => pick("subject")}
          onClear={() => clear("subject")}
        />
        <Block
          title="Lighting + Style"
          subtitle="Cahaya / tone / kamera"
          dataUrl={lighting}
          onPick={() => pick("lighting")}
          onClear={() => clear("lighting")}
        />
      </div>

      {/* hidden inputs */}
      <input
        ref={refInputAtmos}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onFile("atmos", e.target.files?.[0])}
      />
      <input
        ref={refInputSubject}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onFile("subject", e.target.files?.[0])}
      />
      <input
        ref={refInputLighting}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onFile("lighting", e.target.files?.[0])}
      />

      <style>{`
        @media (max-width: 980px) {
          .__mvr_grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Block({
  title,
  subtitle,
  dataUrl,
  onPick,
  onClear,
}: {
  title: string;
  subtitle: string;
  dataUrl: string;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(255,255,255,.04)",
        overflow: "hidden",
        minHeight: 170, // fixed-ish to prevent layout stretch
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{subtitle}</div>
      </div>

      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {dataUrl ? (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(0,0,0,.18)",
              height: 92,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ) : (
          <div
            style={{
              borderRadius: 12,
              border: "1px dashed rgba(255,255,255,.20)",
              background: "rgba(0,0,0,.12)",
              height: 92,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              opacity: 0.75,
              fontWeight: 800,
            }}
          >
            Drop / Upload Image
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onPick}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,216,74,.18)",
              color: "rgba(255,255,255,.95)",
              fontWeight: 900,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Upload
          </button>

          <button
            type="button"
            onClick={onClear}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,70,70,.12)",
              color: "rgba(255,255,255,.90)",
              fontWeight: 900,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
