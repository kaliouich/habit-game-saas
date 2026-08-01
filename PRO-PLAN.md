# Pro plan at €0.99 — competitor analysis & implementation plan

Written 2026-07-31. Companion to [PLAN.md](PLAN.md). Decisions here supersede the
pricing in [src/lib/config.ts](src/lib/config.ts) and the Sprint 3 notes in CLAUDE.md.

---

## 1. What the competition actually charges

Prices verified 2026-07-31 from vendor pricing pages and current reviews.

| Product | Free tier | Paid | Model |
|---|---|---|---|
| **Habitwise** | limited | **$0.99/mo · $9.99/yr · $19.99 lifetime** | The only one at our target price |
| **Habitify** | 3 habits | $2.49/mo billed yearly · $59.99 lifetime | Annual-first |
| **Finch** | very generous | ~$4.99/mo, ~$2.50/mo annual | Cosmetic upsell |
| **Habitica** | full game free | $4.99/mo · $47.99/yr | Cosmetic + convenience |
| **Way of Life** | 7 habits | $9.99 one-time | One-time unlock |
| **HabitNow** | 7 habits | $11.99 one-time | One-time unlock |
| **Streaks** | — | $4.99 one-time | Paid up front |
| **Productive** | limited | $6.99/mo · $29.99/yr | Subscription |
| **Habit Game (today)** | 3 habits | **$6/mo · $49/yr** | Most expensive in category |

**Read:** at $6/month we are the most expensive habit tracker on this list while
competing against two apps that are free and one that is a $4.99 one-time purchase.
The price cut is directionally correct. Habitwise proves $0.99 is a real position.

---

## 2. Every feature the category puts behind a paywall

Consolidated from all products above.

**Limits**
1. Habit count cap (free tiers run 2–7 habits)
2. History/statistics cut off after a few weeks
3. Export locked

**Convenience**
4. Advanced reminders — habit stacking, location-based (Habitify)
5. Pause / "off mode" / skip a day without breaking the streak (Habitify, Way of Life)
6. Cloud sync & backup (Hapit, Habitwise)
7. Widgets (all native apps)
8. Ad removal (most free apps)

**Integrations**
9. Apple/Google Calendar (Habitify)
10. Apple Health / Google Fit (Habitify)
11. API, Zapier, IFTTT (Habitify)

**Content & cosmetics**
12. Outfits, pets, themes, soundscapes (Finch, Habitica)
13. Full catalogue of exercises/reflections (Finch)
14. Monthly mystery items, exclusive pets (Habitica)

**Insight**
15. Weekly reports correlating habits against mood (Finch)
16. Tags and correlation analysis (Finch)
17. Milestones and celebrations (Productive)

**Structure**
18. Sub-tasks / checklists per habit (HabitNow)
19. Template library (Productive)

### What we already ship in Pro
Items 1, 2, 3, and a partial 15 (weekly recap email). That is four of nineteen —
and three of them are *removing restrictions* rather than adding value.

### What we must NOT build at €0.99
Items 7, 10 and the location half of 4 need a native app. Items 9 and 11 are
integrations, and integrations carry per-user support cost. **At €0.99 net ≈ €0.73,
a single support email destroys a year of that user's margin.** Integrations are a
$6 feature set, not a €0.99 one.

### What fits €0.99 perfectly
Items 12, 13, 14, 17 — **content and cosmetics have near-zero marginal cost.**
This is exactly Finch's model, and it is the correct model at this price. It also
happens to be the model the Arcade design direction is built for.

---

## 3. The economics — read this before committing

Stripe EEA card pricing: 1.5% + €0.25. International cards: 3.25% + €0.25.

| Plan | Gross | Stripe fee | **Net** | Fee share |
|---|---|---|---|---|
| €6.00 / month | €6.00 | €0.34 | €5.66 | 5.7% |
| **€0.99 / month** | €0.99 | €0.26 | **€0.73** | **26.8%** |
| €0.99/mo × 12 | €11.88 | €3.18 | €8.70 | 26.8% |
| **€9.99 / year** | €9.99 | €0.40 | **€9.59** | **4.0%** |
| €19.99 lifetime | €19.99 | €0.55 | €19.44 | 2.8% |

Three things fall out of this table:

**A. The fixed €0.25 is the whole problem.** At €0.99 it is a quarter of the price.
Micro-subscriptions bleed to per-transaction fees; there is no way around it.

**B. €9.99/year nets more than €0.99/month does over the same year** — €9.59 vs
€8.70 — despite the lower sticker price. Annual billing is not just better for
churn, it is strictly better revenue at this price point.

**C. Replacing today's revenue takes ~7.8× the subscribers.** €5.66 net ÷ €0.73 net.
If you have 50 Pro users today you need 390 at €0.99/month to stand still.

**Also decide: is €0.99 VAT-inclusive or exclusive?** If inclusive, EU VAT at 20%
takes another €0.17 before Stripe, leaving **€0.56 net — 43% gone**. Set Stripe Tax
to add VAT on top, or the plan below does not fund itself.

### Decision (locked 2026-07-31)

**Single plan: €9.99/year, billed annually, no monthly option, no lifetime
option.** Displayed to users as "**€0.99/mo, billed €9.99 yearly**" — the
psychological price tag stays €0.99, the economics underneath are the €9.99/year
row from the table above (4% fee share, €9.59 net), not the €0.99/month row
(26.8% fee share, €0.73 net).

Rejected: monthly-only billing (fee share too high), lifetime (removes recurring
revenue entirely, and this product's ongoing-value story — new badges, new
board skins — is stronger as a subscription than a one-time unlock).

