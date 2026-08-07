# Stripe Setup — TL;DR (10 mins)

## 🚀 4-Step Setup

### **Step 1: Create Pro Product (2 mins)**
```
Dashboard → Products → Create
├─ Name: "Habit Pro"
├─ Recurring: ON
├─ Price: 0.99 EUR / Month
├─ Lookup key: "pro_monthly"
└─ → COPY PRICE ID
```

### **Step 2: Add Bank Account (1 min)**
```
Dashboard → Settings → Payout settings
├─ Add bank account
├─ IBAN: (your French account)
├─ Automatic payouts: Daily (default)
└─ Save
```

### **Step 3: Create Webhook (2 mins)**
```
Dashboard → Webhooks → Add endpoint
├─ URL: https://habits.khalilaliouich.com/api/stripe/webhook
├─ Events:
│  ├─ checkout.session.completed ✅
│  ├─ customer.subscription.created ✅
│  ├─ customer.subscription.updated ✅
│  ├─ customer.subscription.deleted ✅
│  └─ charge.succeeded ✅ (donations)
└─ → COPY SIGNING SECRET
```

### **Step 4: Store Credentials (1 min)**
```env
# .env.local (local dev)
STRIPE_PRICE_PRO=price_1Xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_1Xxxxxxxxxxxxxxxxxx

# k8s/secrets.yaml (production)
STRIPE_PRICE_PRO: "price_xxx"
STRIPE_WEBHOOK_SECRET: "whsec_xxx"
```

---

## 📋 Pre-Launch Checklist

- [ ] Product created + Price ID copied
- [ ] Bank account added to Stripe
- [ ] Webhook endpoint created + secret copied
- [ ] `.env.local` populated
- [ ] k8s Secret updated
- [ ] Tested locally: `npm run dev` + Stripe CLI
- [ ] Deployed to production
- [ ] Verified webhook in Stripe Dashboard → Events

---

## 🧪 Quick Local Test

```bash
# Terminal 1
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the secret → add to .env.local

# Terminal 2
npm run dev

# Terminal 3: Test upgrade
# Go to http://localhost:3000/app/billing
# Click "Upgrade to Pro"
# Card: 4242 4242 4242 4242
```

---

## 💰 How You Get Paid

```
User pays €0.99
  ↓
Stripe receives it (minus 2.9% + €0.30 fee)
  ↓
After 7 days (fraud hold)
  ↓
Automatic transfer to your bank (daily)
  ↓
You get ~€0.66/month per subscriber
```

**Donations work the same way** (flexible amounts instead of fixed price).

---

## 🎯 What's Included

✅ **€0.99/month Pro subscription**  
✅ **Flexible donations** (user chooses amount)  
✅ **Free vs Pro comparison table**  
✅ **Ads for FREE users only**  
✅ **Auto-sync** webhook (user plan updates instantly)  
✅ **Automatic payouts** to your bank account

---

## 📞 Common Questions

**Q: Do I need to create a Donation product?**  
A: No. Donations use flexible pricing (already configured). Just add bank account.

**Q: When do I get the money?**  
A: Stripe holds it 7 days, then transfers daily to your bank.

**Q: How much do Stripe fees cost?**  
A: 2.9% + €0.30 per transaction (for both subscriptions and donations).

**Q: Can I test without a real bank account?**  
A: Yes, use test mode. Add bank account when you're ready to go live.

---

**See `STRIPE_SETUP.md` for detailed step-by-step instructions.**
