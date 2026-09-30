/* =========================================================
   JARVIS OS — agent WWW: prawdziwa przeglądarka (Playwright) sterowana przez Jeva
   Opakowuje repozytorium moritzkremb/jev-voice-browser (bez zmiany jego kodu):
     zdanie → Jev (intencja + wybór elementu ~300 ms) → polityka → Playwright → wynik JSON.
   Celowo NIE uruchamia panelu z mikrofonem ani gniazda WebSocket autora — gniazdo na 127.0.0.1 jest dostępne
   z każdej strony otwartej w Twojej przeglądarce. Tu jest tylko HTTP z tokenem, odrzucający żądania ze stron
   (nagłówek Origin) i ataki DNS-rebinding (nagłówek Host). Woła go most (bridge/jarvis_bridge.py).

   Uruchomienie:  node integrations/web/agent.mjs [--port 8788] [--headless] [--start-url https://…]
   Zmienne:       JARVIS_WEB_PORT, JARVIS_WEB_HEADLESS=1, JARVIS_WEB_PROFILE, JARVIS_WEB_START_URL,
                  JARVIS_FAKE_JEV=1 (atrapa Jeva — bez klucza, tylko do prób), JARVIS_JEV_BROWSER (ścieżka repo)
   Klucz i adres API czyta z %USERPROFILE%\.jarvis-os\jev.env (TYPESAFE_API_KEY, TYPESAFE_BASE_URL, JEV_MODEL).
   ========================================================= */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HOME = path.join(os.homedir(), '.jarvis-os');
const HERE = path.dirname(fileURLToPath(import.meta.url));

/* KEY=VALUE z pliku; nie nadpisuje zmiennych już ustawionych w środowisku */
export function loadEnvFile(file) {
  if (!fs.existsSync(file)) return 0;
  let n = 0;
  for (const raw of fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('='), k = line.slice(0, i).trim(), v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && process.env[k] === undefined) { process.env[k] = v; n++; }
  }
  return n;
}
export const readToken = () => {
  if (process.env.JARVIS_BRIDGE_TOKEN) return process.env.JARVIS_BRIDGE_TOKEN.trim();
  try { return fs.readFileSync(path.join(HOME, 'bridge-token'), 'utf8').trim(); } catch { return ''; }
};

