/* Test dymny w prawdziwej przeglądarce (Chromium przez Playwright):
   boot → polecenia lokalne → okna, notatki, zadania, widgety → potwierdzenie → pakiet kontekstu → paleta.
   Uruchomienie: node tests/e2e/smoke.js [url]   (domyślnie http://localhost:8090) */
'use strict';
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const URL = process.argv[2] || process.env.JARVIS_URL || 'http://localhost:8090';
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGE: ' + String(e))); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto(URL + '/index.html?' + Date.now());
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('jarvis-os:v2', JSON.stringify({ settings: { hermesOn: false, skipBoot: true, speech: false, sound: false }, ui: { onboarded: true } })); });
  await p.reload(); await p.waitForTimeout(1000);
  try { await p.click('#bootEnter', { timeout: 3000 }); } catch (e) { await p.keyboard.press('Enter'); }
  await p.waitForTimeout(1500);
  const say = async t => { const r = await p.evaluate(async t => { await J.brain.handle(t); return document.querySelector('#messages')?.lastElementChild?.textContent || ''; }, t); await p.waitForTimeout(250); return r; };
  const expect = async (t, re) => { const r = await say(t); assert(re.test(r), `„${t}” → ${r}`); return r; };
  await expect('otwórz notatnik', /Otwarto: Notatnik/);
  await expect('zanotuj: kupić mleko', /Utworzyłem notatkę/);
  await expect('dopisz do notatki kupić mleko: chleb i masło', /Dopisałem/);
  await expect('przypomnij mi o 18:00 trening', /Dodałem: „trening” — dziś o 18:00/);
  await expect('minutnik 5 minut', /Minutnik ustawiony na 05:00/);
  await expect('ile to 15% z 2400', /360/);
  await expect('jakie mam zadania', /trening/);
  await expect('otwórz harmonogram i ułóż okna', /Otwarto: Harmonogram\. Ułożyłem/);
  await expect('zapamiętaj, że pracuję zdalnie', /Zapamiętałem/);
  await expect('co o mnie wiesz', /pracuję zdalnie/);
  await expect('stwórz listę zakupy: mleko, chleb, jajka', /Utworzyłem widget „zakupy”/);
  await expect('odhacz trening', /Odhaczyłem: trening/);
  await expect('okno na lewo', /lewa połowa/);
  await expect('zatrzymaj minutnik', /Zatrzymałem minutnik/);
  await expect('tapeta aurora', /Tapeta: aurora/);
  await expect('pomoc', /Potrafię/);
  // potwierdzenie narzędzia ryzykownego (źródło: model) → chip przy Core → „Tak”
  const conf = p.evaluate(() => J.registry.run('close_app', { app: 'all' }, { source: 'hermes' }));
  await p.waitForTimeout(600);
  assert(await p.evaluate(() => document.querySelector('#askChip').classList.contains('show')), 'chip potwierdzenia widoczny');
  assert(await p.evaluate(() => J.engine.mode === 'APPROVAL_REQUIRED'), 'tryb APPROVAL_REQUIRED');
  await p.click('#askChip .btn.primary');
  const cr = await conf; assert(cr.ok && cr.data.closed >= 2, 'zamknięto okna: ' + JSON.stringify(cr));
  assert(await p.evaluate(() => J.widgets.list.length === 1), 'widget przetrwał zamknięcie okien');
  // odmowa → DENIED
  const den = p.evaluate(() => J.registry.run('notes_delete', { note: 'kupić mleko' }, { source: 'hermes' }));
  await p.waitForTimeout(500); await p.click('#askChip .btn.danger');
  assert((await den).code === 'DENIED', 'odmowa daje DENIED');
  // ui_ask z odpowiedzią przez czat
  const ask = p.evaluate(() => J.registry.run('ui_ask', { question: 'Która notatka?', options: ['Zakupy', 'Projekty'] }, { source: 'hermes' }));
  await p.waitForTimeout(500);
  await p.evaluate(() => J.brain.handle('Projekty'));
  const ar = await ask; assert(ar.ok && ar.data.answer === 'Projekty', 'odpowiedź z czatu trafia do ui_ask: ' + JSON.stringify(ar));
  // pakiet kontekstu, narzędzia, powiadomienia, podświetlanie
  const misc = await p.evaluate(() => { const pk = J.context.packet({ full: true }); J.notice({ title: 'Test', body: 'x', kind: 'agent' }); return { tools: J.registry.tools().length, keys: Object.keys(pk).length, note: J.state.notes[0].body, unread: J.notifs.unread(), hl: J.ui.highlight('dock', 'Dok') }; });
  assert(misc.tools >= 50 && misc.keys >= 10 && /chleb i masło/.test(misc.note) && misc.unread >= 1 && misc.hl, 'misc ' + JSON.stringify(misc));
  // paleta: dopasowanie lokalne wykonuje polecenie
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+K'); await p.waitForTimeout(300);
  await p.keyboard.type('minutnik 25 min'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  assert(await p.evaluate(() => J.timer.running && J.timer.total === 1500000), 'paleta uruchomiła minutnik 25 min');
  await p.evaluate(() => J.timer.stop());
  // trwałość: historia czatu i pamięć po przeładowaniu
  await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(1200);
  try { await p.click('#bootEnter', { timeout: 3000 }); } catch (e) { await p.keyboard.press('Enter'); }
  await p.waitForTimeout(1200);
  const persisted = await p.evaluate(async () => ({ hist: (await J.store.get('chat.history', [])).length, facts: (await J.memory.all()).length, notes: J.state.notes.length, widgets: J.widgets.list.length }));
  assert(persisted.hist >= 10 && persisted.facts === 1 && persisted.notes === 2 && persisted.widgets === 1, 'trwałość ' + JSON.stringify(persisted));
  // historia zadań mieszka w IndexedDB, a główny klucz localStorage jest lekki (bez historii)
  const store = await p.evaluate(async () => ({ idb: (await J.store.get('proc.history', [])).length, blob: JSON.parse(localStorage.getItem('jarvis-os:v2')).history.length, migrated: J.historyMigrated === true, ready: J.store.ready }));
  assert(store.idb >= 1 && store.blob === 0 && store.migrated && store.ready, 'historia w IndexedDB ' + JSON.stringify(store));
  // model nigdy nie dostaje kluczy API (settings_get)
  const leak = await p.evaluate(async () => { J.state.settings.jevKey = 'sk-or-SEKRET'; J.state.settings.openrouterKey = 'sk-or-SEKRET2'; const r = await J.registry.run('settings_get', {}, { source: 'hermes' }); J.state.settings.jevKey = ''; J.state.settings.openrouterKey = ''; return JSON.stringify(r); });
  assert(!/SEKRET/.test(leak), 'wyciek kluczy w settings_get');
  if (process.env.SHOT) await p.screenshot({ path: path.join(process.env.SHOT, 'smoke.png') });
  await b.close();
  if (errs.length) { console.error('Błędy w konsoli:', errs); process.exit(1); }
  console.log('OK: smoke test przeszedł');
})().catch(e => { console.error(e); process.exit(1); });
