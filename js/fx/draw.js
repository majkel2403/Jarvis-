'use strict';
/* =========================================================
   JARVIS OS — Pomocnicze rysowanie (sprite’y, pioruny, ścieżki)
   GENEROWANE z katalog/01-signature-fx/_runtime/draw.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
(() => {

const spriteCache = new Map();
/** Pre-rendered radial glow sprite (cheap to blit hundreds of times per frame). */
function glowSprite(color, size = 64, hard = 0.15) {
    const key = `${color}|${size}|${hard}`;
    const hit = spriteCache.get(key);
    if (hit)
        return hit;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const r = size / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(hard, color);
    grad.addColorStop(0.45, `${color}55`);
    grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    spriteCache.set(key, c);
    return c;
}
function blit(g, sprite, x, y, r, alpha = 1) {
    if (alpha <= 0.002 || r <= 0.1)
        return;
    g.globalAlpha = Math.min(1, alpha);
    g.drawImage(sprite, x - r, y - r, r * 2, r * 2);
    g.globalAlpha = 1;
}
/** Fades previous frame instead of clearing (long-exposure trails). */
function fadeCanvas(g, W, H, amount) {
    const op = g.globalCompositeOperation;
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = `rgba(0,0,0,${amount})`;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = op;
}
function clear(g, W, H) {
    g.clearRect(0, 0, W, H);
}
/** Midpoint-displacement lightning between two points, with optional branches. */
function bolt(a, b, detail = 6, jag = 0.28) {
    let pts = [a, b];
    let off = Math.hypot(b.x - a.x, b.y - a.y) * jag;
    for (let d = 0; d < detail; d++) {
        const next = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
            const p = pts[i];
            const q = pts[i + 1];
            const nx = -(q.y - p.y);
            const ny = q.x - p.x;
            const len = Math.hypot(nx, ny) || 1;
            const s = (Math.random() * 2 - 1) * off;
            next.push({ x: (p.x + q.x) / 2 + (nx / len) * s, y: (p.y + q.y) / 2 + (ny / len) * s }, q);
        }
        pts = next;
        off *= 0.5;
    }
    return pts;
}
function strokePath(g, pts, color, width, alpha = 1) {
    if (pts.length < 2)
        return;
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++)
        g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
    g.globalAlpha = 1;
}
/** Glowing stroke: wide soft pass + bright thin core. */
function glowStroke(g, pts, color, core, width, alpha = 1) {
    strokePath(g, pts, color, width * 6, alpha * 0.12);
    strokePath(g, pts, color, width * 2.5, alpha * 0.35);
    strokePath(g, pts, core, width, alpha);
}
function center(r) {
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
function roundRectPath(g, r, rad) {
    g.beginPath();
    g.roundRect(r.x, r.y, r.w, r.h, rad);
}
/** Text → array of points sampled from rendered glyph pixels. */
function textPoints(text, W, H, size, step) {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.font = `900 ${size}px ui-sans-serif, system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, W / 2, H / 2);
    const data = g.getImageData(0, 0, W, H).data;
    const pts = [];
    for (let y = 0; y < H; y += step)
        for (let x = 0; x < W; x += step)
            if (data[(y * W + x) * 4 + 3] > 128)
                pts.push({ x, y });
    return pts;
}
J.fxDraw = { blit, bolt, center, clear, fadeCanvas, glowSprite, glowStroke, roundRectPath, strokePath, textPoints };
})();
