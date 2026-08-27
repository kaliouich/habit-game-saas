"use client";

import { useEffect, useRef } from "react";
import { signInWithGoogleMobile } from "@/lib/actions/auth";

/**
 * Pont de session Google natif (Custom Tabs → WebView) — voir MOBILE_SETUP.md.
 * Ouverte par l'app via Browser.open() (Custom Tab). Doit déclencher
 * signInWithGoogleMobile comme une vraie soumission de Server Action — un
 * appel de signIn() depuis un Route Handler GET ordinaire redirige vers la
 * page de connexion générique d'Auth.js au lieu d'aller direct chez Google
 * (vérifié empiriquement, voir lib/actions/auth.ts). Soumission automatique
 * au montage : l'utilisateur ne voit cette page qu'une fraction de seconde.
 */
export default function MobileGoogleStartPage() {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={signInWithGoogleMobile}>
      <button type="submit">Continue to Google</button>
    </form>
  );
}
