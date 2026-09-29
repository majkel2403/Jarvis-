/* Diagnostyka połączenia Jarvis OS ↔ lokalny Hermes Agent (Node ≥ 18, Windows / macOS / Linux).
   Sprawdza dokładnie to, co robi przeglądarka: czy gateway odpowiada, czy zna klucz i — najczęstsza przyczyna — czy
   przepuszcza origin Jarvisa (CORS). Z --fix dopisuje brakujące ustawienia do pliku .env Hermesa (z kopią .env.bak).
   Klucz API_SERVER_KEY jest czytany automatycznie z .env (--key nadpisuje).
   Użycie: node tools/hermes-doctor.js [--jarvis http://localhost:4000] [--url http://localhost:8642/v1] [--key KLUCZ] [--fix] [--env ŚCIEŻKA] */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');

const CORS_KEY = 'API_SERVER_CORS_ORIGINS';
const withTimeout = (ms = 4000) => AbortSignal.timeout(ms);

/* pojedyncze żądanie → { ok, status, headers, error, code } (nigdy nie rzuca) */
async function probe(url, init = {}) {
  try { const r = await fetch(url, { ...init, signal: withTimeout(init.timeout || 4000) }); return { ok: true, status: r.status, headers: r.headers, res: r }; }
  catch (e) { return { ok: false, error: e.cause?.code || e.name, message: e.cause?.message || e.message }; }
}

