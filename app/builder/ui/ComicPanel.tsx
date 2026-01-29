
"use client";

export default function ComicPanel({ index, scene }: { index: number; scene: any }) {
  return (
    <div className="comic-card">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div className="comic-badge">#{index}</div>
        <button className="btn-voice">🎤 GENERATE SUARA</button>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginTop:"12px"}}>
        <div>
          <div className="comic-img">Preview A</div>
          <div className="label-setup" style={{marginTop:"6px"}}>A: SETUP</div>
        </div>
        <div>
          <div className="comic-img">Preview B</div>
          <div className="label-klimaks" style={{marginTop:"6px"}}>B: KLIMAKS</div>
        </div>
      </div>

      <div className="comic-narrative">
        “{scene?.narrative || "Narrative belum tersedia"}”
      </div>
    </div>
  );
}
