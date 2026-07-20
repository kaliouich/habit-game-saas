import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/referral";

/** Session courante — throw géré par le proxy (/app est protégé), donc toujours présente ici. */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect("/login");
  }

  // Génération paresseuse : l'adapter Auth.js crée le user sans referralCode.
  if (!user.referralCode) {
    for (let attempt = 0; attempt < 5 && !user.referralCode; attempt++) {
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { referralCode: generateReferralCode() },
        });
      } catch (e) {
        if ((e as { code?: string }).code !== "P2002") throw e; // collision improbable, on retente
      }
    }
  }

  // Attribution paresseuse depuis le cookie `ref` posé par proxy.ts sur /login?ref=CODE.
  if (!user.referredById) {
    const refCode = (await cookies()).get("ref")?.value;
    if (refCode && refCode !== user.referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: refCode }, select: { id: true } });
      if (referrer && referrer.id !== user.id) {
        user = await prisma.user.update({ where: { id: user.id }, data: { referredById: referrer.id } });
      }
    }
  }

  return user;
});