/* czyste funkcje (testowane): parsowanie i łatanie .env */
const parseEnv = text => { const m = {}; for (const l of String(text).split(/\r?\n/)) { const x = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l); if (x && !/^\s*#/.test(l)) m[x[1]] = x[2].replace(/^(['"])(.*)\1$/, '$2'); } return m; };
function patchEnv(text, origin) {
  const eol = /\r\n/.test(text) ? '\r\n' : '\n', lines = String(text).split(/\r?\n/), changes = [];
  const idx = k => lines.findIndex(l => new RegExp('^\\s*(?:export\\s+)?' + k + '\\s*=').test(l));
  const set = (k, v) => { const i = idx(k); if (i >= 0) lines[i] = k + '=' + v; else { if (lines.length && lines[lines.length - 1] === '') lines.splice(lines.length - 1, 0, k + '=' + v); else lines.push(k + '=' + v); } };
  const cur = parseEnv(text);
  if (!/^(1|true|yes|on)$/i.test(cur.API_SERVER_ENABLED || '')) { set('API_SERVER_ENABLED', 'true'); changes.push('API_SERVER_ENABLED=true'); }
  const list = (cur[CORS_KEY] || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.includes('*') && !list.includes(origin)) { list.push(origin); set(CORS_KEY, list.join(',')); changes.push(CORS_KEY + '=' + list.join(',')); }
  return { text: lines.join(eol).replace(/(\r?\n)*$/, eol), changes };
}
const envCandidates = () => [process.env.HERMES_HOME && path.join(process.env.HERMES_HOME, '.env'), path.join(os.homedir(), '.hermes', '.env')].filter(Boolean);

/* główna diagnoza → { checks: [{name, ok, detail, fix?}], summary } */
async function diagnose({ jarvis = 'http://localhost:4000', url = 'http://localhost:8642/v1', key = '' } = {}) {
  const checks = [], add = (name, ok, detail, fix) => { checks.push({ name, ok, detail, fix }); return ok; };
  const origin = new URL(jarvis).origin, gw = new URL(url), base = url.replace(/\/+$/, '');

  const j = await probe(origin + '/');
  add('Serwer Jarvisa ' + origin, j.ok && j.status === 200, j.ok ? 'HTTP ' + j.status : 'brak odpowiedzi (' + j.error + ')', j.ok ? '' : 'Uruchom: node tools/serve.js   (albo start-jarvis.bat)');

  if (j.ok && j.status === 200) {   // czy pod tym adresem działa wersja z diagnostyką (starsza pokazuje ogólny błąd bez wskazania CORS)
    const a = await probe(origin + '/js/ai.js'); const src = a.ok && a.status === 200 ? await a.res.text().catch(() => '') : '';
    if (src) add('Wersja Jarvisa', /hermes-doctor/.test(src), /hermes-doctor/.test(src) ? 'aktualna (z diagnostyką połączenia)' : 'STARA — serwer na ' + origin + ' serwuje przestarzałe pliki', 'W folderze Jarvisa: git fetch origin && git checkout claude/serene-johnson-ukl2ft && git pull, potem uruchom ponownie node tools/serve.js i odśwież stronę (Ctrl+F5). Sprawdź też, czy serwer na porcie nie startuje z innego folderu.');
  }

  /* 1. czy gateway w ogóle słucha — i pod którym wariantem „localhost” */
  const hosts = [...new Set([gw.hostname, ...(gw.hostname === 'localhost' ? ['127.0.0.1', '[::1]'] : [])])];
  const alive = [];
  for (const h of hosts) { const u = new URL(base + '/models'); u.hostname = h; const r = await probe(u, { headers: key ? { Authorization: 'Bearer ' + key } : {} }); if (r.ok) alive.push({ h, r }); if (h === gw.hostname || r.ok) add('Gateway pod ' + h + ':' + (gw.port || 80), r.ok, r.ok ? 'HTTP ' + r.status : r.error + ' — ' + (r.message || '')); }
  if (!alive.length) {
    add('Hermes gateway działa', false, 'nic nie nasłuchuje na porcie ' + (gw.port || 80), 'Uruchom w terminalu Windows: hermes gateway   (w ' + envCandidates()[envCandidates().length - 1] + ' musi być API_SERVER_ENABLED=true; do sprawdzenia portu: netstat -ano | findstr :' + (gw.port || 8642) + ')');
    return summarize(checks);
  }
  const main = alive.find(a => a.h === gw.hostname) || alive[0];
  if (main.h !== gw.hostname) add('Adres z Ustawień działa', false, gw.hostname + ' nie odpowiada, ale ' + main.h + ' tak', 'W Ustawieniach → Hermes wpisz: ' + base.replace(gw.hostname, main.h) + '   (Windows: „localhost” bywa rozwiązywany na IPv6 ::1, a gateway słucha tylko na 127.0.0.1)');

  /* 2. autoryzacja */
  const st = main.r.status;
  if (st === 401 || st === 403) add('Klucz API', false, 'gateway odrzucił klucz (HTTP ' + st + ')', key ? 'Klucz z Ustawień ≠ API_SERVER_KEY w .env' : 'Gateway wymaga klucza — podaj --key (ten sam co API_SERVER_KEY w .env) i wpisz go w Ustawieniach');
  else add('Klucz API', st < 400, key ? 'przyjęty (HTTP ' + st + ')' : 'gateway nie wymaga klucza (HTTP ' + st + ')');

  /* 3. CORS — dokładnie jak przeglądarka: preflight z origin Jarvisa */
  const pre = await probe(base + '/chat/completions', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type,x-hermes-session-key' } });
  const acao = pre.ok ? pre.headers.get('access-control-allow-origin') : null;
  const corsOk = !!acao && (acao === '*' || acao === origin);
  add('CORS dla ' + origin, corsOk, pre.ok ? (acao ? 'Allow-Origin: ' + acao : 'brak nagłówka Access-Control-Allow-Origin (HTTP ' + pre.status + ')') : pre.error,
    corsOk ? '' : `W .env Hermesa dopisz: ${CORS_KEY}=${origin}   (uwaga: http://localhost:4000 i http://127.0.0.1:4000 to różne originy; kilka rozdziel przecinkiem) i zrestartuj gateway. Automatycznie: node tools/hermes-doctor.js --fix`);
  if (pre.ok && corsOk) { const h = (pre.headers.get('access-control-allow-headers') || '').toLowerCase(); if (h && h !== '*' && !/x-hermes-session-key/.test(h)) add('Nagłówek X-Hermes-Session-Key', false, 'gateway go nie dopuszcza (Allow-Headers: ' + h + ')', 'Zaktualizuj Hermes Agent do najnowszej wersji'); }

  /* 4. prawdziwe zapytanie czatu (SSE) */
  const body = JSON.stringify({ model: 'hermes-agent', stream: true, messages: [{ role: 'user', content: 'Odpowiedz jednym słowem: OK' }] });
  const c = await probe(base + '/chat/completions', { method: 'POST', body, timeout: 60000, headers: { 'Content-Type': 'application/json', Origin: origin, ...(key ? { Authorization: 'Bearer ' + key } : {}) } });
  if (!c.ok) add('Zapytanie czatu', false, c.error + ' — ' + (c.message || ''));
  else { const t = await c.res.text().catch(() => ''); add('Zapytanie czatu', c.status === 200 && /data:/.test(t), 'HTTP ' + c.status + (c.status === 200 ? ' · strumień SSE ' + (/data:/.test(t) ? 'OK' : 'pusty') : ' · ' + t.slice(0, 120)), c.status === 200 ? '' : 'Sprawdź dostawcę modelu Hermesa: hermes setup'); }
  return summarize(checks);
}
const summarize = checks => ({ checks, ok: checks.every(c => c.ok) });

function applyFix(origin, envPath) {
  const file = envPath || envCandidates().find(p => fs.existsSync(p)) || envCandidates()[envCandidates().length - 1];
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const { text, changes } = patchEnv(before, origin);
  if (!changes.length) return { file, changes, backup: null };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let backup = null; if (before) { backup = file + '.bak'; fs.copyFileSync(file, backup); }
  fs.writeFileSync(file, text); return { file, changes, backup };
}
module.exports = { diagnose, parseEnv, patchEnv, applyFix, probe };

if (require.main === module) (async () => {
  const a = process.argv.slice(2), get = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
  const envFile = get('--env') || envCandidates().find(p => fs.existsSync(p));
  let envKey = ''; try { envKey = envFile ? parseEnv(fs.readFileSync(envFile, 'utf8')).API_SERVER_KEY || '' : ''; } catch (e) { }
  const opts = { jarvis: get('--jarvis', 'http://localhost:4000'), url: get('--url', 'http://localhost:8642/v1'), key: get('--key', process.env.API_SERVER_KEY || envKey) };
  console.log('Jarvis OS ↔ Hermes — diagnostyka\n  Jarvis: ' + opts.jarvis + '\n  Hermes: ' + opts.url + '\n  .env:   ' + (envFile || 'nie znaleziono (' + envCandidates().pop() + ')') + '\n  Klucz:  ' + (opts.key ? 'znaleziony (' + opts.key.length + ' znaków) — wpisz go też w Ustawieniach Jarvisa' : 'brak (gateway bez klucza)') + '\n');
  let r = await diagnose(opts);
  const show = r => r.checks.forEach(c => console.log((c.ok ? ' ✔ ' : ' ✘ ') + c.name + ' — ' + c.detail + (c.ok || !c.fix ? '' : '\n     → ' + c.fix)));
  show(r);
  if (!r.ok && a.includes('--fix')) {
    const f = applyFix(new URL(opts.jarvis).origin, get('--env'));
    if (f.changes.length) console.log(`\nZaktualizowano ${f.file}${f.backup ? ' (kopia: ' + f.backup + ')' : ''}:\n  ${f.changes.join('\n  ')}\nZrestartuj teraz gateway (Ctrl+C, potem: hermes gateway) i uruchom diagnostykę ponownie.`);
    else console.log(`\n${f.file} zawiera już właściwe ustawienia — problem leży gdzie indziej (patrz wskazówki powyżej).`);
  }
  console.log('\n' + (r.ok ? 'Wszystko działa ✔ — w Jarvisie: Ustawienia → Hermes → „Połącz i testuj”.' : 'Są problemy ✘ — wskazówki „→” wyżej.'));
  process.exit(r.ok ? 0 : 1);
})();
