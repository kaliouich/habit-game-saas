# Habit Game — Résumé pour reprendre la conversation

## 🎯 Le projet

**Habit Game** est un SaaS de tracking d'habitudes façon « tableur premium ». L'utilisateur crée une liste d'habitudes (ex. « Wake up at 05:00 », « Gym », « Reading »), coche chaque jour celles qu'il a complétées, et voit en temps réel :
- Une grille mensuelle avec les cases cochées par jour
- Des graphiques (progression quotidienne, hebdomadaire, donut du % global)
- Un classement des 10 meilleures habitudes
- Des statistiques (goal, complétées, restantes)
- Un suivi d'humeur (mood) au jour le jour
- Des **streaks** 🔥 (série de jours consécutifs)

**Spec exacte** : la vidéo WhatsApp du 2026-07-12 stockée à la racine du repo principal — on a construit une réplique pixel-perfect (parité V1–V11 = les 11 modules visibles dans la vidéo), puis amélioré (dark mode, multi-mois, streaks, mobile).

**Modèle commercial** : Free (3 habitudes, mois courant) vs Pro (~6 €/mois, habitudes illimitées, historique complet, export CSV).

## 🏗️ Architecture (actuellement live)

| Couche | Détail |
|--------|--------|
| Framework | Next.js 16 (App Router) + React 19 |
| UI | CSS custom (design tokens PLAN.md §6, pas Tailwind) |
| Backend | Node.js, Server Actions (zod → ownership → quotas) |
| DB | PostgreSQL 16 (cluster k3s + PVC Longhorn 5 Gi) |
| Auth | TODO Sprint 3 : Auth.js v5 (magic link + Google) — actuellement user démo |
| Paiement | TODO Sprint 3 : Stripe Billing (Free/Pro) |
| Déploiement | Docker standalone → k3s (habits.khalilaliouich.com via Cloudflare Tunnel) |

## 📍 État au 2026-07-19

### Spécification & Fondations (Sprint 1) ✅
- `PLAN.md` : blueprint complet exécutable (12 sections), dans le projet.
- `AGENTS.md` : conventions, pièges Next 16, instructions pour futurs devs.
- `prisma/schema.prisma` : User, Habit, HabitLog, MoodLog, StripeEvent, modèles Auth.js.
- `src/lib/dates.ts` : fonctions calendaires pures (monthDays, weeksOf, todayInTz, isFuture).
- `src/lib/stats.ts` : toutes les 15 formules du dashboard (daily/weekly progress, analysis, top 10, streaks, mood).
- **29 tests Vitest verts** : bissextiles, mois à 6 semaines, fuseaux, bords.

### Dashboard réplique vidéo (Sprint 2) ✅
Les 11 modules fonctionnels : sidebar noire (My Habits CRUD + sélecteur mois + mood chart), grille Week 1–5 (checkboxes optimistes avec `useOptimistic`), Daily/Weekly Progress (bar charts SVG), cartes Goal/Completed/Left, donut Overall Stats (% global), tableau Analysis, Top 10 Habits, ligne Overall wellness (humeur par jour). Micro-animations 150–250 ms, responsive (breakpoints 1180 px et 768 px).

### Déploiement en production (Sprint 2.5) ✅
- `Dockerfile` multi-stage (deps → build → run) : image 240 Mo, standalone.
- `k8s/postgres.yaml` : Deployment avec PVC 5 Gi (Longhorn).
- `k8s/app.yaml` : Deployment `habit-game`, probes `/api/health`, 1 replica.
- Secret k8s `habit-game-secrets` : DATABASE_URL + POSTGRES_PASSWORD (non versionné).
- Migrations & seed via port-forward depuis l'hôte (`prisma migrate deploy`, puis `prisma db seed`).
- **Live** : https://habits.khalilaliouich.com — HTTP 200, DB saine, dashboards affichent les 12 habitudes de démo + 181 logs.

## 📋 Resto de la roadmap

### Sprint 3 — Auth & Stripe (estimé 2–3 jours)
- [ ] Remplacer `src/lib/user.ts` par `auth()` Auth.js v5 (magic link email Resend + Google OAuth).
- [ ] Intégration Stripe Checkout (2 prix : monthly ~6 €, yearly ~49 €).
- [ ] Webhook `/api/stripe/webhook` idempotent.
- [ ] Page `/app/billing` : Customer Portal + état du plan.
- [ ] Quotas appliqués serveur : FREE = 3 habitudes, PRO = 24.

### Sprint 4 — Landing & Prod (estimé 2–3 jours)
- [ ] Landing page : hero, démo read-only, features, pricing, FAQ.
- [ ] Pages légales : CGV, privacy.
- [ ] SEO & OG images.
- [ ] Monitoring : Sentry + Umami.
- [ ] CI/CD : GitHub Actions.

### Sprint 5+ — Gamification (post-lancement, itératif)
- [ ] Badges, perfect week, récap email hebdo.
- [ ] PWA + notifications push.
- [ ] Parrainage, i18n FR/EN.

## 🔧 Conventions (à respecter)

1. **Server Actions** : `zod → session → ownership → règle métier → revalidatePath`.
2. **Dates** : strings `YYYY-MM-DD` dans le fuseau du user (jamais UTC).
3. **Cocher** = créer HabitLog, décocher = supprimer (pas de `completed=false`).
4. **Stats** : dans `src/lib/stats.ts`, aucune duplication client.
5. **Quotas** appliqués serveur.
6. **Charts** : SVG maison, rendus serveur.
7. **Migrations** : `prisma migrate dev` local, `deploy` en prod.
8. **Nom produit** : constante `APP_NAME` (jamais hardcodé).

**Pièges Next 16** : `searchParams` est Promise, `proxy.ts` remplace `middleware.ts`, Turbopack par défaut, `cookies()/headers()` async. Lire `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` avant de coder.

## 📂 Structure clé

```
worktree: .claude/worktrees/habit-game-saas-plan-9f3833
branche: claude/habit-game-saas-plan-9f3833

src/
├── app/
│   ├── (app)/app/page.tsx      [dashboard]
│   ├── api/health/route.ts     [k8s probes]
│   └── globals.css
├── lib/
│   ├── dates.ts, stats.ts      [formules + 29 tests]
│   ├── user.ts                 [TODO Sprint 3 : auth()]
│   ├── quotas.ts
│   └── actions/                [logs, habits, moods]
├── components/
│   ├── dashboard/              [Sidebar, MonthGrid, StatsPanel]
│   └── charts/                 [BarChart, DonutChart, LineChart]
prisma/
├── schema.prisma               [User, Habit, HabitLog, MoodLog, etc.]
└── seed.ts                     [démo 12 habitudes]
```

## 🚀 Commandes

```bash
npm run dev              # Turbopack dev
npm test                 # 29 tests verts
npm run build            # Standalone
npx prisma migrate dev   # Créer migration
npx prisma db seed      # Démo
```

## 🔗 Ressources clé

- [PLAN.md](PLAN.md) — blueprint complet 12 sections
- [AGENTS.md](AGENTS.md) — conventions + pièges
- Vidéo spec : `/home/ubuntu/habit-game-saas/WhatsApp Video 2026-07-12...mp4`
