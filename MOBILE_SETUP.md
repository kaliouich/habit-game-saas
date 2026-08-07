# Mobile (iOS/Android) — Capacitor + AdMob

## Ce qui est fait

- Capacitor installé (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`,
  `@capacitor/ios`, `@capacitor/browser`, `@capacitor-community/admob`)
- `capacitor.config.ts` : mode **remote server** — la coque native charge
  directement `https://habits.khalilaliouich.com` (voir "Pourquoi ce mode"
  ci-dessous)
- Plateforme **Android scaffoldée** (`android/`) : icônes + splash screen
  générés depuis l'icône live du site (`resources/icon-512.png`)
- Plateforme **iOS non générée** — nécessite Xcode, donc un Mac. Voir plus bas.
- Fix Google Sign-In natif (`NativeGoogleSignIn.tsx`) — ouvre le flow dans le
  navigateur système au lieu de la webview embarquée
- AdMob natif (`AdMobBanner.tsx`) pour iOS/Android, AdSense corrigé pour le web
  (voir `ADS_SETUP.md`)

## Pourquoi "remote server" et pas un bundle statique embarqué

L'app utilise des Server Actions, Prisma côté serveur, des sessions/cookies
Auth.js — un `next export` statique casserait tout ça. La coque native est
donc une webview qui pointe vers le site déployé : **aucun rebuild natif
n'est nécessaire pour un changement de code** (les déploiements web normaux
suffisent), seuls les changements natifs (icône, splash, plugins, permissions)
demandent un nouveau build/submit sur les stores.

## ⚠️ Limite connue : Google Sign-In dans l'app native

Google interdit l'authentification OAuth dans une WebView embarquée nue
(erreur `disallowed_useragent`). `NativeGoogleSignIn.tsx` route donc le clic
sur "Continue with Google" vers le navigateur système (Custom Tabs sur
Android, SFSafariViewController sur iOS) au lieu de la webview de l'app —
ça évite le blocage pur et simple.

**Mais** le navigateur système a un cookie jar séparé de la webview de l'app.
Après connexion réussie dans le navigateur système, la session n'est **pas**
automatiquement récupérée par l'app — l'utilisateur doit revenir manuellement.
C'est une limitation connue et non triviale de tout l'écosystème
Capacitor/Cordova pour l'OAuth tiers (pas un bug de cette implémentation).

**Solutions possibles (non implémentées, à évaluer si besoin réel) :**
1. **Recommandé pour mobile : activer Resend (magic link email)** — ce flow
   reste entièrement dans la webview de l'app (pas d'écran de consentement
   tiers), donc aucun problème de cookie cross-domain. Voir
   `AUTH_RESEND_KEY` dans les secrets k8s (actuellement vide).
2. Implémenter un pont d'échange de session : après l'auth Google dans le
   navigateur système, rediriger vers un deep link personnalisé
   (`habitgame://auth-callback?code=...`) qui renvoie l'app, laquelle
   appelle un endpoint serveur dédié pour échanger ce code contre un cookie
   de session posé directement par la webview elle-même. Travail backend
   non négligeable (nouvelle table de codes à usage unique + route API).
3. SDK natif Google Sign-In + Credentials provider Auth.js dédié — plus
   robuste mais plus de travail natif par plateforme.

## Build & test — Android

Nécessite **Android Studio** (SDK + émulateur ou téléphone physique) —
non disponible sur ce serveur Linux ARM64. Depuis une machine avec Android
Studio :

```bash
git pull
npm install
npx cap sync android
npx cap open android   # ouvre Android Studio
# Dans Android Studio : Run ▶ sur un émulateur ou un appareil connecté
```

Pour générer un APK/AAB signé (release) :
```bash
cd android
./gradlew bundleRelease   # AAB pour Play Store
./gradlew assembleRelease # APK pour test direct
```
Nécessite un keystore de signature (`keytool -genkey ...`) — voir la doc
officielle Android sur la signature d'app avant toute soumission au Play
Store.

## Build & test — iOS

Nécessite **macOS + Xcode**, absent sur ce serveur. Depuis un Mac :

```bash
git pull
npm install
npx cap add ios          # génère le projet Xcode (jamais fait ici)
npx cap sync ios
npx cap open ios         # ouvre Xcode
# Dans Xcode : configurer le Team/Signing, puis Run ▶
```

Après `cap add ios`, régénérer les assets et refaire un sync :
```bash
npx capacitor-assets generate --ios
npx cap sync ios
```

Config AdMob iOS requise dans `ios/App/App/Info.plist` (à ajouter après
`cap add ios`) :
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-3940256099942544~1458002511</string> <!-- ID de TEST -->
<key>SKAdNetworkItems</key>
<array>
  <!-- Liste SKAdNetworkIdentifier requise par Google, voir doc AdMob iOS -->
</array>
```

## Icônes & splash screen

Générés depuis `resources/icon-512.png` (récupéré de l'icône live du site)
via `@capacitor/assets` :
```bash
npm run cap:assets           # génère pour android (+ ios si le dossier existe)
npx cap sync
```
Pour changer l'icône : remplacer `resources/icon.png` (1024×1024) et
`resources/splash.png` (2732×2732), puis relancer la commande ci-dessus.

## Checklist avant soumission App Store / Play Store

- [ ] Compte développeur Apple (99$/an) + Google Play (25$ une fois)
- [ ] Remplacer les IDs de test AdMob par les vrais IDs (voir `ADS_SETUP.md`)
- [ ] Décider d'une stratégie pour le login Google natif (voir section limite
      connue ci-dessus) — a minima activer Resend comme fallback fiable
- [ ] Screenshots + description store (réutiliser les visuels marketing)
- [ ] Politique de confidentialité publique (déjà en place : `/legal/privacy`)
- [ ] Keystore Android signé + Team Apple configuré dans Xcode
- [ ] Tester le flow de paiement Stripe dans la webview (Checkout Stripe
      fonctionne en navigateur intégré, à vérifier concrètement sur device)
- [ ] App Tracking Transparency (iOS 14.5+) si AdMob personnalisé activé —
      requis par Apple pour tout SDK pub avec tracking
