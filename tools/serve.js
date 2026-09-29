/* Minimalny serwer statyczny Jarvis OS bez zależności (Node ≥ 18) — działa tak samo na Windows, macOS i Linuksie.
   Użycie: node tools/serve.js [port]   (domyślnie 4000; PORT / HOST z env też działają)
   Nasłuchuje na 127.0.0.1 — adres http://localhost:PORT i http://127.0.0.1:PORT to dla Hermesa DWA RÓŻNE originy (CORS). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

const create = () => http.createServer((req, res) => {
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end('bad request'); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(ROOT, '.' + p);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end('forbidden'); }
  if (/(^|[\\/])\.git([\\/]|$)/.test(path.relative(ROOT, file))) { res.writeHead(404); return res.end('not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});
module.exports = { create };

if (require.main === module) {
  const port = +(process.argv[2] || process.env.PORT || 4000), host = process.env.HOST || '127.0.0.1';
  const srv = create();
  srv.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} jest zajęty — Jarvis prawdopodobnie już działa (http://localhost:${port}/) albo podaj inny port: node tools/serve.js 4001` : e.message); process.exit(1); });
  srv.listen(port, host, () => console.log(`Jarvis OS: http://localhost:${port}/   (Ctrl+C kończy)`));
}
