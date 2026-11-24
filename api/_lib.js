// Shared helpers for the API routes (works on Vercel and with server.js).
// The website, Android app and browser extension all call these routes, so allow cross-origin requests (no cookies are used).
export function cors(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-max-age', '86400');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true; }
  return false;
}
export function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}
export async function body(req, max = 5_000_000) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > max) throw new Error('too large'); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}
// Simple per-IP rate limit (per server instance). Put a CDN/WAF rule in front for production-grade limits.
const buckets = new Map();
export function limit(req, key, max, windowMs) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
  const k = key + ':' + ip, now = Date.now(), b = buckets.get(k) || { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n++; buckets.set(k, b);
  return b.n <= max;
}
export const env = (k, d = '') => (process.env[k] ?? d).toString().trim();
export const price = () => parseInt(env('HD_PRICE_SEN', '0'), 10) || 0;
export const currency = () => env('CURRENCY', 'MYR').toUpperCase();
