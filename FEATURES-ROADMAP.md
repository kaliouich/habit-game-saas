# Analyse concurrentielle & plan d'implémentation

> Source : captures d'écran d'une app concurrente (HelloHabit, d'après les
> libellés des widgets), analysées le 2026-08-11. Ce document inventorie ses
> fonctionnalités, les confronte au modèle actuel de Habit Game, et propose un
> ordre d'implémentation dicté par les dépendances techniques réelles.

---

## 1. Inventaire des fonctionnalités observées

### 1.1 Habitudes quantifiées (écran « Health Habits »)

| Habitude | Valeur / objectif | Unité |
|---|---|---|
| Steps | 6 250 / 10 000 | pas |
| Stand Up | 1,1 / 2 | heures |
| Daily Walk | 1,5 / 2 | miles |
| Work Out | 35 / 30 | minutes |
| Take the Stairs | 5 / 5 | étages |
| Burn Calories | 575 / 500 | calories |

Observations :
- La progression est une **valeur numérique avec unité**, pas une case cochée.
- La ligne se remplit en **barre de progression** (fond coloré partiel).
- Une habitude atteinte est **barrée** (Work Out, Take the Stairs, Burn Calories).
- **Badge de série** par habitude (🔥 22, 9, 4, 8, 2, 30).
- Bouton de **resynchronisation** par ligne (données santé).
- En-tête de groupe repliable avec compteur (« Daily Goals — 6 »).

### 1.2 Habitudes d'arrêt avec compteur (écran « Quit Habits »)

| Habitude | Compteur |
|---|---|
| Quit Drinking | 35 j, 1 h 15 m 31 s |
| Quit Smoking | 70 j, 14 h 30 m 3 s |
| Quit Vaping | 8 j, 3 h 50 m 50 s |
| Limit Caffeine | 10 h 43 m 2 s |

Observations :
- **Chronomètre en temps réel** depuis la dernière rechute (à la seconde).
- Bouton de **remise à zéro** = enregistrer une rechute.
- C'est une mécanique totalement différente d'une case à cocher quotidienne.

### 1.3 Journal (écran « Journal »)

- Entrées en **texte riche** : gras, italique, barré, surlignage couleur, listes
  à puces, cases à cocher.
- Chaque entrée est **rattachée à une habitude et à une valeur** :
  « Morning Walk / 5 000 step », « Mood / 80% (Great) », « Study / 2 h 30 min ».
- Horodatage précis (Nov 12, 9:30 AM).
- **Filtres** : par habitude, par type d'entrée, + recherche plein texte.

### 1.4 Planificateur quotidien (écran « Daily Planner »)

- Écran « Today » combinant **tâches** et **habitudes**.
- Tâches : titre, échéance (« Today », « 15:00 »), **drapeau de priorité**,
  icône de note, icône de rappel, case à cocher.
- Sections repliables avec compteur (« To-Do List — 4 », « Daily Habits — 5 »).

### 1.5 Widgets d'écran d'accueil

