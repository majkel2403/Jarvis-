#!/usr/bin/env node
/* =========================================================
   JARVIS OS — port animacji CSS z biblioteki jarvis-efekty

   Do `css/fx.css` trafia 46 animacji z `katalog/04-css-animations/`
   oraz bramki jakości i przejścia.

   Dwie transformacje są tu obowiązkowe:

   1) PREFIKS `fx-` (D6). `css/jarvis.css` ma 28 globalnych @keyframes bez
      prefiksu (spin, pulse, draw, rise, scan), biblioteka ma kolejne 42.
      CSS jest globalny i rozstrzyga ostatni wczytany — bez prefiksu
      nakładanie obu zestawów gwarantuje ciche kolizje w kodzie, którego
      nikt nie pisał razem.

   2) MAPOWANIE JAKOŚCI. Biblioteka używa `[data-quality="high"]`, aplikacja
      zna cztery poziomy pod innymi nazwami w `js/main.js:88`:
      off/tool/standard/cinema. Bramki tłumaczymy na atrybut `data-fxl`,
      który `J.fx.apply()` lustrzanie ustawia na #app i #fxlayer.

      Osobny atrybut, nie `data-fx`, bo `data-fx` na #app już znaczy
      „poziom aplikacji" i jest używany przez jarvis.css:858-861.

   Użycie: node tools/fx-css.mjs [--kit <ścieżka>] [--check]
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = process.env.JARVIS_FX_KIT || 'C:\\Users\\ajke\\Downloads\\jarvis-efekty';
const KIT_CSS = process.env.JARVIS_FX_KIT || 'C:\\Users\\majke\\Downloads\\jarvis-efekty';
const SRC = path.join(KIT_CSS, 'katalog', '04-css-animations');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DEST = path.join(ROOT, 'css', 'fx.css');

const QUALITY_MAP = { off: 'off', low: 'tool', high: 'standard', ultra: 'cinema' };

/* Klasy, których biblioteka nie używa, a które po prefiksie stałyby się
   martwym CSS-em. Ich oryginalne nazwy odwołują się do komponentów innej
   aplikacji (Reactowej), których ten pulpit nie ma. */
const DEAD = [
  'glass', 'dock-item', 'orb-spin', 'orb-radar', 'orb-heartbeat', 'logo-spin',
  'header-glint', 'header-line', 'boot-', 'wx-', 'clock-colon', 'tile-fx',
  'node-hover', 'press-fx', 'chip-shine', 'chevron-fx', 'input-glow',
  'aurora', 'orb-hover-glow', 'studio-spotlight', 'toast-timer',
];

const warn = [];
const read = p => fs.readFileSync(p, 'utf8');
const exists = p => fs.existsSync(p);

