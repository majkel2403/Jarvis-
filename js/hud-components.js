/* =========================================================
   JARVIS OS — komponenty HUD (etap 1: 5 z 20)
   Zasada projektu „nic na niby”: każdy komponent dostaje
   prawdziwe wartości z zewnątrz. Brak wartości (null/NaN)
   = pusty stan „—”, nigdy losowa liczba.
   Czyste funkcje zwracają SVG/HTML jako tekst → testy w Node.
   ========================================================= */
'use strict';
(() => {
const NS = 'http://www.w3.org/2000/svg';
const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = v => (Math.round(v * 10) / 10).toString();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* 1. Pierścień postępu — np. CPU lub RAM w % */
function ring({ value, label = '', tone = 'blue' } = {}) {
  const v = num(value);
  const p = v == null ? 0 : clamp(v, 0, 100);
  const C = 2 * Math.PI * 40;
  const txt = v == null ? '—' : `${Math.round(p)}%`;
  return `<svg class="hc hc-ring hc-${tone}" viewBox="-50 -50 100 100" role="img" aria-label="${esc(label)} ${txt}">` +
    `<circle r="40" class="hc-track" stroke-width="7"/>` +
    (v == null ? '' : `<circle r="40" class="hc-arc" stroke-width="7" stroke-dasharray="${f1(C * p / 100)} ${f1(C)}" transform="rotate(-90)"/>`) +
    `<text y="4" text-anchor="middle" class="hc-val">${txt}</text>` +
    (label ? `<text y="22" text-anchor="middle" class="hc-lbl">${esc(label)}</text>` : '') + `</svg>`;
}

/* 2. Zegar analogowy — z podanej daty (domyślnie teraz) */
function clock(date = new Date()) {
  const d = date instanceof Date && !isNaN(date) ? date : null;
  if (!d) return `<svg class="hc hc-clock" viewBox="-50 -50 100 100"><text y="4" text-anchor="middle" class="hc-val">—</text></svg>`;
  const s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
  const hand = (deg, len, cls) => `<line x1="0" y1="0" x2="0" y2="${-len}" class="${cls}" transform="rotate(${f1(deg)})"/>`;
  let ticks = ''; for (let i = 0; i < 12; i++) ticks += `<line x1="0" y1="-44" x2="0" y2="-40" class="hc-tick" transform="rotate(${i * 30})"/>`;
  return `<svg class="hc hc-clock" viewBox="-50 -50 100 100" role="img" aria-label="Godzina ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}">` +
    `<circle r="46" class="hc-track" stroke-width="1"/>${ticks}` +
    hand(h * 30, 22, 'hc-hour') + hand(m * 6, 34, 'hc-min') + hand(s * 6, 38, 'hc-sec') + `<circle r="2" class="hc-dot"/></svg>`;
}

/* 3. Odliczanie — sekundy z minutnika (null = brak aktywnego minutnika) */
function countdown(seconds) {
  const s = num(seconds);
  if (s == null || s < 0) return `<span class="hc hc-count hc-empty">—</span>`;
  const t = Math.floor(s), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
  const p2 = n => String(n).padStart(2, '0');
  return `<span class="hc hc-count" aria-live="off">${h ? p2(h) + ':' : ''}${p2(m)}:${p2(sec)}</span>`;
}

/* 4. Wykres liniowy — prawdziwa seria (np. wywołania narzędzi na minutę). Null = luka. */
function line(values = [], { w = 200, h = 60, max = null } = {}) {
  const vs = (Array.isArray(values) ? values : []).map(num);
  const ok = vs.filter(v => v != null);
  if (!ok.length) return `<svg class="hc hc-line hc-empty" viewBox="0 0 ${w} ${h}" aria-label="Brak danych"><line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" class="hc-track"/></svg>`;
  const top = max ?? Math.max(1, ...ok);
  const step = vs.length > 1 ? w / (vs.length - 1) : w;
  let d = '', pen = false;
  vs.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${f1(i * step)} ${f1(h - clamp(v / top, 0, 1) * (h - 4) - 2)}`; pen = true;
  });
  return `<svg class="hc hc-line" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Wykres, ostatnia wartość ${f1(ok[ok.length - 1])}">` +
    `<path d="${d}" class="hc-path" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
}

/* 5. EKG / opóźnienie — próbki w ms (null = brak odpowiedzi, linia płaska) */
function ekg(samplesMs = [], { w = 200, h = 50, maxMs = 1000 } = {}) {
  const vs = (Array.isArray(samplesMs) ? samplesMs : []).map(num);
  if (!vs.some(v => v != null)) return `<svg class="hc hc-ekg hc-empty" viewBox="0 0 ${w} ${h}" aria-label="Brak odpowiedzi"><line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" class="hc-track"/></svg>`;
  const step = vs.length > 1 ? w / (vs.length - 1) : w;
  let d = '', pen = false;
  vs.forEach((v, i) => {
    const x = f1(i * step);
    if (v == null) { d += `${pen ? 'L' : 'M'}${x} ${f1(h - 2)}`; pen = false; return; }   // luka = spadek do dołu
    const y = f1(h - 2 - clamp(v / maxMs, 0, 1) * (h - 6));
    d += `${pen ? 'L' : 'M'}${x} ${y}`; pen = true;
  });
  return `<svg class="hc hc-ekg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Opóźnienie, ostatnio ${vs[vs.length - 1] == null ? 'brak' : Math.round(vs[vs.length - 1]) + ' ms'}">` +
    `<path d="${d}" class="hc-path" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
}

/* --- dane: wyciąganie wartości z odpowiedzi mostu (/bridge/system) --- */
const fromSystemSnapshot = snap => {
  const mem = snap && snap.memory;
  return {
    cpu: num(snap && snap.cpu && snap.cpu.percent),
    ram: mem ? num(mem.used_pct) : null,
  };
};
/* bufor ostatnich N próbek (nowe na końcu); null zostaje jako luka */
const pushSample = (buf, v, max = 60) => { const out = (buf || []).concat([num(v)]); return out.length > max ? out.slice(out.length - max) : out; };

const api = { ring, clock, countdown, line, ekg, fromSystemSnapshot, pushSample };
if (typeof window !== 'undefined') { window.J = window.J || {}; window.J.hud = Object.assign(window.J.hud || {}, api); }
if (typeof module !== 'undefined') module.exports = api;
})();
