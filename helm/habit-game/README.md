# Helm chart — habit-game

Chart pour l'intégralité du stack : app Next.js (Deployment + Service +
HTTPRoute), PostgreSQL géré par l'opérateur CloudNativePG, CronJob récap
hebdomadaire. Remplace les `kubectl apply -f k8s/*.yaml` historiques (voir
[`../k8s/README.md`](../k8s/README.md)).

## Structure

```
helm/habit-game/
├── Chart.yaml
├── values.yaml                    # défauts (dev-friendly)
├── values-production.yaml         # overrides prod (hostname, tag image, storage)
├── secrets.local.yaml.example     # template pour secrets.create=true (optionnel)
└── templates/
    ├── _helpers.tpl               # noms/labels partagés
    ├── deployment.yaml            # app Next.js
    ├── service.yaml               # habit-game-svc
    ├── httproute.yaml             # Envoy Gateway → habits.khalilaliouich.com
    ├── database.yaml              # Cluster CloudNativePG, PodMonitor, alertes
    ├── cronjob-weekly-recap.yaml
    ├── secret.yaml                # optionnel, si secrets.create=true
    └── NOTES.txt
```

## Base de données (CloudNativePG)

Prérequis : l'opérateur CloudNativePG installé dans le cluster. `templates/database.yaml`
déclare le cluster `habit-db` (1 primaire, 2 réplicas, réplication synchrone). L'opérateur
crée les Services `habit-db-rw` / `-ro` / `-r` et le Secret `habit-db-app` (clé `uri`).

```bash
kubectl get cluster habit-db -n default
```

Migration manuelle (toujours additive, avant de pousser le code). `SET ROLE habit` est
nécessaire : sans lui, les objets appartiendraient à `postgres` et l'application n'y
aurait pas accès.

```bash
kubectl exec -i -n default $(kubectl get pod -n default -o name -l cnpg.io/cluster=habit-db,cnpg.io/instanceRole=primary) -c postgres -- psql -d habitgame -v ON_ERROR_STOP=1 --single-transaction -c "SET ROLE habit" -f - < prisma/migrations/<nom>/migration.sql
```

Il faut ensuite inscrire la migration dans `_prisma_migrations`. Pas de stockage objet :
la sauvegarde est un `pg_dump` nocturne, sans restauration à un instant précis. Un seul
nœud : la bascule protège d'une panne de pod, pas de la perte de la machine.

## Modèle de secrets

Par défaut (`secrets.create: false`), le chart **référence** un Secret k8s
`habit-game-secrets` déjà présent dans le cluster — il ne le crée pas et ne
committe jamais de valeur réelle. C'est le mode utilisé en prod actuellement :

```bash
kubectl get secret habit-game-secrets -o yaml   # doit déjà exister
```

Pour laisser Helm créer le secret lui-même (utile en dev/staging), copier
`secrets.local.yaml.example` → `secrets.local.yaml` (gitignored), remplir les
vraies valeurs, et passer `secrets.create: true` :

```bash
cp helm/habit-game/secrets.local.yaml.example helm/habit-game/secrets.local.yaml
# éditer secrets.local.yaml avec les vraies valeurs
helm upgrade --install habit-game ./helm/habit-game \
  -f helm/habit-game/values-production.yaml \
  -f helm/habit-game/secrets.local.yaml
```

## Déploiement (prod actuelle)

```bash
# Sur le nœud k3s (nécessite sudo pour lire /etc/rancher/k3s/k3s.yaml)
sudo KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm upgrade --install habit-game \
  ./helm/habit-game -f helm/habit-game/values-production.yaml
```

### Bumper l'image après un nouveau build

```bash
# 1. build + import comme avant
sudo docker build -t habit-game:vX.Y.Z .
sudo sh -c "docker save habit-game:vX.Y.Z | k3s ctr images import -"

# 2. bump le tag dans values-production.yaml (app.image.tag), puis :
sudo KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm upgrade habit-game \
  ./helm/habit-game -f helm/habit-game/values-production.yaml
```

### Vérifier / rollback

```bash
sudo KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm list
sudo KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm history habit-game
sudo KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm rollback habit-game <REVISION>
```

## Paramètres clés (`values.yaml`)

| Clé | Rôle |
|---|---|
| `app.image.tag` | Tag de l'image `habit-game` importée dans k3s |
| `app.replicas` | Nombre de pods app |
| `database.enabled` | `false` pour brancher une DB externe (RDS, etc.) |
| `route.enabled` / `route.hostname` | HTTPRoute Envoy Gateway |
| `secrets.create` / `secrets.existingSecretName` | Voir section secrets ci-dessus |
| `weeklyRecap.enabled` / `.schedule` | CronJob email récap |

## Compatibilité avec l'existant

Les noms de ressources générés sont **identiques** à ceux créés par
`kubectl apply -f k8s/*.yaml` (`habit-game`, `habit-game-svc`,
`habit-game-route`,
`habit-game-weekly-recap`) — le chart a été conçu pour **adopter** les
ressources déjà en cluster sans recréer aucun pod (voir
`meta.helm.sh/release-name` annotations posées lors de la migration du
2026-08-07).
