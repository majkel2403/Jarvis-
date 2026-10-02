'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — pointer (2)
   GENEROWANE z katalog/01-signature-fx/pointer/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: pointer.comet, pointer.magnet */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.pointer = J.fxEffects.pointer || [];
const { blit, fadeCanvas, glowSprite } = J.fxDraw;
const { rgba } = J.fxPal;
const { clamp, envelope } = J.fxRt;
J.fxEffects.pointer.push(
    /* ── comet */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const comet = {
      id: "pointer.comet",
      family: "pointer",
      title: "Kometa kursora",
      blurb: "Za kursorem leci kometa z warkoczem iskier; w miejscach postoju rozchodzą się kręgi.",
      durationMs: 3600,
      weight: "micro",
      run(c) {
          const g = c.canvas();
          const target = { ...c.anchors.pointer };
          let moved = false;
          c.onPointer((p) => {
              target.x = p.x;
              target.y = p.y;
              moved = true;
          });
          const head = { ...target };
          const spr = [glowSprite(c.pal.a, 32), glowSprite(c.pal.c, 32), glowSprite(c.pal.b, 32)];
          const core = glowSprite(c.pal.core, 64, 0.3);
          const ps = [];
          const rings = [];
          let lastRing = 0;
          c.loop((t, ms, dt) => {
              fadeCanvas(g, c.W, c.H, 0.25);
              const env = envelope(t, 0.05, 0.2);
              const sweep = ms * 0.0015;
              const goal = moved
                  ? target
                  : { x: c.W * 0.5 + Math.sin(sweep) * c.W * 0.38, y: c.H * 0.3 + Math.sin(sweep * 2) * c.H * 0.16 };
              const px = head.x;
              const py = head.y;
              const follow = 1 - Math.pow(0.82, dt);
              head.x += (goal.x - head.x) * follow;
              head.y += (goal.y - head.y) * follow;
              const sp = Math.hypot(head.x - px, head.y - py);
              for (let i = 0; i < Math.min(8, 2 + sp) * dt; i++)
                  ps.push({ x: head.x, y: head.y, vx: (px - head.x) * 0.3 + c.rand(-1, 1), vy: (py - head.y) * 0.3 + c.rand(-1, 1), l: 1, k: Math.floor(c.rand(3)) });
              if (sp < 0.6 && ms - lastRing > 450) {
                  lastRing = ms;
                  rings.push({ x: head.x, y: head.y, at: ms });
              }
              for (const p of ps) {
                  p.x += p.vx * dt;
                  p.y += p.vy * dt + 0.05;
                  p.l -= 0.025 * dt;
                  blit(g, spr[p.k], p.x, p.y, 5 + p.l * 9, p.l * env);
              }
              for (const r of rings) {
                  const a = (ms - r.at) / 900;
                  if (a > 1)
                      continue;
                  g.strokeStyle = rgba(c.pal.c, (1 - a) * env);
                  g.lineWidth = 2;
                  g.beginPath();
                  g.arc(r.x, r.y, 8 + a * 70, 0, Math.PI * 2);
                  g.stroke();
              }
              blit(g, core, head.x, head.y, 34, env);
          });
      },
  };
      return comet;
    })(),
    /* ── magnet */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const magnet = {
      id: "pointer.magnet",
      family: "pointer",
      title: "Magnes",
      blurb: "Rozsiany pył zostaje przyciągnięty do kursora i krąży wokół niego, a na końcu zostaje odrzucony.",
      durationMs: 3600,
      weight: "micro",
      run(c) {
          const g = c.canvas();
          const target = { ...c.anchors.pointer };
          c.onPointer((p) => {
              target.x = p.x;
              target.y = p.y;
          });
          const spr = [glowSprite(c.pal.a, 24), glowSprite(c.pal.c, 24)];
          const ps = Array.from({ length: c.n(420) }, () => ({ x: c.rand(c.W), y: c.rand(c.H), vx: 0, vy: 0, k: Math.round(Math.random()), spin: c.rand(0.6, 1.4) * (Math.random() < 0.5 ? 1 : -1) }));
          let released = false;
          c.loop((t, _ms, dt) => {
              fadeCanvas(g, c.W, c.H, 0.3);
              const env = envelope(t, 0.1, 0.2);
              if (t > 0.78 && !released) {
                  released = true;
                  for (const p of ps) {
                      const a = Math.atan2(p.y - target.y, p.x - target.x);
                      const sp = c.rand(8, 22);
                      p.vx = Math.cos(a) * sp;
                      p.vy = Math.sin(a) * sp;
                  }
              }
              for (const p of ps) {
                  if (!released) {
                      const dx = target.x - p.x;
                      const dy = target.y - p.y;
                      const d = Math.hypot(dx, dy) + 1;
                      const f = clamp(1800 / (d * d), 0, 1.2) + 0.02;
                      p.vx += ((dx / d) * f + (-dy / d) * 0.5 * p.spin * clamp(140 / d)) * dt;
                      p.vy += ((dy / d) * f + (dx / d) * 0.5 * p.spin * clamp(140 / d)) * dt;
                      p.vx *= Math.pow(0.95, dt);
                      p.vy *= Math.pow(0.95, dt);
                  }
                  else {
                      p.vx *= Math.pow(0.97, dt);
                      p.vy *= Math.pow(0.97, dt);
                  }
                  p.x += p.vx * dt;
                  p.y += p.vy * dt;
                  blit(g, spr[p.k], p.x, p.y, 4, env);
              }
          });
      },
  };
      return magnet;
    })(),
  );
})();
