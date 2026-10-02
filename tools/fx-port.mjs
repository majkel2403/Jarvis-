#!/usr/bin/env node
/* =========================================================
   JARVIS OS — port biblioteki efektów: TypeScript → waniliowy JS

   Zamienia moduły biblioteki `jarvis-efekty` na pliki `js/fx/*.js`
   zgodne z konwencją projektu (docs/TS-MIGRATION.md, ścieżka C):
     IIFE + globalne J.*, bez bundlera, bez import/export.

   Używa `typescript` z devDependencies (transpileModule) — nie dodaje
   żadnej nowej zależności. Wynik jest zapisywany do repozytorium,
   więc w runtime nie ma kroku budowania.

   Użycie:
     node tools/fx-port.mjs [--kit <ścieżka>] [--check] [--only <grupa>]

     --check   nie zapisuje, tylko porównuje (dla testów/CI)
     --only    portuje wybraną grupę: runtime | effects | engine

   Mapowanie importów (jedyne, jakie występują w bibliotece):
     ../../_runtime/draw      → J.fxDraw
     ../../_runtime/palettes  → J.fxPal
     ../../_runtime/runtime   → J.fxRt
     @/effects/signature/*    → j.w.
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const KIT = process.env.JARVIS_FX_KIT || 'C:\\Users\\majke\\Downloads\\jarvis-efekty';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC_RT = path.join(KIT, 'katalog', '01-signature-fx', '_runtime');
const SRC_FX = path.join(KIT, 'katalog', '01-signature-fx');
const SRC_ENG = path.join(KIT, 'katalog', '02-engine-effects', '_runtime');
const TSC = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

/* Kompilator: transpile-only. TypeScript 7 (tsgo) nie ma JS API, więc wołamy CLI
   z --noCheck. Bez sprawdzania typów aliasy @/… nie muszą się rozwiązywać —
   ich importy i tak usuwamy ręcznie. */
const TSC_ARGS = ['--noCheck', '--skipLibCheck', '--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler'];

/** Transpile listy plików TS do katalogu tymczasowego. Zwraca ścieżkę wyjściową. */
function tsc(files, rootDir, tag) {
  if (!files.length) return null;
  const outDir = path.join(os.tmpdir(), `jarvis-fx-port-${tag}-${process.pid}`);
  const rel = files.map(f => path.relative(KIT, f));
  const res = spawnSync(process.execPath, [TSC, ...TSC_ARGS, '--rootDir', rootDir, '--outDir', outDir, ...rel], {
    cwd: KIT, encoding: 'utf8',
  });
  if (res.status !== 0) {
    warn.push('  tsc zakończone błędem:\n' + String(res.stdout || '') + String(res.stderr || ''));
    return null;
  }
  return { outDir, rootDir };
}

/** Ścieżka wyjściowa tsc dla pliku źródłowego (struktura lustrzana od rootDir). */
function emittedOf(job, file) {
  return path.join(job.outDir, path.relative(job.rootDir, file).replace(/\.tsx?$/, '.js'));
}

/* namespace globalne dla każdego przenoszonego modułu */
const NS = {
  draw: 'J.fxDraw',
  palettes: 'J.fxPal',
  runtime: 'J.fxRt',
  'signature/runtime': 'J.fxRt',
  'signature/palettes': 'J.fxPal',
  'signature/draw': 'J.fxDraw',
};

const FAMILIES = ['orb', 'screen', 'particles', 'hud', 'text', 'data', 'glitch', 'success', 'transition', 'pointer', 'ambient'];

/* Wzorzec ścieżki trafia do komentarza, więc sekwencja zamykająca musi zostać zneutralizowana. */
const BANNER = (what, from) => `/* =========================================================
   JARVIS OS — ${what}
   GENEROWANE z ${String(from).replace(/\*\//g, '*\\/')} przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */`;

/* ---------- transpilacja ---------- */
function readSrc(file) { return fs.readFileSync(file, 'utf8'); }

/* ---------- analiza importów z oryginału ---------- */
const IMPORT_RE = /^[ \t]*import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?[ \t]*$/gm;
const BARE_IMPORT_RE = /^[ \t]*import\s+(?:type\s+)?([A-Za-z_$][\w$]*)[ \t]+from\s*['"]([^'"]+)['"];?[ \t]*$/gm;
const SIDE_IMPORT_RE = /^[ \t]*import\s+['"]([^'"]+)['"];?[ \t]*$/gm;