const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const json = (res, code, body) => { const s = JSON.stringify(body); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(s); };
const readBody = req => new Promise((resolve, reject) => {
  let n = 0; const chunks = [];
  req.on('data', c => { n += c.length; if (n > 65536) { reject(Object.assign(new Error('body too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(Object.assign(new Error('bad json'), { status: 400 })); } });
  req.on('error', reject);
});

/* tylko http(s); „youtube.com” → https://youtube.com */
export function normalizeUrl(input) {
  let s = String(input || '').trim();
  if (!s || /\s/.test(s)) throw Object.assign(new Error('nieprawidłowy adres'), { status: 400 });
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
  const u = new URL(s);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw Object.assign(new Error('dozwolone tylko http/https'), { status: 400 });
  return u.toString();
}

export async function createAgent(opts = {}) {
  const vendor = opts.vendor || process.env.JARVIS_JEV_BROWSER || path.join(HOME, 'vendor', 'jev-voice-browser');
  if (!fs.existsSync(path.join(vendor, 'src', 'controller.js'))) throw new Error('Brak jev-voice-browser w ' + vendor + ' — uruchom integrations\\setup.ps1');
  const imp = f => import(pathToFileURL(path.join(vendor, 'src', f)).href);
  const [{ BrowserManager }, { Controller }, jev, policy] = await Promise.all([imp('browser.js'), imp('controller.js'), imp('jev.js'), imp('policy.js')]);
  const log = opts.log || ((...a) => console.error('[web-agent]', ...a));

  let decideFn = opts.decideFn;
  if (!decideFn) {
    if (process.env.JARVIS_FAKE_JEV === '1') { decideFn = (await import('./fake-jev.mjs')).makeFakeDecide(jev.buildRequest); log('UWAGA: atrapa Jeva (JARVIS_FAKE_JEV=1) — bez modelu, tylko do prób'); }
    else if (!jev.hasApiKey()) throw new Error('Brak klucza Jeva: uruchom integrations\\set-key.ps1 (zapisze %USERPROFILE%\\.jarvis-os\\jev.env)');
    else decideFn = jev.decide;
  }

  const browser = new BrowserManager();
  await browser.launch({ headless: !!opts.headless, profileDir: opts.profileDir || path.join(HOME, 'web-profile'), startUrl: opts.startUrl || 'about:blank' });
  const controller = new Controller({ browser, decideFn });
  controller.on('error', () => { });   // Controller emituje 'error' bez nasłuchu = wyjątek nieobsłużony i zabicie procesu; błędy Jeva zgłaszamy w wyniku polecenia
  await controller.start();

  const token = opts.token ?? readToken();
  if (!token) throw new Error('Brak tokenu mostu (~/.jarvis-os/bridge-token) — uruchom most raz albo ustaw JARVIS_BRIDGE_TOKEN');

  const pageInfo = () => ({ url: controller.snapshot?.url || browser.currentUrl?.() || '', title: controller.snapshot?.title || '' });
  /* Controller odświeża migawkę dopiero PO zdarzeniu „action”; bez tego wynik miałby adres sprzed akcji, a kolejne polecenie — nieaktualną listę elementów */
  /* Wykonawca autora kończy „czekanie na stronę” od razu po Enter (waitForLoadState zwraca natychmiast dla wciąż załadowanej strony), więc po
     wysłaniu formularza wynik i następne polecenie widziałyby starą stronę. Gdy akcja mogła wywołać nawigację, czekamy na zmianę adresu (do 0,8 s). */
  const NAV_ACTIONS = new Set(['type_into_field', 'press_enter']);
  const settle = async (nav) => {
    const page = browser.page;
    if (nav && page) {
      const t0 = Date.now();
      while (Date.now() - t0 < 800 && page.url() === nav.before) await new Promise(r => setTimeout(r, 40));
      if (page.url() !== nav.before) await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => { });
    }
    await controller.refreshSnapshot().catch(() => { });
    return pageInfo();
  };
  const brief = a => a ? { type: a.type, label: a.label, url: a.url, text: a.text } : null;

  /* jedno polecenie naraz; kolejne czekają */
  let chain = Promise.resolve();
  const serial = fn => { const p = chain.then(fn, fn); chain = p.catch(() => { }); return p; };

  const stopRetries = () => { const u = controller.utterance; if (u) u.actedOn = true; clearTimeout(controller.silenceTimer); clearTimeout(controller.debounceTimer); };

  /* zdanie → decyzja Jeva → akcja; kończy się na pierwszym rozstrzygnięciu */
  const runCommand = (text, timeoutMs = 25000) => serial(() => new Promise(resolve => {
    const t0 = Date.now(), off = [], urlBefore = browser.currentUrl?.() || ''; let done = false, decisionInfo = null;
    const on = (ev, fn) => { controller.on(ev, fn); off.push(() => controller.off(ev, fn)); };
    const finish = payload => {
      if (done) return; done = true; clearTimeout(timer); off.forEach(f => f());
      if (payload.status !== 'done' && payload.status !== 'failed') stopRetries();
      const ms = Date.now() - t0;
      settle(NAV_ACTIONS.has(payload.action?.type) ? { before: urlBefore } : null).then(page => resolve({ ...payload, ms, decision: decisionInfo, page }));
    };
    on('decision', d => {
      decisionInfo = { jevMs: d.latencyMs, costUsd: d.costUsd, model: d.model, policy: d.policy.decision, summary: d.policy.summary };
      const p = d.policy.decision;
      if (p === 'act') return;   // czekamy na zdarzenie „action”
      if (p === 'confirm') finish({ status: 'confirm', summary: d.policy.summary, pending: brief(d.policy.action) });
      else if (p === 'disambiguate') finish({ status: 'candidates', summary: d.policy.summary, candidates: (d.policy.candidates || []).map((c, i) => ({ n: i + 1, id: c.id, label: c.label, p: c.p })) });   // controller.candidates ustawia się dopiero po emit — bierzemy z decyzji
      else if (p === 'cancel') finish({ status: 'cancelled', summary: d.policy.summary });
      else if (p === 'ignore') finish({ status: 'ignored', summary: d.policy.summary });
      else finish({ status: 'unrecognized', summary: d.policy.summary });   // „wait”: dla gotowego zdania to brak rozpoznanej komendy
    });
    on('action', a => finish({ status: a.ok ? 'done' : 'failed', summary: policy.describe(a.action), action: brief(a.action), detail: a.detail || '', executeMs: a.executeMs }));
    on('error', e => finish({ status: 'error', error: String(e?.message || e) }));
    const timer = setTimeout(() => finish({ status: 'timeout' }), Math.min(Math.max(+timeoutMs || 25000, 2000), 60000));
    controller.handleCommand(text);
  }));

  const confirm = accept => serial(async () => {
    const p = controller.pending;
    if (!p) return { status: 'none', summary: 'Nic nie czeka na potwierdzenie.', page: await settle() };
    controller.pending = null; controller.emit('pending', null);
    if (!accept) return { status: 'cancelled', summary: 'Anulowano: ' + policy.describe(p), page: await settle() };
    const out = await new Promise(resolve => {
      const h = a => { controller.off('action', h); resolve(a); };
      controller.on('action', h);
      controller._runAction({ ...p, confirmed: true }, { via: 'jarvis-confirm' });
    });
    return { status: out.ok ? 'done' : 'failed', summary: policy.describe(out.action), detail: out.detail || '', page: await settle() };
  });

  /* wybór jednego z kandydatów po numerze (kontroler robi to tylko przez 8 s po pytaniu; tu bez limitu czasu) */
  const pick = n => serial(async () => {
    const c = controller.candidates, cand = c?.list?.[(+n || 0) - 1];
    if (!cand) return { status: 'none', summary: 'Nie ma takiego kandydata.', page: await settle() };
    const action = { ...c.intent, targetId: cand.id, label: cand.label };
    controller.candidates = null; await browser.overlay('clearCandidates');
    const out = await new Promise(resolve => {
      const h = a => { controller.off('action', h); resolve(a); };
      controller.on('action', h);
      controller._runAction(action, { via: 'jarvis-pick' });
    });
    return { status: out.ok ? 'done' : 'failed', summary: policy.describe(out.action), detail: out.detail || '', page: await settle() };
  });

  const goto = url => serial(async () => {
    const target = normalizeUrl(url), t0 = Date.now();
    const page = await browser.ensurePage();
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const ms = Date.now() - t0;
    return { status: 'done', summary: 'open ' + target, ms, page: await settle() };
  });

  const read = async (maxChars = 4000) => {
    const page = await browser.ensurePage();
    const text = await page.evaluate(() => (document.body?.innerText || '').replace(/\n{3,}/g, '\n\n').trim()).catch(() => '');
    const n = Math.min(Math.max(+maxChars || 4000, 200), 20000);
    return { page: await settle(), text: text.slice(0, n), truncated: text.length > n };
  };

  const state = () => {
    const s = controller.uiState();
    return { page: pageInfo(), site: s.snapshot?.site, elements: s.snapshot?.elements?.length ?? 0, tabs: s.snapshot?.tabs || browser.tabInfo(), pending: s.pending, stats: s.stats, model: s.model };
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (req.headers.origin) return json(res, 403, { error: 'żądania ze stron są zabronione' });   // przeglądarkowy fetch/WebSocket z obcej strony
      const host = String(req.headers.host || '');
      const port = server.address().port;
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return json(res, 403, { error: 'zły nagłówek Host' });
      if (!safeEq(req.headers['x-bridge-token'] || '', token)) return json(res, 401, { error: 'unauthorized' });
      const route = req.method + ' ' + url.pathname;
      if (route === 'GET /agent/health') return json(res, 200, { ok: true, ...state() });
      if (route === 'GET /agent/state') return json(res, 200, state());
      if (route === 'GET /agent/read') return json(res, 200, await read(url.searchParams.get('max')));
      if (req.method === 'POST') {
        const b = await readBody(req);
        if (url.pathname === '/agent/command') { const text = String(b.text || '').trim().slice(0, 400); if (!text) return json(res, 400, { error: 'brak text' }); return json(res, 200, await runCommand(text, b.timeoutMs)); }
        if (url.pathname === '/agent/confirm') return json(res, 200, await confirm(b.accept !== false));
        if (url.pathname === '/agent/goto') return json(res, 200, await goto(b.url));
        if (url.pathname === '/agent/pick') return json(res, 200, await pick(b.n));
      }
      json(res, 404, { error: 'nie ma takiej ścieżki' });
    } catch (e) { json(res, e.status || 500, { error: String(e.message || e) }); }
  });
  await new Promise(r => server.listen(opts.port ?? 8788, opts.host || '127.0.0.1', r));
  const boundPort = server.address().port;

  return {
    server, controller, browser, port: boundPort,
    async close() { await new Promise(r => server.close(r)); await controller.close(); await browser.close(); }
  };
}

/* ---------- uruchomienie z linii poleceń ---------- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  loadEnvFile(path.join(HOME, 'jev.env'));
  const a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  process.on('unhandledRejection', e => console.error('[web-agent] nieobsłużony błąd:', e?.message || e));
  createAgent({
    port: +(arg('--port') || process.env.JARVIS_WEB_PORT || 8788),
    headless: a.includes('--headless') || process.env.JARVIS_WEB_HEADLESS === '1',
    profileDir: process.env.JARVIS_WEB_PROFILE || undefined,
    startUrl: arg('--start-url') || process.env.JARVIS_WEB_START_URL || 'about:blank'
  }).then(ag => {
    console.error(`[web-agent] gotowy: http://127.0.0.1:${ag.port}/agent/*  ·  model ${ag.controller.stats.model}  ·  ${a.includes('--headless') ? 'headless' : 'okno widoczne'}`);
    const bye = async () => { await ag.close().catch(() => { }); process.exit(0); };
    process.on('SIGINT', bye); process.on('SIGTERM', bye);
  }).catch(e => { console.error('[web-agent] BŁĄD:', e.message); process.exit(1); });
}
