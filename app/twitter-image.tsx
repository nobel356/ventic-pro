import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Ventic Pro - حلول التهوية والتركيب";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #071A2B 0%, #0B2F49 55%, #0A84FF 140%)",
          color: "white",
          padding: "72px 80px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#0A84FF",
              fontSize: 54,
              fontWeight: 900,
            }}
          >
            V
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 42, fontWeight: 900 }}>VENTIC PRO</span>
            <span style={{ fontSize: 22, color: "#BAE6FD" }}>Air Solutions</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.12,
              fontWeight: 900,
              maxWidth: 980,
            }}
          >
            حلول التهوية والتركيب من مكان واحد
          </div>

          <div
            style={{
              fontSize: 28,
              color: "#D7EEF9",
              maxWidth: 940,
              lineHeight: 1.5,
            }}
          >
            حمامات • مطابخ • هود • خطوط طرد • متابعة • فاتورة • ضمان
          </div>
        </div>
      </div>
    ),
    size,
  );
}
