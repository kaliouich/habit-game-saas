import Script from "next/script";

/** Umami self-hosted, cookie-free — no-op tant que les env vars ne sont pas configurées. */
export function Analytics() {
  const src = process.env.NEXT_PUBLIC_UMAMI_URL;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_ID;
  if (!src || !websiteId) return null;

  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
