'use strict';
/* =========================================================
   JARVIS OS — Palety kolorów
   GENEROWANE z katalog/01-signature-fx/_runtime/palettes.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
(() => {

const PALETTES = {
    arc: { id: "arc", label: "Arc", a: "#38bdf8", b: "#22d3ee", c: "#a5f3fc", core: "#f0fdff", hue: 198 },
    violet: { id: "violet", label: "Violet", a: "#a78bfa", b: "#f472b6", c: "#e9d5ff", core: "#fdf4ff", hue: 262 },
    solar: { id: "solar", label: "Solar", a: "#f59e0b", b: "#f97316", c: "#fde68a", core: "#fffbeb", hue: 38 },
    alert: { id: "alert", label: "Alert", a: "#ef4444", b: "#f97316", c: "#fecaca", core: "#fff1f2", hue: 0 },
    emerald: { id: "emerald", label: "Emerald", a: "#34d399", b: "#2dd4bf", c: "#bbf7d0", core: "#f0fdf4", hue: 155 },
};
const PALETTE_IDS = Object.keys(PALETTES);
function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
}
J.fxPal = { PALETTES, PALETTE_IDS, hexToRgb, rgba };
})();
