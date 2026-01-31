"use client";

import React, { useEffect, useMemo, useState } from "react";

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

const LS_VOICE = "YOSO_VOICE_PREF";
type VoicePref = "female" | "male";

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

function readVoicePref(): VoicePref {
  try {
    const v = String(localStorage.getItem(LS_VOICE) || "").toLowerCase();
    return v === "male" ? "male" : "female";
  } catch {
    return "female";
  }
}

function writeVoicePref(v: VoicePref) {
  try {
    localStorage.setItem(LS_VOICE, v);
  } catch {
    // ignore
  }
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
  const [voice, setVoice] = useState<VoicePref>("female");

  useEffect(() => {
    setVoice(readVoicePref());
  }, []);

  function onPickVoice(v: VoicePref) {
    setVoice(v);
    writeVoicePref(v);
  }

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
            <div className="ga-voice" aria-label="Voice selection">
              <div className="ga-voiceLabel">VOICE</div>
              <div className="ga-seg">
                <button
                  type="button"
                  className={`ga-chip ${voice === "female" ? "active" : ""}`}
                  onClick={() => onPickVoice("female")}
                >
                  FEMALE
                </button>
                <button
                  type="button"
                  className={`ga-chip ${voice === "male" ? "active" : ""}`}
                  onClick={() => onPickVoice("male")}
                >
                  MALE
                </button>
              </div>
            </div>

            <button
              className="ga-btn ga-btnPrimary"
              onClick={() => {
                // store voice pref so the API caller can read it (AppClient)
                writeVoicePref(voice);
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
          transform: rotate(-1.2deg) translateY(8px);
          opacity: 0.7;
        }
        .ga-polaroid::after {
          transform: rotate(0.9deg) translateY(16px);
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
          font-size: 14px;
          font-weight: 1000;
          letter-spacing: 0.6px;
          color: rgba(0, 0, 0, 0.82);
        }
        .ga-sub {
          margin-top: 2px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.62);
          font-weight: 700;
        }

        .ga-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }

        .ga-voice {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 16px;
          border: 3px solid rgba(0, 0, 0, 0.9);
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 6px 0 rgba(0, 0, 0, 0.9);
        }

        .ga-voiceLabel {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.6px;
          color: rgba(0, 0, 0, 0.7);
        }

        .ga-seg {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .ga-chip {
          border-radius: 14px;
          padding: 8px 12px;
          font-weight: 1000;
          letter-spacing: 0.6px;
          border: 3px solid rgba(0, 0, 0, 0.9);
          background: rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.85);
          cursor: pointer;
          user-select: none;
          box-shadow: 0 6px 0 rgba(0, 0, 0, 0.9);
          text-transform: uppercase;
          font-size: 11px;
          line-height: 1;
        }

        .ga-chip:active {
          transform: translateY(2px);
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.9);
        }

        .ga-chip.active {
          background: #ffd84a;
        }

        .ga-btn {
          border-radius: 16px;
          padding: 10px 16px;
          font-weight: 1000;
          cursor: pointer;
          user-select: none;
          border: 4px solid rgba(0, 0, 0, 0.9);
          box-shadow: 0 7px 0 rgba(0, 0, 0, 0.9);
          letter-spacing: 0.4px;
          text-transform: uppercase;
          font-size: 12px;
        }

        .ga-btn:active {
          transform: translateY(2px);
          box-shadow: 0 5px 0 rgba(0, 0, 0, 0.9);
        }

        .ga-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .ga-btnPrimary {
          background: #ffffff;
        }

        .ga-btnPlay {
          background: rgba(0, 0, 0, 0.08);
        }

        .ga-btnGhost {
          background: rgba(0, 0, 0, 0.06);
        }

        .ga-card {
          margin-top: 12px;
          border-radius: 18px;
          border: 4px solid rgba(0, 0, 0, 0.9);
          background: rgba(8, 25, 52, 0.92);
          box-shadow: 0 8px 0 rgba(0, 0, 0, 0.9);
          overflow: hidden;
        }

        .ga-textarea {
          width: 100%;
          min-height: 150px;
          padding: 14px;
          border: none;
          outline: none;
          resize: vertical;
          background: transparent;
          color: rgba(255, 255, 255, 0.96);
          font-size: 14px;
          font-weight: 650;
          line-height: 1.5;
        }

        .ga-error {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 16px;
          border: 3px solid rgba(210, 30, 30, 0.75);
          background: rgba(255, 220, 220, 0.9);
          color: rgba(120, 0, 0, 0.9);
          font-weight: 900;
          font-size: 12px;
        }

        .ga-preview {
          margin-top: 12px;
        }

        .ga-previewEmpty {
          padding: 12px;
          border-radius: 16px;
          border: 3px dashed rgba(0, 0, 0, 0.35);
          background: rgba(0, 0, 0, 0.03);
          color: rgba(0, 0, 0, 0.55);
          font-weight: 800;
          font-size: 12px;
        }

        @media (max-width: 520px) {
          .ga-actions {
            justify-content: flex-start;
          }
          .ga-btn {
            padding: 10px 14px;
          }
          .ga-textarea {
            min-height: 140px;
            font-size: 13px;
          }
        }
      `}</style>
    </section>
  );
}
