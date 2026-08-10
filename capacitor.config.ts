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
    /**
     * Hôtes tiers autorisés à s'ouvrir DANS la WebView.
     *
     * Par défaut, Capacitor ouvre toute navigation vers un hôte différent de
     * `url` dans le NAVIGATEUR EXTERNE. Sans cette liste, le login Google
     * cassait systématiquement :
     *
     *   1. le serveur pose le cookie PKCE → dans le jar de la WebView
     *   2. redirection vers accounts.google.com → Capacitor ouvre Chrome
     *   3. Google renvoie sur /api/auth/callback → toujours dans Chrome
     *   4. Chrome n'a pas le cookie PKCE (posé dans la WebView) → échec
     *      `InvalidCheck: pkceCodeVerifier value could not be parsed`
     *
     * Garder ces flux dans la WebView = un seul jar de cookies, donc un
     * handshake OAuth cohérent de bout en bout.
     *
     * Stripe est listé pour la même raison : le retour de Checkout
     * (success_url) doit atterrir dans la WebView, là où vit la session —
     * sinon l'utilisateur paie puis se retrouve connecté dans Chrome.
     */
    allowNavigation: [
      "accounts.google.com",
      "*.google.com",
      // La validation en deux étapes et le consentement peuvent transiter par
      // ces hôtes ; un seul manquant renvoie l'utilisateur dans le navigateur
      // externe, où le flux meurt faute de cookies de session Google.
      "*.googleusercontent.com",
      "*.gstatic.com",
      "accounts.youtube.com",
      "checkout.stripe.com",
      "billing.stripe.com",
      "*.stripe.com",
    ],
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
