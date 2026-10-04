/* =========================================================
   JARVIS OS — tryb kinowy workflow (J.workflows.cinema): przebieg jak scena z filmu, na cały ekran.
   Kamera 3D leci między krokami ułożonymi w konstelację (gwiazdy z paralaksą i smugami przy szybkim locie,
   mgławice, głębia ostrości), plansze aktów, uderzenie przy ukończeniu (błysk, fala, wstrząs, iskry, flara
   anamorficzna), hologram z wynikiem kroku, glitch „korekta kursu” przy poprawce, alarm przy porażce,
   finał z odjazdem kamery, napisy końcowe i „KONIEC”. Pasy kinowe, ziarno, winieta, HUD (REC, kod czasowy),
   napisy lektora (i głos, gdy mowa jest włączona). Ścieżka dźwiękowa syntezowana na żywo (Web Audio).
   Dwa tryby: na żywo (zdarzenia mostu) albo film z zapisu zdarzeń (~1,5 min). Ruch wg J.fx: 0 = cięcia, bez lotów.
   ========================================================= */
'use strict';
(() => {
const WF = J.workflows;
if (!WF?.ui) return;
const { renderArt, KIND_IC, KIND_PL, fxRank, ACTIVE, fmtS, blank, api, clock, typeText } = WF.ui;
const h = J.h, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- czyste pomocnicze (testy: WF.cinema._t) ---------- */
const GAP = 520, MEAN_Z = 1400;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const ORD = ['pierwszy', 'drugi', 'trzeci', 'czwarty', 'piąty', 'szósty', 'siódmy', 'ósmy', 'dziewiąty', 'dziesiąty', 'jedenasty', 'dwunasty'];
const roman = n => ROMAN[n - 1] || String(n);
/* kod czasowy jak na planie: GG:MM:SS:KK (24 klatki na sekundę) */
const timecode = s => { s = Math.max(0, s || 0); const t = Math.floor(s); return [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60, Math.floor((s - t) * 24)].map(x => String(x).padStart(2, '0')).join(':'); };
/* konstelacja kroków w świecie 3D: kręta ścieżka w głąb */
const layout = n => Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * GAP, y: Math.sin(i * 1.15 + .4) * 190, z: MEAN_Z + Math.cos(i * .85) * 320 }));
/* długości scen (ms przy prędkości 1) — reżyser czeka tyle, a test sprawdza długość filmu */
const D = { intro1: 2500, intro2: 3900, reveal: 1300, act: 2600, ignite: 900, again: 1800, retry: 2600, impact: 700, holo: 4400, plain: 1700, skip: 1200, fail: 2800, ask: 2400, answered: 1400, resumed: 1600, pull: 3000, big: 4600 };
/* skrócony czas „myślenia” w filmie: minuta pracy Hermesa ≈ 2,7 s ekranu */
const holdMs = gapS => clamp((gapS || 0) * 45, 1300, 3400);
const hasArt = s => !!(s?.artifact && s.kind !== 'tool');
const pace = (e, s) => ({ 'run.started': D.intro1 + D.intro2 + D.reveal, 'run.resumed': D.resumed, 'step.started': (e.attempt || 1) > 1 ? D.again : D.act + D.ignite, 'step.retry': D.retry,
  'step.completed': D.impact + (hasArt(s) || hasArt(e) ? D.holo : D.plain), 'step.skipped': D.skip, 'step.failed': D.fail, 'ask.waiting': D.ask, 'ask.answered': D.answered,
  'run.completed': D.pull + D.big, 'run.failed': D.pull + D.big, 'run.stopped': D.pull + D.big }[e.type] || 0);
/* przybliżona długość filmu z zapisu (s), bez napisów końcowych */
const filmLength = evs => {
  let ms = 0; const started = {};
  evs.forEach(e => {
    if (e.type === 'step.started') started[e.step_id] = e.ts;
    if (/^step\.(completed|failed|retry)$/.test(e.type)) ms += holdMs(e.ts - (started[e.step_id] ?? e.ts));
    ms += pace(e, e);
  });
  return ms / 1000;
};
const ideaOf = r => { const i = r?.inputs || {}; return String(i.pomysl || Object.values(i)[0] || '').trim(); };
const projectName = r => { for (const s of r?.steps || []) { const f = s.artifact?.fields; if (f && (f.nazwa || f.title)) return String(f.nazwa || f.title); } return ''; };
const firstSentence = t => { t = String(t || '').replace(/\s+/g, ' ').trim(); const m = /^(.{20,200}?[.!?])(\s|$)/.exec(t); return m ? m[1] : t.slice(0, 200); };

/* zdarzenia odtworzone ze stanu przebiegu — gdy zapis zdarzeń zniknął (rotacja) albo most jest niedostępny */
const synth = src => {
  let ts = src.started || Date.now() / 1000;
  const base = { v: 1, run_id: src.id, workflow: src.workflow, name: src.name, total: (src.steps || []).length };
  const out = [{ ...base, type: 'run.started', ts, state: 'running', autonomy: src.autonomy, steps: (src.steps || []).map(s => ({ id: s.id, title: s.title, kind: s.kind })) }];
  (src.steps || []).forEach((s, i) => {
    if (!s.state || s.state === 'pending') return;
    const one = { ...base, step_id: s.id, n: i + 1, kind: s.kind, title: s.title }, att = Math.max(1, s.attempts || 1), per = (s.ms || 20000) / 1000 / att;
    for (let a = 1; a <= att; a++) {
      out.push({ ...one, type: 'step.started', ts, attempt: a });
      ts += per;
      if (a < att) out.push({ ...one, type: 'step.retry', ts, attempt: a, reason: (s.errors || [])[a - 1] || 'sprawdzenie nie przeszło' });
    }
    const end = s.state === 'done' ? 'step.completed' : s.state === 'skipped' ? 'step.skipped' : s.state === 'running' ? null : 'step.failed';
    if (end) out.push({ ...one, type: end, ts, ms: s.ms, score: s.score, preview: s.preview || '', artifact: s.artifact || null, ...(end === 'step.failed' ? { reason: (s.errors || []).slice(-1)[0] || '' } : {}) });
  });
  if (src.state && !ACTIVE(src.state)) out.push({ ...base, type: src.state === 'done' ? 'run.completed' : src.state === 'failed' ? 'run.failed' : 'run.stopped', ts: src.ended || ts, state: src.state, report: src.report, reason: src.reason, budget_used: src.budget_used });
  return out;
};

