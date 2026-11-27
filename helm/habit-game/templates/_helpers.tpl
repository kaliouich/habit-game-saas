{{/*
Nom court utilisé par les labels/selectors — garde app.name tel quel (habit-game)
plutôt que Chart.Name, pour rester compatible avec les manifests kubectl existants
(mêmes labels app: habit-game) lors d'une migration sans downtime.
*/}}
{{- define "habit-game.name" -}}
{{- .Values.app.name | default .Chart.Name -}}
{{- end -}}

{{/*
Nom du service Valkey dédié au rate limiter (voir templates/valkey.yaml) —
nom fixe "habit-valkey".
*/}}
{{- define "habit-game.valkeyName" -}}
habit-valkey
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
