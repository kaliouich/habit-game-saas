import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { signInWithEmail, signInWithGoogle } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Sign in" };
// Sans ça, Next prérend cette page une fois au build (où les secrets ne sont
// pas encore injectés en k8s) et fige "Sign-in is being set up" pour toujours.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  // N'affiche que les providers réellement configurés — évite un bouton/formulaire
  // qui planterait silencieusement si la clé correspondante n'est pas encore fournie.
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const emailEnabled = Boolean(process.env.AUTH_RESEND_KEY);

  return (
    <div className="authpage">
      <div className="authcard">
        <h1 className="authcard__title">{APP_NAME}</h1>
        <p className="authcard__subtitle">Rebuild your consistency 🎯</p>

        {googleEnabled && (
          <form action={signInWithGoogle} className="authcard__google">
            <button type="submit" className="btn btn--google">
              Continue with Google
            </button>
          </form>
        )}

        {googleEnabled && emailEnabled && (
          <div className="authcard__divider">
            <span>or</span>
          </div>
        )}

        {emailEnabled && (
          <form action={signInWithEmail} className="authcard__email">
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="authcard__input"
            />
            <button type="submit" className="btn btn--primary">
              Send magic link
            </button>
          </form>
        )}

        {!googleEnabled && !emailEnabled && (
          <p className="authcard__hint">Sign-in is being set up — check back soon.</p>
        )}
      </div>
    </div>
  );
}
