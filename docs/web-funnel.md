# Web Funnel

This file defines the canonical website funnel for Elena web.

Use this as the source of truth for experiment analysis. Do not build new
dashboards from legacy event names unless they are explicitly marked as
diagnostic-only below.

## Canonical onboarding funnel

These events are intended to be read in order:

1. `Landing Page Viewed`
2. `Hero Input Submitted`
3. `Onboard Route Entered`
4. `Web Funnel Profile Form Viewed`
5. `Web Funnel Profile Form Submitted`
6. `Web Funnel Auth Entry Viewed`
7. `Web Funnel Auth Submitted`
8. `Web Funnel Auth Succeeded`
9. `Web Funnel Onboarding Completed`
10. `Web Funnel Seed Flushed`
11. `Web Funnel Activated`

### Event meanings

- `Landing Page Viewed`
  The user viewed a landing page variant.

- `Hero Input Submitted`
  A landing CTA started the seeded onboarding/chat flow.
  This is not limited to literal text input; button-driven seeded CTAs count too.

- `Onboard Route Entered`
  The user entered `/onboard`.
  This means route entry, not that they necessarily saw the profile form yet.

- `Web Funnel Profile Form Viewed`
  The user reached the pre-auth profile-form step in the tour.
  This is the step where we ask for name before auth.

- `Web Funnel Profile Form Submitted`
  The user submitted the pre-auth profile-form step.

- `Web Funnel Auth Entry Viewed`
  Auth UI became visible, regardless of whether the surface was inline tour auth
  or the legacy modal.

- `Web Funnel Auth Submitted`
  The user attempted auth.

- `Web Funnel Auth Succeeded`
  Auth resolved successfully in app state.
  This is tracked from resolved session/profile state, not just a button click.

- `Web Funnel Onboarding Completed`
  Onboarding/profile data was actually saved.

- `Web Funnel Seed Flushed`
  Buffered onboarding state was successfully replayed into the authed flow.

- `Web Funnel Activated`
  The user sent the first real post-auth message.

## Post-activation milestones

These are not a strict sequential funnel. They are milestone counts after
activation and should be read as parallel adoption behaviors.

- `provider_created`
- `visit_created`
- `todo_created`
- `insurance_card_added`
- `Paywall Trial Started`
- `Checkout Completed`

The analysis script also reports:

- `Any core data added`
  A user triggered at least one of:
  `provider_created`, `visit_created`, `todo_created`, or `insurance_card_added`.

## Diagnostic-only legacy events

These events are useful for debugging but should not be used as the canonical
experiment funnel:

- `Auth Modal Opened`
- `Onboard Auth Step Viewed`
- `Auth Method Selected`
- `Auth Error`
- `Onboarding Modal Shown`
- `Welcome Screen Shown`
- `Tour Buffer Flushed`

Reasons:

- some are legacy names from older surfaces
- some are surface-specific instead of state-boundary-specific
- some can fire multiple times or out of sequence during retries/recovery

## Analysis

For quick analysis use:

`scripts/analyze-mixpanel.mjs`

It prints:

- `Legacy funnel`
- `Homepage chat funnel`
- `Clean web funnel v2`
- `Post-activation milestones`

For current experiments, prefer `Clean web funnel v2` plus
`Post-activation milestones`.
