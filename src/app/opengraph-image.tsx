import { ImageResponse } from "next/og";

export const alt = "NeeLine: history on a number line";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#070c16", color: "#f5f0e8" }}>
        <div style={{ fontSize: 40, color: "#c9a84c", fontWeight: 600 }}>NeeLine</div>
        <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>History on a number line</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 64 }}>
          <div style={{ height: 6, flex: 1, background: "#c9a84c", borderRadius: 3 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, marginTop: 20, color: "#b8b2a7" }}>
          <span>3200 BCE</span>
          <span style={{ color: "#ef4444", fontWeight: 700 }}>0</span>
          <span>2026 CE</span>
        </div>
      </div>
    ),
    size,
  );
}
