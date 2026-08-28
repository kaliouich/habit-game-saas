import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { signInWithEmail } from "@/lib/actions/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export const metadata: Metadata = { title: "Sign in" };
// Sans ça, Next prérend cette page une fois au build (où les secrets ne sont
// pas encore injectés en k8s) et fige "Sign-in is being set up" pour toujours.
export const dynamic = "force-dynamic";

/** Rangée décorative : 4 cases cochées sur 7, comme une semaine du tracker. */
const STRIP = [true, true, false, true, true, false, true];

export default function LoginPage() {
  // N'affiche que les providers réellement configurés — évite un bouton/formulaire
  // qui planterait silencieusement si la clé correspondante n'est pas encore fournie.
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const emailEnabled = Boolean(process.env.AUTH_RESEND_KEY);

  return (
    <div className="authpage">
      <div className="authcard">
        <div className="authcard__head">
          <img src="/icon-512.png" alt="" width={48} height={48} className="authcard__mark" />
          <h1 className="authcard__title">{APP_NAME}</h1>
          <p className="authcard__subtitle">Rebuild your consistency</p>
          <div className="authcard__strip" aria-hidden>
            {STRIP.map((on, i) => (
              <i key={i} className={on ? "on" : undefined} />
            ))}
          </div>
        </div>

        <div className="authcard__body">
          {googleEnabled && <GoogleSignInButton />}

          {googleEnabled && emailEnabled && (
            <div className="authcard__divider">
              <span>or</span>
            </div>
          )}

          {emailEnabled && (
            <form action={signInWithEmail} className="authcard__email">
              <label className="authcard__label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
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

        <p className="authcard__foot">No password. No card. 5 habits free.</p>
      </div>
    </div>
  );
}
