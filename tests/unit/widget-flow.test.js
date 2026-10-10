/* Blok „flow" (panel stanu JAIA): etapy pracy podświetlane zdarzeniami PRAWDZIWEGO zadania (J.ev).
   Sprawdza: schemat, render węzłów, zapalanie i gaszenie etapów, etap statyczny dla własnych id
   oraz brak wycieku subskrypcji przy przerysowaniu i zamknięciu widgetu. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, refShort } = require('../harness.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
const arr = x => JSON.parse(JSON.stringify(x));   // tablice z innego kontekstu (vm) w harnessie
const mk = () => { const J = load({ dom: true, state: { settings: { hermesOn: false, sound: false, speech: false } } }); J.__ctx.setTimeout = refShort; return J; };
const run = (J, id, args, source = 'ui') => J.registry.run(id, args, { source });
const SPEC = {
  v: 1, title: 'Panel stanu', blocks: [{
    kind: 'flow', label: 'przepływ pracy', nodes: [
      { id: 'mysl', label: 'myślę' }, { id: 'plan', label: 'plan' }, { id: 'narzedzia', label: 'narzędzia' },
      { id: 'weryfikacja', label: 'weryfikacja' }, { id: 'odpowiedz', label: 'odpowiedź' }]
  }]
};
const klasy = e => String(e.className || '').split(/\s+/).filter(Boolean);
/* harness nie czyści dzieci przy `textContent = ''`, więc po kilku przerysowaniach drzewo jest zdublowane:
   bierzemy OSTATNI węzeł o danym id (najświeższy render). Klas sprawdzamy listą, nie `includes('on')` —
   „done" zawiera „on" jako podciąg i taka kontrola zawsze kłamałaby. */
const wezly = body => { const po = new Map(); const walk = e => { if (!e) return; if (klasy(e).includes('ws-flow-node')) po.set(e.dataset.id, e); (e.children || []).forEach(walk); }; walk(body); return [...po.values()]; };
const zapalone = body => wezly(body).filter(e => klasy(e).includes('on')).map(e => e.dataset.id);
const stan = (body, id) => klasy(wezly(body).find(e => e.dataset.id === id));
const opis = e => (e.children || []).map(c => c.textContent).join('');
const zbuduj = async J => { const r = await run(J, 'widget_build', { spec: SPEC }); assert.equal(r.ok, true, r.text); await wait(20); return { id: r.data.id, body: J.wm.ctx('w:' + r.data.id).body }; };

test('flow: opis przechodzi sprawdzenie, węzły w kolejności, na starcie nic nie świeci', async () => {
  const J = mk();
  assert.deepEqual(arr(J.wspec.check(SPEC)), []);
  const { body } = await zbuduj(J);
  const n = wezly(body);
  assert.deepEqual(n.map(e => e.dataset.id), ['mysl', 'plan', 'narzedzia', 'weryfikacja', 'odpowiedz']);
  assert.match(n.map(opis).join('|'), /myślę/);
  assert.equal(zapalone(body).length, 0, 'spokojny pulpit: żaden etap nie udaje pracy');
  const zle = { v: 1, title: 'x', blocks: [{ kind: 'flow', nodes: [{ id: 'mysl', label: 'a' }] }] };
  assert.notDeepEqual(arr(J.wspec.check(zle)), [], 'jeden węzeł to za mało');
});

test('flow: etapy zapalają się zdarzeniami zadania i gasną — diagram nie kłamie', async () => {
  const J = mk();
  const { body } = await zbuduj(J);

  J.ev.emit('task.created', { task_id: 't1', title: 'Zadanie' }); await wait(5);
  assert.deepEqual(zapalone(body), ['mysl']);

  J.ev.emit('plan.created', { steps: [{ title: 'krok' }] }); await wait(5);
  assert.deepEqual(zapalone(body), ['plan']);
  assert.ok(stan(body, 'mysl').includes('done'), 'myślenie zamknięte, zanim ruszył plan');

  J.ev.emit('tool.started', { tool: 'get_weather', node: 'internet' }); await wait(5);
  assert.deepEqual(zapalone(body), ['narzedzia']);
  assert.ok(stan(body, 'plan').includes('done'));

  J.ev.emit('tool.completed', { tool: 'get_weather', code: 'OK' }); await wait(5);
  assert.deepEqual(zapalone(body), ['weryfikacja'], 'po narzędziu widać sprawdzanie wyniku');
  assert.ok(stan(body, 'narzedzia').includes('done'));

  J.ev.emit('model.started', {}); await wait(5);
  assert.deepEqual(zapalone(body), ['mysl'], 'sprawdzony etap gaśnie, gdy model myśli dalej');
  assert.ok(stan(body, 'weryfikacja').includes('done'));

  J.ev.emit('task.completed', { task_id: 't1' }); await wait(5);
  assert.deepEqual(zapalone(body), ['odpowiedz']);
  assert.ok(stan(body, 'narzedzia').includes('done'));

  J.ev.emit('task.created', { task_id: 't2' }); await wait(5);
  assert.deepEqual(zapalone(body), ['mysl'], 'nowe zadanie czyści poprzednie');
  assert.equal(wezly(body).filter(e => klasy(e).includes('done')).length, 0);
});

test('flow: awaria narzędzia jest widoczna (klasa err), własne id = etap statyczny', async () => {
  const J = mk();
  const spec = { v: 1, title: 'Panel', blocks: [{ kind: 'flow', nodes: [{ id: 'dziwne', label: 'własny' }, { id: 'narzedzia', label: 'narzędzia' }] }] };
  const r = await run(J, 'widget_build', { spec }); assert.equal(r.ok, true, r.text); await wait(20);
  const body = J.wm.ctx('w:' + r.data.id).body;
  assert.deepEqual(arr(J.wspec.check(spec)), []);
  J.ev.emit('task.created', { task_id: 't9' }); J.ev.emit('tool.started', { tool: 'x' }); await wait(5);
  assert.equal(stan(body, 'dziwne').includes('on'), false, 'własny etap nie udaje pracy');
  assert.ok(stan(body, 'narzedzia').includes('on'));
  J.ev.emit('tool.completed', { tool: 'x', code: 'INTERNAL' }); await wait(5);
  assert.ok(stan(body, 'narzedzia').includes('err'), 'błąd narzędzia świeci na czerwono');
  J.ev.emit('task.failed', { task_id: 't9', error: 'nie udało się' }); await wait(5);
  assert.ok(stan(body, 'narzedzia').includes('err'));
});

test('flow: subskrypcja zdarzeń bez wycieku (przerysowanie i zamknięcie)', async () => {
  const J = mk();
  const orig = J.ev.on; let dodane = 0, zdjete = 0;
  J.ev.on = (t, fn) => { dodane++; const off = orig(t, fn); return () => { zdjete++; off && off(); }; };
  const { id } = await zbuduj(J);
  const d1 = dodane, z1 = zdjete;
  assert.ok(d1 >= 1, 'widget subskrybuje zdarzenia');
  await run(J, 'widget_refresh', { widget: id }); await wait(20);
  assert.equal(dodane - d1, 1, 'przerysowanie dokłada jedną subskrypcję');
  assert.equal(zdjete - z1, 1, '…i zdejmuje poprzednią (inaczej po godzinie byłyby setki)');
  J.widgets.remove(id); await wait(20);
  assert.equal(zdjete - z1, 2, 'zamknięcie widgetu zdejmuje subskrypcję');
  J.ev.emit('tool.started', { tool: 'x' }); await wait(5);   // po zamknięciu nic nie może wybuchać
});
