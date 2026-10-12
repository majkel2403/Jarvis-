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
  return `<svg class="hcm hc-ring hc-${tone}" viewBox="-50 -50 100 100" role="img" aria-label="${esc(label)} ${txt}">` +
    `<circle r="40" class="hc-track" stroke-width="7"/>` +
    (v == null ? '' : `<circle r="40" class="hc-arc" stroke-width="7" stroke-dasharray="${f1(C * p / 100)} ${f1(C)}" transform="rotate(-90)"/>`) +
    `<text y="4" text-anchor="middle" class="hc-val">${txt}</text>` +
    (label ? `<text y="22" text-anchor="middle" class="hc-lbl">${esc(label)}</text>` : '') + `</svg>`;
}

/* 2. Zegar analogowy — z podanej daty (domyślnie teraz) */
function clock(date = new Date()) {
  const d = date instanceof Date && !isNaN(date) ? date : null;
  if (!d) return `<svg class="hcm hc-clock" viewBox="-50 -50 100 100"><text y="4" text-anchor="middle" class="hc-val">—</text></svg>`;
  const s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
  const hand = (deg, len, cls) => `<line x1="0" y1="0" x2="0" y2="${-len}" class="${cls}" transform="rotate(${f1(deg)})"/>`;
  let ticks = ''; for (let i = 0; i < 12; i++) ticks += `<line x1="0" y1="-44" x2="0" y2="-40" class="hc-tick" transform="rotate(${i * 30})"/>`;
  return `<svg class="hcm hc-clock" viewBox="-50 -50 100 100" role="img" aria-label="Godzina ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}">` +
    `<circle r="46" class="hc-track" stroke-width="1"/>${ticks}` +
    hand(h * 30, 22, 'hc-hour') + hand(m * 6, 34, 'hc-min') + hand(s * 6, 38, 'hc-sec') + `<circle r="2" class="hc-dot"/></svg>`;
}

/* 3. Odliczanie — sekundy z minutnika (null = brak aktywnego minutnika) */
function countdown(seconds) {
  const s = num(seconds);
  if (s == null || s < 0) return `<span class="hcm hc-count hc-empty">—</span>`;
  const t = Math.floor(s), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
  const p2 = n => String(n).padStart(2, '0');
  return `<span class="hcm hc-count" aria-live="off">${h ? p2(h) + ':' : ''}${p2(m)}:${p2(sec)}</span>`;
}

