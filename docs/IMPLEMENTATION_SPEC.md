# Elena Website Implementation Spec — Landing Page Changes for Ad Campaign

*For: Coding agent*
*Date: March 24, 2026*
*Context: $1K paid ad test launching across Google Search, Reddit, TikTok, Meta. Need landing pages optimized for waitlist signups with full UTM attribution.*

---

## What Exists Today

The site is a single-page static HTML app deployed on Vercel.

**Files:**
- `index.html` — the entire site (HTML + CSS + JS, ~1500 lines)
- `invite/index.html` — invite/referral page
- `vercel.json` — rewrites + cron config
- `images/` — static assets (phone-bg.jpg, elena-demo.mp4, feature images, favicon)

**Current tech:**
- Pure HTML/CSS/JS (no framework, no build step)
- Fonts: Inter + DM Serif Display (Google Fonts)
- Analytics: Vercel Analytics + Umami (already installed, lines 1502-1503)
- Form backend: Supabase `beta_signups` table (REST API, anon key in client JS)
- UTM capture: Already implemented (lines 1404-1410) — captures utm_source, utm_medium, utm_campaign, utm_term, utm_content from URL params and sends them with the signup

**Current page structure (in order):**
1. Nav: logo + "How it Works" + "Features" links + CTA
2. Hero: headline "The confidence to get the care you deserve." + subtitle + email form + survey step + success message
3. Phone scroll section (350vh with sticky phone + demo video)
4. Community perks section (WhatsApp, newsletter, Q&A)
5. Manifesto section ("Healthcare costs shouldn't be a mystery")
6. Stat banner ("The same MRI can cost $400 or $2,500")
7. Trust strip (data never sold, built by frustrated people, not medical advice)
8. Features carousel (6 feature cards in infinite scroll loop)
9. Bottom waitlist form (same structure as hero: email + survey + success)
10. Footer

**Current form flow:**
1. User enters email, clicks "Get Early Access"
2. Form hides, survey appears (4 checkboxes: price transparency, bill fighting, health data, automation)
3. User clicks Submit or Skip
4. `submitToSupabase()` sends email + interests + UTM params to Supabase
5. Success message appears: "You're in! We'll reach out when early access is ready."

**Current CTA button text:** "Get Early Access" (both hero and bottom forms)

**Supabase config:**
- URL: `https://livbrrqqxnvnxhggguig.supabase.co`
- Anon key: in index.html line 1402
- Table: `beta_signups`
- Columns: email, interests (array), utm_source, utm_medium, utm_campaign, utm_term, utm_content

---

## What Needs to Change

### Change 1: Create 3 ICP-specific landing pages

The ad campaign sends different audiences to different pages. Each page has a different headline and feature emphasis but shares the same form and backend.

**Create these routes:**

| Route | ICP | Headline | Sub-headline | Feature bullets |
|---|---|---|---|---|
| `/lp/bills` | #1 Bill Fighter | "Upload your medical bill. Elena finds the errors and fights them for you." | "80% of hospital bills have errors. Elena reads every line." | 1. Reads your bill line by line, flags errors 2. Calls the billing department on your behalf 3. Shows real prices before you book |
| `/lp/calls` | #1 Bill Fighter | "Elena calls your insurance so you don't have to." | "No more hold music. No more transfers. No more giving up." | 1. Makes phone calls to insurance and billing 2. Sits on hold, talks to reps, reports back 3. Finds billing errors and disputes them |
| `/lp/caregiver` | #2 Caregiver | "Manage your parent's healthcare from your phone." | "One app for their insurance, doctors, meds, and bills." | 1. Track appointments, medications, and bills in one place 2. Elena makes the calls you can't 3. Manage your parent's care without quitting your job |

**Implementation approach:** The landing pages should be based on the existing `index.html` homepage — same structure, same design, same below-the-fold content — but with ICP-specific hero copy and a few sections removed/simplified. Do NOT build these from scratch as minimal single-screen pages. They should feel like the full Elena experience, just with the hero tailored to the ad that sent the user there.

