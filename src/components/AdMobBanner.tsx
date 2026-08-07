"use client";

import { useEffect, useRef } from "react";
import { ADMOB_ANDROID_BANNER_UNIT_ID, ADMOB_IOS_BANNER_UNIT_ID } from "@/lib/ads";

/**
 * Bannière AdMob native — remplace AdBanner (AdSense) uniquement dans l'app
 * Capacitor. Ne rend rien sur le web classique (voir AdBanner.tsx). AdMob
 * dessine sa bannière dans une vue native superposée à la webview (pas dans
 * le DOM) : ce composant ne fait que piloter show/hide, un <div> vide sert
 * juste à réserver l'espace visuel dans le layout pour éviter que le contenu
 * web passe sous la bannière native.
 */
export function AdMobBanner({ showAds }: { showAds: boolean }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!showAds) return;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { AdMob, BannerAdPosition, BannerAdSize } = await import("@capacitor-community/admob");

      if (!initialized.current) {
        await AdMob.initialize({ initializeForTesting: process.env.NODE_ENV !== "production" });
        initialized.current = true;
      }

      const adId = Capacitor.getPlatform() === "ios" ? ADMOB_IOS_BANNER_UNIT_ID : ADMOB_ANDROID_BANNER_UNIT_ID;

      await AdMob.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.TOP_CENTER,
        isTesting: process.env.NODE_ENV !== "production",
      });
    })();

    return () => {
      (async () => {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { AdMob } = await import("@capacitor-community/admob");
        await AdMob.hideBanner().catch(() => {});
      })();
    };
  }, [showAds]);

  return null;
}