/* napisy końcowe z przebiegu */
const credits = (r, o = {}) => {
  const steps = r.steps || [], fw = steps.map(s => s.artifact).find(a => a?.kind === 'files_written') || {};
  const secs = steps.reduce((a, s) => a + (s.ms || 0), 0) / 1000, retries = steps.reduce((a, s) => a + Math.max(0, (s.attempts || 1) - 1), 0), tok = r.budget_used?.tokens;
  const when = r.started ? new Date(r.started * 1000).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const scene = (s, i) => String(i + 1).padStart(2, '0') + ' · ' + s.title + ' — ' + (s.state === 'done' ? [s.ms != null ? fmtS(s.ms) : 'gotowe', s.score != null ? 'ocena ' + s.score : '', s.attempts > 1 ? s.attempts + ' ' + J.pl(s.attempts, 'próba', 'próby', 'prób') : ''].filter(Boolean).join(' · ')
    : s.state === 'skipped' ? 'pominięta' : s.state === 'pending' ? 'nienakręcona' : s.state === 'running' ? 'w trakcie' : 'przerwana');
  const files = fw.files || [];
  return [
    { h: 'Jarvis OS przedstawia', big: projectName(r) || r.name },
    ideaOf(r) && { h: 'Na podstawie pomysłu', lines: ['„' + ideaOf(r) + '”'] },
    { h: 'Reżyseria', lines: ['Silnik workflow Jarvisa'] },
    { h: 'Scenariusz', lines: ['workflow „' + r.name + '”'] },
    { h: 'W rolach głównych', lines: ['Hermes — myśli, projektuje i pisze'].concat(steps.some(s => s.kind === 'check') ? ['Jev — kontrola jakości'] : [], steps.some(s => s.kind === 'tool') ? ['Pulpit Jarvis OS — pokaz'] : [], steps.some(s => s.kind === 'ask') ? ['Ty — decyzje'] : []) },
    { h: 'Sceny', lines: steps.map(scene) },
    files.length && { h: 'Zapisane pliki', mono: true, lines: files.slice(0, 40).concat(files.length > 40 ? ['… i ' + (files.length - 40) + ' więcej'] : []) },
    fw.root && { h: 'Plan zdjęciowy', mono: true, lines: [fw.root + (fw.commit ? ' · git ' + fw.commit : '')] },
    { h: 'Statystyki', lines: ['Czas pracy: ' + clock(secs), 'Ponowienia: ' + retries].concat(tok ? ['Tokeny: ' + Math.round(tok / 1000) + ' tys.'] : []) },
    { h: '', lines: ['Nakręcono' + (o.live ? ' na żywo' : '') + (when ? ' ' + when : '') + ' w JarvisWorkspace'] }
  ].filter(Boolean);
};

/* lektor */
const START = { hermes: 'Hermes bierze się do pracy: {t}.', check: 'Kontrola jakości: {t}.', write_files: 'Plany zamieniają się w prawdziwe pliki.', tool: 'Pulpit dostaje polecenie: {t}.', ask: 'Teraz decyzja należy do Ciebie.' };
const THINK = { hermes: ['Hermes analizuje…', 'Układa myśli w strukturę…', 'Waży kompromisy…', 'Dopracowuje szczegóły…', 'Dobra robota wymaga chwili…'], check: ['Sprawdzam każdy punkt…', 'Porównuję z wymaganiami…'], write_files: ['Zapisuję pliki na dysk…'], tool: ['Pulpit wykonuje polecenie…'], ask: ['Czekam na Twoją decyzję…'] };
const startLine = s => (START[s.kind] || 'Scena: {t}.').replace('{t}', s.title);
const thinkLine = (s, k = 0) => { const a = THINK[s.kind] || THINK.hermes; return a[k % a.length]; };
const doneLine = s => {
  const a = s.artifact || {}, tail = [s.ms != null ? fmtS(s.ms) : '', s.score != null ? 'ocena ' + s.score : ''].filter(Boolean).join(', ');
  const nh = (a.headings || []).length, np = (a.paths || []).length, nf = a.count || 0, name = a.fields?.nazwa || a.fields?.title;
  const what = a.kind === 'fields' && name ? (s.kind === 'tool' ? 'Na pulpicie: „' + name + '”.' : 'Powstał brief: „' + name + '”.')
    : a.kind === 'doc' ? 'Dokument: ' + nh + ' ' + J.pl(nh, 'sekcja', 'sekcje', 'sekcji') + ', ' + (a.chars || 0) + ' znaków.'
    : a.kind === 'tree' ? np + ' ' + J.pl(np, 'plik', 'pliki', 'plików') + ' ' + (a.filled ? 'z gotową treścią.' : 'w planie struktury.')
    : a.kind === 'files_written' ? nf + ' ' + J.pl(nf, 'plik zapisany', 'pliki zapisane', 'plików zapisanych') + ' na dysku.' : '';
  return s.title + ' — gotowe' + (tail ? ' (' + tail + ')' : '') + '. ' + what;
};
const stateLine = s => s.state === 'running' ? (KIND_PL[s.kind] || s.kind) + (s.attempts > 1 ? ' · próba ' + s.attempts : '') + '…'
  : s.state === 'done' ? [s.ms != null ? fmtS(s.ms) : '', s.score != null ? 'ocena ' + s.score : ''].filter(Boolean).join(' · ') || 'gotowe'
  : ({ pending: 'czeka', skipped: 'pominięte', failed: 'nie powiodło się', denied: 'odmowa' }[s.state] || s.state);

