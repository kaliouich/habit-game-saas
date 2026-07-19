<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Habit Game — instructions projet

## ⚠️ Pièges Next.js 16 (vérifiés dans les docs embarquées)

Guide complet : `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

- `params` et `searchParams` sont des **Promises** → `const { month } = await searchParams`.
- `cookies()`, `headers()`, `draftMode()` sont **async**.
- `middleware.ts` n'existe plus → le fichier s'appelle **`proxy.ts`** (même API).
- **Turbopack par défaut** (dev + build) — pas de config webpack.
- `next lint` supprimé → ESLint flat config (`eslint.config.mjs`).
- Invalidation : `revalidatePath` / `revalidateTag` / `updateTag` après chaque mutation.

## Le projet

SaaS de tracking d'habitudes façon « tableur premium », réplique exacte (puis améliorée) du
dashboard montré dans la vidéo `WhatsApp Video 2026-07-12 at 8.48.59 PM.mp4` (racine du repo principal).

**📘 La spécification complète et la roadmap sont dans [PLAN.md](PLAN.md) — c'est le document
de référence.** Tout écart au plan doit y être reporté. L'ancien prototype (répertoire principal
du repo, non commité) est abandonné : ne pas le réutiliser.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · CSS Modules + variables CSS (pas de Tailwind)
· Prisma + PostgreSQL · Auth.js v5 · Stripe Billing · Resend · Vitest · déploiement Docker → k3s.

## Conventions non négociables

1. **Server Actions** : toujours le squelette zod → session → ownership → règle métier → `revalidatePath`. Jamais de mutation sans vérifier `userId`.
2. **Dates calendaires** : strings `YYYY-MM-DD` dans le fuseau du user (`User.timezone`), jamais de DateTime UTC pour un jour coché.
3. **Cocher = créer un `HabitLog`, décocher = le supprimer.** Pas de flag `completed=false` résiduel.
4. **Stats** : toutes les formules vivent dans `src/lib/stats.ts` (fonctions pures, unit-testées). Aucun calcul dupliqué dans les composants.
5. **Quotas de plan** (FREE 3 habitudes / PRO 24) appliqués côté serveur dans les actions, l'UI ne fait que refléter.
6. **Charts** : SVG maison rendus côté serveur (`src/components/charts/`), pas de librairie.
7. **Migrations** : `prisma migrate dev` en local, `prisma migrate deploy` au démarrage du conteneur. Jamais `db push`.
8. Le nom produit vient de la constante `APP_NAME` — ne jamais hardcoder « Habit Game ».

## Commandes

```bash
npm run dev              # dev (Turbopack) — nécessite le Postgres local lancé
npm run build            # build prod
npm test                 # Vitest (lib/stats, lib/dates, quotas)
npx prisma migrate dev   # créer/appliquer une migration
npx prisma db seed       # données de démo (habitudes de la vidéo)
```
