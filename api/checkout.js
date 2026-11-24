import { cors, send, body, limit, env, price, currency } from './_lib.js';

// Creates a Stripe Checkout session for one HD download.
export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const key = env('STRIPE_SECRET_KEY'), amount = price();
  if (!key || !amount) return send(res, 503, { error: 'HD checkout is not configured' });
  if (!limit(req, 'pay', 20, 60 * 60 * 1000)) return send(res, 429, { error: 'Too many requests' });
  const b = await body(req).catch(() => ({}));
  const photoId = String(b.photoId || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  if (!photoId) return send(res, 400, { error: 'Missing photo' });
  const desc = `${String(b.lens || 'Lens render').slice(0, 120)} · ${String(b.size || '').replace(/[^0-9x]/g, '').slice(0, 20)}`;
  const site = (env('SITE_URL') || `https://${req.headers.host}`).replace(/\/$/, '');
  const f = new URLSearchParams({
    mode: 'payment',
    success_url: b.mode === 'tab' ? `${site}/paid.html` : `${site}/?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: b.mode === 'tab' ? `${site}/paid.html?cancelled=1` : `${site}/?cancelled=1`,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': currency().toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][price_data][product_data][name]': 'Photobylens HD download',
    'line_items[0][price_data][product_data][description]': desc,
    'metadata[photoId]': photoId,
  });
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: f,
    });
    const j = await r.json();
    if (!r.ok || !j.url) { console.error('stripe', r.status, j.error && j.error.message); return send(res, 502, { error: 'Checkout could not start' }); }
    send(res, 200, { url: j.url, id: j.id });
  } catch (e) {
    console.error(e);
    send(res, 502, { error: 'Checkout could not start' });
  }
}
