import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "NeeLine: all of history on one line";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "brand", "og-mark.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

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
          padding: 70,
          backgroundColor: "#000000",
          backgroundImage: "radial-gradient(900px 500px at 15% -10%, rgba(255,255,255,0.06), transparent 60%)",
          color: "#f5f0e8",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 180,
              height: 180,
              borderRadius: 40,
              border: "2px solid rgba(212,175,55,0.45)",
              backgroundColor: "#000000",
              boxShadow: "0 8px 30px -8px rgba(233,189,80,0.45)",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={176} height={176} alt="" style={{ borderRadius: 38 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
            <div style={{ fontSize: 40, color: "#d4af37", letterSpacing: 1 }}>NeeLine</div>
            <div style={{ fontSize: 76, fontWeight: 700, marginTop: 6, lineHeight: 1.05 }}>All of history, on one line.</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", width: "100%", marginTop: 70 }}>
          <div style={{ height: 6, flex: 1, borderRadius: 3, background: "linear-gradient(90deg, #9a7420, #d4af37 56%, #f0cf7e)" }} />
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
