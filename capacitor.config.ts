import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Mode "remote server" : la coque native charge directement
 * https://habits.khalilaliouich.com au lieu d'un bundle statique embarqué.
 * Nécessaire car l'app utilise des Server Actions, l'auth (cookies/session)
 * et Prisma côté serveur — un `next export` statique casserait tout ça.
 * L'app native reste donc une webview vers le site live (mêmes déploiements,
 * pas de rebuild natif à chaque changement de code, seulement pour changer
 * icône/splash/config native).
 */
const config: CapacitorConfig = {
  appId: "com.khalilaliouich.habitgame",
  appName: "Habit Game",
  webDir: "public", // requis par le schema Capacitor mais inutilisé en mode server.url
  server: {
    url: "https://habits.khalilaliouich.com",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
