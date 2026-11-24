import { cors, send, env, price, currency } from './_lib.js';
// Tells the website which live features are switched on. No secrets are returned.
export default function handler(req, res) {
  if (cors(req, res)) return;
  send(res, 200, {
    payments: !!env('STRIPE_SECRET_KEY') && price() > 0,
    price: price(),
    currency: currency(),
  });
}
