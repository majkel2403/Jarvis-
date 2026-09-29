/* Atrapa lokalnego Hermes Agent gateway (API zgodne z OpenAI) — do testów połączenia bez prawdziwego Hermesa.
   Odwzorowuje to, co ma znaczenie dla przeglądarki: nagłówki CORS zależne od API_SERVER_CORS_ORIGINS,
   klucz Bearer (API_SERVER_KEY), /v1/models oraz strumień SSE z /v1/chat/completions.
   Użycie: node tests/mock-hermes.js [--port 8642] [--key KLUCZ] [--cors http://localhost:4000] [--host 127.0.0.1] */
'use strict';
const http = require('http');

function start({ port = 8642, host = '127.0.0.1', key = '', cors = [], reply = 'OK', model = 'hermes-agent' } = {}) {
  const origins = [].concat(cors).filter(Boolean);
  const log = [];
  const srv = http.createServer((req, res) => {
    const origin = req.headers.origin;
    log.push({ method: req.method, url: req.url, origin, auth: req.headers.authorization || '' });
    const allowed = origin && (origins.includes('*') || origins.includes(origin));
    if (allowed) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    if (req.method === 'OPTIONS') {
      if (allowed) {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
        if (req.headers['access-control-request-private-network']) res.setHeader('Access-Control-Allow-Private-Network', 'true');
        res.writeHead(204); return res.end();
      }
      res.writeHead(403); return res.end();
    }
    if (key && req.headers.authorization !== 'Bearer ' + key) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: { message: 'Invalid API key' } })); }
    if (req.method === 'GET' && /^\/v1\/models\/?$/.test(req.url)) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ object: 'list', data: [{ id: model, object: 'model' }] })); }
    if (req.method === 'GET' && /^\/health/.test(req.url)) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"status":"ok"}'); }
    if (req.method === 'POST' && /^\/v1\/chat\/completions\/?$/.test(req.url)) {
      let body = ''; req.on('data', c => body += c); req.on('end', () => {
        let j = {}; try { j = JSON.parse(body); } catch (e) { }
        const text = typeof reply === 'function' ? reply(j) : reply;
        if (!j.stream) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: text } }] })); }
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
        for (const part of String(text).match(/.{1,6}/gs) || ['']) res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: part } }] }) + '\n\n');
        res.write('data: [DONE]\n\n'); res.end();
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"error":{"message":"not found"}}');
  });
  return new Promise((resolve, reject) => { srv.once('error', reject); srv.listen(port, host, () => resolve({ srv, log, port: srv.address().port, url: `http://${host}:${srv.address().port}/v1`, close: () => new Promise(r => { srv.closeAllConnections?.(); srv.close(r); }) })); });
}
module.exports = { start };

if (require.main === module) {
  const a = process.argv.slice(2), get = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
  start({ port: +get('--port', 8642), host: get('--host', '127.0.0.1'), key: get('--key', ''), cors: (get('--cors', '') || '').split(',') })
    .then(s => console.log('Atrapa Hermesa nasłuchuje na ' + s.url));
}
