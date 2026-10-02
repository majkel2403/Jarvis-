'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — orb (10)
   GENEROWANE z katalog/01-signature-fx/orb/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: orb.arc-reactor, orb.charge-up, orb.heartbeat, orb.holo-globe, orb.lightning-crown, orb.magnetic-field, orb.singularity, orb.solar-flare, orb.sonar, orb.supernova */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.orb = J.fxEffects.orb || [];
const { rgba } = J.fxPal;
const { clamp, ease, envelope, noise2, seg } = J.fxRt;
const { blit, bolt, center, clear, fadeCanvas, glowSprite, glowStroke, strokePath } = J.fxDraw;
J.fxEffects.orb.push(
    /* ── arc-reactor */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const arcReactor = {
      id: "orb.arc-reactor",
      family: "orb",
      title: "Reaktor łukowy",
      blurb: "Pięć segmentowanych pierścieni rozpędza się w przeciwnych kierunkach i wyładowuje rozbłysk.",
      durationMs: 2300,
      weight: "accent",
      run(c) {
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const s = c.svg(`filter:drop-shadow(0 0 6px ${c.pal.a}) drop-shadow(0 0 18px ${c.pal.a});`);
          const gEl = c.svgEl("g", { transform: `translate(${ox} ${oy})` }, s);
          const rings = [1.25, 1.5, 1.8, 2.15, 2.6].map((k, i) => {
              const r = or * k;
              const circ = 2 * Math.PI * r;
              const segs = [6, 12, 3, 24, 8][i];
              const dash = circ / segs;
              const el = c.svgEl("circle", {
                  r,
                  fill: "none",
                  stroke: i % 2 ? c.pal.b : c.pal.c,
                  "stroke-width": [6, 2, 10, 1.5, 3][i],
                  "stroke-dasharray": `${dash * [0.7, 0.4, 0.82, 0.5, 0.25][i]} ${dash * [0.3, 0.6, 0.18, 0.5, 0.75][i]}`,
                  opacity: 0,
              }, gEl);
              const dir = i % 2 ? -1 : 1;
              c.track(el.animate([{ transform: "rotate(0deg)", opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `rotate(${dir * (540 + i * 120)}deg)`, opacity: 1, offset: 0.72 }, { transform: `rotate(${dir * (620 + i * 120)}deg) scale(1.35)`, opacity: 0 }], {
                  duration: c.durationMs,
                  delay: i * 60,
                  easing: "cubic-bezier(.6,0,.3,1)",
                  fill: "both",
              }));
              return el;
          });
          void rings;
          const tri = c.svgEl("path", { d: `M0 ${-or * 0.7} L${or * 0.6} ${or * 0.35} L${-or * 0.6} ${or * 0.35} Z`, fill: "none", stroke: c.pal.core, "stroke-width": 3 }, gEl);
          c.track(tri.animate([{ transform: "rotate(0) scale(.4)", opacity: 0 }, { transform: "rotate(240deg) scale(1)", opacity: 1, offset: 0.5 }, { transform: "rotate(360deg) scale(1.6)", opacity: 0 }], { duration: c.durationMs, fill: "both", easing: "ease-in-out" }));
          const glow = c.el("div", `position:absolute;left:${ox}px;top:${oy}px;width:${or * 6}px;height:${or * 6}px;margin:${-or * 3}px;border-radius:50%;background:radial-gradient(circle, ${c.pal.core} 0%, ${rgba(c.pal.a, 0.6)} 20%, transparent 60%);mix-blend-mode:screen;opacity:0;`);
          c.track(glow.animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 0, offset: 0.66 }, { opacity: 1, transform: "scale(1)", offset: 0.74 }, { opacity: 0, transform: "scale(1.8)" }], { duration: c.durationMs, fill: "both" }));
          c.after(c.durationMs * 0.72, () => c.shake(6, 300));
      },
  };
      return arcReactor;
    })(),
    /* ── charge-up */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const chargeUp = {
      id: "orb.charge-up",
      family: "orb",
      title: "Ładowanie rdzenia",
      blurb: "Energia z całej sceny spiralnie zasysana do kuli, kamera się przybliża — potem wyrzut.",
      durationMs: 2600,
      weight: "hero",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const spr = [glowSprite(c.pal.a, 48), glowSprite(c.pal.c, 48)];
          const core = glowSprite(c.pal.core, 128, 0.3);
          const far = Math.hypot(c.W, c.H) * 0.55;
          const parts = Array.from({ length: c.n(300) }, () => ({ a: c.rand(Math.PI * 2), r: c.rand(or * 2, far), s: c.rand(0.6, 1.4), x: 0, y: 0, vx: 0, vy: 0 }));
          let released = false;
          c.scene([{ transform: "scale(1)" }, { transform: "scale(1.06)", offset: 0.62 }, { transform: "scale(0.98)", offset: 0.68 }, { transform: "scale(1)" }], { duration: c.durationMs, easing: "ease-in", composite: "add" }, { x: ox, y: oy });
          c.loop((t, _ms, dt) => {
              fadeCanvas(g, c.W, c.H, released ? 0.2 : 0.18);
              const charge = seg(t, 0, 0.64);
              if (t < 0.64) {
                  for (const p of parts) {
                      const speed = 0.02 + ease.inCubic(charge) * 0.22;
                      p.r -= p.r * speed * 0.35 * dt * p.s;
                      p.a += (0.02 + speed * 0.9) * dt;
                      if (p.r < or * 0.9)
                          p.r = c.rand(far * 0.6, far);
                      p.x = ox + Math.cos(p.a) * p.r;
                      p.y = oy + Math.sin(p.a) * p.r;
                      blit(g, spr[p.s > 1 ? 1 : 0], p.x, p.y, 2 + p.s * 3, 0.3 + charge * 0.7);
                  }
                  blit(g, core, ox, oy, or * (0.8 + ease.inExpo(charge) * 1.6), 0.4 + charge * 0.6);
              }
              else {
                  if (!released) {
                      released = true;
                      c.shake(12 * c.intensity, 500);
                      for (const p of parts) {
                          const a = c.rand(Math.PI * 2);
                          const sp = c.rand(6, 26);
                          p.x = ox;
                          p.y = oy;
                          p.vx = Math.cos(a) * sp;
                          p.vy = Math.sin(a) * sp;
                      }
                  }
                  const rel = seg(t, 0.64, 1);
                  for (const p of parts) {
                      p.x += p.vx * dt;
                      p.y += p.vy * dt;
                      p.vx *= Math.pow(0.94, dt);
                      p.vy *= Math.pow(0.94, dt);
                      blit(g, spr[p.s > 1 ? 1 : 0], p.x, p.y, 3 + p.s * 3, 1 - rel);
                  }
                  g.globalAlpha = 1 - rel;
                  g.strokeStyle = c.pal.c;
                  g.lineWidth = 6 * (1 - rel) + 1;
                  g.beginPath();
                  g.arc(ox, oy, or + ease.outExpo(rel) * far, 0, Math.PI * 2);
                  g.stroke();
                  g.globalAlpha = 1;
                  blit(g, core, ox, oy, or * 3 * (1 - rel) + or, 1 - rel);
              }
          });
      },
  };
      return chargeUp;
    })(),
    /* ── heartbeat */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const heartbeat = {
      id: "orb.heartbeat",
      family: "orb",
      title: "Puls EKG",
      blurb: "Linia EKG przebiega przez scenę z poświatą fosforu; każde uderzenie pompuje kulę i scenę.",
      durationMs: 3000,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const beats = [0.28, 0.6];
          const amp = or * 1.6;
          const wave = (u) => {
              let y = Math.sin(u * 80) * 0.01;
              for (const b of beats) {
                  const d = (u - b) * 40;
                  y += 0.12 * Math.exp(-Math.pow(d + 2.2, 2) * 2);
                  y -= 0.18 * Math.exp(-Math.pow(d + 0.35, 2) * 30);
                  y += 1.0 * Math.exp(-Math.pow(d, 2) * 40);
                  y -= 0.3 * Math.exp(-Math.pow(d - 0.4, 2) * 30);
                  y += 0.22 * Math.exp(-Math.pow(d - 2.5, 2) * 1.5);
              }
              return y;
          };
          const head = glowSprite(c.pal.core, 64);
          const ring = glowSprite(c.pal.a, 128, 0.2);
          const travel = 0.9;
          for (const b of beats) {
              const at = (b / travel) * c.durationMs;
              c.after(at, () => {
                  c.scene([{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(.2,2,.4,1)", composite: "add" }, { x: ox, y: oy });
              });
          }
          c.loop((t) => {
              fadeCanvas(g, c.W, c.H, 0.06);
              const u = Math.min(1, t / travel);
              const steps = 14;
              const pts = [];
              for (let i = 0; i <= steps; i++) {
                  const uu = Math.max(0, u - 0.012 + (i / steps) * 0.012);
                  pts.push({ x: uu * c.W, y: oy - wave(uu) * amp });
              }
              glowStroke(g, pts, c.pal.a, c.pal.c, 2, 1);
              const hp = pts[pts.length - 1];
              if (u < 1)
                  blit(g, head, hp.x, hp.y, 22, 1);
              for (const b of beats) {
                  const since = u - b;
                  if (since > 0 && since < 0.12)
                      blit(g, ring, ox, oy, or * (1.2 + since * 12), (0.12 - since) * 4);
              }
          });
      },
  };
      return heartbeat;
    })(),
    /* ── holo-globe */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const holoGlobe = {
      id: "orb.holo-globe",
      family: "orb",
      title: "Holo-glob",
      blurb: "Kula zamienia się w obracający się glob 3D z łukami połączeń między miastami.",
      durationMs: 3600,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const R = or * 2.55;
          const tilt = 0.4;
          const project = (lat, lon, rot, lift = 1) => {
              const x = Math.cos(lat) * Math.sin(lon + rot);
              const y = Math.sin(lat);
              const z = Math.cos(lat) * Math.cos(lon + rot);
              const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
              const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
              return { x: ox + x * R * lift, y: oy - y2 * R * lift, z: z2 };
          };
          const cities = Array.from({ length: 12 }, () => ({ lat: c.rand(-1.1, 1.1), lon: c.rand(Math.PI * 2) }));
          const arcs = Array.from({ length: c.n(9) }, (_, i) => ({ a: cities[i % 12], b: cities[(i * 5 + 3) % 12], d: c.rand(0.1, 0.55) }));
          const dot = glowSprite(c.pal.c, 32);
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.15, 0.2);
              const rot = ms * 0.0008;
              const s = ease.outBack(seg(t, 0, 0.2));
              g.save();
              g.translate(ox, oy);
              g.scale(s, s);
              g.translate(-ox, -oy);
              g.globalCompositeOperation = "lighter";
              const line = (pts) => {
                  for (let i = 1; i < pts.length; i++) {
                      const p = pts[i - 1];
                      const q = pts[i];
                      g.globalAlpha = env * (q.z > 0 ? 0.6 : 0.12);
                      g.beginPath();
                      g.moveTo(p.x, p.y);
                      g.lineTo(q.x, q.y);
                      g.stroke();
                  }
              };
              g.strokeStyle = c.pal.a;
              g.lineWidth = 1.8;
              for (let lat = -60; lat <= 60; lat += 20)
                  line(Array.from({ length: 49 }, (_, i) => project((lat * Math.PI) / 180, (i / 48) * Math.PI * 2, rot)));
              for (let lon = 0; lon < 360; lon += 20)
                  line(Array.from({ length: 33 }, (_, i) => project(-Math.PI / 2 + (i / 32) * Math.PI, (lon * Math.PI) / 180, rot)));
              g.strokeStyle = c.pal.c;
              g.lineWidth = 3.2;
              for (const A of arcs) {
                  const p = ease.inOutCubic(seg(t, A.d, A.d + 0.35));
                  if (p <= 0)
                      continue;
                  const pts = Array.from({ length: Math.max(2, Math.floor(40 * p)) }, (_, i) => {
                      const u = i / 39;
                      const lat = A.a.lat + (A.b.lat - A.a.lat) * u;
                      const lon = A.a.lon + (A.b.lon - A.a.lon) * u;
                      return project(lat, lon, rot, 1 + Math.sin(u * Math.PI) * 0.35);
                  });
                  line(pts);
                  const head = pts[pts.length - 1];
                  if (head.z > -0.2)
                      blit(g, dot, head.x, head.y, 10, env);
              }
              for (const ci of cities) {
                  const p = project(ci.lat, ci.lon, rot);
                  if (p.z > 0)
                      blit(g, dot, p.x, p.y, 6 + 3 * Math.sin(ms * 0.01 + ci.lon), env);
              }
              const scanY = oy - R + ((ms * 0.25) % (R * 2));
              const grad = g.createLinearGradient(0, scanY - 20, 0, scanY + 20);
              grad.addColorStop(0, "transparent");
              grad.addColorStop(0.5, rgba(c.pal.c, 0.35 * env));
              grad.addColorStop(1, "transparent");
              g.globalAlpha = 1;
              g.fillStyle = grad;
              g.fillRect(ox - R * 1.3, scanY - 20, R * 2.6, 40);
              g.restore();
          });
      },
  };
      return holoGlobe;
    })(),
    /* ── lightning-crown */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const lightningCrown = {
      id: "orb.lightning-crown",
      family: "orb",
      title: "Korona piorunów",
      blurb: "Rozgałęzione wyładowania strzelają z kuli w panele, dock i kursor — scena migocze.",
      durationMs: 1800,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const targets = [];
          for (const r of [c.anchors.widget, c.anchors.chat, c.anchors.log, c.anchors.dock])
              if (r)
                  targets.push(center(r));
          targets.push(c.anchors.pointer);
          while (targets.length < 7) {
              const a = c.rand(Math.PI * 2);
              targets.push({ x: ox + Math.cos(a) * or * c.rand(2.5, 4.5), y: oy + Math.sin(a) * or * c.rand(2.5, 4.5) });
          }
          let bolts = [];
          let next = 0;
          const hit = glowSprite(c.pal.c, 96);
          c.scene(Array.from({ length: 12 }, (_, i) => ({ filter: i % 2 ? "brightness(1.35) contrast(1.1)" : "brightness(1)" })), { duration: c.durationMs * 0.8, easing: "steps(12)" });
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              if (ms > next) {
                  next = ms + c.rand(45, 110);
                  bolts = [];
                  const count = Math.round(2 + 4 * envelope(t, 0.1, 0.35) * c.intensity);
                  for (let i = 0; i < count; i++) {
                      const tg = c.pick(targets);
                      const a = Math.atan2(tg.y - oy, tg.x - ox);
                      const from = { x: ox + Math.cos(a) * or * 0.9, y: oy + Math.sin(a) * or * 0.9 };
                      const main = bolt(from, tg, c.lite ? 5 : 7, 0.22);
                      bolts.push(main);
                      for (let b = 0; b < 2; b++) {
                          const at = main[Math.floor(c.rand(main.length * 0.2, main.length * 0.7))];
                          const ang = a + c.rand(-1, 1);
                          const len = c.rand(30, 120);
                          bolts.push(bolt(at, { x: at.x + Math.cos(ang) * len, y: at.y + Math.sin(ang) * len }, 4, 0.35));
                      }
                  }
              }
              const env = envelope(t, 0.05, 0.3);
              bolts.forEach((b, i) => {
                  glowStroke(g, b, c.pal.a, c.pal.core, i % 3 === 0 ? 2.2 : 1, env * c.rand(0.6, 1));
                  const end = b[b.length - 1];
                  if (i % 3 === 0)
                      blit(g, hit, end.x, end.y, 40, env * 0.8);
              });
              blit(g, hit, ox, oy, or * 2.2, env * 0.6);
          });
      },
  };
      return lightningCrown;
    })(),
    /* ── magnetic-field */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const magneticField = {
      id: "orb.magnetic-field",
      family: "orb",
      title: "Pole magnetyczne",
      blurb: "Linie pola dipola rysują się wokół kuli, a ładunki płyną po nich jak w polarnej zorzy.",
      durationMs: 3000,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const tilt = -0.25;
          const lines = [];
          const Ls = [1.6, 2.1, 2.7, 3.4, 4.3, 5.5];
          for (const L of Ls)
              for (const side of [1, -1]) {
                  const pts = [];
                  for (let i = 0; i <= 80; i++) {
                      const th = 0.18 + (i / 80) * (Math.PI - 0.36);
                      const r = L * or * Math.pow(Math.sin(th), 2);
                      if (r < or * 0.95)
                          continue;
                      const lx = side * r * Math.sin(th);
                      const ly = -r * Math.cos(th);
                      pts.push({ x: ox + lx * Math.cos(tilt) - ly * Math.sin(tilt), y: oy + lx * Math.sin(tilt) + ly * Math.cos(tilt) });
                  }
                  lines.push(pts);
              }
          const dot = glowSprite(c.pal.c, 48);
          const charges = lines.flatMap((_, li) => Array.from({ length: c.n(4) }, () => ({ li, p: Math.random(), v: c.rand(0.004, 0.012) })));
          c.loop((t, ms, dt) => {
              clear(g, c.W, c.H);
              const draw = ease.inOutCubic(seg(t, 0, 0.45));
              const env = envelope(t, 0.05, 0.25);
              lines.forEach((pts, i) => {
                  const n = Math.floor(pts.length * draw);
                  const shimmer = 0.5 + 0.5 * Math.sin(ms * 0.004 + i);
                  strokePath(g, pts.slice(0, n), i % 2 ? c.pal.a : c.pal.b, 6, 0.08 * env);
                  strokePath(g, pts.slice(0, n), c.pal.c, 1.2, (0.35 + 0.4 * shimmer) * env);
              });
              if (t > 0.2)
                  for (const ch of charges) {
                      ch.p = (ch.p + ch.v * dt) % 1;
                      const pts = lines[ch.li];
                      const q = pts[Math.floor(ch.p * (pts.length - 1))];
                      if (q)
                          blit(g, dot, q.x, q.y, 9, env);
                  }
              g.globalAlpha = 0.25 * env;
              g.strokeStyle = c.pal.c;
              g.setLineDash([4, 8]);
              g.beginPath();
              g.moveTo(ox + Math.sin(-tilt) * or * 6, oy - Math.cos(tilt) * or * 6);
              g.lineTo(ox - Math.sin(-tilt) * or * 6, oy + Math.cos(tilt) * or * 6);
              g.stroke();
              g.setLineDash([]);
              g.globalAlpha = 1;
          });
      },
  };
      return magneticField;
    })(),
    /* ── singularity */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const singularity = {
      id: "orb.singularity",
      family: "orb",
      title: "Osobliwość",
      blurb: "Czarna dziura zamiast kuli: wirujący dysk akrecyjny, pierścień fotonowy i materia wciągana spiralą.",
      durationMs: 3400,
      weight: "hero",
      gl: true,
      run(c) {
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const disk = c.gl(`void main(){
          vec2 p = px() - uOrb.xy;
          float R = uOrb.z;
          float env = smoothstep(0.0,0.18,uT) * (1.0 - smoothstep(0.82,1.0,uT));
          vec2 q = vec2(p.x, p.y / 0.32);
          float r = length(q) / R;
          float ang = atan(q.y, q.x);
          float swirl = ang + uTime * 2.2 / max(r, 0.4) ;
          float band = smoothstep(1.05, 1.35, r) * (1.0 - smoothstep(2.0, 3.6, r));
          float n = fbm(vec2(swirl * 2.0, r * 3.0 - uTime * 0.8));
          float side = 0.55 + 0.45 * cos(ang);
          vec3 col = mix(uA, uC, n) * band * (0.4 + 1.6 * n) * (0.6 + side);
          float rr = length(p) / R;
          float photon = exp(-pow((rr - 1.12) * 18.0, 2.0)) * 1.4;
          col += uC * photon;
          float hole = 1.0 - smoothstep(0.95, 1.08, rr);
          float a = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
          vec3 outc = col * (1.0 - hole);
          float alpha = max(a * (1.0 - hole), hole * 0.96);
          outColor = vec4(outc, alpha) * env * uI;
        }`, "");
          const g = c.canvas();
          const spr = glowSprite(c.pal.c, 32);
          const parts = Array.from({ length: c.n(260) }, () => ({ a: c.rand(Math.PI * 2), r: c.rand(or * 2, Math.hypot(c.W, c.H) * 0.6), w: c.rand(0.6, 1.4) }));
          if (!disk) {
              c.el("div", `position:absolute;left:${ox - or}px;top:${oy - or}px;width:${or * 2}px;height:${or * 2}px;border-radius:50%;background:#000;box-shadow:0 0 0 3px ${c.pal.c},0 0 60px 20px ${c.pal.a};`);
          }
          c.scene([{ transform: "scale(1)" }, { transform: "scale(0.985) rotate(-0.6deg)" }, { transform: "scale(1)" }], { duration: c.durationMs, easing: "ease-in-out", composite: "add" }, { x: ox, y: oy });
          c.loop((t, _ms, dt) => {
              disk?.draw();
              fadeCanvas(g, c.W, c.H, 0.28);
              const env = envelope(t, 0.12, 0.2);
              for (const p of parts) {
                  const pull = (or * 120) / Math.max(p.r, or);
                  p.r -= pull * 0.06 * dt * p.w;
                  p.a += (0.012 + (or * 1.2) / Math.max(p.r, or * 0.8) * 0.02) * dt * p.w;
                  if (p.r < or * 1.05)
                      p.r = c.rand(Math.hypot(c.W, c.H) * 0.35, Math.hypot(c.W, c.H) * 0.6);
                  const x = ox + Math.cos(p.a) * p.r;
                  const y = oy + Math.sin(p.a) * p.r * 0.55;
                  blit(g, spr, x, y, 3 + (or * 4) / p.r, env * clamp(p.r / (or * 2)));
              }
          });
      },
  };
      return singularity;
    })(),
    /* ── solar-flare */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const solarFlare = {
      id: "orb.solar-flare",
      family: "orb",
      title: "Rozbłysk słoneczny",
      blurb: "Plazmowe protuberancje wyrastają łukami z powierzchni kuli i wyrzucają materię.",
      durationMs: 2800,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const loops = Array.from({ length: c.n(7) }, (_, i) => ({ a: (i / 7) * Math.PI * 2 + c.rand(0.4), span: c.rand(0.35, 0.8), h: c.rand(1.2, 2.8), d: c.rand(0, 0.25), seed: c.rand(100) }));
          const spr = [glowSprite(c.pal.b, 48), glowSprite(c.pal.c, 48)];
          const ejecta = [];
          c.loop((t, ms, dt) => {
              fadeCanvas(g, c.W, c.H, 0.35);
              const env = envelope(t, 0.1, 0.25);
              blit(g, glowSprite(c.pal.a, 128, 0.3), ox, oy, or * 2.4, 0.5 * env);
              for (const L of loops) {
                  const grow = ease.outCubic(seg(t, L.d, L.d + 0.5));
                  const a0 = L.a - L.span / 2;
                  const a1 = L.a + L.span / 2;
                  const p0 = { x: ox + Math.cos(a0) * or, y: oy + Math.sin(a0) * or };
                  const p1 = { x: ox + Math.cos(a1) * or, y: oy + Math.sin(a1) * or };
                  const hh = or * L.h * grow;
                  const cp = { x: ox + Math.cos(L.a) * (or + hh * 1.6), y: oy + Math.sin(L.a) * (or + hh * 1.6) };
                  for (let s = 0; s < 4; s++) {
                      const pts = [];
                      for (let i = 0; i <= 30; i++) {
                          const u = i / 30;
                          const w = noise2(L.seed + s, u * 3 + ms * 0.0015) * or * 0.25 * grow;
                          const x = (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * cp.x + u * u * p1.x;
                          const y = (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * cp.y + u * u * p1.y;
                          pts.push({ x: x + Math.cos(L.a + Math.PI / 2) * w, y: y + Math.sin(L.a + Math.PI / 2) * w });
                      }
                      strokePath(g, pts, s % 2 ? c.pal.a : c.pal.b, 7 - s, 0.25 * env);
                      strokePath(g, pts, c.pal.c, 1.4, 0.5 * env);
                  }
                  if (grow > 0.6 && Math.random() < 0.25 * dt) {
                      const top = { x: ox + Math.cos(L.a) * (or + hh * 0.9), y: oy + Math.sin(L.a) * (or + hh * 0.9) };
                      ejecta.push({ ...top, vx: Math.cos(L.a + c.rand(-0.4, 0.4)) * c.rand(1, 4), vy: Math.sin(L.a + c.rand(-0.4, 0.4)) * c.rand(1, 4), l: 1 });
                  }
              }
              for (const p of ejecta) {
                  p.x += p.vx * dt;
                  p.y += p.vy * dt;
                  p.l -= 0.015 * dt;
                  blit(g, spr[Math.round(p.l * 3) % 2], p.x, p.y, 6, p.l * env);
              }
          });
      },
  };
      return solarFlare;
    })(),
    /* ── sonar */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const sonar = {
      id: "orb.sonar",
      family: "orb",
      title: "Sonar",
      blurb: "Fale sonaru z kuli; gdy dotkną paneli i docka, zapalają na nich echo z etykietą kontaktu.",
      durationMs: 3200,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const maxR = Math.hypot(Math.max(ox, c.W - ox), Math.max(oy, c.H - oy));
          const tg = [];
          for (const r of [c.anchors.widget, c.anchors.chat, c.anchors.log, c.anchors.dock])
              if (r)
                  tg.push({ kind: "rect", r, d: Math.hypot(center(r).x - ox, center(r).y - oy), hitAt: -1 });
          for (let i = 0; i < c.n(10); i++) {
              const a = c.rand(Math.PI * 2);
              const d = c.rand(or * 2, maxR * 0.8);
              tg.push({ kind: "dot", p: { x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d * 0.7 }, d: Math.hypot(Math.cos(a) * d, Math.sin(a) * d * 0.7), hitAt: -1 });
          }
          const blip = glowSprite(c.pal.c, 48);
          const pings = [0, 0.3, 0.6];
          const labels = [];
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              for (const p0 of pings) {
                  const p = seg(t, p0, p0 + 0.55);
                  if (p <= 0 || p >= 1)
                      continue;
                  const r = or + ease.outCubic(p) * maxR;
                  const grad = g.createRadialGradient(ox, oy, Math.max(0, r - 90), ox, oy, r);
                  grad.addColorStop(0, "transparent");
                  grad.addColorStop(0.85, rgba(c.pal.a, 0.18 * (1 - p)));
                  grad.addColorStop(1, rgba(c.pal.c, 0.9 * (1 - p)));
                  g.fillStyle = grad;
                  g.beginPath();
                  g.arc(ox, oy, r, 0, Math.PI * 2);
                  g.fill();
                  for (const x of tg)
                      if (x.hitAt < 0 && r >= x.d)
                          x.hitAt = ms;
              }
              for (const x of tg) {
                  if (x.hitAt < 0)
                      continue;
                  const age = (ms - x.hitAt) / 900;
                  if (age > 1)
                      continue;
                  const a = 1 - age;
                  if (x.kind === "dot") {
                      blit(g, blip, x.p.x, x.p.y, 10 + age * 20, a);
                  }
                  else {
                      g.globalAlpha = a;
                      g.strokeStyle = c.pal.c;
                      g.lineWidth = 2;
                      g.shadowColor = c.pal.a;
                      g.shadowBlur = 20;
                      const pad = 6 + age * 14;
                      g.beginPath();
                      g.roundRect(x.r.x - pad, x.r.y - pad, x.r.w + pad * 2, x.r.h + pad * 2, 14);
                      g.stroke();
                      g.shadowBlur = 0;
                      g.globalAlpha = 1;
                      if (!labels[tg.indexOf(x)]) {
                          labels[tg.indexOf(x)] = c.el("div", `position:absolute;left:${x.r.x}px;top:${Math.max(4, x.r.y - 22)}px;font:600 10px ui-monospace,monospace;letter-spacing:.2em;color:${c.pal.c};text-shadow:0 0 8px ${c.pal.a};`, `CONTACT ${String(tg.indexOf(x) + 1).padStart(2, "0")} · ${Math.round(x.d)}m`);
                          c.track(labels[tg.indexOf(x)].animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1400, fill: "forwards" }));
                      }
                  }
              }
              blit(g, blip, ox, oy, or * 0.6, 0.5 + 0.5 * Math.sin(ms * 0.02));
          });
      },
  };
      return sonar;
    })(),
    /* ── supernova */
    (() => {
  // Extracted from src/effects/signature/fx-orb.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const supernova = {
      id: "orb.supernova",
      family: "orb",
      title: "Supernowa",
      blurb: "Rdzeń kuli zapada się, wybucha białym błyskiem i falą uderzeniową z aberracją RGB.",
      durationMs: 2400,
      weight: "hero",
      run(c) {
          const g = c.canvas();
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const core = glowSprite(c.pal.core, 128, 0.25);
          const spr = [glowSprite(c.pal.a), glowSprite(c.pal.b), glowSprite(c.pal.c)];
          const parts = [];
          const maxR = Math.hypot(c.W, c.H);
          let fired = false;
          const flash = c.el("div", `position:absolute;inset:0;background:radial-gradient(circle at ${ox}px ${oy}px, ${c.pal.core}, ${rgba(c.pal.a, 0.5)} 30%, transparent 70%);opacity:0;mix-blend-mode:screen;`);
          c.loop((t, _ms, dt) => {
              clear(g, c.W, c.H);
              const implode = seg(t, 0, 0.22);
              if (t < 0.22) {
                  blit(g, core, ox, oy, or * (1.6 - implode * 1.1), 0.4 + implode * 0.6);
                  for (let i = 0; i < 24; i++) {
                      const a = (i / 24) * Math.PI * 2 + t * 6;
                      const rr = or * (3 - implode * 2.6);
                      blit(g, spr[i % 3], ox + Math.cos(a) * rr, oy + Math.sin(a) * rr, 10, implode);
                  }
              }
              if (t >= 0.22 && !fired) {
                  fired = true;
                  c.track(flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 700, easing: "ease-out" }));
                  c.shake(16 * c.intensity, 600);
                  c.scene([{ transform: "scale(1)" }, { transform: "scale(1.035)" }, { transform: "scale(1)" }], { duration: 700, easing: "cubic-bezier(.2,.9,.3,1)", composite: "add" }, { x: ox, y: oy });
                  for (let i = 0; i < c.n(420); i++) {
                      const a = c.rand(Math.PI * 2);
                      const sp = c.rand(4, 22) * (Math.random() < 0.15 ? 1.6 : 1);
                      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: c.rand(2, 7), l: 1, k: i % 3 });
                  }
              }
              if (!fired)
                  return;
              const p1 = ease.outExpo(seg(t, 0.22, 0.85));
              const p2 = ease.outCubic(seg(t, 0.3, 1));
              const chans = ["#ff3355", "#33ff99", "#3388ff"];
              for (const [ring, w, a] of [
                  [p1 * maxR, 28 * (1 - p1) + 2, 1 - p1],
                  [p2 * maxR * 0.55, 10 * (1 - p2) + 1, (1 - p2) * 0.8],
              ]) {
                  chans.forEach((col, i) => {
                      g.globalAlpha = a * 0.7;
                      g.strokeStyle = col;
                      g.lineWidth = w;
                      g.beginPath();
                      g.arc(ox + (i - 1) * 5 * (1 - p1), oy, Math.max(1, ring + (i - 1) * 4), 0, Math.PI * 2);
                      g.stroke();
                  });
              }
              g.globalAlpha = 1;
              blit(g, core, ox, oy, or * (0.5 + (1 - p2) * 2.5), 1 - p2 * 0.8);
              for (const p of parts) {
                  p.x += p.vx * dt;
                  p.y += p.vy * dt;
                  p.vx *= Math.pow(0.95, dt);
                  p.vy = p.vy * Math.pow(0.95, dt) + 0.05 * dt;
                  p.l -= 0.011 * dt;
                  blit(g, spr[p.k], p.x, p.y, p.s * (0.6 + p.l), p.l);
              }
          });
      },
  };
      return supernova;
    })(),
  );
})();
