"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, isAdSenseConfigured, loadAdSenseScript, pushAdSlot } from "@/lib/ads";
import { AdMobBanner } from "@/components/AdMobBanner";

/**
 * Bannière 728x90 pour les utilisateurs FREE.
 * - App native (Capacitor) → AdMob (voir AdMobBanner) ; AdSense y est interdit
 *   par la policy Google (pub tierce dans une app mobile = bannissement).
 * - Web → AdSense, chargé via de vrais éléments DOM (`document.createElement`),
 *   pas `dangerouslySetInnerHTML` : les <script> injectés via innerHTML ne
 *   s'exécutent jamais dans un navigateur, le tag adsbygoogle ne se serait
 *   donc jamais réellement chargé avec l'implémentation d'origine.
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

    let cancelled = false;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) return; // AdMobBanner s'en charge
      if (!isAdSenseConfigured() || !containerRef.current || cancelled) return;

      loaded.current = true;

      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      // Format responsive plutôt qu'un 728x90 figé : sur un téléphone de
      // 360px de large, une largeur fixe de 728px déborde et fait scroller
      // toute la page horizontalement.
      ins.style.display = "block";
      ins.style.width = "100%";
      ins.setAttribute("data-ad-client", ADSENSE_CLIENT);
      ins.setAttribute("data-ad-slot", slot);
      ins.setAttribute("data-ad-format", "horizontal");
      ins.setAttribute("data-full-width-responsive", "true");
      containerRef.current.appendChild(ins);

      try {
        await loadAdSenseScript();
        if (!cancelled) pushAdSlot();
      } catch {
        // Bloqueur de pub ou réseau coupé : l'emplacement reste vide, sans
        // casser le dashboard. Rien à signaler à l'utilisateur.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showAds, slot]);

  if (!showAds) return null;

  return (
    <div className="ad-banner">
      <AdMobBanner showAds={showAds} />
      <div ref={containerRef} className="ad-banner__container" />
    </div>
  );
}
