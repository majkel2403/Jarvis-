/* Rejestr 64 efektów sygnaturowych: kompletność i spójność metadanych. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadFx } = require('./fx-harness.js');

const ctx = loadFx();
const J = ctx.J;
const list = J.fxLayer.list();

test('rejestr zawiera wszystkie 64 efekty sygnaturowe', () => {
  assert.strictEqual(list.length, 64, `oczekiwano 64 efektów, jest ${list.length}`);
});

test('identyfikatory są unikalne', () => {
  const ids = [...list.map(f => f.id)];
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.strictEqual(dup.length, 0, `powtórzone id: ${[...new Set(dup)].join(', ')}`);
});

test('każdy efekt ma rodzinę z biblioteki i czas trwania', () => {
  for (const f of list) {
    assert.match(f.id, /^[a-z-]+\.[a-z0-9-]+$/, `zły format id: ${f.id}`);
    assert.ok(f.family, `${f.id}: brak rodziny`);
    assert.ok(f.durationMs > 0, `${f.id}: brak durationMs`);
  }
});

test('wagi mieszczą się w dozwolonym zbiorze', () => {
  const allowed = new Set(['hero', 'accent', 'micro']);
  for (const f of list) assert.ok(allowed.has(f.weight), `${f.id}: waga „${f.weight}” spoza zbioru`);
});

test('11 rodzin biblioteki jest kompletnych', () => {
  const got = new Set(list.map(f => f.family));
  for (const fam of ['orb', 'screen', 'particles', 'hud', 'text', 'data', 'glitch', 'success', 'transition', 'pointer', 'ambient']) {
    assert.ok(got.has(fam), `brak rodziny: ${fam}`);
  }
});

test('efekty hero są wyłączne i nieliczne', () => {
  const hero = [...list.filter(f => f.weight === 'hero')];
  assert.ok(hero.length > 0, 'brak efektów hero');
  // 16 hero to liczba z biblioteki — nie ograniczamy sztucznie, pilnujemy
  // tylko tego, że każdy z nich jest jednorazowy (brak duplikatu id).
  assert.ok(hero.length <= 20, `niespodziewanie dużo hero: ${hero.length}`);
  const ids = hero.map(f => f.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('rejestr nie ma duplikatów między rodzinami', () => {
  const ids = [...list.map(f => f.id)];
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('warstwa nie kręci własną pętlą, gdy nic nie gra', () => {
  // Krytyczne (D4): druga pętla rAF obciążyłaby pomiar FPS w js/main.js:114,
  // a ten sam mechanizm (J.fx.lower() po 5 s poniżej 30 FPS) obniżyłby
  // jakość całej aplikacji — łącznie z tą warstwą.
  const c = loadFx();
  c.J.fxLayer.list();
  c.advance(20);                      // bez odtwarzanego efektu
  assert.strictEqual(c.__pendingFrames(), 0,
    'warstwa kolejkowała klatki bez aktywnego efektu');
});

test('odtworzenie nieznanego efektu zwraca false bez wyjątku', () => {
  const c = loadFx();
  assert.strictEqual(c.J.fxLayer.play('nie.ma.takiego'), false);
  assert.strictEqual(c.__errors.length, 0);
});

test('poziom off blokuje odtwarzanie', () => {
  const c = loadFx({ rank: 0 });
  assert.strictEqual(c.J.fxLayer.play('orb.charge-up'), false);
  assert.strictEqual(c.J.fxLayer.activeCount, 0);
});

test('prefers-reduced-motion blokuje odtwarzanie (rank 0)', () => {
  const c = loadFx({ reduced: true });
  assert.strictEqual(c.J.fxLayer.play('orb.charge-up'), false);
});