/* ---------- ścieżka dźwiękowa (Web Audio, syntezowana; ten sam kontekst co J.sfx) ---------- */
const Soundtrack = () => {
  let ctx = null, out = null, comp = null, drone = null, noise = null, curve = null, on = false, wantDrone = false;
  const vol = () => clamp((J.state?.settings?.volume ?? 60) / 60, 0, 1.67) * .5;
  const init = () => {
    if (ctx) return ctx;
    try { ctx = J.sfx?.unlock?.() || null; } catch (e) { ctx = null; }
    if (!ctx) return null;
    out = ctx.createGain(); out.gain.value = on ? vol() : 0;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    out.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise = buf; curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 512 - 1) * 2.6);
    return ctx;
  };
  const env = (g, t, a, peak, hold, rel) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(.0001, t + a + hold + rel); };
  const bus = (dest = out) => { const g = ctx.createGain(); g.gain.value = .0001; g.connect(dest); return g; };
  const osc = (type, f, t, dur, dest) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur + .1); return o; };
  const hiss = (t, dur, dest) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.connect(dest); s.start(t); s.stop(t + dur + .1); return s; };
  const filt = (type, f, q, dest) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; b.connect(dest); return b; };
  const play = fn => { if (!on || !init()) return; try { fn(ctx.currentTime + .02); } catch (e) { /* dźwięk jest dodatkiem */ } };
  const A = {
    get on() { return on; },
    set(v) {
      on = !!v; if (on) init();
      if (out) out.gain.setTargetAtTime(on ? vol() : 0, ctx.currentTime, .15);
      if (on && wantDrone && !drone) A.drone();
    },
    drone() {
      wantDrone = true;
      play(t => {
        if (drone) return;
        const g = bus(), lp = filt('lowpass', 260, 5, g), lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = .07; lg.gain.value = 140; lfo.connect(lg).connect(lp.frequency); lfo.start(t);
        const os = [['sawtooth', 55], ['sawtooth', 55.4], ['sine', 41.2], ['triangle', 110.3]].map(([ty, f]) => { const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.connect(lp); o.start(t); return o; });
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.15, t + 3.5);
        drone = { g, os: os.concat(lfo) };
      });
    },
    fadeDrone(sec = 1.2) {
      wantDrone = false; if (!drone || !ctx) return;
      const t = ctx.currentTime, d = drone; drone = null;
      d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(Math.max(.0001, d.g.gain.value), t); d.g.gain.exponentialRampToValueAtTime(.0001, t + sec);
      d.os.forEach(o => { try { o.stop(t + sec + .1); } catch (e) { /* już zatrzymany */ } });
    },
    whoosh(dur = .9) { play(t => { const g = bus(), bp = filt('bandpass', 300, 1.4, g); bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2800, t + dur * .55); bp.frequency.exponentialRampToValueAtTime(420, t + dur); hiss(t, dur, bp); env(g, t, dur * .5, .5, 0, dur * .5); }); },
    riser(dur = 2.4) {
      play(t => {
        const g = bus(), bp = filt('bandpass', 180, 2, g); bp.frequency.setValueAtTime(180, t); bp.frequency.exponentialRampToValueAtTime(5200, t + dur); hiss(t, dur, bp);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.3, t + dur * .95); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .08);
        const g2 = bus(), o = osc('sawtooth', 110, t, dur, g2); o.frequency.exponentialRampToValueAtTime(880, t + dur);
        g2.gain.setValueAtTime(.0001, t); g2.gain.exponentialRampToValueAtTime(.045, t + dur * .95); g2.gain.exponentialRampToValueAtTime(.0001, t + dur + .08);
      });
    },
    impact() {
      play(t => {
        const g = bus(), o = osc('sine', 95, t, .9, g); o.frequency.exponentialRampToValueAtTime(30, t + .7); env(g, t, .005, .9, .05, .8);
        const g2 = bus(); hiss(t, .5, filt('lowpass', 1100, 0, g2)); env(g2, t, .003, .4, .02, .4);
        const g3 = bus(); osc('triangle', 2093, t, 1.2, g3); osc('sine', 3136, t, 1.2, g3); env(g3, t, .004, .045, 0, 1.1);
      });
    },
    hit() { play(t => { const g = bus(), o = osc('sine', 72, t, .5, g); o.frequency.exponentialRampToValueAtTime(40, t + .4); env(g, t, .005, .45, 0, .45); }); },
    /* „BRAAAM” — dęciaki jak w zwiastunach */
    braam() {
      play(t => {
        const g = bus(), lp = filt('lowpass', 160, 3, g), ws = ctx.createWaveShaper(); ws.curve = curve; ws.connect(lp);
        lp.frequency.setValueAtTime(160, t); lp.frequency.exponentialRampToValueAtTime(1400, t + .35); lp.frequency.exponentialRampToValueAtTime(260, t + 3);
        [55, 55.6, 82.4, 110].forEach(f => osc('sawtooth', f, t, 3.4, ws));
        env(g, t, .06, .45, .4, 2.8);
      });
    },
    chord(dur = 7) {
      play(t => {
        const g = bus(), lp = filt('lowpass', 500, 0, g); lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(4200, t + 2.2);
        [130.81, 196, 261.63, 329.63, 392, 493.88, 587.33].forEach((f, k) => { osc('triangle', f, t + k * .05, dur, lp); osc('sine', f * 2.003, t + k * .05, dur, lp); });
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.11, t + 1.4); g.gain.setValueAtTime(.11, t + dur - 3.5); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      });
    },
    glitch() {
      play(t => {
        const g = ctx.createGain(); g.gain.value = .07; g.connect(out);
        for (let k = 0; k < 12; k++) { const s = t + Math.random() * .55, o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'square'; o.frequency.value = 180 + Math.random() * 1800; gg.gain.setValueAtTime(.0001, s); gg.gain.setValueAtTime(1, s + .002); gg.gain.setValueAtTime(.0001, s + .02 + Math.random() * .03); o.connect(gg).connect(g); o.start(s); o.stop(s + .07); }
        const g2 = bus(); hiss(t, .5, filt('highpass', 2500, 0, g2)); env(g2, t, .01, .18, .25, .2);
      });
    },
    alarm() { play(t => { const g = bus(), o = osc('sawtooth', 440, t, 2.2, filt('lowpass', 1800, 0, g)); for (let k = 0; k < 6; k++) o.frequency.setValueAtTime(k % 2 ? 330 : 440, t + k * .35); env(g, t, .02, .08, 2, .2); }); },
    ping() { play(t => { const g = bus(); osc('sine', 1318.5, t, .9, g); osc('sine', 1975.5, t + .12, .8, g); env(g, t, .005, .07, 0, .85); }); },
    holo() { play(t => { const g = bus(), o = osc('sine', 600, t, .5, g); o.frequency.exponentialRampToValueAtTime(1500, t + .3); env(g, t, .01, .045, .05, .35); }); },
    stop() {
      A.fadeDrone(.6);
      if (out && ctx) { out.gain.setTargetAtTime(0, ctx.currentTime, .15); const o = out, c = comp; setTimeout(() => { try { o.disconnect(); c.disconnect(); } catch (e) { /* już odłączone */ } }, 1500); }
      out = null; ctx = null; on = false; wantDrone = false;   // spóźnione efekty (timery finału) już nie zagrają
    }
  };
  return A;
};

/* ziarno taśmy: szum generowany raz na stronę */
let grainURL = '';
const grain = () => {
  if (grainURL) return grainURL;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const x = c.getContext('2d'), im = x.createImageData(160, 160);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); grainURL = c.toDataURL('image/png');
  } catch (e) { /* bez ziarna */ }
  return grainURL;
};

