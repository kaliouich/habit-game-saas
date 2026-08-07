# Sprint 3 Checklist — Stripe + Ads + Billing

## ✅ Code Implementation (Complete)

### Schema & Database
- [x] Prisma schema: added `stripeSubscriptionId`, `stripePriceId`
- [x] Database migration created and applied
- [x] Webhook handler syncs subscription data + price info

### Stripe Integration
- [x] `src/lib/stripe.ts` — refactored for €0.99/month pricing
- [x] `src/lib/actions/billing.ts` — checkout session updated
- [x] API webhook handler (`/api/stripe/webhook`) — full implementation

### UI Components
- [x] `SubscriptionComparison.tsx` — Free vs Pro comparison table
- [x] `AdBanner.tsx` — 728×90 ad slot for top of dashboard
- [x] `AdSidebar.tsx` — 300×600 ad slot for right side
- [x] Dashboard integration — ads conditional on `plan === "FREE"`
- [x] Billing page — updated with new price messaging

### Styling
- [x] CSS for subscription comparison table
- [x] CSS for ad containers
- [x] CSS for dashboard layout (added `dashboard__right`)

---

## 🔄 Next Steps (Requires Stripe Dashboard)

### 1. Stripe Setup (READ: `STRIPE_SETUP.md`)
- [ ] Create Pro product on Stripe (€0.99/month)
- [ ] Copy Price ID → `STRIPE_PRICE_PRO` environment variable
- [ ] Set up webhook endpoint → receive Signing Secret
- [ ] Copy webhook secret → `STRIPE_WEBHOOK_SECRET` environment variable

### 2. Environment Variables
```bash
# .env.local (for local dev)
STRIPE_PRICE_PRO=price_1Xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_1Xxxxxxxxxxxxxxxxxx

# k8s/secrets.yaml (for production — already has STRIPE_SECRET_KEY)
STRIPE_PRICE_PRO=price_1Xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_1Xxxxxxxxxxxxxxxxxx
```

### 3. Test Locally (with Stripe CLI)
```bash
# Terminal 1: Stripe webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the signing secret output

# Terminal 2: Dev server
npm run dev

# Terminal 3: Test payment
# Go to http://localhost:3000/app/billing
# Click "Upgrade to Pro — €0.99/month"
# Use test card: 4242 4242 4242 4242
```

### 4. Verify in Database
```bash
# Check user was upgraded to PRO
psql $DATABASE_URL
SELECT email, plan, planStatus, stripeSubscriptionId FROM "User" WHERE email='test@example.com';
```

---

## 📊 Feature Behavior

### Free Users
```
- Max 3 habits per month
- Current month history only
- See ads banner (728×90) at top
- See ads sidebar (300×600) on right
- **Prompt to upgrade visible on billing page**
```

### Pro Users
```
- Max 24 habits per month
- Unlimited history
- CSV export available
- Vacation mode + Streak shields
- **NO ads** (components don't render)
- Can manage subscription via Stripe Portal
```

---

## 🧪 Manual Test Cases

### Upgrade Flow (FREE → PRO)
1. [ ] Login as FREE user
2. [ ] Go to `/app/billing`
3. [ ] See "Upgrade to Pro — €0.99/month, 14-day trial" button
4. [ ] Click button → redirected to Stripe Checkout
5. [ ] Use test card: 4242 4242 4242 4242
6. [ ] Complete payment
7. [ ] Webhook delivers `checkout.session.completed` → `customer.subscription.created`
8. [ ] Database: `plan` = "PRO", `planStatus` = "active"
9. [ ] Refresh `/app` → no ads shown
10. [ ] `/app/billing` shows "Manage subscription" button

### Downgrade Flow (PRO → FREE)
1. [ ] Logged in as PRO user
2. [ ] Go to `/app/billing` → "Manage subscription" button
3. [ ] Click → redirected to Stripe Customer Portal
4. [ ] Cancel subscription
5. [ ] Webhook delivers `customer.subscription.deleted`
6. [ ] Database: `plan` = "FREE", `planStatus` = "canceled"
7. [ ] Refresh `/app` → ads visible again

