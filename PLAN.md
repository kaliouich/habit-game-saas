# HABIT GAME — Blueprint complet du SaaS
> Spécification exécutable : tout ce qu'un dev doit savoir pour construire, de zéro,
> une réplique **exacte puis meilleure** du dashboard de la vidéo, et la déployer en production facturable.
> Le prototype existant est considéré comme **abandonné** (référence visuelle uniquement, on ne réutilise pas son code).

---

## 0. Produit & positionnement

**Pitch** : « Le tracker d'habitudes façon tableur, gamifié, sur une seule page. »
**Cible** : self-improvers (la cible exacte de la vidéo virale). **Modèle** : freemium + abonnement Pro.

### Parité vidéo (obligatoire — le contrat visuel)
| # | Module | Détail exact vu dans la vidéo |
|---|--------|-------------------------------|
| V1 | Sidebar noire | Titre HABIT TRACKER, sélecteur de mois (`- July -`), bloc CALENDAR SETTINGS (année/mois), logo HABIT GAME en bas |
| V2 | My Habits | Liste verticale ~24 slots, nom + emoji (Wake up at 05:00 ⏰, Gym 💪, Reading 📖, Day Planning 📅, Project Work 🎯, No Alcohol 🍾, Social Media Detox 🌿, Cold Shower 🚿, Stretching 🤸, Journaling ✍️…) |
| V3 | Grille mensuelle | Colonnes jours 1→31 groupées **Week 1…Week 5**, double en-tête (We/Th/Fr + numéro), 1 checkbox par habitude/jour, jours futurs vides |
| V4 | Daily Progress | Bar chart : 1 barre/jour = % d'habitudes cochées ce jour, axe 0–100 % |
| V5 | Weekly Progress | Bar chart : 1 barre/semaine (week 1–5) |
| V6 | Cartes Goal / Completed / Left | Sommes globales du mois (ex. 372 / 273 / 99) |
| V7 | Overall Stats | Donut avec % global au centre (ex. 73 %) |
| V8 | Analysis | Tableau par habitude : Goal (30/31) · Actual · Left · barre de progression · % |
| V9 | Top 10 Habits | Classement décroissant par % (rang, nom, emoji) |
| V10 | Overall wellness | 1 dropdown humeur (1–5) par jour sous la grille + line chart « Mood » en bas de la sidebar |
| V11 | Réactivité | Cocher une case ⇒ tous les modules se recalculent instantanément |

