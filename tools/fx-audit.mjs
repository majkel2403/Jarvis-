#!/usr/bin/env node
/* =========================================================
   JARVIS OS — audyt warstwy efektów (Playwright)

   Odpowiada na pytania, których nie da się sprawdzić w node --test:
     1) Czy każdy z 64 efektów w ogóle COŚ rysuje?          → warstwa ma dzieci
     2) Czy scena wraca do stanu bazowego po efekcie?      → porównanie stylów
     3) Czy konsola jest czysta?                            → błędy i ostrzeżenia
     4) Czy nic nie zostaje w DOM po efekcie?               → #fxlayer pusta

   Zrzuty idą do docs/fx-shots/ jako arkusz do oglądania; automatycznie
   wykrywamy tylko kandydatów na duplikaty (identyczne bajty = to samo
   widokowo), bo pełna analiza różnicy wymagałaby dekodera PNG, a projekt
   ma zakaz nowych zależności.

   Użycie:
     node tools/fx-audit.mjs [--url http://localhost:4000/] [--out docs/fx-shots]
                              [--only orb.supernova,orb.sonar] [--no-shots]
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const URL_ = arg('--url', 'http://localhost:4000/');
const OUT = path.join(ROOT, arg('--out', 'docs/fx-shots'));
const ONLY = arg('--only', '') ? arg('--only', '').split(',').map(s => s.trim()) : null;
const NO_SHOTS = argv.includes('--no-shots');

/* Elementy, których styl porównujemy przed i po efekcie.
   To one, na które efekty scenowe liczą: filtr, transform, opacity. */
const SCENE_SEL = ['#app', '#app .core-wrap', '#app .chat-panel', '#app .log-panel', '#app .deck', '#app .dock'];

const styleProbe = sel => {
  const out = {};
  for (const s of sel) {
    const el = document.querySelector(s);
    if (!el) { out[s] = null; continue; }
    const cs = getComputedStyle(el);
    out[s] = [cs.filter, cs.transform, cs.opacity, cs.backdropFilter, cs.mixBlendMode].join('|');
  }
  return out;
};

const sha = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

