/* =========================================================
   JARVIS OS — warstwa efektów: jakość (D3)

   Jedyne źródło prawdy o jakości to istniejący `J.fx` (js/main.js).
   Nie budujemy własnego monitora FPS ani własnego wykrywania sprzętu —
   `J.fx.rank()` uwzględnia już ustawienie użytkownika, `prefers-reduced-motion`
   i samoczynne obniżanie po spadku płynności.

   Mapowanie jest 1:1, bo oba systemy mają cztery poziomy:

     J.fx.rank()   J.fx.level()   Quality biblioteki
     0             off            off
     1             tool           low
     2             standard       high
     3             cinema         ultra
   ========================================================= */
'use strict';
(() => {

/** Kolejność poziomów — indeks w tablicy to „wyższy poziom”. */
const QUALITY_ORDER = ['off', 'low', 'high', 'ultra'];

/** Zwraca poziom jakości w formacie biblioteki, czytany NAJŚŻEJ z J.fx. */
const getQuality = () => {
  const rank = typeof J.fx?.rank === 'function' ? J.fx.rank() : 2;
  return QUALITY_ORDER[Math.max(0, Math.min(3, rank))];
};

/** Czy `quality` jest co najmniej tak wysoki jak `min`. */
const atLeast = (quality, min) =>
  QUALITY_ORDER.indexOf(quality) >= QUALITY_ORDER.indexOf(min);

/** Czy cokolwiek w ogóle wolno odtwarzać. */
const enabled = () => getQuality() !== 'off';

/** Czy przeglądarka w ogóle obsługuje WebGL2 — bez tego ctx.gl() zwraca null. */
const supportsWebGL2 = () => {
  if (typeof document === 'undefined') return false;
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
};

J.fxQuality = { QUALITY_ORDER, getQuality, atLeast, enabled, supportsWebGL2 };
})();
