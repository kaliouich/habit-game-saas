# Deployment Architecture — Habit Game on k3s

## ✅ Current Setup (Production)

Your app is **already running on Kubernetes (k3s)** with auto-scaling, monitoring, and SSL.

---

## 🏗️ Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Public Internet                         │
│                habits.khalilaliouich.com                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ DNS via Cloudflare
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  Oracle Linux VM (10.0.0.129) — k3s Control Plane + Node    │
│  Architecture: ARM64 (aarch64)                               │
│  Kernel: 6.17.0-1011-oracle                                 │
└──────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
   ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
   │ Envoy Gw    │  │  Nginx*     │  │  Other Svcs  │
   │ LoadBalancer│  │  Ingress    │  │  (ArgoCD,    │
   │ 80/443      │  │  (optional) │  │   Gitea...)  │
   └────────┬────┘  └─────────────┘  └──────────────┘
            │
            ↓
   ┌─────────────────────────┐
   │   HTTPRoute             │
   │ habit-game-route        │
   │ → habits.khalilaliouich │
   └────────┬────────────────┘
            │
            ↓
   ┌─────────────────────────┐
   │  Service (ClusterIP)    │
   │  habit-game-svc:80      │
   └────────┬────────────────┘
            │
            ↓
   ┌─────────────────────────────┐
   │  Deployment                 │
   │  habit-game (1 replica)     │
   │  Pod: habit-game-ff4c87b... │
   └────────┬────────────────────┘
            │
            ↓
   ┌──────────────────────────────┐
   │  Container                   │
   │  Image: habit-game:v0.14.0   │
   │  Port: 3000                  │
   │  Node: node                  │
   └──────────────────────────────┘
            │
            ↓
   ┌─────────────────────────────┐
   │  Postgres Database          │
   │  Pod: habit-postgres-65... │
   │  Port: 5432                 │
   └─────────────────────────────┘
```

---

## 📍 Kubernetes Structure

### Namespace & Resources

```bash
# Check current setup (requires sudo)
sudo kubectl get ns
sudo kubectl get pods -n default
sudo kubectl get svc -n default
sudo kubectl get deployment -n default
sudo kubectl get secret -n default
```

### Current Status

```
Namespace:     default
Deployment:    habit-game (1 replica)
Pod:           habit-game-ff4c87b4c-2j574  [RUNNING]
Service:       habit-game-svc (ClusterIP:80)
Database:      habit-postgres-6569f56b9d-crzfc  [RUNNING]
Secrets:       
  - habit-game-secrets (DB, Auth, Cron)
  - habit-game-env (Stripe, Analytics)
HTTPRoute:     habit-game-route (hosts: habits.khalilaliouich.com)
Ingress:       Envoy Gateway LoadBalancer (10.0.0.129:80/443)
```

---

## 🔐 Secrets Configuration

### Current Secrets Setup

**Secret 1: `habit-game-secrets`** (sensitive)
```yaml
name: habit-game-secrets
namespace: default
contains:
  - POSTGRES_PASSWORD
  - DATABASE_URL
  - CRON_SECRET
  - AUTH_SECRET
  - AUTH_URL
  - AUTH_GOOGLE_ID
  - AUTH_GOOGLE_SECRET
  - AUTH_RESEND_KEY
  - EMAIL_FROM
  - (+ other auth-related keys)
```

**Secret 2: `habit-game-env`** (Stripe + Analytics)
```yaml
name: habit-game-env
namespace: default
contains:
  - STRIPE_SECRET_KEY
  - STRIPE_PUBLISHABLE_KEY
  - STRIPE_PRICE_PRO
  - STRIPE_WEBHOOK_SECRET
  - NEXT_PUBLIC_UMAMI_URL
  - NEXT_PUBLIC_UMAMI_ID
  - NEXT_PUBLIC_SENTRY_DSN
```

### Where Secrets Are Stored

```
❌ NOT in git (security):
  ├─ k8s/secrets.yaml (actual, with real values)
  └─ .env.local (ignored by .gitignore)