/* 4. Wykres liniowy — prawdziwa seria (np. wywołania narzędzi na minutę). Null = luka. */
function line(values = [], { w = 200, h = 60, max = null } = {}) {
  const vs = (Array.isArray(values) ? values : []).map(num);
  const ok = vs.filter(v => v != null);
  if (!ok.length) return `<svg class="hcm hc-line hc-empty" viewBox="0 0 ${w} ${h}" aria-label="Brak danych"><line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" class="hc-track"/></svg>`;
  const top = max ?? Math.max(1, ...ok);
  const step = vs.length > 1 ? w / (vs.length - 1) : w;
  let d = '', pen = false;
  vs.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${f1(i * step)} ${f1(h - clamp(v / top, 0, 1) * (h - 4) - 2)}`; pen = true;
  });
  return `<svg class="hcm hc-line" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Wykres, ostatnia wartość ${f1(ok[ok.length - 1])}">` +
    `<path d="${d}" class="hc-path" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
}

/* 5. EKG / opóźnienie — próbki w ms (null = brak odpowiedzi, linia płaska) */
function ekg(samplesMs = [], { w = 200, h = 50, maxMs = 1000 } = {}) {
  const vs = (Array.isArray(samplesMs) ? samplesMs : []).map(num);
  if (!vs.some(v => v != null)) return `<svg class="hcm hc-ekg hc-empty" viewBox="0 0 ${w} ${h}" aria-label="Brak odpowiedzi"><line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" class="hc-track"/></svg>`;
  const step = vs.length > 1 ? w / (vs.length - 1) : w;
  let d = '', pen = false;
  vs.forEach((v, i) => {
    const x = f1(i * step);
    if (v == null) { d += `${pen ? 'L' : 'M'}${x} ${f1(h - 2)}`; pen = false; return; }   // luka = spadek do dołu
    const y = f1(h - 2 - clamp(v / maxMs, 0, 1) * (h - 6));
    d += `${pen ? 'L' : 'M'}${x} ${y}`; pen = true;
  });
  return `<svg class="hcm hc-ekg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Opóźnienie, ostatnio ${vs[vs.length - 1] == null ? 'brak' : Math.round(vs[vs.length - 1]) + ' ms'}">` +
    `<path d="${d}" class="hc-path" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
}


/* 6. Radar — punkty = prawdziwe zdarzenia (np. wywołania narzędzi); blip = {a: kąt 0–360, r: 0–1} */
function radar(blips = []) {
  const pts = (Array.isArray(blips) ? blips : []).filter(b => num(b.a) != null && num(b.r) != null).slice(-12);
  const dots = pts.map(b => { const a = (b.a - 90) * Math.PI / 180, r = clamp(b.r, 0, 1) * 44; return `<circle cx="${f1(Math.cos(a) * r)}" cy="${f1(Math.sin(a) * r)}" r="2.2" class="hc-blip"/>`; }).join('');
  return `<svg class="hcm hc-radar" viewBox="-50 -50 100 100" role="img" aria-label="Radar, zdarzenia: ${pts.length}">` +
    `<circle r="44" class="hc-track"/><circle r="22" class="hc-track"/><path d="M-44 0H44M0 -44V44" class="hc-track"/>` +
    `<g class="hc-sweep"><path d="M0 0L0 -44A44 44 0 0 1 31 -31Z" class="hc-sweep-fill"/></g>${dots}</svg>`;
}

/* 7. Pasek zagrożeń — poziom 0–3 wyliczany z prawdziwych sygnałów (zgody, błędy) */
function danger({ level = 0, label = '' } = {}) {
  const l = clamp(Math.round(num(level) ?? 0), 0, 3);
  const txt = label || (l === 0 ? 'Brak zagrożeń' : ['', 'Uwaga', 'Ostrzeżenie', 'Alarm'][l]);
  return `<div class="hcm hc-danger hc-l${l}" role="status"><span class="hc-stripes"></span><span class="hc-dtxt">${esc(txt)}</span></div>`;
}

/* 8. Lista parametrów — wiersze {k, v}; v = null → „—” */
function params(rows = []) {
  return `<dl class="hcm hc-params">` + (Array.isArray(rows) ? rows : []).map(r =>
    `<div><dt>${esc(r.k)}</dt><dd>${r.v == null || r.v === '' ? '—' : esc(r.v)}</dd></div>`).join('') + `</dl>`;
}

/* 9. Lista krytycznych zdarzeń — {title, count}; pusta lista = „Brak błędów” */
function critical(items = []) {
  const xs = (Array.isArray(items) ? items : []).filter(i => i && i.title);
  if (!xs.length) return `<div class="hcm hc-crit hc-empty">Brak błędów</div>`;
  return `<ul class="hcm hc-crit">` + xs.map(i => `<li><span>${esc(i.title)}</span><b>${num(i.count) ?? 1}</b></li>`).join('') + `</ul>`;
}

/* 10. Siatka kafelków — intensywność = wartość / maks. (np. użycie poleceń) */
function tiles(counts = [], { cols = 8 } = {}) {
  const vs = (Array.isArray(counts) ? counts : []).map(v => num(v) ?? 0);
  const max = Math.max(0, ...vs);
  if (!vs.length) return `<div class="hcm hc-tiles hc-empty" style="--cols:${cols}"></div>`;
  return `<div class="hcm hc-tiles" style="--cols:${cols}">` + vs.map(v => `<i style="--o:${Math.round((max ? 0.12 + 0.88 * v / max : 0.12) * 100) / 100}"></i>`).join('') + `</div>`;
}

/* 11. Węzły — stan usług {name, state: 'up'|'down'|'unknown'} */
function nodes(list = []) {
  return `<ul class="hcm hc-nodes">` + (Array.isArray(list) ? list : []).map(n => {
    const st = ['up', 'down'].includes(n.state) ? n.state : 'unknown';
    const word = st === 'up' ? 'online' : st === 'down' ? 'błąd' : 'brak danych';
    return `<li class="hc-n-${st}"><i></i><span>${esc(n.name)}</span><b>${word}</b></li>`;
  }).join('') + `</ul>`;
}

/* 12. Pentagon — 5 osi, wartości 0–1 (null = 0 i wykreślone jako pusta oś) */
function pentagon(values = [], labels = []) {
  const vs = [0, 1, 2, 3, 4].map(i => { const v = num(values[i]); return v == null ? null : clamp(v, 0, 1); });
  const pt = (i, r) => { const a = (-90 + i * 72) * Math.PI / 180; return [f1(Math.cos(a) * r), f1(Math.sin(a) * r)]; };
  const ring = k => [0, 1, 2, 3, 4].map(i => pt(i, 44 * k).join(',')).join(' ');
  const poly = [0, 1, 2, 3, 4].map(i => pt(i, 44 * (vs[i] ?? 0)).join(',')).join(' ');
  const lbl = [0, 1, 2, 3, 4].map(i => { const [x, y] = pt(i, 54); return `<text x="${x}" y="${y}" text-anchor="middle" class="hc-lbl">${esc(labels[i] || '')}</text>`; }).join('');
  return `<svg class="hcm hc-pent" viewBox="-60 -60 120 120" role="img" aria-label="Wskaźniki">` +
    [0.33, 0.66, 1].map(k => `<polygon points="${ring(k)}" class="hc-track"/>`).join('') +
    `<polygon points="${poly}" class="hc-poly"/>${lbl}</svg>`;
}

/* 13. Słupki — wartości 0–max, null = pusty słupek */
function bars(values = [], labels = []) {
  const vs = (Array.isArray(values) ? values : []).map(num);
  const max = Math.max(1, ...vs.filter(v => v != null));
  return `<div class="hcm hc-bars">` + vs.map((v, i) => `<div class="hc-bar" title="${esc(labels[i] || '')}"><i style="height:${f1(v == null ? 0 : clamp(v / max, 0, 1) * 100)}%"></i><span>${esc(labels[i] || '')}</span></div>`).join('') + `</div>`;
}

/* 14–16. Ozdoby bez danych — czysto dekoracyjne, bez liczb, ukryte przed czytnikami ekranu */
const deco = (name, body) => `<svg class="hcm hc-deco hc-${name}" viewBox="-50 -50 100 100" aria-hidden="true">${body}</svg>`;
function dotmap() {
  let d = ''; for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) if (((x * 7 + y * 3) % 5) < 3) d += `<circle cx="${-46 + x * 6}" cy="${-42 + y * 12}" r="1.4"/>`;
  return deco('dotmap', d);
}
function globe() {
  return deco('globe', `<circle r="40" class="hc-track"/><ellipse rx="40" ry="14" class="hc-track"/><ellipse rx="16" ry="40" class="hc-track"/><path d="M-40 0H40" class="hc-track"/>`);
}
function compass() {
  return deco('compass', `<circle r="44" class="hc-track"/><path d="M0 -44L5 0L0 44L-5 0Z" class="hc-needle"/><circle r="2" class="hc-dot"/>`);
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

const api = { ring, clock, countdown, line, ekg, radar, danger, params, critical, tiles, nodes, pentagon, bars, dotmap, globe, compass, fromSystemSnapshot, pushSample };
if (typeof window !== 'undefined') { window.J = window.J || {}; window.J.hud = Object.assign(window.J.hud || {}, api); }
if (typeof module !== 'undefined') module.exports = api;
})();