**One-way door:** a price cut from €6 to €0.99-equivalent is effectively
irreversible — you cannot raise it back on existing users without churn, and it
anchors the product as cheap. **Grandfather existing Pro users at their current
€6/mo · €49/yr terms** — do not migrate them to the new price or cancel their
existing Stripe subscriptions.

---

## 4. Implementation plan

Phases are ordered by revenue impact per hour of work. Each maps to real files.

### Phase 0 — Pricing switch (half a day)

- Stripe dashboard: create **one** new Price object, €9.99/year recurring.
  **Do not edit or archive the existing €6/mo · €49/yr prices** — grandfathered
  users stay on them untouched.
- [src/lib/stripe.ts](src/lib/stripe.ts): `STRIPE_PRICES` keeps its current shape;
  `monthly`/`yearly` keys now both resolve to the checkout flow, but the app only
  ever offers the `yearly` key going forward. Old price IDs stay in the object as
  `legacyMonthly`/`legacyYearly` so grandfathered portal sessions still resolve.
- [src/lib/actions/billing.ts](src/lib/actions/billing.ts:12): `CheckoutSchema`
  collapses to a no-arg action (or a single literal) — there is only one plan to
  buy. Remove the price-selector form entirely; one button, one price.
- Pricing page: single Pro card, "€0.99/mo, billed €9.99/year" as the price line,
  no toggle, no second tier.
- Enable **Stripe Tax** so VAT is added on top of €9.99, not carved out of it.
- Trial: keep the 14-day trial (low-risk at this price, protects little revenue
  either way, and referral-credit logic in billing.ts already depends on it).

### Phase 1 — Make the free tier hurt less, the paid tier worth more (1 day)

At €0.99 a 3-habit free cap is too aggressive — competitors give 7. Raise free to
**5**, make Pro **unlimited** instead of 24.

- [src/lib/config.ts](src/lib/config.ts:4): `FREE.maxHabits: 5`,
  `PRO.maxHabits: Infinity`.
- [src/lib/quotas.ts](src/lib/quotas.ts:4): `canAddHabit` already compares against
  the limit, so `Infinity` works with no change. Verify the habit-create action's
  error copy.
- The 24-habit number is currently a selling point on the pricing page — replace
  with "unlimited".

### Phase 2 — Gamification content (3–4 days) ← highest value per hour

This is what the Arcade design promises and the product does not yet deliver. Pure
software, zero marginal cost, directly justifies the price.

```prisma
model Badge {
  id       String   @id @default(cuid())
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  key      String   // "perfect_week", "streak_30", "early_riser", ...
  earnedAt DateTime @default(now())
  @@unique([userId, key])
}
```
- `User.xp Int @default(0)` and `User.level Int @default(1)`.
- New `src/lib/badges.ts` — pure functions over existing `HabitLog` data, same
  pattern as [src/lib/stats.ts](src/lib/stats.ts). Unit-testable, no I/O.
- Award on log create in `src/lib/actions/logs.ts`, after the existing
  `revalidatePath`.
- **Free gets 3 starter badges. Pro gets the full set of ~20.** That is item 14
  from the competitor list, and it is the single cheapest thing on this page.

### Phase 3 — Cosmetics (2 days) ← pure margin

- `User.boardSkin String @default("classic")`.
- Ship 6–8 board themes as CSS custom-property sets in
  [src/app/globals.css](src/app/globals.css) — the token architecture already
  supports this, it is one `[data-skin="..."]` block per theme.
- 2 free, the rest Pro. This is Finch's entire business model and it costs you a
  CSS file.

### Phase 4 — Retention features (4–5 days)

- **Pause / vacation mode** (competitor item 5, paywalled by two vendors):
  ```prisma
  model HabitPause {
    id      String @id @default(cuid())
    habitId String
    from    String // "YYYY-MM-DD"
    to      String
  }
  ```
  Streak logic in [src/lib/stats.ts](src/lib/stats.ts) skips paused ranges instead
  of breaking. Add tests alongside the existing 29.
- **Daily reminders by email** (item 4, minus the native parts): reuse the existing
  cron at `src/app/api/cron/` that already sends the weekly recap.
- **Per-day notes**: `HabitLog.note String?` — one migration, one input.
- **Tags + correlation view** (item 16): `Habit.tags String[]`.

### Phase 5 — Only if annual/lifetime revenue justifies it

Templates (item 19), sub-tasks (item 18), Google Calendar (item 9), API (item 11).
Revisit once you know the annual/lifetime split. **Do not start these at €0.99/month
revenue.**

---

## 5. Resulting plan comparison

| | Free | **Pro — €0.99/mo, billed €9.99/year** |
|---|---|---|
| Habits | 5 | Unlimited |
| History | Current month | Everything |
| Streaks & mood | ✓ | ✓ |
| Badges | 3 starter | ~20, full set |
| Board themes | 2 | All 8 |
| XP & levels | ✓ | ✓ |
| Pause / vacation mode | — | ✓ |
| Daily reminders | — | ✓ |
| Notes & tags | — | ✓ |
| CSV export | — | ✓ |
| Weekly recap email | — | ✓ |
| Shareable monthly recap | — | ✓ |

Twelve paid lines instead of five, and nine of them are content rather than
un-restricting things — which is the only structure that makes €0.99 defensible.

---

## 6. Open decisions

1. **Annual-first, or monthly-first?** Recommendation: annual default, lifetime
   offered, monthly available but de-emphasised.
2. **VAT inclusive or exclusive?** Must be exclusive with Stripe Tax on top.
3. **Grandfather existing Pro users?** Recommendation: yes, keep them on €6 terms.
4. **Keep the 14-day trial?** At €0.99 a trial adds friction for very little
   protected revenue. Consider dropping it and letting the free tier be the trial.
