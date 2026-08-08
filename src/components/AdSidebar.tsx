"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, isAdSenseConfigured, loadAdSenseScript, pushAdSlot } from "@/lib/ads";

/**
 * Bannière 300x600 pour les utilisateurs FREE — web uniquement.
 * Pas d'équivalent natif : AdMob n'a pas de format "sidebar", et AdSense est
 * interdit en app mobile (voir AdBanner.tsx) — sur Capacitor natif, la
 * bannière AdMob (montée par AdBanner) est la seule pub visible.
 */
interface AdSidebarProps {
  showAds: boolean;
  slot?: string;
}

export function AdSidebar({ showAds, slot = "0000000001" }: AdSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!showAds || loaded.current) return;

    let cancelled = false;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) return; // pas d'équivalent AdMob sidebar
      if (!isAdSenseConfigured() || !containerRef.current || cancelled) return;

      loaded.current = true;

      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      // Largeur fluide bornée par le conteneur (la colonne de stats fait 300px
      // sur desktop) — pas de dimension figée qui déborderait ailleurs.
      ins.style.display = "block";
      ins.style.width = "100%";
      ins.setAttribute("data-ad-client", ADSENSE_CLIENT);
      ins.setAttribute("data-ad-slot", slot);
      ins.setAttribute("data-ad-format", "vertical");
      containerRef.current.appendChild(ins);

      try {
        await loadAdSenseScript();
        if (!cancelled) pushAdSlot();
      } catch {
        // Bloqueur de pub ou réseau coupé : emplacement vide, dashboard intact.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showAds, slot]);

  if (!showAds) return null;

  return (
    <aside className="ad-sidebar">
      <div ref={containerRef} className="ad-sidebar__container" />
    </aside>
  );
}
