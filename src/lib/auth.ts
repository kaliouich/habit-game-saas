import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";

// N'enregistre que les providers dont la clé est réellement configurée —
// évite qu'un appel direct à /api/auth/signin/<provider> plante côté serveur
// (ex. Resend sans clé) même si le bouton correspondant est caché côté UI.
const providers: Provider[] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
  );
}
if (process.env.AUTH_RESEND_KEY) {
  providers.push(Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.EMAIL_FROM }));
}

// @auth/prisma-adapter type ses paramètres contre le PrismaClient généré par
// défaut de "@prisma/client" — un export que ce package n'a pas toujours de
// façon fiable (il réexporte depuis ".prisma/client/default", peuplé par le
// générateur classique "prisma-client-js" ; ce projet utilise le générateur
// Prisma 7 "prisma-client" avec un output custom, src/generated/prisma).
// Le client réel est structurellement compatible (mêmes délégués
// user/account/session/verificationToken) ; `any` évite de dépendre d'un
// type externe dont la résolution s'est révélée non fiable d'un environnement
// à l'autre (marche localement, casse sur `npm ci` propre — vu en prod).
export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login/check-email" },
  providers,
  /**
   * Cookies éphémères du handshake OAuth en SameSite=None.
   *
   * Pourquoi : dans une WebView Android (app Capacitor), la redirection
   * accounts.google.com → notre domaine est évaluée comme un contexte TIERS.
   * En SameSite=Lax (défaut), le navigateur retient donc ces cookies au
   * retour, et Auth.js échoue sur
   * `InvalidCheck: pkceCodeVerifier value could not be parsed`.
   *
   * Périmètre volontairement limité à `pkceCodeVerifier` et `state` :
   * - Ils vivent 15 min, sont HttpOnly + Secure, et ne servent qu'à être
   *   renvoyés une fois pour prouver que le callback correspond bien à la
   *   demande émise. Les exposer en contexte tiers n'autorise aucune action.
   * - `state` reste par ailleurs la protection CSRF du flux OAuth lui-même.
   *
   * Le COOKIE DE SESSION n'est délibérément PAS touché : il reste en Lax,
   * qui est ce qui protège les actions authentifiées contre le CSRF. Le
   * passer en None élargirait réellement la surface d'attaque.
   */
  cookies: {
    pkceCodeVerifier: {
      name: "__Secure-authjs.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
        maxAge: 900,
      },
    },
    state: {
      name: "__Secure-authjs.state",
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
        maxAge: 900,
      },
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
