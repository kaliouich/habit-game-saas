# Stripe Integration Setup — Habit Game Pro (€0.99/month) + Donations

## ✅ Code Ready
- [x] Prisma schema updated (`stripeSubscriptionId`, `stripePriceId`)
- [x] Webhook handler syncs subscription data
- [x] Server actions (`createCheckoutSession`, `createDonationCheckoutSession` implemented)
- [x] Subscription comparison table component
- [x] Ad components (AdBanner, AdSidebar) for FREE plan
- [x] Billing page updated with €0.99/month messaging
- [x] Database migration applied
- [x] Donations via price_data (flexible amounts)

---

## 🎯 Stripe Dashboard Configuration

### **PART 1: SUBSCRIPTION PRODUCT (Pro Plan)**

#### Step 1.1: Create Pro Product
Go to [Dashboard → Products](https://dashboard.stripe.com/products)
- Click **"Create product"**
- **Name:** `Habit Pro`
- **Description:** (optional) "Unlimited habits, unlimited history, no ads"
- Toggle **Recurring** (ON)
- Click **"Add price"**

#### Step 1.2: Add Monthly Price
- **Price:** `0.99`
- **Currency:** `EUR`
- **Billing period:** Monthly
- **Lookup key:** `pro_monthly` ← **IMPORTANT** (for future migrations)
- Click **"Save product"**

**→ COPY THE PRICE ID** (e.g., `price_1Xxxxxxxxxxxxxxxxxx`)

---

### **PART 2: WEBHOOK SETUP**

Go to [Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
- Click **"Add endpoint"**
- **URL:** `https://habits.khalilaliouich.com/api/stripe/webhook`
- **Select events to listen to:**
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.created`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
  - ✅ `charge.succeeded` (for donations tracking — optional)
  - ✅ `invoice.payment_failed` (optional, for retry notifications)
- Click **"Add endpoint"**

**→ COPY THE SIGNING SECRET** (e.g., `whsec_1Xxxxxxxxxxxxxxxxxx`)

---

### **PART 3: BANK ACCOUNT & PAYOUTS**

Go to [Dashboard → Settings → Business profile](https://dashboard.stripe.com/settings/business)
- Verify your business info is correct

Go to [Dashboard → Settings → Payout settings](https://dashboard.stripe.com/settings/payouts)
- **Bank account:** Click "Add bank account"
  - Select country: France
  - Enter your **IBAN** (starts with FR)
  - Account holder name
  - Click "Add bank account"
- **Automatic payouts:** (should be enabled by default)
  - Schedule: Daily (recommended) / Weekly / Monthly
  - Your money transfers automatically every day to your bank account

**💡 NOTE:** After first charge, Stripe holds funds for 7 days (fraud prevention), then transfers automatically.

---

### **PART 4: API KEYS**

Go to [Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)
- You should already have:
  - `STRIPE_SECRET_KEY` (starts with `sk_live_` or `sk_test_`)
  - `STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_` or `pk_test_`)

**Status check:**
```bash
echo $STRIPE_SECRET_KEY
echo $STRIPE_PUBLISHABLE_KEY
# Both should be populated (not empty)
```

---

## 🔧 Environment Variables to Set

### Local Development (`.env.local`)
```env
# Already set (verify):
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Add these from Stripe Dashboard:
STRIPE_PRICE_PRO=price_1Xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_1Xxxxxxxxxxxxxxxxxx
```

### Production (k8s Secret)
Update `k8s/secrets.yaml`:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: habit-game-env
type: Opaque
stringData:
  STRIPE_SECRET_KEY: "sk_live_xxxxx"
  STRIPE_PUBLISHABLE_KEY: "pk_live_xxxxx"
  STRIPE_PRICE_PRO: "price_1Xxxxxxxxxxxxxxxxxx"
  STRIPE_WEBHOOK_SECRET: "whsec_1Xxxxxxxxxxxxxxxxxx"
```

Then deploy:
```bash
kubectl apply -f k8s/secrets.yaml
kubectl rollout restart deploy/habit-game
```

---

## 💳 Donations (Option A: Flexible Price via price_data)

**Current implementation:** Donations use dynamic `price_data` (no Product needed)

### How it works:
1. User enters custom amount (€1 - €1,000)
2. Stripe Checkout creates a one-time payment
3. Money goes to your Stripe account (same as subscriptions)
4. Automatically transferred to your bank account

### Code location:
```typescript
// src/lib/actions/billing.ts
export async function createDonationCheckoutSession(formData: FormData)
```

### Configuration:
```typescript
// src/lib/config.ts (adjust if needed)
export const DONATION_MIN = 1;    // €1 minimum
export const DONATION_MAX = 1000; // €1000 maximum
```

**No additional Stripe setup required for donations!** ✅

---

## 🧪 Testing Locally

### 1. Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl https://files.stripe.com/stripe-cli/install.sh | bash

# Windows
scoop install stripe
```

### 2. Authenticate with Stripe
```bash
stripe login
# Opens browser to authenticate
```

### 3. Forward Stripe webhooks to localhost
Open a terminal and run:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**→ COPY THE SIGNING SECRET** displayed (e.g., `whsec_test_xxxxx`)

Add to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx
```

### 4. Run dev server in another terminal
```bash
npm run dev
```

### 5. Test Pro Upgrade
1. Go to http://localhost:3000/app/billing
2. Click **"Upgrade to Pro — €0.99/month"**
3. Use test card: **`4242 4242 4242 4242`**
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
4. Complete checkout
5. Check webhook output in stripe CLI terminal
6. Verify in database:
   ```bash
   psql $DATABASE_URL
   SELECT email, plan, planStatus FROM "User" 
   WHERE email='test@example.com';
   ```
   Should show: `plan='PRO'`, `planStatus='active'`

### 6. Test Donation
1. Stay on http://localhost:3000/app/billing
2. Scroll to **"Support this project"**
3. Enter amount (e.g., €10)
4. Use same test card
5. Verify webhook: `charge.succeeded` event

---

## 🧮 Stripe Fees & Earnings

### Fee Structure
- **Subscriptions (Pro plan):** 2.9% + €0.30 per transaction
  - You receive: €0.99 × (1 - 0.029) - €0.30 = **€0.66/month per subscriber**
- **One-time payments (Donations):** 2.9% + €0.30 per transaction
  - €10 donation: €10 × (1 - 0.029) - €0.30 = **€9.41**

### Payout Timeline
1. User pays → Stripe receives money
2. First 7 days: Stripe holds funds (fraud prevention)
3. Day 8+: Automatic transfer to your bank account (daily/weekly/monthly based on settings)
4. Bank receives funds: 1-2 business days

---

## ✅ Verification Checklist

### Before Going Live:

**Stripe Dashboard:**
- [ ] Pro product created with €0.99/month price
- [ ] Price ID copied to `.env` + k8s Secret
- [ ] Webhook endpoint added + secret copied
- [ ] Bank account added (IBAN)
- [ ] Payout schedule set (daily recommended)

**Code:**
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `STRIPE_PRICE_PRO` env var set locally
- [ ] `STRIPE_WEBHOOK_SECRET` env var set locally
- [ ] Tested locally with Stripe CLI

**Production:**
- [ ] k8s secrets updated + deployed
- [ ] Pod restarted: `kubectl rollout restart deploy/habit-game`
- [ ] Verified webhook delivery in Stripe Dashboard → Events

**Live Testing:**
- [ ] Can see "Upgrade to Pro" button on https://habits.khalilaliouich.com/app/billing
- [ ] Clicking redirects to Stripe Checkout (production)
- [ ] Test payment (real or test card works)
- [ ] User marked as PRO in database
- [ ] No ads displayed after upgrade
- [ ] Webhook delivers event in Stripe Dashboard

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| "STRIPE_NO_URL" | `STRIPE_PRICE_PRO` is empty. Check `.env` + k8s Secret |
| Webhook not delivering | Check URL is public (not localhost), verify signing secret |
| User still sees ads | Clear cache, hard refresh (Ctrl+Shift+R), restart dev server |
| "invalid_request_error" | Webhook secret doesn't match. Regenerate in Stripe Dashboard |
| Bank transfer not received | Wait 7 days (fraud hold), check payout settings, verify IBAN |

---

## 🔗 Quick Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [API Keys](https://dashboard.stripe.com/apikeys)
- [Products](https://dashboard.stripe.com/products)
- [Webhooks](https://dashboard.stripe.com/webhooks)
- [Events Log](https://dashboard.stripe.com/events)
- [Test Cards](https://stripe.com/docs/testing)
- [Payout Settings](https://dashboard.stripe.com/settings/payouts)

---

## 💡 Pricing Summary

| Plan | Price | Habits | History | Ads | Export | Trial |
|------|-------|--------|---------|-----|--------|-------|
| **Free** | €0 | 3/mo | Current mo | ✅ Yes | ✗ | — |
| **Pro** | €0.99/mo | 24/mo | Unlimited | ✗ No | ✅ | 14 days |
| **Donation** | Custom | N/A | N/A | N/A | N/A | One-time |


price_REDACTED_SEE_K8S_SECRET
whsec_REDACTED_SEE_K8S_SECRET
