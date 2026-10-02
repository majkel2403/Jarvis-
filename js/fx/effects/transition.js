'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — transition (4)
   GENEROWANE z katalog/01-signature-fx/transition/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: transition.blinds, transition.hex-wipe, transition.ink, transition.zoom-through */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.transition = J.fxEffects.transition || [];
const { rgba } = J.fxPal;
const { ease, noise2, seg } = J.fxRt;
const { clear } = J.fxDraw;
J.fxEffects.transition.push(
    /* ── blinds */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const blinds = {
      id: "transition.blinds",
      family: "transition",
      title: "Żaluzje",
      blurb: "Poziome lamele obracają się kaskadowo w 3D, zasłaniają pulpit z połyskiem i otwierają się ponownie.",
      durationMs: 2400,
      weight: "accent",
      run(c) {
          const n = 12;
          const h = c.H / n;
          const wrap = c.el("div", "position:absolute;inset:0;perspective:1200px;");
          for (let i = 0; i < n; i++) {
              const s = c.el("div", `position:absolute;left:0;right:0;top:${i * h}px;height:${h + 1}px;background:linear-gradient(180deg, hsl(${c.pal.hue} 40% 22%), hsl(${c.pal.hue} 50% 10%));border-top:1px solid ${rgba(c.pal.c, 0.6)};transform-origin:center;backface-visibility:hidden;overflow:hidden;`, undefined, wrap);
              const shine = c.el("div", "position:absolute;inset:0;background:linear-gradient(100deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%);transform:translateX(-100%);", undefined, s);
              c.track(s.animate([
                  { transform: "rotateX(90deg)", opacity: 0 },
                  { transform: "rotateX(0deg)", opacity: 1, offset: 0.35 },
                  { transform: "rotateX(0deg)", opacity: 1, offset: 0.55 },
                  { transform: "rotateX(-90deg)", opacity: 0 },
              ], { duration: c.durationMs - n * 40, delay: i * 40, fill: "both", easing: "cubic-bezier(.6,0,.3,1)" }));
              c.track(shine.animate([{ transform: "translateX(-100%)" }, { transform: "translateX(100%)" }], { duration: 700, delay: c.durationMs * 0.3 + i * 25, fill: "both" }));
          }
      },
  };
      return blinds;
    })(),
    /* ── hex-wipe */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const hexWipe = {
      id: "transition.hex-wipe",
      family: "transition",
      title: "Fala heksagonów",
      blurb: "Plaster heksagonów odwraca się falą od kuli, zakrywa pulpit i odwraca z powrotem.",
      durationMs: 2600,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const R = c.lite ? 46 : 32;
          const w = Math.sqrt(3) * R;
          const { x: ox, y: oy } = c.anchors.orb;
          const cells = [];
          const maxD = Math.hypot(c.W, c.H);
          for (let row = -1; row * R * 1.5 < c.H + R; row++)
              for (let col = -1; col * w < c.W + w; col++) {
                  const x = col * w + (row % 2 ? w / 2 : 0);
                  const y = row * R * 1.5;
                  cells.push({ x, y, d: Math.hypot(x - ox, y - oy) / maxD });
              }
          const hex = (x, y, r, sx) => {
              g.beginPath();
              for (let i = 0; i < 6; i++) {
                  const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
                  const px = x + Math.cos(a) * r * sx;
                  const py = y + Math.sin(a) * r;
                  if (i)
                      g.lineTo(px, py);
                  else
                      g.moveTo(px, py);
              }
              g.closePath();
          };
          c.loop((t) => {
              clear(g, c.W, c.H);
              for (const cell of cells) {
                  const fin = seg(t, cell.d * 0.35, cell.d * 0.35 + 0.15);
                  const fout = seg(t, 0.55 + cell.d * 0.3, 0.55 + cell.d * 0.3 + 0.15);
                  if (fin <= 0 || fout >= 1)
                      continue;
                  const k = fin < 1 ? fin : 1 - fout;
                  const sx = Math.abs(Math.cos((1 - k) * Math.PI * 0.5));
                  hex(cell.x, cell.y, R - 1.5, sx);
                  const lum = 10 + (1 - cell.d) * 10;
                  g.fillStyle = `hsl(${c.pal.hue} 45% ${fin < 1 || fout > 0 ? lum + 18 : lum}%)`;
                  g.fill();
                  g.strokeStyle = rgba(c.pal.a, 0.8 * k);
                  g.lineWidth = 1.5;
                  g.stroke();
              }
          });
      },
  };
      return hexWipe;
    })(),
    /* ── ink */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const ink = {
      id: "transition.ink",
      family: "transition",
      title: "Atrament",
      blurb: "Krople atramentu zlewają się metaballami (filtr goo), zalewają ekran i cofają się do kuli.",
      durationMs: 3000,
      weight: "accent",
      run(c) {
          const id = `fx-goo-${Math.random().toString(36).slice(2, 8)}`;
          const holder = c.svg("width:0;height:0;position:absolute;");
          holder.innerHTML = `<filter id="${id}"><feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12"/></filter>`;
          const g = c.canvas({ blend: "source-over", css: `filter:url(#${id});` });
          const { x: ox, y: oy } = c.anchors.orb;
          const maxR = Math.hypot(c.W, c.H) * 0.35;
          const blobs = Array.from({ length: c.n(26) }, (_, i) => {
              const a = (i / 26) * Math.PI * 2 + c.rand(0.3);
              const d = i < 4 ? 0 : c.rand(0.2, 1.2) * maxR;
              return { x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d * 0.8, r: c.rand(0.25, 0.6) * maxR, d: (d / maxR) * 0.18, seed: c.rand(100) };
          });
          const inkCol = `hsl(${c.pal.hue} 70% 9%)`;
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              for (const b of blobs) {
                  const grow = ease.inOutCubic(seg(t, b.d, b.d + 0.4));
                  const shrink = ease.inOutCubic(seg(t, 0.55 + (0.18 - b.d) * 0.5, 0.95));
                  const r = b.r * grow * (1 - shrink);
                  if (r < 1)
                      continue;
                  const wob = noise2(b.seed, ms * 0.001) * 20;
                  g.fillStyle = inkCol;
                  g.beginPath();
                  g.arc(b.x + wob, b.y - wob, r, 0, Math.PI * 2);
                  g.fill();
                  g.fillStyle = c.pal.a;
                  g.beginPath();
                  g.arc(b.x + wob + r * 0.15, b.y - wob - r * 0.15, r * 0.08, 0, Math.PI * 2);
                  g.fill();
              }
          });
      },
  };
      return ink;
    })(),
    /* ── zoom-through */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const zoomThrough = {
      id: "transition.zoom-through",
      family: "transition",
      title: "Przelot przez kulę",
      blurb: "Kamera wlatuje w kulę: pulpit rośnie i rozmywa się w smugach, biały błysk, i wraca z drugiej strony.",
      durationMs: 2400,
      weight: "hero",
      run(c) {
          const { x: ox, y: oy } = c.anchors.orb;
          c.scene([
              { transform: "scale(1)", filter: "blur(0)", opacity: 1 },
              { transform: "scale(5)", filter: "blur(10px) brightness(2)", opacity: 0, offset: 0.42 },
              { transform: "scale(0.5)", filter: "blur(8px)", opacity: 0, offset: 0.5 },
              { transform: "scale(1)", filter: "blur(0)", opacity: 1 },
          ], { duration: c.durationMs, easing: "cubic-bezier(.6,0,.4,1)" }, { x: ox, y: oy });
          const flash = c.el("div", `position:absolute;inset:0;background:radial-gradient(circle at ${ox}px ${oy}px, #fff, ${c.pal.c} 30%, ${c.pal.a} 60%, #020617);opacity:0;`);
          c.track(flash.animate([{ opacity: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1, offset: 0.45 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.75 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const g = c.canvas();
          const lines = Array.from({ length: c.n(140) }, () => ({ a: c.rand(Math.PI * 2), r: c.rand(20, 200), v: c.rand(10, 30) }));
          c.loop((t, _ms, dt) => {
              clear(g, c.W, c.H);
              const k = Math.sin(seg(t, 0.15, 0.75) * Math.PI);
              if (k <= 0)
                  return;
              for (const l of lines) {
                  l.r += l.v * dt * (0.5 + k * 2);
                  if (l.r > Math.hypot(c.W, c.H))
                      l.r = c.rand(20, 80);
                  const x1 = ox + Math.cos(l.a) * l.r;
                  const y1 = oy + Math.sin(l.a) * l.r;
                  const x2 = ox + Math.cos(l.a) * (l.r + 40 + k * 140);
                  const y2 = oy + Math.sin(l.a) * (l.r + 40 + k * 140);
                  g.strokeStyle = rgba(c.pal.c, k * 0.8);
                  g.lineWidth = 1.5;
                  g.beginPath();
                  g.moveTo(x1, y1);
                  g.lineTo(x2, y2);
                  g.stroke();
              }
          });
      },
  };
      return zoomThrough;
    })(),
  );
})();
