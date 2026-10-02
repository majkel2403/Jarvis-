'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — data (4)
   GENEROWANE z katalog/01-signature-fx/data/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: data.chart, data.heatmap, data.network, data.orbit-kpi */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.data = J.fxEffects.data || [];
const { blit, clear, glowSprite, strokePath } = J.fxDraw;
const { rgba } = J.fxPal;
const { clamp, ease, envelope, noise2, seg } = J.fxRt;
J.fxEffects.data.push(
    /* ── chart */
    (() => {
  // Extracted from src/effects/signature/fx-data.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const chart = {
      id: "data.chart",
      family: "data",
      title: "Wykres wzrostu",
      blurb: "Obok kuli rysuje się wykres z gradientem pod linią; punkt biegnie po krzywej, licznik rośnie, badge +%.",
      durationMs: 3400,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const w = Math.min(c.W * 0.32, or * 5);
          const h = or * 2.2;
          const x0 = Math.min(c.W - w - 30, ox + or * 2.2);
          const y0 = oy - h / 2;
          const N = 28;
          const vals = Array.from({ length: N }, (_, i) => clamp(0.15 + (i / N) * 0.65 + noise2(i * 0.4, 7) * 0.35, 0.05, 0.98));
          const pts = vals.map((v, i) => ({ x: x0 + (i / (N - 1)) * w, y: y0 + h - v * h }));
          const head = glowSprite(c.pal.core, 48);
          const label = c.el("div", `position:absolute;left:${x0}px;top:${y0 - 34}px;font:800 22px ${MONO};color:${c.pal.core};text-shadow:0 0 12px ${c.pal.a};`);
          const badge = c.el("div", `position:absolute;left:${x0 + w - 70}px;top:${y0 - 36}px;padding:3px 10px;border-radius:999px;background:${rgba(c.pal.a, 0.25)};border:1px solid ${c.pal.a};font:700 13px ${MONO};color:${c.pal.core};opacity:0;`, "+38%");
          c.track(badge.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 0, offset: 0.62 }, { opacity: 1, transform: "scale(1.15)", offset: 0.7 }, { opacity: 1, transform: "scale(1)", offset: 0.9 }, { opacity: 0 }], { duration: c.durationMs, fill: "both", easing: "cubic-bezier(.2,1.6,.4,1)" }));
          c.loop((t) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.08, 0.15);
              g.globalAlpha = env;
              g.strokeStyle = rgba(c.pal.a, 0.18);
              g.lineWidth = 1;
              for (let k = 0; k <= 4; k++) {
                  g.beginPath();
                  g.moveTo(x0, y0 + (h * k) / 4);
                  g.lineTo(x0 + w, y0 + (h * k) / 4);
                  g.stroke();
              }
              const p = ease.inOutCubic(seg(t, 0.08, 0.65));
              const n = p * (N - 1);
              const i0 = Math.floor(n);
              const vis = pts.slice(0, i0 + 1);
              if (i0 < N - 1) {
                  const a = pts[i0];
                  const b = pts[i0 + 1];
                  const k = n - i0;
                  vis.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
              }
              const last = vis[vis.length - 1];
              const grad = g.createLinearGradient(0, y0, 0, y0 + h);
              grad.addColorStop(0, rgba(c.pal.a, 0.45));
              grad.addColorStop(1, rgba(c.pal.a, 0));
              g.fillStyle = grad;
              g.beginPath();
              g.moveTo(x0, y0 + h);
              vis.forEach((q) => g.lineTo(q.x, q.y));
              g.lineTo(last.x, y0 + h);
              g.closePath();
              g.fill();
              g.globalCompositeOperation = "lighter";
              strokePath(g, vis, c.pal.a, 8, 0.25 * env);
              strokePath(g, vis, c.pal.c, 2.5, env);
              blit(g, head, last.x, last.y, 16, env);
              g.globalCompositeOperation = "source-over";
              g.globalAlpha = 1;
              label.textContent = `${Math.round(1200 + p * 3480).toLocaleString("pl-PL")} pkt`;
              label.style.opacity = String(env);
          });
      },
  };
      return chart;
    })(),
    /* ── heatmap */
    (() => {
  // Extracted from src/effects/signature/fx-data.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const heatmap = {
      id: "data.heatmap",
      family: "data",
      title: "Fala mapy ciepła",
      blurb: "Cały ekran zamienia się w siatkę komórek, przez którą przetacza się kolorowa fala danych od kuli.",
      durationMs: 3200,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const s = c.lite ? 48 : 30;
          const { x: ox, y: oy } = c.anchors.orb;
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.12, 0.25);
              for (let y = 0; y < c.H; y += s)
                  for (let x = 0; x < c.W; x += s) {
                      const d = Math.hypot(x + s / 2 - ox, y + s / 2 - oy);
                      const front = t * Math.hypot(c.W, c.H) * 1.3;
                      if (d > front)
                          continue;
                      const v = 0.5 + 0.5 * Math.sin(d * 0.025 - ms * 0.006) * (0.6 + 0.4 * noise2(x * 0.01, y * 0.01));
                      const hue = c.pal.hue - 60 + v * 120;
                      const sz = (s - 4) * (0.35 + 0.65 * v);
                      g.fillStyle = `hsla(${hue} 85% ${35 + v * 30}% / ${0.55 * env * clamp((front - d) / 120)})`;
                      g.beginPath();
                      g.roundRect(x + (s - sz) / 2, y + (s - sz) / 2, sz, sz, 4);
                      g.fill();
                  }
          });
      },
  };
      return heatmap;
    })(),
    /* ── network */
    (() => {
  // Extracted from src/effects/signature/fx-data.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const network = {
      id: "data.network",
      family: "data",
      title: "Graf powiązań",
      blurb: "Węzły wyskakują jeden po drugim, sprężyny układają graf sił, a pakiety biegną po krawędziach.",
      durationMs: 4000,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy } = c.anchors.orb;
          const nodes = [{ x: ox, y: oy, vx: 0, vy: 0, at: 0, r: 9 }];
          const edges = [];
          const count = c.n(46);
          for (let i = 1; i < count; i++) {
              const parent = Math.floor(Math.pow(Math.random(), 1.6) * i);
              const a = c.rand(Math.PI * 2);
              nodes.push({ x: nodes[parent].x + Math.cos(a) * 30, y: nodes[parent].y + Math.sin(a) * 30, vx: 0, vy: 0, at: (i / count) * 0.5, r: c.rand(3, 7) });
              edges.push([parent, i]);
              if (Math.random() < 0.25 && i > 3)
                  edges.push([i, Math.floor(c.rand(i))]);
          }
          const spr = glowSprite(c.pal.c, 48);
          const pk = glowSprite(c.pal.core, 24);
          c.loop((t, ms, dt) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.02, 0.18);
              const live = nodes.filter((n) => t >= n.at);
              for (let i = 0; i < live.length; i++) {
                  const a = live[i];
                  for (let j = i + 1; j < live.length; j++) {
                      const b = live[j];
                      const dx = b.x - a.x;
                      const dy = b.y - a.y;
                      const d2 = dx * dx + dy * dy + 0.01;
                      const f = 2200 / d2;
                      a.vx -= dx * f * 0.01;
                      a.vy -= dy * f * 0.01;
                      b.vx += dx * f * 0.01;
                      b.vy += dy * f * 0.01;
                  }
              }
              for (const [i, j] of edges) {
                  const a = nodes[i];
                  const b = nodes[j];
                  if (t < b.at || t < a.at)
                      continue;
                  const dx = b.x - a.x;
                  const dy = b.y - a.y;
                  const d = Math.hypot(dx, dy) || 1;
                  const f = (d - 150) * 0.004;
                  a.vx += (dx / d) * f * d * 0.1;
                  a.vy += (dy / d) * f * d * 0.1;
                  b.vx -= (dx / d) * f * d * 0.1;
                  b.vy -= (dy / d) * f * d * 0.1;
                  g.strokeStyle = rgba(c.pal.a, 0.22 * env);
                  g.lineWidth = 5;
                  g.beginPath();
                  g.moveTo(a.x, a.y);
                  g.lineTo(b.x, b.y);
                  g.stroke();
                  g.strokeStyle = rgba(c.pal.c, 0.85 * env);
                  g.lineWidth = 1.6;
                  g.beginPath();
                  g.moveTo(a.x, a.y);
                  g.lineTo(b.x, b.y);
                  g.stroke();
                  const u = (ms * 0.0009 + i * 0.37 + j * 0.11) % 1;
                  blit(g, pk, a.x + dx * u, a.y + dy * u, 5, env);
              }
              for (const [k, n] of nodes.entries()) {
                  if (t < n.at)
                      continue;
                  if (k === 0) {
                      n.x = ox;
                      n.y = oy;
                  }
                  else {
                      n.vx = (n.vx + (ox - n.x) * 0.0006) * Math.pow(0.82, dt);
                      n.vy = (n.vy + (oy - n.y) * 0.0006) * Math.pow(0.82, dt);
                      n.x += n.vx * dt;
                      n.y += n.vy * dt;
                  }
                  const pop = ease.outBack(clamp((t - n.at) / 0.06));
                  blit(g, spr, n.x, n.y, n.r * 2.4 * pop, env);
              }
          });
      },
  };
      return network;
    })(),
    /* ── orbit-kpi */
    (() => {
  // Extracted from src/effects/signature/fx-data.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const KPI = [
      ["ZADANIA", 128, ""],
      ["TOKENY", 18.4, "k"],
      ["SKUTECZNOŚĆ", 97, "%"],
      ["CZAS", 1.8, "s"],
      ["AGENCI", 6, ""],
  ];
  const orbitKpi = {
      id: "data.orbit-kpi",
      family: "data",
      title: "Orbita wskaźników",
      blurb: "Karty KPI krążą po elipsie wokół kuli z głębią 3D, liczby rosną w trakcie obrotu.",
      durationMs: 4200,
      weight: "accent",
      run(c) {
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const g = c.canvas();
          const cards = KPI.map(([label]) => {
              const el = c.el("div", `position:absolute;left:0;top:0;width:160px;padding:10px 14px;border-radius:14px;border:1px solid ${rgba(c.pal.c, 0.8)};background:linear-gradient(160deg, ${rgba(c.pal.a, 0.45)}, rgba(2,6,23,.9));box-shadow:0 0 30px ${rgba(c.pal.a, 0.6)}, inset 0 0 18px ${rgba(c.pal.a, 0.25)};backdrop-filter:blur(4px);font:600 11px ${MONO};letter-spacing:.14em;color:${c.pal.c};`);
              c.el("div", "", label, el);
              const v = c.el("div", `font:800 30px ${MONO};letter-spacing:0;color:${c.pal.core};margin-top:2px;text-shadow:0 0 14px ${c.pal.a};`, "0", el);
              return { el, v };
          });
          const RX = Math.min(or * 4.2, c.W * 0.4);
          const RY = or * 1.1;
          const dot = glowSprite(c.pal.core, 32);
          c.loop((t, ms) => {
              const env = envelope(t, 0.12, 0.15);
              const spread = ease.outBack(seg(t, 0, 0.25));
              clear(g, c.W, c.H);
              g.globalAlpha = env;
              g.strokeStyle = rgba(c.pal.a, 0.25);
              g.lineWidth = 10;
              g.beginPath();
              g.ellipse(ox, oy, RX * spread, RY * spread, 0, 0, Math.PI * 2);
              g.stroke();
              g.strokeStyle = rgba(c.pal.c, 0.9);
              g.lineWidth = 2;
              g.setLineDash([14, 8]);
              g.lineDashOffset = -ms * 0.05;
              g.stroke();
              g.setLineDash([]);
              cards.forEach((cd, i) => {
                  const a = ms * 0.0011 + (i / cards.length) * Math.PI * 2;
                  const z = Math.sin(a);
                  const cx = ox + Math.cos(a) * RX * spread;
                  const cy = oy + z * RY * spread;
                  const x = cx - 80;
                  const y = cy - 32;
                  const beam = g.createLinearGradient(ox, oy, cx, cy);
                  beam.addColorStop(0, rgba(c.pal.core, 0.9 * env));
                  beam.addColorStop(1, rgba(c.pal.a, 0.1 * env));
                  g.globalAlpha = 0.5 + (z + 1) * 0.25;
                  g.strokeStyle = beam;
                  g.lineWidth = 2;
                  g.beginPath();
                  g.moveTo(ox, oy);
                  g.lineTo(cx, cy);
                  g.stroke();
                  const u = (ms * 0.0015 + i * 0.25) % 1;
                  blit(g, dot, ox + (cx - ox) * u, oy + (cy - oy) * u, 8, env);
                  const sc = 0.7 + (z + 1) * 0.22;
                  cd.el.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;
                  cd.el.style.zIndex = String(Math.round((z + 1) * 10));
                  cd.el.style.opacity = String(env * (0.45 + (z + 1) * 0.28));
                  cd.el.style.filter = z < 0 ? `blur(${(-z * 2).toFixed(1)}px)` : "none";
                  const [, val, unit] = KPI[i];
                  const p = ease.outCubic(seg(t, 0.1, 0.7));
                  cd.v.textContent = `${Number.isInteger(val) ? Math.round(val * p) : (val * p).toFixed(1)}${unit}`;
              });
          });
      },
  };
      return orbitKpi;
    })(),
  );
})();
