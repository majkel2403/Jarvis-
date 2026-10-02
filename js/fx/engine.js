/* =========================================================
   JARVIS OS — host silnika efektów (Faza 5)

   Biblioteka `jarvis-efekty` ma silnik, którego brakowało w kicie: pliki
   `@/engine/clock`, `@/engine/event-bus` i `@/engine/events` nie istnieją
   w żadnym miejscu zestawu — `zrodla/engine/` po prostu nie ma. Bez nich
   `createEffectEngine` nie startuje, więc 35 efektów z `02-engine-effects`
   było nieosiągalne.

   Zamiast pisać te pliki od zera (a potem utrzymywać drugą ścieżkę zdarzeń),
   podajemy silnikowi adaptery istniejących mechanizmów aplikacji:

     bus    → J.ev   — jest już jednym kanałem zdarzeń agenta; dokument
                      spec/katalog-zdarzen.md zna tylko ten i J.on
     clock  → pętla główna — bez własnego rAF (D4)
     targets→ J.fxTargets — leniwie rozwiązywane, bo panele powstają dynamicznie
     quality→ J.fxQuality  — mapowanie 1:1 na J.fx (D3)

   Silnik jest dodatkiem do warstwy sygnaturowej, nie zamiennikiem: obie
   warstwy mają osobne rejestry i osobne wiązania.
   ========================================================= */
'use strict';
(() => {

/* --- bus: J.ev + J.on za jednym spojrzeniem --------------------------- */
/* Silnik oczekuje `bus.on(nazwa, fn) → unsubscribe`. J.ev ma inne nazwy
   zdarzeń niż J.on, więc dajemy mu oba pod wspólnym prefiksem i tłumaczymy
   tylko tam, gdzie wiązanie korzysta z `when`. */
const EV_NAMES = new Set([
  'task.created', 'task.paused', 'task.resumed', 'task.recovering', 'task.verifying',
  'task.verified', 'task.completed', 'task.failed', 'task.cancelled',
  'model.started', 'model.completed', 'model.failed',
  'tool.started', 'tool.completed', 'tool.failed',
  'plan.created', 'plan.step', 'approval.requested', 'approval.resolved',
]);

const UI_NAMES = new Set([
  'settings', 'notes', 'tasks', 'wm', 'wm-resize', 'fx', 'thread', 'market-alert',
  'task-due', 'task-overdue', 'timer-ended', 'shortcuts', 'app-view', 'signal',
]);

const bus = {
  on(name, fn) {
    if (EV_NAMES.has(name)) return J.ev.on(name, e => fn({ ...e.payload, __type: e.type, __event: e }));
    if (UI_NAMES.has(name)) return J.on(name, d => fn({ ...(d && typeof d === 'object' ? d : {}), __type: name }));
    return () => { };   // nazwa spoza katalogu — efekt po prostu nie dostanie zdarzenia
  },
  emit() { /* silnik nie emituje — zdarzenia pochodzą z aplikacji */ },
};

/* --- powiązania silnika na zdarzeniach aplikacji ---------------------- */
/* Odpowiadają `BINDINGS` z bindings.ts biblioteki, z przemapowanymi nazwami
   (run.* → task.*, node.* → tool.*, chat.* → model.*). `when` sprawdza to,
   co J.ev wystawia w payloadzie. */
const BINDINGS = [
  { on: 'fx-boot', play: 'boot.sequence' },
  { on: 'task.created', play: 'orb.charge' },
  { on: 'task.completed', play: 'orb.energy' },
  { on: 'task.failed', play: 'orb.error' },
  { on: 'task.recovering', play: 'screen.vignette' },
  { on: 'task.paused', play: 'screen.sweep' },
  { on: 'tool.started', play: 'screen.sweep' },
  { on: 'tool.completed', play: 'node.flash' },
  { on: 'model.started', play: 'orb.energy' },
  { on: 'approval.requested', play: 'orb.ping' },
  { on: 'task-due', play: 'screen.brackets' },
  { on: 'task-overdue', play: 'screen.vignette' },
  { on: 'market-alert', play: 'orb.ping' },
  { on: 'signal', play: 'screen.glitch' },
];

/* Silnik sam pilnuje limitu aktywnych i wywłaszczenia (MAX_ACTIVE = 64,
   najniższy priority wypada). Nie powielamy tego w powiązaniach. */
const THROTTLE = { 'screen.sweep': 1500, 'orb.energy': 3500, 'orb.ping': 4000, 'screen.vignette': 5000, 'screen.brackets': 2000, 'node.flash': 1200, 'screen.glitch': 4000 };

let engine = null;

/**
 * Buduje silnik. Leniwa i idempotentna — wywoływana z głównej pętli oraz
 * ręcznie z konsoli.
 */
function ensure() {
  if (engine) return engine;
  if (!J.fxEngineCore?.createEffectEngine) return null;
  const library = (J.fxEngineLib || []).filter(d => d && d.id && typeof d.start === 'function');
  if (!library.length) return null;
  // Efekty kotwiczące się do elementów, których ten pulpit nie ma (węzły
  // Process Logu), same z siebie nic nie robią — `targets.get()` zwraca
  // undefined, a biblioteka kończy pracę. Nie traktujemy tego jako błędu.
  const bound = BINDINGS
    .filter(b => library.some(d => d.id === b.play))
    .map(b => ({ ...b, when: undefined, params: undefined, throttleMs: THROTTLE[b.play] }));
  try {
    engine = J.fxEngineCore.createEffectEngine({
      bus,
      clock: J.fxClock,
      targets: J.fxTargets,
      getQuality: J.fxQuality.getQuality,
      library,
      bindings: bound,
    });
    return engine;
  } catch (e) {
    console.error('[fx:engine]', e);
    return null;
  }
}

J.fxEngine = {
  /** Odtwórz efekt silnika po id (np. 'orb.charge'). */
  play(id, params) { return ensure()?.play(id, params) ?? false; },
  stopAll() { engine?.stopAll(); },
  /** Rejestr silnika: lista { id, minQuality, durationMs }. */
  list() {
    return (J.fxEngineLib || [])
      .filter(d => d && d.id)
      .map(d => ({ id: d.id, minQuality: d.minQuality, durationMs: d.durationMs || 0, target: typeof d.target === 'function' }));
  },
  get activeCount() { return engine?.activeCount ?? 0; },
  get ready() { return !!ensure(); },
  get BINDINGS() { return BINDINGS; },
  ensure,
};

J.on('settings', () => J.fxTokens?.refresh?.());

})();
