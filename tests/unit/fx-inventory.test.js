/* Inwentaryzacja 441 pozycji — dokument jest tabelą postępu, więc musi być
   kompletny, poprawny i zgodny z faktycznym stanem portu. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const JSON_PATH = path.join(ROOT, 'docs', 'fx-inventory.json');
const MD_PATH = path.join(ROOT, 'docs', 'fx-inventory.md');

const has = () => fs.existsSync(JSON_PATH) && fs.existsSync(MD_PATH);
const data = () => JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

test('pliki inwentaryzacji istnieją', { skip: !has() && 'brak docs/fx-inventory.* — uruchom: node tools/fx-inventory.mjs' }, () => {
  assert.ok(fs.existsSync(JSON_PATH));
  assert.ok(fs.existsSync(MD_PATH));
});

test('dokument zawiera dokładnie 441 pozycji', { skip: !has() }, () => {
  assert.strictEqual(data().total, 441, `jest ${data().total} pozycji zamiast 441`);
  assert.strictEqual(data().items.length, 441);
});

test('dziewięć działów katalogu jest kompletnych', { skip: !has() }, () => {
  const sections = [
    ['01-signature-fx', 64], ['02-engine-effects', 35], ['03-studio-visuals', 236],
    ['04-css-animations', 46], ['05-motion-ui', 22], ['06-scenes', 10],
    ['07-primitives', 9], ['08-audio', 13], ['09-os-integration', 6],
  ];
  for (const [dir, n] of sections) {
    const got = data().items.filter(i => i.dzial === dir).length;
    assert.strictEqual(got, n, `${dir}: ${got} zamiast ${n}`);
  }
});

test('każdy rekord ma wymagane pola', { skip: !has() }, () => {
  const required = ['id', 'dzial', 'rodzina', 'tytul', 'technika', 'tier', 'wysilek', 'plik', 'status', 'zdarzenieAplikacja'];
  for (const it of data().items) {
    for (const k of required) {
      assert.ok(k in it, `${it.dzial}/${it.id}: brak pola „${k}”`);
    }
    assert.ok(it.tier && /^T[1-4]$/.test(it.tier), `${it.id}: zły tier „${it.tier}”`);
    assert.ok(['S', 'M', 'L', '—'].includes(it.wysilek), `${it.id}: zły wysiłek „${it.wysilek}”`);
  }
});

test('identyfikatory są unikalne w obrębie działu', { skip: !has() }, () => {
  const seen = new Set();
  const dup = [];
  for (const it of data().items) {
    const key = `${it.dzial}::${it.id}`;
    if (seen.has(key)) dup.push(key);
    seen.add(key);
  }
  assert.deepStrictEqual(dup, [], `powtórzone: ${dup.slice(0, 5).join(', ')}`);
});

test('64 efekty sygnaturowe oznaczone jako przeniesione', { skip: !has() }, () => {
  // Status musi odzwierciedlać fakt, a nie plan.
  const sig = data().items.filter(i => i.dzial === '01-signature-fx');
  const ported = sig.filter(i => i.status === 'przeniesiony');
  assert.strictEqual(ported.length, 64, `oznaczono jako przeniesione: ${ported.length}/64`);
  const files = new Set(ported.map(i => i.plik));
  assert.strictEqual(files.size, 64);
});

test('statusy sygnaturowych zgadzają się z rejestrem js/fx', { skip: !has() }, () => {
  const { loadFx } = require('./fx-harness.js');
  const ids = new Set(loadFx().J.fxLayer.list().map(f => f.id));
  const ported = data().items
    .filter(i => i.dzial === '01-signature-fx' && i.status === 'przeniesiony')
    .map(i => i.id);
  for (const id of ported) {
    assert.ok(ids.has(id), `inwentaryzacja mówi „przeniesiony”, a w rejestrze nie ma: ${id}`);
  }
});

test('żadna pozycja nie deklaruje zależności, której nie ma w katalogu', { skip: !has() }, () => {
  // Dozwolone: zależności frontowe, które świadomie odrzuciliśmy (tier T3/T4),
  // oraz wbudowane moduły Node w narzędziach `09-os-integration/tools/*.mjs`.
  // Wszystko inne to pomyłka albo nowa zależność psująca zasadę
  // „zero zależności w runtime” (docs/TS-MIGRATION.md).
  const known = new Set(['react', 'motion', 'gsap', 'three', 'next', 'lucide-react', 'lenis', 'rive', '@theatre/core', 'node:fs', 'node:path', 'node:url', '@playwright/test']);
  for (const it of data().items) {
    for (const d of it.zaleznosci || []) {
      assert.ok(known.has(d), `${it.id}: nieznana zależność „${d}”`);
    }
  }
});

test('pozycje z zależnością zewnętrzną nie są oznaczone jako przeniesione', { skip: !has() }, () => {
  const builtin = new Set(['node:fs', 'node:path', 'node:url', '@playwright/test']);
  for (const it of data().items) {
    if (it.status !== 'przeniesiony') continue;
    const real = (it.zaleznosci || []).filter(d => !builtin.has(d));
    assert.strictEqual(real.length, 0, `${it.id}: oznaczone „przeniesiony”, a ma zależności: ${real.join(', ')}`);
  }
});

test('wersja markdown odpowiada wersji json', { skip: !has() }, () => {
  const d = data();
  const md = fs.readFileSync(MD_PATH, 'utf8');
  assert.ok(md.includes('**441**') || md.includes('**' + d.total + '**'), 'brak licznika pozycji w nagłówku');
  for (const dir of ['01-signature-fx', '02-engine-effects', '09-os-integration']) {
    assert.ok(md.includes(dir), `markdown nie zawiera działu ${dir}`);
  }
});
