"use client";

import { signInWithGoogle } from "@/lib/actions/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Pont de session Google natif (Custom Tabs → WebView) — voir MOBILE_SETUP.md.
 * Dans l'app, le login Google embarqué dans la WebView échoue pour les
 * comptes utilisant la validation "Google prompt" (webAuthn-like : exige un
 * vrai contexte de navigation top-level). Sur natif, ouvre donc Google dans
 * un Custom Tab (Browser.open) au lieu de rester dans la WebView ; sur web,
 * comportement inchangé (signInWithGoogle direct, comme avant).
 *
 * Bouton "type=button" plutôt qu'un <form action> : la décision natif/web se
 * prend après un import dynamique (async), donc après le moment où un submit
 * de formulaire aurait déjà démarré — plus simple d'appeler l'action serveur
 * directement dans les deux branches que de gérer un preventDefault en course
 * avec la soumission.
 */
export function GoogleSignInButton() {
  const handleClick = async () => {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: `${APP_URL}/auth/mobile/start` });
      return;
    }
    await signInWithGoogle();
  };

  return (
    <button type="button" className="btn btn--google" onClick={handleClick}>
      Continue with Google
    </button>
  );
}
