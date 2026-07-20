import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/config";

export const alt = `${APP_NAME} — rebuild your consistency`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          background: "#f4f4f2",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#111111",
            color: "#fff",
            fontSize: 22,
            fontWeight: 600,
            padding: "10px 22px",
            borderRadius: 30,
            marginBottom: 36,
          }}
        >
          🎯 Rebuild your consistency
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "#111111" }}>{APP_NAME}</div>
        <div style={{ display: "flex", fontSize: 28, color: "#6b6b68", marginTop: 20 }}>
          The habit tracker that feels like a premium spreadsheet
        </div>
      </div>
    ),
    { ...size },
  );
}
