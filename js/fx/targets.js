/* =========================================================
   JARVIS OS — warstwa efektów: kotwice (targets)

   Rejestr rzeczy, na które efekty potrafią działać: elementy DOM
   oraz obiekty imperatywne (renderer WebGL kuli).

   W odróżnieniu od biblioteki, kotwice DOM rozwiązujemy **leniwie, przy
   każdym `get()`**, a nie raz przy starcie. Aplikacja tworzy i usuwa
   panele, okna i kafelki dynamicznie — trzymanie uchwytów na stałe
   dawałoby martwe elementy.

   Klucze, których nie ma w aplikacji (`node:*`, `line:*`, `ambient`,
   `stage`), zostają niezarejestrowane. Efekty biblioteki same sprawdzają
   `if (!cel) return;`, więc brak kotwicy cicho wyłącza efekt, a nie psuje.
   ========================================================= */
'use strict';
(() => {

/* Selektory odwzorowujące strukturę pulpitu (index.html).
   Celowo tylko jednoznaczne i stabilne — nie klasy, które J.wm dodaje dynamicznie. */
const SELECTORS = {
  orb: '.core-wrap#coreWrap',
  'panel:chat': '.chat-panel#chatPanel',
  'panel:log': '.log-panel#logPanel',
  'panel:widget': '.deck#deck',
  dock: '.dock#dock',
  'fx-layer': '#fxlayer',
  'screen-fx': '#fxlayer',
};

/* Obiekty imperatywne (np. renderer WebGL kuli) — rejestrowane z kodu. */
const live = new Map();
/* Selektory, których wartości nie należy cache'ować — rozwiązywane przy każdym get. */
const selectors = new Map(Object.entries(SELECTORS));

const targets = {
  /** Zarejestruj obiekt imperatywny (renderer, scena). Zwraca funkcję odrejestrującą. */
  set(key, value) {
    live.set(key, value);
    return () => { if (live.get(key) === value) live.delete(key); };
  },

  /** Zarejestruj dodatkowy klucz z selektorem (np. `dock:notes`, `tile:notes`). */
  define(key, selector) {
    selectors.set(key, selector);
  },

  /**
   * Zwraca element (lub obiekt) dla klucza.
   * Kolejność: obiekt zarejestrowany z kodu → selektor → undefined.
   */
  get(key) {
    if (live.has(key)) return live.get(key);
    const sel = selectors.get(key) || (typeof key === 'string' && key.startsWith('dock:') ? '[data-win="' + key.slice(5) + '"]' : null) || (typeof key === 'string' && key.startsWith('tile:') ? '[data-tile="' + key.slice(5) + '"]' : null);
    if (!sel) return undefined;
    const el = document.querySelector(sel);
    return el || undefined;
  },

  /** Czy kotwica istnieje i ma niezerowy rozmiar (efekty animują tylko to, co widać). */
  visible(key) {
    const el = targets.get(key);
    if (!el || typeof el.getClientRects !== 'function') return undefined;
    return el.getClientRects().length ? el : undefined;
  },

  /** Wszystkie zarejestrowe klucze — do diagnostyki i testów. */
  keys() { return [...new Set([...live.keys(), ...selectors.keys()])].sort(); },
};

J.fxTargets = targets;
})();
