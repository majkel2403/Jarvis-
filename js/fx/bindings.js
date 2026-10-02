/* =========================================================
   JARVIS OS — warstwa efektów: powiązania zdarzeń

   Biblioteka `jarvis-efekty` ma własne słownictwo zdarzeń (`run.started`,
   `node.completed`, `note.added`…). Ta aplikacja ma inne (`task.created`,
   `tool.completed`, `notes`…). To jest warstwa tłumaczenia — jedyne miejsce,
   w którym znajomość obu słowników jest potrzebna.

   Kanały (przedrostek w polu `on`):
     ev:…   → J.ev  (zdarzenia agenta; payload zagnieżdżony pod e.payload)
     ui:…   → J.on  (odświeżenia widoków; payload płaski)
     sys:…  → zdarzenia systemowe przeglądarki (visibilitychange, online/offline)

   Dwa zdarzenia UI nie niosą informacji o tym, CO się stało, tylko że
   „coś się zmieniło” — `notes` i `wm`. Dla nich stosujemy **adapter
   bezingerencyjny**: pamiętamy poprzednią długość listy / liczbę okien
   i odtwarzamy efekt tylko przy wzroście. Dzięki temu nie musimy ruszać
   `js/apps.js` ani `js/core.js`.

   Wyjątek: `chat.message` — aplikacja nie emituje nic przy nowej wiadomości
   użytkownika, więc `js/ai.js` dostał jeden precyzyjny `J.emit('chat.message')`
   w miejscu, gdzie wiadomość faktycznie powstaje.

   Wagi z biblioteki: hero (wyłączny) · accent (na wierzchu) · micro (throttle).
   ========================================================= */
