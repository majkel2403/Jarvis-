'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — particles (10)
   GENEROWANE z katalog/01-signature-fx/particles/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: particles.confetti, particles.disintegrate, particles.dna, particles.embers, particles.fireworks, particles.flow-field, particles.galaxy, particles.snow, particles.swarm, particles.text-assemble */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.particles = J.fxEffects.particles || [];
const { blit, clear, fadeCanvas, glowSprite, textPoints } = J.fxDraw;
const { clamp, ease, envelope, noise2, seg } = J.fxRt;
const { rgba } = J.fxPal;
J.fxEffects.particles.push(
    /* ── confetti */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const confetti = {
      id: "particles.confetti",
      family: "particles",
      title: "Działka konfetti",
      blurb: "Dwa działka z rogów wystrzeliwują konfetti, które wiruje w 3D i opada z oporem powietrza.",
      durationMs: 3800,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const colors = [c.pal.a, c.pal.b, c.pal.c, "#f472b6", "#facc15", "#ffffff"];
          const parts = [];
          const burst = (side) => {
              const x = side > 0 ? -10 : c.W + 10;
              for (let i = 0; i < c.n(130); i++) {
                  const a = (side > 0 ? -Math.PI / 2.6 : -Math.PI + Math.PI / 2.6) + c.rand(-0.4, 0.4);
                  const sp = c.rand(22, 42);
                  parts.push({ x, y: c.H * 0.92, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: c.rand(6), vr: c.rand(-0.3, 0.3), flip: c.rand(6), vf: c.rand(0.1, 0.35), w: c.rand(6, 11), h: c.rand(10, 18), col: c.pick(colors), sway: c.rand(100) });
              }
          };
          burst(1);
          burst(-1);
          c.after(500, () => {
              burst(1);
              burst(-1);
          });
          c.loop((t, ms, dt) => {
              clear(g, c.W, c.H);
              const fade = 1 - seg(t, 0.8, 1);
              for (const p of parts) {
                  p.vx *= Math.pow(0.985, dt);
                  p.vy = p.vy * Math.pow(0.985, dt) + 0.28 * dt;
                  if (p.vy > 3.2)
                      p.vy = 3.2;
                  p.x += (p.vx + Math.sin(ms * 0.003 + p.sway) * 0.8) * dt;
                  p.y += p.vy * dt;
                  p.rot += p.vr * dt;
                  p.flip += p.vf * dt;
                  g.save();
                  g.translate(p.x, p.y);
                  g.rotate(p.rot);
                  g.scale(1, Math.cos(p.flip));
                  g.globalAlpha = fade;
                  g.fillStyle = p.col;
                  g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                  g.restore();
              }
          });
      },
  };
      return confetti;
    })(),
    /* ── disintegrate */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const disintegrate = {
      id: "particles.disintegrate",
      family: "particles",
      title: "Rozsypanie",
      blurb: "Prawdziwy panel pulpitu rozsypuje się w pył od lewej, pył odpływa — po chwili panel się składa z powrotem.",
      durationMs: 4000,
      weight: "hero",
      run(c) {
          const pick = [
              [c.anchors.widget, "widget"],
              [c.anchors.chat, "chat"],
              [c.anchors.log, "log"],
              [c.anchors.dock, "dock"],
          ];
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const orbArea = (or * 2.8) ** 2;
          const found = pick
              .filter(([r]) => r && r.w * r.h > orbArea * 0.6)
              .sort((a, b) => b[0].w * b[0].h - a[0].w * a[0].h)[0];
          const rect = found?.[0] ?? { x: ox - or * 1.4, y: oy - or * 1.4, w: or * 2.8, h: or * 2.8 };
          const el = c.element(found?.[1] ?? "orb");
          if (el) {
              c.track(el.animate([
                  { clipPath: "inset(0 0 0 0%)", opacity: 1 },
                  { clipPath: "inset(0 0 0 0%)", opacity: 1, offset: 0.08 },
                  { clipPath: "inset(0 0 0 100%)", opacity: 1, offset: 0.45 },
                  { clipPath: "inset(0 0 0 100%)", opacity: 1, offset: 0.58 },
                  { clipPath: "inset(0 0 0 0%)", opacity: 1, offset: 0.92 },
                  { clipPath: "inset(0 0 0 0%)", opacity: 1 },
              ], { duration: c.durationMs, easing: "linear" }));
          }
          const g = c.canvas();
          const step = c.lite ? 7 : 4;
          const cols = [c.pal.a, c.pal.c, c.pal.b, "#e2e8f0"];
          const dust = [];
          for (let y = rect.y; y < rect.y + rect.h; y += step)
              for (let x = rect.x; x < rect.x + rect.w; x += step)
                  dust.push({ hx: x, hy: y, x, y, ox: c.rand(80, 380), oy: c.rand(-200, 40), k: (x - rect.x) / rect.w, seed: c.rand(100), col: c.pick(cols) });
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              for (const d of dust) {
                  const out = ease.outCubic(seg(t, 0.08 + d.k * 0.37, 0.08 + d.k * 0.37 + 0.25));
                  const back = ease.inOutCubic(seg(t, 0.58 + d.k * 0.34 - 0.2, 0.58 + d.k * 0.34));
                  const p = out * (1 - back);
                  if (p <= 0.01)
                      continue;
                  const sw = noise2(d.seed, ms * 0.001) * 40 * p;
                  d.x = d.hx + d.ox * p + sw;
                  d.y = d.hy + d.oy * p + Math.sin(p * Math.PI) * -30;
                  g.globalAlpha = clamp(Math.sin(p * Math.PI) * 1.2 + (back > 0 ? 0.4 : 0)) * (1 - seg(p, 0.8, 1) * 0.6);
                  g.fillStyle = d.col;
                  g.fillRect(d.x, d.y, 2.4, 2.4);
              }
              g.globalAlpha = 1;
          });
      },
  };
      return disintegrate;
    })(),
    /* ── dna */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const dna = {
      id: "particles.dna",
      family: "particles",
      title: "Helisa DNA",
      blurb: "Podwójna helisa 3D rozwija się przez ekran, z szczeblami i sortowaniem głębi.",
      durationMs: 3800,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { y: oy, r: or } = c.anchors.orb;
          const A = or * 1.1;
          const dotA = glowSprite(c.pal.a, 32);
          const dotB = glowSprite(c.pal.b, 32);
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.05, 0.2);
              const reveal = ease.outCubic(seg(t, 0, 0.45)) * (c.W + 100);
              const items = [];
              for (let x = -40; x < reveal; x += 14) {
                  const ph = x * 0.022 + ms * 0.0025;
                  items.push({ x, y: oy + Math.sin(ph) * A, z: Math.cos(ph), k: 0 });
                  items.push({ x, y: oy + Math.sin(ph + Math.PI) * A, z: Math.cos(ph + Math.PI), k: 1 });
                  if (Math.round(x / 14) % 3 === 0) {
                      const z = Math.cos(ph);
                      g.strokeStyle = rgba(c.pal.c, 0.25 * env * (0.6 + 0.4 * Math.abs(z)));
                      g.lineWidth = 2;
                      g.beginPath();
                      g.moveTo(x, oy + Math.sin(ph) * A);
                      g.lineTo(x, oy - Math.sin(ph) * A);
                      g.stroke();
                  }
              }
              items.sort((a, b) => a.z - b.z);
              for (const it of items)
                  blit(g, it.k ? dotB : dotA, it.x, it.y, 5 + (it.z + 1) * 5, env * (0.35 + (it.z + 1) * 0.35));
          });
      },
  };
      return dna;
    })(),
    /* ── embers */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const embers = {
      id: "particles.embers",
      family: "particles",
      title: "Żar",
      blurb: "Żarzące się iskry unoszą się z dołu ekranu w wirującym polu szumu nad łuną ognia.",
      durationMs: 4000,
      weight: "accent",
      run(c) {
          const glow = c.el("div", `position:absolute;left:0;right:0;bottom:0;height:45%;background:linear-gradient(to top, ${rgba("#f97316", 0.55)}, ${rgba(c.pal.b, 0.15)} 50%, transparent);mix-blend-mode:screen;opacity:0;`);
          c.track(glow.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0.7, offset: 0.5 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const g = c.canvas();
          const sprs = ["#fde68a", "#fb923c", "#ef4444", c.pal.c].map((col) => glowSprite(col, 32));
          const es = [];
          c.loop((t, ms, dt) => {
              fadeCanvas(g, c.W, c.H, 0.3);
              const env = envelope(t, 0.15, 0.25);
              if (t < 0.8)
                  for (let i = 0; i < c.n(6) * dt; i++)
                      es.push({ x: c.rand(c.W), y: c.H + 10, l: 1, s: c.rand(1.5, 5), k: Math.floor(c.rand(4)), seed: c.rand(100) });
              for (const e of es) {
                  const n1 = noise2(e.x * 0.004, e.y * 0.004 + ms * 0.0005);
                  const n2 = noise2(e.x * 0.004 + 40, e.y * 0.004 - ms * 0.0005);
                  e.x += n1 * 4 * dt;
                  e.y += (-1.6 - e.s * 0.4 + n2 * 1.5) * dt;
                  e.l -= 0.0055 * dt;
                  const flick = 0.6 + 0.4 * Math.sin(ms * 0.02 + e.seed);
                  blit(g, sprs[e.k], e.x, e.y, e.s * 2.4, e.l * flick * env);
              }
          });
      },
  };
      return embers;
    })(),
    /* ── fireworks */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const fireworks = {
      id: "particles.fireworks",
      family: "particles",
      title: "Fajerwerki",
      blurb: "Rakiety ze smugą startują znad jeziora i rozkwitają peoniami, które opadają i trzaskają.",
      durationMs: 4000,
      weight: "hero",
      run(c) {
          const g = c.canvas();
          const rockets = Array.from({ length: c.n(7) }, (_, i) => ({ x: c.W * c.rand(0.15, 0.85), y: c.H, vy: -c.rand(13, 17), apex: c.H * c.rand(0.12, 0.38), hue: c.pal.hue + c.rand(-40, 120), at: i * 0.09 + c.rand(0.04), done: false }));
          const parts = [];
          const head = glowSprite("#ffffff", 32);
          c.loop((t, _ms, dt) => {
              fadeCanvas(g, c.W, c.H, 0.16);
              for (const r of rockets) {
                  if (t < r.at || r.done)
                      continue;
                  r.y += r.vy * dt;
                  r.vy *= Math.pow(0.985, dt);
                  blit(g, head, r.x, r.y, 6, 1);
                  g.fillStyle = `hsla(${r.hue},90%,70%,0.6)`;
                  g.fillRect(r.x - 1, r.y, 2, 18);
                  if (r.y <= r.apex || r.vy > -2.5 || t > r.at + 0.4) {
                      r.done = true;
                      const count = c.n(170);
                      for (let i = 0; i < count; i++) {
                          const a = (i / count) * Math.PI * 2;
                          const sp = c.rand(4, 11);
                          parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 1, hue: r.hue + c.rand(-15, 15), crackle: Math.random() < 0.3 });
                      }
                      c.shake(3, 150);
                  }
              }
              for (const p of parts) {
                  p.vx *= Math.pow(0.965, dt);
                  p.vy = p.vy * Math.pow(0.965, dt) + 0.07 * dt;
                  p.x += p.vx * dt;
                  p.y += p.vy * dt;
                  p.l -= 0.009 * dt;
                  if (p.l <= 0)
                      continue;
                  const flick = p.crackle && p.l < 0.45 ? (Math.random() < 0.5 ? 1.6 : 0) : 1;
                  g.fillStyle = `hsla(${p.hue},95%,${55 + p.l * 30}%,${p.l * flick})`;
                  g.beginPath();
                  g.arc(p.x, p.y, 2 + p.l * 2.2, 0, Math.PI * 2);
                  g.fill();
              }
          });
      },
  };
      return fireworks;
    })(),
    /* ── flow-field */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const flowField = {
      id: "particles.flow-field",
      family: "particles",
      title: "Pole przepływu",
      blurb: "Setki cząstek kreśli jedwabne smugi w polu szumu Perlina — jak długie naświetlanie.",
      durationMs: 4200,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const ps = Array.from({ length: c.n(700) }, () => ({ x: c.rand(c.W), y: c.rand(c.H), px: 0, py: 0 }));
          ps.forEach((p) => ((p.px = p.x), (p.py = p.y)));
          c.loop((t, ms, dt) => {
              fadeCanvas(g, c.W, c.H, 0.035);
              const env = envelope(t, 0.1, 0.3);
              g.lineWidth = 1.2;
              for (const p of ps) {
                  const a = noise2(p.x * 0.0025, p.y * 0.0025 + ms * 0.00012) * Math.PI * 4;
                  p.px = p.x;
                  p.py = p.y;
                  p.x += Math.cos(a) * 2.4 * dt;
                  p.y += Math.sin(a) * 2.4 * dt;
                  if (p.x < 0 || p.x > c.W || p.y < 0 || p.y > c.H) {
                      p.x = p.px = c.rand(c.W);
                      p.y = p.py = c.rand(c.H);
                      continue;
                  }
                  g.strokeStyle = `hsla(${c.pal.hue + (a * 30) % 80}, 90%, 65%, ${0.5 * env})`;
                  g.beginPath();
                  g.moveTo(p.px, p.py);
                  g.lineTo(p.x, p.y);
                  g.stroke();
              }
          });
      },
  };
      return flowField;
    })(),
    /* ── galaxy */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const galaxy = {
      id: "particles.galaxy",
      family: "particles",
      title: "Galaktyka",
      blurb: "Tysiące gwiazd układają się w spiralną galaktykę z rotacją różnicową wokół kuli.",
      durationMs: 4000,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const arms = 3;
          const R = Math.min(c.W, c.H) * 0.48;
          const stars = Array.from({ length: c.n(2200) }, () => {
              const r = Math.pow(Math.random(), 0.7) * R + or * 0.6;
              const arm = Math.floor(Math.random() * arms);
              return { r, a: (arm / arms) * Math.PI * 2 + r * 0.011 + (Math.random() - 0.5) * (0.6 - (r / R) * 0.3), s: Math.random() };
          });
          const core = glowSprite(c.pal.core, 128, 0.3);
          const nebA = glowSprite(c.pal.a, 64, 0.02);
          const nebB = glowSprite(c.pal.b, 64, 0.02);
          c.loop((t, _ms, dt) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.2, 0.25);
              const grow = ease.outCubic(seg(t, 0, 0.35));
              blit(g, core, ox, oy, or * 3 * grow, 0.6 * env);
              for (const st of stars) {
                  st.a += (0.9 / Math.sqrt(st.r)) * 0.05 * dt;
                  const rr = st.r * (0.3 + 0.7 * grow);
                  const x = ox + Math.cos(st.a) * rr;
                  const y = oy + Math.sin(st.a) * rr * 0.42;
                  const k = st.r / R;
                  if (st.s < 0.12) {
                      blit(g, st.s < 0.06 ? nebA : nebB, x, y, 14 + st.s * 120, env * 0.22);
                      continue;
                  }
                  g.fillStyle = k < 0.25 ? c.pal.core : k < 0.6 ? c.pal.c : st.s > 0.5 ? c.pal.a : c.pal.b;
                  g.globalAlpha = env * (0.55 + st.s * 0.45);
                  const sz = st.s > 0.97 ? 3.2 : 2;
                  g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
              }
              g.globalAlpha = 1;
          });
      },
  };
      return galaxy;
    })(),
    /* ── snow */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const snow = {
      id: "particles.snow",
      family: "particles",
      title: "Śnieżyca",
      blurb: "Trzy warstwy płatków z rozmyciem bokeh na pierwszym planie; podmuchy wiatru zmieniają kierunek.",
      durationMs: 4400,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const soft = glowSprite("#ffffff", 64, 0.05);
          const flakes = Array.from({ length: c.n(420) }, () => {
              const z = Math.random();
              return { x: c.rand(c.W), y: c.rand(-c.H, c.H), z, s: z < 0.6 ? c.rand(1, 2) : z < 0.9 ? c.rand(2.5, 4) : c.rand(10, 22), ph: c.rand(10) };
          });
          c.scene([{ filter: "none" }, { filter: "saturate(.7) brightness(1.05) hue-rotate(-12deg)", offset: 0.2 }, { filter: "saturate(.7) brightness(1.05) hue-rotate(-12deg)", offset: 0.8 }, { filter: "none" }], { duration: c.durationMs });
          c.loop((t, ms, dt) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.15, 0.2);
              const wind = noise2(ms * 0.0004, 3.3) * 9;
              for (const f of flakes) {
                  const depth = 0.3 + f.z * 1.4;
                  f.y += (0.6 + f.z * 2.4) * dt;
                  f.x += (wind * depth + Math.sin(ms * 0.002 + f.ph) * 0.6) * dt;
                  if (f.y > c.H + 20) {
                      f.y = -20;
                      f.x = c.rand(c.W);
                  }
                  if (f.x > c.W + 30)
                      f.x = -30;
                  if (f.x < -30)
                      f.x = c.W + 30;
                  if (f.z > 0.9)
                      blit(g, soft, f.x, f.y, f.s, env * 0.35);
                  else {
                      g.globalAlpha = env * (0.5 + f.z * 0.5);
                      g.fillStyle = "#fff";
                      g.beginPath();
                      g.arc(f.x, f.y, f.s, 0, Math.PI * 2);
                      g.fill();
                  }
              }
              g.globalAlpha = 1;
          });
      },
  };
      return snow;
    })(),
    /* ── swarm */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const swarm = {
      id: "particles.swarm",
      family: "particles",
      title: "Rój",
      blurb: "Stado boidów (separacja, wyrównanie, spójność) kłębi się i podąża za kursorem.",
      durationMs: 4200,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const target = { ...c.anchors.pointer };
          let follow = false;
          c.onPointer((p) => {
              target.x = p.x;
              target.y = p.y;
              follow = true;
          });
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const boids = Array.from({ length: c.n(140) }, () => ({ x: c.rand(c.W), y: c.rand(c.H), vx: c.rand(-2, 2), vy: c.rand(-2, 2) }));
          c.loop((t, ms, dt) => {
              fadeCanvas(g, c.W, c.H, 0.22);
              const env = envelope(t, 0.1, 0.2);
              const goal = follow ? target : { x: ox + Math.cos(ms * 0.0012) * or * 3, y: oy + Math.sin(ms * 0.0019) * or * 1.6 };
              for (const b of boids) {
                  let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0;
                  for (const o of boids) {
                      if (o === b)
                          continue;
                      const dx = o.x - b.x;
                      const dy = o.y - b.y;
                      const d2 = dx * dx + dy * dy;
                      if (d2 > 3600)
                          continue;
                      n++;
                      ax += o.vx;
                      ay += o.vy;
                      cx += dx;
                      cy += dy;
                      if (d2 < 400) {
                          sx -= dx / (d2 + 1);
                          sy -= dy / (d2 + 1);
                      }
                  }
                  if (n) {
                      b.vx += (ax / n - b.vx) * 0.05 + (cx / n) * 0.002 + sx * 6;
                      b.vy += (ay / n - b.vy) * 0.05 + (cy / n) * 0.002 + sy * 6;
                  }
                  b.vx += (goal.x - b.x) * 0.0009;
                  b.vy += (goal.y - b.y) * 0.0009;
                  const sp = Math.hypot(b.vx, b.vy) || 1;
                  const max = 7;
                  if (sp > max) {
                      b.vx = (b.vx / sp) * max;
                      b.vy = (b.vy / sp) * max;
                  }
                  b.x += b.vx * dt;
                  b.y += b.vy * dt;
                  const a = Math.atan2(b.vy, b.vx);
                  g.save();
                  g.translate(b.x, b.y);
                  g.rotate(a);
                  g.globalAlpha = env;
                  g.fillStyle = sp > 5 ? c.pal.c : c.pal.a;
                  g.beginPath();
                  g.moveTo(7, 0);
                  g.lineTo(-5, 3.5);
                  g.lineTo(-3, 0);
                  g.lineTo(-5, -3.5);
                  g.closePath();
                  g.fill();
                  g.restore();
              }
              g.globalAlpha = 1;
          });
      },
  };
      return swarm;
    })(),
    /* ── text-assemble */
    (() => {
  // Extracted from src/effects/signature/fx-particles.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const textAssemble = {
      id: "particles.text-assemble",
      family: "particles",
      title: "Napis z pyłu",
      blurb: "Cząstki z całego ekranu zlatują się i układają w napis, który na końcu eksploduje.",
      durationMs: 3800,
      weight: "hero",
      run(c) {
          const g = c.canvas();
          const word = (c.text ?? "JARVIS").toUpperCase();
          const size = Math.min(c.W / (word.length * 0.75), 200);
          const pts = textPoints(word, Math.round(c.W), Math.round(c.H), size, c.lite ? 9 : 6);
          const spr = [glowSprite(c.pal.a, 24), glowSprite(c.pal.c, 24)];
          const parts = pts.map((p) => {
              const edge = Math.random() * 4;
              const sx = edge < 1 ? c.rand(c.W) : edge < 2 ? c.W + 20 : edge < 3 ? c.rand(c.W) : -20;
              const sy = edge < 1 ? -20 : edge < 2 ? c.rand(c.H) : edge < 3 ? c.H + 20 : c.rand(c.H);
              return { x: sx, y: sy, sx, sy, tx: p.x, ty: p.y, d: c.rand(0.18), vx: 0, vy: 0 };
          });
          let exploded = false;
          c.loop((t, ms, dt) => {
              clear(g, c.W, c.H);
              if (t < 0.72) {
                  for (const p of parts) {
                      const k = ease.inOutCubic(seg(t, p.d, p.d + 0.38));
                      const jitter = k >= 1 ? noise2(p.tx * 0.05, ms * 0.002) * 1.5 : 0;
                      p.x = p.sx + (p.tx - p.sx) * k + jitter;
                      p.y = p.sy + (p.ty - p.sy) * k + Math.sin(k * Math.PI) * -60;
                      blit(g, spr[k >= 1 ? 1 : 0], p.x, p.y, k >= 1 ? 4 : 3, 0.4 + k * 0.6);
                  }
                  return;
              }
              if (!exploded) {
                  exploded = true;
                  c.shake(10, 400);
                  const cx = c.W / 2;
                  const cy = c.H / 2;
                  for (const p of parts) {
                      const a = Math.atan2(p.y - cy, p.x - cx) + c.rand(-0.3, 0.3);
                      const sp = c.rand(4, 16);
                      p.vx = Math.cos(a) * sp;
                      p.vy = Math.sin(a) * sp;
                  }
              }
              const f = seg(t, 0.72, 1);
              for (const p of parts) {
                  p.vy += 0.2 * dt;
                  p.x += p.vx * dt;
                  p.y += p.vy * dt;
                  p.vx *= Math.pow(0.97, dt);
                  blit(g, spr[1], p.x, p.y, 4, 1 - f);
              }
          });
      },
  };
      return textAssemble;
    })(),
  );
})();
