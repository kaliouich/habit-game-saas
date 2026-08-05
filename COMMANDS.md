# COMMANDS.md — Référence d'exécution manuelle

> **But :** toutes les commandes qu'un fullstack/devops peut lancer **sans demander à Claude** pour éviter les overhead de session. Structures par workflow.

---

## 🔧 Développement local

### Installation & setup
```bash
# Installer les dépendances
npm install

# Générer Prisma Client
npx prisma generate

# Créer/mettre à jour la DB locale
npx prisma migrate dev

# Seeder la DB (12 habits démo + logs)
npx prisma db seed
```

### Développement
```bash
# Lancer Turbopack dev (Port 3000)
npm run dev

# Lancer les tests vitest (29 tests)
npm test

# Lancer les tests en mode watch
npm test -- --watch

# Vérifier les types TypeScript
npx tsc --noEmit

# Linter (si configuré)
npm run lint

# Formatter (si configuré)
npm run format
```

### Build & validation
```bash
# Build production standalone
npm run build

# Lancer le build en local (Port 3000)
PORT=3000 node .next/standalone/server.js

# Vérifier la taille du bundle
npm run build && du -sh .next/standalone/

# Analyser les dépendances
npm ls

# Vérifier les vulnérabilités
npm audit
```

---

## 📦 Déploiement Docker & k3s

### Image Docker

#### Construire l'image
```bash
# Build avec tag (ex. v0.5.0)
sudo docker build -t habit-game:v0.5.0 .

# Build et afficher les couches
sudo docker build --progress=plain -t habit-game:v0.5.0 .

# Vérifier la taille de l'image
sudo docker images | grep habit-game
```

#### Tester l'image localement
```bash
# Lancer le container en local (Port 3300)
sudo docker run --rm \
  -e DATABASE_URL="postgresql://habit:password@host.docker.internal:5432/habitgame" \
  -p 3300:3000 \
  habit-game:v0.5.0

# Avec volumes pour debug
sudo docker run --rm -it \
  -e DATABASE_URL="postgresql://..." \
  -e NODE_ENV=production \
  -p 3300:3000 \
  habit-game:v0.5.0

# Vérifier qu'il démarre (autre terminal)
curl -s http://localhost:3300/api/health
curl -s http://localhost:3300/login
```

#### Importer l'image dans k3s
```bash
# Sauvegarder l'image
sudo docker save habit-game:v0.5.0 | gzip > habit-game-v0.5.0.tar.gz

# Importer dans k3s containerd
sudo ctr -n k8s.io images import habit-game-v0.5.0.tar.gz

# Vérifier que l'image est présente
sudo ctr -n k8s.io images ls | grep habit-game
sudo crictl images | grep habit-game
```

### Déploiement k3s

#### Appliquer les manifests
```bash
# Déployer Postgres + app ensemble
sudo kubectl apply -f k8s/postgres.yaml
sudo kubectl apply -f k8s/app.yaml

# Ou chaque couche séparément
sudo kubectl apply -f k8s/postgres.yaml
sleep 30  # Attendre que Postgres soit prêt
npx prisma migrate deploy  # Migrations
npx prisma db seed        # Seed
sudo kubectl apply -f k8s/app.yaml
```

#### Monitoring & debug
```bash
# Vérifier que les pods sont running
sudo kubectl get pods -o wide

# Voir les deployments
sudo kubectl get deploy

# Voir les services
sudo kubectl get svc

# Logs live de l'app
sudo kubectl logs deploy/habit-game --tail=100 -f

# Logs d'une erreur spécifique
sudo kubectl logs deploy/habit-game --tail=50 | grep -i error

# Inspecter un pod spécifique
POD=$(sudo kubectl get pods -l app=habit-game -o jsonpath='{.items[0].metadata.name}')
sudo kubectl describe pod $POD

# Exec shell dans le container (debug)
sudo kubectl exec -it $POD -- /bin/sh
```

#### Déployer une nouvelle image
```bash
# Mettre à jour l'image dans app.yaml (manuellement)
# Puis :
sudo kubectl apply -f k8s/app.yaml

# Forcer un restart (pas de changement d'image)
sudo kubectl rollout restart deploy/habit-game

# Attendre que le rollout soit complété
sudo kubectl rollout status deploy/habit-game --timeout=180s

# Vérifier que les nouveaux pods tournent
sudo kubectl get pods -o wide
sudo kubectl logs deploy/habit-game --tail=30
```

