# ✅ Stripe Integration — Ready to Work

**Code is 100% complete.** You need ~10 minutes of Stripe dashboard configuration.

---

## 🎯 Your Todo: 4 Clicks on Stripe

### **#1: Create Pro Product**
Stripe Dashboard → Products → Create product
```
Name: Habit Pro
Billing: Recurring (toggle ON)
Price: 0.99 EUR
Billing period: Monthly
Lookup key: pro_monthly
Save
→ Copy Price ID (looks like: price_1Xxxxxxxxxxxxxxxxxx)
```

### **#2: Add Bank Account**
Stripe Dashboard → Settings → Payout settings
```
Add bank account
Country: France
IBAN: [your account]
Save
→ Money will auto-transfer daily to your bank after this
```

### **#3: Create Webhook**
Stripe Dashboard → Webhooks → Add endpoint
```
URL: https://habits.khalilaliouich.com/api/stripe/webhook
Events: 
  ✅ checkout.session.completed
  ✅ customer.subscription.created
  ✅ customer.subscription.updated
  ✅ customer.subscription.deleted
  ✅ charge.succeeded
Save
→ Copy Signing Secret (looks like: whsec_1Xxxxxxxxxxxxxxxxxx)
```

### **#4: Store the 2 IDs**
Add to `.env.local` (local dev):
```env
STRIPE_PRICE_PRO=price_1Xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_1Xxxxxxxxxxxxxxxxxx
```

And add to `k8s/secrets.yaml` (production) — see below.

---

## 🚀 Deploy

### Local Test First (Optional but Recommended)
```bash
# Terminal 1: Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the secret from output → add to .env.local

# Terminal 2: Start dev server
npm run dev

# Terminal 3: Test
# Go to http://localhost:3000/app/billing
# Click "Upgrade to Pro"
# Use test card: 4242 4242 4242 4242
# Should succeed, user marked PRO
```

### Deploy to Production
```bash
# 1. Update k8s/secrets.yaml
cat >> k8s/secrets.yaml << 'EOF'
---
apiVersion: v1
kind: Secret
metadata:
  name: habit-game-env
type: Opaque
stringData:
  STRIPE_PRICE_PRO: "price_1Xxxxxxxxxxxxxxxxxx"
  STRIPE_WEBHOOK_SECRET: "whsec_1Xxxxxxxxxxxxxxxxxx"
EOF

# 2. Apply and redeploy
kubectl apply -f k8s/secrets.yaml
kubectl rollout restart deploy/habit-game
kubectl rollout status deploy/habit-game --timeout=180s

# 3. Verify
# Go to https://habits.khalilaliouich.com/app/billing
# Should see "Upgrade to Pro — €0.99/month" button
```

---

## ✨ What You Now Have

### For Users
- ✅ **Free Plan:** 3 habits, ads shown, current month only
- ✅ **Pro Plan:** €0.99/month, 24 habits, no ads, unlimited history
- ✅ **Donations:** Flexible amounts (€1-€1,000), one-time
- ✅ **14-day trial:** When upgrading to Pro
- ✅ **Comparison table:** Shows Free vs Pro on billing page

### For You
- ✅ **Payments:** Via Stripe Checkout (simple, secure)
- ✅ **Payouts:** Auto-transfer daily to your bank (after 7-day hold)
- ✅ **Fees:** 2.9% + €0.30 per transaction
- ✅ **Earnings per subscriber:** ~€0.66/month (after Stripe fees)
- ✅ **Tracking:** All in Stripe Dashboard

---

## 💡 Key Details

| Question | Answer |
|----------|--------|
| **Do I need to manage invoices?** | No. Stripe handles everything. |
| **Do I need to send receipts?** | Stripe sends them automatically. |
| **What if a payment fails?** | Stripe retries automatically. |
| **How do I refund a donation?** | Stripe Dashboard → Charges → Refund. |
| **How do I cancel a subscription?** | User clicks "Manage subscription" → cancel, or Stripe Dashboard. |
| **When do I get paid?** | 7 days after payment + daily transfers = ~10 days total. |
| **Do I need to track donations in DB?** | No (optional for Phase 2). |

---

## 📚 Full Docs

- **`STRIPE_SETUP.md`** — detailed configuration guide
- **`STRIPE_QUICK_START.md`** — quick reference
- **`DONATIONS_TRACKING.md`** — donation management
- **`INTEGRATION_CHECKLIST.md`** — pre-launch checklist

---

## 🧪 Test Scenarios

### Scenario 1: Free user upgrades to Pro
1. Login as FREE user
2. Go to `/app/billing`
3. Click "Upgrade to Pro"
4. Use card: `4242 4242 4242 4242`
5. ✅ Should be marked PRO, no ads on dashboard

### Scenario 2: Pro user sees no ads
1. Login as PRO user
2. Go to `/app`
3. Dashboard should have NO banner at top (AdBanner hidden)
4. Dashboard should have NO sidebar ads (AdSidebar hidden)
5. ✅ Verify in database: `SELECT plan FROM "User"` = "PRO"

### Scenario 3: Free user sees ads
1. Login as FREE user
2. Go to `/app`
3. Should see ad banner (728×90) at top
4. Should see ad sidebar (300×600) on right
5. ✅ Ads appear for FREE users

### Scenario 4: User donates
1. Go to `/app/billing`
2. Scroll to "Support this project"
3. Enter €10
4. Use card: `4242 4242 4242 4242`
5. ✅ Should show success, money goes to Stripe

### Scenario 5: Comparison table visible
1. Any user, go to `/app/billing`
2. See table: Features | Free | Pro
3. ✅ All rows match documentation

---

## ⚠️ Important Notes

1. **Test mode vs Live mode:**
   - Use test keys (`sk_test_`, `pk_test_`) during development
   - Use live keys (`sk_live_`, `pk_live_`) in production
   - Stripe Dashboard has toggle at top-right

2. **First 7 days:**
   - Stripe holds payments for fraud prevention
   - Day 8+: Automatic transfer to your bank
   - This is normal and automatic

3. **Ad slots (optional):**
   - Current implementation uses dynamic Google AdSense slots
   - If you don't have AdSense account: ads render empty (no visual break)
   - To enable: set `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` env var

---

## 🆘 Quick Troubleshoot

| Problem | Fix |
|---------|-----|
| "Button doesn't appear" | Check `STRIPE_PRICE_PRO` is set in `.env` |
| "Checkout redirects to error" | Price ID wrong or invalid. Regenerate on Stripe Dashboard. |
| "Webhook not delivering" | Check URL is public (not localhost). Regenerate secret. |
| "User not marked PRO" | Check webhook is delivering. See Stripe Dashboard → Events. |
| "Ads still show after upgrade" | Hard refresh browser (Ctrl+Shift+R). |

---

## 🎯 Next Steps

1. ✅ Copy these 4 values from Stripe Dashboard:
   - Price ID (Pro product)
   - Webhook signing secret
   - Bank account added
   - (IBAN should be saved automatically)

2. ✅ Add to `.env.local` + k8s Secret

3. ✅ Test locally (optional)

4. ✅ Deploy to production

5. ✅ Go live: https://habits.khalilaliouich.com/app/billing

**That's it!** Your monetization is ready. 🚀

---

**Questions?** See the full docs:
- `STRIPE_SETUP.md` — complete setup guide
- `DONATIONS_TRACKING.md` — donation management
- `INTEGRATION_CHECKLIST.md` — pre-launch verification