### Ad Display
1. [ ] Login as FREE user
2. [ ] Go to `/app` → see AdBanner (728×90) at top
3. [ ] See AdSidebar (300×600) on right of stats panel
4. [ ] Upgrade to PRO → refresh
5. [ ] Ads disappear (no AdBanner, no AdSidebar)

### Comparison Table
1. [ ] Any user → `/app/billing`
2. [ ] See table: Features | Free | Pro
3. [ ] All rows show correctly:
   - Max habits: 3 | 24
   - History: Current month | Unlimited
   - Export CSV: ✗ | ✓
   - Ads: Yes | ✗
   - (etc.)

---

## 🔧 Known Limitations

### Ads (Phase 2 — After Launch)
- Current implementation uses `dangerouslySetInnerHTML` for Google AdSense script
- Requires `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` env variable
- Will only serve ads if connected to Google AdSense account
- **Until AdSense is set up:** components render empty divs (no visual break)

### Future Improvements
- [ ] Move ad injection to `<script>` in layout (instead of component)
- [ ] Add fallback house ads (promote Pro, showcase roadmap)
- [ ] Track ad impressions via Umami
- [ ] A/B test ad placement + sizing

---

## 📝 Commit Message Template

```
feat(billing): Stripe integration at €0.99/month + subscription comparison + ads

- Update Prisma schema: stripeSubscriptionId, stripePriceId
- Webhook syncs subscription data from Stripe events
- Server actions: createCheckoutSession for €0.99/month Pro
- New component: SubscriptionComparison (Free vs Pro table)
- Ad components: AdBanner (728×90) + AdSidebar (300×600)
- Dashboard: conditional ad rendering for FREE plan only
- Billing page: updated price messaging + comparison table
- CSS: subscription table + ad container styles

See STRIPE_SETUP.md for Stripe dashboard configuration required.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

---

## 🚀 Pre-Launch Deployment

### 1. Merge to main
```bash
git add -A
git commit -m "feat(billing): Stripe integration..."
git push origin claude/billing-stripe
# Create PR → review → merge
```

### 2. Update k8s secrets
```bash
# Add to k8s/secrets.yaml (base64 encoded)
STRIPE_PRICE_PRO=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Deploy
kubectl apply -f k8s/secrets.yaml
kubectl rollout restart deploy/habit-game
```

### 3. Verify webhook delivery
- Login to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
- Check endpoint logs — look for successful deliveries

### 4. Test on production
- [ ] Create account on https://habits.khalilaliouich.com
- [ ] Try upgrading to Pro with real card (or test card if still in test mode)
- [ ] Verify user is marked PRO in database
- [ ] Verify ads don't appear

---

## 📞 Troubleshooting

### "STRIPE_NO_URL"
→ Stripe Checkout session creation failed. Check `STRIPE_PRICE_PRO` is set correctly.

### Webhook not delivering
→ Check Stripe Dashboard → Events → look for errors.
→ Verify webhook URL is public (not localhost).
→ Confirm signing secret matches `STRIPE_WEBHOOK_SECRET`.

### Ads not showing
→ Confirm user is FREE (check database: `SELECT plan FROM "User"`)
→ Check browser console for errors
→ Verify `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` is set (if using AdSense)

### User still sees ads after upgrade
→ Clear browser cache / hard refresh (Ctrl+Shift+R)
→ Check database: `SELECT plan FROM "User"` should be "PRO"
→ Restart Next.js dev server if running locally

---

## 📚 Related Files
- `STRIPE_SETUP.md` — detailed Stripe configuration steps
- `src/lib/stripe.ts` — Stripe client + price config
- `src/lib/actions/billing.ts` — checkout & portal sessions
- `src/app/api/stripe/webhook/route.ts` — event handler
- `src/components/SubscriptionComparison.tsx` — comparison table
- `src/components/Ad*.tsx` — ad components
- `src/app/app/billing/page.tsx` — billing page
- `src/components/dashboard/Dashboard.tsx` — main dashboard