#### Ports forward (accès local)
```bash
# Accéder à l'app via port-forward
sudo kubectl port-forward svc/habit-game 8080:3000
# Puis : curl http://localhost:8080/api/health

# Accéder à la DB (psql local)
sudo kubectl port-forward svc/postgres 5432:5432
# Depuis un autre terminal : psql postgresql://habit:$POSTGRES_PASSWORD@localhost/habitgame
```

#### Rollback
```bash
# Voir l'historique des déploiements
sudo kubectl rollout history deploy/habit-game

# Rollback à la version précédente
sudo kubectl rollout undo deploy/habit-game

# Attendre que le rollback soit appliqué
sudo kubectl rollout status deploy/habit-game --timeout=180s
```

---

## 🗄️ Base de données

### Locale (dev)
```bash
# Lancer docker Postgres si nécessaire (voir docker-compose local)
# ou utiliser la DB du cluster k3s

# Se connecter via psql
psql $DATABASE_URL

# Migrations locales
npx prisma migrate dev            # Créer + exécuter
npx prisma migrate reset          # Reset complet (danger ⚠️)
npx prisma db seed              # Exécuter le seeder
npx prisma studio               # GUI Prisma (localhost:5555)
```

### Cluster k3s
```bash
# Port-forward vers la DB
sudo kubectl port-forward svc/postgres 5432:5432

# Depuis l'hôte (autre terminal)
psql postgresql://habit:$POSTGRES_PASSWORD@localhost/habitgame

# Ou directement dans le pod
POD=$(sudo kubectl get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}')
sudo kubectl exec -it $POD -- psql -U habit -d habitgame

# Requêtes utiles
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Habit";
SELECT COUNT(*) FROM "HabitLog";
SELECT COUNT(*) FROM "MoodLog";

# Dumper la DB
sudo kubectl exec -it $POD -- pg_dump -U habit habitgame > backup.sql

# Restorer un backup
cat backup.sql | sudo kubectl exec -i $POD -- psql -U habit -d habitgame
```

### Migrations en production
```bash
# Via port-forward depuis l'hôte
sudo kubectl port-forward svc/postgres 5432:5432

# Créer une nouvelle migration
npx prisma migrate dev --name <name>  # Sur local, puis commit

# Déployer les migrations en prod
npx prisma migrate deploy  # Exécute toutes les migrations non-appliquées

# Status des migrations
npx prisma migrate status
```

---

## 🌐 Accès & Health checks

### Vérifier que l'app répond
```bash
# Localement (dev)
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/login

# Production (habits.khalilaliouich.com)
curl -s https://habits.khalilaliouich.com/api/health
curl -s https://habits.khalilaliouich.com/login
```

### Vérifier les routes statiques
```bash
# Robots.txt (SEO)
curl -s https://habits.khalilaliouich.com/robots.txt

# Sitemap
curl -s https://habits.khalilaliouich.com/sitemap.xml

# OG images
curl -I https://habits.khalilaliouich.com/og-image.jpg
```

### Vérifier les secrets k3s
```bash
# Lister les secrets
sudo kubectl get secrets

# Voir les données du secret (base64)
sudo kubectl get secret habit-game-secrets -o jsonpath='{.data}' | jq .

# Décoder une clé spécifique
sudo kubectl get secret habit-game-secrets -o jsonpath='{.data.DATABASE_URL}' | base64 -d
sudo kubectl get secret habit-game-secrets -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d
```

---

## 🔐 Authentification & Permissions

### Auth.js (Magic link + Google)
```bash
# Vérifier que les providers sont configurés
curl -s http://localhost:3000/api/auth/providers | jq .

# Vérifier les variables d'env Auth.js (localement via .env.local)
grep -E "AUTH_|RESEND_|GOOGLE_" .env.local || .env

# Tester la session (après login)
curl -s -b "authjs.session-token=<token>" http://localhost:3000/api/auth/session | jq .
```

---

## 💳 Stripe (Pro billing)

