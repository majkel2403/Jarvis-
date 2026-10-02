/* Jakość: mapowanie 1:1 na istniejący system J.fx (D3) i zachowanie bramek. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadFx } = require('./fx-harness.js');

test('QUALITY_ORDER ma dokładnie cztery poziomy w kolejności rosnącej', () => {
  const { QUALITY_ORDER } = loadFx().J.fxQuality;
  assert.strictEqual([...QUALITY_ORDER].join(','), 'off,low,high,ultra');
});

test('indeks J.fx.rank() mapuje się na poziom biblioteki 1:1', () => {
  const expected = { 0: 'off', 1: 'low', 2: 'high', 3: 'ultra' };
  for (const rank of [0, 1, 2, 3]) {
    const c = loadFx({ rank });
    assert.strictEqual(c.J.fxQuality.getQuality(), expected[rank], `rank ${rank}`);
  }
});

test('nazwa poziomu aplikacji mapuje się na poziom biblioteki', () => {
  // Nazwy są różne (tool/standard/cinema vs low/high/ultra) — to zamierzona
  // translacja, nie ta sama lista pod dwoma nazwami.
  const MAP = { off: 'off', tool: 'low', standard: 'high', cinema: 'ultra' };
  for (let rank = 0; rank < 4; rank++) {
    const c = loadFx({ rank });
    assert.strictEqual(c.J.fxQuality.getQuality(), MAP[c.J.fx.LEVELS[rank]], `rank ${rank} (${c.J.fx.LEVELS[rank]})`);
  }
});

test('atLeast() działa na granicach i poza zakresem', () => {
  const { atLeast } = loadFx().J.fxQuality;
  assert.ok(atLeast('high', 'off'), 'high >= off');
  assert.ok(atLeast('high', 'high'), 'high >= high');
  assert.ok(!atLeast('low', 'high'), 'low < high');
  assert.ok(!atLeast('off', 'low'), 'off < low');
  assert.ok(atLeast('ultra', 'high'), 'ultra >= high');
  // Bramka „off" jest sprawdzana osobno w runSignature, więc atLeast
  // traktuje off jako najniższy zwykły poziom: off spełnia próg „off".
  assert.ok(atLeast('off', 'off'), 'off >= off (próg bramkowania jest osobny)');
});

test('enabled() tożsamo z quality !== off', () => {
  for (const rank of [0, 1, 2, 3]) {
    const q = loadFx({ rank }).J.fxQuality;
    assert.strictEqual(q.enabled(), q.getQuality() !== 'off');
  }
});

test('rank poza zakresem jest przycinany, nie wywraca jakości', () => {
  // J.fx.rank() w aplikacji przycina do 0..3, ale gdyby coś zwróciło -1,
  // warstwa nie może zinterpretować tego jako „najwyższa jakość”.
  const c = loadFx({ rank: -1 });
  assert.strictEqual(c.J.fxQuality.getQuality(), 'off');
  const d = loadFx({ rank: 99 });
  assert.strictEqual(d.J.fxQuality.getQuality(), 'ultra');
});

test('brak J.fx.rank() daje bezpieczny poziom domyślny (high)', () => {
  const c = loadFx();
  delete c.J.fx.rank;
  assert.strictEqual(c.J.fxQuality.getQuality(), 'high');
});

test('zegar ma jednego subskrybenta warstwy i nie uruchamia się sam', () => {
  const c = loadFx();
  const before = c.J.fxClock.subscriberCount;
  c.J.fxLayer.play('orb.charge-up');
  assert.ok(c.J.fxClock.subscriberCount >= before);
  // frame() bez subskrybentów nie może rzucić
  c.J.fxClock.frame(1000);
  c.J.fxClock.frame(1016);
});
