"use client";

import React, { useMemo } from "react";

type Props = {
  scriptText: string;
  setScriptText: (v: string) => void;

  onGenerateAudio: (text: string) => Promise<void> | void;

  audioUrl?: string | null;
  isGenerating?: boolean;
  errorText?: string | null;

  onDownloadAudio?: () => void;

  onTogglePlay?: () => void;
  isPlaying?: boolean;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
};

function cleanScript(input: string) {
  const s = (input || "").replace(/\r\n/g, "\n");
  return s
    .split("\n")
    .map((raw) => {
      const line = raw.trim();
      // Remove accidental labels like "SCENE 1:" / "Scene-2 -"
      return line
        .replace(/^(scene|sc)\s*([#\-–—]?\s*)?\d+\s*([:\-–—]\s*)/i, "")
        .replace(/^(scene|sc)\s*([#\-–—]?\s*)?\d+\s*/i, "")
        .replace(/^\d+\s*([:\-–—]\s*)/i, "")
        .trim();
    })
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function GlobalAudioPanel({
  scriptText,
  setScriptText,
  onGenerateAudio,
  audioUrl,
  isGenerating = false,
  errorText = null,
  onDownloadAudio,
  onTogglePlay,
  isPlaying = false,
  audioRef,
}: Props) {
  const cleanedText = useMemo(() => cleanScript(scriptText), [scriptText]);

  return (
    <section className="ga-wrap">
      <div className="ga-polaroid">
        <div className="ga-pin" aria-hidden="true" />

        <div className="ga-top">
          <div className="ga-title">
            <div className="ga-titleText">GLOBAL AUDIO</div>
            <div className="ga-sub">1 video = 1 naskah = 1 audio (bukan per panel)</div>
          </div>

          <div className="ga-actions">
            <button
              className="ga-btn ga-btnPrimary"
              onClick={() => {
                const next = cleanScript(cleanedText);
                if (next !== scriptText) setScriptText(next);
                onGenerateAudio(next);
              }}
              disabled={isGenerating || !cleanedText.trim()}
              title={!cleanedText.trim() ? "Isi naskah dulu" : "Generate audio dari naskah"}
            >
              🎤 GENERATE AUDIO
            </button>

            <button
              className="ga-btn ga-btnPlay"
              onClick={onTogglePlay}
              disabled={!audioUrl || !onTogglePlay}
              title={!audioUrl ? "Belum ada audio" : isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
            </button>

            <button
              className="ga-btn ga-btnGhost"
              onClick={onDownloadAudio}
              disabled={!audioUrl || !onDownloadAudio}
              title={!audioUrl ? "Belum ada audio" : "Download audio"}
            >
              ⬇ DOWNLOAD
            </button>
          </div>
        </div>

        <div className="ga-card">
          <textarea
            className="ga-textarea"
            value={cleanedText}
            onChange={(e) => setScriptText(cleanScript(e.target.value))}
            placeholder="Tempel / tulis naskah inti di sini… (tanpa SCENE)"
            spellCheck={false}
          />
        </div>

        {errorText ? <div className="ga-error">{errorText}</div> : null}

        <div className="ga-preview">
          {audioUrl ? (
            <audio ref={audioRef as any} controls src={audioUrl} style={{ width: "100%" }} />
          ) : (
            <div className="ga-previewEmpty">Belum ada audio. Klik “GENERATE AUDIO”.</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .ga-wrap {
          width: 100%;
          margin: 14px 0 18px 0;
        }

        .ga-polaroid {
          position: relative;
          width: 100%;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.92);
          border: 4px solid rgba(0, 0, 0, 0.9);
          box-shadow: 0 8px 0 rgba(0, 0, 0, 0.9);
          padding: 14px;
          overflow: hidden;
        }

        .ga-polaroid::before,
        .ga-polaroid::after {
          content: "";
          position: absolute;
          left: 16px;
          right: 16px;
          top: 10px;
          bottom: 10px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.62);
          border: 2px solid rgba(0, 0, 0, 0.25);
          z-index: -1;
        }
        .ga-polaroid::before {
          transform: rotate(-1.4deg) translateY(8px);
          opacity: 0.7;
        }
        .ga-polaroid::after {
          transform: rotate(1deg) translateY(16px);
          opacity: 0.55;
        }

        .ga-pin {
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
        .ga-pin::after {
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

        .ga-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 12px;
        }

        .ga-titleText {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.5px;
          opacity: 0.65;
        }
        .ga-sub {
          margin-top: 2px;
          font-size: 12px;
          opacity: 0.6;
          font-weight: 600;
        }

        .ga-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .ga-btn {
          border-radius: 16px;
          padding: 10px 16px;
          font-weight: 900;
          cursor: pointer;
          user-select: none;
          border: 3px solid rgba(0, 0, 0, 0.9);
          background: #fff;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.9);
        }
        .ga-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }
        .ga-btnPrimary {
          background: #ffffff;
        }
        .ga-btnPlay {
          background: rgba(0, 0, 0, 0.04);
          border-color: rgba(0, 0, 0, 0.55);
          box-shadow: none;
        }
        .ga-btnGhost {
          border-color: rgba(0, 0, 0, 0.25);
          box-shadow: none;
          background: rgba(0, 0, 0, 0.04);
        }

        .ga-card {
          margin-top: 12px;
          border-radius: 18px;
          border: 3px solid rgba(0, 0, 0, 0.9);
          background: #0b2545;
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.06);
          padding: 14px;
        }

        .ga-textarea {
          width: 100%;
          min-height: 180px;
          resize: vertical;
          border: none;
          outline: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.96);

          font-family: inherit;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.55;
          letter-spacing: 0.1px;

          white-space: pre-wrap;
        }
        .ga-textarea::placeholder {
          color: rgba(255, 255, 255, 0.55);
          font-weight: 600;
        }

        .ga-error {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 2px solid rgba(255, 80, 80, 0.55);
          background: rgba(255, 80, 80, 0.12);
          font-weight: 700;
        }

        .ga-preview {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 16px;
          border: 2px dashed rgba(0, 0, 0, 0.22);
          background: rgba(0, 0, 0, 0.03);
        }
        .ga-previewEmpty {
          font-size: 12px;
          font-weight: 700;
          opacity: 0.6;
        }
      `}</style>
    </section>
  );
}
