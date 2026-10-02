'use strict';
/* =========================================================
   JARVIS OS — Renderer DOM/CSS silnika efektów
   GENEROWANE z katalog/02-engine-effects/_runtime/dom.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
(() => {

// Copy of src/effects/renderers/css/dom.ts.
/** Small DOM helpers shared by the CSS/SVG effect renderer. */
function centerWithin(el, container) {
    const a = el.getBoundingClientRect();
    const b = container.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, size: Math.min(a.width, a.height) };
}
function spawn(parent, style, className = "") {
    const el = document.createElement("div");
    el.className = `pointer-events-none absolute ${className}`;
    Object.assign(el.style, style);
    parent.appendChild(el);
    return el;
}
/** Runs animations and returns a stop() that cancels them and removes spawned nodes. */
function track(animations, spawned = []) {
    const list = animations.filter(Boolean);
    const remove = () => spawned.forEach((n) => n.remove());
    Promise.all(list.map((a) => a.finished)).then(remove, remove);
    return {
        stop() {
            list.forEach((a) => a.cancel());
            remove();
        },
    };
}
function viewportCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}
/** Defers an effect body (e.g. until a panel has mounted) while staying cancellable. */
function later(ms, body) {
    let inner;
    const timer = setTimeout(() => (inner = body()), ms);
    return {
        stop() {
            clearTimeout(timer);
            inner?.stop();
        },
    };
}
/** Jagged points between two positions, for lightning arcs. */
function boltPoints(x1, y1, x2, y2, segments = 9, jitter = 14) {
    const pts = [];
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    const len = Math.hypot(nx, ny) || 1;
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const off = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * 2 * jitter;
        pts.push(`${x1 + (x2 - x1) * t + (nx / len) * off},${y1 + (y2 - y1) * t + (ny / len) * off}`);
    }
    return pts.join(" ");
}
const SVG_NS = "http://www.w3.org/2000/svg";
const canAnimate = (el) => typeof el === "object" && el !== null && typeof el.animate === "function";
J.fxDom = { SVG_NS, boltPoints, canAnimate, centerWithin, later, spawn, track, viewportCenter };
})();