- Widget tâches : liste + boutons de validation.
- Widget habitudes : nom, progression, barre segmentée, bouton d'action
  contextuel (`+`, resync, édition selon le type d'habitude).

### 1.6 Navigation transverse

- **Bande de dates hebdomadaire** (dim → sam) en haut de chaque écran.
- **Barre inférieure à 5 onglets** : Aujourd'hui · Journal · Calendrier ·
  Communauté · Réglages.
- En-tête : menu, **statistiques**, **minuteur** (type Pomodoro).

---

## 2. Écart avec Habit Game aujourd'hui

### 2.1 Ce que nous avons déjà et qu'ils n'affichent pas

À préserver — c'est notre différenciation, pas du retard :

- **Grille mensuelle** façon papier quadrillé (identité produit)
- **Thèmes d'encre** (8 skins, 7 réservés au Pro)
- **Streak Shields** : absorber un jour manqué sans casser la série
- **Vacation mode** (pauses bornées à 90 j)
- **Badges, XP, rangs guerriers**
- **Récap mensuel partageable** (lien public)
- **Export CSV**
- **Mood tracking** intégré à la grille

### 2.2 Le verrou technique principal

```prisma
model HabitLog {
  completed Boolean @default(true)   // ← binaire
  note      String?                  // ← 280 caractères
}

model Habit {
  goal Int?                          // ← sans unité, non exploité en saisie
}
```

**`completed` est un booléen.** Il n'existe aucun endroit où stocker
« 6 250 pas » ou « 35 minutes ». Tant que ce n'est pas levé :

- pas d'habitude quantifiée,
- pas de synchronisation santé (elle produit des valeurs, pas des booléens),
- pas de widget affichant une progression,
- pas d'entrée de journal rattachée à une valeur.

**Quatre des cinq écrans observés en dépendent.** C'est donc le premier
chantier, et il doit être fait proprement : `stats.ts` (111 tests) suppose
aujourd'hui qu'un jour est coché ou non.

### 2.3 Le type QUIT est une coquille vide

`HabitType.QUIT` existe, mais se comporte exactement comme un BUILD : on coche
une case par jour. Le concurrent en fait un **chronomètre depuis la dernière
rechute** — mécanique bien plus parlante pour arrêter de fumer ou de boire, et
peu coûteuse à construire.

---

## 3. Dépendances — l'ordre n'est pas négociable

```
        ┌─────────────────────────────────────────┐
        │  A. Valeurs quantifiées (schéma + UI)   │  ← socle
        └───────────────┬─────────────────────────┘
                        │
      ┌─────────────────┼──────────────────┬────────────────┐
      ▼                 ▼                  ▼                ▼
 B. Journal      C. Sync santé      D. Widgets natifs   E. Minuteur
 (valeur liée)   (produit des        (affiche une       (produit une
                  valeurs)            progression)       durée)

        ┌─────────────────────────────────────────┐
        │  F. Compteur d'arrêt (QUIT)             │  ← indépendant
        └─────────────────────────────────────────┘

        ┌─────────────────────────────────────────┐
        │  G. Tâches / To-Do                      │  ← indépendant
        └─────────────────────────────────────────┘   (décision produit)
```

Commencer par B, C ou D avant A garantit de tout réécrire.

---

## 4. Plan par phases

### Phase 1 — Socle quantifié `[gros chantier]`

**Objectif** : une habitude peut avoir une unité et une valeur cible ; un log
porte une valeur.

```prisma
enum HabitUnit {
  TIMES        // 1 fois (défaut — rétrocompatible)
  MINUTES
  HOURS
  COUNT        // verres, pages, étages…
  STEPS
  KM
  CALORIES
}

model Habit {
  unit        HabitUnit @default(TIMES)
  targetValue Float?    // remplace `goal Int?`
  unitLabel   String?   // libellé libre : « verres », « pages »
}

model HabitLog {
  value Float @default(1)   // 1 = ancien `completed: true`
  // `completed` devient dérivé : value >= habit.targetValue
}
```

**Points d'attention :**

1. **Migration rétrocompatible** : tout `HabitLog` existant devient
   `value = 1`, toute habitude `unit = TIMES, targetValue = 1`. Aucun
   comportement actuel ne change.
2. **`stats.ts` doit rester juste** : les 111 tests passent aujourd'hui sur une
   logique binaire. La règle « le jour compte » devient
   `value >= targetValue` — à écrire une seule fois, dans `stats.ts`, jamais
   dupliquée côté client (convention n°4 du projet).
3. **Saisie UI** : la case à cocher de la grille doit devenir un contrôle
   contextuel (case pour TIMES, `+`/stepper pour COUNT, saisie de durée pour
   MINUTES). C'est le gros du travail front.

**Découpage Free/Pro suggéré** : unités de base gratuites (le tracker doit
rester utilisable), unités « avancées » et objectifs multiples réservés au Pro.

---

### Phase 2 — Compteur d'arrêt `[petit chantier, fort impact]`

**Objectif** : `QUIT` devient un chronomètre depuis la dernière rechute.

```prisma
model Habit {
  quitStartedAt DateTime?   // début / dernière remise à zéro
}

model HabitRelapse {
  id        String   @id @default(cuid())
  habitId   String
  occurredAt DateTime @default(now())
  note      String?
  // historique = courbe de progression, et « meilleure série d'abstinence »
}
```

- Affichage : compteur temps réel côté client (`setInterval`), calculé à partir
  de `quitStartedAt` — **aucune requête serveur** pour l'égrener.
- Bouton « J'ai rechuté » → crée un `HabitRelapse` + réinitialise
  `quitStartedAt`.
- Gamification naturelle : **record d'abstinence** = plus long intervalle entre
  deux rechutes. S'intègre au système de badges existant.

**Pourquoi le placer en n°2** : indépendant de la Phase 1, peu coûteux, très
visible, et il donne enfin un sens au type `QUIT` déjà présent en base.

---

### Phase 3 — Journal `[chantier moyen]`

**Objectif** : `HabitLog.note` (280 car., Pro) devient une entrée de journal
first-class.

```prisma
model JournalEntry {
  id        String   @id @default(cuid())
  userId    String
  habitId   String?  // optionnel : une entrée peut être libre
  date      String   // "YYYY-MM-DD"
  createdAt DateTime @default(now())
  content   Json     // texte riche structuré, pas du HTML brut
  @@index([userId, date])
}
```

**Décision importante — ne pas stocker de HTML.** Un éditeur riche qui écrit du
HTML en base ouvre une porte XSS permanente (le contenu est réaffiché à
l'auteur, et potentiellement dans le récap partagé, qui est public). Stocker un
**arbre structuré** (JSON) et le rendre côté serveur avec une liste blanche de
nœuds élimine la classe entière de problèmes.

- Recherche plein texte : index PostgreSQL `tsvector` sur le texte extrait.
- Filtres par habitude / période.
- **Positionnement Pro** évident (l'export CSV et le récap le sont déjà).

---

### Phase 4 — Tâches / To-Do `[chantier moyen — décision produit d'abord]`

⚠️ **Ce n'est pas qu'une fonctionnalité, c'est un repositionnement.**

Habit Game est aujourd'hui un *tracker d'habitudes*. Ajouter les tâches en fait
un *planificateur quotidien* — un marché plus large, mais aussi bien plus
concurrentiel (Todoist, TickTick, Things…), et ça dilue l'identité « grille
mensuelle + gamification ».

**À trancher avant d'écrire une ligne de code.** Deux options défendables :

- **Ne pas le faire** : rester le meilleur tracker d'habitudes, mieux valoriser
  la grille et la gamification que personne d'autre n'a.
- **Le faire en minimal** : des tâches simples rattachées à une journée, sans
  projets ni sous-tâches ni récurrence — juste de quoi ne pas avoir à ouvrir une
  seconde app.

```prisma
model Task {
  id          String    @id @default(cuid())
  userId      String
  title       String
  dueDate     String?   // "YYYY-MM-DD"
  dueTime     String?   // "HH:MM"
  priority    Int       @default(0)
  completedAt DateTime?
  @@index([userId, dueDate])
}
```

---

### Phase 5 — Synchronisation santé `[gros chantier, dépendances externes]`

**Bloquant tant que la Phase 1 n'est pas faite** (la synchro produit des valeurs).

- Android : plugin Capacitor **Health Connect**.
- iOS : **HealthKit**.
- Nécessite une **déclaration de conformité au Play Store** pour les données de
  santé (formulaire + délai de revue Google), et des permissions explicites.
- Synchronisation à l'ouverture de l'app plutôt qu'en tâche de fond (le
  background sync coûte cher en batterie et complique la revue store).

**Estimation honnête** : c'est la fonctionnalité la plus coûteuse de la liste,
et la seule qui dépende d'une validation externe.

---

### Phase 6 — Widgets d'écran d'accueil `[bloqué par l'architecture actuelle]`

🚧 **À lire avant de le promettre à qui que ce soit.**

Un widget Android (`AppWidgetProvider`) ou iOS (`WidgetKit`) est du **code natif
qui rend ses propres vues** — il ne peut pas afficher une WebView. Or Habit Game
est aujourd'hui une **coque Capacitor pointant sur le site distant** : il n'y a
aucune donnée en local à afficher.

Rendre les widgets possibles suppose :

1. Une **API JSON** dédiée (`/api/widget/summary`) ;
2. Un **stockage natif local** (SharedPreferences / UserDefaults) alimenté à
   chaque ouverture de l'app ;
3. Du **code natif Kotlin + Swift** pour le rendu et les actions ;
4. Une gestion de l'authentification hors WebView (jeton long terme stocké
   nativement) — sujet sensible, à concevoir soigneusement.

C'est un projet à part entière, pas une itération. À ne considérer qu'une fois
les phases 1 à 3 en production et le produit validé commercialement.

---

### Phase 7 — Minuteur & communauté `[à évaluer plus tard]`

- **Minuteur** (type Pomodoro) : intéressant une fois les unités de durée
  disponibles (Phase 1) — une session de minuteur alimente directement un log
  en minutes.
- **Onglet Communauté** : amis, défis partagés. Change la nature du produit
  (modération, vie privée, notifications). À ne pas ouvrir avant d'avoir une
  base d'utilisateurs payants.

---

## 5. Ordre recommandé

| # | Chantier | Ampleur | Dépend de | Pourquoi maintenant |
|---|---|---|---|---|
| 1 | **Compteur d'arrêt (QUIT)** | Petit | — | Fort impact visuel, donne enfin un sens à un type déjà en base |
| 2 | **Socle quantifié** | Gros | — | Débloque 4 des 5 écrans observés ; tout retard se paie en réécriture |
| 3 | **Journal** | Moyen | Socle | Extension naturelle des notes Pro, argument d'abonnement |
| 4 | **Tâches** | Moyen | — | ⚠️ décision produit préalable |
| 5 | **Sync santé** | Gros | Socle | Dépend d'une revue Play Store |
| 6 | **Widgets** | Très gros | Socle + natif | Bloqué par l'architecture WebView actuelle |
| 7 | **Minuteur / Communauté** | Variable | Socle | Après validation commerciale |

J'inverse volontairement 1 et 2 par rapport à l'ordre logique des dépendances :
le compteur d'arrêt est indépendant, rapide, et donne un résultat visible
pendant que le socle quantifié — qui touche `stats.ts` et ses 111 tests —
avance sans pression.

---

## 6. Ce qu'il ne faut pas copier

Toutes les fonctionnalités observées ne sont pas bonnes à prendre :

- **Les 5 onglets** du concurrent diluent l'attention. La grille mensuelle est
  notre écran signature ; l'enterrer sous une navigation chargée serait une
  perte nette.
- **Le texte riche multicolore** du journal va à l'encontre de l'identité e-ink
  du produit. Un journal sobre servirait mieux la cohérence visuelle.
- **La communauté** avant d'avoir des abonnés payants, c'est de la charge
  (modération, signalements, RGPD) sans revenu en face.

La bonne question n'est pas « qu'est-ce qu'ils ont que nous n'avons pas », mais
« qu'est-ce qui manque à un utilisateur qui tient déjà sa grille ». Les
habitudes quantifiées et le compteur d'arrêt répondent oui ; les widgets et la
communauté, pas encore.
