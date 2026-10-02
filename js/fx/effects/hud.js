'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — hud (8)
   GENEROWANE z katalog/01-signature-fx/hud/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: hud.biometric, hud.boot-sequence, hud.circuit, hud.data-windows, hud.radar, hud.spectrum, hud.target-lock, hud.tron-grid */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.hud = J.fxEffects.hud || [];
const { blit, clear, glowSprite, glowStroke, strokePath } = J.fxDraw;
const { rgba } = J.fxPal;
const { clamp, ease, envelope, noise2, seg } = J.fxRt;
J.fxEffects.hud.push(
    /* ── biometric */
    (() => {
  // Extracted from src/effects/signature/fx-hud.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const biometric = {
      id: "hud.biometric",
      family: "hud",
      title: "Skan biometryczny",
      blurb: "Wiązka skanuje odcisk palca rysowany z konturów szumu, zaznacza minucje i potwierdza tożsamość.",
      durationMs: 3600,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const W = Math.min(360, Math.max(220, c.W * 0.26));
          const H = W * 1.28;
          const x0 = Math.min(c.W - W - 28, ox + or * 1.85);
          const y0 = Math.max(40, oy - H * 0.58);
          const cx = x0 + W / 2;
          const cy = y0 + H / 2;
          const ridges = [];
          for (let k = 0; k < 26; k++) {
              const pts = [];
              for (let i = 0; i <= 90; i++) {
                  const a = (i / 90) * Math.PI * 2;
                  const rr = 8 + k * (W / 52);
                  const n = noise2(Math.cos(a) * 1.4 + k * 0.08, Math.sin(a) * 1.4) * rr * 0.25;
                  const x = cx + Math.cos(a) * (rr + n) * 0.82;
                  const y = cy + Math.sin(a) * (rr + n) * 1.05 + k * 1.2;
                  if (x > x0 && x < x0 + W && y > y0 && y < y0 + H)
                      pts.push({ x, y });
                  else if (pts.length) {
                      ridges.push(pts.splice(0));
                  }
              }
              if (pts.length)
                  ridges.push(pts);
          }
          const minutiae = Array.from({ length: 9 }, () => {
              const r = c.pick(ridges);
              return r[Math.floor(Math.random() * r.length)];
          });
          const status = c.el("div", `position:absolute;left:${x0 - 20}px;top:${y0 + H + 16}px;width:${W + 40}px;text-align:center;font:800 15px ${MONO};letter-spacing:.18em;color:${c.pal.c};text-shadow:0 0 14px ${c.pal.a};`);
          const dot = glowSprite(c.pal.core, 32);
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.06, 0.15);
              const scan = seg(t, 0.08, 0.7);
              const sy = y0 + H * scan;
              g.globalAlpha = env;
              g.strokeStyle = rgba(c.pal.a, 0.7);
              g.lineWidth = 1;
              g.strokeRect(x0 - 10, y0 - 10, W + 20, H + 20);
              for (const r of ridges) {
                  const vis = r.filter((p) => p.y < sy);
                  strokePath(g, vis, c.pal.a, 2.4, 0.95 * env);
              }
              if (scan > 0 && scan < 1) {
                  const lg = g.createLinearGradient(0, sy - 40, 0, sy);
                  lg.addColorStop(0, "transparent");
                  lg.addColorStop(1, rgba(c.pal.c, 0.5));
                  g.fillStyle = lg;
                  g.fillRect(x0 - 10, sy - 40, W + 20, 40);
                  glowStroke(g, [{ x: x0 - 16, y: sy }, { x: x0 + W + 16, y: sy }], c.pal.a, c.pal.core, 1.5, env);
              }
              if (t > 0.72) {
                  const k = seg(t, 0.72, 0.85);
                  minutiae.forEach((m, i) => {
                      if (k * minutiae.length < i)
                          return;
                      g.strokeStyle = c.pal.core;
                      g.lineWidth = 2;
                      g.strokeRect(m.x - 8, m.y - 8, 16, 16);
                      blit(g, dot, m.x, m.y, 10, 1);
                  });
                  const flash = 1 - seg(t, 0.74, 0.92);
                  if (flash > 0) {
                      const fg = g.createRadialGradient(x0 + W / 2, y0 + H / 2, 10, x0 + W / 2, y0 + H / 2, W);
                      fg.addColorStop(0, rgba(c.pal.core, 0.55 * flash));
                      fg.addColorStop(1, rgba(c.pal.a, 0));
                      g.fillStyle = fg;
                      g.fillRect(x0 - 40, y0 - 40, W + 80, H + 80);
                  }
              }
              g.globalAlpha = 1;
              status.style.opacity = String(env);
              status.textContent = t < 0.72 ? `SKANOWANIE ${Math.round(scan * 100)}%` : Math.floor(ms / 150) % 2 || t > 0.85 ? "TOŻSAMOŚĆ POTWIERDZONA" : "";
              status.style.color = t > 0.72 ? c.pal.core : c.pal.c;
          });
      },
  };
      return biometric;
    })(),
    /* ── boot-sequence */
    (() => {
  // Extracted from src/effects/signature/fx-hud.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const BOOT = ["RDZEŃ NEURONOWY", "PAMIĘĆ KONTEKSTU", "MODUŁ GŁOSU", "SIEĆ AGENTÓW", "SZYFROWANIE", "INTERFEJS"];
  const bootSequence = {
      id: "hud.boot-sequence",
      family: "hud",
      title: "Sekwencja startowa",
      blurb: "Ramy HUD rysują się na całym ekranie, systemy raportują gotowość, pierścień postępu domyka się wokół kuli.",
      durationMs: 4600,
      weight: "hero",
      run(c) {
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const s = c.svg(`filter:drop-shadow(0 0 6px ${c.pal.a});`);
          const m = 18;
          const L = 120;
          const frame = [
              `M${m} ${m + L} V${m} H${m + L}`,
              `M${c.W - m - L} ${m} H${c.W - m} V${m + L}`,
              `M${m} ${c.H - m - L} V${c.H - m} H${m + L}`,
              `M${c.W - m - L} ${c.H - m} H${c.W - m} V${c.H - m - L}`,
              `M${m + L + 20} ${m} H${c.W / 2 - 80} l12 10 H${c.W / 2 + 68} l12 -10 H${c.W - m - L - 20}`,
          ];
          frame.forEach((d, i) => {
              const p = c.svgEl("path", { d, fill: "none", stroke: c.pal.c, "stroke-width": i < 4 ? 3 : 1.2 }, s);
              const len = p.getTotalLength();
              p.style.strokeDasharray = `${len}`;
              c.track(p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 700, delay: i * 90, fill: "both", easing: "cubic-bezier(.6,0,.2,1)" }));
          });
          const ring = c.svgEl("circle", { cx: ox, cy: oy, r: or * 1.35, fill: "none", stroke: c.pal.a, "stroke-width": 4, transform: `rotate(-90 ${ox} ${oy})`, "stroke-linecap": "round" }, s);
          const circ = 2 * Math.PI * or * 1.35;
          ring.style.strokeDasharray = `${circ}`;
          c.track(ring.animate([{ strokeDashoffset: circ }, { strokeDashoffset: 0 }], { duration: c.durationMs * 0.72, delay: 300, fill: "both", easing: "cubic-bezier(.4,0,.2,1)" }));
          const pct = c.el("div", `position:absolute;left:${ox - 60}px;top:${oy + or * 1.5}px;width:120px;text-align:center;font:700 13px ${MONO};letter-spacing:.2em;color:${c.pal.core};text-shadow:0 0 10px ${c.pal.a};`);
          const list = c.el("div", `position:absolute;left:${Math.max(24, ox - or * 6.5)}px;top:${oy - or * 0.8}px;font:600 11px ${MONO};letter-spacing:.14em;color:${c.pal.c};line-height:1.9;white-space:pre;text-shadow:0 0 8px ${rgba(c.pal.a, 0.8)};`);
          const banner = c.el("div", `position:absolute;left:0;right:0;top:${oy - or * 2.6}px;text-align:center;font:800 26px ui-sans-serif,system-ui;letter-spacing:.5em;color:${c.pal.core};text-shadow:0 0 18px ${c.pal.a};opacity:0;`, "SYSTEMY ONLINE");
          c.track(banner.animate([{ opacity: 0, letterSpacing: "1.2em" }, { opacity: 0, offset: 0.78 }, { opacity: 1, letterSpacing: ".5em", offset: 0.86 }, { opacity: 1, offset: 0.95 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const flash = c.el("div", `position:absolute;inset:0;background:radial-gradient(circle at ${ox}px ${oy}px, ${rgba(c.pal.c, 0.6)}, transparent 60%);opacity:0;mix-blend-mode:screen;`);
          c.track(flash.animate([{ opacity: 0 }, { opacity: 0, offset: 0.78 }, { opacity: 1, offset: 0.8 }, { opacity: 0, offset: 0.95 }], { duration: c.durationMs, fill: "both" }));
          const scan = c.el("div", `position:absolute;left:0;right:0;height:2px;background:${c.pal.c};box-shadow:0 0 20px 4px ${c.pal.a};opacity:.8;`);
          c.track(scan.animate([{ transform: "translateY(0)" }, { transform: `translateY(${c.H}px)` }], { duration: 1200, delay: 200, fill: "both", easing: "cubic-bezier(.5,0,.5,1)" }));
          c.track(scan.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 300, delay: 1400, fill: "forwards" }));
          c.loop((t, ms) => {
              const p = clamp((t * c.durationMs - 300) / (c.durationMs * 0.72));
              pct.textContent = `${Math.round(ease.inOutCubic(p) * 100)}%`;
              const shown = Math.floor(seg(t, 0.15, 0.75) * BOOT.length + 0.001);
              list.textContent = BOOT.map((b, i) => (i < shown ? `${b.padEnd(18, ".")} OK` : i === shown ? `${b.padEnd(18, ".")} ${"|/-\\"[Math.floor(ms / 80) % 4]}` : "")).join("\n");
              c.root.style.opacity = String(1 - seg(t, 0.93, 1));
          });
          c.after(c.durationMs * 0.8, () => c.shake(5, 250));
      },
  };
      return bootSequence;
    })(),
    /* ── circuit */
    (() => {
  // Extracted from src/effects/signature/fx-hud.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const circuit = {
      id: "hud.circuit",
      family: "hud",
      title: "Ścieżki obwodu",
      blurb: "Ścieżki płytki drukowanej rosną od krawędzi ekranu do kuli pod kątem prostym; biegną po nich elektrony.",
      durationMs: 2800,
      weight: "micro",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const paths = [];
          for (let i = 0; i < c.n(22); i++) {
              const side = i % 4;
              let p = side === 0 ? { x: 0, y: c.rand(c.H) } : side === 1 ? { x: c.W, y: c.rand(c.H) } : side === 2 ? { x: c.rand(c.W), y: 0 } : { x: c.rand(c.W), y: c.H };
              const pts = [{ ...p }];
              let horiz = side < 2;
              for (let s = 0; s < 6; s++) {
                  const target = { x: ox + c.rand(-or, or) * 0.8, y: oy + c.rand(-or, or) * 0.8 };
                  const k = s === 5 ? 1 : c.rand(0.3, 0.7);
                  p = horiz ? { x: p.x + (target.x - p.x) * k, y: p.y } : { x: p.x, y: p.y + (target.y - p.y) * k };
                  pts.push({ ...p });
                  horiz = !horiz;
                  if (Math.hypot(p.x - ox, p.y - oy) < or)
                      break;
              }
              const last = pts[pts.length - 1];
              const a = Math.atan2(last.y - oy, last.x - ox);
              pts.push({ x: ox + Math.cos(a) * or * 0.95, y: oy + Math.sin(a) * or * 0.95 });
              paths.push(pts);
          }
          const lens = paths.map((p) => p.reduce((s, q, i) => (i ? s + Math.hypot(q.x - p[i - 1].x, q.y - p[i - 1].y) : 0), 0));
          const at = (pts, len, d) => {
              const out = [pts[0]];
              let acc = 0;
              for (let i = 1; i < pts.length; i++) {
                  const a = pts[i - 1];
                  const b = pts[i];
                  const L = Math.hypot(b.x - a.x, b.y - a.y);
                  if (acc + L >= d) {
                      const k = (d - acc) / (L || 1);
                      const h = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
                      out.push(h);
                      return { pts: out, head: h };
                  }
                  acc += L;
                  out.push(b);
              }
              void len;
              return { pts: out, head: pts[pts.length - 1] };
          };
          const e = glowSprite(c.pal.core, 32);
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.02, 0.2);
              paths.forEach((p, i) => {
                  const grow = ease.inOutCubic(seg(t, i * 0.015, 0.45 + i * 0.015));
                  const { pts, head } = at(p, lens[i], lens[i] * grow);
                  strokePath(g, pts, c.pal.a, 12, 0.18 * env);
                  strokePath(g, pts, c.pal.c, 3, 0.95 * env);
                  g.lineWidth = 2;
                  for (const q of pts.slice(1, -1)) {
                      g.globalAlpha = env;
                      g.strokeStyle = c.pal.core;
                      g.beginPath();
                      g.arc(q.x, q.y, 5, 0, Math.PI * 2);
                      g.stroke();
                  }
                  if (grow < 1)
                      blit(g, e, head.x, head.y, 16, env);
                  else {
                      for (let k = 0; k < 3; k++) {
                          const h = at(p, lens[i], ((ms * 0.0007 + i * 0.13 + k / 3) % 1) * lens[i]).head;
                          blit(g, e, h.x, h.y, 11, env);
                      }
                  }
              });
              const arrive = seg(t, 0.47, 0.75);
              if (arrive > 0 && arrive < 1) {
                  g.globalAlpha = (1 - arrive) * env;
                  g.strokeStyle = c.pal.core;
                  g.lineWidth = 8 * (1 - arrive) + 1;
                  g.beginPath();
                  g.arc(ox, oy, or * (1 + ease.outCubic(arrive) * 2.2), 0, Math.PI * 2);
                  g.stroke();
                  blit(g, e, ox, oy, or * 3 * (1 - arrive), (1 - arrive) * env);
              }
              g.globalAlpha = 1;
          });
      },
  };
      return circuit;
    })(),
    /* ── data-windows */
    (() => {
  // Extracted from src/effects/signature/fx-hud.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const LINES = ["NEURAL LINK ......... OK", "LATENCY 12ms", "TOKENS/s 184", "MEM 2.4 / 8.0 GB", "CTX WINDOW 61%", "AGENTS 3 ACTIVE", "SECURE CHANNEL ✓", "QUEUE 0"];
  const dataWindows = {
      id: "hud.data-windows",
      family: "hud",
      title: "Okna telemetrii",
      blurb: "Wokół kuli wyskakują okna HUD z pisanym tekstem i żywymi wykresami, połączone wiązkami.",
      durationMs: 4000,
      weight: "accent",
      run(c) {
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const spots = [
              { x: ox - or * 4.6, y: oy - or * 1.6 },
              { x: ox + or * 2.6, y: oy - or * 1.9 },
              { x: ox - or * 4.2, y: oy + or * 0.9 },
              { x: ox + or * 2.8, y: oy + or * 0.7 },
          ];
          const lines = c.svg();
          const g = c.canvas();
          const wins = spots.map((p, i) => {
              const w = c.el("div", `position:absolute;left:${p.x}px;top:${p.y}px;width:${or * 1.9 + 40}px;padding:8px 10px;border:1px solid ${rgba(c.pal.a, 0.6)};background:${rgba("#020617", 0.75)};box-shadow:0 0 24px ${rgba(c.pal.a, 0.35)}, inset 0 0 20px ${rgba(c.pal.a, 0.12)};font:600 10px ${MONO};color:${c.pal.c};letter-spacing:.08em;clip-path:polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));`);
              const head = c.el("div", `color:${c.pal.core};margin-bottom:4px;letter-spacing:.25em;`, ["TELEMETRIA", "SIEĆ", "PAMIĘĆ", "AGENCI"][i], w);
              void head;
              const body = c.el("div", "white-space:pre;line-height:1.5;min-height:30px;", "", w);
              const spark = c.el("canvas", "display:block;width:100%;height:28px;margin-top:4px;", undefined, w);
              spark.width = 200;
              spark.height = 56;
              c.track(w.animate([{ opacity: 0, transform: "scale(.6) translateY(10px)" }, { opacity: 1, transform: "scale(1)" }], { duration: 380, delay: 120 + i * 140, fill: "both", easing: "cubic-bezier(.2,1.4,.4,1)" }));
              const ln = c.svgEl("line", { x1: ox, y1: oy, x2: p.x + (p.x < ox ? or * 1.9 + 40 : 0), y2: p.y + 20, stroke: c.pal.a, "stroke-width": 1, "stroke-dasharray": "4 4", opacity: 0.8 }, lines);
              c.track(ln.animate([{ opacity: 0 }, { opacity: 0.8 }], { duration: 300, delay: 100 + i * 140, fill: "both" }));
              return { body, spark: spark.getContext("2d"), text: [LINES[i * 2], LINES[i * 2 + 1]].join("\n"), at: 0.1 + i * 0.05, data: Array.from({ length: 40 }, () => Math.random()) };
          });
          const pk = glowSprite(c.pal.c, 24);
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              for (const [i, w] of wins.entries()) {
                  const n = Math.floor(clamp((t - w.at) / 0.3) * w.text.length);
                  w.body.textContent = w.text.slice(0, n) + (n < w.text.length && Math.floor(ms / 120) % 2 ? "▌" : "");
                  w.data.shift();
                  w.data.push(0.5 + noise2(i * 10, ms * 0.003) * 0.9);
                  const sg = w.spark;
                  sg.clearRect(0, 0, 200, 56);
                  sg.strokeStyle = c.pal.a;
                  sg.lineWidth = 2;
                  sg.beginPath();
                  w.data.forEach((v, k) => (k ? sg.lineTo(k * 5, 56 - v * 50) : sg.moveTo(0, 56 - v * 50)));
                  sg.stroke();
                  const s = spots[i];
                  const tgt = { x: s.x + (s.x < ox ? or * 1.9 + 40 : 0), y: s.y + 20 };
                  const u = (ms * 0.0008 + i * 0.25) % 1;
                  blit(g, pk, ox + (tgt.x - ox) * u, oy + (tgt.y - oy) * u, 6, envelope(t));
              }
              c.root.style.opacity = String(1 - seg(t, 0.85, 1));
          });
      },
  };
      return dataWindows;
    })(),
    /* ── radar */
    (() => {
  // Extracted from src/effects/signature/fx-hud.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const radar = {
      id: "hud.radar",
      family: "hud",
      title: "Radar fosforowy",
      blurb: "Tarcza radaru z wiązką zostawiającą poświatę fosforu; kontakty rozbłyskują, gdy przejdzie wiązka.",
      durationMs: 4000,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const R = Math.min(or * 3, c.H * 0.42);
          const blips = Array.from({ length: c.n(9) }, () => ({ a: c.rand(Math.PI * 2), d: c.rand(0.3, 0.95), lit: -1e9 }));
          const dot = glowSprite(c.pal.c, 48);
          let prev = 0;
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.12, 0.15);
              const s = ease.outBack(seg(t, 0, 0.15));
              const ang = ms * 0.0042;
              g.save();
              g.globalAlpha = env;
              g.translate(ox, oy);
              g.scale(s, s);
              g.fillStyle = rgba("#020617", 0.72);
              g.beginPath();
              g.arc(0, 0, R, 0, Math.PI * 2);
              g.fill();
              g.strokeStyle = rgba(c.pal.a, 0.5);
              g.lineWidth = 1;
              for (let k = 1; k <= 4; k++) {
                  g.beginPath();
                  g.arc(0, 0, (R * k) / 4, 0, Math.PI * 2);
                  g.stroke();
              }
              for (let k = 0; k < 12; k++) {
                  const a = (k / 12) * Math.PI * 2;
                  g.beginPath();
                  g.moveTo(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25);
                  g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
                  g.stroke();
              }
              for (let k = 0; k < 40; k++) {
                  const a0 = ang - (k / 40) * 1.4;
                  g.fillStyle = rgba(c.pal.a, 0.32 * Math.pow(1 - k / 40, 2));
                  g.beginPath();
                  g.moveTo(0, 0);
                  g.arc(0, 0, R, a0 - 0.04, a0);
                  g.closePath();
                  g.fill();
              }
              g.strokeStyle = c.pal.core;
              g.lineWidth = 2;
              g.beginPath();
              g.moveTo(0, 0);
              g.lineTo(Math.cos(ang) * R, Math.sin(ang) * R);
              g.stroke();
              g.restore();
              const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
              for (const b of blips) {
                  const pa = norm(prev);
                  const na = norm(ang);
                  const ba = norm(b.a);
                  if ((pa <= na && ba >= pa && ba < na) || (pa > na && (ba >= pa || ba < na)))
                      b.lit = ms;
                  const age = (ms - b.lit) / 1500;
                  if (age < 1)
                      blit(g, dot, ox + Math.cos(b.a) * b.d * R * s, oy + Math.sin(b.a) * b.d * R * s, 10 + (1 - age) * 8, (1 - age) * env);
              }
              prev = ang;
              g.globalAlpha = env;
              g.fillStyle = c.pal.c;
              g.font = `600 10px ${MONO}`;
              for (let k = 0; k < 4; k++)
                  g.fillText(`${k * 90}°`, ox + Math.cos((k * Math.PI) / 2 - Math.PI / 2) * (R + 14) * s - 10, oy + Math.sin((k * Math.PI) / 2 - Math.PI / 2) * (R + 14) * s + 4);
              g.globalAlpha = 1;
          });
      },
  };
      return radar;
    })(),
    /* ── spectrum */
    (() => {
  // Extracted from src/effects/signature/fx-hud.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const spectrum = {
      id: "hud.spectrum",
      family: "hud",
      title: "Widmo głosu",
      blurb: "Kołowy analizator widma wokół kuli: słupki pulsują jak głos, czapki szczytów opadają.",
      durationMs: 3000,
      weight: "micro",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const N = c.lite ? 48 : 96;
          const peaks = new Array(N).fill(0);
          c.loop((t, ms, dt) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.1, 0.25);
              const rot = ms * 0.0003;
              for (let i = 0; i < N; i++) {
                  const a = (i / N) * Math.PI * 2 + rot;
                  const sym = Math.min(i, N - i) / (N / 2);
                  const v = clamp(0.25 + noise2(sym * 4, ms * 0.004) * 0.9 + Math.pow(Math.sin(ms * 0.012 + sym * 6), 8) * 0.5) * env;
                  peaks[i] = Math.max(v, peaks[i] - 0.012 * dt);
                  const r0 = or * 1.12;
                  const r1 = r0 + v * or * 1.3;
                  g.strokeStyle = `hsl(${c.pal.hue + sym * 50} 90% ${55 + v * 25}%)`;
                  g.lineWidth = ((Math.PI * 2 * r0) / N) * 0.6;
                  g.globalAlpha = 0.9;
                  g.beginPath();
                  g.moveTo(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0);
                  g.lineTo(ox + Math.cos(a) * r1, oy + Math.sin(a) * r1);
                  g.stroke();
                  const rp = r0 + peaks[i] * or * 1.3 + 4;
                  g.fillStyle = c.pal.core;
                  g.fillRect(ox + Math.cos(a) * rp - 1.5, oy + Math.sin(a) * rp - 1.5, 3, 3);
                  g.globalAlpha = 0.25;
                  g.beginPath();
                  g.moveTo(ox + Math.cos(a) * r0 * 0.98, oy + Math.sin(a) * r0 * 0.98);
                  g.lineTo(ox + Math.cos(a) * (r0 - v * or * 0.4), oy + Math.sin(a) * (r0 - v * or * 0.4));
                  g.stroke();
              }
              g.globalAlpha = 1;
          });
      },
  };
      return spectrum;
    })(),
    /* ── target-lock */
    (() => {
  // Extracted from src/effects/signature/fx-hud.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const targetLock = {
      id: "hud.target-lock",
      family: "hud",
      title: "Namierzanie",
      blurb: "Narożniki z rogów ekranu zbiegają się na kuli, celownik się obraca, liczniki odliczają — LOCKED.",
      durationMs: 2400,
      weight: "micro",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const box = or * 1.6;
          const label = c.el("div", `position:absolute;left:${ox + box + 12}px;top:${oy - box}px;font:700 14px ${MONO};letter-spacing:.25em;color:${c.pal.c};text-shadow:0 0 10px ${c.pal.a};white-space:pre;line-height:1.7;`);
          c.after(c.durationMs * 0.55, () => c.shake(4, 180));
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.05, 0.15);
              const conv = ease.outBack(seg(t, 0, 0.45));
              const locked = t > 0.55;
              const pulse = locked ? 1 + Math.sin(ms * 0.03) * 0.04 : 1;
              const b = box * (locked ? 0.85 + 0.15 * (1 - seg(t, 0.55, 0.62)) : 1) * pulse;
              const focus = g.createRadialGradient(ox, oy, box * (2.6 - conv), ox, oy, Math.hypot(c.W, c.H) * 0.6);
              focus.addColorStop(0, "rgba(0,0,0,0)");
              focus.addColorStop(1, `rgba(0,0,0,${0.6 * env})`);
              g.fillStyle = focus;
              g.fillRect(0, 0, c.W, c.H);
              const corners = [
                  [0, 0, -1, -1],
                  [c.W, 0, 1, -1],
                  [0, c.H, -1, 1],
                  [c.W, c.H, 1, 1],
              ];
              g.strokeStyle = locked ? c.pal.core : c.pal.c;
              g.shadowColor = c.pal.a;
              g.shadowBlur = 16;
              g.lineWidth = 5;
              g.lineCap = "square";
              g.globalAlpha = env;
              const L = 30 + 60 * (1 - conv);
              for (const [sx, sy, dx, dy] of corners) {
                  const tx = ox + dx * b;
                  const ty = oy + dy * b;
                  const x = sx + (tx - sx) * conv;
                  const y = sy + (ty - sy) * conv;
                  g.beginPath();
                  g.moveTo(x, y - dy * L);
                  g.lineTo(x, y);
                  g.lineTo(x - dx * L, y);
                  g.stroke();
              }
              g.lineWidth = 2.5;
              if (locked) {
                  const k = seg(t, 0.55, 0.85);
                  g.globalAlpha = (1 - k) * env;
                  g.lineWidth = 6 * (1 - k) + 1;
                  g.beginPath();
                  g.arc(ox, oy, or * (1.3 + ease.outCubic(k) * 4.5), 0, Math.PI * 2);
                  g.stroke();
                  const flash = 1 - seg(t, 0.55, 0.68);
                  if (flash > 0) {
                      const fg = g.createRadialGradient(ox, oy, 0, ox, oy, or * 3);
                      fg.addColorStop(0, rgba(c.pal.core, 0.8 * flash));
                      fg.addColorStop(1, rgba(c.pal.a, 0));
                      g.globalAlpha = 1;
                      g.fillStyle = fg;
                      g.fillRect(ox - or * 3, oy - or * 3, or * 6, or * 6);
                  }
                  g.globalAlpha = env;
              }
              g.save();
              g.translate(ox, oy);
              g.rotate(ms * 0.002 * (locked ? 3 : 1));
              g.lineWidth = 1.5;
              g.setLineDash([10, 6]);
              g.beginPath();
              g.arc(0, 0, or * 1.25 * Math.max(0.01, conv), 0, Math.PI * 2);
              g.stroke();
              g.setLineDash([]);
              for (let i = 0; i < 4; i++) {
                  g.rotate(Math.PI / 2);
                  g.beginPath();
                  g.moveTo(or * 1.05, 0);
                  g.lineTo(or * 1.45, 0);
                  g.stroke();
              }
              g.restore();
              g.globalAlpha = env * 0.35;
              g.setLineDash([2, 6]);
              g.beginPath();
              g.moveTo(0, oy);
              g.lineTo(c.W, oy);
              g.moveTo(ox, 0);
              g.lineTo(ox, c.H);
              g.stroke();
              g.setLineDash([]);
              g.globalAlpha = 1;
              const dist = Math.max(0, Math.round(4800 * (1 - seg(t, 0, 0.55))));
              label.textContent = `${locked ? "■ LOCKED" : "▶ TRACKING"}\nRNG ${String(dist).padStart(4, "0")} m\nBRG ${String(Math.round(ms * 0.11) % 360).padStart(3, "0")}°\nCONF ${Math.round(clamp(t / 0.55) * 100)}%`;
              label.style.opacity = String(env);
              label.style.color = locked ? c.pal.core : c.pal.c;
          });
      },
  };
      return targetLock;
    })(),
    /* ── tron-grid */
    (() => {
  // Extracted from src/effects/signature/fx-hud.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const tronGrid = {
      id: "hud.tron-grid",
      family: "hud",
      title: "Siatka Tron",
      blurb: "Neonowa podłoga w perspektywie wyrasta od horyzontu i płynie w stronę widza.",
      durationMs: 4000,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const hy = c.anchors.waterY;
          const vx = c.anchors.orb.x;
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.2, 0.2);
              const rise = ease.outCubic(seg(t, 0, 0.3));
              const floorH = (c.H - hy) * rise;
              g.save();
              g.beginPath();
              g.rect(0, hy, c.W, floorH);
              g.clip();
              const bg = g.createLinearGradient(0, hy, 0, c.H);
              bg.addColorStop(0, rgba(c.pal.a, 0.25 * env));
              bg.addColorStop(1, rgba(c.pal.b, 0.05 * env));
              g.fillStyle = bg;
              g.fillRect(0, hy, c.W, c.H - hy);
              g.strokeStyle = c.pal.a;
              g.lineWidth = 1.5;
              const off = (ms * 0.0012) % 1;
              for (let i = 0; i < 26; i++) {
                  const z = (i + 1 - off) / 2;
                  const y = hy + (c.H - hy) * (1 / (z * 0.9 + 0.1)) * 0.08;
                  if (y > c.H)
                      continue;
                  g.globalAlpha = env * clamp((y - hy) / 80) * 0.9;
                  g.beginPath();
                  g.moveTo(0, y);
                  g.lineTo(c.W, y);
                  g.stroke();
              }
              for (let i = -30; i <= 30; i++) {
                  g.globalAlpha = env * 0.7;
                  g.beginPath();
                  g.moveTo(vx + i * 6, hy);
                  g.lineTo(vx + i * 220, c.H + 400);
                  g.stroke();
              }
              g.restore();
              g.globalAlpha = env;
              glowStroke(g, [{ x: 0, y: hy }, { x: c.W, y: hy }], c.pal.a, c.pal.core, 1.5, env);
              g.globalAlpha = 1;
          });
      },
  };
      return tronGrid;
    })(),
  );
})();
