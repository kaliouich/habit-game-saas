import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { signInWithEmail, signInWithGoogle } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="authpage">
      <div className="authcard">
        <h1 className="authcard__title">{APP_NAME}</h1>
        <p className="authcard__subtitle">Rebuild your consistency 🎯</p>

        <form action={signInWithGoogle} className="authcard__google">
          <button type="submit" className="btn btn--google">
            Continue with Google
          </button>
        </form>

        <div className="authcard__divider">
          <span>or</span>
        </div>

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
      </div>
    </div>
  );
}
