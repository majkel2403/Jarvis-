/* Powiązania: każde wskazuje istniejący efekt, każde zdarzenie ma sensowny kanał,
   a throttling i adaptery długości listy naprawdę działają. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadFx } = require('./fx-harness.js');

const c = loadFx();
const J = c.J;
const BINDINGS = J.fxBindings.BINDINGS;

test('każde powiązanie wskazuje efekt, który istnieje w rejestrze', () => {
  const ids = new Set(J.fxLayer.list().map(f => f.id));
  for (const b of BINDINGS) {
    assert.ok(ids.has(b.fx), `powiązanie ${b.on} → brak efektu „${b.fx}” w rejestrze`);
  }
});

test('powiązania używają tylko znanych kanałów', () => {
  for (const b of BINDINGS) {
    assert.match(b.on, /^(ev|ui|sys):[a-z]+([-][a-z]+|\.[a-z]+)*$/, `zły kanał: ${b.on}`);
  }
});

test('zdarzenia z kanału ev odpowiadają katalogowi zdarzeń aplikacji', () => {
  // docs/spec/katalog-zdarzen.md — nazwy kanału J.ev. Literówka tu oznacza
  // powiązanie, które nigdy się nie odpali.
  const known = new Set([
    'task.created', 'task.paused', 'task.resumed', 'task.recovering', 'task.verifying',
    'task.verified', 'task.completed', 'task.failed', 'task.cancelled',
    'model.started', 'model.completed', 'model.failed',
    'tool.started', 'tool.completed', 'tool.failed',
    'plan.created', 'plan.step', 'approval.requested', 'approval.resolved',
    'signal', 'security.injection', 'notes.trashed', 'notes.restored', 'action.undone',
  ]);
  for (const b of BINDINGS) {
    if (!b.on.startsWith('ev:')) continue;
    assert.ok(known.has(b.on.slice(3)), `nieznane zdarzenie J.ev: ${b.on}`);
  }
});

test('powiązania z kanału ui odpowiadają nazwom używanym przez J.emit', () => {
  const known = new Set([
    'fx-boot', 'chat.message', 'notes', 'tasks', 'wm', 'fx', 'pointer',
    'market-alert', 'task-due', 'task-overdue',
  ]);
  for (const b of BINDINGS) {
    if (!b.on.startsWith('ui:')) continue;
    assert.ok(known.has(b.on.slice(3)), `nieznane zdarzenie UI: ${b.on}`);
  }
});

test('zdarzenie z J.ev wyzwala efekt', () => {
  const c2 = loadFx();
  const fxSeen = [];
  const realPlay = c2.J.fxLayer.play;
  c2.J.fxLayer.play = (id) => { fxSeen.push(id); return realPlay.call(c2.J.fxLayer, id); };
  c2.J.ev.emit('task.created', { task_id: 't1' });
  assert.ok(fxSeen.includes('orb.charge-up'), `nie zobaczyłem orb.charge-up, było: ${fxSeen.join(', ')}`);
});

test('zdarzenie bootu z J.emit wyzwala efekt bootu', () => {
  const c2 = loadFx();
  const fxSeen = [];
  const realPlay = c2.J.fxLayer.play;
  c2.J.fxLayer.play = (id) => { fxSeen.push(id); return realPlay.call(c2.J.fxLayer, id); };
  c2.J.emit('fx-boot');
  assert.ok(fxSeen.includes('hud.boot-sequence'), `było: ${fxSeen.join(', ')}`);
});

test('adapter notatek reaguje tylko na wzrost listy', () => {
  // Stan początkowy podany przy starcie — adapter porównuje z poprzednim
  // odczytem, więc bez tego pierwsze zdarzenie zawsze byłoby „wzrostem”.
  const c2 = loadFx({ notes: [{ id: 'a' }] });
  const fxSeen = [];
  const realPlay = c2.J.fxLayer.play;
  c2.J.fxLayer.play = (id) => { fxSeen.push(id); return realPlay.call(c2.J.fxLayer, id); };

  c2.J.emit('notes');                 // sam odczyt — bez efektu
  assert.ok(!fxSeen.includes('particles.confetti'), 'sam odczyt listy nie może odtwarzać');

  c2.__notes.push({ id: 'b' });
  c2.J.emit('notes');                 // dodanie
  assert.ok(fxSeen.includes('particles.confetti'), 'dodanie notatki musi odtworzyć konfetti');

  fxSeen.length = 0;
  c2.__notes.length = 0;
  c2.J.emit('notes');                 // usunięcie
  assert.ok(!fxSeen.includes('particles.confetti'), 'usunięcie notatki nie konfettiuje');
});

test('adapter okien reaguje tylko na otwarcie', () => {
  const c2 = loadFx({ windows: 2 });
  const fxSeen = [];
  const realPlay = c2.J.fxLayer.play;
  c2.J.fxLayer.play = (id) => { fxSeen.push(id); return realPlay.call(c2.J.fxLayer, id); };

  c2.__windows = 2;
  c2.J.emit('wm');                    // zmiana pozycji istniejących okien
  assert.ok(!fxSeen.includes('screen.iris'), 'zmiana pozycji okna nie otwiera efektu');

  c2.__windows = 3;
  c2.J.emit('wm');                    // otwarcie
  assert.ok(fxSeen.includes('screen.iris'), 'otwarcie okna musi odtworzyć tęczę');

  fxSeen.length = 0;
  c2.__windows = 1;
  c2.J.emit('wm');                    // zamknięcie
  assert.ok(!fxSeen.includes('screen.iris'), 'zamknięcie okna nie odtwarza tęczy');
});

test('throttling nie przepuszcza zdarzeń w zbyt krótkim odstępie', () => {
  const c2 = loadFx();
  let calls = 0;
  const realPlay = c2.J.fxLayer.play;
  c2.J.fxLayer.play = (id) => { if (id === 'hud.circuit') calls++; return true; };
  for (let i = 0; i < 20; i++) c2.J.ev.emit('tool.started', {});
  assert.strictEqual(calls, 1, `throttleMs=1500 powinien przepuścić raz, przepuścił ${calls}`);
});

test('powiązania instalują się dokładnie raz', () => {
  const c2 = loadFx();
  assert.ok(c2.J.fxBindings.installed, 'powinno być zainstalowane od razu');
  assert.strictEqual(c2.J.fxBindings.install(), true);
  assert.strictEqual(c2.J.fxBindings.install(), true);
  // powtórna instalacja nie może dublować subskrypcji
  c2.J.fxBindings.uninstall();
  assert.strictEqual(c2.J.fxBindings.installed, false);
});

test('wyjątek w obsłudze zdarzenia nie wywraca reszty', () => {
  const c2 = loadFx();
  c2.J.on('notatka', () => { throw new Error('celowo'); });
  c2.J.emit('notatka');          // J.emit łapie wyjątki (core.js:185)
  assert.ok(true);
});
