/* Test agenta WWW: prawdziwy Chromium (headless) + lokalna strona + atrapa Jeva (bez klucza i bez internetu).
     node --test integrations/tests/web-agent.test.mjs
   Wymaga zainstalowanego jev-voice-browser (integrations\setup.ps1); bez niego test się pomija. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createAgent, normalizeUrl } from '../web/agent.mjs';
import { makeFakeDecide } from '../web/fake-jev.mjs';

const VENDOR = process.env.JARVIS_JEV_BROWSER || path.join(os.homedir(), '.jarvis-os', 'vendor', 'jev-voice-browser');
const HAVE = fs.existsSync(path.join(VENDOR, 'src', 'controller.js')) && fs.existsSync(path.join(VENDOR, 'node_modules'));
const TOKEN = 'test-token-xyz';
let site, agent, base, clicks = 0, searched = [];

const PAGE = `<!doctype html><title>Sklep testowy</title><h1>Sklep testowy</h1>
<a href="/a">First result</a> <a href="/b">Second result</a>
<a href="/d1">Documentation</a> <a href="/d2">Documentation</a>
<button id="buy" onclick="fetch('/buy')">Buy now</button>
<form action="/search"><input name="q" type="search" placeholder="Search"><button type="submit">Go</button></form>
<div style="height:3000px">Długa strona. Kontakt: test@example.com</div>`;

before(async () => {
  if (!HAVE) return;
  site = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/buy') { clicks++; res.end('ok'); return; }
    if (u.pathname === '/search') searched.push(u.searchParams.get('q'));
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(u.pathname === '/' ? PAGE : `<title>${u.pathname}</title><p>Podstrona ${u.pathname} ${u.search}</p>`);
  });
  await new Promise(r => site.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${site.address().port}`;
  const jev = await import(pathToFileURL(path.join(VENDOR, 'src', 'jev.js')).href);
  agent = await createAgent({ headless: true, port: 0, token: TOKEN, profileDir: fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-web-')), decideFn: makeFakeDecide(jev.buildRequest), log: () => { } });
});
after(async () => { await agent?.close().catch(() => { }); site?.close(); });

const call = (method, p, body, headers = {}) => new Promise((resolve, reject) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const req = http.request({ host: '127.0.0.1', port: agent.port, path: p, method, headers: { 'X-Bridge-Token': TOKEN, ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers } }, res => {
    let s = ''; res.on('data', c => s += c); res.on('end', () => resolve({ status: res.statusCode, body: s ? JSON.parse(s) : null }));
  });
  req.on('error', reject); if (data) req.write(data); req.end();
});
const cmd = async text => (await call('POST', '/agent/command', { text })).body;
const skip = { skip: !HAVE && 'jev-voice-browser nie jest zainstalowany' };

test('wybór przeglądarki: Chrome tylko gdy jest, tryb chromium go pomija, wymuszony chrome bez instalacji zgłasza błąd', async () => {
  const { findChrome, startChrome } = await import('../web/agent.mjs');
  const exe = findChrome();
  assert.ok(exe === null || /chrome\.exe$/i.test(exe), String(exe));
  assert.equal(await startChrome({ mode: 'chromium' }), null, 'tryb chromium nie uruchamia Chrome');
  const saved = process.env.JARVIS_CHROME_PATH, sl = process.env.LOCALAPPDATA, pf = process.env.ProgramFiles, pf86 = process.env['ProgramFiles(x86)'];
  try {
    process.env.LOCALAPPDATA = process.env.ProgramFiles = process.env['ProgramFiles(x86)'] = os.tmpdir(); delete process.env.JARVIS_CHROME_PATH;
    assert.equal(findChrome(), null, 'brak Chrome');
    assert.equal(await startChrome({ mode: 'auto' }), null, 'auto bez Chrome = Chromium');
    await assert.rejects(startChrome({ mode: 'chrome' }), /nie znaleziono Google Chrome/);
  } finally {
    Object.assign(process.env, { LOCALAPPDATA: sl, ProgramFiles: pf, 'ProgramFiles(x86)': pf86 }); if (saved) process.env.JARVIS_CHROME_PATH = saved;
  }
});

test('normalizeUrl: tylko http(s), domena dostaje https', () => {
  assert.equal(normalizeUrl('youtube.com'), 'https://youtube.com/');
  assert.equal(normalizeUrl('http://localhost:4000/x'), 'http://localhost:4000/x');
  assert.throws(() => normalizeUrl('javascript:alert(1)'));
  assert.throws(() => normalizeUrl('file:///C:/Windows/win.ini'));
  assert.throws(() => normalizeUrl('dwa słowa'));
});

test('bezpieczeństwo: token, Origin i Host', skip, async () => {
  assert.equal((await call('GET', '/agent/state', undefined, { 'X-Bridge-Token': 'zly' })).status, 401);
  assert.equal((await call('GET', '/agent/state', undefined, { 'X-Bridge-Token': '' })).status, 401);
  assert.equal((await call('GET', '/agent/state', undefined, { Origin: 'https://zla-strona.example' })).status, 403, 'żądanie ze strony');
  assert.equal((await call('GET', '/agent/state', undefined, { Host: 'evil.example' })).status, 403, 'DNS-rebinding');
  assert.equal((await call('GET', '/agent/state')).status, 200);
  assert.equal((await call('POST', '/agent/goto', { url: 'javascript:alert(1)' })).status, 400);
});

test('goto + read: otwiera stronę i czyta jej tekst', skip, async () => {
  const r = (await call('POST', '/agent/goto', { url: base + '/' })).body;
  assert.equal(r.status, 'done'); assert.match(r.page.title, /Sklep testowy/);
  const rd = (await call('GET', '/agent/read?max=500')).body;
  assert.match(rd.text, /Sklep testowy/); assert.match(rd.text, /test@example\.com/);
});

test('polecenie: klik w element wskazany słowami', skip, async () => {
  const r = await cmd('click second result');
  assert.equal(r.status, 'done', JSON.stringify(r)); assert.match(r.page.url, /\/b$/);
  assert.ok(r.decision.jevMs >= 0); assert.equal(r.decision.policy, 'act');
});

test('polecenie: wróć, przewiń, wyszukaj na stronie (pole wyszukiwania)', skip, async () => {
  assert.equal((await cmd('go back')).status, 'done');
  assert.match((await call('GET', '/agent/state')).body.page.url, /127\.0\.0\.1:\d+\/$/);
  const r = await cmd('search for zielone jabłka');
  assert.equal(r.status, 'done', JSON.stringify(r));
  assert.equal(searched.at(-1), 'zielone jabłka', 'tekst zapytania skopiowany dosłownie, także z polskimi znakami; wynik: ' + JSON.stringify(r));
  assert.match(decodeURIComponent(r.page.url.replace(/\+/g, ' ')), /\/search\?q=zielone jabłka/, 'wynik pokazuje stronę PO wysłaniu formularza, nie starą: ' + r.page.url);
  await call('POST', '/agent/goto', { url: base + '/' });
  assert.equal((await cmd('scroll down')).status, 'done');
});

test('samoleczenie: strona odtwarza DOM (znika data-vb-id) → element odnaleziony pod nowym id, bez czekania 6–30 s', skip, async () => {
  await call('POST', '/agent/goto', { url: base + '/' });
  const page = await agent.browser.ensurePage();
  await agent.controller.refreshSnapshot();
  await page.evaluate(() => document.querySelectorAll('[data-vb-id]').forEach(e => e.removeAttribute('data-vb-id')));   // jak Vue/React po odtworzeniu węzłów
  const t0 = Date.now();
  const r = await cmd('click second result');
  assert.equal(r.status, 'done', JSON.stringify(r)); assert.match(r.page.url, /\/b$/);
  assert.ok(Date.now() - t0 < 4000, 'nie czekał na limit czasu: ' + (Date.now() - t0) + ' ms');
});

test('element naprawdę zniknął ze strony → szybki, czytelny błąd zamiast wiszenia', skip, async () => {
  await call('POST', '/agent/goto', { url: base + '/' });
  const page = await agent.browser.ensurePage();
  await agent.controller.refreshSnapshot();
  await page.evaluate(() => document.querySelectorAll('a').forEach(a => a.remove()));   // linków już nie ma
  const t0 = Date.now();
  const r = await cmd('click second result');
  assert.ok(['failed', 'unrecognized'].includes(r.status), JSON.stringify(r));
  assert.ok(Date.now() - t0 < 4000, 'szybka porażka: ' + (Date.now() - t0) + ' ms');
});

test('niejednoznaczność: dwa takie same linki → kandydaci, nie zgadywanie', skip, async () => {
  await call('POST', '/agent/goto', { url: base + '/' });
  const r = await cmd('click documentation');
  assert.equal(r.status, 'candidates', JSON.stringify(r)); assert.ok(r.candidates.length >= 2, JSON.stringify(r.candidates));
  assert.equal((await call('POST', '/agent/pick', { n: 9 })).body.status, 'none', 'zły numer nic nie robi');
  const p = (await call('POST', '/agent/pick', { n: 2 })).body;
  assert.equal(p.status, 'done', JSON.stringify(p)); assert.match(p.page.url, /\/d[12]$/);
});

test('działanie destrukcyjne wymaga potwierdzenia i nic nie robi bez niego', skip, async () => {
  await call('POST', '/agent/goto', { url: base + '/' });
  const r = await cmd('click buy now');
  assert.equal(r.status, 'confirm', JSON.stringify(r)); assert.equal(clicks, 0, 'jeszcze nie kliknięto');
  const no = (await call('POST', '/agent/confirm', { accept: false })).body;
  assert.equal(no.status, 'cancelled'); assert.equal(clicks, 0);
  assert.equal((await call('POST', '/agent/confirm', { accept: true })).body.status, 'none', 'nic już nie czeka');
  assert.equal((await cmd('click buy now')).status, 'confirm');
  const yes = (await call('POST', '/agent/confirm', { accept: true })).body;
  assert.equal(yes.status, 'done', JSON.stringify(yes));
  await new Promise(r => setTimeout(r, 400)); assert.equal(clicks, 1, 'kliknięto dokładnie raz po zgodzie');
});

test('nie-polecenie kończy się od razu (bez pętli zapytań do modelu)', skip, async () => {
  const before = agent.controller.stats.calls, t0 = Date.now();
  const r = await cmd('what a lovely day');
  assert.ok(['ignored', 'unrecognized'].includes(r.status), JSON.stringify(r));
  assert.ok(Date.now() - t0 < 3000);
  await new Promise(r => setTimeout(r, 1500));
  assert.equal(agent.controller.stats.calls - before, 1, 'dokładnie jedno wywołanie modelu, bez ponawiania w tle');
});

test('błąd modelu (zły klucz, brak sieci) nie zabija agenta', skip, async () => {
  const good = agent.controller._decide;
  agent.controller._decide = async () => { throw new Error('401 Unauthorized'); };
  const r = await cmd('go back');
  assert.equal(r.status, 'error'); assert.match(r.error, /401/);
  agent.controller._decide = good;
  assert.equal((await call('GET', '/agent/health')).body.ok, true, 'agent nadal żyje');
  assert.equal((await cmd('scroll down')).status, 'done', 'i działa po naprawie');
});
