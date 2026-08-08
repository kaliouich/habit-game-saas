# Déploiement GitOps (ArgoCD)

## La chaîne

```
push sur main
   │
   ├─► CI (ci.yml) ............... lint · typecheck · tests · build
   │
   └─► Build & push (build-image.yml)
          │  runner ubuntu-24.04-arm  (le cluster est ARM64)
          ├─ docker build → ghcr.io/kaliouich/habit-game-saas:sha-<court>
          └─ réécrit app.image.tag dans values-production.yaml + committe
                 │
                 └─► ArgoCD détecte le commit
                        └─ helm template + apply → cluster
```

Le dépôt est la source de vérité : ce qui est écrit dans
`helm/habit-game/values-production.yaml` **est** ce qui tourne en production.

## Installation (une fois)

```bash
sudo kubectl apply -f argocd/application.yaml
```

Puis vérifier :
```bash
sudo kubectl get application habit-game -n argocd
sudo kubectl describe application habit-game -n argocd
```

## Opérations courantes

```bash
# État de synchronisation
sudo kubectl get application habit-game -n argocd \
  -o custom-columns=SYNC:.status.sync.status,HEALTH:.status.health.status

# Forcer une synchro sans attendre le polling (~3 min)
sudo kubectl patch application habit-game -n argocd --type merge \
  -p '{"operation":{"sync":{"revision":"main"}}}'

# Historique des déploiements (quel commit, quand)
sudo kubectl get application habit-game -n argocd \
  -o jsonpath='{range .status.history[*]}{.deployedAt}{"  "}{.revision}{"\n"}{end}'
```

## Rollback

Le rollback est un `git revert` : ArgoCD redéploie l'état du dépôt.

```bash
git revert <sha-du-commit-de-tag>
git push
```

Le tag étant un SHA immuable, l'image de la version précédente existe toujours
dans GHCR — le retour arrière est déterministe, contrairement à un `latest`.

Urgence (sans passer par git, à régulariser ensuite) :
```bash
sudo kubectl -n default set image deploy/habit-game \
  habit-game=ghcr.io/kaliouich/habit-game-saas:sha-<ancien>
```
⚠️ `selfHeal` ramènera l'état du dépôt à la prochaine synchro. C'est voulu :
un correctif à chaud doit finir dans git, sinon il disparaît au prochain
déploiement.

## Ce qu'ArgoCD ne gère PAS (volontairement)

| Ressource | Pourquoi |
|---|---|
| `habit-game-secrets` | Les secrets ne transitent jamais par git. Le chart le référence (`secrets.create: false`), il est créé hors GitOps. |
| PVC Postgres | Porte `helm.sh/resource-policy: keep` et `argocd.argoproj.io/sync-options: Delete=false`. Il contient la base : sa suppression doit être un acte délibéré, jamais un effet de bord d'un `prune`. |
| Migrations Prisma | Restent manuelles (`prisma migrate deploy`). Les automatiser demanderait un Job k8s avec une stratégie de rollback propre — pas fait, et à ne pas improviser. |

## Variables de build (GitHub → Settings → Variables)

`NEXT_PUBLIC_*` est figé **au build** par le compilateur Next : ces valeurs ne
peuvent pas être injectées au runtime par k8s (voir Dockerfile). Elles sont
donc passées en `--build-arg` depuis des *repository variables* (pas des
secrets : elles finissent dans le bundle JS servi au navigateur, elles sont
publiques par nature).

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` | `ca-pub-…` AdSense (web) |
| `NEXT_PUBLIC_ADMOB_ANDROID_BANNER_ID` | Slot bannière AdMob Android |
| `NEXT_PUBLIC_ADMOB_IOS_BANNER_ID` | Slot bannière AdMob iOS |

Vides = pas de pub servie, sans casser le rendu (voir `src/lib/ads.ts`).

## Secours si ArgoCD est indisponible

```bash
sudo KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm upgrade --install habit-game \
  ./helm/habit-game -f helm/habit-game/values-production.yaml
```
Le chart reste utilisable seul — ArgoCD ne fait que l'appliquer à ta place.
