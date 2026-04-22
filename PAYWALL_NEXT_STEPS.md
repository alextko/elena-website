# Paywall Next Steps

Deferred work from the 1-hour MVP ship of the trial-first paywall (the 4-screen
flow: ReviewsModal → Step 1 → Step 2 → Step 3 + exit-intent sheet).

Each item below has a corresponding GitHub issue labelled `paywall` +
`deferred`. Tick items off here as they land and close the matching issue.

---

## Launch-adjacent (do before or alongside first paid traffic)

- [ ] **Stripe Dashboard: enable trial-ending reminder email.**
  Settings → Subscriptions → "Email customers a reminder to cancel their free
  trial" → enable, set to 3 days before trial end (Stripe's max lead time).
  Zero code. Addresses the 64% Day-0 cancel-to-avoid-forgetting pattern per
  RevenueCat 2026. Ships a generic templated email; replaced by the branded
  Resend version below when we have time.

- [ ] **Verify mobile web viewport rendering on real devices.**
  Open the preview at `/paywall-preview` on an iPhone SE (375×667) and an
  iPhone Pro Max (430×932). Check: phone frame in Step 1 doesn't overflow,
  "Maybe later" is tappable, exit sheet animation is smooth.
  `e2e/paywall-trial-flow.spec.ts` covers the state machine + data flow but
  not pixel-level visual polish.

## Short-term (next 1-2 weeks, post-launch)

- [ ] **Custom branded trial-ending Resend email.**
  Replace Stripe's generic reminder with a branded one via a
  `customer.subscription.trial_will_end` webhook handler in
  `elena-backend/src/stripe_billing.py`. Reuse `src/email.py` + insert a row
  into `scheduled_emails` via the pattern in `src/email_notifications.py`
  (no new infra). Add an A/B test on subject-line copy. ~1 day.

- [ ] **A/B test: 3-day vs 7-day default trial on web.**
  Deterministic-hash bucketing on `auth_user_id`. New `src/lib/experiments.ts`
  util (no external feature-flag service). Route 50/50. Server reads
  bucket via a custom header or a new field on `/web/checkout`. ~2 hours.
  Measure trial-start rate, Day 0 cancellation rate, trial-to-paid conversion.

- [ ] **"Remind me tomorrow" exit-offer wiring.**
  The button in `exit-intent-sheet.tsx` currently closes the sheet without
  effect. Wire it to insert a `scheduled_emails` row (~24h out) via the
  existing `email_notifications.py` pattern. Re-open the paywall on the next
  session after the email is sent. ~2 hours.

- [ ] **Instrument prod events in Mixpanel dashboards.**
  Build a funnel view for: `Paywall Screen Viewed (step_1)` →
  `Paywall Continue Clicked` → `Paywall Screen Viewed (step_3)` →
  `Paywall Trial Started`. Track drop-off per screen + plan mix + exit-offer
  conversion rate. ~1 hour once data accumulates.

## Medium-term (next 1-2 months)

- [ ] **Mobile iOS trial paywall parity.**
  Create new Apple IAP products with 7-day intro offer in App Store Connect
  (or modify existing 3-day intros; see research in
  `PIXEL_DEPLOYMENT_STATUS_2026-04-20.md` for Apple constraints). Wire new
  products into RevenueCat Offerings. Add plan keys to backend. ~1-2 weeks
  including App Review.

- [ ] **Superwall integration for dynamic paywall config + no-code A/B.**
  Replace hardcoded React paywall screens with Superwall-hosted templates.
  Enables non-engineer paywall iteration + cross-platform A/B. ~1 week.

- [ ] **Upgrade-modal Premium upsell polish for Pro→Premium flow.**
  The current `src/components/upgrade-modal.tsx` handles both free→Pro and
  Pro→Premium in one component. Consider splitting: Pro→Premium gets its own
  single-card "Upgrade to Premium" sheet matching
  `public/paywall-upsell.html`. Low priority — current rendering is fine.

## Longer-term / strategic

- [ ] **Day 0 aha-moment product work.**
  Research shows 55% of trial starts cancel on Day 0. The single biggest
  retention lever is what happens in the first 60 seconds after Start Trial.
  For Elena: scoped product work to deliver a concrete output (drafted
  appeal, savings number, scheduled call) inside the first session. Out of
  paywall scope; goes to product roadmap.

- [ ] **EU DSA compliance check.**
  Operationally zero risk today (we're well below the 45M-EU-MAU VLOP
  threshold and DFA enforcement starts 2028+). Revisit if EU ad spend
  exceeds ~$10k/month or if we hit 1M EU MAU.

## Tracking

- Plan file: `/Users/abhiwangoo/.claude/plans/gleaming-imagining-wreath.md`
- E2E coverage: `elena-website/e2e/paywall-trial-flow.spec.ts` (14 tests)
- Preview route: `/paywall-preview`
- Analytics events: `"Paywall Screen Viewed"`, `"Paywall Continue Clicked"`,
  `"Paywall Back Clicked"`, `"Paywall Plan Selected"`, `"Paywall Trial Started"`,
  `"Paywall Maybe Later Clicked"`, `"Paywall Exit Offer Shown"`,
  `"Paywall Exit Offer Accepted"`, `"Paywall Exit Offer Dismissed"`