/* ---------- projekcja ---------- */
let cur = null;
const mount = (src, evs, o) => {
  const film = !!evs, live = !film, runId = src.id;
  const rank = fxRank(), still = rank < 1;
  const css = getComputedStyle(document.querySelector('#app') || document.documentElement), col = (v, d) => css.getPropertyValue(v).trim() || d;
  const ACC = col('--accent-rgb', '51,214,255'), ACC2 = col('--accent2-rgb', '162,92,255'), OK = col('--ok-rgb', '62,240,163'), WARN = col('--warn-rgb', '255,184,77'), ERR = col('--err-rgb', '255,93,122'), WHITE = '255,255,255';
  const start = film ? evs.find(e => e.type === 'run.started') : null;
  const run = film ? Object.assign(blank(start), { autonomy: start.autonomy })
    : Object.assign(blank({ run_id: src.id, workflow: src.workflow, name: src.name, ts: src.started, steps: src.steps }), { state: src.state, autonomy: src.autonomy, pending: src.pending, budget_used: src.budget_used, steps: (src.steps || []).map(s => ({ errors: [], ...s })) });
  Object.assign(run, { id: 'kino:' + runId, name: src.name || run.name, workflow: src.workflow || run.workflow, inputs: src.inputs || {}, budget: src.budget, started: src.started || run.started });
  const n = run.steps.length, P = layout(n), PP = new Array(n);
  let alive = true, spoke = false;
  const audio = Soundtrack();

  /* ---------- DOM ---------- */
  const prevFocus = document.activeElement;
  const el = h('div', { class: 'cin ' + (film ? 'cin-film' : 'cin-live'), role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Tryb kinowy: ' + run.name, 'data-r': String(rank), tabindex: '-1' },
    '<div class="cin-stage"><canvas class="cin-cv" aria-hidden="true"></canvas><div class="cin-world" aria-hidden="true"></div>' +
      '<div class="cin-holo" aria-hidden="true"><div class="cin-holo-h"><i></i><span></span></div><div class="cin-holo-b"></div></div></div>' +
    '<div class="cin-flash" aria-hidden="true"></div><div class="cin-title" aria-hidden="true"></div><div class="cin-credits" aria-hidden="true"></div>' +
    '<div class="cin-leak" aria-hidden="true"><i></i><i></i></div><div class="cin-grain" aria-hidden="true"></div><div class="cin-vig" aria-hidden="true"></div>' +
    '<div class="cin-bar top"><span class="cin-rec"><i></i><b></b></span><span class="cin-act"></span><span class="cin-tc">00:00:00:00</span></div>' +
    '<div class="cin-bar bot"><span class="cin-eta"></span><p class="cin-sub" aria-live="polite"></p><span class="cin-ctl"><span class="cin-opts"></span>' +
      '<button class="cin-b" type="button" data-a="snd"></button><button class="cin-b" type="button" data-a="skip" title="Przewiń do finału">⏭</button>' +
      '<button class="cin-b" type="button" data-a="close" title="Zamknij (Esc)" aria-label="Zamknij tryb kinowy">✕</button></span></div>');
  const $ = s => el.querySelector(s);
  const stage = $('.cin-stage'), cv = $('.cin-cv'), g = cv.getContext('2d'), world = $('.cin-world'), holo = $('.cin-holo'), ttl = $('.cin-title'), subEl = $('.cin-sub'),
    tcEl = $('.cin-tc'), actEl = $('.cin-act'), etaEl = $('.cin-eta'), optsEl = $('.cin-opts'), flashEl = $('.cin-flash'), sndB = $('[data-a=snd]'), skipB = $('[data-a=skip]');
  if (grain()) el.style.setProperty('--grain', 'url(' + grain() + ')');
  $('.cin-rec b').textContent = live ? 'REC · NA ŻYWO' : 'ZAPIS';
  skipB.hidden = live;
  const NODES = run.steps.map((s, i) => {
    const nEl = h('div', { class: 'cin-node', 'data-s': s.state || 'pending', 'data-k': s.kind },
      '<span class="cin-core"><svg class="cin-ring" viewBox="0 0 144 144"><circle cx="72" cy="72" r="66"/></svg><span class="cin-ic">' + J.icon(KIND_IC[s.kind] || 'star') + '</span><span class="cin-ok">✓</span></span>');
    const l = h('div', { class: 'cin-lbl' }, '<em></em><b></b><small></small>');
    l.querySelector('em').textContent = 'AKT ' + roman(i + 1); l.querySelector('b').textContent = s.title;
    world.appendChild(nEl); world.appendChild(l);
    return { n: nEl, l, small: l.querySelector('small'), st: null, blur: -1 };
  });
  document.body.appendChild(el);
  setTimeout(() => { if (alive) document.body.classList.add('cin-under'); }, 700);   // pulpit pod spodem nie musi się rysować

  /* ---------- kamera ---------- */
  let W = 0, H = 0, F = 1, holoRect = null;
  const resize = () => {
    const dpr = Math.min(rank >= 3 ? 1.5 : 1.25, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0); F = H * 1.05; holoRect = null;
  };
  resize();
  const cam = { x: 0, y: 0, z: 0, roll: 0 }, vel = { x: 0, y: 0, z: 0 };
  let prevCam = { ...cam }, shot = null, drift = 0, focusI = -1, tNow = 0, shakeA = 0, hx = 0, hy = 0, cr = 1, sr = 0;
  let dimK = 0, dimT = 0;   // przygaszenie świata pod dużymi planszami i napisami (płynnie)
  const lit = run.steps.map(() => still ? 1 : 0), litAt = run.steps.map(() => Infinity);   // konstelacja zapala się po tytule
  const reveal = (gap = 140) => run.steps.forEach((s, i) => { if (litAt[i] === Infinity) litAt[i] = tNow + i * gap / 1000; });
  const easeIO = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, easeOut = k => 1 - Math.pow(1 - k, 3);
  const over = () => { const span = (n - 1) * GAP + 760, dz = Math.max(F * span / (.84 * W), F * 900 / (.62 * H)); return { x: 0, y: 0, z: MEAN_Z - dz, roll: 0 }; };
  const near = (i, dist = 520, side = 0) => { const p = P[i]; return { x: p.x + side * .17 * W * dist / F, y: p.y + 14, z: p.z - dist, roll: (i % 2 ? 1 : -1) * .03 }; };
  const fly = (to, ms, ez = easeIO) => { const t = { ...cam, ...to }; if (still || !ms) { Object.assign(cam, t); shot = null; return; } shot = { a: { ...cam }, b: t, t0: tNow, d: Math.max(.05, ms / 1000 / speed()), ez }; };
  const proj = (p, c = cam) => {
    const dz = p.z - c.z; if (dz < 30) return null;
    const k = F / dz, x = (p.x - c.x - hx) * k, y = (p.y - c.y - hy) * k;
    return { x: W / 2 + x * cr - y * sr, y: H / 2 + x * sr + y * cr, k, dz };
  };
  Object.assign(cam, over()); cam.z -= film ? 2600 : 1400; cam.roll = .1;

  /* ---------- gwiazdy, mgławice, efekty ---------- */
  const NS = rank >= 3 ? 700 : rank === 2 ? 450 : 260, STAR_C = [WHITE, '200,225,255', '170,200,255', ACC, ACC2];
  const spawnStar = any => ({ x: cam.x + (Math.random() - .5) * 9000, y: cam.y + (Math.random() - .5) * 5600, z: cam.z + (any ? 60 + Math.random() * 6000 : 5600 + Math.random() * 500), b: .35 + Math.random() * .65, tw: Math.random() * 6.28, c: STAR_C[Math.random() < .86 ? Math.random() * 3 | 0 : 3 + (Math.random() * 2 | 0)] });
  const stars = Array.from({ length: NS }, () => spawnStar(true));
  const NEB = [[.22, .32, ACC2, .15, .55], [.78, .62, ACC, .11, .6], [.55, .18, '60,90,200', .13, .5]];
  let sparks = [], waves = [], flares = [], streams = [];
  const sprites = {};
  const sprite = rgb => {
    if (sprites[rgb]) return sprites[rgb];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(' + rgb + ',.9)'); gr.addColorStop(.5, 'rgba(' + rgb + ',.22)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return (sprites[rgb] = c);
  };
  const glow = (x, y, r, rgb, a = 1) => { if (r < .5 || a <= 0) return; g.globalAlpha = Math.min(1, a); g.drawImage(sprite(rgb), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
  const spark = (i, c, cnt) => {
    if (rank < 2) return; const p = P[i];
    for (let k = 0; k < cnt; k++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.28, s = Math.sqrt(1 - u * u), v = 250 + Math.random() * 520; sparks.push({ x: p.x, y: p.y, z: p.z, vx: s * Math.cos(a) * v, vy: s * Math.sin(a) * v, vz: u * v, life: 1, c: Math.random() < .25 ? WHITE : c }); }
  };
  const flash = (a = .6) => { if (rank < 1) return; flashEl.style.setProperty('--fa', String(a)); flashEl.classList.remove('on'); void flashEl.offsetWidth; flashEl.classList.add('on'); };
  const impact = (i, c) => { flash(.55); shakeA = rank >= 2 ? 16 : 0; waves.push({ i, r: 70, life: 1, c }, { i, r: 30, life: 1.3, c: WHITE }); spark(i, c, rank >= 3 ? 90 : 50); flares.push({ i, life: 1, c }); audio.impact(); };
  const ignite = i => { waves.push({ i, r: 60, life: 1, c: ACC }); spark(i, ACC, 24); audio.hit(); };

  const draw = dt => {
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.fillStyle = '#01030a'; g.fillRect(0, 0, W, H);
    NEB.forEach(([fx, fy, c, a, rr], k) => {
      const x = fx * W - cam.x * .03 * (k + 1), y = fy * H - cam.y * .03 * (k + 1), R = Math.max(W, H) * rr * (1 + .05 * Math.sin(tNow * .2 + k));
      const gr = g.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, 'rgba(' + c + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    g.globalCompositeOperation = 'lighter';
    /* gwiazdy: paralaksa z kamery; przy szybkim locie — smugi */
    const v = Math.hypot(vel.x, vel.y, vel.z), streak = rank >= 2 && v > 450, cB = streak ? { x: cam.x - vel.x * .05, y: cam.y - vel.y * .05, z: cam.z - vel.z * .05 } : null;
    g.lineCap = 'round';
    for (const s of stars) {
      const dz0 = s.z - cam.z;
      if (dz0 < 40) Object.assign(s, spawnStar(false)); else if (dz0 > 6300) s.z -= 6000;
      if (Math.abs(s.x - cam.x) > 4800) s.x = cam.x + (Math.random() - .5) * 9000;
      if (Math.abs(s.y - cam.y) > 3000) s.y = cam.y + (Math.random() - .5) * 5600;
      const p = proj(s); if (!p || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) continue;
      const a = s.b * clamp(1 - p.dz / 6000, 0, 1) * (still ? 1 : .75 + .25 * Math.sin(tNow * 2 + s.tw)), r = clamp(p.k * 2.2, .35, 2.6);
      if (streak) { const q = proj(s, cB); if (q) { g.strokeStyle = 'rgba(' + s.c + ',' + a + ')'; g.lineWidth = r; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(p.x, p.y); g.stroke(); continue; } }
      g.fillStyle = 'rgba(' + s.c + ',' + a + ')'; g.fillRect(p.x - r / 2, p.y - r / 2, r, r);
      if (r > 1.6) glow(p.x, p.y, r * 4, s.c, a * .5);
    }
    /* połączenia kroków */
    g.globalAlpha = 1 - .72 * dimK;
    for (let i = 0; i < n - 1; i++) {
      const a = PP[i], b = PP[i + 1]; if (!a || !b || lit[i] * lit[i + 1] < .05) continue;
      g.globalAlpha = (1 - .72 * dimK) * Math.min(lit[i], lit[i + 1]);
      const sa = run.steps[i].state, sb = run.steps[i + 1].state, passed = sa === 'done' || sa === 'skipped', hot = sb === 'running';
      const lw = clamp((a.k + b.k) * 2.2, .6, 5);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
      if (passed) {
        const gr = g.createLinearGradient(a.x, a.y, b.x, b.y); gr.addColorStop(0, 'rgba(' + OK + ',.85)'); gr.addColorStop(1, 'rgba(' + (hot ? ACC : OK) + ',.95)');
        g.strokeStyle = 'rgba(' + (hot ? ACC : OK) + ',.12)'; g.lineWidth = lw * 5; g.stroke();
        g.strokeStyle = gr; g.lineWidth = lw; g.stroke();
        if (rank >= 2) { g.setLineDash([lw * 1.4, lw * 8]); g.lineDashOffset = -tNow * (hot ? 220 : 70); g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke(); g.setLineDash([]); }
      } else { g.setLineDash([6, 10]); g.lineDashOffset = 0; g.strokeStyle = 'rgba(150,180,240,.16)'; g.lineWidth = Math.max(.6, lw * .5); g.stroke(); g.setLineDash([]); }
    }
    g.globalAlpha = 1;
    /* projektor hologramu */
    if (holoI >= 0 && PP[holoI]) {
      if (!holoRect) { const b = holo.getBoundingClientRect(); if (b.width > 40) holoRect = b; }
      if (holoRect) {
        const p = PP[holoI], fl = .7 + .3 * Math.sin(tNow * 23) * Math.sin(tNow * 7), gr = g.createLinearGradient(p.x, p.y, holoRect.left, p.y);
        gr.addColorStop(0, 'rgba(' + ACC + ',' + .26 * fl + ')'); gr.addColorStop(1, 'rgba(' + ACC + ',.03)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(holoRect.left, holoRect.top + 8); g.lineTo(holoRect.left, holoRect.bottom - 8); g.closePath(); g.fill();
      }
    }
    /* krok w toku: aura, satelity na orbicie 3D, strumienie danych zbiegające do węzła */
    const ri = run.steps.findIndex(s => s.state === 'running');
    if (ri >= 0 && PP[ri] && !still) {
      const p = PP[ri];
      glow(p.x, p.y, 160 * p.k * (1 + .08 * Math.sin(tNow * 3)), ACC, .55);
      if (rank >= 2) for (let k = 0; k < 3; k++) for (let tr = 0; tr < 7; tr++) {
        const a = tNow * (1.5 + k * .4) + k * 2.09 - tr * .07, R = 95 + k * 22;
        const q = proj({ x: P[ri].x + Math.cos(a) * R, y: P[ri].y + Math.sin(a * .7 + k) * 26, z: P[ri].z + Math.sin(a) * R });
        if (q) glow(q.x, q.y, (tr ? 7 : 12) * q.k * (1 - tr / 8), k === 1 ? ACC2 : ACC, (1 - tr / 7) * .9);
      }
      if (rank >= 2 && Math.random() < dt * (rank >= 3 ? 26 : 14)) { const ang = Math.random() * 6.28, d = Math.max(W, H) * .62; streams.push({ x0: p.x + Math.cos(ang) * d, y0: p.y + Math.sin(ang) * d, t: 0, v: .55 + Math.random() * .6, i: ri, c: Math.random() < .7 ? ACC : ACC2 }); }
    }
    streams = streams.filter(s => s.t < 1 && PP[s.i]);
    streams.forEach(s => {
      const p = PP[s.i], t0 = s.t; s.t += s.v * dt;
      const at = t => { const e = t * t; return { x: s.x0 + (p.x - s.x0) * e, y: s.y0 + (p.y - s.y0) * e }; }, a = at(Math.max(0, t0 - .06)), b = at(Math.min(1, s.t));
      g.strokeStyle = 'rgba(' + s.c + ',' + (.25 + .6 * s.t) + ')'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); glow(b.x, b.y, 6, s.c, .8);
    });
    /* fale uderzeniowe */
    waves = waves.filter(w => w.life > 0);
    waves.forEach(w => {
      w.r += 900 * dt; w.life -= dt * 1.1; const p = PP[w.i]; if (!p) return;
      const R = w.r * p.k, a = Math.max(0, Math.min(1, w.life));
      g.beginPath(); g.arc(p.x, p.y, R, 0, 6.283); g.strokeStyle = 'rgba(' + w.c + ',' + a * .25 + ')'; g.lineWidth = 14 * a + 2; g.stroke();
      g.strokeStyle = 'rgba(' + w.c + ',' + a * .9 + ')'; g.lineWidth = 1 + 3 * a; g.stroke();
    });
    /* iskry w 3D */
    sparks = sparks.filter(s => s.life > 0);
    sparks.forEach(s => {
      const pb = proj(s); s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; const dr = Math.exp(-dt * 1.8); s.vx *= dr; s.vy *= dr; s.vz *= dr; s.life -= dt * .85;
      const p = proj(s); if (!p) return;
      if (pb) { g.strokeStyle = 'rgba(' + s.c + ',' + s.life + ')'; g.lineWidth = clamp(p.k * 3, .6, 3); g.beginPath(); g.moveTo(pb.x, pb.y); g.lineTo(p.x, p.y); g.stroke(); }
      glow(p.x, p.y, clamp(10 * p.k, 2, 14) * (.4 + s.life), s.c, s.life);
    });
    /* flara anamorficzna: pozioma smuga przez cały kadr + odblaski soczewki */
    flares = flares.filter(f => f.life > 0);
    flares.forEach(f => {
      f.life -= dt * .8; const p = PP[f.i]; if (!p) return;
      const a = Math.max(0, Math.min(1, f.life)), len = W * (.45 + .6 * a);
      g.globalAlpha = a * .9; g.drawImage(sprite(f.c), p.x - len, p.y - 16 * a - 3, len * 2, 32 * a + 6);
      g.globalAlpha = a * .55; g.drawImage(sprite(WHITE), p.x - len * .5, p.y - 2, len, 4); g.globalAlpha = 1;
      glow(p.x, p.y, 110 * a + 30, WHITE, a * .9);
      const dx = W / 2 - p.x, dy = H / 2 - p.y;
      [[.6, 26, ACC], [1.3, 60, ACC2], [1.7, 16, OK], [2.1, 38, ACC]].forEach(([s, r, c]) => glow(p.x + dx * s, p.y + dy * s, r, c, a * .3));
    });
    g.globalCompositeOperation = 'source-over';
  };

  /* węzły DOM: pozycja z kamery, głębia ostrości (rozmycie poza płaszczyzną ostrości) */
  const place = () => {
    const fz = focusI >= 0 && PP[focusI] ? PP[focusI].dz : MEAN_Z - cam.z;
    for (let i = 0; i < n; i++) {
      const p = PP[i], N = NODES[i], s = run.steps[i], key = s.state + ':' + (s.attempts || 0);
      if (N.st !== key) { N.st = key; N.n.dataset.s = s.state; N.small.textContent = stateLine(s); }
      if (!p || p.x < -320 || p.x > W + 320 || p.y < -320 || p.y > H + 320) { N.n.style.opacity = '0'; N.l.style.opacity = '0'; continue; }
      const k = p.k, blur = rank >= 2 ? Math.round(clamp(Math.abs(p.dz - fz) / 230 - .4, 0, 7) * 2) / 2 : 0, z = String(5000 - Math.round(p.dz / 2));
      N.n.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + k.toFixed(3) + ')';
      N.n.style.opacity = String(clamp(k * 2.4, .3, 1) * lit[i]); N.n.style.zIndex = z;
      if (N.blur !== blur) { N.blur = blur; N.n.style.filter = N.l.style.filter = blur ? 'blur(' + blur + 'px)' : ''; }
      N.l.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + (p.y + 66 * k + 10).toFixed(1) + 'px,0) translateX(-50%) scale(' + clamp(k, .5, 1.25).toFixed(3) + ')';
      N.l.style.opacity = String(clamp((k - .22) * 2.4, 0, 1) * lit[i]); N.l.style.zIndex = z;
    }
    const wo = (1 - .72 * dimK).toFixed(2); if (world.style.opacity !== wo) world.style.opacity = wo;
  };

  let raf = 0, last = 0, lastDraw = 0;
  const t0 = performance.now();
  const frame = now => {
    raf = 0; if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (still && now - lastDraw < 100) return;   // „ogranicz ruch”: obraz stoi — wystarczy ~10 klatek/s
    lastDraw = now;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now; tNow += dt;
    if (shot) { const k = clamp((tNow - shot.t0) / shot.d, 0, 1), e = shot.ez(k); ['x', 'y', 'z', 'roll'].forEach(q => { cam[q] = shot.a[q] + (shot.b[q] - shot.a[q]) * e; }); if (k >= 1) shot = null; }
    else if (!still) cam.z += drift * dt;
    vel.x = (cam.x - prevCam.x) / dt; vel.y = (cam.y - prevCam.y) / dt; vel.z = (cam.z - prevCam.z) / dt; prevCam = { ...cam };
    const hand = rank >= 2 ? 1 : 0;   // kamera „z ręki”
    hx = hand * (Math.sin(tNow * .53) * 7 + Math.sin(tNow * 1.37) * 3); hy = hand * (Math.cos(tNow * .47) * 5 + Math.sin(tNow * 1.11) * 2.5);
    const roll = cam.roll + hand * Math.sin(tNow * .31) * .006; cr = Math.cos(roll); sr = Math.sin(roll);
    for (let i = 0; i < n; i++) PP[i] = proj(P[i]);
    dimT = ttl.querySelector('.cin-t.main:not(.out),.cin-t.big:not(.out),.cin-t.end:not(.out)') || el.querySelector('.cin-credits.on:not(.gone)') ? 1 : ttl.querySelector('.cin-t.warn:not(.out),.cin-t.err:not(.out)') ? .8 : ttl.querySelector('.cin-t.act:not(.out)') ? .4 : 0;
    dimK += (dimT - dimK) * (1 - Math.exp(-dt * (still ? 60 : 3.5)));
    for (let i = 0; i < n; i++) if (lit[i] < 1 && tNow >= litAt[i]) { if (!lit[i]) { waves.push({ i, r: 20, life: .7, c: ACC }); spark(i, ACC, 8); } lit[i] = Math.min(1, lit[i] + dt * 2.5); }
    draw(dt); place();
    if (shakeA > .3) { stage.style.transform = 'translate(' + ((Math.random() - .5) * shakeA).toFixed(1) + 'px,' + ((Math.random() - .5) * shakeA).toFixed(1) + 'px)'; shakeA *= Math.exp(-dt * 7); }
    else if (shakeA) { shakeA = 0; stage.style.transform = ''; }
    tcEl.textContent = timecode((now - t0) / 1000);
  };

  /* ---------- plansze, napisy, hologram ---------- */
  const title = (kind, big, small, extra) => {
    [...ttl.children].forEach(c => { c.classList.add('out'); setTimeout(() => c.remove(), 700); });
    const t = h('div', { class: 'cin-t ' + kind });
    if (small) { const s = h('small'); s.textContent = small; t.appendChild(s); }
    if (big) { const b = h('b'); b.textContent = big; t.appendChild(b); }
    const em = h('em'); if (extra) em.textContent = extra; t.appendChild(em);
    if (kind === 'act') t.appendChild(h('i', { class: 'streak' }));
    ttl.appendChild(t); t.em = em; return t;
  };
  const titleOut = () => [...ttl.children].forEach(c => { c.classList.add('out'); setTimeout(() => c.remove(), 700); });
  let subT = 0, thinkAt = 0, thinkK = 0;
  const sub = text => { thinkAt = tNow; clearTimeout(subT); subEl.classList.remove('on'); subT = setTimeout(() => { subEl.textContent = text || ''; subEl.classList.toggle('on', !!text); }, still ? 0 : 220); };
  const say = text => { if (!audio.on || !J.state?.settings?.speech) return; spoke = true; J.voice?.speak?.(text, { priority: 1 }); };
  let holoI = -1;
  const holoOn = (i, s) => {
    holoI = i; holoRect = null; $('.cin-holo-h span').textContent = 'Wynik · ' + s.title;
    const b = $('.cin-holo-b'); b.innerHTML = ''; try { b.appendChild(renderArt(s.artifact)); } catch (e) { /* hologram bez treści */ }
    holo.classList.remove('show'); void holo.offsetWidth; holo.classList.add('show'); audio.holo();
    setTimeout(() => { holoRect = null; }, 650);
  };
  const holoOff = () => { holo.classList.remove('show'); holoI = -1; };
  const opts = list => {
    optsEl.innerHTML = '';
    (list || []).forEach((label, k) => {
      const b = h('button', { class: 'cin-b' + (k ? '' : ' pri'), type: 'button' }); b.textContent = label;
      b.onclick = async () => {
        [...optsEl.children].forEach(x => { x.disabled = true; });
        try { await api('/workflows/runs/' + encodeURIComponent(runId) + '/answer', { method: 'POST', body: { answer: label } }); }
        catch (er) { sub('Nie przekazano odpowiedzi: ' + er.message); [...optsEl.children].forEach(x => { x.disabled = false; }); }
      };
      optsEl.appendChild(b);
    });
  };
  const hud = () => {
    if (!alive) return;
    if (live) { const sh = WF.runs.get(runId), left = sh && ACTIVE(sh.state) ? WF.eta(sh) : 0; etaEl.textContent = left ? '≈ ' + clock(left) + ' do końca' : ''; }
    else etaEl.textContent = run.started ? new Date(run.started * 1000).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const ri = run.steps.findIndex(s => s.state === 'running');
    if (live && !busy && !q.length && ri >= 0 && tNow - thinkAt > 7) sub(thinkLine(run.steps[ri], ++thinkK));
  };

  /* ---------- reżyser: kolejka zdarzeń → sceny ---------- */
  const q = film ? evs.slice() : [{ type: '_intro' }];
  let busy = false, ff = false, inFinale = false, waker = null;
  const startedTs = {};
  const speed = () => film ? (ff && !inFinale ? 40 : 1) : (q.length > 2 ? 2.5 : 1);
  const wait = ms => new Promise(res => {
    if (!alive) return res();
    let t = 0; const done = () => { clearTimeout(t); if (waker === done) waker = null; res(); };
    t = setTimeout(done, ms / speed()); waker = done;
  });
  const pump = async () => {
    if (busy) return; busy = true;
    try { while (alive && q.length) { const e = q.shift(); try { await beat(e); } catch (er) { console.error('[kino]', er); } } }
    finally { busy = false; }
  };

  const intro = async liveIntro => {
    audio.drone(); audio.riser(2.6);
    fly(over(), liveIntro ? 4200 : 6200, easeOut);
    title('intro', '', 'Jarvis OS przedstawia'); sub('');
    await wait(D.intro1);
    audio.braam(); flash(.35); shakeA = rank >= 2 ? 6 : 0;
    const idea = ideaOf(run), t = title('main', run.name, '');
    typeText(t.em, idea ? '„' + idea + '”' : '', 1800);
    sub(idea ? 'Wszystko zaczyna się od jednego pomysłu.' : 'Jarvis zaczyna pracę.'); if (idea) say('Wszystko zaczyna się od pomysłu: ' + idea);
    await wait(liveIntro ? 3000 : D.intro2);
    titleOut(); reveal(); audio.ping();
    if (!liveIntro) return wait(D.reveal);   // chwila na zapalenie się konstelacji przed Aktem I
    /* na żywo: krótkie „poprzednio” i lot do bieżącej sceny */
    const doneI = run.steps.map((s, i) => s.state === 'done' || s.state === 'skipped' ? i : -1).filter(i => i >= 0);
    if (doneI.length) {
      sub('Dotąd: ' + doneI.length + ' z ' + n + ' ' + J.pl(n, 'sceny', 'scen', 'scen') + ' gotowe.');
      for (const i of doneI) { fly(near(i, 760), 800); await wait(850); waves.push({ i, r: 50, life: .8, c: OK }); }
    }
    const ri = run.steps.findIndex(s => s.state === 'running');
    if (ri >= 0) { startedTs[run.steps[ri].id] = Date.now() / 1000; await act(ri, { attempt: 1 }); }
    else if (run.state === 'waiting') await asking(run.pending);
  };
  const act = async (i, e) => {
    const s = run.steps[i]; holoOff(); focusI = i; reveal(60);
    actEl.textContent = 'Akt ' + roman(i + 1) + ' / ' + roman(n) + ' · ' + s.title;
    if ((e.attempt || 1) > 1) { audio.whoosh(.6); fly(near(i, 560), 1200); sub('Próba ' + e.attempt + ': ' + thinkLine(s, e.attempt)); return wait(D.again); }
    audio.whoosh(); fly(near(i, 980), D.act * .85);
    title('act', s.title, 'Akt ' + roman(i + 1), KIND_PL[s.kind] || ''); say('Akt ' + (ORD[i] || i + 1) + '. ' + s.title + '.');
    sub(startLine(s));
    await wait(D.act); titleOut();
    ignite(i); fly(near(i, 540), 1500); drift = 14;
    await wait(D.ignite);
  };
  const done = async i => {
    const s = run.steps[i]; focusI = i;
    impact(i, OK); sub(doneLine(s));
    await wait(D.impact);
    if (hasArt(s)) { fly(near(i, 600, 1), 1300); drift = 8; holoOn(i, s); await wait(D.holo); } else await wait(D.plain);
  };
  const retry = async (i, e) => {
    el.classList.remove('glitch'); void el.offsetWidth; el.classList.add('glitch'); setTimeout(() => el.classList.remove('glitch'), 750);
    audio.glitch(); shakeA = rank >= 2 ? 10 : 0; waves.push({ i, r: 50, life: 1, c: WARN });
    title('warn', 'Korekta kursu', 'Sprawdzenie nie przeszło', String(e.reason || '').slice(0, 110));
    sub('Sprawdzenie nie przeszło' + (e.reason ? ': ' + String(e.reason).slice(0, 140) : '') + '. Hermes poprawia kurs.');
    await wait(D.retry); titleOut();
  };
  const failed = async (i, e) => {
    el.classList.add('alarm'); audio.alarm(); waves.push({ i, r: 60, life: 1.2, c: ERR }); spark(i, ERR, 40); shakeA = rank >= 2 ? 14 : 0;
    title('err', 'Awaria', 'Akt ' + roman(i + 1), String(e.reason || '').slice(0, 110));
    sub('Scena „' + run.steps[i].title + '” się nie udała' + (e.reason ? ': ' + String(e.reason).slice(0, 140) : '') + '.');
    await wait(D.fail); titleOut(); el.classList.remove('alarm');
  };
  const asking = async p => {
    audio.ping(); sub('⏸ ' + (p?.question || 'Potrzebna Twoja decyzja.'));
    if (live) opts(p?.options || []);
    await wait(D.ask);
  };
  const finale = async e => {
    inFinale = true; holoOff(); opts(null); focusI = -1;
    const okk = e.type === 'run.completed', c = okk ? OK : e.type === 'run.failed' ? ERR : WARN;
    actEl.textContent = 'Finał'; skipB.title = 'Przewiń napisy';
    audio.riser(3); fly(over(), D.pull); drift = -12;
    sub(okk ? 'Wszystkie sceny nakręcone. Kamera odjeżdża…' : 'Koniec zdjęć.');
    run.steps.forEach((s, i) => setTimeout(() => { if (!alive) return; waves.push({ i, r: 40, life: 1, c: s.state === 'done' ? OK : s.state === 'skipped' ? '150,170,200' : ERR }); spark(i, c, 14); }, i * 220));
    await wait(D.pull);
    flash(.9); audio.braam(); if (okk) audio.chord(); shakeA = rank >= 2 ? 12 : 0;
    flares.push({ i: Math.floor((n - 1) / 2), life: 1.3, c });
    if (okk && rank >= 2) [0, 650, 1300].forEach(d => setTimeout(() => { if (alive) run.steps.forEach((s, i) => spark(i, [OK, ACC, ACC2, WARN][(i + d / 650) % 4], rank >= 3 ? 34 : 20)); }, d));
    title('big ' + (okk ? 'ok' : 'err'), okk ? 'Misja zakończona' : e.type === 'run.stopped' ? 'Misja zatrzymana' : 'Misja przerwana', '', projectName(run) || run.name);
    say(okk ? 'Misja zakończona.' : 'Misja przerwana.');
    sub(firstSentence(run.report || run.reason || ''));
    await wait(D.big); titleOut();
    await roll();
    end();
  };
  const roll = async () => {
    const box = $('.cin-credits'), r = h('div', { class: 'cin-roll' });
    credits(run, { live }).forEach(sec => {
      const se = h('section', sec.mono ? { class: 'mono' } : {});
      if (sec.h) { const x = h('h4'); x.textContent = sec.h; se.appendChild(x); }
      if (sec.big) { const x = h('div', { class: 'big' }); x.textContent = sec.big; se.appendChild(x); }
      (sec.lines || []).forEach(t => { const x = h('p'); x.textContent = t; se.appendChild(x); });
      r.appendChild(se);
    });
    box.innerHTML = ''; box.appendChild(r); box.classList.add('on'); sub('');
    if (still) return wait(1200);   // bez ruchu: lista stoi (można przewinąć)
    const dist = r.offsetHeight + box.clientHeight, dur = clamp(dist / 90, 10, 26);
    r.style.setProperty('--dist', dist + 'px'); r.style.animationDuration = dur + 's'; r.classList.add('go');
    await wait(dur * 1000);
  };
  const end = () => {
    if (!alive) return;
    skipB.hidden = true; actEl.textContent = '';
    const row = h('div', { class: 'cin-endb' });
    const again = h('button', { class: 'cin-b pri', type: 'button' }); again.textContent = '↻ Jeszcze raz'; again.onclick = () => C.open(runId, { film: true });
    const cl = h('button', { class: 'cin-b', type: 'button' }); cl.textContent = '✕ Zamknij'; cl.onclick = () => close();
    row.append(again, cl);
    if (still) { const r = $('.cin-roll'), k = h('div', { class: 'big' }); k.textContent = 'Koniec'; r?.append(k, row); }   // bez ruchu: napisy zostają do przeczytania
    else { $('.cin-credits').classList.add('gone'); title('end', 'Koniec', '', '').appendChild(row); }
    again.focus(); audio.fadeDrone(6);
  };

  const beat = async e => {
    if (e.type === '_intro') return intro(true);
    if (e.type === 'run.snapshot') return;
    const s0 = run.steps.find(x => x.id === e.step_id);
    if (/^step\./.test(e.type) && !s0) return;
    /* zdarzenie już widoczne (np. dosłane po synchronizacji) — bez powtórki sceny */
    if (e.type === 'step.started' && s0.state === 'running' && (s0.attempts || 1) === (e.attempt || 1) && startedTs[s0.id]) return;
    if ((e.type === 'step.completed' || e.type === 'step.skipped') && (s0.state === 'done' || s0.state === 'skipped')) return;
    if (/^run\.(completed|failed|stopped)$/.test(e.type) && inFinale) return;
    if (film && /^step\.(completed|failed|retry)$/.test(e.type)) { const ri = run.steps.indexOf(s0); focusI = ri; sub(thinkLine(s0, thinkK++)); await wait(holdMs(e.ts - (startedTs[s0.id] ?? e.ts))); }
    WF.reduce(run, e); if (e.budget_used) run.budget_used = e.budget_used;
    const i = s0 ? run.steps.indexOf(s0) : -1;
    switch (e.type) {
      case 'run.started': return intro(false);
      case 'run.resumed': sub('Most wstał po restarcie — przebieg wraca od zapisanego kroku.'); return wait(D.resumed);
      case 'step.started': startedTs[s0.id] = e.ts || Date.now() / 1000; return act(i, e);
      case 'step.retry': return retry(i, e);
      case 'step.completed': return done(i);
      case 'step.skipped': sub('Scena pominięta: ' + s0.title + '.'); fly(near(i, 760), 900); return wait(D.skip);
      case 'step.failed': return failed(i, e);
      case 'ask.waiting': return asking(e);
      case 'ask.answered': opts(null); sub('Decyzja zapadła' + (e.answer ? ': „' + e.answer + '”' : '') + '.'); return wait(D.answered);
      case 'run.completed': case 'run.failed': case 'run.stopped': return finale(e);
    }
  };

  /* na żywo: zdarzenia z mostu + dosłanie tego, co mogło umknąć (stan wspólny vs kopia sceny) */
  const offEv = live ? J.on('workflows', p => { if (alive && p?.id === runId && p.e) { q.push(p.e); pump(); } }) : () => { };
  const resync = () => {
    if (!live || busy || q.length || inFinale) return;
    const sh = WF.runs.get(runId); if (!sh) return;
    const base = { v: 1, run_id: runId, workflow: run.workflow, name: run.name, total: n, ts: Date.now() / 1000 };
    sh.steps.forEach((x, i) => {
      const mine = run.steps[i]; if (!mine || mine.state === x.state) return;
      const one = { ...base, step_id: x.id, n: i + 1, kind: x.kind, title: x.title };
      if (mine.state === 'pending' && x.state !== 'pending') q.push({ ...one, type: 'step.started', attempt: x.attempts || 1 });
      if (x.state === 'done') q.push({ ...one, type: 'step.completed', ms: x.ms, score: x.score, preview: x.preview, artifact: x.artifact });
      else if (x.state === 'skipped') q.push({ ...one, type: 'step.skipped' });
      else if (x.state === 'failed' || x.state === 'denied') q.push({ ...one, type: 'step.failed', reason: (x.errors || []).slice(-1)[0] || '' });
    });
    if (!ACTIVE(sh.state) && ACTIVE(run.state)) q.push({ ...base, type: sh.state === 'done' ? 'run.completed' : sh.state === 'failed' ? 'run.failed' : 'run.stopped', state: sh.state, report: sh.report, reason: sh.reason, budget_used: sh.budget_used, ts: sh.ended || base.ts });
    if (q.length) pump();
  };
  const iv = setInterval(() => { hud(); resync(); }, 1000);

  /* ---------- sterowanie ---------- */
  const setSnd = v => { audio.set(v); sndB.textContent = audio.on ? '🔊' : '🔇'; sndB.setAttribute('aria-label', audio.on ? 'Wycisz ścieżkę dźwiękową' : 'Włącz ścieżkę dźwiękową'); sndB.title = (audio.on ? 'Wycisz' : 'Włącz dźwięk') + ' (M)'; };
  setSnd(!J.sfx?.muted?.());
  sndB.onclick = () => setSnd(!audio.on);
  skipB.onclick = () => { ff = true; waker?.(); };
  $('[data-a=close]').onclick = () => close();
  const onKey = ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(); return; }
    if ((ev.key === 'm' || ev.key === 'M') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); setSnd(!audio.on); }
    ev.stopPropagation();   // skróty pulpitu nie działają pod kinem
  };
  window.addEventListener('keydown', onKey, true);
  addEventListener('resize', resize);

  const close = () => {
    if (!alive) return; alive = false;
    waker?.(); offEv(); clearInterval(iv); clearTimeout(subT); cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true); removeEventListener('resize', resize);
    audio.stop(); if (spoke) J.voice?.stop?.();
    document.body.classList.remove('cin-under');
    el.classList.add('out'); setTimeout(() => el.remove(), still ? 0 : 560);
    if (cur?.el === el) cur = null;
    try { prevFocus?.focus?.(); } catch (e) { /* element zniknął */ }
    J.emit('cinema', { open: false, id: runId });
  };

  el.focus();
  raf = requestAnimationFrame(frame);
  hud(); pump();
  J.emit('cinema', { open: true, id: runId, live });
  return { el, close, live, get queue() { return q.length; } };
};

const C = WF.cinema = {
  get active() { return !!cur; },
  get live() { return !!cur?.live; },
  /* otwiera projekcję przebiegu: na żywo, gdy trwa (chyba że o.film), inaczej film z zapisu zdarzeń */
  async open(runId, o = {}) {
    if (typeof document === 'undefined' || !document.body?.appendChild) return false;
    if (cur) cur.close();
    const base = WF.runs.get(runId);
    let snap = null, evs = null;
    try { snap = await api('/workflows/runs/' + encodeURIComponent(runId), { timeout: 8000 }); } catch (e) { /* most niedostępny — stan z karty */ }
    const src = snap ? { ...(base || {}), ...snap, inputs: snap.inputs || base?.inputs } : base;
    if (!src || !Array.isArray(src.steps)) { J.toast?.('Nie ma takiego przebiegu.', 3000); return false; }
    const live = !o.film && ACTIVE(src.state);
    if (!live) {
      try { evs = ((await api('/workflows/runs/' + encodeURIComponent(runId) + '?events=1', { timeout: 10000 })).events || []).filter(e => e.type !== 'run.snapshot'); } catch (e) { evs = null; }
      if (!evs?.some(e => e.type === 'run.started')) evs = synth(src);
    }
    cur = mount(src, live ? null : evs, o);
    return true;
  },
  close() { cur?.close(); },
  _t: { roman, timecode, layout, holdMs, pace, filmLength, synth, credits, doneLine, stateLine, firstSentence, ideaOf, projectName, D }
};
})();
