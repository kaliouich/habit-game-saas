"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, isAdSenseConfigured } from "@/lib/ads";
import { AdMobBanner } from "@/components/AdMobBanner";

/**
 * Bannière 728x90 pour les utilisateurs FREE.
 * - App native (Capacitor) → AdMob (voir AdMobBanner) ; AdSense y est interdit
 *   par la policy Google (pub tierce dans une app mobile = bannissement).
 * - Web → AdSense, chargé via de vrais éléments DOM (`document.createElement`),
 *   pas `dangerouslySetInnerHTML` : les <script> injectés via innerHTML ne
 *   s'exécutent jamais dans un navigateur, le tag adsbygoogle ne se serait
 *   donc jamais réellement chargé avec l'ancienne implémentation.
 */
interface AdBannerProps {
  showAds: boolean;
  slot?: string;
}

export function AdBanner({ showAds, slot = "0000000000" }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!showAds || loaded.current) return;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) return; // AdMobBanner s'en charge

      if (!isAdSenseConfigured() || !containerRef.current) return;

      loaded.current = true;

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      script.crossOrigin = "anonymous";

      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "inline-block";
      ins.style.width = "728px";
      ins.style.height = "90px";
      ins.setAttribute("data-ad-client", ADSENSE_CLIENT);
      ins.setAttribute("data-ad-slot", slot);

      containerRef.current.appendChild(ins);
      containerRef.current.appendChild(script);

      script.onload = () => {
        try {
          (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
            (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || [];
          (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle.push({});
        } catch {
          // AdSense pas encore prêt — non bloquant
        }
      };
    })();
  }, [showAds, slot]);

  if (!showAds) return null;

  return (
    <div className="ad-banner">
      <AdMobBanner showAds={showAds} />
      <div ref={containerRef} className="ad-banner__container" />
    </div>
  );
}