Create as separate HTML files (`lp/bills/index.html`, `lp/calls/index.html`, `lp/caregiver/index.html`) based on `index.html`.

**What to CHANGE from the homepage:**

| Section | Homepage | `/lp` pages |
|---|---|---|
| Nav links ("How it Works", "Features") | Keep | **REMOVE** — logo only, no clickable nav links. These are exit ramps. |
| Hero headline + subtitle | "The confidence to get the care you deserve." | **REPLACE** with ICP-specific headline/subtitle from the table above |
| Hero email form | Email + survey step | **SIMPLIFY** — email field + "Get Early Access" button only. No survey step. Submit goes directly to Supabase. |
| Hero success state | "You're in! We'll reach out when early access is ready." | Keep as-is |
| Phone scroll section (350vh parallax) | Full 350vh sticky scroll | **REDUCE** — replace with a single static phone mockup showing the Elena UI, or a short (5-10 sec) autoplay muted loop. No 350vh scroll. This preserves the product demo feel without killing page load. |
| Community perks section | Keep | **REMOVE** — not relevant when the only CTA is email signup |
| Manifesto section | Keep | **KEEP** — "Healthcare costs shouldn't be a mystery" builds credibility |
| Stat banner ("$400 vs $2,500 MRI") | Keep | **KEEP** — social proof / urgency |
| Trust strip | Keep | **KEEP** — "Your data is never sold" answers a real objection |
| Feature carousel | 6 cards in infinite loop | **KEEP but show only the 3 cards that match the ICP** (see table below). No infinite loop needed with only 3. |
| Bottom waitlist form | Email + survey | **KEEP but without survey** — email + button only, same as hero |
| Footer | Full footer | **SIMPLIFY** — keep copyright + fine print, remove nav links |

**Which 3 feature cards to show per landing page:**

| Landing Page | Card 1 | Card 2 | Card 3 |
|---|---|---|---|
| `/lp/bills` | "She actually calls for you." (img-couch) | "Insurance, decoded." (img-phone) | "Find the cheapest meds." (img-meds) |
| `/lp/calls` | "She actually calls for you." (img-couch) | "Insurance, decoded." (img-phone) | "Stay on top of it." (img-meditate) |
| `/lp/caregiver` | "Your whole family, covered." (img-family) | "She actually calls for you." (img-couch) | "Your whole health, one place." (img-hugging) |

**What to KEEP identical from the homepage:**
- All CSS (styles, animations, responsive breakpoints)
- Font imports (Inter + DM Serif Display)
- Color scheme (dark blue gradient hero, peachy-orange glow)
- Hero blob animations
- Fade-in scroll animations
- Form styling
- Supabase submission code (with UTM capture)
- Analytics scripts (Vercel + Umami)
- Mobile responsive behavior

**Form behavior on landing pages (simplified — no survey):**
1. User enters email, clicks "Get Early Access"
2. `submitToSupabase(email, [], successEl)` fires immediately — empty interests array, no survey step
3. Success state shows: "You're in — you're one of the first to get Elena. We'll reach out when early access is ready."
4. Optionally show WhatsApp community link in the success state as a secondary action

**UTM handling:** The landing pages already receive UTM params via URL query strings (e.g., `/lp/bills?utm_source=google&utm_medium=search&utm_campaign=icp1_billfighter`). The existing UTM capture code (lines 1404-1410 of index.html) should be reused on all landing pages.

### Change 2: Create blog post routes

Reddit ads link to blog posts (not landing pages) because Reddit users distrust direct landing pages. Blog posts build trust through content, then convert via inline CTAs.

**Create these routes:**

