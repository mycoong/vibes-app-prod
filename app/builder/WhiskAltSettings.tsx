"use client";

import { useEffect, useMemo, useState } from "react";

type WhiskAltConfig = {
  whiskProjectId: string;
  tool: "BACKBONE" | "WHISK";
};

const LS_KEY = "YOSO_WHISK_ALT";

function safeParse<T>(s: string | null, fallback: T): T {
  try {
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export default function WhiskAltSettings() {
  const [cfg, setCfg] = useState<WhiskAltConfig>({
    whiskProjectId: "",
    tool: "BACKBONE",
  });

  useEffect(() => {
    const saved = safeParse<WhiskAltConfig>(localStorage.getItem(LS_KEY), {
      whiskProjectId: "",
      tool: "BACKBONE",
    });
    setCfg(saved);
  }, []);

  const whiskUrl = useMemo(() => {
    const id = (cfg.whiskProjectId || "").trim();
    if (!id) return "";
    return `https://labs.google/fx/tools/whisk/project/${encodeURIComponent(id)}`;
  }, [cfg.whiskProjectId]);

  const save = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    alert("Whisk alternatif disimpan.");
  };

  const openWhisk = () => {
    if (!whiskUrl) return;
    window.open(whiskUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="border border-zinc-700 rounded p-4 space-y-3">
      <div className="text-sm font-bold">Whisk (Alternatif Generate Gambar)</div>

      <div className="space-y-2">
        <label className="text-xs text-zinc-300">Whisk Project ID (UUID)</label>
        <input
          className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
          placeholder="contoh: 4744f172-271c-4158-a910-8ec84dd522f8"
          value={cfg.whiskProjectId}
          onChange={(e) => setCfg((p) => ({ ...p, whiskProjectId: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-zinc-300">Tool</label>
        <select
          className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
          value={cfg.tool}
          onChange={(e) => setCfg((p) => ({ ...p, tool: e.target.value as any }))}
        >
          <option value="BACKBONE">BACKBONE</option>
          <option value="WHISK">WHISK</option>
        </select>
      </div>

      <div className="text-xs text-zinc-400 break-all">Link: {whiskUrl || "-"}</div>

      <div className="flex gap-2">
        <button className="bg-blue-600 px-3 py-2 rounded text-sm" onClick={save}>
          Save
        </button>
        <button
          className={`px-3 py-2 rounded text-sm ${whiskUrl ? "bg-zinc-800" : "bg-zinc-900 opacity-50"}`}
          onClick={openWhisk}
          disabled={!whiskUrl}
        >
          Open Whisk
        </button>
      </div>
    </div>
  );
}
