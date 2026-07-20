import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import type { PrismaClient } from "@prisma/client";
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

// @auth/prisma-adapter type ses paramètres contre le client généré par défaut
// de "@prisma/client". Ce projet utilise le générateur Prisma 7 "prisma-client"
// avec un output custom (src/generated/prisma) : structurellement compatible
// (mêmes délégués user/account/session/verificationToken), mais nominalement
// différent aux yeux de TypeScript. D'où ce seul cast, isolé ici.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as unknown as PrismaClient),
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login/check-email" },
  providers,
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