function collectSources() {
  const out = [];
  if (!exists(SRC)) { warn.push('brak katalogu: ' + SRC); return out; }
  for (const e of fs.readdirSync(SRC, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const d = path.join(SRC, e.name);
    if (e.name === '_quality-gates') { out.push({ file: path.join(d, 'quality.css'), kind: 'gate' }); continue; }
    if (e.name === '_transitions') { out.push({ file: path.join(d, 'transitions.css'), kind: 'transition' }); continue; }
    const f = path.join(d, 'animation.css');
    if (exists(f)) out.push({ file: f, kind: 'anim', name: e.name });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

/** Prefiksuje klasy i @keyframes, tłumaczy bramki jakości, wyrzuca martwe. */
function transform(css, kind, name) {
  let out = css;
  // 1) bramki jakości: [data-quality="high"] → [data-fxl="standard"]
  out = out.replace(/\[data-quality="(\w+)"\]/g, (m, q) => {
    const mapped = QUALITY_MAP[q];
    return mapped ? `[data-fxl="${mapped}"]` : m;
  });
  // 2) @keyframes nazwa → @keyframes fx-nazwa
  out = out.replace(/@keyframes\s+([\w-]+)/g, (m, k) => `@keyframes fx-${k}`);
  // 3) animacja/animacja-nazwa: aurora-drift → fx-aurora-drift
  out = out.replace(/(\banimation(?:-name)?\s*:\s*)([^;{}]+)/g, (m, pre, val) => {
    const fixed = val.split(',').map(part => {
      const t = part.trim();
      if (/^fx-|^none$|^infinite$|^\d/.test(t) || /^(ease|linear|cubic-bezier|steps|infinite|alternate|forwards|backwards|both)/.test(t)) return part;
      const w = t.split(/\s+/);
      const first = w[0];
      if (!/^[\w-]+$/.test(first) || first === 'none') return part;
      w[0] = 'fx-' + first;
      return w.join(' ');
    }).join(',');
    return pre + fixed;
  });
  // 4) klasy: .aurora-band-a → .fx-aurora-band-a
  out = out.replace(/\.(-?[_a-zA-Z][\w-]*)/g, (m, c) => {
    if (c.startsWith('fx-')) return m;
    if (/^\d/.test(c)) return m;
    return '.fx-' + c;
  });
  // 5) pseudo-klasy i atrybuty nie mogą dostać prefiksu
  out = out
    .replace(/\.fx-(hover|active|focus|before|after|not|is|where|has)\b/g, '.$1')
    .replace(/::(before|after|marker|placeholder|selection|first-line|first-letter)/g, (m) => m);
  // 6) `:is(.a, .b)` — powyżej każda klasa dostała prefiks osobno, w porządku
  return out;
}

function stripDead(css) {
  // Reguły dotyczące komponentów, których tu nie ma, usuwamy w całości
  // (selektor + blok deklaracji), żeby nie zostawić martwych kilobetów.
  let out = css;
  for (const d of DEAD) {
    const re = new RegExp(`\\.fx-${d}[\\w-]*[^\\{]*\\{[^}]*\\}`, 'g');
    out = out.replace(re, '');
  }
  // Puste selektory po wycięciu zostawiają białe linie — sprzątamy.
  return out.split('\n').map(l => l.replace(/\s+$/, '')).filter((l, i, a) => l.trim() || a[i - 1]?.trim()).join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  if (!exists(SRC)) { console.error(warn.join('\n')); process.exit(2); }

  const sources = collectSources();
  const blocks = [];
  const stats = { files: 0, keyframes: 0, rules: 0, dropped: 0 };

  for (const s of sources) {
    if (!exists(s.file)) { warn.push('brak pliku: ' + s.file); continue; }
    let css = transform(read(s.file), s.kind, s.name);
    const before = css;
    css = stripDead(css);
    stats.dropped += (before.length - css.length);
    stats.keyframes += (css.match(/@keyframes\s/g) || []).length;
    stats.rules += (css.match(/\{/g) || []).length;
    stats.files++;
    const label = s.name ? `${s.name}` : path.basename(path.dirname(s.file));
    blocks.push(`/* ── ${label} (${path.basename(s.file)}) ── */\n${css.trim()}\n`);
  }

  const header = `/* =========================================================
   JARVIS OS — warstwa efektów: animacje CSS (${stats.files} źródeł)

   GENEROWANE z ${path.relative(ROOT, SRC).replace(/\\/g, '/')} przez tools/fx-css.mjs
   — nie edytuj ręcznie. Regeneracja: node tools/fx-css.mjs

   Zasada prefiksów (D6): wszystkie klasy i nazwy @keyframes mają „fx-”.
   Zasada jakości: bramki używają [data-fxl="off|tool|standard|cinema"].
   J.fx.apply() ustawia data-fxl na #app i na #fxlayer.

   Klucze animacji: ${stats.keyframes} · reguł: ${stats.rules}
   ========================================================= */

/* Bramka nadrzędna: przy jakości „off" warstwa znika w całości. */
[data-fxl='off'] { display: none; }
`;

  const content = header + '\n' + blocks.join('\n');
  if (check) {
    const cur = exists(DEST) ? read(DEST) : '';
    if (cur === content) { console.log('  css/fx.css aktualny'); process.exit(0); }
    console.log('  css/fx.css NIEAKTUALNY — uruchom: node tools/fx-css.mjs');
    process.exit(1);
  }
  // Dopisujemy do istniejącego pliku, nie nadpisujemy — na górze są reguły
  // warstwy (#fxlayer, .orb-canvas-gl), które pisałem ręcznie.
  const manual = read(DEST).split('/* ===== GENEROWANE Z CSS ===== */')[0];
  fs.writeFileSync(DEST, manual.replace(/\s+$/, '') + '\n\n/* ===== GENEROWANE Z CSS ===== */\n\n' + content, 'utf8');
  for (const w of warn) console.warn(w);
  console.log(`  css/fx.css ← ${stats.files} źródeł, ${stats.keyframes} @keyframes, ${stats.rules} reguł`);
  console.log(`  pominięto (komponenty obcej aplikacji): ${(stats.dropped / 1024).toFixed(1)} KB`);
}

main();
