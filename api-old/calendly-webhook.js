const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function verifySignature(req, secret) {
  const signature = req.headers['calendly-webhook-signature'];
  if (!signature) return false;

  // Calendly signature format: t=<timestamp>,v1=<hash>
  const parts = {};
  signature.split(',').forEach(part => {
    const [key, value] = part.split('=');
    parts[key] = value;
  });

  if (!parts.t || !parts.v1) return false;

  const payload = parts.t + '.' + JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(parts.v1),
    Buffer.from(expected)
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (secret && !verifySignature(req, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body?.event;
  const payload = req.body?.payload;

  if (event !== 'invitee.created') {
    return res.status(200).json({ ok: true, skipped: true, reason: 'Not invitee.created' });
  }

  const email = payload?.email || payload?.invitee?.email;
  if (!email) {
    return res.status(400).json({ error: 'No email in payload' });
  }

  const { error } = await supabase
    .from('beta_signups')
    .update({
      call_booked: true,
      call_booked_at: new Date().toISOString()
    })
    .eq('email', email);

  if (error) {
    console.error('Supabase update error:', error);
    return res.status(500).json({ error: 'Failed to update signup' });
  }

  return res.status(200).json({ ok: true, email, call_booked: true });
};