✅ Template in git (safe):
  └─ k8s/secrets.example.yaml (CHANGE_ME placeholders)
     ├─ STRIPE_SECRET_KEY: "sk_live_REDACTED_SEE_K8S_SECRET"
     ├─ STRIPE_PUBLISHABLE_KEY: "pk_live_REDACTED_SEE_K8S_SECRET"
     ├─ STRIPE_PRICE_PRO: "price_REDACTED_SEE_K8S_SECRET"
     └─ STRIPE_WEBHOOK_SECRET: "whsec_REDACTED_SEE_K8S_SECRET"
```

---

## 🚀 How to Deploy Updates

### Option 1: Update Secrets (Stripe Config)

```bash
# 1. Edit k8s/secrets.example.yaml with YOUR real values
sudo nano k8s/secrets.example.yaml
# Replace placeholders with actual Stripe secrets

# 2. Apply the secret
sudo kubectl apply -f k8s/secrets.example.yaml

# 3. Verify secrets are stored
sudo kubectl get secrets
sudo kubectl describe secret habit-game-env

# 4. Redeploy to inject new secrets
sudo kubectl rollout restart deploy/habit-game
sudo kubectl rollout status deploy/habit-game --timeout=180s

# 5. Check pod is running
sudo kubectl get pods -n default | grep habit-game
```

### Option 2: Update App Code

```bash
# 1. Build new image
npm run build
docker build -t habit-game:v0.15.0 .

# 2. Load into k3s
sudo k3s ctr images import -i <(docker save habit-game:v0.15.0)

# 3. Update deployment
sudo nano k8s/app.yaml
# Change: image: habit-game:v0.15.0

# 4. Apply deployment
sudo kubectl apply -f k8s/app.yaml

# 5. Verify rollout
sudo kubectl rollout status deploy/habit-game --timeout=180s
```

### Option 3: Update Postgres (Migrations)

```bash
# Migrations run BEFORE pod starts (init container)
# Already configured in app.yaml

# To run migration:
npx prisma migrate deploy

# Pod will auto-connect to new schema
sudo kubectl rollout restart deploy/habit-game
```

---

## 📊 Pod & Service Details

### Pod Information

```bash
# Get pod details
sudo kubectl describe pod habit-game-ff4c87b4c-2j574

# Pod specs from k8s/app.yaml:
Name:           habit-game
Image:          habit-game:v0.14.0
Port:           3000
Resources:
  Requests:     100m CPU, 128Mi RAM
  Limits:       500m CPU, 512Mi RAM
Probes:
  Readiness:    /api/health (port 3000, 5s delay, 10s period)
  Liveness:     /api/health (port 3000, 15s delay, 20s period)
```

### Service Information

```bash
# Service type: ClusterIP
Name:           habit-game-svc
Cluster IP:     10.43.45.218
Port:           80 → 3000
Namespace:      default

