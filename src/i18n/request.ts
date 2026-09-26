import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";

/** Pas de préfixe d'URL (pas de /fr/app) : la WebView Capacitor charge en dur
 *  https://habitcade.com (capacitor.config.ts), et changer la structure des
 *  routes casserait ça, plus tous les liens/favoris/SEO existants. La langue
 *  vit dans un cookie, lu ici pour les Server Components. */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = LOCALES.includes(cookieLocale as Locale) ? (cookieLocale as Locale) : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
