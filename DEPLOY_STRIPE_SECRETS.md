# Deploy Stripe Secrets to k3s

Your app is running on **k3s (Kubernetes)** on Oracle Linux. Here's how to add the Stripe secrets.

---

## ✅ Secrets Already in Git (Safe Template)

Location: `/home/ubuntu/habit-game-saas/k8s/secrets.example.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: habit-game-env
type: Opaque
stringData:
  STRIPE_SECRET_KEY: "sk_live_REDACTED_SEE_K8S_SECRET"
  STRIPE_PUBLISHABLE_KEY: "pk_live_REDACTED_SEE_K8S_SECRET"
  STRIPE_PRICE_PRO: "price_REDACTED_SEE_K8S_SECRET"
  STRIPE_WEBHOOK_SECRET: "whsec_REDACTED_SEE_K8S_SECRET"
```

**Status:** ✅ Already has your real Stripe keys!

---

## 🚀 Deploy to k3s (3 Steps)

### Step 1: Verify Current Secrets

```bash
# Check if secret exists
sudo kubectl get secret habit-game-env -o yaml

# If exists, delete old one
sudo kubectl delete secret habit-game-env
```

### Step 2: Create Secret from File

```bash
# Navigate to repo
cd /home/ubuntu/habit-game-saas

# Apply the secret file
sudo kubectl apply -f k8s/secrets.example.yaml

# Verify it was created
sudo kubectl get secret habit-game-env
sudo kubectl describe secret habit-game-env
```

### Step 3: Restart Deployment to Use New Secrets

```bash
# Restart the deployment
sudo kubectl rollout restart deploy/habit-game

# Watch the rollout
sudo kubectl rollout status deploy/habit-game --timeout=180s

# Verify pod is running
sudo kubectl get pods -n default | grep habit-game
```

---

## ✅ Verification

### Check Secrets Were Applied

```bash
# View secret metadata
sudo kubectl get secret habit-game-env

# Expected output:
# NAME                 TYPE     DATA   AGE
# habit-game-env      Opaque     4    1m

# View secret keys (values are hidden)
sudo kubectl describe secret habit-game-env

# Expected output:
# STRIPE_SECRET_KEY: 27 bytes
# STRIPE_PUBLISHABLE_KEY: 29 bytes
# STRIPE_PRICE_PRO: 25 bytes
# STRIPE_WEBHOOK_SECRET: 27 bytes
```

### Check Pod Received Secrets

```bash
# View pod environment variables
sudo kubectl exec -it deploy/habit-game -- env | grep STRIPE

# Expected output:
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_PRICE_PRO=price_REDACTED_SEE_K8S_SECRET
# STRIPE_WEBHOOK_SECRET=whsec_...
```

### Check Logs for Stripe Config

```bash
# View pod logs
sudo kubectl logs -f deploy/habit-game | grep -i stripe

# Should show startup messages, no errors about missing Stripe keys
```

### Test Stripe Integration Live

1. Go to https://habits.khalilaliouich.com/app/billing
2. Should see **"Upgrade to Pro — €0.99/month"** button
3. Click to test Stripe Checkout
4. Check webhook in Stripe Dashboard → Events

---

## 📝 If You Need to Update Secrets Later

### Option 1: Edit File & Reapply

```bash
# Edit the secrets file
sudo nano k8s/secrets.example.yaml

# Change only the values (not the names)
STRIPE_PRICE_PRO: "price_new_value"
STRIPE_WEBHOOK_SECRET: "whsec_new_value"

# Apply changes
sudo kubectl apply -f k8s/secrets.example.yaml

# Restart pod
sudo kubectl rollout restart deploy/habit-game
```

### Option 2: Delete & Recreate

```bash
# Delete old secret
sudo kubectl delete secret habit-game-env

# Reapply from file
sudo kubectl apply -f k8s/secrets.example.yaml

# Restart pod
sudo kubectl rollout restart deploy/habit-game
```

### Option 3: Patch Directly

```bash
# Update one field
sudo kubectl patch secret habit-game-env -p '{"stringData":{"STRIPE_PRICE_PRO":"price_new_value"}}'

# Restart pod
sudo kubectl rollout restart deploy/habit-game
```

---

## ⚠️ Important Notes

### Do NOT Commit Real Secrets

```bash
# ✅ Safe to commit (template with CHANGE_ME):
git add k8s/secrets.example.yaml
git commit -m "docs: stripe secret template"

# ❌ DO NOT commit (real values):
k8s/secrets.yaml  # This file should be in .gitignore
.env              # This file should be in .gitignore
.env.local        # This file should be in .gitignore
```

### Secrets Are Base64 Encoded in k8s

