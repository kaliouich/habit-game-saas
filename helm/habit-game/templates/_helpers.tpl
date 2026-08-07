{{/*
Nom court utilisé par les labels/selectors — garde app.name tel quel (habit-game)
plutôt que Chart.Name, pour rester compatible avec les manifests kubectl existants
(mêmes labels app: habit-game) lors d'une migration sans downtime.
*/}}
{{- define "habit-game.name" -}}
{{- .Values.app.name | default .Chart.Name -}}
{{- end -}}

{{/*
Nom fixe "habit-postgres" (pas "<app.name>-postgres") pour matcher le Service/
Deployment déjà en place dans le cluster (créés par k8s/postgres.yaml) — la
DATABASE_URL existante dans le Secret pointe sur "habit-postgres:5432", une
adoption Helm (helm install sur des ressources kubectl-applied) doit produire
des noms identiques.
*/}}
{{- define "habit-game.postgresName" -}}
habit-postgres
{{- end -}}

{{- define "habit-game.labels" -}}
app.kubernetes.io/name: {{ include "habit-game.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{/*
Le Deployment existant (kubectl apply) utilise le selector app: habit-game — on
le garde identique pour permettre un `helm adopt` (import) sans recréer le pod.
*/}}
{{- define "habit-game.selectorLabels" -}}
app: {{ include "habit-game.name" . }}
{{- end -}}

{{- define "habit-game.secretName" -}}
{{- if .Values.secrets.create -}}
{{- printf "%s-secrets" (include "habit-game.name" .) -}}
{{- else -}}
{{- .Values.secrets.existingSecretName -}}
{{- end -}}
{{- end -}}
