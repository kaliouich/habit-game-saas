"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker — sur le WEB uniquement.
 *
 * Dans l'app Capacitor, il n'apporte rien (l'app est déjà « installée », et
 * la coque native gère son propre cycle de vie) mais ajoute une couche
 * d'interception sur chaque navigation. Il a déjà causé un bug réel en
 * mettant en cache les réponses de /api/auth/*, et il complique le diagnostic
 * de tout problème de navigation dans la WebView. Coût nul à le désactiver,
 * bénéfice réel en fiabilité.
 *
 * Un service worker déjà enregistré par une version précédente de l'app est
 * désinscrit explicitement : il survit aux mises à jour d'APK (les données de
 * la WebView ne sont pas effacées par une réinstallation), donc ne plus
 * l'enregistrer ne suffirait pas à s'en débarrasser.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");

      if (Capacitor.isNativePlatform()) {
        const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
        await Promise.all(registrations.map((r) => r.unregister().catch(() => false)));
        // Purge aussi les réponses déjà stockées par l'ancien worker.
        if ("caches" in window) {
          const keys = await caches.keys().catch(() => [] as string[]);
          await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
        }
        return;
      }

      navigator.serviceWorker.register("/sw.js").catch(() => {
        // installabilité PWA dégradée, mais non bloquante
      });
    })();
  }, []);

  return null;
}
