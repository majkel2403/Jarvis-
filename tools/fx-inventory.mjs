#!/usr/bin/env node
/* =========================================================
   JARVIS OS — generator inwentaryzacji biblioteki efektów

   Czyta katalog `jarvis-efekty` (katalog/ + zrodla/) i tworzy
   `docs/fx-inventory.md` + `docs/fx-inventory.json` — pełną listę
   wszystkich pozycji z oceną przenośności na waniliowy JS.

   Użycie:
     node tools/fx-inventory.mjs [--kit <ścieżka>] [--check]

   `--check` nie zapisuje plików — służy do weryfikacji w CI,
   że dokument jest aktualny względem katalogu.

   Pole `status` jest zachowywane między przebiegami (źródło:
   poprzedni fx-inventory.json), więc dokument jest tabelą postępu
   portowania, a nie jednorazowym raportem.
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = process.env.JARVIS_FX_KIT || 'C:\\Users\\majke\\Downloads\\jarvis-efekty';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT_JSON = path.join(ROOT, 'docs', 'fx-inventory.json');
const OUT_MD = path.join(ROOT, 'docs', 'fx-inventory.md');

/* ---------- deklaracja działów katalogu ---------- */
const SECTIONS = [
  { dir: '01-signature-fx', name: 'Efekty sygnaturowe', kind: 'signature', marker: 'effect.ts', expect: 64, baseTier: 'T1' },
  { dir: '02-engine-effects', name: 'Efekty silnika', kind: 'engine', marker: 'effect.ts', expect: 35, baseTier: 'T2' },
  { dir: '03-studio-visuals', name: 'Wizualizacje FX Studio', kind: 'visual', marker: 'visual.json', expect: 236, baseTier: 'T4' },
  { dir: '04-css-animations', name: 'Animacje CSS', kind: 'css', marker: 'animation.css', expect: 46, baseTier: 'T1' },
  { dir: '05-motion-ui', name: 'Ruch w UI (Motion)', kind: 'motion', marker: 'source.tsx', expect: 22, baseTier: 'T3' },
  { dir: '06-scenes', name: 'Sceny i warstwy', kind: 'scene', marker: 'README.md', expect: 10, baseTier: 'T3' },
  { dir: '07-primitives', name: 'Prymitywy UI', kind: 'primitive', marker: '.tsx', expect: 9, baseTier: 'T3' },
  { dir: '08-audio', name: 'Dźwięki UI', kind: 'audio', marker: 'sound.ts', expect: 13, baseTier: 'T1' },
  { dir: '09-os-integration', name: 'Integracja z Jarvis OS', kind: 'integration', marker: null, expect: 6, baseTier: 'T1' },
];

/* ---------- zdarzenie biblioteki -> zdarzenie aplikacji ---------- */
/* Źródło: docs/FX_PLAN.md §2.4 + docs/spec/katalog-zdarzen.md          */
const EVENT_MAP = {
  'app.booted': 'koniec bootu w main.js → J.emit("app-view","booted")',
  'app.visible': 'visibilitychange → J.emit("app-view")',
  'run.started': 'J.ev "task.created"',
  'run.holding': 'J.ev "approval.requested" / "task.paused"',
  'run.completed': 'J.ev "task.completed"',
  'run.failed': 'J.ev "task.failed"',
  'run.settled': 'J.ev "task.completed"/"task.failed" po 3.6 s',
  'node.started': 'J.ev "tool.started"',
  'node.completed': 'J.ev "tool.completed"',
  'chat.typing': 'J.ev "model.started"',
  'chat.delta': 'J.ev "model.started" (próbki fali co 90 ms)',
  'chat.message': 'J.emit("thread") — nowa wiadomość użytkownika',
  'chat.meta': 'J.emit("agent-ui") — metadane modelu',
  'chat.cleared': 'J.emit("thread") — wyczyszczenie wątku',
  'note.added': 'J.emit("notes") + adapter (wzrost listy)',
  'schedule.added': 'J.emit("tasks") + adapter',
  'schedule.toggled': 'J.emit("tasks") + adapter (zmiana flagi)',
  'widget.opened': 'J.on("app-view") — otwarcie panelu',
  'widget.pinned': 'J.emit("wm") — przypięcie',
  'setting.changed': 'J.on("settings")',
  'quality.changed': 'J.on("fx") — zmiana poziomu J.fx.level()',
  'net.changed': 'online/offline + J.on("signal")',
  'fullscreen.changed': 'fullscreenchange',
  'shortcut.used': 'J.on("shortcuts")',
  'log.toggled': 'J.emit("proc-end") / stan panelu logu',
  'ui.pointer': 'pointermove na #fxlayer',
  'system.notification': 'J.emit("market-alert") / "task-due" / "timer-ended"',
  'node.flash': 'J.ev "tool.completed" z tool.model',
};

