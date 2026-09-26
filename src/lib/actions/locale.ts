"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";

export async function setLocale(locale: string): Promise<void> {
  if (!LOCALES.includes(locale as Locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  // Toutes les pages lisent le cookie via i18n/request.ts (Server Components) —
  // sans revalidatePath("/", "layout") le RootLayout déjà rendu ne se
  // réévalue pas et la langue ne change qu'à la prochaine navigation complète.
  revalidatePath("/", "layout");
}
