import { cors, send, body, env } from './_lib.js';

// Confirms with Stripe that a Checkout session was paid for this photo.
export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const key = env('STRIPE_SECRET_KEY');
  if (!key) return send(res, 503, { error: 'Payments are not configured' });
  const b = await body(req).catch(() => ({}));
  const id = String(b.session_id || '');
  const photoId = String(b.photoId || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(id) || !photoId) return send(res, 400, { paid: false });
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, { headers: { authorization: `Bearer ${key}` } });
    const j = await r.json();
    if (!r.ok) return send(res, 404, { paid: false });
    // Only a paid session bought for this exact photo unlocks HD.
    const paid = j.payment_status === 'paid' && !!j.metadata && j.metadata.photoId === photoId;
    send(res, 200, { paid });
  } catch (e) {
    console.error(e);
    send(res, 502, { paid: false });
  }
}
