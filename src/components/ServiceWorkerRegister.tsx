"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker — web ET app native désormais.
 *
 * Désactivé pour la coque Capacitor le 10 août (commit 6582077) après un bug
 * réel : le worker mettait en cache /api/auth/callback/google, rejouant une
 * réponse d'auth à usage unique. Ce correctif-là est resté côté serveur
 * (isBypassed() dans sw.js exclut tout /api/* de l'interception — structurel,
 * jamais régressé depuis) ; l'autre moitié du bug de l'époque (cookies tiers
 * bloqués par la WebView Android) est sans rapport avec le service worker et
 * est réglée côté natif (MainActivity.setAcceptThirdPartyCookies). Le
 * désactiver entièrement était alors la prudence la plus sûre en attendant
 * de confirmer les deux correctifs en même temps — mais sans lui, l'app
 * native n'offre aucun mode hors-ligne, ce qui est maintenant demandé
 * explicitement. Le réactiver ne touche pas à /api/*, donc ne réintroduit
 * pas le bug d'origine.
 *
 * Un service worker survit aux mises à jour d'APK (réinstaller n'efface pas
 * les données de la WebView) — rien à désinscrire ici, au contraire de la
 * version précédente de ce composant.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // installabilité PWA / cache hors-ligne dégradés, mais non bloquants
    });
  }, []);

  return null;
}
