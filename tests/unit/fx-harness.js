/* Harness testów warstwy efektów (js/fx/*).
   Ładuje runtime biblioteki i naszą warstwę w `vm` z minimalną atrapą DOM
   i Canvas 2D. getContext('webgl2') zwraca null — tak jak na maszynie bez
   WebGL2, żeby testy sprawdzały też ścieżkę awaryjną.

   Efekty NIE są ładowane przez tests/harness.js: potrzebują DOM, a główny
   harness celowo go nie ma. Tu dostają własny, wystarczający do 64 efektów. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');

/* ---- Canvas 2D: komplet metod, do których sięgają efekty ---- */
function ctx2d(canvas) {
  const c = {
    canvas,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    globalCompositeOperation: 'source-over', filter: 'none', font: '10px sans-serif',
    textAlign: 'left', textBaseline: 'alphabetic', lineCap: 'butt', lineJoin: 'miter', shadowBlur: 0,
    lineDashOffset: 0, miterLimit: 10, imageSmoothingEnabled: true,
  };
  const noop = () => { };
  for (const m of ['save', 'restore', 'scale', 'rotate', 'translate', 'transform', 'setTransform',
    'resetTransform', 'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'closePath', 'moveTo',
    'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect',
    'fill', 'stroke', 'clip', 'drawImage', 'fillText', 'strokeText', 'setLineDash', 'reset',
    'putImageData', 'drawFocusIfNeeded', 'resetTransform']) c[m] = noop;
  c.createLinearGradient = () => ({ addColorStop: noop });
  c.createRadialGradient = () => ({ addColorStop: noop });
  c.createPattern = () => null;
  /* Efekty „light-leak" i „vhs" liczą piksele — bez tego wywracają się. */
  c.createImageData = (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
  c.measureText = t => ({ width: String(t).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
  c.getImageData = (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
  c.isPointInPath = () => false;
  return c;
}

/* ---- Element atrapowy ---- */
function mkEl(tag = 'div', rect = null) {
  const el = {
    tagName: String(tag).toUpperCase(), children: [], style: { setProperty(k, v) { this[k] = v; } },
    dataset: {}, attributes: {}, textContent: '', innerHTML: '', value: '', hidden: false,
    offsetWidth: 300, offsetHeight: 200, clientWidth: 1400, clientHeight: 800,
    parentElement: null, animations: [],
  };
  const cls = new Set();
  el.classList = {
    add: (...a) => a.forEach(c => cls.add(c)), remove: (...a) => a.forEach(c => cls.delete(c)),
    toggle: (c, f) => { (f === undefined ? !cls.has(c) : f) ? cls.add(c) : cls.delete(c); return cls.has(c); },
    contains: c => cls.has(c),
  };
  Object.defineProperty(el, 'className', {
    get: () => [...cls].join(' '),
    set: v => { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => cls.add(c)); },
  });
  el.setAttribute = (k, v) => { el.attributes[k] = v; if (k === 'id') el.id = v; };
  el.getAttribute = k => el.attributes[k];
  el.removeAttribute = k => { delete el.attributes[k]; };
  el.hasAttribute = k => k in el.attributes;
  el.appendChild = c => { el.children.push(c); c.parentElement = el; return c; };
  el.append = (...c) => c.forEach(x => el.appendChild(x));
  el.insertBefore = c => el.appendChild(c);
  el.prepend = el.appendChild;
  el.remove = () => { const p = el.parentElement; if (p) p.children = p.children.filter(x => x !== el); el.parentElement = null; };
  el.removeChild = el.remove;
  el.replaceChildren = () => { el.children = []; };
  el.querySelector = () => null;
  el.querySelectorAll = () => [];
  el.closest = () => null;
  el.contains = n => n === el || el.children.some(c => c.contains && c.contains(n));
  el.focus = el.blur = el.click = el.select = noop0;
  el.addEventListener = () => { }; el.removeEventListener = () => { }; el.dispatchEvent = () => { };
  el.getBoundingClientRect = () => rect || { left: 0, top: 0, width: 1400, height: 800, right: 1400, bottom: 800 };
  el.getClientRects = () => [el.getBoundingClientRect()];
  el.getContext = kind => (String(kind).includes('webgl') ? null : ctx2d(el));
  el.insertAdjacentHTML = () => { };
  el.firstElementChild = null; el.lastElementChild = null;
  /* WAAPI — efekty animują style przez element.animate(); wystarczy wierny kształt */
  el.animate = (frames, opts) => {
    const a = { frames, opts, currentTime: 0, playState: 'running', onfinish: null, cancel() { this.playState = 'idle'; }, finish() { this.playState = 'finished'; } };
    el.animations.push(a);
    return a;
  };
  /* SVGGeometryElement — „trophy" i „boot-sequence" mierzą długość ścieżki. */
  if (['path', 'line', 'rect', 'circle', 'polygon'].includes(String(tag).toLowerCase())) {
    el.getTotalLength = () => 100;
    el.getPointAtLength = f => ({ x: f, y: 0 });
  }
  el.querySelectorAll = sel => (sel === 'path' ? [Object.assign(mkEl('path'), { getTotalLength: () => 100, getPointAtLength: f => ({ x: f, y: 0 }) })] : []);
  el.querySelector = sel => el.querySelectorAll(sel)[0] || null;
  return el;
}
const noop0 = () => { };

/* ---- minimalna klasa HTMLElement (index.js używa `instanceof HTMLElement`) ---- */
class FakeHTMLElement { }
Object.setPrototypeOf(mkEl('div'), FakeHTMLElement.prototype);

/**
 * Buduje kontekst i ładuje warstwę efektów.
 * @param {object} opts
 *   rank     – wartość J.fx.rank() (0..3), domyślnie 2
 *   reduced  – czy prefers-reduced-motion
 *   noEffects – nie ładuj js/fx/effects/* (testy samego rejestru)
 */
function loadFx(opts = {}) {
  const ctx = {};
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  for (const k of ['console', 'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
    'RegExp', 'Error', 'Map', 'Set', 'Promise', 'Symbol', 'Intl', 'URL', 'URLSearchParams',
    'AbortController', 'Proxy', 'Reflect', 'Uint8Array', 'Float32Array', 'Uint8ClampedArray',
    'TextDecoder', 'TextEncoder', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'structuredClone']) ctx[k] = globalThis[k];
  ctx.performance = performance;
  ctx.queueMicrotask = queueMicrotask;
  ctx.setTimeout = (fn, ms, ...a) => { const t = setTimeout(fn, ms, ...a); t.unref?.(); return t; };
  ctx.clearTimeout = clearTimeout;
  ctx.setInterval = () => 0; ctx.clearInterval = () => { };
  /* Klatki sterowane ręcznie: testy nie chcą czekać na prawdziwy rAF.
     Zegar jest monotoniczny MIĘDZY wywołaniami advance() — efekty biblioteki
     mierzą czas ścienny przez performance.now(), więc sam licznik klatek
     by wystarczył, a tu dodajemy też realny czas dla czytelności błędów. */
  const frames = [];
  let clock = 0;
  ctx.requestAnimationFrame = fn => { frames.push(fn); return frames.length; };
  ctx.cancelAnimationFrame = () => { };
  ctx.advance = (n = 1, step = 16.667) => {
    for (let i = 0; i < n; i++) {
      clock += step;
      const batch = frames.splice(0, frames.length);
      batch.forEach(fn => fn(clock));
    }
  };
  /* Ile klatek czeka w kolejce — pozwala testom pilnować, że warstwa
     efektów nie dokłada własnej pętli do pętli głównej aplikacji. */
  ctx.__pendingFrames = () => frames.length;
  ctx.innerWidth = 1400; ctx.innerHeight = 800; ctx.devicePixelRatio = 1;
  ctx.addEventListener = () => { }; ctx.removeEventListener = () => { };
  ctx.navigator = { onLine: true, userAgent: 'node' };
  ctx.localStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { } };
  ctx.matchMedia = () => ({ matches: !!opts.reduced, addEventListener() { }, removeEventListener() { } });
  ctx.HTMLElement = FakeHTMLElement;

  /* Drzewo: body → #app (z kotwicami) + #fxlayer (rodzeństwo, jak w index.html) */
  const html = mkEl('html');
  const body = mkEl('body');
  const app = mkEl('main', { left: 0, top: 0, width: 1400, height: 800, right: 1400, bottom: 800 });
  app.id = 'app'; app.className = 'app';
  const layer = mkEl('div', { left: 0, top: 0, width: 1400, height: 800, right: 1400, bottom: 800 });
  layer.id = 'fxlayer';
  body.appendChild(app); body.appendChild(layer);
  const byId = { app, fxlayer: layer };
  const mk = (id, sel, r) => { const e = mkEl('div', r); e.id = id; if (sel) e.className = sel; byId[id] = e; app.appendChild(e); return e; };
  mk('coreWrap', 'core-wrap', { left: 700, top: 336, width: 320, height: 320, right: 1020, bottom: 656 });
  mk('chatPanel', 'chat-panel', { left: 24, top: 120, width: 420, height: 520, right: 444, bottom: 640 });
  mk('logPanel', 'log-panel', { left: 980, top: 120, width: 396, height: 520, right: 1376, bottom: 640 });
  mk('deck', 'deck', { left: 60, top: 660, width: 1280, height: 120, right: 1340, bottom: 780 });
  mk('dock', 'dock', { left: 620, top: 700, width: 160, height: 80, right: 780, bottom: 780 });

  const document = Object.assign(mkEl('html'), {
    hidden: false, activeElement: null, documentElement: html, body,
    createElement: mkEl,
    /* Glitch i HUD używają SVG filtrów (feTurbulence, feColorMatrix) —
       bez tego createElementNS całe dwie rodziny efektów wywracają się
       w atrapie, choć w przeglądarce działają. */
    createElementNS: (ns, tag) => {
      const e = mkEl(tag);
      e.namespaceURI = ns;
      e.setAttribute('viewBox', '');
      return e;
    },
    createTextNode: t => ({ textContent: t }),
    fullscreenElement: null, visibilityState: 'visible',
    getElementById: id => byId[id] || null,
    querySelector: sel => {
      if (sel === '#fxlayer') return layer;
      if (sel === '#app') return app;
      const m = /^#([\w-]+)$/.exec(sel);
      if (m && byId[m[1]] && byId[m[1]] !== html) return byId[m[1]];
      const cm = /^\.([\w-]+)(?:#([\w-]+))?$/.exec(sel);
      if (cm) {
        for (const e of Object.values(byId)) if (e !== html && e.classList.contains(cm[1])) return e;
      }
      return null;
    },
    querySelectorAll: sel => {
      if (sel === '.window') return new Array(ctx.__windows || 0).fill(mkEl('div', null));
      const out = [];
      const walk = n => { for (const c of n.children) { if (c.classList && sel === '.' + c.className.split(' ')[0]) out.push(c); walk(c); } };
      walk(app); walk(body);
      return out;
    },
  });
  ctx.document = document;
  vm.createContext(ctx);

  /* J + podstawowe API, których oczekuje warstwa.
     `rank()` odwzorowuje prawdziwą logikę z js/main.js:88 — przy
     prefers-reduced-motion aplikacja zawsze zwraca 0, niezależnie od
     ustawienia użytkownika. */
  ctx.J = { fx: { LEVELS: ['off', 'tool', 'standard', 'cinema'], rank: () => (opts.reduced ? 0 : (opts.rank ?? 2)) } };
  ctx.J.log = (area, msg) => { ctx.__logs.push({ area, msg }); };
  ctx.__logs = [];
  ctx.J.notes = { live: () => ctx.__notes };
  ctx.J.tasks = { live: () => ctx.__tasks };
  ctx.__notes = [...(opts.notes || [])];
  ctx.__tasks = [...(opts.tasks || [])];
  /* Liczba otwartych okien w momencie instalacji powiązań. Adapter okien
     porównuje liczbę z poprzednim odczytem, więc stan początkowy musi być
     podany z góry — inaczej pierwsze zdarzenie wygląda jak „wzrost”. */
  ctx.__windows = opts.windows || 0;
  ctx.J.ev = (() => {
    const bus = {};
    return {
      emit(t, p) { (bus[t] || []).forEach(f => f({ type: t, payload: p })); },
      on(t, f) { (bus[t] = bus[t] || []).push(f); return () => { bus[t] = bus[t].filter(x => x !== f); }; },
    };
  })();
  const uiBus = {};
  ctx.J.on = (ev, fn) => { (uiBus[ev] = uiBus[ev] || []).push(fn); return () => { uiBus[ev] = uiBus[ev].filter(x => x !== fn); }; };
  ctx.J.emit = (ev, d) => (uiBus[ev] || []).forEach(f => { try { f(d); } catch (e) { ctx.__errors.push(e); } });
  ctx.__errors = [];

  /* Kolejność jak w index.html */
  const files = ['fx/draw.js', 'fx/palettes.js', 'fx/runtime.js', 'fx/quality.js', 'fx/targets.js', 'fx/clock.js'];
  if (!opts.noEffects) {
    files.push(...fs.readdirSync(path.join(ROOT, 'js', 'fx', 'effects')).sort().map(f => `fx/effects/${f}`));
  }
  files.push('fx/index.js', 'fx/bindings.js');
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });

  ctx.__ctx = ctx;
  return ctx;
}

module.exports = { loadFx, mkEl, ctx2d };