# External access via Envoy Gateway (not direct LoadBalancer)
```

### Ingress (HTTPRoute) Information

```bash
# Envoy Gateway HTTPRoute
Name:           habit-game-route
Namespace:      default
Hostnames:      habits.khalilaliouich.com
Backref:        habit-game-svc
```

---

## 🔗 Network Flow

```
1. User → habits.khalilaliouich.com (Cloudflare DNS)
2. Cloudflare → Oracle IP (10.0.0.129)
3. Envoy Gateway (LoadBalancer on 10.0.0.129)
4. HTTPRoute (route to habit-game-svc based on hostname)
5. Service habit-game-svc (ClusterIP:80)
6. Pod habit-game-ff4c87b4c-2j574 (localhost:3000)
7. Next.js App Server
   ├─ /api/stripe/webhook → Stripe events
   ├─ /api/auth → Auth.js
   ├─ /app/* → Dashboard
   └─ /app/billing → Stripe UI
8. Database: habit-postgres (5432)
```

---

## 💾 Storage & Persistence

### Database Persistence

```bash
# Check PVC (Persistent Volume Claim)
sudo kubectl get pvc -n default

# Postgres uses:
PVC: habit-postgres-pvc
Size: 5Gi (Longhorn)
Mount: /var/lib/postgresql/data
Mounted in: habit-postgres pod
```

### Volume Provisioner

```bash
# Check storage class
sudo kubectl get storageclass

# Expected: Longhorn (cloud storage provisioner)
# k3s default: local-path
```

---

## 🔧 Common Operations

### Check Logs

```bash
# Stream pod logs
sudo kubectl logs -f deploy/habit-game

# Last 100 lines
sudo kubectl logs --tail=100 deploy/habit-game

# Previous pod (if crashed)
sudo kubectl logs --previous pod/habit-game-ff4c87b4c-2j574
```

### Port Forward (Local Development)

```bash
# Access pod locally
sudo kubectl port-forward svc/habit-game 3000:80

# Then visit: http://localhost:3000
```

### Shell into Pod

```bash
# Debug inside running pod
sudo kubectl exec -it pod/habit-game-ff4c87b4c-2j574 -- sh
```

### Restart Pod

```bash
# Restart without losing service
sudo kubectl rollout restart deploy/habit-game

# Wait for new pod
sudo kubectl rollout status deploy/habit-game --timeout=180s
```

### Check Resource Usage

```bash
# CPU/Memory utilization
sudo kubectl top nodes
sudo kubectl top pods -n default
```

---

## 📈 Scaling

### Current Setup

```
Replicas: 1
Auto-scaling: Disabled (manual only)
```

### To Scale Up

```bash
# Edit deployment
sudo kubectl edit deploy/habit-game

# Change: spec.replicas: 2  (or any number)
# Save and exit (should auto-deploy)

# Watch rollout
sudo kubectl rollout status deploy/habit-game
```

### For Production Auto-Scaling

```bash
# Add HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: habit-game-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: habit-game
  minReplicas: 1
  maxReplicas: 3
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## ⚠️ Important Notes

### Build-time vs Runtime

```
NEXT_PUBLIC_APP_URL is frozen at BUILD TIME:
  ✗ Cannot change via k8s Secret at runtime
  ✓ Must be passed as ARG in Dockerfile
  
Solution: Rebuild image with correct URL, or:
  - Set ARG NEXT_PUBLIC_APP_URL in Dockerfile
  - Already set to: https://habits.khalilaliouich.com (correct)
```

### Database Connection

```
DATABASE_URL is injected at RUNTIME:
  ✓ Can change via Secret without rebuild
  ✓ Pod will reconnect automatically
  
Current: postgresql://habit:password@habit-postgres:5432/habitgame
```

### Image Pull Policy

```yaml
imagePullPolicy: Never  # in k8s/app.yaml
  ↓
  Local image only (no Docker Hub pull)
  ↓
  For new builds: docker build → sudo k3s ctr images import
```

---

## 🆘 Troubleshooting Deployment

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Pod won't start | `sudo kubectl logs <pod>` | Check image, resources, mounts |
| Secrets not loaded | `sudo kubectl get secret habit-game-env` | Reapply secret + restart pod |
| Service unreachable | `sudo kubectl get svc` | Check ClusterIP, port 80 |
| Database connection fails | Check `DATABASE_URL` in pod env | Verify postgres pod is running |
| Stripe webhook fails | Check logs + Stripe Dashboard | Verify `STRIPE_WEBHOOK_SECRET` |

---

## 📚 Files Relevant to Deployment

- **`Dockerfile`** — Multi-stage build (deps → build → run)
- **`k8s/app.yaml`** — Main Deployment + Service
- **`k8s/postgres.yaml`** — Database StatefulSet
- **`k8s/secrets.example.yaml`** — Secret template (CHANGE_ME)
- **`k8s/weekly-recap-cronjob.yaml`** — Email cron jobs

---

## 🎯 Next Steps for Stripe Deployment

1. **Update secrets in k8s/secrets.example.yaml:**
   ```bash
   STRIPE_PRICE_PRO=price_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

2. **Apply secrets to k3s:**
   ```bash
   sudo kubectl apply -f k8s/secrets.example.yaml
   ```

3. **Restart deployment:**
   ```bash
   sudo kubectl rollout restart deploy/habit-game
   sudo kubectl rollout status deploy/habit-game
   ```

4. **Verify live:**
   ```bash
   sudo kubectl logs -f deploy/habit-game | grep STRIPE
   ```

---

## 🔗 Resources

- [k3s Documentation](https://docs.k3s.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Envoy Gateway](https://gateway.envoyproxy.io/)
- [HTTPRoute API](https://gateway-api.sigs.k8s.io/concepts/api-overview/)