### Environnement local
```bash
# Vérifier les clés Stripe
grep -E "STRIPE_" .env.local || .env

# Vérifier que Stripe est configuré dans Prisma
npx prisma studio  # Voir les StripeEvent + Customer

# Tester le webhook localement (Stripe CLI)
# 1. Installer stripe-cli (si pas déjà)
# 2. Authentifier : stripe login
# 3. Forward les webhooks : stripe listen --forward-to localhost:3000/api/stripe/webhook
# 4. Déclencher un event : stripe trigger payment_intent.succeeded
```

### Accès au Stripe Dashboard
```bash
# Récupérer les clés depuis les secrets k8s
sudo kubectl get secret habit-game-secrets -o jsonpath='{.data.STRIPE_SECRET_KEY}' | base64 -d

# Aller sur : https://dashboard.stripe.com (login avec l'email associé)
# Voir les customers, invoices, payments, webhooks
```

---

## 🚀 CI/CD GitHub Actions

### Lancer un workflow manuellement
```bash
# Lister les workflows
gh workflow list

# Déclencher un workflow
gh workflow run deploy.yml

# Voir le status d'un run
gh run list
gh run view <run-id>

# Voir les logs d'un run
gh run view <run-id> -v
```

### Vérifier les déploiements
```bash
# Derniers commits
git log --oneline -10

# Voir les statuses des checks
gh pr checks  # Sur une PR
gh commit-status <sha>  # Sur un commit
```

---

## 🧹 Nettoyage & Maintenance

### Disque (node_modules, .next, etc.)
```bash
# Taille actuelle
du -xh --max-depth=2

# Nettoyer les dépendances
npm prune
npm cache clean --force

# Supprimer .next, node_modules (rebuild)
rm -rf .next node_modules
npm install
npm run build
```

### Conteneurs Docker
```bash
# Voir toutes les images
sudo docker images

# Supprimer une image
sudo docker rmi habit-game:v0.4.0

# Nettoyer les images dangling
sudo docker image prune -f

# Nettoyer tout (danger ⚠️)
sudo docker system prune -a
```

### Cluster k3s
```bash
# Voir les images dans k3s
sudo ctr -n k8s.io images ls

# Supprimer une image
sudo ctr -n k8s.io images rm habit-game:v0.4.0

# Nettoyer les pods finis
sudo kubectl delete pods --field-selector status.phase=Failed
sudo kubectl delete pods --field-selector status.phase=Succeeded

# Voir l'utilisation du disque
sudo du -xh --max-depth=2 /var/lib/containerd
sudo du -xh --max-depth=3 /var/lib/rancher
```

### Journaux
```bash
# Voir la taille des journaux
sudo journalctl --disk-usage

# Nettoyer les anciens journaux (> 3 jours)
sudo journalctl --vacuum-time=3d

# Voir les logs du kubelet
sudo journalctl -u k3s -f --no-pager
```

---

## 🔄 Workflows complets

### Cycle dev → prod classique

#### 1️⃣ Développement local
```bash
# Démarrer le dev server
npm run dev

# Faire des changements, tester manuellement
# Lancer les tests
npm test

# Vérifier les types
npx tsc --noEmit
```

#### 2️⃣ Commit & Push
```bash
# Voir les changements
git status
git diff

# Committer
git add .
git commit -m "feat(dashboard): add new chart type"

# Pousser
git push origin claude/habit-game-saas-plan-9f3833
# (ou main si sur main)
```

#### 3️⃣ Build & test image Docker
```bash
# Build l'image
sudo docker build -t habit-game:v0.5.0 .

# Tester localement
sudo docker run --rm \
  -e DATABASE_URL="postgresql://habit:password@localhost:5432/habitgame" \
  -p 3300:3000 \
  habit-game:v0.5.0

# Vérifier que ça répond
curl -s http://localhost:3300/api/health
```

#### 4️⃣ Déployer en prod
```bash
# Importer dans k3s
sudo docker save habit-game:v0.5.0 | gzip > /tmp/habit-game.tar.gz
sudo ctr -n k8s.io images import /tmp/habit-game.tar.gz

# Mettre à jour k8s/app.yaml (image: habit-game:v0.5.0)
# Appliquer le manifest
sudo kubectl apply -f k8s/app.yaml

# Attendre le rollout
sudo kubectl rollout status deploy/habit-game --timeout=180s

# Vérifier que la nouvelle version répond
curl -s https://habits.khalilaliouich.com/api/health
```

