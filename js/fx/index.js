/* =========================================================
   JARVIS OS — warstwa efektów: rejestr i API (J.fxLayer)

   UWAGA NA NAZWĘ: `J.fx` w tej aplikacji to **już** system poziomów jakości
   (js/main.js:86 — `rank()`, `level()`, `lower()`, `orbits()`, `ghost()`).
   Nie nadpisujemy go. Warstwa efektów mieszka pod `J.fxLayer`, a kontrakt
   biblioteki (`window.__jarvisOsFx`) jest wystawiony obok, żeby instrukcje
   z README efektów działały bez zmian.

   Kontrakt publiczny:
     J.fxLayer.play(id, opts)  → boolean
     J.fxLayer.stopAll()
     J.fxLayer.list()          → [{ id, durationMs, family, weight, title }]
     J.fxLayer.activeCount
     window.__jarvisOsFx       → to samo API (konsola, skrypty audytu)

   Wagi (z biblioteki):
     hero   — wyłączny, wypiera poprzednie hero
     accent — nakłada się
     micro  — częste zdarzenia, throttling w bindings.js

   Maksymalnie 4 efekty równolegle (jak w oryginale). Wyższa waga
   wypycha najstarszą.
   ========================================================= */
'use strict';
(() => {

const { runSignature } = J.fxRt;
const { getQuality, enabled } = J.fxQuality;
const targets = J.fxTargets;

const MAX_ACTIVE = 4;
const LAYER_ID = 'fxlayer';

/* ---------- rejestr ---------- */
const ALL = [];
function buildRegistry() {
  ALL.length = 0;
  const groups = J.fxEffects || {};
  for (const family of Object.keys(groups).sort()) {
    for (const fx of groups[family]) {
      if (fx && fx.id && typeof fx.run === 'function') ALL.push(fx);
    }
  }
  ALL.sort((a, b) => a.id.localeCompare(b.id, 'pl'));
  return ALL;
}
const byId = new Map();
function reindex() { byId.clear(); for (const fx of ALL) byId.set(fx.id, fx); }
const getFx = id => byId.get(id);

/* ---------- warstwa DOM ---------- */
function layer() {
  let el = document.getElementById(LAYER_ID);
  if (!el) {
    // Zwykle warstwa jest w index.html (D7: rodzeństwo #app, nie dziecko).
    // Tworzymy ją awaryjnie, np. przy testach w izolowanym DOM.
    el = document.createElement('div');
    el.id = LAYER_ID;
    el.setAttribute('aria-hidden', 'true');
    (document.getElementById('app')?.parentElement || document.body).appendChild(el);
  }
  return el;
}

/* ---------- środowisko dla runtime'u ---------- */
const pointer = { x: 0, y: 0 };
const pointerSubs = new Set();
let lastPointerAt = 0;

function rectOf(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return undefined;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return undefined;
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function anchors() {
  const lay = layer();
  const W = lay.clientWidth || innerWidth;
  const H = lay.clientHeight || innerHeight;
  const lr = lay.getBoundingClientRect();
  const rel = r => (r ? { x: r.x - lr.left, y: r.y - lr.top, w: r.w, h: r.h } : undefined);

  const orbRect = rectOf(targets.get('orb'));
  const orb = orbRect
    ? { x: orbRect.x - lr.left + orbRect.w / 2, y: orbRect.y - lr.top + orbRect.h / 2, r: Math.max(28, Math.min(orbRect.w, orbRect.h) * 0.36) }
    : { x: W / 2, y: H * 0.42, r: Math.min(W, H) * 0.12 };

  return {
    orb,
    pointer: { x: pointer.x, y: pointer.y },
    widget: rel(rectOf(targets.get('panel:widget'))),
    chat: rel(rectOf(targets.get('panel:chat'))),
    log: rel(rectOf(targets.get('panel:log'))),
    dock: rel(rectOf(targets.get('dock'))),
    waterY: H * 0.62,
  };
}

/** Warstwy sceny: wszystko na pulpicie poza samą warstwą FX. */
function scene() {
  const lay = layer();
  const parent = lay.parentElement;
  if (!parent) return [];
  return Array.from(parent.children).filter(el =>
    el instanceof HTMLElement && el !== lay && !el.hasAttribute('data-fx-exclude'));
}

function element(name) {
  if (name === 'dock') return targets.get('dock');
  if (name === 'orb') return targets.get('orb');
  return targets.get('panel:' + name);
}

const env = {
  get layer() { return layer(); },
  scene,
  anchors,
  element,
  get quality() { return getQuality(); },
  subscribePointer(fn) {
    pointerSubs.add(fn);
    return () => pointerSubs.delete(fn);
  },
};

/* ---------- aktywne efekty ---------- */
let active = [];   // { id, weight, stop }

function stopEntry(entry) {
  active = active.filter(a => a !== entry);
  try { entry.stop(); } catch (e) { console.error('[fx]', e); }
}

function play(id, opts) {
  if (!enabled()) return false;
  const fx = getFx(id);
  if (!fx) return false;

  if (fx.weight === 'hero') active.filter(a => a.weight === 'hero').forEach(stopEntry);
  active.filter(a => a.id === id).forEach(stopEntry);
  while (active.length >= MAX_ACTIVE) stopEntry(active[0]);

  const entry = { id, weight: fx.weight, stop: () => {} };
  active.push(entry);
  entry.stop = runSignature(env, fx, opts || {}, () => {
    active = active.filter(a => a !== entry);
  });
  return true;
}

function stopAll() { [...active].forEach(stopEntry); }

/** Buduje rejestr, jeśli jeszcze nie istnieje — nie wymaga warstwy DOM. */
function ensureRegistry() {
  if (!ALL.length) { buildRegistry(); reindex(); }
  return ALL.length;
}

function list() {
  ensureRegistry();
  return ALL.map(f => ({ id: f.id, durationMs: f.durationMs, family: f.family, weight: f.weight, title: f.title, blurb: f.blurb }));
}

/* ---------- kursor ---------- */
function onPointerMove(e) {
  const lay = layer();
  const r = lay.getBoundingClientRect();
  pointer.x = e.clientX - r.left;
  pointer.y = e.clientY - r.top;
  lastPointerAt = performance.now();
  pointerSubs.forEach(fn => { try { fn(pointer); } catch (err) { console.error('[fx:pointer]', err); } });
}

/* ---------- inicjalizacja (leniwa i idempotentna) ---------- */
let bound = false;
function ensure() {
  if (bound) return true;
  if (!ensureRegistry()) return false;
  const lay = layer();
  if (!lay) return false;
  addEventListener('pointermove', onPointerMove, { passive: true });
  J.fxClock.subscribe(() => { lastPointerAt = performance.now(); });
  // Powiązania zdarzeń instalujemy dopiero teraz — do tego momentu J.on
  // i J.ev muszą już istnieć w swojej docelowej postaci.
  try { J.fxBindings?.install?.(); } catch (e) { console.error('[fx:bindings]', e); }
  bound = true;
  return true;
}

/* API wystawiamy od razu (przed warstwą), żeby wywołania nie wywalały się
   na `J.fxLayer` undefined; rejestr dobudowujemy przy pierwszym użyciu. */
J.fxLayer = {
  play(id, opts) { return ensure() ? play(id, opts) : false; },
  stopAll,
  list,
  get activeCount() { return active.length; },
  get ready() { return bound; },
  /** Wywoływane raz na klatkę z pętli głównej (js/main.js). */
  frame: (now) => { if (bound) J.fxClock.frame(now); },
  /** Ręczne dopychanie rejestru — na wypadek ładowania skryptów po warstwie. */
  refresh() { buildRegistry(); reindex(); return ALL.length; },
  /* Kursor ostatnio widziany — przydatne dla testów i diagnostyki. */
  get pointerIdleFor() { return lastPointerAt ? performance.now() - lastPointerAt : Infinity; },
};

// Kontrakt biblioteki: instrukcje w README efektów mówią o window.__jarvisOsFx.
window.__jarvisOsFx = J.fxLayer;

})();
