'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — ambient (2)
   GENEROWANE z katalog/01-signature-fx/ambient/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: ambient.day-night, ambient.meteors */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.ambient = J.fxEffects.ambient || [];
const { rgba } = J.fxPal;
const { clamp, seg } = J.fxRt;
const { blit, clear, glowSprite } = J.fxDraw;
J.fxEffects.ambient.push(
    /* ── day-night */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const dayNight = {
      id: "ambient.day-night",
      family: "ambient",
      title: "Doba w 4 sekundy",
      blurb: "Słońce przechodzi łukiem nad górami z flarą obiektywu; niebo i cała scena zmieniają barwę od świtu do nocy.",
      durationMs: 4600,
      weight: "hero",
      run(c) {
          c.scene([
              { filter: "none" },
              { filter: "sepia(.35) saturate(1.5) hue-rotate(-18deg) brightness(1.1)", offset: 0.2 },
              { filter: "brightness(1.45) saturate(1.2) contrast(.95)", offset: 0.5 },
              { filter: "sepia(.5) saturate(1.8) hue-rotate(-30deg) brightness(1.05)", offset: 0.78 },
              { filter: "brightness(.6) saturate(.8) hue-rotate(10deg)", offset: 0.92 },
              { filter: "none" },
          ], { duration: c.durationMs, easing: "ease-in-out" });
          const sun = c.el("div", "position:absolute;left:0;top:0;width:120px;height:120px;margin:-60px;border-radius:50%;background:radial-gradient(circle, #fff 0 18%, #fde68a 30%, rgba(251,146,60,.5) 50%, transparent 70%);mix-blend-mode:screen;");
          const ghosts = [0.3, 0.55, 0.75, 1.2].map((k, i) => ({ k, el: c.el("div", `position:absolute;left:0;top:0;width:${40 + i * 30}px;height:${40 + i * 30}px;margin:${-(20 + i * 15)}px;border-radius:50%;border:2px solid ${rgba(i % 2 ? c.pal.a : "#fb923c", 0.5)};background:${rgba(i % 2 ? c.pal.b : "#fde68a", 0.12)};mix-blend-mode:screen;`) }));
          const streak = c.el("div", "position:absolute;left:0;top:0;width:600px;height:3px;margin:-1.5px -300px;background:linear-gradient(90deg, transparent, rgba(255,240,200,.8), transparent);mix-blend-mode:screen;");
          const hz = c.anchors.waterY;
          c.loop((t) => {
              const u = seg(t, 0.05, 0.9);
              const x = c.W * (0.05 + u * 0.9);
              const y = hz - Math.sin(u * Math.PI) * hz * 0.85 + 20;
              const vis = clamp(Math.sin(u * Math.PI) * 2.5) * (1 - seg(t, 0.88, 0.95));
              sun.style.transform = `translate(${x}px, ${y}px)`;
              sun.style.opacity = String(vis);
              streak.style.transform = `translate(${x}px, ${y}px)`;
              streak.style.opacity = String(vis * 0.8);
              const cx = c.W / 2;
              const cy = c.H / 2;
              for (const gh of ghosts) {
                  gh.el.style.transform = `translate(${x + (cx - x) * gh.k * 2}px, ${y + (cy - y) * gh.k * 2}px)`;
                  gh.el.style.opacity = String(vis * 0.8);
              }
          });
      },
  };
      return dayNight;
    })(),
    /* ── meteors */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const meteors = {
      id: "ambient.meteors",
      family: "ambient",
      title: "Deszcz meteorów",
      blurb: "Nad górami przelatują meteory ze zwężającymi się ogonami; niektóre rozpadają się na iskry.",
      durationMs: 4400,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const ms0 = Array.from({ length: c.n(30) }, () => {
              const sp = c.rand(14, 24);
              const a = Math.PI * 0.78 + c.rand(-0.08, 0.08);
              return { x: c.rand(c.W * 0.3, c.W * 1.2), y: c.rand(-80, c.H * 0.2), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, at: c.rand(0.75), len: c.rand(220, 460), w: c.rand(2.5, 5.5), split: Math.random() < 0.4, done: false };
          });
          const head = glowSprite(c.pal.core, 48);
          const spark = glowSprite(c.pal.c, 24);
          const bloom = glowSprite(c.pal.a, 128, 0.05);
          const sparks = [];
          const flashes = [];
          c.loop((t, ms, dt) => {
              clear(g, c.W, c.H);
              for (const f of flashes) {
                  const k = (ms - f.at) / 500;
                  if (k < 1)
                      blit(g, bloom, f.x, f.y, 260 * (0.5 + k), (1 - k) * 0.7);
              }
              for (const m of ms0) {
                  if (t < m.at || m.done)
                      continue;
                  m.x += m.vx * dt;
                  m.y += m.vy * dt;
                  if (m.y > c.anchors.waterY - 40 || m.x < -m.len) {
                      m.done = true;
                      if (m.split)
                          flashes.push({ x: m.x, y: m.y, at: ms });
                      if (m.split)
                          for (let i = 0; i < 30; i++)
                              sparks.push({ x: m.x, y: m.y, vx: m.vx * 0.3 + c.rand(-3, 3), vy: m.vy * 0.2 + c.rand(-3, 1), l: 1 });
                      continue;
                  }
                  const sp = Math.hypot(m.vx, m.vy);
                  const tx = m.x - (m.vx / sp) * m.len;
                  const ty = m.y - (m.vy / sp) * m.len;
                  const lg = g.createLinearGradient(m.x, m.y, tx, ty);
                  lg.addColorStop(0, rgba(c.pal.core, 0.95));
                  lg.addColorStop(0.3, rgba(c.pal.c, 0.5));
                  lg.addColorStop(1, rgba(c.pal.a, 0));
                  g.strokeStyle = lg;
                  g.lineWidth = m.w;
                  g.lineCap = "round";
                  g.beginPath();
                  g.moveTo(m.x, m.y);
                  g.lineTo(tx, ty);
                  g.stroke();
                  blit(g, head, m.x, m.y, m.w * 6, 1);
              }
              for (const s of sparks) {
                  s.vy += 0.15 * dt;
                  s.x += s.vx * dt;
                  s.y += s.vy * dt;
                  s.l -= 0.02 * dt;
                  blit(g, spark, s.x, s.y, 5, s.l);
              }
          });
      },
  };
      return meteors;
    })(),
  );
})();
