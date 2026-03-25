# Elena Landing Page Optimization Plan

*Generated: March 24, 2026*
*Goal: 1K daily website views with 30-50% waitlist conversion rate*
*Context: Paid ad traffic (TikTok, Meta, Google Search, Reddit) + organic TikTok/influencer referrals*

---

## Part 1: Does the Waitlist Strategy Still Work?

### Short answer: Yes, but the bar is higher than it used to be.

**The data (2025-2026 benchmarks):**
- Average waitlist landing page converts at ~15% ([GetWaitlist benchmarks](https://getwaitlist.com/blog/waitlist-benchmarks-conversion-rates))
- Well-optimized waitlist pages convert 20-40% ([CraftUp analysis](https://craftuplearn.com/blog/waitlist-landing-page-anatomy-incentives-benchmarks))
- Top performers hit 40-85% — but these are warm/organic traffic, not cold paid ([Waitlister guide](https://waitlister.me/growth-hub/guides/waitlist-landing-page-optimization-guide))
- 83% of waitlist visitors arrive on mobile — mobile-first design is mandatory

**The real concern — "waitlist fatigue":**
Consumers have seen hundreds of "join the waitlist" pages since 2020. The ones that still convert share three traits:
1. **Immediate value exchange** — not just "we'll email you when we launch" but something tangible now (community access, content, a tool)
2. **Specificity** — vague promises ("revolutionize your healthcare") don't convert; specific outcomes ("find out if your last hospital bill had errors") do
3. **Social proof** — a counter showing how many people already joined, or recognizable logos/names

**What DOESN'T work anymore:**
- Generic "coming soon" pages with just an email field and no context
- Pages that don't explain what the product does
- Pages where the waitlist feels like a dead end (no follow-up, no community, no content)

**The survivorship bias warning:**
Most case studies about 40%+ conversion rates come from companies that succeeded. The median reality for cold paid traffic to a waitlist is 10-25%. To hit 30%+, you need either very targeted traffic (Google Search, Reddit, influencer referrals) or an exceptional page — or both.

**Bottom line:** The strategy works if the page is optimized and traffic is qualified. Elena's current page is not optimized for paid traffic conversion. The fixes below will close that gap.

---

## Part 2: Current Page Audit (elena-health.com)

### What's on the page now:

| Element | Current State | Problem |
|---|---|---|
| **Headline** | "The confidence to get the care you deserve." | Brand tagline, not a conversion headline. Doesn't match any ad hook. Vague. |
| **Sub-headline** | "Price transparency for every procedure, every provider, every plan." | Only covers one feature. Misses the emotional hooks (phone calls, bill errors). |
| **CTA button** | "Join the Community" | Sounds like a Slack group, not early access to an app. Low urgency. |
| **Form flow** | Email -> multi-select survey -> submit/skip | Survey after email kills 10-20% of conversions. Should be post-signup. |
| **Navigation** | Logo + "How it Works" + "Features" + CTA | Nav links leak traffic away from the signup. Remove on waitlist pages. |
| **Social proof** | None visible above the fold | No waitlist counter, no user count, no testimonials. |
| **Urgency/scarcity** | None | No reason to sign up right now vs. later. |
| **Phone section** | 350vh scroll with sticky phone + demo video | Cool design but massive scroll distance before reaching any feature info. On mobile with paid traffic, most people won't scroll that far. |
| **Features** | 6-card carousel (calls, meds, insurance, health data, reminders, family) | Too many features dilute the message. Lead with top 3. |
| **Footer CTA** | Another email + survey form | Good to have a second CTA, but same survey friction issue. |
| **Trust elements** | "Your data is never sold" + "Built by people frustrated by the same system" + "Not medical advice" | Good content, but buried below the fold in a trust strip. |
| **Community pitch** | WhatsApp group, newsletter, live Q&A | This is the immediate value exchange — but it's positioned as secondary. |

### Estimated conversion rate with paid traffic in current state: 8-15%

---

## Part 3: Homepage Optimization Recommendations

### Priority 1: Above-the-fold rewrite (CRITICAL)

**New headline options (pick one, A/B test):**

Option A (phone anxiety angle — strongest for TikTok traffic):
> "Elena calls your insurance, fights your bills, and finds you cheaper care."

Option B (bill error angle — strongest for Google Search traffic):
> "Upload your medical bill. Elena finds the errors and fights them for you."

Option C (price transparency angle — broadest):
> "The same MRI costs $400 or $2,500. Elena shows you before you book."

**New sub-headline:**
> "The AI healthcare companion that handles the calls you don't want to make."

**New CTA button text:**
> "Get Early Access" or "Join the Waitlist"

NOT "Join the Community" — save that for the post-signup experience.

**Add social proof counter above the fold:**
> "X,000+ people on the waitlist" (even if the number is modest, showing any number builds trust)

**Add urgency line below the CTA:**
> "Launching Spring 2026. First 1,000 signups get 3 months free."

### Priority 2: Simplify the form (CRITICAL)

**Current:** Email -> survey -> submit/skip
**New:** Email field + one button. That's it.

Move the survey to:
- The confirmation/thank-you page after signup, OR
- A follow-up email sent 1 hour after signup

Every extra step between "I want this" and "I'm signed up" loses 10-20% of people. On cold paid traffic from TikTok (where attention span is measured in seconds), this is fatal.

### Priority 3: Remove navigation on ad landing pages

When someone arrives from a paid ad, the only action should be signing up. Every nav link ("How it Works," "Features") is an exit ramp.

**Two approaches:**
1. Create a separate `/lp` or `/waitlist` route with no nav — use this as the ad destination
2. Or strip the nav from the main page entirely and make it a pure waitlist page

Option 1 is better because you can have different headlines per ad angle:
- `/lp/bills` — headline about bill errors (for Google Search / bill-focused TikToks)
- `/lp/calls` — headline about phone anxiety (for TikTok phone anxiety content)
- `/lp/prices` — headline about price transparency (for broad Meta traffic)

Each landing page matches the ad that sent the user there. This alone can boost conversion 15-30%.

### Priority 4: Reduce scroll distance to features

**Current:** Hero -> 350vh phone scroll section -> manifesto -> stat banner -> features
**Problem:** That's ~5 full screen heights before anyone sees a feature description.

**For the ad landing pages:** Cut the phone scroll section entirely. Go straight from hero (with CTA) to 3 key features to second CTA. The phone animation is beautiful for organic/direct visitors but lethal for paid traffic bounce rates.

**For the main homepage (organic visitors):** Keep the phone section but reduce from 350vh to 200vh.

### Priority 5: Lead with 3 features, not 6

The current 6-card carousel dilutes the message. For ad-driven visitors, surface only the 3 most emotionally resonant features:

1. **"She calls for you"** — Handles doctor's offices, insurance hold times, billing departments
2. **"She finds billing errors"** — Scans every line, catches duplicate charges, wrong codes
3. **"She shows real prices"** — Actual negotiated rates before you book, not estimates

The other 3 (health data hub, reminders, family accounts) are retention features, not acquisition features. Save them for onboarding or the full homepage.

### Priority 6: Add social proof / trust above the fold

Options (use what you have):
- Waitlist counter: "2,400+ people waiting for Elena"
- Stat: "80% of medical bills have errors. Elena catches them."
- Quote from a beta user or early tester
- Press mention or accelerator badge if applicable

### Priority 7: Community as immediate value (post-signup)

The WhatsApp community, newsletter, and live Q&A sessions are the answer to "why should I sign up NOW instead of later." But they're currently buried.

**On the thank-you/confirmation page after signup, show:**
> "You're in! While you wait for Elena to launch:"
> - Join our private WhatsApp community (link)
> - Get our weekly healthcare savings newsletter
> - Attend our next live Q&A with a healthcare navigator (date)

This turns a passive waitlist signup into an active community member and dramatically improves retention-to-launch.

---

## Part 4: Blog Posts as Ad Landing Pages

### The Strategy

Instead of driving all ad traffic to a single waitlist page, create blog posts that:
1. Match specific ad hooks (bill errors, phone anxiety, price transparency)
2. Provide genuine educational value (so people don't feel tricked)
3. Convert readers to the waitlist with contextual CTAs

This approach works because:
- Blog posts feel like content, not ads — lower "ad resistance" from TikTok/Reddit traffic
- Each post can rank in Google for long-tail keywords (SEO compounding)
- You can A/B test different angles without rebuilding landing pages
- Blog content can be repurposed as TikTok scripts and Reddit posts

### Recommended Blog Posts (map to ad angles)

**Post 1: "How to Check Your Medical Bill for Errors (Step-by-Step Guide)"**
- Target: Google Search traffic ("medical bill errors," "how to read medical bill")
- CTA: "Or let Elena do it for you — upload your bill and she finds the errors. Join the waitlist."
- UTM: `?utm_source=blog&utm_medium=organic&utm_campaign=bill_errors`

**Post 2: "I Spent 47 Minutes on Hold with My Insurance Company. Here's What I Learned."**
- Target: TikTok traffic from phone anxiety content
- CTA: "Elena makes these calls so you don't have to. Get early access."
- UTM: `?utm_source=blog&utm_medium=tiktok&utm_campaign=phone_anxiety`

**Post 3: "The Same MRI Costs $400 or $2,500 — Here's How to Find the Cheap One"**
- Target: Google Search + Reddit traffic ("MRI cost," "how to find cheap MRI")
- CTA: "Elena pulls the actual negotiated rates from your insurance plan. Join the waitlist."
- UTM: `?utm_source=blog&utm_medium=organic&utm_campaign=price_transparency`

**Post 4: "What Your EOB Actually Means (And Why It's Not a Bill)"**
- Target: TikTok educational content, Reddit r/HealthInsurance
- CTA: "Confused by insurance mail? Snap a photo and Elena explains it in plain English."
- UTM: `?utm_source=blog&utm_medium=tiktok&utm_campaign=eob_explainer`

**Post 5: "Managing Your Parent's Healthcare From 1,000 Miles Away"**
- Target: Nextdoor, Reddit r/CaregiverSupport, caregiver TikTok content
- CTA: "Elena lets you manage your parent's appointments, meds, and bills from your phone."
- UTM: `?utm_source=blog&utm_medium=nextdoor&utm_campaign=caregiver`

**Post 6: "5 Things Nobody Teaches You About Health Insurance at 26"**
- Target: TikTok "adulting" content, Reddit r/Adulting
- CTA: "Elena explains your coverage, finds in-network doctors, and handles the calls."
- UTM: `?utm_source=blog&utm_medium=tiktok&utm_campaign=insurance_101`

### Blog Post CTA Placement

Each blog post should have:
1. **Inline CTA at ~40% scroll** — contextual mention of Elena with email capture
2. **Bottom CTA after the post** — full waitlist signup with the headline matching the post angle
3. **Sticky mobile banner** — small bar at bottom of screen: "Get early access to Elena" with email field
4. **Exit-intent popup** (desktop only) — triggers when mouse moves toward browser close

### Blog Post Conversion Benchmarks

| Traffic Source | Expected Blog Read Rate | Expected CTA Click Rate | Expected Waitlist Conversion |
|---|---|---|---|
| TikTok (link in bio) | 60-80% bounce, 20-40% read | 5-15% of readers | 30-50% of clickers |
| Google Search (SEO) | 30-50% bounce, 50-70% read | 8-20% of readers | 25-40% of clickers |
| Reddit (comment link) | 40-60% bounce, 40-60% read | 10-25% of readers | 35-50% of clickers |
| Meta ad (direct link) | 50-70% bounce, 30-50% read | 5-10% of readers | 20-35% of clickers |

**Blended blog-to-waitlist conversion (all traffic): ~8-15% of visitors who land on a blog post will sign up.** This is lower than a dedicated landing page but the traffic is cheaper (content feels less like an ad) and the signups are higher quality (they read an entire post before converting).

---

## Part 5: Budget Plan — $1K / 4-Day Test

> **UPDATED March 24, 2026** — Major revisions based on verified algorithm research.
> Key changes from prior version:
> - **Reddit gets more budget** ($300, up from $160) — lowest CPC ($0.10-0.80), can target r/HealthInsurance directly, no health ad restrictions
> - **Google Search gets most budget** ($400) — highest intent, but MUST use transactional keywords (AI Overviews cannibalize 68% of paid CTR on informational queries)
> - **Meta gets minimal budget** ($100) — Tier 2 health ad restrictions likely, conversion optimization partially blocked for health apps
> - **TikTok gets $200** — split between follower seeding ($60-100 Community Interaction) and Spark Ads ($100-140 on best organic post)
> - **TikTok posting frequency reduced** to 3-5x/week (NOT 3-4x/day) — 2026 creator diversity score penalizes same-format daily posting
> - **Google Search keywords changed** — target transactional ("medical bill help app") not informational ("how to dispute a medical bill") due to AI Overviews

### Verified Platform Cost Benchmarks (March 2026)

| Channel | CPC | CPM | Conversion Rate (click to signup) | Notes |
|---|---|---|---|---|
| Google Search (healthcare, transactional keywords) | $3-10 | N/A | 8-15% | AI Overviews reduce paid CTR 68% on informational queries. Use transactional keywords only. |
| Reddit Ads (subreddit targeting) | $0.10-0.80 | $2-10 | 1-5% (but very cheap clicks) | Can target r/HealthInsurance, r/personalfinance directly. No health ad restrictions. Conversation Ads available. |
| TikTok Spark Ads | $0.43 CPC | $7.80 | Varies | 30% lower CPA than In-Feed. Requires organic post to boost. |
| TikTok In-Feed | $0.84 CPC | $9.20 | Varies | Worse than Spark on every metric. Use only for Community Interaction (follower growth). |
| TikTok Community Interaction (follower growth) | N/A | $7.80-9.20 | 0.5-2% follow rate | Does NOT require Spark Ads (corrected). Can run as In-Feed. |
| Meta (Health & Wellness, likely Tier 2) | $1.82 CPC | $4.76-12.46 | Unknown — conversion optimization may be blocked | Standard Lead/CompleteRegistration events may be blocked. Must use custom events. |

### CRITICAL: Google AI Overview Warning

Google AI Overviews now appear on 51-89% of healthcare queries. When they appear, paid ad CTR drops 68%.

| Keyword Type | AI Overview Risk | Use For Ads? |
|---|---|---|
| "how to dispute a medical bill" | HIGH (100% informational) | NO — AI Overview steals the click |
| "medical bill errors" | HIGH (informational) | NO |
| "medical bill help" | MODERATE | MAYBE — test and monitor |
| "medical bill help app" | LOW (transactional) | YES |
| "hospital bill navigator app" | LOW (transactional) | YES |
| "app to fight insurance denial" | LOW (transactional) | YES |
| "negotiate hospital bill service" | LOW (transactional) | YES |

### CRITICAL: Meta Tier 2 Risk

Meta will likely classify Elena as Tier 2 (Health & Wellness). This means:
- Standard conversion events (Lead, CompleteRegistration, Purchase) may be BLOCKED
- You can only optimize for PageView or ViewContent
- Custom audiences with health-implied names get flagged and disabled
- Workaround: Use custom events in GTM with neutral names ("form_submit" not "waitlist_signup")
- Frame Elena as "financial navigation / billing tool" NOT "healthcare app" in all Meta-facing copy and domain content

### Budget Allocation ($1K / 4 Days)

| Channel | Total Budget | Daily | Purpose | Landing Destination |
|---|---|---|---|---|
| Google Search | $400 | $100/day | Waitlist signups from transactional keywords | Landing page (`/lp/bills`) |
| Reddit Ads | $300 | $75/day | Waitlist signups from r/HealthInsurance + r/personalfinance targeting | Blog posts (higher trust) or landing page |
| TikTok (follower seeding) | $80 | $20/day x 4 days | Community Interaction — build 50-200 ICP followers | Profile (follow objective) |
| TikTok (Spark Ads) | $120 | $40/day x 3 days (start Day 2) | Boost best organic post for traffic/conversions | Landing page (`/lp/calls`) |
| Meta | $100 | $25/day | Small test — emoji-bullet static. Monitor for Tier 2 classification. | Landing page (`/lp/bills`) |
| **Total** | **$1,000** | | | |

### Pre-requisites (Day 1, before spending)

- [ ] Landing page above-the-fold rebuilt (new headline, single-field form, social proof)
- [ ] At least one dedicated landing page route (`/lp/bills` and/or `/lp/calls`)
- [ ] Blog posts published (for Reddit ad destinations — higher trust than direct landing page)
- [ ] Film 1-2 short TikTok videos (20-40 sec, optimized for 70% completion rate)
- [ ] Create 2 Meta static images in Canva (Scripts 2B, 2C from ELENA_FINAL_AD_SCRIPTS_MARCH2026.md)
- [ ] Set up Google Search campaigns with TRANSACTIONAL keywords only (see keyword table above)
- [ ] Set up Reddit Ads targeting r/HealthInsurance + r/personalfinance
- [ ] Set up Meta custom conversion event in GTM (use neutral name like "form_submit")
- [ ] TikTok pixel installed, Community Interaction campaign ready

### Day-by-day execution:

**Day 1:**
- Post 1 short (20-40 sec) organic TikTok — Script 2A "$1,300 in errors"
- Launch TikTok Community Interaction ad ($20/day) boosting that post for followers
- Launch Google Search ($100/day) with transactional keywords
- Launch Reddit Ads ($75/day) targeting r/HealthInsurance + r/personalfinance, sending to blog posts
- Launch Meta static test ($25/day) — monitor for Tier 2 classification
- Publish first blog post if not already live

**Day 2:**
- Post second organic TikTok — Script 1A or 1D (pick best ICP)
- Check Day 1 TikTok: did the follower ad generate 10-30 followers? If yes, good signal.
- If Day 1 organic post hit >500 views, Spark Ad it ($40/day)
- Monitor Google Search: which keywords are getting clicks? Kill any with AI Overview cannibalization (high impressions, near-zero clicks)
- Monitor Reddit: click-through from ads, any engagement on blog posts

**Day 3:**
- Post third organic TikTok (different ICP than Day 2)
- You should have 30-80 followers from Community Interaction
- Organic posts start getting tested against these real followers (Phase 1 of new algorithm)
- Shift TikTok budget: if Spark Ad is performing, increase to $60/day. Kill follower ad if you have 50+ followers.
- Check Reddit: if blog posts are getting signups, increase to $100/day and pull from underperforming channel

**Day 4:**
- Final organic TikTok post
- Read ALL data: which channel produced the most signups per dollar?
- You should have 50-200 TikTok followers, enough for organic Phase 1 testing going forward
- Kill anything that didn't produce signups. Double down on winner for Week 2.
- Reddit ads go live.
- Second blog post published.

**Day 4-5:**
- Influencer posts go live. ~800-1,500 daily views.
- Review which ad creatives and landing page variants are converting best.
- Kill underperformers, reallocate budget to winners.

**Day 6-7:**
- Fully optimized. 1K+ daily views with 30%+ conversion on high-intent channels.
- Publish third blog post.
- Plan week 2 based on data.

---

## Part 6: Landing Page Technical Checklist

### For the dedicated ad landing pages (`/lp/*`):

- [ ] No navigation bar (logo only, not clickable or links to `#signup`)
- [ ] Single email field + one CTA button above the fold
- [ ] Headline matches the ad that links to this page
- [ ] Social proof counter visible without scrolling
- [ ] Urgency line ("First 1,000 get 3 months free" or "Launching Spring 2026")
- [ ] 3 feature bullets below the fold (calls, bills, prices)
- [ ] Trust line: "Your data is never sold. Built in NYC."
- [ ] Mobile-first: email field and button must be thumb-reachable
- [ ] Page load < 2 seconds (no heavy video/animation on landing pages)
- [ ] UTM parameters preserved through signup flow
- [ ] Thank-you page with community links (WhatsApp, newsletter)
- [ ] Meta pixel + TikTok pixel + Google tag installed
- [ ] Open Graph tags set correctly for link previews when shared

### For blog posts:

- [ ] Each post has its own URL route (`/blog/medical-bill-errors`, etc.)
- [ ] Inline waitlist CTA at ~40% scroll
- [ ] Bottom CTA after post content
- [ ] Sticky mobile banner with email capture
- [ ] Unique UTM parameters per post
- [ ] SEO: meta title, description, H1 optimized for target keyword
- [ ] Share buttons (optional — low priority for conversion but good for reach)

---

## Part 7: Measuring Success

### Primary metrics (check daily):

| Metric | Target | Where to Track |
|---|---|---|
| Daily website views | 1,000+ | Google Analytics / Vercel Analytics |
| Waitlist conversion rate | 30%+ (high-intent channels), 15%+ (blended) | Waitlist signup tracking |
| Cost per waitlist signup | < $3.00 | Ad platform + signup count |
| Blog-to-signup rate | 8-15% | UTM tracking |

### Secondary metrics (check weekly):

| Metric | Why It Matters |
|---|---|
| Bounce rate by source | Identifies which traffic sources are low quality |
| Time on page (blog posts) | Validates content quality |
| WhatsApp community joins | Measures post-signup engagement |
| Newsletter open rate | Measures waitlist warmth |
| Referral rate | Are signups sharing with others? |

### When to adjust:

- **Conversion < 15% after 3 days:** Landing page problem. A/B test headlines, simplify further.
- **Conversion 15-25%:** Decent. Optimize traffic sources — shift budget toward higher-intent channels (Google, Reddit).
- **Conversion 25-35%:** Good. Scale spend on winning channels.
- **Conversion > 35%:** Excellent. Focus on volume — increase daily spend on best performers.
- **High views but low conversion:** Traffic quality issue. Tighten targeting or improve ad-to-page message match.
- **Low views despite spend:** Creative fatigue or targeting too narrow. Test new ad creatives.

---

## Part 8: Waitlist-to-Onboarding Call Funnel

### Why This Matters for the Landing Page

The real goal isn't "email on a list." It's "human on a Zoom call using TestFlight while you watch." This changes what the landing page, the success state, and the post-signup flow need to do. The landing page must set the expectation that something personal is coming — not just a passive waitlist.

### Current Post-Signup Flow (Broken)

```
User submits email
  → Supabase writes to beta_signups (email + interests + UTM)
  → Success message: "Welcome to the community! Check your email for your WhatsApp invite."
  → No email is actually sent. Nothing happens.
```

The success message says "check your email" but nothing sends. The user hits a dead end. This is where the onboarding funnel starts leaking before it even begins.

### New Post-Signup Flow (Two Paths)

```
User submits email
  → Supabase writes to beta_signups (email + interests + UTM)
  → Sets: email_1_send_after = now() + random(60-180 min)
  → Success state on page updates (see below)

  PATH A: Manual Onboarding (preferred — richest learning)
  ────────────────────────────────────────────────────────
  → ~2 hours later: Email #1 — personal onboarding invite
  → +48 hours: Email #2 — reminder (only if call_booked = false)
  → +5 days:  Email #3 — last chance (only if call_booked = false)
  → User books call → Calendly webhook sets call_booked = true
  → You onboard them live on Zoom + TestFlight

  PATH B: Self-Serve Fallback (still generates learning via session replays)
  ──────────────────────────────────────────────────────────────────────────
  → +7 days:  Email #4 — TestFlight link (only if call_booked = false)
  → User installs TestFlight on their own
  → Session replays capture their behavior — you watch async
```

Both paths produce product learning. Path A is live observation (highest signal). Path B is async replay (lower signal but still valuable, and captures the people who would have churned to zero).

### Landing Page Changes Needed

#### 1. Success state copy (what the user sees after submitting email)

**Current:** "Welcome to the community! Check your email for your WhatsApp invite."

**New:**
> "You're in — you're one of the first to get Elena."
>
> "I'm personally onboarding every early user. Check your inbox in the next few hours — I'll send you a link to grab a 20-minute spot where I set everything up for you live."
>
> "In the meantime, join the conversation:"
> [WhatsApp community link]

This does three things:
- Sets the expectation that an email IS coming (so they check)
- Frames the call as exclusive/personal, not a sales demo
- Gives them something to do now (WhatsApp) so the experience doesn't feel dead

#### 2. CTA button text should hint at the personal experience

Instead of "Join the Community" or even "Join the Waitlist," consider:

> "Get Early Access" (then the success state reveals the personal onboarding angle)

Don't put "book a call" on the landing page itself — that's too heavy an ask for cold traffic. The CTA should be low-friction (email only), and the call invitation comes in the follow-up email when they're already committed.

### Automated Email Sequence

#### Email #1: The Onboarding Invite (1-3 hour delay)

**Why the delay:** An instant email feels automated. A 1-3 hour delay feels like a human who saw the signup and responded. The randomization (not exactly 2 hours every time) reinforces the human feel.

**Implementation:** Supabase database webhook on `beta_signups` insert → triggers an edge function / Resend / Loops.so / whatever email service → randomized delay between 60-180 minutes → sends email.

**Subject line options (A/B test):**
- "Hey — setting up your Elena access"
- "Grabbed your spot — one quick thing"
- "You're in. Let's get you set up."

**Email body:**

```
Hey [first name if captured, otherwise just "Hey"],

I saw you signed up for Elena — thank you. You're one of the first
[X] people to get access and I want to make sure you get the most
out of it from day one.

I'm doing something a little different — instead of just sending you
a download link, I'm personally setting up every early user on a
quick 20-minute video call. I'll walk you through the app, get your
insurance loaded, and make sure everything works for your specific
situation.

It's genuinely 20 minutes. No pitch, no upsell. I just want to see
you use it and hear what you think.

Pick a time that works:
[Calendly/Cal.com link]

Or if you'd rather just reply with a day/time that works, I'll send
you a calendar invite.

Talk soon,
[Your name]
Founder, Elena

P.S. If you haven't already, join our WhatsApp group where early
members share healthcare tips and help each other navigate the
system: [WhatsApp link]
```

**Key design decisions in this email:**
- No HTML template. Plain text. Feels like a human typed it.
- "I saw you signed up" — implies a person noticed, not a system
- "one of the first [X] people" — scarcity/exclusivity
- "20 minutes" not "30 minutes" — lower perceived commitment
- "Or just reply with a day/time" — removes Calendly friction for people who won't click scheduling links
- P.S. with WhatsApp — secondary CTA, doesn't distract from the main ask
- No images, no logos, no footer with 10 social links. Raw and personal.

#### Email #2: The Reminder (48 hours after Email #1, only if no booking)

**Subject:** "Still want to try Elena?"

**Body:**

```
Hey — following up on my note from a couple days ago.

I still have a few onboarding slots open this week if you want
to get set up. It's 20 minutes — I walk you through the app and
get your insurance loaded so everything works for you specifically.

Spots are filling up though — I can only do about 6 of these a
day, so grab one if you're interested:
[Calendly/Cal.com link]

Or just reply and I'll find a time.

[Your name]
```

**Key decisions:**
- "a few slots open this week" — urgency without being pushy
- "I can only do about 6 a day" — real constraint, feels honest
- Even shorter than email #1. Respectful of their time.

#### Email #3: Last Chance (5 days after Email #1, only if no booking)

**Subject:** "Last call — your Elena access"

**Body:**

```
Hey — last note from me on this.

I'm wrapping up the first round of personal onboarding sessions
this week. After that, new signups will get the self-serve setup
(which is fine, but you miss the 1-on-1 walkthrough and the
chance to tell me what features matter most to you).

If you want the personal setup:
[Calendly/Cal.com link]

If the timing doesn't work right now, no worries at all — you'll
still get access when we open up more broadly. Just won't be the
personal version.

[Your name]
```

**Key decisions:**
- Creates real urgency — "this round is ending"
- Offers a graceful exit — "no worries, you'll still get access"
- Differentiates personal onboarding from self-serve — makes the call feel like a bonus, not a hoop

#### Email #4: Self-Serve TestFlight Link (7 days after Email #1, only if call_booked = false)

This is the fallback. They didn't book a call — but you still want them using the app so session replays capture their behavior.

**Subject:** "Your Elena access is ready"

**Body:**

```
Hey — I know scheduling can be tough, so I'm just going to
send you the app directly.

Here's your TestFlight link to install Elena:
[TestFlight link]

Quick start (takes 2 minutes):
1. Tap the link above on your iPhone
2. Install TestFlight if you don't have it
3. Open Elena and snap a photo of your insurance card
4. Ask her anything — "what's my deductible?" or "find me
   a dermatologist near me"

If you run into any issues or have feedback, just reply to
this email. I read every one.

And if you do want that 20-minute personal walkthrough at
any point, the link still works:
[Calendly/Cal.com link]

[Your name]
```

**Key decisions:**
- No guilt about not booking. Just gives them the thing.
- Simple numbered steps reduce TestFlight install friction
- Keeps the call option alive as a soft secondary CTA
- "I read every one" — invites async feedback even if they won't do a call
- Session replays will capture everything they do from here

### Expected Funnel Performance (Both Paths)

From 150 waitlist signups:

**Path A: Manual Onboarding Calls**

| Stage | Rate | People |
|---|---|---|
| Open email #1 | 55-70% | 83-105 |
| Click scheduling link or reply | 35-50% of openers | 29-53 |
| Book a slot | 70-85% of clickers | 20-45 |
| Show up | 75-85% of bookers | 15-38 |
| Complete TestFlight session on call | 90-95% of show-ups | **14-36** |

**Path B: Self-Serve Fallback (non-bookers)**

| Stage | Rate | People |
|---|---|---|
| Didn't book after 3 emails | ~75-85% of signups | 105-128 |
| Open Email #4 (TestFlight link) | 40-55% | 42-70 |
| Click TestFlight link | 30-45% of openers | 13-32 |
| Actually install + open app | 50-70% of clickers | **6-22** |

**Combined outcome from 150 signups:**

| Path | Users on TestFlight | Learning Method |
|---|---|---|
| A: Manual onboarding calls | 14-36 | Live observation (richest) |
| B: Self-serve install | 6-22 | Session replay (async) |
| **Total users on TestFlight** | **20-58** | **Both generate product learning** |

Without the self-serve fallback, the 105-128 people who didn't book a call would produce zero learning. With it, you capture 6-22 additional users and their session replays. That's a meaningful increase for $0 extra cost.

### Implementation: Supabase-Only Approach

Since you already have Supabase, here's the simplest architecture — no external email service needed beyond Resend's free tier (3,000 emails/month, $0).

#### Database schema additions to `beta_signups`:

```sql
ALTER TABLE beta_signups ADD COLUMN IF NOT EXISTS
  email_1_send_after timestamptz,        -- randomized: created_at + 60-180 min
  email_1_sent_at    timestamptz,
  email_2_sent_at    timestamptz,
  email_3_sent_at    timestamptz,
  email_4_sent_at    timestamptz,
  call_booked        boolean DEFAULT false,
  call_booked_at     timestamptz,
  testflight_installed boolean DEFAULT false;
```

#### Trigger on INSERT (sets the randomized delay):

```sql
CREATE OR REPLACE FUNCTION set_email_schedule()
RETURNS trigger AS $$
BEGIN
  NEW.email_1_send_after := NEW.created_at + (60 + floor(random() * 120)) * interval '1 minute';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_set_email_schedule
  BEFORE INSERT ON beta_signups
  FOR EACH ROW EXECUTE FUNCTION set_email_schedule();
```

#### Cron job (runs every 15 minutes, checks what needs sending):

Use `pg_cron` + `pg_net` (both available on Supabase free tier) or a single Edge Function on a cron schedule.

The Edge Function approach (simpler to write email logic):

```
Supabase Cron (every 15 min)
  → Calls Edge Function "process-email-queue"
  → Function queries beta_signups for:

    Email #1: email_1_send_after <= now() AND email_1_sent_at IS NULL
    Email #2: email_1_sent_at + 48 hours <= now() AND email_2_sent_at IS NULL AND call_booked = false
    Email #3: email_1_sent_at + 5 days <= now() AND email_3_sent_at IS NULL AND call_booked = false
    Email #4: email_1_sent_at + 7 days <= now() AND email_4_sent_at IS NULL AND call_booked = false

  → For each match: send email via Resend API, update *_sent_at timestamp
```

#### Calendly webhook (marks call_booked = true):

When someone books via Calendly, Calendly sends a webhook. Point it at a small Edge Function that:
1. Extracts the invitee email from the webhook payload
2. Updates `beta_signups SET call_booked = true, call_booked_at = now() WHERE email = [invitee email]`

This stops Emails #2, #3, and #4 from sending to that person.

#### Cost at 500 signups:

| Component | Usage | Cost |
|---|---|---|
| Supabase free tier | 500 rows, ~2,000 edge function invocations (cron), 500 webhook calls | $0 |
| Resend free tier | 500 signups x 3.5 emails avg = ~1,750 emails | $0 (3,000/month limit) |
| Calendly free tier | 1 event type, unlimited bookings | $0 |
| **Total** | | **$0** |

### Implementation Checklist (Updated)

#### Landing page changes:
- [ ] Update hero success state copy (set expectation for personal email coming in a few hours)
- [ ] Update bottom form success state copy (same)
- [ ] Change CTA button text from "Join the Community" to "Get Early Access"
- [ ] Optional: Remove survey step (email only → submit → success state)
- [ ] Add social proof line if possible ("X people on the waitlist")

#### Database:
- [ ] Add columns to `beta_signups`: email schedule timestamps, call_booked, testflight_installed
- [ ] Add INSERT trigger for randomized `email_1_send_after`
- [ ] Set up pg_cron schedule (every 15 min)

#### Edge Functions:
- [ ] `process-email-queue` — runs on cron, queries for pending emails, sends via Resend
- [ ] `calendly-webhook` — receives Calendly booking webhook, sets call_booked = true
- [ ] Set up Resend account (free, 3,000 emails/month) and get API key

#### Email templates (all plain text, stored in the edge function):
- [ ] Email #1: Onboarding invite (1-3 hr delay)
- [ ] Email #2: Reminder (48 hr, conditional)
- [ ] Email #3: Last chance for call (5 days, conditional)
- [ ] Email #4: Self-serve TestFlight link (7 days, conditional)

#### Scheduling:
- [ ] Set up Calendly/Cal.com with 20-minute slots, 10-minute buffers, 5-6 slots/day
- [ ] Configure Calendly webhook → Supabase edge function URL

#### Tracking:
- [ ] Track full funnel: signup → email opened → call booked → call completed → TestFlight installed
- [ ] Track self-serve path: signup → email #4 opened → TestFlight link clicked → app opened (session replay)
- [ ] UTM params from original signup carry through to Calendly (pass via URL params)
- [ ] Tag session replays with UTM source so you can see which ad/channel produced which user behavior

### Metrics That Matter (Updated)

Two primary conversion events now — track both:

| Metric | Target | Why |
|---|---|---|
| Cost per waitlist signup | <$3-5 | Intermediate metric |
| **Cost per onboarding call (Path A)** | <$30-50 | Highest-value learning event |
| **Cost per self-serve install (Path B)** | <$15-25 | Lower-signal but still valuable |
| **Cost per total TestFlight user (A+B)** | <$20-35 | Combined learning metric |
| Waitlist → booked call rate | 15-25% | Email sequence health |
| Waitlist → self-serve install rate | 4-15% | Fallback path health |
| Waitlist → ANY TestFlight usage | 13-39% | Overall activation rate |
| Booked → showed up rate | 75-85% | Reminder flow health |
| Self-serve → opened app at least once | 60-80% | TestFlight install friction |

---

## Part 10: CTA Strategy — Email-First vs. Immediate Booking

### Current Recommendation: Email-first with optional express booking on success state

The landing page CTA should be a low-friction email signup. After submission, the success state shows an optional Calendly link for highly motivated users, while the email sequence handles everyone else.

### Why Email-First (Not Calendly-First) for Cold Paid Traffic

No direct A/B test exists for "email waitlist vs Calendly embed" on a consumer health app with cold TikTok traffic. The recommendation is based on converging directional data:

**1. Lower-commitment CTAs dramatically outperform on cold traffic:**
- PartnerStack: changed "Book a Demo" → "Get Started" = +111% conversion ([HubSpot](https://blog.hubspot.com/marketing/personalized-calls-to-action-convert-better-data))
- Mailmodo: changed "Book a demo" → "Talk to a Human" = +110% conversion ([KlientBoost](https://www.klientboost.com/marketing/call-to-action-examples/))
- Pattern: every step down in commitment level = significant conversion lift on cold audiences

**2. Calendly's own guidance says booking works better on warm traffic:**
- "Reserve 1:1 consultations for retargeting audiences or existing leads rather than cold traffic" ([Calendly routing blog](https://calendly.com/blog/routing))

**3. Email-nurtured traffic converts 4x higher than cold for booking actions:**
- Cold paid social: 1-3% conversion to booking
- Email-sourced traffic: 4-8% conversion to booking
- ([DTC Landing Page Benchmarks](https://mhigrowthengine.com/blog/dtc-landing-page-conversion-benchmarks/))

**4. Fewer form fields = higher conversion:**
- Removing a single form field: +25.5% clicks (Kommunicate case study)
- Cutting fields from 11 to 4: +120% conversion ([Involve.me](https://www.involve.me/blog/landing-page-statistics))
- Email field = 1 input. Calendly embed = name + email + time + confirmation = 4+ inputs.

**5. Precedent:**
- Superhuman: email waitlist first → call invite via email → scaled to 550K waitlist, every user did a 30-min onboarding call ([First Round Review](https://review.firstround.com/superhuman-onboarding-playbook/))

### What We Don't Know (Future A/B Test Opportunity)

- No published data on email-first vs. Calendly-first for a consumer healthcare app specifically
- Elena's audience (Gen Z with phone anxiety) might actually prefer Calendly booking over an email exchange — or they might find a call even more intimidating upfront
- Worth A/B testing once there's enough traffic: run email-first for 2 days, Calendly-embed for 2 days, compare conversion rates

### The Express Lane (Hybrid Approach)

After email submission, the success state offers both paths:

```
"You're in! Check your inbox in the next few hours for your
personal setup link."

[Book my 20-min setup now →]  ← optional, for the 5-10% who are hot

"Or join the conversation while you wait:"
[WhatsApp group →]
```

This captures the ~5-10% of highly motivated people who would book immediately (highest show rate — they're at peak motivation) while still collecting email from everyone for the nurture sequence.

### What to Track (Everything)

The primary goal right now is learning, not optimization. Track every step so future decisions are data-driven:

| Event | How to Track | Why It Matters |
|---|---|---|
| Landing page view | Vercel Analytics / Umami (already installed) | Denominator for all conversion rates |
| UTM source/medium/campaign | Already captured in Supabase on signup | Tells you which ad/channel/creative drove each signup |
| Email submitted (waitlist signup) | Supabase `beta_signups` INSERT | Primary landing page conversion event |
| Express Calendly click (from success state) | UTM or click event on the Calendly link in success state | Measures the "hot" path — how many book immediately vs. waiting for email |
| Email #1 sent | `email_1_sent_at` in Supabase | Confirms automation is working |
| Email #1 opened | Resend open tracking (built-in) | Email deliverability + subject line effectiveness |
| Email #1 link clicked | Resend click tracking | Measures interest in the call offer |
| Calendly booked | Calendly webhook → `call_booked = true` | The high-value conversion event |
| Calendly booked from which email | UTM params on Calendly link (different per email: `?utm_content=email1` vs `email2` vs `email3` vs `success_state`) | Tells you which email / touchpoint drives the most bookings |
| Call completed | Manual toggle in Supabase after each call | Actual learning sessions completed |
| Email #4 sent (TestFlight) | `email_4_sent_at` in Supabase | Self-serve path triggered |
| TestFlight link clicked | Resend click tracking on Email #4 | Interest in self-serve |
| TestFlight installed | App analytics or manual check | Self-serve activation |
| Session replay captured | Session replay tool dashboard | Confirms async learning is flowing |
| WhatsApp group joined | WhatsApp group member count (manual check) | Community engagement health |

**Tag Calendly links differently per touchpoint** so you know WHERE people booked from:
- Success state link: `{CALENDLY_URL}?utm_content=success_state`
- Email #1 link: `{CALENDLY_URL}?utm_content=email_1`
- Email #2 link: `{CALENDLY_URL}?utm_content=email_2`
- Email #3 link: `{CALENDLY_URL}?utm_content=email_3`
- Email #4 link: `{CALENDLY_URL}?utm_content=email_4`

This tells you whether people book immediately (success state), after the first email (1-3 hrs), after the reminder (48 hrs), or at the last minute (5 days). That data determines whether the email sequence is actually necessary or whether most people just book from the success state.

### Decisions This Data Enables Later

Once you have 200-500 signups flowing through:

| If you see... | It means... | Then do... |
|---|---|---|
| 80%+ of bookings from success state | Email sequence isn't driving bookings | Simplify to just the success state + one reminder |
| 80%+ of bookings from Email #1 | The delayed email works, success state express lane is unused | Consider removing the express Calendly from success state |
| Bookings spread across all touchpoints | Full sequence is working, each email captures incrementally | Keep the sequence as-is |
| Very few bookings, high self-serve installs | Your audience doesn't want calls | Pivot to self-serve with session replays as primary learning |
| High bookings but low show rate | People book impulsively but don't follow through | Add SMS reminder, reduce time between booking and call |
| One UTM source has 3x the booking rate | That channel produces the most motivated users | Shift ad budget toward that channel |

---

## Part 9: Vercel API Routes Implementation (Email Automation)

These instructions are for a separate coding agent to implement the post-signup email automation using Vercel API routes in this repo.

### Overview

Add server-side email automation to the existing static website. When a user signs up via the waitlist form (which already writes to Supabase `beta_signups`), a sequence of 4 emails sends over 7 days. The emails are plain text, intentionally human-sounding, with randomized delays.

### Prerequisites

- Resend account (free tier, 3,000 emails/month): https://resend.com — get an API key
- Calendly account (free tier): set up a 20-minute event type with 10-minute buffers
- Supabase project already exists at `https://livbrrqqxnvnxhggguig.supabase.co`
- Vercel project already exists and deploys from this repo

### Step 1: Add dependencies

Create `package.json` in the repo root (the site is currently pure static HTML with no package.json):

```json
{
  "private": true,
  "dependencies": {
    "resend": "^4.0.0",
    "@supabase/supabase-js": "^2.0.0"
  }
}
```

Run `npm install`.

### Step 2: Add environment variables in Vercel

Add these in Vercel Dashboard → Settings → Environment Variables (do NOT put these in code):

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
SUPABASE_URL=https://livbrrqqxnvnxhggguig.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (NOT the anon key — use the service role key for server-side writes)
CALENDLY_WEBHOOK_SECRET=xxxxx  (from Calendly webhook config)
FROM_EMAIL=abhigya@elena-health.com  (or whatever verified sender domain in Resend)
CALENDLY_URL=https://calendly.com/yourname/elena-onboarding  (your booking link)
WHATSAPP_URL=https://chat.whatsapp.com/xxxxx  (your community invite link)
TESTFLIGHT_URL=https://testflight.apple.com/join/xxxxx  (your TestFlight public link)
```

### Step 3: SQL migration — run in Supabase SQL editor

```sql
-- Add email sequence tracking columns
ALTER TABLE beta_signups
  ADD COLUMN IF NOT EXISTS email_1_send_after timestamptz,
  ADD COLUMN IF NOT EXISTS email_1_sent_at    timestamptz,
  ADD COLUMN IF NOT EXISTS email_2_sent_at    timestamptz,
  ADD COLUMN IF NOT EXISTS email_3_sent_at    timestamptz,
  ADD COLUMN IF NOT EXISTS email_4_sent_at    timestamptz,
  ADD COLUMN IF NOT EXISTS call_booked        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS call_booked_at     timestamptz,
  ADD COLUMN IF NOT EXISTS testflight_installed boolean DEFAULT false;

-- Trigger: on INSERT, set randomized send time for Email #1 (60-180 min after signup)
CREATE OR REPLACE FUNCTION set_email_schedule()
RETURNS trigger AS $$
BEGIN
  NEW.email_1_send_after := NEW.created_at + (60 + floor(random() * 120)) * interval '1 minute';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_email_schedule ON beta_signups;
CREATE TRIGGER tr_set_email_schedule
  BEFORE INSERT ON beta_signups
  FOR EACH ROW EXECUTE FUNCTION set_email_schedule();
```

### Step 4: Create `api/process-emails.js`

This is a Vercel serverless function. It runs on a cron schedule (see Step 6) and processes the email queue.

```
File: api/process-emails.js
```

**What it does:**

1. Query Supabase for rows matching each email condition:
   - **Email #1:** `email_1_send_after <= now() AND email_1_sent_at IS NULL`
   - **Email #2:** `email_1_sent_at + interval '48 hours' <= now() AND email_2_sent_at IS NULL AND call_booked = false`
   - **Email #3:** `email_1_sent_at + interval '5 days' <= now() AND email_3_sent_at IS NULL AND call_booked = false`
   - **Email #4:** `email_1_sent_at + interval '7 days' <= now() AND email_4_sent_at IS NULL AND call_booked = false`

2. For each match, send the corresponding email via Resend API (plain text, no HTML)

3. After sending, update the row: set the corresponding `*_sent_at = now()`

4. Return a summary of what was sent (for logging)

**Authentication:** Protect this endpoint so only the cron can call it. Use a `CRON_SECRET` env var — the cron request sends it as a bearer token or query param, the function checks it before proceeding.

**Email templates (all plain text, no HTML):**

Email #1 subject options (pick one or A/B test):
- "Hey — setting up your Elena access"
- "Grabbed your spot — one quick thing"

Email #1 body:
```
Hey,

I saw you signed up for Elena — thank you. You're one of the first
people to get access and I want to make sure you get the most out
of it from day one.

I'm doing something a little different — instead of just sending you
a download link, I'm personally setting up every early user on a
quick 20-minute video call. I'll walk you through the app, get your
insurance loaded, and make sure everything works for your specific
situation.

It's genuinely 20 minutes. No pitch, no upsell. I just want to see
you use it and hear what you think.

Pick a time that works:
{CALENDLY_URL}

Or if you'd rather just reply with a day/time that works, I'll send
you a calendar invite.

Talk soon,
Abhigya
Founder, Elena

P.S. If you haven't already, join our WhatsApp group where early
members share healthcare tips and help each other navigate the
system: {WHATSAPP_URL}
```

Email #2 subject: "Still want to try Elena?"
Email #2 body:
```
Hey — following up on my note from a couple days ago.

I still have a few onboarding slots open this week if you want
to get set up. It's 20 minutes — I walk you through the app and
get your insurance loaded so everything works for you specifically.

Spots are filling up though — I can only do about 6 of these a
day, so grab one if you're interested:
{CALENDLY_URL}

Or just reply and I'll find a time.

Abhigya
```

Email #3 subject: "Last call — your Elena access"
Email #3 body:
```
Hey — last note from me about the personal onboarding.

I'm wrapping up the first round of personal onboarding sessions
this week. After that, I'll just send you the app link directly
(which is fine, but you miss the 1-on-1 walkthrough and the
chance to tell me what features matter most to you).

If you want the personal setup:
{CALENDLY_URL}

If the timing doesn't work right now, no worries at all — I'll
send you the download link in a couple days so you can get
started on your own.

Abhigya
```

Email #4 subject: "Your Elena access is ready"
Email #4 body:
```
Hey — I know scheduling can be tough, so I'm just going to
send you the app directly.

Here's your TestFlight link to install Elena:
{TESTFLIGHT_URL}

Quick start (takes 2 minutes):
1. Tap the link above on your iPhone
2. Install TestFlight if you don't have it
3. Open Elena and snap a photo of your insurance card
4. Ask her anything — "what's my deductible?" or "find me
   a dermatologist near me"

If you run into any issues or have feedback, just reply to
this email. I read every one.

And if you do want that 20-minute personal walkthrough at
any point, the link still works:
{CALENDLY_URL}

Abhigya
```

### Step 5: Create `api/calendly-webhook.js`

```
File: api/calendly-webhook.js
```

**What it does:**

1. Receives POST from Calendly when someone books (event type: `invitee.created`)
2. Validates the webhook signature using `CALENDLY_WEBHOOK_SECRET`
3. Extracts invitee email from the payload (`payload.invitee.email`)
4. Updates Supabase: `UPDATE beta_signups SET call_booked = true, call_booked_at = now() WHERE email = [invitee email]`
5. Returns 200

**Calendly webhook setup:**
- Go to Calendly → Integrations → Webhooks
- Add webhook URL: `https://elena-health.com/api/calendly-webhook`
- Subscribe to event: `invitee.created`
- Copy the signing key → set as `CALENDLY_WEBHOOK_SECRET` env var

### Step 6: Configure Vercel Cron

Update `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/invite/:code", "destination": "/invite/index.html" }
  ],
  "crons": [
    {
      "path": "/api/process-emails?secret=${CRON_SECRET}",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Note on Vercel Hobby plan:** Vercel Hobby allows 2 cron jobs but only daily frequency. For every-15-minute execution, either:
- Upgrade to Vercel Pro ($20/month) for 1-minute granularity, OR
- Use a free external cron service (cron-job.org, UptimeRobot) to ping `https://elena-health.com/api/process-emails?secret=YOUR_CRON_SECRET` every 15 minutes. This is free and works fine.

Add `CRON_SECRET` to your Vercel environment variables (any random string). The `process-emails` function should check this before running.

### Step 7: Update the landing page success states

In `index.html`, update the two success message elements:

**Hero success (line ~1156):**
Change from: `"Welcome to the community! Check your email for your WhatsApp invite."`
Change to: `"You're in! Check your inbox in the next few hours — I'll personally send you a link to set up your 20-minute onboarding call."`

**Bottom success (line ~1349):**
Same change as above.

### Step 8: Update CTA button text

In `index.html`, update both form submit buttons:

**Hero form (line ~1143):**
Change from: `"Join the Community"`
Change to: `"Get Early Access"`

**Bottom form (line ~1336):**
Same change.

### Testing Checklist

- [ ] Sign up with a test email on the live site
- [ ] Verify row appears in Supabase `beta_signups` with `email_1_send_after` set ~1-3 hours in the future
- [ ] Wait for cron to fire (or manually hit the process-emails endpoint)
- [ ] Verify Email #1 arrives (check spam too — Resend needs a verified domain)
- [ ] Book via Calendly with the same email
- [ ] Verify `call_booked` flips to `true` in Supabase
- [ ] Verify Emails #2-#4 do NOT send for that user
- [ ] Sign up with a second test email and do NOT book
- [ ] Verify Emails #2, #3, #4 send at the correct intervals
- [ ] Verify Email #4 contains the TestFlight link

---

## Session Log: Blog Post Implementation (zany-mixing-creek)

<!-- Continuously updated during implementation. Other sessions: check this before modifying beta_signups or blog/ files. -->

### Schema Changes
- **2026-03-24**: Added `source_page text` column to `beta_signups` table. Blog signups will set this to `"blog_{slug}"` (e.g., `"blog_medical_bill_errors"`). RLS policy unchanged — anonymous inserts still allowed.

### Blog File Structure
```
blog/
  blog.css          — shared styles for all posts
  blog.js           — shared JS (form handling, sticky bar, exit-intent, UTM capture)
  medical-bill-errors.html
  47-minutes-on-hold.html
  mri-cost-comparison.html
  what-eob-means.html
  managing-parents-healthcare.html
  health-insurance-at-26.html
```
URLs: `/blog/{slug}` (cleanUrls strips .html)

### Progress
- [x] Supabase migration: `source_page` column added
- [x] blog.css created
- [x] blog.js created
- [x] Post 1: medical-bill-errors
- [x] Post 2: 47-minutes-on-hold
- [x] Post 3: mri-cost-comparison
- [x] Post 4: what-eob-means
- [x] Post 5: managing-parents-healthcare
- [x] Post 6: health-insurance-at-26
- [x] Footer links added to index.html (inline styles, between footer-tagline and footer-bottom)
- [ ] Verify all 6 URLs resolve after deploy

### Issues / Bugs
- **NOTE**: Parallel session added `crons` to `vercel.json` for email processing. Blog pages don't need vercel.json changes — cleanUrls already works for `/blog/` paths.

---

## Session Log: Post-Signup Email Automation (cryptic-seeking-liskov)

<!-- Continuously updated during implementation. Other sessions: check this before modifying beta_signups, vercel.json, index.html, or navigator.html. -->

### Schema Discoveries
- **2026-03-24**: The MD file Part 9 Step 3 references `created_at` in the trigger SQL. The actual column is `signed_up_at`. All implementation uses `signed_up_at`. If you're writing SQL against beta_signups, use `signed_up_at` not `created_at`.
- **2026-03-24**: Parallel session (zany-mixing-creek) added `source_page text` column — noted, no conflict with email drip columns.

### Schema Changes Applied
- **2026-03-24**: Added 8 columns to `beta_signups`: `email_1_send_after`, `email_1_sent_at`, `email_2_sent_at`, `email_3_sent_at`, `email_4_sent_at`, `call_booked` (boolean, default false), `call_booked_at`, `testflight_installed` (boolean, default false).
- **2026-03-24**: Created trigger `tr_set_email_schedule` — on INSERT, sets `email_1_send_after = signed_up_at + random(60-180 min)`. Tested: a test insert got a 2h28m delay (within range). Test row deleted.

### Files Created/Modified
- `package.json` — created with `resend` + `@supabase/supabase-js`
- `api/process-emails.js` — Vercel serverless function, processes 4-email drip queue every 15 min via external cron. Auth via `CRON_SECRET` (Bearer token or `?secret=` query param).
- `api/calendly-webhook.js` — receives Calendly `invitee.created` POST, verifies signature, sets `call_booked=true`.
- `vercel.json` — added `crons` section (will only work on Vercel Pro; use external cron on Hobby plan).
- `index.html` — changed CTA buttons "Join the Community" -> "Get Early Access", success messages updated to reference onboarding call.
- `navigator.html` — same CTA + success message changes.

### Analytics Note
- The MD file Part 7 references "Google Analytics / Vercel Analytics" for tracking. The actual analytics are **Umami + Mixpanel** (both on index.html and navigator.html). No GA or Vercel Analytics installed.

### Cron Setup Required (Manual)
- Vercel Hobby plan only supports daily cron. Use **cron-job.org** (free) or **UptimeRobot** (free) to GET `https://elena-health.com/api/process-emails` every 15 min with `Authorization: Bearer <CRON_SECRET>` header.

### Env Vars Required in Vercel Dashboard
```
CRON_SECRET=<random string>
SUPABASE_URL=https://livbrrqqxnvnxhggguig.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key, NOT anon key>
RESEND_API_KEY=<resend api key>
FROM_EMAIL=<verified sender in Resend>
CALENDLY_URL=<your 20-min event booking link>
CALENDLY_WEBHOOK_SECRET=<from Calendly webhook config>
WHATSAPP_URL=<community invite link>
TESTFLIGHT_URL=<TestFlight public link>
```

### Progress
- [x] package.json + npm install
- [x] SQL migration (columns + trigger) applied to Supabase
- [x] api/process-emails.js created
- [x] api/calendly-webhook.js created
- [x] vercel.json updated with crons
- [x] index.html CTA + success messages updated
- [x] navigator.html CTA + success messages updated
- [ ] Deploy to Vercel and verify endpoints
- [ ] Set env vars in Vercel dashboard
- [ ] Set up external cron (cron-job.org)
- [ ] Set up Calendly webhook -> /api/calendly-webhook
- [ ] End-to-end test with real signup

### Issues / Bugs
(none yet)
