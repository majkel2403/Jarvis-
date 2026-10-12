/* Komponenty 6–20 (js/hud-components.js): pusty stan, escapowanie, granice wartości. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../../js/hud-components.js');

test('radar: tylko poprawne punkty, max 12, bez NaN w SVG', () => {
  const svg = H.radar([{ a: 10, r: 0.5 }, { a: null, r: 1 }, { a: 90, r: 2 }, ...Array.from({ length: 20 }, (_, i) => ({ a: i, r: 0.1 }))]);
  assert.equal((svg.match(/hc-blip/g) || []).length, 12);
  assert.doesNotMatch(svg, /NaN/);
});

test('zagrożenia: poziom 0–3 i domyślne etykiety', () => {
  assert.match(H.danger({ level: 0 }), /Brak zagrożeń/);
  assert.match(H.danger({ level: 9 }), /hc-l3/);
  assert.match(H.danger({ level: -4 }), /hc-l0/);
});

test('parametry: null = „—”, wartości escapowane', () => {
  const h = H.params([{ k: 'CPU %', v: null }, { k: 'x', v: '<b>' }]);
  assert.match(h, /<dd>—<\/dd>/); assert.match(h, /&lt;b&gt;/);
});

test('krytyczne: pusta lista = „Brak błędów”', () => {
  assert.match(H.critical([]), /Brak błędów/);
  assert.match(H.critical([{ title: 'Zapis', count: 3 }]), /<b>3<\/b>/);
});

test('kafelki: intensywność w zakresie, pusta lista bez kafelków', () => {
  const h = H.tiles([0, 5, 10]);
  assert.match(h, /--o:0\.12/); assert.match(h, /--o:1\b/);
  assert.equal((H.tiles([]).match(/<i /g) || []).length, 0);
});

test('węzły: nieznany stan = brak danych, nie „online”', () => {
  const h = H.nodes([{ name: 'Hermes', state: 'weird' }, { name: 'Most', state: 'up' }]);
  assert.match(h, /brak danych/); assert.match(h, /online/);
});

test('pentagon: pięć osi, null nie psuje kształtu', () => {
  const svg = H.pentagon([0.5, null, 1, 2, -1], ['A', 'B', 'C', 'D', 'E']);
  assert.match(svg, /<polygon points="[^"]*" class="hc-poly"/);
  assert.doesNotMatch(svg, /NaN/);
});

test('słupki: null = zerowy słupek, brak NaN', () => {
  const h = H.bars([null, 4, 2], ['a', 'b', 'c']);
  assert.match(h, /height:0%/); assert.doesNotMatch(h, /NaN/);
});

test('ozdoby: aria-hidden i bez liczb', () => {
  for (const f of [H.dotmap, H.globe, H.compass]) {
    const s = f();
    assert.match(s, /aria-hidden="true"/);
    assert.doesNotMatch(s, />\d/);
  }
});
