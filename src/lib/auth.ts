import NextAuth from "next-auth";
import type { PrismaClient } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";

// @auth/prisma-adapter type ses paramètres contre le client généré par défaut
// de "@prisma/client". Ce projet utilise le générateur Prisma 7 "prisma-client"
// avec un output custom (src/generated/prisma) : structurellement compatible
// (mêmes délégués user/account/session/verificationToken), mais nominalement
// différent aux yeux de TypeScript. D'où ce seul cast, isolé ici.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as unknown as PrismaClient),
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login/check-email" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