/** Zbiiera nazwane importy z oryginału i zwraca mapę moduł → lista nazw. */
function parseImports(src) {
  const byModule = new Map();
  for (const m of src.matchAll(IMPORT_RE)) {
    const names = m[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.replace(/^type\s+/, '').split(/\s+as\s+/).pop().trim())
      .filter(Boolean);
    if (!byModule.has(m[2])) byModule.set(m[2], []);
    byModule.get(m[2]).push(...names);
  }
  return byModule;
}

function namespaceOf(spec) {
  const norm = spec
    .replace(/^(\.\.\/)+/, '')        // ../../_runtime/x → _runtime/x
    .replace(/^\.\//, '')
    .replace(/^_runtime\//, '')       // _runtime/draw → draw
    .replace(/^@\/effects\//, '')
    .replace(/^@\/theme\//, 'theme/')  // @/theme/tokens → theme/tokens
    .replace(/^@\/engine\//, 'engine/')
    .replace(/\.ts$/, '');
  if (NS[norm]) return NS[norm];
  if (norm === 'draw') return NS.draw;
  if (norm === 'palettes') return NS.palettes;
  if (norm === 'runtime') return NS.runtime;
  return null;
}

/* Moduły silnika efektów żyją pod własnymi namespace'ami. `quality` i
   `targets` celowo wskazują na nasze adaptery (js/fx/quality.js,
   js/fx/targets.js) — biblioteki nie dublujemy, bo adaptatory i tak muszą
   czytać z J.fx (D3). */
const ENGINE_NS = {
  'theme/tokens': 'J.fxTokens',
  'engine/process-nodes': 'J.fxNodes',
  'renderers/css/dom': 'J.fxDom',
  // quality i targets celowo wskazują na nasze adaptery (D3) —
  // biblioteki nie dublujemy, bo i tak muszą czytać z J.fx.
  quality: 'J.fxQuality',
  targets: 'J.fxTargets',
};
Object.assign(NS, ENGINE_NS);

/* Nazwy, które są typami — znikają przy transpilacji, więc nie destructurujemy ich. */
const TYPE_ONLY = new Set([
  'SignatureFx', 'Vec', 'Rect', 'Quality', 'Palette', 'PaletteId', 'FxCtx', 'FxEnv',
  'FxFamily', 'FxWeight', 'Anchors', 'AnchorName', 'PlayOptions', 'FrameFn', 'GlLayer',
  'JarvisEvent', 'JarvisEventType', 'SignatureBinding', 'EffectDefinition', 'EffectParams',
  'EffectContext', 'EffectHandle', 'EffectId', 'EffectBinding', 'Targets', 'TargetKey',
  'WebGLOrbTarget', 'AmbientTarget', 'NodeMeta',
  // silnik efektów
  'Clock', 'EventBus', 'NodeId', 'EffectEngine', 'Active', 'FXToken',
]);

/** Destructuring z globalnych namespace'ów biblioteki. */
function prologue(byModule) {
  const lines = [];
  for (const [spec, names] of byModule) {
    const uniq = [...new Set(names)].filter(n => n && !TYPE_ONLY.has(n));
    if (!uniq.length) continue;                       // sam import typów — pomijamy
    const ns = namespaceOf(spec);
    if (!ns) {
      lines.push(`/* PORT: nierozpoznany import "${spec}" — sprawdź ręcznie */`);
      continue;
    }
    lines.push(`const { ${uniq.sort().join(', ')} } = ${ns};`);
  }
  return lines.join('\n');
}

/** Usuwa wszystkie linie importu (po transpilacji) i zwraca kod bez nich. */
function stripImports(js) {
  return js
    .split('\n')
    .filter(l => !/^\s*import[\s{*'"]/.test(l) && !/^\s*export\s+\*/.test(l))
    .join('\n');
}

/** Usuwa `export` z deklaracji i `export default X;`, zbierając nazwy eksportów. */
function rewriteExports(js) {
  const names = [];
  let out = js
    .replace(/^[ \t]*export\s+default\s+[^;]*;?[ \t]*$/gm, '')
    .replace(/^[ \t]*export\s+(const|let|var|function|async function|class)\s+([A-Za-z_$][\w$]*)/gm, (m, kind, name) => {
      names.push(name);
      return `${kind} ${name}`;
    });
  return { code: out, names };
}

/* ---------- emit ---------- */
const warn = [];

function write(outPath, content, check) {
  const rel = path.relative(ROOT, outPath).replace(/\\/g, '/');
  const old = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
  if (old === content) return { rel, changed: false };
  if (check) { warn.push(`  ${rel} — nieaktualny`); return { rel, changed: true }; }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf8');
  return { rel, changed: true };
}

/* ---------- port modułów _runtime ---------- */
const RUNTIME_JOBS = [
  { src: path.join(SRC_RT, 'draw.ts'), dest: 'js/fx/draw.js', ns: 'J.fxDraw', what: 'Pomocnicze rysowanie (sprite’y, pioruny, ścieżki)' },
  { src: path.join(SRC_RT, 'palettes.ts'), dest: 'js/fx/palettes.js', ns: 'J.fxPal', what: 'Palety kolorów' },
  { src: path.join(SRC_RT, 'runtime.ts'), dest: 'js/fx/runtime.js', ns: 'J.fxRt', what: 'Runtime efektów sygnaturowych (FxCtx, oś czasu, sprzątanie)' },
];

function portRuntime(check) {
  const out = [];
  const job = tsc(RUNTIME_JOBS.map(j => j.src), SRC_RT, 'rt');
  if (!job) return out;
  for (const j of RUNTIME_JOBS) {
    if (!fs.existsSync(j.src)) { warn.push(`  brak źródła: ${j.src}`); continue; }
    const original = readSrc(j.src);
    const byModule = parseImports(original);
    const emitted = emittedOf(job, j.src);
    if (!fs.existsSync(emitted)) { warn.push(`  brak emisji dla ${path.basename(j.src)}`); continue; }
    const { code, names } = rewriteExports(stripImports(fs.readFileSync(emitted, 'utf8')));
    const body = [
      `'use strict';`,
      BANNER(j.what, `katalog/01-signature-fx/_runtime/${path.basename(j.src)}`),
      `(() => {`,
      prologue(byModule),
      code.trim(),
      `${j.ns} = { ${[...new Set(names)].sort().join(', ')} };`,
      `})();`,
      ``,
    ].join('\n');
    out.push(write(path.join(ROOT, j.dest), body, check));
  }
  return out;
}

/* ---------- port 64 efektów sygnaturowych ---------- */
function portEffects(check) {
  const out = [];
  let total = 0;
  const all = [];
  const byFamily = new Map();
  for (const family of FAMILIES) {
    const dir = path.join(SRC_FX, family);
    if (!fs.existsSync(dir)) { warn.push(`  brak rodziny: ${family}`); continue; }
    const effects = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('_'))
      .map(e => path.join(dir, e.name, 'effect.ts'))
      .filter(f => fs.existsSync(f))
      .sort();
    if (effects.length) { byFamily.set(family, effects); all.push(...effects); }
  }
  const job = tsc(all, SRC_FX, 'fx');
  if (!job) return { out, total };

  for (const [family, effects] of byFamily) {
    const union = new Map();
    const bodies = [];
    const ids = [];

    for (const file of effects) {
      const original = readSrc(file);
      for (const [spec, names] of parseImports(original)) {
        if (!union.has(spec)) union.set(spec, []);
        union.get(spec).push(...names);
      }
      const emitted = emittedOf(job, file);
      if (!fs.existsSync(emitted)) { warn.push(`  brak emisji: ${path.relative(KIT, file)}`); continue; }
      const { code, names } = rewriteExports(stripImports(fs.readFileSync(emitted, 'utf8')));
      if (!names.length) { warn.push(`  ${path.relative(KIT, file)} — brak eksportu, pominięto`); continue; }
      const idMatch = original.match(/\bid:\s*["']([^"']+)["']/);
      if (idMatch) ids.push(idMatch[1]);
      // każdy efekt w własnym zakresie — brak kolizji nazw top-level między plikami
      bodies.push(
        `    /* ── ${path.basename(path.dirname(file))} */\n` +
        `    (() => {\n` +
        code.trim().split('\n').map(l => (l ? '  ' + l : l)).join('\n') +
        `\n      return ${names[0]};\n    })(),`
      );
    }
    if (!bodies.length) continue;
    total += bodies.length;

    const body = [
      `'use strict';`,
      BANNER(`Efekty sygnaturowe — ${family} (${bodies.length})`, `katalog/01-signature-fx/${family}/<efekt>/effect.ts`),
      `/* id: ${ids.join(', ')} */`,
      `(() => {`,
      `J.fxEffects = J.fxEffects || {};`,
      `J.fxEffects.${family} = J.fxEffects.${family} || [];`,
      prologue(union),
      `J.fxEffects.${family}.push(`,
      bodies.join('\n'),
      `  );`,
      `})();`,
      ``,
    ].join('\n');
    out.push(write(path.join(ROOT, 'js', 'fx', 'effects', `${family}.js`), body, check));
  }
  return { out, total };
}

/* ---------- port silnika efektów (katalog 02) ---------- */
const SRC_LIB = path.join(KIT, 'zrodla', 'effects', 'library');
const SRC_ENG_RT = path.join(KIT, 'katalog', '02-engine-effects', '_runtime');

const ENGINE_JOBS = [
  { src: path.join(SRC_ENG_RT, 'dom.ts'), dest: 'js/fx/engine-dom.js', ns: 'J.fxDom', what: 'Renderer DOM/CSS silnika efektów' },
  { src: path.join(SRC_ENG_RT, 'effect-engine.ts'), dest: 'js/fx/engine-core.js', ns: 'J.fxEngineCore', what: 'Rdzeń silnika efektów (createEffectEngine)' },
];

function portEngineCore(check) {
  const out = [];
  const job = tsc(ENGINE_JOBS.map(j => j.src), SRC_ENG_RT, 'eng');
  if (!job) return out;
  for (const j of ENGINE_JOBS) {
    if (!fs.existsSync(j.src)) { warn.push(`  brak źródła: ${j.src}`); continue; }
    const original = readSrc(j.src);
    const byModule = parseImports(original);
    const emitted = emittedOf(job, j.src);
    if (!fs.existsSync(emitted)) { warn.push(`  brak emisji dla ${path.basename(j.src)}`); continue; }
    const { code, names } = rewriteExports(stripImports(fs.readFileSync(emitted, 'utf8')));
    out.push(write(path.join(ROOT, j.dest), [
      `'use strict';`,
      BANNER(j.what, `katalog/02-engine-effects/_runtime/${path.basename(j.src)}`),
      `(() => {`,
      prologue(byModule),
      code.trim(),
      `${j.ns} = { ${[...new Set(names)].sort().join(', ')} };`,
      `})();`,
      ``,
    ].join('\n'), check));
  }
  return out;
}

/* Biblioteka 35 efektów silnika. Każdy eksport trafia na listę J.fxEngineLib,
   z której zbuduje rejestr — tak samo jak podpójście 64 efektów sygnaturowych. */
function portEngineLib(check) {
  const out = [];
  if (!fs.existsSync(SRC_LIB)) { warn.push('  brak zrodla/effects/library'); return { out, total: 0 }; }
  const files = fs.readdirSync(SRC_LIB).filter(f => f.endsWith('.ts') && f !== 'index.ts').sort().map(f => path.join(SRC_LIB, f));
  const job = tsc(files, SRC_LIB, 'lib');
  if (!job) return { out, total: 0 };
  let total = 0;
  for (const file of files) {
    const original = readSrc(file);
    const byModule = parseImports(original);
    const emitted = emittedOf(job, file);
    if (!fs.existsSync(emitted)) { warn.push(`  brak emisji: ${path.basename(file)}`); continue; }
    const { code, names } = rewriteExports(stripImports(fs.readFileSync(emitted, 'utf8')));
    if (!names.length) { warn.push(`  ${path.basename(file)} — brak eksportów`); continue; }
    total += names.length;
    const ids = [...original.matchAll(/^[ \t]+id:\s*['"]([^'"]+)['"]/gm)].map(m => m[1]);
    out.push(write(path.join(ROOT, 'js', 'fx', 'effects-engine', `${path.basename(file, '.ts')}.js`), [
      `'use strict';`,
      BANNER(`Silnik efektów — ${path.basename(file, '.ts')} (${names.length})`, `zrodla/effects/library/${path.basename(file)}`),
      ids.length ? `/* id: ${ids.join(', ')} */` : '',
      `(() => {`,
      `J.fxEngineLib = J.fxEngineLib || [];`,
      prologue(byModule),
      code.trim(),
      `J.fxEngineLib.push(${names.join(', ')});`,
      `})();`,
      ``,
    ].filter(Boolean).join('\n'), check));
  }
  return { out, total };
}

/* ---------- main ---------- */
function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : 'all';
  if (!fs.existsSync(KIT)) { console.error(`Brak biblioteki: ${KIT}`); process.exit(2); }

  const report = [];
  if (only === 'all' || only === 'runtime') report.push(...portRuntime(check));
  if (only === 'all' || only === 'effects') {
    const r = portEffects(check);
    report.push(...r.out);
    console.log(`  efekty sygnaturowe: ${r.total} szt. w ${FAMILIES.filter(f => fs.existsSync(path.join(SRC_FX, f))).length} rodzinach`);
  }
  if (only === 'all' || only === 'engine') {
    report.push(...portEngineCore(check));
    const r = portEngineLib(check);
    report.push(...r.out);
    console.log(`  efekty silnika: ${r.total} definicji`);
  }
  for (const w of warn) console.warn(w);
  const changed = report.filter(r => r.changed);
  console.log(changed.length ? `  zaktualnizowano: ${changed.length} plik(ów)` : '  bez zmian — pliki są aktualne');
  if (check && changed.length) process.exit(1);
}

main();
