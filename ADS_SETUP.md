# Publicité — AdSense (web) + AdMob (iOS/Android)

Deux systèmes Google **distincts et non interchangeables** :

| | AdSense | AdMob |
|---|---|---|
| Où | Site web (navigateur) uniquement | App native iOS/Android uniquement |
| Pourquoi pas l'inverse | Servir AdSense dans une app mobile viole la policy Google (risque de bannissement du compte) | AdMob n'a pas de format web classique |
| Compte requis | google.com/adsense | admob.google.com |
| Code | `src/components/AdBanner.tsx` + `AdSidebar.tsx` (web branch) | `src/components/AdMobBanner.tsx` (native branch) |

Les deux composants web (`AdBanner`, `AdSidebar`) détectent automatiquement
s'ils tournent dans l'app Capacitor (`Capacitor.isNativePlatform()`) et se
désactivent pour laisser la main à `AdMobBanner` — aucune config manuelle à
faire par plateforme, le même composant `<AdBanner />` est utilisé partout
dans `Dashboard.tsx`.

## 🔧 Bug corrigé au passage

L'implémentation précédente injectait les scripts AdSense via
`dangerouslySetInnerHTML` — **les balises `<script>` insérées ainsi ne
s'exécutent jamais dans un navigateur** (limitation DOM standard, pas
spécifique à React). Concrètement, aucune pub AdSense n'a jamais pu se
charger avec l'ancien code, même en prod avec un vrai `data-ad-client`. La
nouvelle implémentation crée les éléments DOM via `document.createElement`
(qui exécute bien les scripts), dans `AdBanner.tsx` / `AdSidebar.tsx`.

---

## 1️⃣ AdSense (web) — ce qu'il te faut

1. Créer un compte sur https://www.google.com/adsense
2. Ajouter le site `habits.khalilaliouich.com`, attendre l'approbation
   (peut prendre plusieurs jours, Google vérifie le contenu)
3. Une fois approuvé : **Ads → By ad unit → Display ads** → créer 2 unités :
   - Banner (728×90) → copier le **slot ID**
   - Sidebar (300×600) → copier le **slot ID**
4. Récupérer ton **Publisher ID** (`ca-pub-XXXXXXXXXXXXXXXX`), visible en
   haut à droite du dashboard AdSense

### Variables à fournir (build-time, voir piège ci-dessous)

```env
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
```

⚠️ **`NEXT_PUBLIC_*` est figé au build Docker**, pas au runtime k8s — comme
`NEXT_PUBLIC_APP_URL` (voir `CLAUDE.md`). Un Secret k8s n'y changera rien.
Il faut la passer en `--build-arg` :

```bash
sudo docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX \
  -t habit-game:vX.Y.Z .
```

Les slot IDs (728×90 et 300×600) sont passés en props directement dans
`Dashboard.tsx` (`<AdBanner slot="..." />` / `<AdSidebar slot="..." />`) —
pas besoin d'env var pour eux, éditer le composant directement.

---

## 2️⃣ AdMob (iOS/Android) — ce qu'il te faut

1. Créer un compte sur https://admob.google.com
2. **Apps → Add app** → une fois pour Android, une fois pour iOS
   → chaque app génère un **App ID** (`ca-app-pub-XXXXXXXX~YYYYYYYY`)
3. Pour chaque app : **Ad units → Add ad unit → Banner**
   → génère un **Ad unit ID** (`ca-app-pub-XXXXXXXX/ZZZZZZZZZZ`)

### Où renseigner les vrais IDs

**App ID Android** — `android/app/src/main/AndroidManifest.xml` :
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXX~YYYYYYYY" />
```
(remplace l'ID de test actuel `ca-app-pub-3940256099942544~3347511713`)

**App ID iOS** — `ios/App/App/Info.plist` (après `cap add ios`, voir
`MOBILE_SETUP.md`) :
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXX~YYYYYYYY</string>
```

**Ad unit IDs (banner)** — variables d'env build-time, mêmes contraintes
que AdSense ci-dessus :
```env
NEXT_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXX/ZZZZZZZZZZ
NEXT_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXX/WWWWWWWWWW
```
→ passés en `--build-arg` au build Docker, comme `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT`.

### ⚠️ IDs de test par défaut — ne pas les remplacer avant d'être prêt

Le code utilise par défaut les **IDs de test officiels Google**
(`ca-app-pub-3940256099942544/...`) tant que les vraies variables ne sont pas
fournies (voir `src/lib/ads.ts`). Ce sont de vraies requêtes publicitaires
mais jamais facturées/comptabilisées — sert à valider que l'intégration
fonctionne sans risquer une suspension de compte AdMob pour clics accidentels
pendant les tests internes. Ne basculer sur les vrais IDs qu'une fois l'app
prête pour la review des stores.

---

## Récap — variables à fournir au final

| Variable | Où | Build-time ou runtime |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` | `--build-arg` Docker | Build-time |
| `NEXT_PUBLIC_ADMOB_ANDROID_BANNER_ID` | `--build-arg` Docker | Build-time |
| `NEXT_PUBLIC_ADMOB_IOS_BANNER_ID` | `--build-arg` Docker | Build-time |
| App ID Android AdMob | `AndroidManifest.xml` (édition directe) | Build natif |
| App ID iOS AdMob | `Info.plist` (édition directe, après `cap add ios`) | Build natif |
| Slot IDs AdSense (banner/sidebar) | Props dans `Dashboard.tsx` | Code |