#### 5️⃣ Rollback si nécessaire
```bash
# Rollback immédiat
sudo kubectl rollout undo deploy/habit-game

# Vérifier
sudo kubectl rollout status deploy/habit-game --timeout=180s
curl -s https://habits.khalilaliouich.com/api/health
```

### Migration DB + deploy app
```bash
# 1. DB migrations
npx prisma migrate deploy

# 2. Seed données (optionnel)
npx prisma db seed

# 3. Build + deploy app
sudo docker build -t habit-game:v0.5.0 .
sudo docker save habit-game:v0.5.0 | sudo ctr -n k8s.io images import -
sudo kubectl apply -f k8s/app.yaml
sudo kubectl rollout status deploy/habit-game --timeout=180s
```

### Déployer juste une nouvelle image (code change)
```bash
# Build + import + apply
sudo docker build -t habit-game:v0.5.1 .
sudo docker save habit-game:v0.5.1 | sudo ctr -n k8s.io images import -
# Mettre à jour k8s/app.yaml (image: v0.5.1)
sudo kubectl apply -f k8s/app.yaml
sudo kubectl rollout status deploy/habit-game --timeout=180s
```

---

## 📋 Checklist déploiement

```bash
# ✅ Avant de déployer
[ ] npm test              # Tests verts
[ ] npx tsc --noEmit      # Types OK
[ ] git log -1            # Dernier commit OK
[ ] git status            # Rien de non-commité

# ✅ Docker
[ ] sudo docker build -t habit-game:vX.Y.Z .
[ ] sudo docker run ... curl /api/health  # Teste l'image

# ✅ k3s
[ ] sudo docker save | ctr images import  # Image dans k3s
[ ] sudo ctr -n k8s.io images ls          # Image présente
[ ] sudo kubectl apply -f k8s/app.yaml
[ ] sudo kubectl rollout status ... --timeout=180s

# ✅ Validation prod
[ ] curl https://habits.khalilaliouich.com/api/health
[ ] curl https://habits.khalilaliouich.com/login
[ ] Test manuel de la feature dans le browser

# ✅ Rollback prêt (au cas où)
sudo kubectl rollout undo deploy/habit-game
```

---

## 🆘 Troubleshooting rapide

### App ne démarre pas
```bash
# 1. Vérifier les logs
sudo kubectl logs deploy/habit-game --tail=100

# 2. Vérifier l'image existe
sudo ctr -n k8s.io images ls | grep habit-game

# 3. Vérifier la DB est accessible
sudo kubectl port-forward svc/postgres 5432:5432
# Dans autre terminal : psql postgresql://...

# 4. Vérifier les secrets
sudo kubectl get secret habit-game-secrets -o jsonpath='{.data}'
```

### Migration bloquée
```bash
# 1. Vérifier le status
npx prisma migrate status

# 2. Si une migration est "pending", elle est en attente
# 3. Si elle s'est mal appliquée, voir les logs de la DB

# 4. Forcer le reset (DANGER ⚠️ en dev seulement)
npx prisma migrate reset  # Refait schema + seed
```

### Certificat HTTPS expiré (Cloudflare Tunnel)
```bash
# Vérifier le tunnel
sudo cloudflared tunnel list
sudo cloudflared tunnel info <tunnel-name>

# Les certificats sont gérés par Cloudflare (automatiquement renouvelés)
# Si pb, vérifier les logs du tunnel
sudo journalctl -u cloudflared -f
```

---

## 📖 Ressources rapides

| Besoin | Commande |
|--------|----------|
| Voir la doc Next.js 16 | `less node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` |
| Voir la doc Prisma | `npx prisma studio` (GUI) ou [docs](https://prisma.io/docs) |
| Voir les logs temps réel | `sudo kubectl logs -f deploy/habit-game` |
| Accéder à Stripe | https://dashboard.stripe.com |
| Accéder à Cloudflare Tunnel | https://dash.cloudflare.com |
| Monitoring logs | Sentry (si configuré) ou Umami (analytics) |

---

**Dernière mise à jour :** 2026-08-05  
**Lisible par :** fullstack / devops / ops  
**Format :** exécution directe — aucune demande à Claude nécessaire
