# ⚠️ Legacy — remplacé par `helm/habit-game/`

Ces manifests (`app.yaml`, `postgres.yaml`, `weekly-recap-cronjob.yaml`,
`secrets.example.yaml`) ont servi au déploiement initial via `kubectl apply -f`.

**Depuis le 2026-08-07, le cluster est géré par Helm** (`helm/habit-game/`) —
la release `habit-game` a adopté ces mêmes ressources (mêmes noms, mêmes
selectors) sans downtime. **Ne plus faire `kubectl apply -f k8s/*.yaml`** :
ça réintroduirait des ressources sans les annotations `meta.helm.sh/*`
qu'Helm utilise pour savoir ce qu'il possède, et la prochaine
`helm upgrade` pourrait échouer ou dupliquer des objets.

**Déploiement désormais :**
```bash
helm upgrade --install habit-game ./helm/habit-game \
  -f helm/habit-game/values-production.yaml
```

Voir [`helm/habit-game/README.md`](../helm/habit-game/README.md).

Ce dossier est conservé pour référence historique / rollback d'urgence
uniquement (`kubectl apply` direct si Helm est indisponible).