| Route | Title | Purpose |
|---|---|---|
| `/blog/medical-bill-errors` | "How to Check Your Medical Bill for Errors (Step-by-Step)" | Reddit ad destination for ICP #1 |
| `/blog/eob-guide` | "What Your EOB Actually Means (And Why It's Not a Bill)" | Reddit ad destination for ICP #1 |
| `/blog/caregiver-guide` | "Managing Your Parent's Healthcare From 1,000 Miles Away" | Reddit ad destination for ICP #2 |

**Each blog post must have:**
- Clean, readable layout (max-width ~700px content area, good typography)
- The article content (full text provided in `ELENA_COMPLETE_AD_PLAYBOOK_MARCH2026.md` Scripts 5A and 5B for the bill-related posts; Script 1D's narrative for the caregiver post)
- **Inline waitlist CTA at ~40% scroll depth:** A simple email capture form embedded in the article body. Same styling as the landing page form. Text above it: "Elena does all of this automatically. Join the waitlist."
- **Bottom CTA after the article:** Full email capture form. Text: "Stop overpaying for healthcare. Get early access to Elena."
- **Sticky mobile banner at bottom of screen:** Small bar: "Get early access to Elena" + email field. Appears after 30% scroll. Dismissable.
- UTM params preserved (same JS as main site)
- Same Supabase submission as main site
- Minimal nav: logo + "Back to elena-health.com" link. No full nav menu.

**Blog post content:** The full text for these posts exists in the research files. For the coding agent, here are summaries of what each post should contain:

**`/blog/medical-bill-errors`:**
Step-by-step guide: (1) Request itemized bill, (2) Pull your EOB from insurance portal, (3) Compare the two documents, (4) Look for common errors (duplicate CPT codes, unbundling, facility fees), (5) Call billing supervisor to dispute. Include the stat: "80% of medical bills contain at least one error. Bills over $10,000 average $1,300 in errors." End with Elena CTA.

**`/blog/eob-guide`:**
Explain what an EOB is (NOT a bill), how to read each column, what "Amount Billed" vs "Allowed Amount" vs "Patient Responsibility" means, and why you should never pay an EOB directly. Include the stat: "45%+ of insured adults received a bill for a service they thought insurance should have covered." End with Elena CTA.

**`/blog/caregiver-guide`:**
The emotional narrative of managing a parent's healthcare remotely — tracking appointments in Google Sheets, medications in phone notes, insurance cards as camera roll photos, lunch break phone calls to specialists. Include stats: "63M Americans are caregivers, 42% care for a parent, 61% work full-time simultaneously. Average caregiver spends 27 hours/week on caregiving tasks." End with Elena CTA about family profiles.

### Change 3: Update the main homepage (index.html)

The main homepage (`/`) stays as the default experience for organic/direct visitors. But make these changes:

**Hero section:**
- Change headline from "The confidence to get the care you deserve." to: **"Elena calls your insurance, fights your bills, and finds you cheaper care."**
- Change subtitle from "Price transparency for every procedure, every provider, every plan." to: **"The AI healthcare companion that handles the calls you don't want to make."**
- Keep the "Get Early Access" CTA button (already updated from "Join the Community")

**Success state (hero and bottom forms):**
- Current: "You're in! We'll reach out when early access is ready."
- Keep this as-is. No mention of onboarding calls, emails, or TestFlight. The success state is simple and final.

**Survey step:**
- **Keep the survey on the main homepage only.** It provides useful data about what features people care about. But it should be REMOVED on the `/lp/*` landing pages (where paid traffic arrives and every extra step kills conversion).

**Social proof:**
- Add a line above or below the email form: "Join X founding members navigating healthcare together" (this line already exists at line 1174 but update the copy to include a number if possible)

### Change 4: TikTok Account & Link-in-Bio Strategy (NOT a code change — operational context)

This isn't a website code change but the coding agent needs to understand this for CTA copy on landing pages.

**The Elena TikTok account is on Creator/Personal mode (NOT Business).** Business accounts get 3-4x lower organic reach (2.5-4% engagement vs 11%) and lose access to trending sounds. Do not switch.

**Creator accounts cannot add a link in bio until 1,000 followers.** Elena currently has ~2 followers. Until 1,000 followers:

- TikTok video CTAs say **"Link in the comments"** (NOT "Link in bio")
- After posting each video, a pinned comment is added with the UTM-tagged URL to the relevant landing page
- On-screen text in each video's final 3-5 seconds shows **"elena-health.com"** so viewers can type it manually

**Implication for landing pages:** The `/lp/*` pages will receive traffic from people who typed the URL manually or clicked a pinned comment link. Both methods preserve UTM parameters in the URL. No special handling needed beyond the existing UTM capture code.

**Once Elena hits 1,000 followers (estimated 2-4 weeks):** The bio link will be set to a Linktree/Beacons page with options for both ICPs:
- "I have a medical bill" -> elena-health.com/lp/bills
- "I'm managing a family member's healthcare" -> elena-health.com/lp/caregiver

### Change 5: Update vercel.json for new routes

Add rewrites for the new landing pages and blog posts:

```json
{
  "cleanUrls": true,
  "rewrites": [
    { "source": "/invite/:code", "destination": "/invite/index.html" },
    { "source": "/lp/bills", "destination": "/lp/bills/index.html" },
    { "source": "/lp/calls", "destination": "/lp/calls/index.html" },
    { "source": "/lp/caregiver", "destination": "/lp/caregiver/index.html" },
    { "source": "/blog/medical-bill-errors", "destination": "/blog/medical-bill-errors/index.html" },
    { "source": "/blog/eob-guide", "destination": "/blog/eob-guide/index.html" },
    { "source": "/blog/caregiver-guide", "destination": "/blog/caregiver-guide/index.html" }
  ],
  "crons": [
    {
      "path": "/api/process-emails",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Note: the cron entry for `/api/process-emails` was added in a prior session for future email automation. It can stay (it won't do anything until the API route is built) or be removed. Not blocking.

### Change 5: Ensure tracking works on all new pages

Every new page (landing pages + blog posts) must:

1. **Include Vercel Analytics + Umami scripts** (copy from index.html lines 1502-1503):
```html
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="https://cloud.umami.is/script.js" data-website-id="a3769e64-67ea-47d8-96ce-4dddd14e409d"></script>
```

2. **Include the UTM capture code** (copy from index.html lines 1404-1410):
```javascript
const utmParams = {};
const urlParams = new URLSearchParams(window.location.search);
['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
  const val = urlParams.get(key);
  if (val) utmParams[key] = val;
});
```

3. **Include the Supabase submission function** (copy from index.html lines 1391-1416, minus the survey logic for landing pages):
```javascript
const SUPABASE_URL = 'https://livbrrqqxnvnxhggguig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmJycnFxeG52bnhoZ2dndWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc1MzYsImV4cCI6MjA4NzA0MzUzNn0.MkOKc7MWq5zoR3OY7wZgOsPwvjjKSij0ln1nF6inxP0';
```

4. **On landing pages, simplify the form flow — NO survey step:**
```javascript
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = form.querySelector('input[type="email"]').value;
  form.style.display = 'none';
  submitToSupabase(email, [], successEl);
});
```

---

## Design Notes

### Landing pages (`/lp/*`) should:
- Look and feel like the main homepage — same design, same brand, same below-the-fold content
- The ONLY differences from the homepage: ICP-specific hero copy, no nav links, no survey step, reduced phone section, no community perks, 3 feature cards instead of 6
- A visitor should not feel like they landed on a "stripped down" page — it should feel like the full Elena site, just with a headline that matches the ad they clicked
- Load fast (<2 seconds) — the reduced phone section (static mockup or short loop instead of 350vh parallax) is the main performance gain
- Work perfectly on mobile (83% of landing page traffic is mobile)

### Blog posts (`/blog/*`) should:
- Use a clean white/light background with good reading typography
- Content area max-width ~700px, centered
- Feel like a Medium article or Substack post — readable, trustworthy, not salesy
- The inline CTA should feel natural within the article flow, not like a popup or interruption
- The sticky mobile banner should be subtle — small, dismissable, doesn't cover content

### All new pages should:
- Share the same base CSS reset and font imports as the main site
- Have proper `<meta>` tags (title, description, og:title, og:description) unique to each page
- Have the Elena favicon

---

## What NOT to Change

- The main homepage (`/`) — keep the full experience including survey step, phone scroll section, feature carousel, and community perks. The survey provides useful data for organic/direct visitors.
- The invite page (`/invite/`) — don't touch it.
- The Supabase backend — don't add new tables or columns. Everything writes to `beta_signups` with the existing schema.
- The manifesto, stat banner, trust strip, and feature carousel concept on `/lp/*` pages — keep these from the homepage. Only remove: nav links, survey step, community perks section. Reduce (not remove) the phone section. Show 3 feature cards instead of 6.

---

## Priority Order

1. **Landing pages** (`/lp/bills`, `/lp/calls`, `/lp/caregiver`) — HIGHEST PRIORITY. Ads can't run without these.
2. **Blog posts** (`/blog/medical-bill-errors`, `/blog/caregiver-guide`) — HIGH PRIORITY. Reddit ads link to these.
3. **Homepage headline update** — MEDIUM. Improves organic conversion but not blocking ads.
4. **Blog: eob-guide** — LOWER. Can be added after the first two blog posts.

---

## Testing Before Launch

- [ ] Visit `/lp/bills?utm_source=test&utm_campaign=icp1_billfighter` — verify UTMs are captured
- [ ] Submit a test email on each landing page — verify row appears in Supabase with correct UTMs
- [ ] Visit `/blog/medical-bill-errors` — verify blog renders, inline CTA works, sticky banner appears
- [ ] Check all pages on mobile (iPhone Safari) — verify form is usable, page loads fast
- [ ] Verify no 404s on any route
- [ ] Verify analytics scripts are firing on all new pages (check Umami dashboard)

---

## Updates (March 24, 2026)

### Blog Posts Already Exist

The spec originally called for creating 3 blog post routes. All 3 already exist under different (or matching) slugs. No new blog content was created.

| Spec Route | Existing File | Existing URL |
|---|---|---|
| `/blog/medical-bill-errors` | `blog/medical-bill-errors.html` | `/blog/medical-bill-errors` (exact match) |
| `/blog/eob-guide` | `blog/what-eob-means.html` | `/blog/what-eob-means` |
| `/blog/caregiver-guide` | `blog/managing-parents-healthcare.html` | `/blog/managing-parents-healthcare` |

**Action for marketing plan:** Update ad campaign URLs to use existing slugs:
- Reddit ICP #1 bill-related ads → `/blog/medical-bill-errors`
- Reddit ICP #1 EOB ads → `/blog/what-eob-means` (not `/blog/eob-guide`)
- Reddit ICP #2 caregiver ads → `/blog/managing-parents-healthcare` (not `/blog/caregiver-guide`)

### Additional Blog Posts Available (not in original spec)

These existing blog posts can also be used as ad destinations:
- `/blog/47-minutes-on-hold` — Story about insurance hold times (good for ICP #1 calls angle)
- `/blog/mri-cost-comparison` — MRI cost comparison guide (good for ICP #1 price transparency)
- `/blog/health-insurance-at-26` — Guide for aging off parent's insurance (potential new ICP)

### All Blog Posts Have Required CTAs

All 6 existing blog posts already include:
- Inline CTA with email capture at ~40% scroll depth
- Bottom CTA with email capture after article
- Sticky mobile banner (appears after 15% scroll or 3 seconds)
- Exit-intent modal (desktop only)
- UTM capture and Supabase submission via shared `blog/blog.js`
- Mixpanel analytics tracking