'use strict';
(() => {

/* Katalog powiązań. Utrzymywany ręcznie i pilnowany testem fx-bindings.test.js. */
const BINDINGS = [
  /* ---- cykl życia aplikacji ---- */
  { on: 'ui:fx-boot', fx: 'hud.boot-sequence' },

  /* ---- zadania (J.ev) ---- */
  { on: 'ev:task.created', fx: 'orb.charge-up' },
  { on: 'ev:task.completed', fx: 'success.trophy', opts: () => ({ palette: 'emerald' }) },
  { on: 'ev:task.completed', fx: 'success.gold-rain', opts: () => ({ palette: 'solar', intensity: .7 }) },
  { on: 'ev:task.failed', fx: 'glitch.failure', opts: () => ({ palette: 'alert' }) },
  { on: 'ev:task.cancelled', fx: 'transition.blinds', opts: () => ({ intensity: .6 }) },

  /* ---- wstrzymanie i zgody ---- */
  { on: 'ev:approval.requested', fx: 'orb.sonar', throttleMs: 4000, opts: () => ({ intensity: .6 }) },
  { on: 'ev:task.paused', fx: 'orb.sonar', throttleMs: 4000, opts: () => ({ intensity: .6 }) },

  /* ---- narzędzia (węzły) ---- */
  { on: 'ev:tool.started', fx: 'hud.circuit', throttleMs: 1500, opts: () => ({ intensity: .7 }) },
  { on: 'ev:tool.completed', fx: 'orb.lightning-crown', throttleMs: 2200, opts: () => ({ intensity: .8 }) },
  { on: 'ev:tool.failed', fx: 'screen.lockdown', throttleMs: 4000, opts: () => ({ palette: 'alert', intensity: .5 }) },

  /* ---- rozmowa ---- */
  { on: 'ev:model.started', fx: 'hud.spectrum', throttleMs: 3500, opts: () => ({ intensity: .7 }) },
  { on: 'ui:chat.message', fx: 'text.decode', throttleMs: 3000, when: e => e && e.role === 'user', opts: () => ({ text: 'PRZYJĘTO', intensity: .8 }) },

  /* ---- notatki i zadania (adapter długości listy) ---- */
  { on: 'ui:notes', fx: 'particles.confetti', count: 'notes', opts: () => ({ palette: 'solar', intensity: .55 }) },
  { on: 'ui:tasks', fx: 'data.chart', count: 'tasks', opts: () => ({ palette: 'violet', intensity: .7 }) },

  /* ---- okna (adapter liczby okien) ---- */
  { on: 'ui:wm', fx: 'screen.iris', count: 'windows', throttleMs: 2500, opts: () => ({ intensity: .6 }) },

  /* ---- jakość i połączenie ---- */
  { on: 'ui:fx', fx: 'transition.hex-wipe', when: () => true },
  { on: 'sys:offline', fx: 'glitch.vhs', opts: () => ({ palette: 'alert' }) },
  { on: 'sys:online', fx: 'screen.shockwave', opts: () => ({ palette: 'emerald', intensity: .8 }) },

  /* ---- środowisko ---- */
  { on: 'sys:visibility', fx: 'orb.charge-up', opts: () => ({ intensity: .7 }) },
  { on: 'ui:pointer', fx: 'pointer.comet', throttleMs: 6000, opts: () => ({ intensity: .7 }) },

  /* ---- powiadomienia ---- */
  { on: 'ui:market-alert', fx: 'success.level-up', throttleMs: 2000, opts: () => ({ palette: 'emerald' }) },
  { on: 'ui:task-due', fx: 'success.level-up', throttleMs: 2000, opts: () => ({ palette: 'emerald' }) },
  { on: 'ui:task-overdue', fx: 'screen.lockdown', throttleMs: 2000, opts: () => ({ palette: 'alert', intensity: .6 }) },
];

/* ---------- liczniki dla zdarzeń bez payloadu znaczeniowego ---------- */
const counters = { notes: -1, tasks: -1, windows: -1 };

const readCount = kind => {
  if (kind === 'notes') return J.notes?.live?.().length ?? 0;
  if (kind === 'tasks') return J.tasks?.live?.().length ?? (Array.isArray(J.state?.tasks) ? J.state.tasks.length : 0);
  if (kind === 'windows') return document.querySelectorAll('.window').length;
  return 0;
};

/* ---------- instalacja ---------- */
let unsubs = [];
let installed = false;
let lastQuality = null;
let pointerTimer = 0;

const play = (id, opts) => J.fxLayer?.play?.(id, opts) ?? false;

function wire() {
  const lastAt = new Map();
  const off = [];

  const fire = (b, payload) => {
    if (!J.fxLayer) return;
    // licznik: efekt tylko przy wzroście (dodanie notatki / zadania / otwarcie okna)
    if (b.count) {
      const n = readCount(b.count);
      const grew = counters[b.count] < 0 || n > counters[b.count];
      counters[b.count] = n;
      if (!grew) return;
    }
    if (b.when && !b.when(payload)) return;
    if (b.throttleMs) {
      const now = performance.now();
      if (now - (lastAt.get(b) ?? -Infinity) < b.throttleMs) return;
      lastAt.set(b, now);
    }
    play(b.fx, b.opts ? b.opts(payload) : undefined);
  };

  for (const b of BINDINGS) {
    const [chan, name] = b.on.split(':');
    if (chan === 'ev') {
      if (typeof J.ev?.on === 'function') off.push(J.ev.on(name, e => fire(b, e.payload)));
    } else if (chan === 'ui') {
      if (typeof J.on === 'function') off.push(J.on(name, d => fire(b, d)));
    }
  }

  /* jakość: hex-wipe tylko gdy poziom faktycznie się zmienił */
  if (typeof J.on === 'function') {
    off.push(J.on('fx', level => {
      if (lastQuality === null) { lastQuality = level; return; }
      if (lastQuality === level) return;
      lastQuality = level;
      fire(BINDINGS.find(x => x.on === 'ui:fx'), { level });
    }));
  }

  /* sieć */
  const onNet = () => fire({ fx: navigator.onLine ? 'screen.shockwave' : 'glitch.vhs', opts: () => navigator.onLine ? ({ palette: 'emerald', intensity: .8 }) : ({ palette: 'alert' }) }, null);
  addEventListener('offline', onNet);
  addEventListener('online', onNet);

  /* karta w tle → kula się ładuje przy powrocie */
  const onVis = () => { if (!document.hidden) fire(BINDINGS.find(x => x.on === 'sys:visibility'), null); };
  document.addEventListener('visibilitychange', onVis);

  /* kursor: kometa tylko gdy kursor faktycznie się porusza */
  const onMove = () => {
    const now = performance.now();
    if (now - pointerTimer < 1500) return;
    pointerTimer = now;
    fire(BINDINGS.find(x => x.on === 'ui:pointer'), null);
  };
  addEventListener('pointermove', onMove, { passive: true });

  return { off, detach: () => { removeEventListener('offline', onNet); removeEventListener('online', onNet); document.removeEventListener('visibilitychange', onVis); removeEventListener('pointermove', onMove); } };
}

/**
 * Podpina powiązania. Leniwa i idempotentna — powtórne wywołanie nie tworzy
 * drugiej subskrypcji. Wołana z `js/fx/index.js` przy pierwszym odtworzeniu
 * oraz jawnie po `main.js`.
 */
function install() {
  if (installed) return true;
  // snapshot początkowych liczników, żeby pierwsze zdarzenie nie wyglądało jak wzrost
  for (const k of Object.keys(counters)) counters[k] = readCount(k);
  const w = wire();
  unsubs = w.off;
  installed = true;
  J.fxBindings._detachDom = w.detach;
  return true;
}

function uninstall() {
  if (!installed) return false;
  unsubs.forEach(u => { try { u(); } catch { /* już odłączony */ } });
  unsubs = [];
  J.fxBindings._detachDom?.();
  installed = false;
  return true;
}

J.fxBindings = {
  BINDINGS,
  install,
  uninstall,
  get installed() { return installed; },
  /** Do testów i audytu: komplet powiązań wraz z docelowym id efektu. */
  list() { return BINDINGS.map(b => ({ on: b.on, fx: b.fx, throttleMs: b.throttleMs || 0 })); },
  /** Do testów: wywołanie powiązania bez zdarzenia systemowego. */
  fire(on, payload) {
    const b = BINDINGS.find(x => x.on === on);
    if (!b) return false;
    counters.notes = -1; counters.tasks = -1; counters.windows = -1;   // test nie chce adaptera
    const wasInstalled = installed;
    if (!wasInstalled) install();
    const r = play(b.fx, b.opts ? b.opts(payload) : undefined);
    if (!wasInstalled) uninstall();
    return r;
  },
};

/* Instalacja zachłanna — nie czekamy na pierwsze ręczne `play()`.
   Inaczej `fx-boot` (który leci w trakcie startu, zanim cokolwiek
   zostanie odtworzone) przeszedłby bez efektu. `install()` jest i tak
   idempotentna, więc wywołanie z `J.fxLayer.play()` nic nie psuje.
   J.fxLayer jest już zdefiniowane — ten skrypt ładuje się po index.js. */
install();

})();
