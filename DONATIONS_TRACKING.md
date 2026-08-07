# Tracking & Managing Donations

## 📊 Current Implementation (Option A: Flexible price_data)

Your donations use Stripe's dynamic pricing system. Here's how to track them:

---

## 🔍 View Donations in Stripe Dashboard

### Method 1: Payments Page
```
Dashboard → Payments
├─ Shows all transactions (subscriptions + donations)
├─ Filter by "one-time" (to see only donations)
├─ Click each payment to see:
│  ├─ Amount
│  ├─ Date
│  ├─ Customer email
│  ├─ Status (succeeded, pending, failed)
│  └─ Charge ID
└─ Download CSV report
```

### Method 2: Reports
```
Dashboard → Reports → Payments
├─ Date range filter
├─ See all one-time charges
├─ Export to CSV for accounting
└─ View payout status
```

---

## 💾 Optional: Track in Database

If you want to track donations in your database (for email campaigns, leaderboards, etc.):

### Add Donation Model (Optional Future Sprint)
```prisma
model Donation {
  id            String   @id @default(cuid())
  userId        String?  // nullable if anonymous donation
  user          User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  amount        Int      // in cents (e.g., 1000 = €10.00)
  stripeChargeId String  @unique
  message       String?  // optional donor message
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([createdAt])
}
```

### Sync from Webhook
```typescript
// In src/app/api/stripe/webhook/route.ts
case "charge.succeeded": {
  const charge = event.data.object as Stripe.Charge;
  
  // Find user by email (if logged in) or create anonymous record
  const user = charge.billing_details?.email 
    ? await prisma.user.findUnique({ 
        where: { email: charge.billing_details.email } 
      })
    : null;
  
  // Log donation
  await prisma.donation.create({
    data: {
      userId: user?.id,
      amount: charge.amount,
      stripeChargeId: charge.id,
      message: charge.description,
    }
  });
  break;
}
```

**Currently:** This is NOT implemented. Donations exist in Stripe only.  
**To enable:** Add the above to webhook + Prisma model.

---

## 📈 Analytics & Metrics

### How to Calculate Donations Received

```bash
# Check Stripe Dashboard → Events
# Filter for "charge.succeeded"
# Total amount = all donations for the period

# Terminal: Query via Stripe CLI
stripe charges list --limit=100
```

### Monthly Metrics
```
Total donations = Sum of all charge.amount for month
Stripe fees = Total × 0.029 + (count × 0.30)
Net received = Total donations - Stripe fees
Actual payout (after 7-day hold) = Automatic transfer to bank
```

---

## 💌 Donor Recognition (Future)

If you want to recognize donors:

### Option 1: Email Thank You
- Stripe webhook notifies you
- You send thank-you email manually (or via Zapier)
- Personalized message

### Option 2: Donor Wall (Public)
- Create a `/donors` page showing:
  - "Anonymous Supporter" + €amount + date
  - (opt-in: real name if they provide it)

### Option 3: Referral Credit
- Donors upgrade to Pro → earn credit bonus
- (Currently not implemented)

---

## 🔗 Donation Flow (Current)

```
User visits /app/billing
  ↓
Scrolls to "Support this project"
  ↓
Enters amount (€1 - €1,000)
  ↓
Clicks "Donate"
  ↓
Stripe Checkout (one-time payment)
  ↓
Webhook: charge.succeeded
  ↓
Money on Stripe account
  ↓
After 7 days → Auto transfer to your bank
  ↓
You see it in bank account
```

---

## 🧮 Donation Limits (Config)

Located in `src/lib/config.ts`:
```typescript
export const DONATION_MIN = 1;    // €1 minimum
export const DONATION_MAX = 1000; // €1,000 maximum
```

To change limits:
```typescript
export const DONATION_MIN = 0.50;  // €0.50 minimum
export const DONATION_MAX = 5000;  // €5,000 maximum
```

Then redeploy.

---

## 🚫 Failed Donations

If a donation fails (card declined, etc.):

### What happens:
```
Stripe webhook: charge.failed
  ↓
No money received
  ↓
User sees error on checkout page
  ↓
Can retry immediately
```

### How to track failed donations:
```
Dashboard → Events
Filter: charge.failed
See all failed attempts + reasons
```

---

## 📧 Email Notifications (Optional Future)

You can set up email alerts for donations:

```
Stripe Dashboard → Settings → Email notifications
├─ Send me email for:
│  ├─ Large charges (€100+)
│  ├─ Unusual activity
│  └─ Payment failures
└─ Save
```

Or use Stripe Webhooks to trigger your own email:

```typescript
case "charge.succeeded": {
  if (amount > 100 * 100) { // €100+
    // Send you an email notification
    await sendEmail({
      to: 'you@example.com',
      subject: `Large donation received: €${amount / 100}`,
      body: `From: ${email}`
    });
  }
  break;
}
```

---

## 🎯 Recommended Setup

### Phase 1 (Now): Basic
- ✅ Accept donations via Stripe
- ✅ View in Stripe Dashboard
- ✅ Auto-payout to bank

### Phase 2 (Optional): Enhanced
- [ ] Add `Donation` table to database
- [ ] Sync donations from webhook
- [ ] Show donor count on landing page
- [ ] Email notifications for large donations

### Phase 3 (Optional): Public Recognition
- [ ] Public `/donors` page
- [ ] Show top donors (anonymous or named)
- [ ] Monthly donation updates

---

## 🔗 Resources

- [Stripe Charges API](https://stripe.com/docs/api/charges)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Test Cards](https://stripe.com/docs/testing)
- [Payout Guide](https://stripe.com/docs/payouts)

---

## 💡 Quick Reference

| Item | Value |
|------|-------|
| **Donation product** | Not required (uses price_data) |
| **Min amount** | €1.00 |
| **Max amount** | €1,000.00 |
| **Stripe fee** | 2.9% + €0.30 |
| **Payout timing** | Daily (after 7-day hold) |
| **Database tracking** | Optional (not implemented) |
| **Email alerts** | Configurable on Stripe Dashboard |