### « Meilleur que la vidéo » (nos avantages différenciants)
| # | Amélioration | Pourquoi |
|---|--------------|----------|
| B1 | **Streaks 🔥** par habitude (série en cours + record) | La vidéo n'en a pas ; c'est LE moteur de rétention |
| B2 | **Multi-mois + navigation historique** (le tableur = 1 onglet/mois, fastidieux) | Valeur Pro évidente |
| B3 | **Mode sombre / clair** (le tableur est figé) | Attente standard SaaS |
| B4 | **Habitudes "négatives"** (No Alcohol : cocher = avoir résisté) avec libellé adapté | Cohérence UX |
| B5 | **Perfect days** mis en évidence dans la grille (colonne 100 % surlignée) | Gamification visuelle |
| B6 | **Mobile utilisable** (le tableur ne l'est pas) : vue jour « checklist du jour » + grille scrollable | Usage quotidien réel |
| B7 | **Partage d'un récap mensuel** (image OG générée) | Boucle virale — c'est comme ça que la vidéo a buzzé |
| B8 | **Export CSV** + récap email hebdo | Valeur Pro |
| B9 | Onboarding 1-clic avec le set d'habitudes de la vidéo | Time-to-value < 60 s |

---

## 1. Stack technique (versions figées)

| Couche | Choix | Notes |
|--------|-------|-------|
| Framework | **Next.js 16.2.10** (App Router, Server Components, Server Actions) | déjà dans le repo |
| Runtime | Node 20 LTS (alpine en Docker) | requis par Next 16 |
| UI | React 19.2, CSS Modules + variables CSS (pas de Tailwind : l'identité « tableur » est du CSS grid précis) | |
| Charts | **SVG maison** (bar, donut, line) — composants serveur purs, zéro dépendance | style N&B exact de la vidéo |
| ORM | Prisma ≥ 6 + `prisma migrate` | jamais `db push` en prod |
| DB | **PostgreSQL 16** dès le départ (conteneur sur k3s, PVC Longhorn) | évite la migration SQLite→PG en cours de route ; SQLite ne tient pas les webhooks Stripe concurrents |
| Auth | **Auth.js v5** (`next-auth@beta`) : magic link email + Google OAuth | adapter Prisma |
| Emails | **Resend** (magic links, récap hebdo, reçus) | domaine à vérifier (SPF/DKIM) |
| Paiement | **Stripe Billing** : Checkout + Customer Portal + webhooks | |
| Validation | **zod** sur toutes les entrées de Server Actions | |
| Déploiement | Docker multi-stage → **k3s existant** (Longhorn PVC pour Postgres, Cloudflare Tunnel pour l'ingress) | infra déjà en place |
| Monitoring | Sentry (front+back) + `/api/health` + probes k8s | |
| Analytics | Umami self-hosted (RGPD-friendly, pas de bannière cookie) | |

### ⚠️ Pièges Next.js 16 (vérifiés dans `node_modules/next/dist/docs/`)
Le dev DOIT lire `01-app/02-guides/upgrading/version-16.md`. Résumé des pièges qui cassent le code « style Next 14 » :
1. **`params` et `searchParams` sont des Promises** → `const { month } = await searchParams` dans les pages/layouts.
2. **`cookies()`, `headers()`, `draftMode()` sont async** → `await cookies()`.
3. **`middleware.ts` n'existe plus → `proxy.ts`** (même API, nouveau nom de fichier et d'export).
4. **Turbopack par défaut** (dev et build) — pas de config webpack custom.
5. Caching : `revalidateTag()/updateTag()/refresh()` — invalidation ciblée après chaque mutation (`revalidatePath('/app')` suffit au début).
6. `next lint` supprimé → ESLint flat config directe (déjà en place : `eslint.config.mjs`).
7. React Compiler dispo mais optionnel — ne pas l'activer au début (build plus lent).

---

## 2. Modèle de données (Prisma / PostgreSQL)

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql", url = env("DATABASE_URL") }

model User {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String?
  image            String?
  emailVerified    DateTime?
  // Billing
  stripeCustomerId String?   @unique
  plan             Plan      @default(FREE)
  planStatus       String?             // active | trialing | past_due | canceled
  trialEndsAt      DateTime?
  // Préférences
  theme            String    @default("light")
  weekStartsOn     Int       @default(1)      // 1 = lundi
  timezone         String    @default("Africa/Tunis")
  habits           Habit[]
  moods            MoodLog[]
  accounts         Account[]           // Auth.js
  sessions         Session[]           // Auth.js
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

enum Plan { FREE PRO }

model Habit {
  id         String     @id @default(cuid())
  userId     String
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  name       String                        // max 40 chars (zod)
  emoji      String?                       // 1 emoji
  type       HabitType  @default(BUILD)    // BUILD = faire, QUIT = résister (B4)
  goal       Int?                          // null = auto (nb de jours du mois)
  position   Int        @default(0)        // ordre sidebar (drag & drop)
  archivedAt DateTime?                     // soft delete : l'historique reste
  logs       HabitLog[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  @@index([userId, archivedAt])
}

enum HabitType { BUILD QUIT }

model HabitLog {
  id        String   @id @default(cuid())
  habitId   String
  habit     Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
  date      String                         // "YYYY-MM-DD" (date locale user, PAS UTC)
  completed Boolean  @default(true)
  createdAt DateTime @default(now())
  @@unique([habitId, date])
  @@index([habitId, date])
}

model MoodLog {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  date   String                            // "YYYY-MM-DD"
  value  Int                               // 1..5
  @@unique([userId, date])
}

// + modèles Auth.js standard : Account, Session, VerificationToken
// + journal Stripe pour idempotence des webhooks :
model StripeEvent {
  id        String   @id                   // event.id Stripe
  type      String
  createdAt DateTime @default(now())
}
```

**Règles métier clés**
- Une case cochée = **présence** d'un `HabitLog(completed=true)` ; décocher = suppression de la ligne (pas de `false` qui traîne).
- `date` est une **string locale** (`YYYY-MM-DD` dans le fuseau du user) — jamais de DateTime UTC pour un jour calendaire (piège classique : la case du lundi se coche le dimanche à 23 h). Le fuseau vient de `User.timezone`.
- Goal effectif d'une habitude pour un mois = `habit.goal ?? nbJoursDuMois`.
- Quotas : FREE = 3 habitudes actives + mois courant seulement ; PRO = 24 habitudes + historique illimité. **Appliqués dans les Server Actions**, pas seulement dans l'UI.

---

## 3. Arborescence cible du projet

```
src/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                  # Landing (hero = démo read-only seedée)
│   │   ├── pricing/page.tsx
│   │   ├── legal/{cgu,privacy}/page.tsx
│   │   └── layout.tsx                # header/footer marketing
│   ├── (app)/
│   │   ├── app/
│   │   │   ├── page.tsx              # LE dashboard — ?month=2026-07 (searchParams async !)
│   │   │   ├── settings/page.tsx     # profil, thème, fuseau, danger zone
│   │   │   └── billing/page.tsx      # état abonnement + lien Customer Portal
│   │   └── layout.tsx                # vérifie session, charge user, shell app
│   ├── login/page.tsx                # magic link + Google
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── stripe/webhook/route.ts   # POST, vérif signature, idempotent
│   │   ├── health/route.ts           # { ok: true, db: true } pour les probes k8s
│   │   └── og/monthly/route.tsx      # image OG du récap partageable (B7)
│   ├── layout.tsx                    # fonts, ThemeProvider, metadata
│   └── globals.css                   # design tokens (voir §6)
├── proxy.ts                          # ⚠️ Next 16 : ex-middleware.ts — protège /app/**
├── components/
│   ├── dashboard/
│   │   ├── Dashboard.tsx             # assemblage grid CSS 3 zones (serveur)
│   │   ├── Sidebar.tsx               # V1+V2 : MonthPicker, HabitList, MoodChart, logo
│   │   ├── HabitRow.tsx              # nom+emoji, édition inline, drag handle
│   │   ├── MonthGrid.tsx             # V3 : en-têtes semaines/jours + lignes de checkboxes
│   │   ├── DayCheckbox.tsx           # client : useOptimistic + action toggle
│   │   ├── MoodRow.tsx               # V10 : select humeur par jour
│   │   ├── StatCards.tsx             # V6
│   │   ├── AnalysisTable.tsx         # V8
│   │   ├── TopHabits.tsx             # V9
│   │   └── StreakBadge.tsx           # B1
│   ├── charts/                       # SVG serveur purs, props = data[]
│   │   ├── BarChart.tsx              # V4 + V5 (mêmes composants, props différentes)
│   │   ├── DonutChart.tsx            # V7
│   │   └── LineChart.tsx             # V10 mood
│   └── ui/                           # Button, Card, Dialog, Dropdown, Toast
├── lib/
│   ├── prisma.ts                     # singleton PrismaClient
│   ├── auth.ts                       # config Auth.js v5 exportant { auth, signIn, signOut }
│   ├── stripe.ts                     # client Stripe + helpers plans
│   ├── dates.ts                      # monthDays(), weeksOf(), todayInTz(), isFuture()
│   ├── stats.ts                      # TOUS les calculs (voir §5) — fonctions pures testées
│   ├── quotas.ts                     # canAddHabit(user), canViewMonth(user, month)
│   └── actions/                      # Server Actions ("use server")
│       ├── habits.ts                 # createHabit, renameHabit, archiveHabit, reorderHabits
│       ├── logs.ts                   # toggleLog(habitId, date)
│       ├── moods.ts                  # setMood(date, value)
│       └── billing.ts               # createCheckoutSession, createPortalSession
├── emails/                           # templates React Email (magic link, récap hebdo)
prisma/
├── schema.prisma
├── migrations/                       # versionnées, commitées
└── seed.ts                           # démo : 12 habitudes de la vidéo + 1 mois de logs réalistes
k8s/
├── namespace.yaml
├── postgres.yaml                     # StatefulSet + PVC Longhorn 5Gi + Secret
├── app.yaml                          # Deployment (2 replicas) + Service + probes
├── backup-cronjob.yaml               # pg_dump quotidien → PVC/objet
└── secrets.example.yaml
Dockerfile                            # multi-stage node:20-alpine, output standalone
.env.example                          # TOUTES les variables documentées (§8)
```

---

## 4. Server Actions — contrats exacts

Toutes suivent le même squelette (sécurité non négociable) :

```ts
"use server";
export async function toggleLog(input: unknown) {
  const { habitId, date } = ToggleLogSchema.parse(input);        // 1. zod
  const session = await auth();                                   // 2. session
  if (!session?.user) throw new Error("UNAUTHORIZED");
  const habit = await prisma.habit.findFirst({                    // 3. ownership
    where: { id: habitId, userId: session.user.id, archivedAt: null },
  });
  if (!habit) throw new Error("NOT_FOUND");
  if (isFuture(date, session.user.timezone)) throw new Error("FUTURE_DATE"); // 4. métier
  // 5. toggle atomique : delete si existe, sinon create (try/catch sur P2002)
  // 6. revalidatePath("/app")
}
```

| Action | Entrée (zod) | Règles |
|--------|--------------|--------|
| `toggleLog` | `{habitId, date: /^\d{4}-\d{2}-\d{2}$/}` | pas de date future ; FREE : mois courant only |
| `createHabit` | `{name: 1..40, emoji?, type}` | quota plan (3/24) ; position = max+1 |
| `renameHabit` / `setGoal` | `{habitId, ...}` | ownership |
| `archiveHabit` | `{habitId}` | soft delete (archivedAt) — l'historique des mois passés reste juste |
| `reorderHabits` | `{orderedIds: string[]}` | transaction, positions 0..n |
| `setMood` | `{date, value: 1..5}` | pas de futur |
| `createCheckoutSession` | `{price: "monthly"\|"yearly"}` | crée le customer Stripe si absent, retourne l'URL |
| `createPortalSession` | — | retourne l'URL du Customer Portal |

**Optimistic UI (V11)** : `DayCheckbox` est le seul composant client de la grille. Il utilise `useOptimistic` + `useTransition` : la coche s'affiche immédiatement, l'action tourne en fond, rollback + toast si erreur. Les stats (composants serveur) se rafraîchissent au `revalidatePath` — pour une réactivité totale des chiffres, le Dashboard garde les compteurs affichés dans un contexte client léger alimenté par les données serveur (pattern : serveur calcule, client anime).

---

## 5. Formules de calcul (lib/stats.ts — fonctions pures, unit-testées)

Soit `H` = habitudes actives du mois, `D` = jours du mois, `d ≤ today`.

| Stat | Formule |
|------|---------|
| `dailyProgress[d]` (V4) | `logs(d).count / H.count` — 0 pour les jours futurs (barre vide) |
| `weeklyProgress[w]` (V5) | moyenne des `dailyProgress[d]` pour `d ∈ semaine w` et `d ≤ today` |
| `goalTotal` (V6) | `Σ (h.goal ?? D.length)` |
| `completedTotal` (V6) | `Σ logs du mois` |
| `leftTotal` (V6) | `goalTotal − completedTotal` (floor 0) |
| `overallPct` (V7) | `completedTotal / goalTotal` |
| `analysis[h]` (V8) | `{goal, actual: logs(h).count, left: goal−actual, pct: actual/goal}` |
| `top10` (V9) | tri `analysis` par `pct` desc, take 10 |
| `streak[h]` (B1) | jours consécutifs cochés en remontant depuis today (ou hier si today pas coché) ; + `best` all-time |
| `moodSeries` (V10) | `MoodLog` du mois ordonnés par date, null = trou dans la ligne |
| `perfectDays` (B5) | jours où `dailyProgress[d] === 1` |

**Découpage en semaines (V3/V5)** : semaines **calendaires du mois** comme dans la vidéo — Week 1 = jours 1→premier dimanche (selon `weekStartsOn`), etc. Jusqu'à 6 groupes possibles (afficher "Week 6" si le mois le demande — la vidéo n'en montre que 5 car juillet 2026 commence un mercredi).

Une seule requête par rendu du dashboard :
```ts
prisma.habit.findMany({
  where: { userId, OR: [{ archivedAt: null }, { archivedAt: { gt: monthEnd } }] },
  include: { logs: { where: { date: { gte: "2026-07-01", lte: "2026-07-31" } } } },
  orderBy: { position: "asc" },
})  // + moodLogs du mois. Tout le reste est du calcul en mémoire.
```

---

## 6. Design system (l'identité « tableur premium » de la vidéo)

```css
:root {
  --bg: #f4f4f2;            /* fond papier clair */
  --panel: #111111;         /* panneaux noirs (sidebar, en-têtes) */
  --panel-fg: #ffffff;
  --grid-line: #d8d8d4;
  --cell: #ffffff;
  --check: #111111;         /* coche noire */
  --accent: #e8b93c;        /* jaune moutarde discret — hover, streaks, perfect days */
  --danger: #c0392b;
  --radius-cell: 4px; --radius-panel: 10px;
  --font-display: "Poppins"; --font-body: "Inter"; /* next/font, self-hosted */
}
[data-theme="dark"] { --bg:#0d0d0d; --panel:#1a1a1a; --cell:#161616; --grid-line:#2a2a2a; --check:#e8b93c; … }
```

- **Layout desktop** : CSS Grid `grid-template-columns: 240px 1fr 320px`, une page, pas de scroll vertical inutile ; la grille mensuelle scrolle horizontalement dans son conteneur si < 1440 px.
- **Checkbox** : 18×18, bord 1.5 px, coche SVG animée (`stroke-dashoffset` 120 ms), hover `--accent`. Jour futur : opacité .35, `cursor: not-allowed`.
- **Charts** : barres rectangulaires pleines `--panel`, valeurs en tooltip `<title>`, donut épaisseur 22 %, % en `--font-display` 28 px.
- **Colonne "aujourd'hui"** surlignée (fond `--accent` à 8 %). **Perfect day** : numéro du jour sur pastille `--accent`.
- **Mobile (< 768 px)** : le dashboard bascule sur une vue « Today » (checklist du jour + streaks + donut) avec onglet « Grid » qui affiche la grille en scroll horizontal. C'est le B6.
- Micro-animations : barres qui poussent à l'entrée (`transform: scaleY`), compteurs qui « roulent » (CSS `@property`), 150–250 ms max, `prefers-reduced-motion` respecté.

---

## 7. Auth, plans & Stripe

### Auth (Auth.js v5)
- Providers : **Resend magic link** (principal) + **Google OAuth**.
- `src/lib/auth.ts` exporte `{ handlers, auth, signIn, signOut }` ; route `api/auth/[...nextauth]`.
- `proxy.ts` (⚠️ pas middleware.ts) : redirige `/app/**` → `/login` si pas de cookie session ; `/login` → `/app` si connecté.
- Nouveau user → seed automatique proposé : les 8 habitudes de la vidéo en 1 clic (onboarding B9).

### Plans
| | FREE | PRO (essai 14 j sans CB) |
|---|---|---|
| Habitudes actives | 3 | 24 |
| Historique | mois courant | illimité + navigation |
| Mood tracking | ✅ | ✅ |
| Streaks/badges | ✅ | ✅ |
| Export CSV, récap email, partage OG | ❌ | ✅ |
| Prix | 0 | **6 €/mois** ou **49 €/an** (2 prix Stripe) |

### Stripe — checklist d'implémentation
1. Produits/Prix créés dans le dashboard Stripe (mode test) → IDs dans env.
2. `createCheckoutSession` : `mode: "subscription"`, `subscription_data.trial_period_days: 14`, `success_url: /app?upgraded=1`.
3. **Webhook `/api/stripe/webhook`** (route handler, `export const dynamic = "force-dynamic"`) :
   - Vérif signature `stripe.webhooks.constructEvent` (raw body !).
   - **Idempotence** : insert `StripeEvent(id)` — si conflit, retour 200 direct.
   - `checkout.session.completed` → lier `stripeCustomerId`, plan=PRO.
   - `customer.subscription.updated` → sync `planStatus`, `trialEndsAt`, downgrade si `canceled`/`unpaid`.
   - `customer.subscription.deleted` → plan=FREE.
   - Toujours répondre 200 vite ; log Sentry si erreur.
4. Customer Portal activé (annulation, changement de carte, factures) → zéro support billing.
5. En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
6. **Downgrade gracieux** : si > 3 habitudes actives en repassant FREE, rien n'est supprimé — les habitudes au-delà de 3 passent en lecture seule (bannière upgrade).

---

## 8. Variables d'environnement (`.env.example` complet)

```bash
# App
NEXT_PUBLIC_APP_URL=https://habits.khalilaliouich.com
# Database
DATABASE_URL=postgresql://habit:***@postgres:5432/habitgame
# Auth.js
AUTH_SECRET=            # openssl rand -base64 32
AUTH_URL=${NEXT_PUBLIC_APP_URL}
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_RESEND_KEY=
EMAIL_FROM="Habit Game <no-reply@habitgame.app>"
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_UMAMI_ID=
```

---

## 9. Déploiement (runbook k3s)

### Dockerfile (multi-stage, output standalone)
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci && npx prisma generate

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build                     # next.config.ts : output: "standalone"

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma  # pour migrate deploy
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

### Kubernetes
- `postgres.yaml` : StatefulSet Postgres 16 + PVC Longhorn 5 Gi + Secret (POSTGRES_PASSWORD). **La base n'est plus dans le pod app** — l'app devient stateless et scalable (2 replicas).
- `app.yaml` : Deployment, `envFrom: secretRef`, `readinessProbe: GET /api/health` (vérifie `SELECT 1`), `livenessProbe` idem, `resources` (requests 128Mi/100m, limits 512Mi/500m).
- `backup-cronjob.yaml` : `pg_dump` quotidien 03:00 → PVC dédié, rétention 14 jours (simple `find -mtime +14 -delete`).
- Ingress : Cloudflare Tunnel existant → Service `habit-game:3000`. Ajouter le domaine produit final quand choisi.

### Cycle de déploiement
```bash
sudo docker build -t habit-game:vX.Y.Z .
sudo docker save habit-game:vX.Y.Z | sudo k3s ctr images import -
sudo kubectl set image deployment/habit-game app=habit-game:vX.Y.Z   # tags versionnés, pas :latest
sudo kubectl rollout status deployment/habit-game
```
Les migrations tournent au démarrage (`migrate deploy` = no-op si à jour). Rollback = `kubectl rollout undo`.

---

## 10. Qualité & tests

| Type | Outil | Cible |
|------|-------|-------|
| Unit | Vitest | `lib/stats.ts` (toutes les formules §5, y compris mois à 6 semaines, années bissextiles, fuseaux), `lib/dates.ts`, `lib/quotas.ts` |
| Intégration | Vitest + SQLite mémoire ou testcontainers PG | Server Actions : ownership, quotas, idempotence toggle |
| E2E | Playwright | Parcours : login magic link → onboarding → cocher 5 cases → stats correctes → upgrade Stripe (mode test) → quota levé |
| Webhook | `stripe trigger checkout.session.completed` | sync plan |
| CI | GitHub Actions : lint + typecheck + vitest + build à chaque push | bloquant |

### Definition of Done par module vidéo
Chaque module V1–V11 est « done » quand : screenshot côte à côte avec la frame vidéo correspondante = même structure, données live, responsive OK, action optimiste < 50 ms perçus.

---

## 11. Roadmap d'exécution (checkable)

### Sprint 1 — Fondations (j1–j2)
- [ ] Repartir de ce worktree propre ; `output: "standalone"` dans `next.config.ts`
- [ ] Postgres local (docker compose dev) + schéma Prisma §2 + `migrate dev` + seed vidéo
- [ ] `lib/dates.ts`, `lib/stats.ts` + tests unitaires (les formules AVANT l'UI)
- [ ] Design tokens `globals.css`, fonts `next/font`, layout 3 zones vide

### Sprint 2 — Dashboard = vidéo (j3–j6)
- [ ] MonthGrid + DayCheckbox optimiste + toggleLog (V3, V11)
- [ ] Sidebar : MonthPicker (`?month=`), HabitList CRUD inline, logo (V1, V2)
- [ ] Charts SVG : BarChart daily/weekly, Donut, cartes stats (V4–V7)
- [ ] AnalysisTable + TopHabits (V8, V9)
- [ ] MoodRow + LineChart (V10)
- [ ] Streaks + perfect days + dark mode (B1, B3, B5)
- [ ] Vue mobile « Today » (B6)
- [ ] ✅ Gate : comparaison frame par frame avec la vidéo

### Sprint 3 — SaaS (j7–j9)
- [ ] Auth.js (magic link + Google), `proxy.ts`, onboarding B9
- [ ] Quotas FREE/PRO dans les actions
- [ ] Stripe : checkout, portal, webhook idempotent, downgrade gracieux
- [ ] Page pricing + bannières upgrade + page billing

### Sprint 4 — Lancement (j10–j12)
- [ ] Landing (hero démo interactive read-only), légal, SEO/OG, Umami
- [ ] Export CSV + image OG partage (B7, B8)
- [ ] k8s : postgres, app 2 replicas, probes, secrets, backups
- [ ] Sentry, E2E Playwright verts, checklist prod Next (`02-guides/production-checklist.md`)
- [ ] 🚀 Stripe en mode live, premiers clients

### Post-lancement (itératif)
- [ ] Récap hebdo email, badges mensuels, PWA + rappels, parrainage, i18n FR/EN

---

## 12. Décisions déjà tranchées (pour ne pas re-débattre)
1. **Postgres dès le j1** (pas SQLite) — l'app est multi-tenant et facturée, on ne migre pas une DB en prod à la semaine 2.
2. **Charts SVG maison** — 200 lignes de code, style exact, zéro dépendance, rendu serveur.
3. **Rebuild from scratch** dans ce worktree — le prototype ne fonctionne pas et date d'hypothèses Next 14 ; on garde seulement la vidéo comme spec.
4. **k3s existant** pour l'hébergement (déjà payé, déjà tunnelé) ; réévaluer Vercel+Neon seulement si l'ops devient un fardeau.
5. **Nom** : "Habit Game" à valider (collisions avec des templates Notion/Excel) — le code ne doit PAS hardcoder le nom (constante `APP_NAME`).
```
