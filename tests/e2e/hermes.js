/* Test połączenia Jarvis OS ↔ Hermes gateway w prawdziwej przeglądarce (Chromium) z atrapą gateway'a (tests/mock-hermes.js).
   Scenariusze: brak CORS · zły klucz · działa · gateway wyłączony (fallback na silnik lokalny).
   Uruchomienie: node tests/e2e/hermes.js [url Jarvisa]   (domyślnie http://localhost:4000; serwer: node tools/serve.js) */
'use strict';
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const mock = require('../mock-hermes');
const URLJ = process.argv[2] || process.env.JARVIS_URL || 'http://localhost:4000';
const ORIGIN = new URL(URLJ).origin, PORT = +(process.env.MOCK_PORT || 18642), KEY = 'sekret';
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGE: ' + String(e)));
  const configure = async key => {
    await p.goto(URLJ + '/index.html?' + Date.now());
    await p.evaluate(([k, port]) => { localStorage.clear(); localStorage.setItem('jarvis-os:v2', JSON.stringify({ settings: { hermesOn: true, hermesProvider: 'agent', hermesUrl: 'http://localhost:' + port + '/v1', hermesModel: 'hermes-agent', hermesKey: k, skipBoot: true, speech: false, sound: false }, ui: { onboarded: true } })); }, [key, PORT]);
    await p.reload(); await p.waitForTimeout(800);
    try { await p.click('#bootEnter', { timeout: 3000 }); } catch (e) { await p.keyboard.press('Enter'); }
    await p.waitForTimeout(1000);
  };
  const test = () => p.evaluate(async () => { try { return { ok: true, msg: await J.brain.test() }; } catch (e) { return { ok: false, msg: e.message }; } });
  const say = async t => { const r = await p.evaluate(async t => { await J.brain.handle(t); return document.querySelector('#messages')?.lastElementChild?.textContent || ''; }, t); await p.waitForTimeout(250); return r; };
  const step = n => console.log(' ✔ ' + n);

  /* 1. gateway działa, ale nie zna origin Jarvisa */
  let gw = await mock.start({ port: PORT, key: KEY, cors: [] });
  await configure(KEY);
  let r = await test(); assert(!r.ok && /CORS/.test(r.msg) && r.msg.includes(ORIGIN), 'brak CORS → ' + r.msg); step('brak CORS: komunikat wskazuje origin ' + ORIGIN);
  await gw.close();

  /* 2. CORS ok, zły klucz */
  gw = await mock.start({ port: PORT, key: KEY, cors: [ORIGIN] });
  await configure('zly-klucz');
  r = await test(); assert(!r.ok && /odrzucił klucz/.test(r.msg), 'zły klucz → ' + r.msg); step('zły klucz: „Hermes odrzucił klucz API”');

  /* 3. wszystko poprawne: test połączenia + rozmowa przez Hermesa */
  await configure(KEY);
  r = await test(); assert(r.ok && /odpowiada/.test(r.msg), 'poprawna konfiguracja → ' + r.msg); step('Połącz i testuj: ' + r.msg);
  assert(gw.log.some(l => l.origin === ORIGIN), 'żądania z origin Jarvisa dotarły do gateway');
  const reply = await say('opowiedz mi coś ciekawego o kosmosie'); assert(/OK/.test(reply) && !/offline/.test(reply), 'odpowiedź Hermesa w czacie → ' + reply); step('rozmowa przez Hermesa: „' + reply.slice(0, 30) + '”');
  assert(await p.evaluate(() => J.hermes.status) === 'up', 'status up'); step('status połączenia: up');
  await gw.close();

  /* 4. gateway padł → fallback na silnik lokalny, bez wyjątku */
  const off = await say('która godzina'); assert(/offline|lokaln|\d{1,2}:\d{2}/i.test(off), 'fallback offline → ' + off); step('Hermes offline: fallback na silnik lokalny');
  r = await test(); assert(!r.ok && /Nie mogę połączyć/.test(r.msg) && /hermes-doctor/.test(r.msg), 'komunikat offline → ' + r.msg); step('Hermes wyłączony: komunikat ze wskazówką diagnostyki');

  assert(!errs.length, 'błędy strony: ' + errs.join(' | '));
  await b.close(); console.log('\nHermes e2e: OK');
})().catch(e => { console.error('\nHermes e2e: FAIL —', e.message); process.exit(1); });
