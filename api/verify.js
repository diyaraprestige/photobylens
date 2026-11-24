import { cors, send, body, env } from './_lib.js';

// Confirms with Stripe that a Checkout session was paid for this photo.
export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const key = env('STRIPE_SECRET_KEY');
  if (!key) return send(res, 503, { error: 'Payments are not configured' });
  const b = await body(req).catch(() => ({}));
  const id = String(b.session_id || '');
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(id)) return send(res, 400, { paid: false });
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, { headers: { authorization: `Bearer ${key}` } });
    const j = await r.json();
    if (!r.ok) return send(res, 404, { paid: false });
    const paid = j.payment_status === 'paid' && (!b.photoId || (j.metadata && j.metadata.photoId === String(b.photoId)));
    send(res, 200, { paid });
  } catch (e) {
    console.error(e);
    send(res, 502, { paid: false });
  }
}
