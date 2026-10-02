/* Sprzątanie — twarde kryterium z planu: po każdym efekcie scena wraca
   do stanu bazowego. Brak `remove()` w onCleanup to najczęstszy błąd przy
   porcie, więc sprawdzamy to dla wszystkich 64 efektów, nie dla kilku. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadFx } = require('./fx-harness.js');

const layerOf = c => c.document.getElementById('fxlayer');
/* Efekty kończą się fade-outem 220 ms i wywołaniem stop() po 400 ms na
   PRAWDZIWYM timerze (js/fx/runtime.js:315-317). Dlatego testy naturalnego
   zakończenia są asynchroniczne — bez tego warstwa wciąż zawiera korzeń
   efektu, który w przeglądarce zniknąłby natychmiast. */
const settle = () => new Promise(r => setTimeout(r, 520));

test('każdy efekt odtwarza się bez wyjątku w harnessie', () => {
  const c = loadFx();
  const list = c.J.fxLayer.list();
  const failed = [];
  for (const f of list) {
    c.__errors.length = 0;
    c.J.fxLayer.play(f.id);
    c.advance(3);
    if (c.__errors.length) failed.push(`${f.id}: ${c.__errors[0].message}`);
  }
  assert.deepStrictEqual(failed, [], `efekty, które się wywróciły:\n${failed.join('\n')}`);
});

test('po zakończeniu warstwa FX jest pusta', async () => {
  const c = loadFx();
  const layer = layerOf(c);
  for (const f of c.J.fxLayer.list()) {
    c.J.fxLayer.stopAll();
    c.J.fxLayer.play(f.id);
    c.advance(200, 20);            // 4 s — najdłuższy efekt trwa 2400 ms
    await settle();                // fade-out + stop()
  }
  assert.strictEqual(layer.children.length, 0,
    `warzystało ${layer.children.length} elementów: ${layer.children.map(x => x.className).join(', ')}`);
  assert.strictEqual(c.J.fxLayer.activeCount, 0, `aktywnych: ${c.J.fxLayer.activeCount}`);
});

test('stopAll() natychmiast czyści warstwę (bez czekania na fade-out)', () => {
  const c = loadFx();
  const layer = layerOf(c);
  for (const f of c.J.fxLayer.list()) {
    c.J.fxLayer.play(f.id);
    c.advance(3);
    c.J.fxLayer.stopAll();
  }
  assert.strictEqual(layer.children.length, 0,
    `warzystało ${layer.children.length} elementów po stopAll()`);
  assert.strictEqual(c.J.fxLayer.activeCount, 0);
});

test('stopAll() czyści warstwę i zeruje licznik aktywnych', () => {
  const c = loadFx();
  for (const id of ['orb.supernova', 'hud.boot-sequence', 'text.decode', 'glitch.failure']) {
    c.J.fxLayer.play(id);
  }
  assert.ok(c.J.fxLayer.activeCount > 0, 'powinny być aktywne efekty');
  c.J.fxLayer.stopAll();
  assert.strictEqual(c.J.fxLayer.activeCount, 0);
  assert.strictEqual(layerOf(c).children.length, 0);
});

test('maksymalnie 4 efekty równocześnie', () => {
  const c = loadFx();
  const ids = ['orb.supernova', 'hud.boot-sequence', 'text.decode', 'glitch.failure', 'success.trophy', 'particles.confetti'];
  for (const id of ids) c.J.fxLayer.play(id);
  assert.ok(c.J.fxLayer.activeCount <= 4, `aktywnych: ${c.J.fxLayer.activeCount}, limit 4`);
});

test('efekt hero wypiera poprzednie hero', () => {
  const c = loadFx();
  c.J.fxLayer.play('orb.supernova');
  c.J.fxLayer.play('hud.boot-sequence');
  c.J.fxLayer.play('success.trophy');
  const hero = c.J.fxLayer.activeCount;
  assert.ok(hero <= 2, `po trzech hero aktywnych: ${hero} (oczekiwane ≤2)`);
});

test('to samo id odtwarzone ponownie nie zostawia dwóch kopii', () => {
  const c = loadFx();
  c.J.fxLayer.play('orb.supernova');
  c.advance(2);
  c.J.fxLayer.play('orb.supernova');
  c.advance(2);
  assert.strictEqual(c.J.fxLayer.activeCount, 1, `aktywnych kopii: ${c.J.fxLayer.activeCount}`);
});

test('efekt nie zostawia włączonych animacji WAAPI na elementach warstwy', async () => {
  const c = loadFx();
  const layer = layerOf(c);
  for (const f of c.J.fxLayer.list()) {
    c.J.fxLayer.play(f.id);
    c.advance(200, 20);
    await settle();
  }
  const live = [];
  const walk = n => {
    for (const el of n.children) {
      for (const a of el.animations || []) if (a.playState === 'running') live.push(a.playState);
      walk(el);
    }
  };
  walk(layer);
  assert.strictEqual(live.length, 0, `pozostały aktywne animacje: ${live.length}`);
});
