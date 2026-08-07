"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, isAdSenseConfigured } from "@/lib/ads";

/**
 * Bannière 300x600 pour les utilisateurs FREE — web uniquement.
 * Pas d'équivalent natif : AdMob n'a pas de format "sidebar", et AdSense est
 * interdit en app mobile (voir AdBanner.tsx) — sur Capacitor natif, la
 * bannière AdMob (AdMobBanner, montée par AdBanner) est la seule pub visible.
 * Même correctif que AdBanner : DOM réel via createElement, pas
 * dangerouslySetInnerHTML (les <script> injectés via innerHTML ne s'exécutent
 * jamais dans un navigateur).
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

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) return; // pas d'équivalent AdMob sidebar

      if (!isAdSenseConfigured() || !containerRef.current) return;

      loaded.current = true;

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      script.crossOrigin = "anonymous";

      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "inline-block";
      ins.style.width = "300px";
      ins.style.height = "600px";
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
    <aside className="ad-sidebar">
      <div ref={containerRef} className="ad-sidebar__container" />
    </aside>
  );
}
