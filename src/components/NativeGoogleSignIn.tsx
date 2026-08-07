"use client";

import { useEffect } from "react";

/**
 * Google rejette l'auth OAuth dans une WebView embarquée nue (erreur
 * disallowed_useragent) — dans l'app native Capacitor, il faut ouvrir le
 * flow dans le navigateur système (Custom Tabs / SFSafariViewController),
 * qui reste un user-agent de confiance pour Google. Sur le web classique,
 * ce composant ne fait rien (Capacitor.isNativePlatform() === false).
 *
 * Limite connue : le navigateur système a un cookie jar séparé de la
 * WebView de l'app — après connexion, l'utilisateur revient manuellement
 * dans l'app (pas de handoff automatique de session). Voir MOBILE_SETUP.md.
 */
export function NativeGoogleSignIn() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { Browser } = await import("@capacitor/browser");
      const form = document.querySelector<HTMLFormElement>("form[data-google-signin]");
      if (!form) return;

      const handleSubmit = (e: Event) => {
        e.preventDefault();
        void Browser.open({ url: `${window.location.origin}/api/auth/signin/google` });
      };

      form.addEventListener("submit", handleSubmit);
      cleanup = () => form.removeEventListener("submit", handleSubmit);
    })();

    return () => cleanup?.();
  }, []);

  return null;
}
