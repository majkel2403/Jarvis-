/* Komponenty HUD (js/hud-components.js): pusty stan zamiast losowej liczby, poprawne kształty SVG, dane z mostu. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../../js/hud-components.js');

test('pierścień: wartość w % i aria-label; brak wartości = „—” bez łuku', () => {
  const ok = H.ring({ value: 42.4, label: 'CPU' });
  assert.match(ok, /42%/); assert.match(ok, /hc-arc/); assert.match(ok, /aria-label="CPU 42%"/);
  const none = H.ring({ value: null, label: 'CPU' });
  assert.match(none, />—</); assert.doesNotMatch(none, /hc-arc/);
});

test('pierścień: wartość poza zakresem jest przycinana do 0–100', () => {
  assert.match(H.ring({ value: 250 }), />100%</);
  assert.match(H.ring({ value: -5 }), />0%</);
});

test('pierścień: etykieta jest escapowana (brak wstrzyknięcia HTML)', () => {
  assert.doesNotMatch(H.ring({ value: 1, label: '<img src=x>' }), /<img/);
});

test('zegar: wskazówki z podanej daty; zła data = pusty stan', () => {
  const svg = H.clock(new Date(2026, 9, 12, 9, 15, 30));
  assert.match(svg, /aria-label="Godzina 09:15"/);
  assert.equal((svg.match(/hc-hour|hc-min|hc-sec/g) || []).length, 3);
  assert.match(H.clock(new Date('x')), />—</);
});

test('odliczanie: mm:ss, hh:mm:ss dla godzin, brak minutnika = „—”', () => {
  assert.match(H.countdown(125), />02:05</);
  assert.match(H.countdown(3725), />01:02:05</);
  assert.match(H.countdown(null), /hc-empty/);
  assert.match(H.countdown(-3), /hc-empty/);
});

test('wykres: luka (null) dzieli linię na dwa odcinki M…', () => {
  const svg = H.line([1, 2, null, 3], { w: 100, h: 50 });
  assert.equal((svg.match(/M/g) || []).length, 2);
});

test('wykres: pusta seria = pusty stan', () => {
  assert.match(H.line([]), /hc-empty/);
  assert.match(H.line([null, null]), /hc-empty/);
});

test('EKG: brak odpowiedzi w całej serii = pusty stan; luka opada do dołu', () => {
  assert.match(H.ekg([null, null]), /hc-empty/);
  const svg = H.ekg([100, null, 200], { w: 100, h: 50, maxMs: 1000 });
  assert.match(svg, /ostatnio 200 ms/);
  assert.equal((svg.match(/M/g) || []).length, 2);
});

test('dane z mostu: CPU i RAM; brak pól = null', () => {
  assert.deepEqual(H.fromSystemSnapshot({ cpu: { percent: 12.5 }, memory: { used_pct: 60.1 } }), { cpu: 12.5, ram: 60.1 });
  assert.deepEqual(H.fromSystemSnapshot({ cpu: {}, memory: null }), { cpu: null, ram: null });
  assert.deepEqual(H.fromSystemSnapshot(null), { cpu: null, ram: null });
});

test('bufor próbek: przycina do N, zachowuje lukę', () => {
  let b = [];
  for (let i = 0; i < 5; i++) b = H.pushSample(b, i, 3);
  assert.deepEqual(b, [2, 3, 4]);
  assert.deepEqual(H.pushSample([1], 'abc'), [1, null]);
});