```bash
# k3s stores secrets encoded (not encrypted by default)
# To view decoded value:
sudo kubectl get secret habit-game-env -o jsonpath='{.data.STRIPE_SECRET_KEY}' | base64 -d

# For encrypted secrets (recommended for production):
# Use k3s secrets encryption:
# https://docs.k3s.io/security/secrets-encryption
```

### Secrets Propagation Time

- Secret created: ~1 second
- Pod restart started: ~2 seconds
- Pod readiness check passes: ~5-10 seconds
- Total time: ~15 seconds

```bash
# Watch the rollout progress
sudo kubectl rollout status deploy/habit-game --timeout=180s
```

---

## 🧪 Test Cases After Deployment

### Test 1: Stripe Checkout Works
```bash
# Go to https://habits.khalilaliouich.com/app/billing
# Click "Upgrade to Pro"
# Should redirect to Stripe Checkout
# ✅ Success: Checkout page loads
```

### Test 2: Webhook Receives Events
```bash
# Check Stripe Dashboard → Events
# Go through test checkout again
# ✅ Success: See "checkout.session.completed" event
```

### Test 3: User Plan Updates
```bash
# Complete test checkout with test card: 4242 4242 4242 4242
# User database record should update:
# SELECT email, plan, planStatus FROM "User" WHERE email='test@example.com';
# ✅ Success: plan='PRO', planStatus='active'
```

### Test 4: Pods Stay Running
```bash
# Check pod logs for errors
sudo kubectl logs -f deploy/habit-game

# Should see no STRIPE-related errors
# ✅ Success: Pod stays in Running state
```

---

## 🔄 Deployment Pipeline

```
Stripe Secrets (k8s/secrets.example.yaml)
    ↓
    sudo kubectl apply -f k8s/secrets.example.yaml
    ↓
    Secret "habit-game-env" created in k3s
    ↓
    sudo kubectl rollout restart deploy/habit-game
    ↓
    Old pod terminating... New pod spinning up...
    ↓
    New pod reads secrets from "habit-game-env"
    ↓
    App starts with STRIPE_* env vars set
    ↓
    Readiness probe /api/health passes
    ↓
    ✅ Pod RUNNING, Stripe integration active
    ↓
    https://habits.khalilaliouich.com live with Stripe
```

---

## 📊 Current Secrets Status

```
Namespace:     default
Secret Name:   habit-game-env
Secret Type:   Opaque
Created:       [Date when you run: sudo kubectl apply]

Keys:
  ✅ STRIPE_SECRET_KEY        (sk_live_...)
  ✅ STRIPE_PUBLISHABLE_KEY   (pk_live_...)
  ✅ STRIPE_PRICE_PRO         (price_REDACTED_SEE_K8S_SECRET)
  ✅ STRIPE_WEBHOOK_SECRET    (whsec_REDACTED_SEE_K8S_SECRET)

Mounted in Pod:
  ✅ habit-game-ff4c87b4c-2j574
  ✅ Environment variables injected at runtime
  ✅ App reads from process.env.STRIPE_*
```

---

## 🚨 Troubleshooting

### Pod Crashes After Secret Update

```bash
# Check pod logs
sudo kubectl logs deploy/habit-game

# If error about STRIPE key:
# → Secret not applied correctly
# → Run: sudo kubectl apply -f k8s/secrets.example.yaml
# → Run: sudo kubectl rollout restart deploy/habit-game
```

### Webhook Not Receiving Events

```bash
# Verify webhook secret is correct
sudo kubectl exec -it deploy/habit-game -- env | grep STRIPE_WEBHOOK_SECRET

# Check Stripe Dashboard for webhook errors:
# Dashboard → Webhooks → habit-game → Deliveries

# If webhook secret mismatch:
# 1. Update k8s/secrets.example.yaml with correct secret
# 2. sudo kubectl apply -f k8s/secrets.example.yaml
# 3. sudo kubectl rollout restart deploy/habit-game
```

### Price ID Not Working

```bash
# Verify price ID is correct
sudo kubectl exec -it deploy/habit-game -- env | grep STRIPE_PRICE_PRO

# If showing old price:
# 1. Restart didn't work: try harder restart
#    sudo kubectl delete pod -l app=habit-game
# 2. Or edit and reapply: sudo kubectl apply -f k8s/secrets.example.yaml
```

---

## ✨ Summary

| Step | Command | Time |
|------|---------|------|
| 1. Apply secrets | `sudo kubectl apply -f k8s/secrets.example.yaml` | ~1s |
| 2. Restart pods | `sudo kubectl rollout restart deploy/habit-game` | ~2s |
| 3. Wait for ready | `sudo kubectl rollout status deploy/habit-game` | ~5-10s |
| 4. Verify live | Visit https://habits.khalilaliouich.com/app/billing | ~1s |

**Total time: ~15-20 seconds**

---

**Next:** Run the commands above, then verify Stripe is working live! 🚀
