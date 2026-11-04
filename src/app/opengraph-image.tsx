import { ImageResponse } from "next/og";

export const alt = "NeeLine: all of history on one line";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          backgroundColor: "#0b0714",
          backgroundImage: "radial-gradient(900px 500px at 15% -10%, rgba(139,92,246,0.35), transparent 60%), radial-gradient(800px 460px at 88% 6%, rgba(201,168,76,0.28), transparent 60%)",
          color: "#f5f0e8",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34, color: "#c9a84c", letterSpacing: 1 }}>NeeLine</div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 18, lineHeight: 1.05 }}>All of history, on one line.</div>
        <div style={{ display: "flex", alignItems: "center", width: "100%", marginTop: 70 }}>
          <div style={{ height: 6, flex: 1, borderRadius: 3, background: "linear-gradient(90deg, #8b5cf6, #c9a84c 56%, #e9a23b)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 28, marginTop: 18, color: "#b8b2a7" }}>
          <span>3200 BCE</span>
          <span style={{ color: "#ef4444", fontWeight: 700 }}>0</span>
          <span>Today</span>
        </div>
      </div>
    ),
    size,
  );
}
