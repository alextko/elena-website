# Web Funnel

This file defines the canonical website funnel for Elena web.

Use this as the source of truth for experiment analysis. Do not build new
dashboards from legacy event names unless they are explicitly marked as
diagnostic-only below.

## Naming strategy

We keep the raw Mixpanel event names for continuity, and attach two
properties to the important funnel/adoption events:

- `canonical_step`
- `step_label`

Dashboards and scripts should group by `canonical_step` and display
`step_label` in plain English. This preserves historical continuity while
keeping reporting readable.

## Canonical onboarding funnel

These events are intended to be read in order:

1. `Landing Page Viewed`
2. `Start Onboarding Clicked`
3. `Onboarding Started`
4. `Name Step Viewed`
5. `Name Step Submitted`
6. `Auth Step Viewed`
7. `Auth Submitted`
8. `Auth Succeeded`
9. `Profile Saved`
10. `Onboarding Handoff Completed`
11. `First Chat Sent`

Underlying raw events:

- `Hero Input Submitted` -> `Start Onboarding Clicked`
- `Onboard Route Entered` -> `Onboarding Started`
- `Web Funnel Profile Form Viewed` -> `Name Step Viewed`
- `Web Funnel Profile Form Submitted` -> `Name Step Submitted`
- `Web Funnel Auth Entry Viewed` -> `Auth Step Viewed`
- `Web Funnel Auth Submitted` -> `Auth Submitted`
- `Web Funnel Auth Succeeded` -> `Auth Succeeded`
- `Web Funnel Onboarding Completed` -> `Profile Saved`
- `Web Funnel Seed Flushed` -> `Onboarding Handoff Completed`
- `Web Funnel Activated` -> `First Chat Sent`

### Event meanings

- `Landing Page Viewed`
  The user viewed a landing page variant.

- `Start Onboarding Clicked`
  A landing CTA started the seeded onboarding/chat flow.
  This is not limited to literal text input; button-driven seeded CTAs count too.

- `Onboarding Started`
  The user entered `/onboard`.
  This means route entry, not that they necessarily saw the profile form yet.

- `Name Step Viewed`
  The user reached the pre-auth profile-form step in the tour.
  This is the step where we ask for name before auth.

- `Name Step Submitted`
  The user submitted the pre-auth profile-form step.

- `Auth Step Viewed`
  Auth UI became visible, regardless of whether the surface was inline tour auth
  or the legacy modal.

- `Auth Submitted`
  The user attempted auth.

- `Auth Succeeded`
  Auth resolved successfully in app state.
  This is tracked from resolved session/profile state, not just a button click.

- `Profile Saved`
  The onboarding/profile data was actually saved.

- `Onboarding Handoff Completed`
  Buffered onboarding state was successfully replayed into the authed flow.

- `First Chat Sent`
  The user sent the first real post-auth message.

## Post-activation milestones

These are not a strict sequential funnel. They are milestone counts after
activation and should be read as parallel adoption behaviors.

- `Provider Added`
- `Appointment Added`
- `Task Added`
- `Insurance Added`
- `Paywall Trial Started`
- `Checkout Completed`

Underlying raw events:

- `provider_created` -> `Provider Added`
- `visit_created` -> `Appointment Added`
- `todo_created` -> `Task Added`
- `insurance_card_added` -> `Insurance Added`

The analysis script also reports:

- `Any core data added`
  A user triggered at least one of:
  `Provider Added`, `Appointment Added`, `Task Added`, or `Insurance Added`.

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
- `Canonical web funnel`
- `Product milestones`

For current experiments, prefer `Canonical web funnel` plus
`Product milestones`.
