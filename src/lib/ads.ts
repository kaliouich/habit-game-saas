/**
 * Config publicitaire — deux systèmes Google distincts, jamais interchangeables :
 * - AdSense (script web, `adsbygoogle.js`) : autorisé UNIQUEMENT sur le site web
 *   dans un vrai navigateur. Google interdit AdSense dans une app mobile (même
 *   dans une webview) — violation de policy passible de bannissement du compte.
 * - AdMob (SDK natif) : seul système autorisé pour servir des pubs dans une
 *   app iOS/Android (native ou hybride Capacitor/Cordova).
 *
 * Les IDs de test Google ci-dessous sont les IDs OFFICIELS documentés par
 * Google pour le développement — toujours des vraies pubs (pas de mock), mais
 * jamais facturées/comptabilisées. Ne JAMAIS les remplacer par de vrais IDs
 * de prod tant que l'app n'est pas review-ready pour les stores : Google peut
 * suspendre le compte AdMob en cas de clics accidentels sur de vraies pubs
 * pendant les tests internes.
 */

export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? "";

export const ADMOB_TEST_IDS = {
  androidAppId: "ca-app-pub-3940256099942544~3347511713",
  androidBanner: "ca-app-pub-3940256099942544/6300978111",
  iosAppId: "ca-app-pub-3940256099942544~1458002511",
  iosBanner: "ca-app-pub-3940256099942544/2934735716",
} as const;

export const ADMOB_ANDROID_BANNER_UNIT_ID =
  process.env.NEXT_PUBLIC_ADMOB_ANDROID_BANNER_ID || ADMOB_TEST_IDS.androidBanner;

export const ADMOB_IOS_BANNER_UNIT_ID =
  process.env.NEXT_PUBLIC_ADMOB_IOS_BANNER_ID || ADMOB_TEST_IDS.iosBanner;

export function isAdSenseConfigured(): boolean {
  return Boolean(ADSENSE_CLIENT);
}

/**
 * Charge `adsbygoogle.js` une seule fois par page (client uniquement).
 * AdBanner et AdSidebar coexistent sur le dashboard : chacun injectait sa
 * propre balise <script>, ce qui charge deux fois la même lib AdSense —
 * source d'erreurs "adsbygoogle.push() error" et de slots non remplis.
 * Idempotent : renvoie la même promesse à tous les appelants.
 */
let adsensePromise: Promise<void> | null = null;

export function loadAdSenseScript(): Promise<void> {
  if (adsensePromise) return adsensePromise;

  adsensePromise = new Promise<void>((resolve, reject) => {
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("ADSENSE_SCRIPT_FAILED"));
    document.head.appendChild(script);
  });

  return adsensePromise;
}

/** Déclare un slot au script AdSense une fois celui-ci chargé. */
export function pushAdSlot(): void {
  const w = window as unknown as { adsbygoogle?: unknown[] };
  w.adsbygoogle = w.adsbygoogle || [];
  w.adsbygoogle.push({});
}
