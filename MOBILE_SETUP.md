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
- Google Sign-In fonctionnel dans la WebView, sans interception (voir section
  dédiée plus bas — testé empiriquement)
- AdMob natif (`AdMobBanner.tsx`) pour iOS/Android, AdSense corrigé pour le web
  (voir `ADS_SETUP.md`)

## Pourquoi "remote server" et pas un bundle statique embarqué

L'app utilise des Server Actions, Prisma côté serveur, des sessions/cookies
Auth.js — un `next export` statique casserait tout ça. La coque native est
donc une webview qui pointe vers le site déployé : **aucun rebuild natif
n'est nécessaire pour un changement de code** (les déploiements web normaux
suffisent), seuls les changements natifs (icône, splash, plugins, permissions)
demandent un nouveau build/submit sur les stores.

## Google Sign-In dans l'app native — résolu

État : le bouton "Continue with Google" fait un POST normal (Server Action
Auth.js) **y compris dans l'app**. Aucune interception native, aucune
passerelle de session à maintenir.

### ⚠️ Le piège n°1 : `server.allowNavigation`

Capacitor ouvre dans le **navigateur externe** toute navigation vers un hôte
différent de `server.url`. Sans liste blanche, le login OAuth se déroule à
cheval sur deux contextes et échoue systématiquement :

```
1. le serveur pose le cookie PKCE   → jar de la WebView
2. redirection vers accounts.google.com → Capacitor ouvre Chrome
3. Google renvoie sur /api/auth/callback → toujours dans Chrome
4. Chrome n'a pas le cookie PKCE    → InvalidCheck: pkceCodeVerifier…
```

**Signature du bug** : ça marche dans un navigateur mobile (un seul jar de
cookies), ça casse dans l'app (deux jars). Si tu vois un bandeau de navigateur
(✕, partage, ⋮) apparaître pendant le flux, c'est exactement ça.

`accounts.google.com` et les hôtes Stripe sont donc listés dans
`allowNavigation` (`capacitor.config.ts`). Stripe pour la même raison : le
retour de Checkout doit atterrir là où vit la session.

### Les trois réglages sont nécessaires ENSEMBLE

| Réglage | Où | Rôle |
|---|---|---|
| `allowNavigation` | `capacitor.config.ts` | garde le flux dans la WebView (un seul jar) |
| `SameSite=None` sur pkce/state | `src/lib/auth.ts` | autorise l'envoi du cookie en contexte tiers |
| `setAcceptThirdPartyCookies` | `MainActivity.java` | autorise la WebView à accepter ces cookies |

En retirer un suffit à recasser le login mobile.

### Vérifié : Google n'interdit pas la WebView Capacitor

La crainte du `disallowed_useragent` a été testée empiriquement (2026-08-08)
en rejouant le flux OAuth réel avec l'user-agent d'une WebView Android
(celui qui contient le marqueur `; wv)`), puis avec un Chrome standard :

| User-Agent | Résultat |
|---|---|
| WebView (`; wv)`) | 302 → page de connexion Google servie (HTTP 200) |
| Chrome standard | 302 → **exactement la même** destination |

Aucun `disallowed_useragent`, aucun écran « ce navigateur n'est peut-être pas
sécurisé ». Le blocage historique de Google ne s'applique pas à ce client
OAuth. Conclusion : **ne pas construire de passerelle de session par deep
link** — ce serait de l'authentification maison, donc du risque de
compromission de compte, pour résoudre un problème qui n'existe pas.

Si Google durcissait sa politique un jour, la réponse la moins risquée reste
d'activer Resend (magic link) : ce flux se déroule entièrement dans la
WebView, sans écran de consentement tiers. Il suffit de renseigner
`AUTH_RESEND_KEY` dans le Secret k8s, le code est déjà en place et le
provider s'enregistre tout seul (voir `src/lib/auth.ts`).

### Piste écartée : ouvrir le flow dans le navigateur système

Une première version routait le clic vers Custom Tabs via `Browser.open()`
sur `/api/auth/signin/google`. **Ça ne marche pas** : Auth.js v5 exige un
POST avec token CSRF pour se connecter — un GET sur cette route n'est pas
une action valide et redirige vers `/api/auth/error?error=Configuration`
(`UnknownAction` côté logs serveur). Piège : un `curl` sur cette URL
renvoie bien `302`, mais le `Location` pointe vers la page d'erreur, pas
vers Google — vérifier le header, pas juste le code HTTP.

Et même en corrigeant l'URL, le navigateur système a un **cookie jar séparé**
de la WebView : la session obtenue dans Custom Tabs n'est pas visible par
l'app. L'approche est donc structurellement sans issue sans pont de session.

Le pont de session par deep link (`habitgame://auth-callback?code=…` + table
de codes à usage unique) reste techniquement possible, mais n'a **aucune
raison d'être construit** tant que le test ci-dessus reste vert : ce serait
de l'authentification maison en pure perte.

## Build de l'APK — via GitHub Actions (recommandé)

**L'APK debug se construit automatiquement en CI**, pas besoin d'Android
Studio ni de machine locale :

```bash
gh workflow run android-build.yml --repo kaliouich/habit-game-saas --ref main
```

(ou onglet **Actions → Android build → Run workflow** sur GitHub). L'APK est
téléchargeable en artifact du run (~8,9 Mo, rétention 30 j) :

```bash
gh run download <RUN_ID> --repo kaliouich/habit-game-saas --dir ./apk
```

### Contraintes de version (apprises à la dure)

| Outil | Version requise | Symptôme si mauvaise version |
|---|---|---|
| Node | **≥ 22** | `The Capacitor CLI requires NodeJS >=22.0.0` au `cap sync` |
| Java | **21** | `invalid source release: 21` à `compileDebugJavaWithJavac` |

Ces deux versions sont figées dans `.github/workflows/android-build.yml` —
ne pas les baisser sans vérifier que Capacitor 8 suit.

### ⚠️ Pourquoi pas de build sur le serveur k3s

Ce serveur est **ARM64** et Google ne publie pas de binaire `aapt2` Linux
ARM64 dans les build-tools. Les contournements testés et écartés :
émulation QEMU x86_64 (fait planter le runtime natif de la JVM — `Aborted,
core dumped`, non contournable par `-Xint` qui ne couvre que le bytecode
applicatif), et `aapt2` ARM64 des dépôts Termux (lié à la libc Android
Bionic, incompatible avec la glibc Ubuntu). D'où le passage par un runner
GitHub x86_64 natif.

## Build & test en local — Android

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
