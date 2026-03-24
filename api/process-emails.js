const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CALENDLY_URL = process.env.CALENDLY_URL;
const WHATSAPP_URL = process.env.WHATSAPP_URL;
const TESTFLIGHT_URL = process.env.TESTFLIGHT_URL;
const FROM_EMAIL = process.env.FROM_EMAIL;

const EMAIL_TEMPLATES = {
  1: {
    subject: 'Hey — setting up your Elena access',
    text: `Hey,

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
${CALENDLY_URL}

Or if you'd rather just reply with a day/time that works, I'll send
you a calendar invite.

Talk soon,
Abhigya
Founder, Elena

P.S. If you haven't already, join our WhatsApp group where early
members share healthcare tips and help each other navigate the
system: ${WHATSAPP_URL}`
  },
  2: {
    subject: 'Still want to try Elena?',
    text: `Hey — following up on my note from a couple days ago.

I still have a few onboarding slots open this week if you want
to get set up. It's 20 minutes — I walk you through the app and
get your insurance loaded so everything works for you specifically.

Spots are filling up though — I can only do about 6 of these a
day, so grab one if you're interested:
${CALENDLY_URL}

Or just reply and I'll find a time.

Abhigya`
  },
  3: {
    subject: 'Last call — your Elena access',
    text: `Hey — last note from me about the personal onboarding.

I'm wrapping up the first round of personal onboarding sessions
this week. After that, I'll just send you the app link directly
(which is fine, but you miss the 1-on-1 walkthrough and the
chance to tell me what features matter most to you).

If you want the personal setup:
${CALENDLY_URL}

If the timing doesn't work right now, no worries at all — I'll
send you the download link in a couple days so you can get
started on your own.

Abhigya`
  },
  4: {
    subject: 'Your Elena access is ready',
    text: `Hey — I know scheduling can be tough, so I'm just going to
send you the app directly.

Here's your TestFlight link to install Elena:
${TESTFLIGHT_URL}

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
${CALENDLY_URL}

Abhigya`
  }
};

async function sendEmail(to, templateNum) {
  const template = EMAIL_TEMPLATES[templateNum];
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: template.subject,
    text: template.text,
  });
  if (error) {
    console.error(`Failed to send email #${templateNum} to ${to}:`, error);
    return false;
  }
  return true;
}

module.exports = async function handler(req, res) {
  // Auth: accept Bearer token in header OR ?secret= query param
  const authHeader = req.headers.authorization;
  const querySecret = req.query?.secret;
  const cronSecret = process.env.CRON_SECRET;

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : querySecret;
  if (!cronSecret || token !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date().toISOString();
  const summary = { email1: 0, email2: 0, email3: 0, email4: 0, errors: 0 };

  // Email #1: email_1_send_after <= now AND not yet sent
  const { data: e1Rows, error: e1Err } = await supabase
    .from('beta_signups')
    .select('id, email')
    .lte('email_1_send_after', now)
    .is('email_1_sent_at', null);

  if (e1Err) console.error('Email #1 query error:', e1Err);

  for (const row of (e1Rows || [])) {
    const ok = await sendEmail(row.email, 1);
    if (ok) {
      await supabase.from('beta_signups').update({ email_1_sent_at: now }).eq('id', row.id);
      summary.email1++;
    } else {
      summary.errors++;
    }
  }

  // Email #2: 48 hours after email 1, not booked
  const e2Cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: e2Rows, error: e2Err } = await supabase
    .from('beta_signups')
    .select('id, email')
    .lte('email_1_sent_at', e2Cutoff)
    .is('email_2_sent_at', null)
    .eq('call_booked', false);

  if (e2Err) console.error('Email #2 query error:', e2Err);

  for (const row of (e2Rows || [])) {
    const ok = await sendEmail(row.email, 2);
    if (ok) {
      await supabase.from('beta_signups').update({ email_2_sent_at: now }).eq('id', row.id);
      summary.email2++;
    } else {
      summary.errors++;
    }
  }

  // Email #3: 5 days after email 1, not booked
  const e3Cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const { data: e3Rows, error: e3Err } = await supabase
    .from('beta_signups')
    .select('id, email')
    .lte('email_1_sent_at', e3Cutoff)
    .is('email_3_sent_at', null)
    .eq('call_booked', false);

  if (e3Err) console.error('Email #3 query error:', e3Err);

  for (const row of (e3Rows || [])) {
    const ok = await sendEmail(row.email, 3);
    if (ok) {
      await supabase.from('beta_signups').update({ email_3_sent_at: now }).eq('id', row.id);
      summary.email3++;
    } else {
      summary.errors++;
    }
  }

  // Email #4: 7 days after email 1, not booked (self-serve TestFlight fallback)
  const e4Cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: e4Rows, error: e4Err } = await supabase
    .from('beta_signups')
    .select('id, email')
    .lte('email_1_sent_at', e4Cutoff)
    .is('email_4_sent_at', null)
    .eq('call_booked', false);

  if (e4Err) console.error('Email #4 query error:', e4Err);

  for (const row of (e4Rows || [])) {
    const ok = await sendEmail(row.email, 4);
    if (ok) {
      await supabase.from('beta_signups').update({ email_4_sent_at: now }).eq('id', row.id);
      summary.email4++;
    } else {
      summary.errors++;
    }
  }

  return res.status(200).json({
    ok: true,
    processed_at: now,
    sent: summary
  });
};