async function main() {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch {
    console.error('Brak Playwrighta. Instalacja (jednorazowa, poza projektem):');
    console.error('  npm i -D playwright && npx playwright install chromium');
    process.exit(2);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  const consoleErrors = { fx: [], bridge: [] };
  const pageErrors = [];
  /* Błędy CORS do mostu Hermesa (127.0.0.1:8651) są stanem wyjściowym środowiska,
     nie warstwy efektów — most bywa wyłączony. Liczymy je osobno, żeby nie
     zamaskować prawdziwych błędów i nie karać efektów za cudzy problem. */
  const isBridgeNoise = t => /127\.0\.0\.1:8651|\/bridge\/(wake|events)|net::ERR_FAILED/.test(t);
  page.on('console', m => {
    if (m.type() !== 'error') return;
    (isBridgeNoise(m.text()) ? consoleErrors.bridge : consoleErrors.fx).push(m.text());
  });
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));

  console.log(`Otwieram ${URL_}`);
  await page.addInitScript(() => {
    // Boot jest interaktywny: przy S.skipBoot czeka na kliknięcie lub Enter.
    // W audycie nie ma użytkownika, więc wymuszamy zakończenie od razu.
    try {
      const raw = localStorage.getItem('jarvis-os:v2');
      const s = raw ? JSON.parse(raw) : {};
      s.settings = Object.assign({}, s.settings, { skipBoot: true });
      localStorage.setItem('jarvis-os:v2', JSON.stringify(s));
    } catch { /* brak zapisanych ustawień — zostanie boot sekwencyjny */ }
  });
  await page.goto(URL_, { waitUntil: 'load' });

  /* Czekamy na warstwę i przejście bootu (klasa .on na #app). */
  await page.waitForFunction(() => window.__jarvisOsFx && document.getElementById('app')?.classList.contains('on'), null, { timeout: 20000 })
    .catch(async () => {
      /* sekwencyjny boot kończy się sam, ale bywa wolny — przyspieszamy go kliknięciem */
      await page.locator('#boot').click({ position: { x: 10, y: 10 }, timeout: 5000 }).catch(() => { });
      await page.keyboard.press('Enter').catch(() => { });
      await page.waitForFunction(() => document.getElementById('app')?.classList.contains('on'), null, { timeout: 20000 });
    });
  /* Overlay znika po 1 s — efekty kotwiczą się do widocznego pulpitu. */
  await page.waitForTimeout(1200);

  /* Baseline MUSI być mierzony na spokojnej scenie. Sekwencja bootowa
     (`hud.boot-sequence`) trwa ok. 3 s i trzęsie #app transformem — pomiar
     w jej trakcie dawałby „dryf” przy każdym efekcie, choć scena wracała
     do stanu początkowego. Czekamy, aż warstwa faktycznie opadnie. */
  await page.waitForFunction(
    () => window.__jarvisOsFx && window.__jarvisOsFx.activeCount === 0 && document.getElementById('fxlayer').children.length === 0,
    null, { timeout: 15000 }
  ).catch(() => console.warn('  uwaga: warstwa nie opadła w 15 s — baseline może być niedokładny'));
  await page.waitForTimeout(400);

  const all = await page.evaluate(() => window.__jarvisOsFx.list().map(f => ({ id: f.id, durationMs: f.durationMs, weight: f.weight, title: f.title })));
  console.log(`Rejestr: ${all.length} efektów`);
  const list = ONLY ? all.filter(f => ONLY.includes(f.id)) : all;
  if (!list.length) { console.error('Żaden efekt nie pasuje do --only'); process.exit(2); }

  const baselineStyle = await page.evaluate(styleProbe, SCENE_SEL);
  const baselineShot = NO_SHOTS ? null : await page.screenshot();
  const baselineHash = baselineShot ? sha(baselineShot) : null;

  const report = { when: new Date().toISOString(), url: URL_, results: [], duplicates: [] };
  const byHash = new Map();

  for (const fx of list) {
    const before = consoleErrors.fx.length, beforeErr = pageErrors.length;
    const drew = await page.evaluate(id => {
      window.__jarvisOsFx.stopAll();
      const ok = window.__jarvisOsFx.play(id);
      return { ok, children: document.getElementById('fxlayer').children.length };
    }, fx.id);

    /* Klatka w połowie efektu — tu powinno być co widać. */
    await page.waitForTimeout(Math.max(120, Math.round(fx.durationMs * 0.4)));
    const mid = NO_SHOTS ? null : await page.screenshot();
    const midHash = mid ? sha(mid) : null;
    if (midHash) {
      if (byHash.has(midHash)) report.duplicates.push({ a: byHash.get(midHash), b: fx.id });
      else byHash.set(midHash, fx.id);
    }
    if (!NO_SHOTS) fs.writeFileSync(path.join(OUT, `${fx.id.replace(/[^\w.-]/g, '_')}__mid.png`), mid);

    /* Efekt musi zniknąć sam, bez interwencji. */
    await page.waitForTimeout(fx.durationMs + 700);
    const after = await page.evaluate(styleProbe, SCENE_SEL);
    const residue = await page.evaluate(() => document.getElementById('fxlayer').children.length);

    const changed = Object.keys(baselineStyle).filter(k => baselineStyle[k] !== after[k]);
    const afterShot = NO_SHOTS ? null : await page.screenshot();

    const r = {
      id: fx.id,
      started: drew.ok,
      drewSomething: drew.children > 0,
      visibleDiffersFromBaseline: midHash ? midHash !== baselineHash : null,
      residueInLayer: residue,
      styleDrift: changed,
      consoleErrors: consoleErrors.fx.length - before,
      pageErrors: pageErrors.length - beforeErr,
      looksIdenticalToBaseline: afterShot ? sha(afterShot) === baselineHash : null,
    };
    report.results.push(r);

    if (!NO_SHOTS) fs.writeFileSync(path.join(OUT, `${fx.id.replace(/[^\w.-]/g, '_')}__after.png`), afterShot);
  }

  await browser.close();

  /* ---- raport ---- */
  const bad = report.results.filter(r =>
    !r.started || !r.drewSomething || r.residueInLayer > 0 || r.styleDrift.length || r.consoleErrors || r.pageErrors);
  const invisible = report.results.filter(r => r.visibleDiffersFromBaseline === false).map(r => r.id);

  console.log('');
  console.log(`Sprawdzono:        ${report.results.length}`);
  console.log(`Nie odtworzyły się: ${report.results.filter(r => !r.started).length}`);
  console.log(`Nic nie narysowały:  ${report.results.filter(r => !r.drewSomething).length}`);
  console.log(`Niewidoczne:         ${invisible.length}${invisible.length ? ' → ' + invisible.join(', ') : ''}`);
  console.log(`Resztki w warstwie:  ${report.results.filter(r => r.residueInLayer > 0).length}`);
  console.log(`Dryf stylów:         ${report.results.filter(r => r.styleDrift.length).length}`);
  console.log(`Błędy konsoli (fx):   ${consoleErrors.fx.length}`);
  console.log(`Błędy mostu (obce):   ${consoleErrors.bridge.length} (stan wyjściowy, pomijane)`);
  console.log(`Wyjątki strony:      ${pageErrors.length}`);
  console.log(`Kandydaci na duplikaty: ${report.duplicates.length}${report.duplicates.length ? ' → ' + report.duplicates.slice(0, 8).map(d => `${d.a}≈${d.b}`).join(', ') : ''}`);

  if (bad.length) {
    console.log('\nDo poprawy:');
    for (const r of bad) {
      const why = [];
      if (!r.started) why.push('nie wystartował');
      if (!r.drewSomething) why.push('pusty korzeń');
      if (r.residueInLayer) why.push(`resztka: ${r.residueInLayer} węzłów`);
      if (r.styleDrift.length) why.push(`dryf: ${r.styleDrift.join(',')}`);
      if (r.consoleErrors) why.push(`konsola: ${r.consoleErrors}`);
      if (r.pageErrors) why.push(`wyjątek: ${r.pageErrors}`);
      console.log(`  ${r.id.padEnd(24)} ${why.join(' | ')}`);
    }
  }
  if (consoleErrors.fx.length) {
    console.log('\nBłędy konsoli warstwy FX (pierwsze 10):');
    consoleErrors.fx.slice(0, 10).forEach(e => console.log('  ' + e.slice(0, 160)));
  }
  if (pageErrors.length) {
    console.log('\nWyjątki (pierwsze 10):');
    pageErrors.slice(0, 10).forEach(e => console.log('  ' + e.slice(0, 160)));
  }

  fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify({ ...report, bridgeErrors: consoleErrors.bridge.length }, null, 2) + '\n');
  console.log(`\nRaport: ${path.relative(ROOT, path.join(OUT, 'audit.json'))}`);
  process.exit(bad.length || consoleErrors.fx.length || pageErrors.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