/* ---------- pomocnicze ---------- */
const read = p => fs.readFileSync(p, 'utf8');
const exists = p => fs.existsSync(p);

function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Zależności runtime: pomija `import type`, aliasy `@/` i ścieżki względne. */
function depsOf(src) {
  const deps = new Set();
  const re = /^\s*import\s+(type\s+)?([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/gm;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) continue;                       // import type — znika po transpilacji
    const clause = m[2];
    if (/^\s*type\s/.test(clause) && !/\b[A-Za-z_$][\w$]*\s*,/.test(clause)) continue;
    const spec = m[3];
    if (spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('/')) continue;
    const name = spec.startsWith('@')
      ? spec.split('/').slice(0, 2).join('/')
      : spec.split('/')[0];
    if (name !== 'react') deps.add(name);
  }
  return [...deps].sort();
}

/** Importy aliasowane @/… — trzeba je zmapować na moduły biblioteki. */
function aliasesOf(src) {
  const out = new Set();
  const re = /from\s*['"]@\/([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) out.add(m[1]);
  return [...out].sort();
}

/** Pole obiektu z kodu: dopasowuje `klucz: "wartość"` lub `klucz: liczbę`. */
function field(src, key) {
  const m = src.match(new RegExp(`\\b${key}\\s*:\\s*("([^"]*)"|(-?\\d+(?:\\.\\d+)?)|([A-Za-z_$][\\w$]*))`));
  if (!m) return undefined;
  return m[2] !== undefined ? m[2] : m[3] !== undefined ? Number(m[3]) : m[4];
}

/**
 * `id` efektu. Osobno od `field()`, bo samo `\bid:` łapie adnotacje typów
 * w sygnaturach helperów (`const nodeColor = (id: unknown) => …`) i zwraca
 * „unknown". Tu szukamy wyłącznie właściwości obiektu — czyli po wcięciu.
 */
function fxId(src) {
  const m = src.match(/^[ \t]+id\s*:\s*['"]([^'"]+)['"]/m);
  return m ? m[1] : undefined;
}

/** Tabela markdown `| Klucz | Wartość |` z README — uzupełnienie, nie źródło prawdy. */
function readmeTable(text) {
  const out = {};
  for (const m of text.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|?\s*$/gm)) {
    const k = m[1].trim();
    if (!k || k === '---' || /^:?-{2,}/.test(k)) continue;
    out[k] = m[2].trim().replace(/[`*]/g, '').replace(/^https?:\/\/\S+$/, m[2].trim());
  }
  return out;
}

function firstLine(text) {
  const m = text.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/[`*]/g, '').trim() : '';
}

function firstParagraph(text) {
  const body = text
    .replace(/^#\s+.*$/m, '')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('|') && !l.trim().startsWith('![') && !l.trim().startsWith('```'));
  return (body[0] || '').trim();
}

/* ---------- ekstrakcja pozycji ---------- */
function readSignature(file) {
  const src = read(file);
  const readme = exists(path.join(path.dirname(file), 'README.md')) ? read(path.join(path.dirname(file), 'README.md')) : '';
  const t = readmeTable(readme);
  return {
    id: fxId(src) || path.basename(path.dirname(file)),
    family: field(src, 'family') || '',
    title: field(src, 'title') || firstLine(readme),
    blurb: field(src, 'blurb') || firstParagraph(readme),
    durationMs: field(src, 'durationMs') ?? null,
    weight: field(src, 'weight') || '',
    minQuality: null,
    technique: t['Technika'] || '',
    webgl: t['WebGL'] || '',
    triggers: t['Wyzwalacze w Jarvis OS'] || t['Zdarzenia'] || '',
    source: t['Źródło'] || '',
    deps: depsOf(src),
    aliases: aliasesOf(src),
  };
}

function readEngine(file) {
  const src = read(file);
  const readme = exists(path.join(path.dirname(file), 'README.md')) ? read(path.join(path.dirname(file), 'README.md')) : '';
  const t = readmeTable(readme);
  return {
    id: fxId(src) || path.basename(path.dirname(file)),
    family: path.basename(path.dirname(path.dirname(file))),
    title: fxId(src) || firstLine(readme),
    blurb: firstParagraph(readme),
    durationMs: field(src, 'durationMs') ?? null,
    weight: '',
    minQuality: field(src, 'minQuality') || t['Minimalna jakość'] || '',
    technique: 'Effect Engine (DOM/WAAPI/Canvas)',
    webgl: '',
    triggers: t['Zdarzenia'] || '',
    source: t['Źródło'] || '',
    deps: depsOf(src),
    aliases: aliasesOf(src),
  };
}

function readVisual(file) {
  const j = JSON.parse(read(file));
  const readme = exists(path.join(path.dirname(file), 'README.md')) ? read(path.join(path.dirname(file), 'README.md')) : '';
  return {
    id: j.id || path.basename(path.dirname(file)),
    family: j.family || '',
    title: j.title || '',
    blurb: j.blurb || firstParagraph(readme),
    durationMs: null,
    weight: '',
    minQuality: null,
    technique: j.technique || '',
    webgl: '',
    triggers: (j.stacks || []).join(' + '),
    source: j.dir || '',
    deps: j.technique === 'gsap' ? ['gsap'] : [],
    aliases: [],
  };
}

function readCss(file) {
  const css = read(file);
  const readme = exists(path.join(path.dirname(file), 'README.md')) ? read(path.join(path.dirname(file), 'README.md')) : '';
  const t = readmeTable(readme);
  const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  return {
    id: keyframes[0] || path.basename(path.dirname(file)),
    family: 'css',
    title: keyframes[0] ? `@keyframes ${keyframes[0]}` : firstLine(readme),
    blurb: firstParagraph(readme),
    durationMs: null,
    weight: '',
    minQuality: null,
    technique: `CSS${keyframes.length ? ` (${keyframes.length} @keyframes)` : ''}`,
    webgl: '',
    triggers: (t['Klasy'] || '').replace(/\.([\w-]+)/g, '$1'),
    source: t['Plik'] || '',
    deps: [],
    aliases: [],
  };
}

function readSource(file) {
  const src = read(file);
  const readme = exists(path.join(path.dirname(file), 'README.md')) ? read(path.join(path.dirname(file), 'README.md')) : '';
  return {
    id: path.basename(path.dirname(file)),
    family: path.basename(path.dirname(path.dirname(file))),
    title: firstLine(readme) || path.basename(file),
    blurb: firstParagraph(readme),
    durationMs: null,
    weight: '',
    minQuality: null,
    technique: /motion|useAnimation|animate\(/.test(src) ? 'Motion (React)' : /\.tsx$/.test(file) ? 'React' : 'Canvas/WebGL',
    webgl: /WebGL|three|shader/i.test(src) ? 'tak' : 'nie',
    triggers: '',
    source: path.basename(file),
    deps: depsOf(src),
    aliases: aliasesOf(src),
  };
}

function readAudio(file) {
  const src = read(file);
  const readme = exists(path.join(path.dirname(file), 'README.md')) ? read(path.join(path.dirname(file), 'README.md')) : '';
  const notes = src.match(/freq:\s*(\d+)/g) || [];
  return {
    id: path.basename(path.dirname(file)),
    family: 'audio',
    title: firstLine(readme) || path.basename(path.dirname(file)),
    blurb: firstParagraph(readme),
    durationMs: null,
    weight: '',
    minQuality: null,
    technique: `WebAudio (syntezowany, ${notes.length} nut)`,
    webgl: 'nie',
    triggers: path.basename(path.dirname(file)),
    source: path.basename(file),
    deps: [],
    aliases: [],
  };
}

function readIntegration(file) {
  const rel = path.relative(path.join(KIT, 'katalog', '09-os-integration'), file).replace(/\\/g, '/');
  const readme = exists(path.join(path.dirname(file), 'README.md')) ? read(path.join(path.dirname(file), 'README.md')) : '';
  const src = /\.(ts|tsx|mjs)$/.test(file) ? read(file) : '';
  return {
    id: rel,
    family: 'integration',
    title: rel,
    blurb: firstParagraph(readme) || firstLine(readme),
    durationMs: null,
    weight: '',
    minQuality: null,
    technique: /\.(ts|tsx)$/.test(file) ? 'TypeScript (OS FX layer)' : /\.mjs$/.test(file) ? 'narzędzie Node' : 'dokumentacja',
    webgl: 'nie',
    triggers: '',
    source: `katalog/09-os-integration/${rel}`,
    deps: depsOf(src),
    aliases: aliasesOf(src),
  };
}

/* ---------- klasyfikacja ---------- */
function effortOf(kind, bytes, deps) {
  if (kind === 'visual') return '—';
  const kb = bytes / 1024;
  let base = kb > 12 ? 'L' : kb > 4 ? 'M' : 'S';
  if (deps.length) base = base === 'S' ? 'M' : 'L';
  if (kind === 'integration') return 'S';
  return base;
}

function tierOf(section, item) {
  if (item.deps.length) return 'T3';
  switch (section.kind) {
    case 'signature': return 'T1';
    case 'engine': return 'T2';
    case 'visual': return 'T4';
    case 'css': return 'T1';
    case 'audio': return 'T1';
    case 'integration': return 'T1';
    case 'primitive': return 'T3';
    case 'motion': return 'T3';
    case 'scene': return 'T3';
    default: return 'T4';
  }
}

function targetEventOf(item, section) {
  // Audio: id jest nazwą zdarzenia biblioteki 1:1.
  if (section.kind === 'audio') return EVENT_MAP[item.id] || 'brak — dźwięk odtwarzany przez J.sfx';
  const trg = item.triggers || '';
  for (const ev of Object.keys(EVENT_MAP)) {
    if (trg.includes(ev) || item.id.startsWith(ev.split('.')[0] + '.')) return EVENT_MAP[ev];
  }
  return 'wymaga ręcznego przypisania (Faza 8)';
}

/* ---------- stan portowania (odczyt zamiast ręcznej edycji) ---------- */
/* Status `przeniesiony` musi wynikać z faktu, a nie z wpisu w dokumencie —
   inaczej tabela postępu rozjeżdża się z rzeczywistością przy pierwszej zmianie
   w js/fx/. Dlatego czytamy nagłówki z komentarza z id-em z wygenerowanych
   plików rodzinnych (tools/fx-port.mjs zapisuje je pod banerem).

   Zwraca mapę „dział katalogu → zbiór id”. Klucz jest potrzebny, bo id bywa
   wspólne między działami (np. `pointer.magnet` jest i efektem sygnaturowym,
   i wizualizacją studio z zależnością gsap) — bez tego studio zostałoby
   oznaczone „przeniesiony”, choć nigdy nie było. */
function portedIds() {
  const dir = path.join(ROOT, 'js', 'fx', 'effects');
  const out = new Map();
  if (!exists(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    const txt = read(path.join(dir, f));
    const src = /GENEROWANE z katalog\/([0-9]{2}-[a-z-]+)\//.exec(txt);
    if (!src) continue;
    const set = out.get(src[1]) || new Set();
    for (const m of txt.matchAll(/^\/\* id: (.+?) \*\/$/gm)) {
      for (const id of m[1].split(',').map(s => s.trim()).filter(Boolean)) set.add(id);
    }
    out.set(src[1], set);
  }
  return out;
}

/* ---------- zbieranie ---------- */
/* Działy mają mieszaną głębokość: 01/02/03/05 to <rodzina>/<efekt>/plik,
   04/06/07/08 to <efekt>/plik. Dlatego szukamy pliku-markeru rekurencyjnie,
   a pozycją jest folder, w którym leży. */
function collect() {
  const items = [];
  for (const section of SECTIONS) {
    const base = path.join(KIT, 'katalog', section.dir);
    if (!exists(base)) { console.error(`  ! brak działu: ${section.dir}`); continue; }
    const before = items.length;

    if (section.kind === 'integration') {
      const files = [
        ...walk(base).filter(f => /\.(ts|tsx)$/.test(f)),
        ...walk(base).filter(f => /\.mjs$/.test(f)),
      ].sort();
      for (const f of files) {
        const it = readIntegration(f);
        items.push(finish(section, it, fs.statSync(f).size, path.relative(KIT, f).replace(/\\/g, '/')));
      }
    } else {
      for (const entry of itemFolders(section, base)) {
        const it = readItem(section, entry.file);
        if (!it) continue;
        items.push(finish(section, it, fs.statSync(entry.file).size, path.relative(KIT, entry.file).replace(/\\/g, '/')));
      }
    }
    const got = items.length - before;
    const mark = got === section.expect ? 'ok  ' : `!   ${got}/${section.expect}`;
    console.log(`  ${mark} ${section.dir}  (${section.name})`);
  }
  return items;
}

/** Zwraca listę plików-markerów, każdy w swoim własnym folderze pozycji. */
function itemFolders(section, base) {
  const out = [];
  const seen = new Set();
  const matches = f => {
    if (!section.marker) return false;
    return section.marker.startsWith('.') ? f.endsWith(section.marker) : path.basename(f) === section.marker;
  };
  for (const f of walk(base)) {
    if (!matches(f)) continue;
    const dir = path.dirname(f);
    if (seen.has(dir)) continue;
    seen.add(dir);
    out.push({ file: f, dir });
  }
  // 06-scenes: katalog może mieć tylko README + kody — bierz pierwszy plik z kodu.
  if (section.kind === 'scene' && !out.length) {
    for (const e of fs.readdirSync(base, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith('_')) continue;
      const d = path.join(base, e.name);
      const code = walk(d).filter(x => /\.(ts|tsx|css)$/.test(x)).sort()[0];
      if (code) out.push({ file: code, dir: d });
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file, 'pl'));
}

function readItem(section, file) {
  switch (section.kind) {
    case 'signature': return readSignature(file);
    case 'engine': return readEngine(file);
    case 'visual': return readVisual(file);
    case 'css': return readCss(file);
    case 'motion': return readSource(file);
    case 'primitive': return readSource(file);
    case 'scene': return readSource(file);
    case 'audio': return readAudio(file);
    default: return null;
  }
}

/** Rodzina z głębokości ścieżki: katalog/<dział>/<rodzina>/<pozycja>/<plik> → <rodzina>. */
function familyFromPath(rel, item) {
  const parts = rel.split('/');
  const i = parts.indexOf('katalog');
  if (i >= 0 && parts.length - i >= 5) return parts[i + 2];
  return item.family || parts[parts.length - 2] || '';
}

function finish(section, item, size, rel) {
  const tier = tierOf(section, item);
  return {
    id: item.id,
    dzial: section.dir,
    dzialNazwa: section.name,
    rodzina: familyFromPath(rel, item),
    tytul: item.title,
    opis: item.blurb,
    technika: item.technique,
    webgl: item.webgl,
    waga: item.weight,
    minQuality: item.minQuality,
    czasMs: item.durationMs,
    zdarzenieBiblioteka: item.triggers,
    zdarzenieAplikacja: targetEventOf(item, section),
    zaleznosci: item.deps,
    aliasyBiblioteka: item.aliases,
    plik: rel,
    rozmiarB: size,
    tier,
    wysilek: effortOf(section.kind, size, item.deps),
    status: 'do-przeniesienia',
  };
}

/* ---------- renderowanie ---------- */
const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

function renderMd(items, generated) {
  const L = [];
  L.push('# Inwentaryzacja biblioteki efektów');
  L.push('');
  L.push('> **Generowane automatycznie:** `node tools/fx-inventory.mjs` — nie edytuj ręcznie.');
  L.push('> Pole `status` jest zachowywane między przebiegami i służy jako tabela postępu portowania.');
  L.push('> Źródło danych: katalog `jarvis-efekty` (`katalog/`, `zrodla/`), ścieżka z `JARVIS_FX_KIT`.');
  L.push('');
  L.push(`Pozycji: **${items.length}** · wygenerowano ${generated}`);
  L.push('');

  /* podsumowanie */
  L.push('## Podsumowanie');
  L.push('');
  L.push('| Dział | Pozycji | Oczekiwano | T1 | T2 | T3 | T4 | Kod |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const s of SECTIONS) {
    const rows = items.filter(i => i.dzial === s.dir);
    const c = t => rows.filter(r => r.tier === t).length;
    const code = rows.reduce((a, r) => a + (r.rozmiarB > 0 ? 1 : 0), 0);
    L.push(`| \`${s.dir}\` ${s.name} | ${rows.length} | ${s.expect} | ${c('T1')} | ${c('T2')} | ${c('T3')} | ${c('T4')} | ${code} |`);
  }
  L.push(`| **Razem** | **${items.length}** | **441** | ${items.filter(i => i.tier === 'T1').length} | ${items.filter(i => i.tier === 'T2').length} | ${items.filter(i => i.tier === 'T3').length} | ${items.filter(i => i.tier === 'T4').length} | ${items.filter(i => i.rozmiarB > 0).length} |`);
  L.push('');
  const effort = { S: 0, M: 0, L: 0, '—': 0 };
  for (const i of items) effort[i.wysilek] = (effort[i.wysilek] || 0) + 1;
  L.push(`Wysiłek: **${effort.S || 0} × S**, **${effort.M || 0} × M**, **${effort.L || 0} × L**, ${effort['—'] || 0} × bez kodu.`);
  L.push('');
  L.push('| Tier | Znaczenie |');
  L.push('|---|---|');
  L.push('| T1 | Kopiuj 1:1 — zero zależności, zero Reacta |');
  L.push('| T2 | Przepisz przez adapter (silnik efektów, brakujące `engine/`) |');
  L.push('| T3 | Przepisz na WAAPI — dziś React/Motion |');
  L.push('| T4 | Dokumentacja lub demo — nie przenosić |');
  L.push('');
  L.push('| Status | Znaczenie |');
  L.push('|---|---|');
  L.push('| `do-przeniesienia` | Na liście, nie zrobione |');
  L.push('| `przeniesiony` | Skopiowany do `js/fx/` bez zmian |');
  L.push('| `przepisany` | Przepisany (T3 na T1/T2) |');
  L.push('| `pominięty` | Świadomie pominięty z powodem w README |');
  L.push('');

  /* tabela zbiorcza per dział */
  for (const s of SECTIONS) {
    const rows = items.filter(i => i.dzial === s.dir).sort((a, b) => a.id.localeCompare(b.id, 'pl'));
    if (!rows.length) continue;
    L.push(`## \`${s.dir}\` — ${s.name} (${rows.length})`);
    L.push('');
    L.push('| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |');
    L.push('|---|---|---|---|---|---|---:|---|---|---|---|---|');
    for (const r of rows) {
      L.push([
        '',
        `\`${esc(r.id)}\``,
        esc(r.rodzina),
        esc(r.tytul),
        esc(r.technika),
        r.waga || '—',
        r.minQuality || '—',
        r.czasMs || '—',
        r.tier,
        r.wysilek,
        r.zaleznosci.length ? r.zaleznosci.map(d => `\`${d}\``).join(' ') : '—',
        esc(r.zdarzenieAplikacja),
        r.status,
        '',
      ].join(' | ').trim());
    }
    L.push('');
  }

  /* pozycje bez kodu */
  const noCode = items.filter(i => i.rozmiarB === 0);
  if (noCode.length) {
    L.push('## Pozycje bez kodu źródłowego');
    L.push('');
    L.push('Te pozycje to dokumentacja katalogu — nie ma ich czego przenosić. Ich wartość to opis i próbka.');
    L.push('');
    for (const r of noCode.sort((a, b) => a.id.localeCompare(b.id, 'pl'))) {
      L.push(`- \`${r.id}\` — ${esc(r.tytul)} (${esc(r.technika)})`);
    }
    L.push('');
  }
  return L.join('\n');
}

/* ---------- main ---------- */
function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const kitArg = argv.indexOf('--kit');
  const kit = kitArg >= 0 ? argv[kitArg + 1] : KIT;

  if (!exists(kit)) {
    console.error(`Nie znaleziono katalogu biblioteki: ${kit}`);
    console.error('Ustaw JARVIS_FX_KIT albo podaj --kit <ścieżka>.');
    process.exit(2);
  }
  console.log(`Inwentaryzacja biblioteki: ${kit}`);

  let items = collect();
  items.sort((a, b) => a.dzial.localeCompare(b.dzial) || a.id.localeCompare(b.id, 'pl'));

  // 1) faktyczny stan z js/fx/effects/* — ma pierwszeństwo, ale tylko
  //    dla działu, z którego faktycznie pochodzi wygenerowany kod
  const ported = portedIds();
  for (const it of items) {
    if (ported.get(it.dzial)?.has(it.id)) it.status = 'przeniesiony';
  }

  // 2) statusy wymagające decyzji człowieka (pominięty / przepisany)
  //    przenosimy z poprzedniego przebiegu. `przeniesiony` NIE jest
  //    przenoszony — to stan faktyczny wyliczany wyżej, inaczej błędne
  //    oznaczenie zostaje w dokumencie na zawsze.
  if (exists(OUT_JSON)) {
    try {
      const prev = JSON.parse(read(OUT_JSON));
      const map = new Map((prev.items || []).map(i => [i.dzial + '::' + i.id, i.status]));
      for (const it of items) {
        if (it.status === 'przeniesiony') continue;
        const s = map.get(it.dzial + '::' + it.id);
        if (s && s !== 'przeniesiony') it.status = s;
      }
    } catch { /* uszkodzony poprzedni plik — statusy startują od zera */ }
  }

  const generated = new Date().toISOString().slice(0, 10);
  const payload = { generated, kit, total: items.length, items };
  const json = JSON.stringify(payload, null, 2) + '\n';
  const md = renderMd(items, generated);

  if (check) {
    const a = exists(OUT_JSON) ? read(OUT_JSON) : '';
    const b = exists(OUT_MD) ? read(OUT_MD) : '';
    const fresh = a === json && b === md;
    console.log(fresh ? '  dokumenty aktualne' : '  dokumenty NIEAKTUALNE — uruchom: node tools/fx-inventory.mjs');
    process.exit(fresh ? 0 : 1);
  }

  fs.writeFileSync(OUT_JSON, json, 'utf8');
  fs.writeFileSync(OUT_MD, md, 'utf8');
  const byTier = {};
  for (const i of items) byTier[i.tier] = (byTier[i.tier] || 0) + 1;
  console.log(`  → ${path.relative(ROOT, OUT_MD)} (${items.length} pozycji)`);
  console.log(`  → ${path.relative(ROOT, OUT_JSON)}`);
  console.log(`  T1 ${byTier.T1 || 0} · T2 ${byTier.T2 || 0} · T3 ${byTier.T3 || 0} · T4 ${byTier.T4 || 0}`);
  if (items.length !== 441) {
    console.warn(`  UWAGA: ${items.length} pozycji, oczekiwano 441 — sprawdź katalog biblioteki.`);
  }
}

main();
export { SECTIONS, EVENT_MAP, depsOf, field, readmeTable, collect };
