import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Image Docker minimale (PLAN.md §9)
  output: "standalone",
  // Le repo parent contient aussi un lockfile (worktree) — fixe la racine de tracing
  outputFileTracingRoot: path.join(__dirname),
  // Ne pas annoncer la stack (réduction de surface, OWASP A05).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HSTS : le site est 100% HTTPS derrière Cloudflare/Envoy. 2 ans,
          // sous-domaines inclus. Pas de `preload` tant que la soumission à
          // hstspreload.org n'est pas faite volontairement (irréversible à court terme).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          // Clickjacking : sans ça, /app/billing peut être encadré par un site
          // tiers pour détourner un clic sur "Upgrade". SAMEORIGIN et non DENY
          // car la WebView Capacitor charge le site en top-level (compatible),
          // et Stripe redirige au lieu d'iframer.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Ne fuite pas le chemin complet (ex. /recap/<userId>/…) vers les tiers.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // CSP en Report-Only d'abord : une CSP bloquante posée à l'aveugle
          // casserait AdSense (qui charge des scripts depuis un ensemble de
          // domaines mouvant et injecte des styles inline). En Report-Only,
          // le navigateur signale les violations SANS rien bloquer — on
          // observe le trafic réel une fois les pubs activées, puis on
          // bascule sur `Content-Security-Policy` une fois la liste stabilisée.
          //
          // `unsafe-inline`/`unsafe-eval` sur script-src sont nécessaires à
          // Next (hydratation) et aux tags publicitaires ; ils restent donc
          // présents dans la cible. La valeur défensive réelle vient ici de
          // frame-ancestors, object-src et base-uri.
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://*.ingest.sentry.io",
              "frame-src https://*.googlesyndication.com https://*.doubleclick.net https://js.stripe.com",
              // Doublon volontaire de X-Frame-Options : frame-ancestors est la
              // directive moderne, X-Frame-Options couvre les vieux navigateurs.
              "frame-ancestors 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
            ].join("; "),
          },
        ],
      },
      {
        // Les réponses authentifiées ne doivent jamais finir dans un cache
        // partagé (proxy, CDN) : elles contiennent les données d'un seul user.
        source: "/api/export",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry source map upload — no-op when SENTRY_AUTH_TOKEN is absent
  silent: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
