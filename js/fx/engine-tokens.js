/* =========================================================
   JARVIS OS — tokeny kolorów dla silnika efektów

   Biblioteka `jarvis-efekty` ma własną paletę (`zrodla/theme/tokens.ts`).
   Nasza aplikacja ma inną: `css/jarvis.css:7-20` (--accent, --accent2,
   --ok, --warn, --err). Kopiowanie palety biblioteki w złotówkę oznaczałoby,
   że ta sama kula jest niebieska w jednym miejscu i fioletowa w drugim.

   Dlatego ACCENTS czytamy z custom properties aplikacji, a PALETTE wskazuje
   na te same kolory innymi nazwami — jedno źródło prawdy, dwa słowniki.
   Wartości domyślne to kolory aplikacji, gdyby zmienna CSS nie istniała.

   ACCENT_CLASSES (Tailwind) celowo pomijamy: projekt nie używa Tailwinda,
   a klasy przenoszone do JSDOM-a nie miałyby gdzie zadziałać.
   ========================================================= */
'use strict';
(() => {

const cssVar = (name, fallback) => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
};

const hexToRgbStr = hex => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/* ACCENTS/PALETTE to zwykłe napisy, bo tak oczekuje nieprzekształcony kod
   biblioteki (ACCENTS.cyan.soft wchodzi prosto do style.background).
   Wartości odświeża refresh() — przy starcie i przy każdej zmianie ustawień,
   czyli wtedy, gdy aplikacja przestawia --accent. */
const ACCENTS = {
  cyan: { hex: '#33d6ff', rgb: '51 214 255', soft: '#33d6ff' },
  blue: { hex: '#33d6ff', rgb: '51 214 255', soft: '#33d6ff' },
  purple: { hex: '#a25cff', rgb: '162 92 255', soft: '#a25cff' },
};

const PALETTE = {
  night: '#050b1f',
  success: '#3ef0a3',
  danger: '#ff5d7a',
  warning: '#ffb84d',
  orbCore: '#0a1a4d',
  orbRing: '#33d6ff',
  orbRingFast: '#33d6ff',
  orbHighlight: '#33d6ff',
  orbit: '#a25cff',
};

/** Przepisuje tokeny z aktualnych custom properties aplikacji. */
function refresh() {
  const read = (name, fallback) => cssVar(name, fallback);
  ACCENTS.cyan = { hex: read('--accent', ACCENTS.cyan.hex), rgb: hexToRgbStr(read('--accent', ACCENTS.cyan.hex)), soft: read('--accent', ACCENTS.cyan.soft) };
  ACCENTS.blue = { ...ACCENTS.cyan };
  ACCENTS.purple = { hex: read('--accent2', ACCENTS.purple.hex), rgb: hexToRgbStr(read('--accent2', ACCENTS.purple.hex)), soft: read('--accent2', ACCENTS.purple.soft) };
  PALETTE.success = read('--ok', PALETTE.success);
  PALETTE.danger = read('--err', PALETTE.danger);
  PALETTE.warning = read('--warn', PALETTE.warning);
  PALETTE.orbRing = ACCENTS.cyan.hex;
  PALETTE.orbRingFast = ACCENTS.cyan.hex;
  PALETTE.orbHighlight = ACCENTS.cyan.hex;
  PALETTE.orbit = ACCENTS.purple.hex;
  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement.style;
    root.setProperty('--jarvis-night', PALETTE.night);
    root.setProperty('--jarvis-success', PALETTE.success);
    root.setProperty('--jarvis-danger', PALETTE.danger);
    root.setProperty('--jarvis-warning', PALETTE.warning);
    for (const [name, c] of Object.entries(ACCENTS)) {
      root.setProperty(`--jarvis-${name}`, c.hex);
      root.setProperty(`--jarvis-${name}-rgb`, c.rgb);
    }
  }
}

/* Wpisywanie wartości do CSS — wywoływane raz, przy starcie, zamiast tworzyć
   własny zestaw zmiennych równolegle do istniejących. */
function tokensToCssVars() {
  return {
    '--jarvis-night': PALETTE.night,
    '--jarvis-success': PALETTE.success,
    '--jarvis-danger': PALETTE.danger,
    '--jarvis-warning': PALETTE.warning,
    '--jarvis-cyan': ACCENTS.cyan.hex, '--jarvis-cyan-rgb': ACCENTS.cyan.rgb,
    '--jarvis-blue': ACCENTS.blue.hex, '--jarvis-blue-rgb': ACCENTS.blue.rgb,
    '--jarvis-purple': ACCENTS.purple.hex, '--jarvis-purple-rgb': ACCENTS.purple.rgb,
  };
}

J.fxTokens = { ACCENTS, PALETTE, ACCENT_CLASSES: {}, tokensToCssVars, refresh };
refresh();

/* =========================================================
   NODE_BY_ID — rejestr węzłów Process Logu

   Biblioteka zakłada rejestr `node:<id>` z kolorami i wariantami (status).
   W tym pulpicie takiego rejestru nie ma: Process Log ma kroki, nie węzły
   grafu, i nie ma kotwic `node:*` w targets.

   Pusta mapa jest tu PRAWIDŁOWA, nie skrót: pięć efektów z links.ts sprawdza
   `targets.get('node:'+id)` i cicho kończy pracę, gdy celu nie ma
   (biblioteka robi `if (!card) return`). Wypełnienie rejestru danymi
   zmyślonymi tylko po to, by „coś się wyświetliło", włączyłoby efekty
   bez realnego celu. Jeśli kiedyś dojdą węzły — rejestr uzupełni się tutaj.
   ========================================================= */
J.fxNodes = { NODE_BY_ID: Object.create(null) };

})();
