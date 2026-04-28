# Mixpanel Analysis

This repo includes a read-only Mixpanel export script for website funnel review.

## Required env vars

Set these locally before running the script:

```bash
export MIXPANEL_SERVICE_ACCOUNT_USERNAME='...'
export MIXPANEL_SERVICE_ACCOUNT_SECRET='...'
export MIXPANEL_PROJECT_ID='4004819'
```

## Usage

```bash
npm run analyze:mixpanel -- --days 14
```

Optional flags:

- `--from YYYY-MM-DD`
- `--to YYYY-MM-DD`
- `--landing-variant homepage`
- `--limit 100000`
- `--exclude test,alextko,abhi`
- `--json`

## What it reports

- Distinct-user funnel for the core website checkpoints
- Top tracked events in the selected date range
- Landing variant counts
- Excludes internal/test users by default using Mixpanel profile `$email` / `$name`
- Excludes obvious localhost dev traffic

## Current funnel steps

1. `Landing Page Viewed`
2. `Auth Modal Opened`
3. `Signup Completed`
4. `Onboarding Modal Shown`
5. `Onboarding Completed`
6. `Paywall Screen Viewed`
7. `Paywall Trial Started`
