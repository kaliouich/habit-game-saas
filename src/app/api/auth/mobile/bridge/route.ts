import { auth } from "@/lib/auth";
import { mintMobileAuthCode } from "@/lib/mobileAuthCode";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Atterrit ici APRÈS le callback OAuth Google (/api/auth/callback/google, géré
 * par Auth.js) — le cookie de session réel est déjà posé dans le jar du
 * Custom Tab sur cette même redirection, exactement comme `redirectTo: "/app"`
 * fonctionne déjà pour le flux web/WebView existant. `auth()` voit donc une
 * session dès le premier appel ici, sans aller-retour supplémentaire.
 *
 * On ne relaie jamais le cookie brut du Custom Tab — seul le userId compte,
 * ce qui évite de dépendre du format interne (chunking) des cookies Auth.js.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.redirect(new URL("/login?error=MobileBridgeFailed", APP_URL).toString(), 302);
  }

  const code = await mintMobileAuthCode(session.user.id);
  return Response.redirect(`habitgame://auth-callback?code=${encodeURIComponent(code)}`, 302);
}
