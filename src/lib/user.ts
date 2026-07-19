import { cache } from "react";
import { prisma } from "./prisma";

/**
 * TODO(Sprint 3) : remplacer par la session Auth.js (`await auth()`).
 * En attendant, toute l'app fonctionne sur le user de démo — le scoping par
 * `userId` est déjà en place partout, seule cette fonction changera.
 */
export const getCurrentUser = cache(async () => {
  const user = await prisma.user.findUnique({
    where: { email: "demo@habitgame.local" },
  });
  if (!user) {
    throw new Error("User démo introuvable — lancer `npx prisma db seed`");
  }
  return user;
});
