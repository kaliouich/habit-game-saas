"use client";

import { useEffect } from "react";

/**
 * Pont de session Google natif (Custom Tabs → WebView) — voir MOBILE_SETUP.md.
 * Écoute le deep link habitgame://auth-callback?code=… déposé par
 * /api/auth/mobile/bridge après un login Google réussi dans le Custom Tab,
 * échange ce code contre une vraie session depuis la WebView elle-même (seul
 * endroit où le Set-Cookie de la réponse atterrit dans le bon jar de cookies),
 * puis force un rechargement complet pour que ce cookie soit bien présent sur
 * la requête suivante — natif uniquement, no-op sur le web.
 */
export function MobileAuthBridgeListener() {
  useEffect(() => {
    let handle: { remove: () => void } | undefined;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { App } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      handle = await App.addListener("appUrlOpen", async ({ url }) => {
        let parsed: URL;
        try {
          parsed = new URL(url);
        } catch {
          return;
        }
        if (parsed.protocol !== "habitgame:" || parsed.host !== "auth-callback") return;

        const code = parsed.searchParams.get("code");
        if (!code) return;

        await Browser.close().catch(() => {});

        const res = await fetch("/api/auth/mobile/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }).catch(() => null);

        window.location.href = res?.ok ? "/app" : "/login?error=MobileExchangeFailed";
      });
    })();

    return () => handle?.remove();
  }, []);

  return null;
}
