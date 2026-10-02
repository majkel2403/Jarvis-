/* =========================================================
   JARVIS OS — warstwa efektów: dźwięki

   13 dźwięków z biblioteki `jarvis-efekty` (katalog/08-audio) to tablice
   nut: `{ freq, at, dur, type, gain, glideTo }`. Plik audio-renderer.ts
   tworzy dla nich własny `AudioContext`.

   My tego NIE robimy. Aplikacja ma już `J.sfx` (js/core.js:188) z jednym
   kontekstem, własną ścieżką wyciszenia i skalą głośności uwzględniającą
   ciszę nocną oraz tryb prezentacji (docs/spec/09-wyglad-stany.md §8).
   Druga instancja AudioContext oznaczałaby dwa niezależne wyciszenia —
   użytkownik wyciszy Jarvis, a sygnały byłyby dalej słyszalne.

   Dlatego te nuty idą przez `J.sfx.tone()`, a kontekst pozostaje jeden.

   Czego świadomie NIE wiążemy (już obsługiwane przez aplikację — inaczej
   słyszalne byłoby podwójne uderzenie):
     widget.opened  → J.sfx.open()   (core.js:530)
     widget.closed  → J.sfx.close()  (core.js:542)
     setting.changed → J.sfx.notify() przy zmianie głośności (apps.js:1272)
     chat.message   → J.sfx.click() przy wysyłaniu

   Zasada dostępności z §9: żaden sygnał dźwiękowy bez odpowiednika
   wizualnego. Każdy dźwięk poniżej ma efekt w js/fx/bindings.js.
   ========================================================= */
'use strict';
(() => {

/* Nuty w formacie biblioteki: { freq, at, dur, type?, gain?, glideTo? } */
const SOUNDS = {
  'run.started': [
    { freq: 520, at: 0, dur: 0.18, type: 'triangle' },
    { freq: 780, at: 0.09, dur: 0.24, type: 'triangle' },
  ],
  'run.completed': [
    { freq: 523.25, at: 0, dur: 0.5 },
    { freq: 659.25, at: 0.08, dur: 0.5 },
    { freq: 783.99, at: 0.16, dur: 0.7 },
    { freq: 1046.5, at: 0.24, dur: 0.8, gain: 0.03 },
  ],
  'run.failed': [
    { freq: 330, at: 0, dur: 0.35, type: 'sawtooth', gain: 0.025, glideTo: 220 },
    { freq: 247, at: 0.2, dur: 0.45, type: 'triangle', gain: 0.04, glideTo: 165 },
  ],
  'node.completed': [
    { freq: 1320, at: 0, dur: 0.06, gain: 0.018 },
  ],
  'note.added': [
    { freq: 988, at: 0, dur: 0.12, gain: 0.025 },
    { freq: 1319, at: 0.07, dur: 0.18, gain: 0.02 },
  ],
  'schedule.added': [
    { freq: 784, at: 0, dur: 0.1, gain: 0.025 },
    { freq: 1175, at: 0.06, dur: 0.16, gain: 0.02 },
  ],
  'schedule.toggled': [
    { freq: 1568, at: 0, dur: 0.09, gain: 0.02 },
  ],
  'schedule.untoggled': [
    { freq: 660, at: 0, dur: 0.09, gain: 0.02 },
  ],
  'widget.pinned': [
    { freq: 700, at: 0, dur: 0.1, gain: 0.02, glideTo: 1050 },
  ],
  'widget.unpinned': [
    { freq: 520, at: 0, dur: 0.1, gain: 0.02, glideTo: 390 },
  ],
  'chat.cleared': [
    { freq: 1400, at: 0, dur: 0.3, type: 'triangle', gain: 0.015, glideTo: 300 },
  ],
  'chat.message': [
    { freq: 600, at: 0, dur: 0.09, gain: 0.012, glideTo: 1200 },
  ],
  'task.due': [
    { freq: 1046, at: 0, dur: 0.1, gain: 0.02 },
    { freq: 1318, at: 0.09, dur: 0.14, gain: 0.02 },
  ],
};

/** Odtwarza tablicę nut przez istniejący syntezator aplikacji. */
function play(notes) {
  if (!notes?.length || typeof J.sfx?.tone !== 'function') return;
  for (const n of notes) {
    J.sfx.tone(n.freq, n.dur, n.type || 'sine', n.gain ?? 0.05, n.at || 0, n.glideTo || 0);
  }
}

/* ---------- wiązania ---------- */
/* Kanały i takie same adaptery długości listy co w bindings.js: `notes` i
   `tasks` palą się przy każdej mutacji, a nas interesuje tylko wzrost. */
const counts = { notes: -1, tasks: -1 };

const readCount = kind => {
  if (kind === 'notes') return J.notes?.live?.().length ?? 0;
  if (kind === 'tasks') return J.tasks?.live?.().length ?? (Array.isArray(J.state?.tasks) ? J.state.tasks.length : 0);
  return 0;
};

const BINDINGS = [
  { on: 'ev:task.created', sound: 'run.started' },
  { on: 'ev:task.completed', sound: 'run.completed' },
  { on: 'ev:task.failed', sound: 'run.failed' },
  { on: 'ev:tool.completed', sound: 'node.completed', throttleMs: 900 },
  { on: 'ui:notes', sound: 'note.added', count: 'notes' },
  { on: 'ui:tasks', sound: 'schedule.added', count: 'tasks' },
  { on: 'ui:task-due', sound: 'task.due', throttleMs: 1500 },
  { on: 'ui:chat.cleared', sound: 'chat.cleared' },
];

let installed = false;
let unsubs = [];
let lastAt = new Map();

function install() {
  if (installed) return true;
  for (const k of Object.keys(counts)) counts[k] = readCount(k);
  for (const b of BINDINGS) {
    const [chan, name] = b.on.split(':');
    const sub = chan === 'ev' ? J.ev?.on(name, e => fire(b, e.payload)) : J.on?.(name, d => fire(b, d));
    if (sub) unsubs.push(sub);
  }
  installed = true;
  return true;
}

function fire(b, payload) {
  if (!installed && !install()) return;
  let sound = b.sound;
  if (b.count) {
    const n = readCount(b.count);
    const grew = counts[b.count] < 0 || n > counts[b.count];
    counts[b.count] = n;
    if (!grew) return;
  }
  if (b.throttleMs) {
    const now = performance.now();
    if (now - (lastAt.get(b) ?? -Infinity) < b.throttleMs) return;
    lastAt.set(b, now);
  }
  if (b.count === 'tasks' && payload && payload.done === false) sound = 'schedule.untoggled';
  play(SOUNDS[sound]);
}

J.fxAudio = {
  SOUNDS,
  BINDINGS,
  play,
  install,
  uninstall() { unsubs.forEach(u => { try { u(); } catch { /* już odłączony */ } }); unsubs = []; installed = false; },
  get installed() { return installed; },
  /** Do testów: odtwórz dźwięk po nazwie. */
  cue(name) { const n = SOUNDS[name]; if (!n) return false; play(n); return true; },
};

install();

})();
