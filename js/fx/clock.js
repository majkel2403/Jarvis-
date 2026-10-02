/* =========================================================
   JARVIS OS — warstwa efektów: zegar (clock)

   Efekty sygnaturowe z biblioteki mają własny requestAnimationFrame wewnątrz
   `runSignature` — to konstrukcja biblioteki, jej nie ruszamy. Ten zegar
   jest dla **silnika efektów** (EffectDefinition.start + handle.frame),
   który potrzebuje wspólnego źródła czasu.

   Zasada (D4): żadna własna pętla rAF. Zegar jest zasilany klatką pętli
   głównej aplikacji — `js/main.js` wywołuje `J.fx.frame(now)` raz na klatkę.
   Gdybyśmy dorzucili drugie rAF, obciążyłoby to pomiar FPS, a ten sam
   mechanizm (`J.fx.lower()` po 5 s poniżej 30 FPS) obniżyłby jakość
   całej aplikacji — w tym naszej warstwy.
   ========================================================= */
'use strict';
(() => {

const subs = new Set();
let last = 0;
let running = false;

/** Zwraca czas (ms) od ostatniej klatki — 0 w pierwszej. */
const subscribe = fn => {
  subs.add(fn);
  return () => subs.delete(fn);
};

/** Wywoływane raz na klatkę z pętli głównej aplikacji. */
const frame = now => {
  const delta = last ? Math.min(250, now - last) : 16.667;
  last = now;
  if (!subs.size) return;
  running = true;
  for (const fn of [...subs]) {
    try { fn(now, delta); } catch (e) { console.error('[fx:clock]', e); }
  }
};

/** Zatrzymanie klatki (karta w tle) zeruje różnicę, żeby po powrocie
    efekty nie dostały jednego skoku o wielkości całej przerwy. */
const pause = () => { last = 0; };
const resume = () => { last = 0; running = true; };

J.fxClock = { subscribe, frame, pause, resume, isRunning: () => running, get subscriberCount() { return subs.size; } };
})();
