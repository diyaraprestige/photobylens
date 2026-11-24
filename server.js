// Run anywhere with Node 18+:  node server.js   (reads .env if present)
import http from 'node:http';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
if (existsSync(path.join(root, '.env'))) {
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const ROUTES = { config: 'config.js', checkout: 'checkout.js', verify: 'verify.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const api = url.pathname.match(/^\/api\/([a-z]+)$/);
  if (api && ROUTES[api[1]]) {
    try { const mod = await import('./api/' + ROUTES[api[1]]); return await mod.default(req, res); }
    catch (e) { console.error(e); res.statusCode = 500; return res.end('{"error":"server"}'); }
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(root, p));
  const allowed = ['index.html', 'paid.html', 'manifest.webmanifest'].some(f => file === path.join(root, f)) || file.startsWith(path.join(root, 'assets') + path.sep);
  if (!allowed || !existsSync(file) || !statSync(file).isFile()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
  res.setHeader('x-content-type-options', 'nosniff');
  if (p.startsWith('/assets/')) res.setHeader('cache-control', 'public, max-age=3600');
  createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('Photobylens running on http://localhost:' + (process.env.PORT || 3000)));
