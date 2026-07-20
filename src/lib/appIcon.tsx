import { ImageResponse } from "next/og";

/** Icône partagée par icon.tsx et les routes PWA — carré noir + coche, identité du produit. */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          borderRadius: size * 0.2,
        }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5 6.5 12 13 4.5" stroke="#e8b93c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
