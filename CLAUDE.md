# Habit Game — Entrée pour fullstack/devops

> **But :** référence minimale pour reprendre le dev ou les ops. Détails complets → [PLAN.md](PLAN.md), conventions + pièges → [AGENTS.md](AGENTS.md).

## 🎯 Projet

**Habit Game** : SaaS tracking d'habitudes — grille mensuelle, stats temps réel, streaks 🔥, mood tracking.

**Stack :** Next.js 16 (App Router) + React 19 + Node.js Server Actions + PostgreSQL 16 + k3s (Docker standalone → Longhorn PVC 5 Gi).

**Modèle :** Free (3 habits, mois courant) vs Pro (~6 €/mois, illimité + historique + export CSV).

## 📍 État (2026-08-05)

| Sprint | État | Détail |
|--------|------|--------|
| 1–2 | ✅ | Dashboards 11 modules (grille, charts SVG, stats), déploiement k3s live |
| 3 | 📋 | Auth.js v5 (magic link Resend + Google), Stripe Billing |
| 4–5 | 📋 | Landing, SEO, monitoring (Sentry/Umami), CI/CD GitHub Actions, gamification |

Live : https://habits.khalilaliouich.com — 12 habits démo, 181 logs, DB saine, HTTP 200 ✅

## 🏗️ Clé structurelle

```
src/lib/
├── dates.ts           [calendaire pur, 29 tests vitest]
├── stats.ts           [15 formules : daily/weekly progress, streaks, etc.]
├── actions/           [Server Actions : habit CRUD, logs, moods]
└── quotas.ts          [FREE=3, PRO=24]

prisma/schema.prisma   [User, Habit, HabitLog, MoodLog, StripeEvent, Auth.js]

k8s/
├── postgres.yaml      [Deployment + PVC 5 Gi Longhorn]
└── app.yaml           [Deployment, probes /api/health, 1 replica]
```

## ⚡ Conventions (non-négociable)

1. **Server Actions** : `zod → session → ownership → rule → revalidatePath`
2. **Dates** : strings `YYYY-MM-DD` (fuseau utilisateur, jamais UTC)
3. **Check** = créer HabitLog ; uncheck = supprimer (pas `completed=false`)
4. **Stats** : dans `src/lib/stats.ts` seulement — zéro duplication client
5. **Quotas** : appliqués côté serveur
6. **Charts** : SVG maison, Server Components
7. **Migrations** : `prisma migrate dev` local → `deploy` en prod via k8s

## 🔧 Pièges Next 16

- `searchParams` est Promise
- `proxy.ts` remplace `middleware.ts` (Routing)
- Turbopack par défaut (plus rapide)
- `cookies()`, `headers()` async
- `NEXT_PUBLIC_APP_URL` figée au build

👉 Lire `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` avant de coder

## 🚀 Commandes essentielles

```bash
npm run dev              # Turbopack dev
npm test                 # 29 tests vitest
npm run build            # Standalone → .next/standalone/
npx prisma migrate dev   # Créer migration
npx prisma db seed      # Démo 12 habits + logs
```

## 🐳 Ops k3s

```bash
# Vérifier l'état
sudo kubectl get pods -o wide
sudo kubectl logs deploy/habit-game --tail=30

# Déployer / redémarrer
sudo kubectl apply -f k8s/app.yaml
sudo kubectl rollout restart deploy/habit-game
sudo kubectl rollout status deploy/habit-game --timeout=180s

# Accès DB
sudo kubectl port-forward svc/postgres 5432:5432  # Depuis l'hôte
psql $DATABASE_URL
```

## 🔗 Ressources

- [PLAN.md](PLAN.md) — blueprint 12 sections complet
- [AGENTS.md](AGENTS.md) — conventions + futurs devs
- Vidéo spec : `/home/ubuntu/habit-game-saas/WhatsApp Video 2026-07-12*.mp4`
- Repo backend : `github.com/kaliouich/habit-game-saas`
