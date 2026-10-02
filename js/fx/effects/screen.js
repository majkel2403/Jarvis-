'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — screen (12)
   GENEROWANE z katalog/01-signature-fx/screen/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: screen.aurora, screen.crt-off, screen.glass-shatter, screen.iris, screen.light-leak, screen.lockdown, screen.matrix-rain, screen.pixel-dissolve, screen.ripples, screen.shockwave, screen.thermal, screen.warp-jump */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.screen = J.fxEffects.screen || [];
const { blit, bolt, clear, fadeCanvas, glowSprite, glowStroke } = J.fxDraw;
const { rgba } = J.fxPal;
const { ease, envelope, seg } = J.fxRt;
J.fxEffects.screen.push(
    /* ── aurora */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const aurora = {
      id: "screen.aurora",
      family: "screen",
      title: "Zorza polarna",
      blurb: "Shader FBM: falujące kurtyny zorzy rozwijają się nad górami i gasną.",
      durationMs: 4200,
      weight: "accent",
      gl: true,
      run(c) {
          const gl = c.gl(`void main(){
        vec2 p = px() / uRes;
        float env = smoothstep(0.0,0.25,uT) * (1.0 - smoothstep(0.75,1.0,uT));
        vec3 col = vec3(0.0);
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float x = p.x * (1.6 + fi * 0.5) + uTime * (0.05 + fi * 0.03) + fi * 3.1;
          float wave = 0.18 + fi * 0.07 + 0.08 * sin(x * 3.0 + uTime * 0.7) + 0.1 * (fbm(vec2(x, uTime * 0.15)) - 0.5);
          float d = p.y - wave;
          float curtain = smoothstep(-0.02, 0.0, d) * exp(-max(d, 0.0) * (9.0 - fi * 2.0));
          float rays = pow(fbm(vec2(x * 7.0, p.y * 1.2 - uTime * 0.25)), 2.0) * 2.2;
          vec3 tint = mix(uA, uB, fi / 2.0);
          col += mix(tint, uC, smoothstep(0.0, 0.03, -d + 0.03)) * curtain * rays;
        }
        col *= (1.0 - smoothstep(0.45, 0.7, p.y));
        float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
        outColor = vec4(col, a) * env * uI;
      }`);
          if (gl) {
              c.loop(() => gl.draw());
              return;
          }
          const g = c.canvas();
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.25, 0.25);
              for (let i = 0; i < 3; i++) {
                  g.beginPath();
                  for (let x = 0; x <= c.W; x += 20) {
                      const y = c.H * (0.2 + i * 0.07) + Math.sin(x * 0.006 + ms * 0.001 + i) * 40;
                      if (x)
                          g.lineTo(x, y);
                      else
                          g.moveTo(x, y);
                  }
                  g.strokeStyle = rgba(i % 2 ? c.pal.b : c.pal.a, 0.35 * env);
                  g.lineWidth = 50;
                  g.stroke();
              }
          });
      },
  };
      return aurora;
    })(),
    /* ── crt-off */
    (() => {
  const crtOff = {
      id: "screen.crt-off",
      family: "screen",
      title: "Wyłączenie CRT",
      blurb: "Cały pulpit zwija się do świecącej linii i punktu jak stary kineskop, po czym startuje ponownie.",
      durationMs: 2200,
      weight: "hero",
      run(c) {
          const mid = { x: c.W / 2, y: c.H / 2 };
          c.scene([
              { transform: "scale(1,1)", filter: "brightness(1)" },
              { transform: "scale(1,0.004)", filter: "brightness(4)", offset: 0.22 },
              { transform: "scale(0,0.004)", filter: "brightness(6)", offset: 0.34 },
              { transform: "scale(0,0.004)", filter: "brightness(6)", offset: 0.58 },
              { transform: "scale(1,0.004)", filter: "brightness(4)", offset: 0.68 },
              { transform: "scale(1,1.06)", filter: "brightness(1.6)", offset: 0.82 },
              { transform: "scale(1,1)", filter: "brightness(1)" },
          ], { duration: c.durationMs, easing: "cubic-bezier(.7,0,.3,1)" }, mid);
          const black = c.el("div", "position:absolute;inset:0;background:#000;opacity:0;");
          c.track(black.animate([{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1, offset: 0.24 }, { opacity: 1, offset: 0.66 }, { opacity: 0, offset: 0.7 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const line = c.el("div", `position:absolute;left:0;right:0;top:${mid.y - 1.5}px;height:3px;background:${c.pal.core};box-shadow:0 0 18px 4px ${c.pal.a};opacity:0;`);
          c.track(line.animate([{ opacity: 0, transform: "scaleX(1)" }, { opacity: 0, offset: 0.2 }, { opacity: 1, transform: "scaleX(1)", offset: 0.23 }, { opacity: 1, transform: "scaleX(0)", offset: 0.34 }, { opacity: 0, transform: "scaleX(0)", offset: 0.35 }, { opacity: 0, offset: 0.62 }, { opacity: 1, transform: "scaleX(1)", offset: 0.68 }, { opacity: 0, transform: "scaleX(1)", offset: 0.74 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const dot = c.el("div", `position:absolute;left:${mid.x - 6}px;top:${mid.y - 6}px;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 30px 12px ${c.pal.a};opacity:0;`);
          c.track(dot.animate([{ opacity: 0, transform: "scale(1)" }, { opacity: 0, offset: 0.32 }, { opacity: 1, transform: "scale(1.4)", offset: 0.35 }, { opacity: 0.6, transform: "scale(0.6)", offset: 0.5 }, { opacity: 0, transform: "scale(0)", offset: 0.58 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const scan = c.el("div", "position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(0,0,0,.35) 0 1px, transparent 1px 3px);opacity:0;mix-blend-mode:multiply;");
          c.track(scan.animate([{ opacity: 0 }, { opacity: 0, offset: 0.66 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
      },
  };
      return crtOff;
    })(),
    /* ── glass-shatter */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const glassShatter = {
      id: "screen.glass-shatter",
      family: "screen",
      title: "Rozbita szyba",
      blurb: "Pęknięcia rozchodzą się od punktu uderzenia, a ekran rozpada się na spadające odłamki.",
      durationMs: 3200,
      weight: "hero",
      run(c) {
          const hit = c.anchors.pointer.x > 0 && c.anchors.pointer.x < c.W ? { ...c.anchors.pointer } : { x: c.W * 0.6, y: c.H * 0.4 };
          const g = c.canvas({ blend: "source-over" });
          const rays = 14;
          const rings = [60, 150, 290, 480, 760, 1200, 1800];
          const angles = Array.from({ length: rays }, (_, i) => (i / rays) * Math.PI * 2 + c.rand(-0.12, 0.12));
          const ringR = angles.map(() => rings.map((r) => r * c.rand(0.85, 1.15)));
          const pt = (ai, ri) => {
              const a = angles[ai % rays];
              const r = ri === 0 ? 0 : ringR[ai % rays][ri - 1];
              return { x: hit.x + Math.cos(a) * r, y: hit.y + Math.sin(a) * r };
          };
          const shards = [];
          for (let ri = 0; ri < rings.length; ri++)
              for (let ai = 0; ai < rays; ai++) {
                  const pts = ri === 0 ? [pt(ai, 0), pt(ai, 1), pt(ai + 1, 1)] : [pt(ai, ri), pt(ai, ri + 1), pt(ai + 1, ri + 1), pt(ai + 1, ri)];
                  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
                  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
                  const a = Math.atan2(cy - hit.y, cx - hit.x);
                  const sp = c.rand(1, 4) / (1 + ri * 0.3);
                  shards.push({ pts: pts.map((p) => ({ x: p.x - cx, y: p.y - cy })), cx, cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - c.rand(1, 3), rot: 0, vr: c.rand(-0.06, 0.06), delay: ri * 0.035 + c.rand(0.03), shade: c.rand(0.04, 0.14) });
              }
          const cracks = angles.map((a) => bolt(hit, { x: hit.x + Math.cos(a) * 2000, y: hit.y + Math.sin(a) * 2000 }, 7, 0.06));
          let broke = false;
          c.after(c.durationMs * 0.05, () => c.shake(5, 180));
          c.loop((t, _ms, dt) => {
              clear(g, c.W, c.H);
              const crack = ease.outExpo(seg(t, 0.03, 0.3));
              if (t < 0.36) {
                  for (const cr of cracks) {
                      const pts = cr.slice(0, Math.max(2, Math.floor(cr.length * crack)));
                      g.globalAlpha = 0.9;
                      g.strokeStyle = "rgba(255,255,255,0.85)";
                      g.lineWidth = 1.2;
                      g.beginPath();
                      pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
                      g.stroke();
                  }
                  for (let ri = 0; ri < 4; ri++) {
                      if (crack < ri * 0.2)
                          continue;
                      g.beginPath();
                      for (let ai = 0; ai <= rays; ai++) {
                          const p = pt(ai, ri + 1);
                          if (ai)
                              g.lineTo(p.x, p.y);
                          else
                              g.moveTo(p.x, p.y);
                      }
                      g.strokeStyle = "rgba(255,255,255,0.45)";
                      g.stroke();
                  }
                  g.fillStyle = "rgba(255,255,255,0.9)";
                  g.beginPath();
                  g.arc(hit.x, hit.y, 4 + crack * 6, 0, Math.PI * 2);
                  g.fill();
                  return;
              }
              if (!broke) {
                  broke = true;
                  c.shake(18 * c.intensity, 500);
              }
              const fall = seg(t, 0.36, 1);
              for (const s of shards) {
                  const local = Math.max(0, fall - s.delay);
                  if (local > 0) {
                      s.vy += 0.5 * dt;
                      s.cx += s.vx * dt;
                      s.cy += s.vy * dt;
                      s.rot += s.vr * dt;
                  }
                  g.save();
                  g.translate(s.cx, s.cy);
                  g.rotate(s.rot);
                  g.beginPath();
                  s.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
                  g.closePath();
                  const lg = g.createLinearGradient(-60, -60, 60, 60);
                  lg.addColorStop(0, `rgba(255,255,255,${s.shade + 0.1})`);
                  lg.addColorStop(0.5, rgba(c.pal.a, s.shade));
                  lg.addColorStop(1, `rgba(255,255,255,${s.shade * 0.5})`);
                  g.fillStyle = lg;
                  g.fill();
                  g.strokeStyle = "rgba(255,255,255,0.7)";
                  g.lineWidth = 1;
                  g.stroke();
                  g.restore();
              }
          });
      },
  };
      return glassShatter;
    })(),
    /* ── iris */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const iris = {
      id: "screen.iris",
      family: "screen",
      title: "Przysłona",
      blurb: "Mechaniczna przysłona z ośmiu metalicznych łopatek zamyka się na kuli i otwiera z rozbłyskiem.",
      durationMs: 2000,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const { x: ox, y: oy } = c.anchors.orb;
          const aMax = Math.hypot(Math.max(ox, c.W - ox), Math.max(oy, c.H - oy)) * 1.05;
          const L = aMax * 3;
          const blades = 8;
          const glint = glowSprite(c.pal.core, 96);
          c.after(c.durationMs * 0.46, () => c.shake(4, 160));
          c.loop((t) => {
              clear(g, c.W, c.H);
              const close = t < 0.5 ? ease.inOutCubic(seg(t, 0, 0.45)) : 1 - ease.inOutCubic(seg(t, 0.55, 1));
              const a = aMax * (1 - close * 0.985 * Math.min(1, c.intensity + 0.2));
              const rot = close * 0.9;
              for (let i = 0; i < blades; i++) {
                  const phi = (i / blades) * Math.PI * 2 + rot;
                  const n = { x: Math.cos(phi), y: Math.sin(phi) };
                  const d = { x: -n.y, y: n.x };
                  const P = { x: ox + n.x * a, y: oy + n.y * a };
                  g.beginPath();
                  g.moveTo(P.x - d.x * L * 0.15, P.y - d.y * L * 0.15);
                  g.lineTo(P.x + d.x * L, P.y + d.y * L);
                  g.lineTo(P.x + d.x * L + n.x * L, P.y + d.y * L + n.y * L);
                  g.lineTo(P.x - d.x * L * 0.15 + n.x * L, P.y - d.y * L * 0.15 + n.y * L);
                  g.closePath();
                  const lg = g.createLinearGradient(P.x, P.y, P.x + n.x * 400, P.y + n.y * 400);
                  const l = 14 + (i % 2) * 6;
                  lg.addColorStop(0, `hsl(${c.pal.hue} 25% ${l + 12}%)`);
                  lg.addColorStop(1, `hsl(${c.pal.hue} 30% ${l - 6}%)`);
                  g.fillStyle = lg;
                  g.fill();
                  g.strokeStyle = rgba(c.pal.a, 0.9);
                  g.lineWidth = 1.5;
                  g.beginPath();
                  g.moveTo(P.x - d.x * L * 0.15, P.y - d.y * L * 0.15);
                  g.lineTo(P.x + d.x * L, P.y + d.y * L);
                  g.stroke();
              }
              g.globalCompositeOperation = "lighter";
              if (close > 0.9)
                  blit(g, glint, ox, oy, 60 + (close - 0.9) * 600, (close - 0.9) * 10);
              g.globalCompositeOperation = "source-over";
          });
      },
  };
      return iris;
    })(),
    /* ── light-leak */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const lightLeak = {
      id: "screen.light-leak",
      family: "screen",
      title: "Przebłysk filmu",
      blurb: "Ciepłe plamy światła jak z kliszy dryfują po pulpicie, z ziarnem i wypaleniem krawędzi.",
      durationMs: 3600,
      weight: "accent",
      run(c) {
          const cols = ["#ff6a00", "#ff2d75", c.pal.b, "#ffd166"];
          cols.forEach((col, i) => {
              const size = Math.max(c.W, c.H) * c.rand(0.5, 0.8);
              const b = c.el("div", `position:absolute;left:${c.rand(-0.2, 0.7) * c.W}px;top:${c.rand(-0.3, 0.6) * c.H}px;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle, ${col}cc, ${col}00 65%);filter:blur(40px);mix-blend-mode:screen;opacity:0;`);
              c.track(b.animate([{ opacity: 0, transform: "translate(0,0) scale(.8)" }, { opacity: 0.9, offset: 0.3 + i * 0.05 }, { opacity: 0.6, offset: 0.7 }, { opacity: 0, transform: `translate(${c.rand(-300, 300)}px,${c.rand(-150, 150)}px) scale(1.2)` }], {
                  duration: c.durationMs,
                  delay: i * 120,
                  fill: "both",
                  easing: "ease-in-out",
              }));
          });
          const burn = c.el("div", "position:absolute;inset:0;background:linear-gradient(90deg, #ff8a0099, transparent 25%, transparent 75%, #ff2d7577);mix-blend-mode:screen;opacity:0;");
          c.track(burn.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0.2, offset: 0.25 }, { opacity: 0.8, offset: 0.3 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const tile = document.createElement("canvas");
          tile.width = tile.height = 128;
          const tg = tile.getContext("2d");
          const img = tg.createImageData(128, 128);
          for (let i = 0; i < img.data.length; i += 4) {
              const v = Math.random() * 255;
              img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
              img.data[i + 3] = 40;
          }
          tg.putImageData(img, 0, 0);
          const g = c.canvas({ blend: "source-over", css: "mix-blend-mode:overlay;" });
          const pattern = g.createPattern(tile, "repeat");
          c.loop((t) => {
              clear(g, c.W, c.H);
              g.globalAlpha = envelope(t, 0.1, 0.2);
              g.save();
              g.translate(Math.random() * 128, Math.random() * 128);
              g.fillStyle = pattern;
              g.fillRect(-128, -128, c.W + 256, c.H + 256);
              g.restore();
          });
      },
  };
      return lightLeak;
    })(),
    /* ── lockdown */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const lockdown = {
      id: "screen.lockdown",
      family: "screen",
      title: "Blokada",
      blurb: "Pasy ostrzegawcze wjeżdżają z góry i dołu, wirują światła syreny, stencil BLOKADA pulsuje.",
      durationMs: 3200,
      weight: "hero",
      run(c) {
          const hz = `repeating-linear-gradient(-45deg, ${c.pal.a} 0 22px, #0b0b0b 22px 44px)`;
          for (const side of ["top", "bottom"]) {
              const b = c.el("div", `position:absolute;left:0;right:0;${side}:0;height:54px;background:${hz};box-shadow:0 0 30px ${c.pal.a};`);
              c.track(b.animate([{ transform: `translateY(${side === "top" ? -60 : 60}px)` }, { transform: "translateY(0)", offset: 0.12 }, { transform: "translateY(0)", offset: 0.85 }, { transform: `translateY(${side === "top" ? -60 : 60}px)` }], { duration: c.durationMs, fill: "both", easing: "cubic-bezier(.2,.9,.2,1)" }));
              c.track(b.animate([{ backgroundPosition: "0 0" }, { backgroundPosition: "124px 0" }], { duration: 900, iterations: Infinity }));
          }
          const edge = c.el("div", `position:absolute;inset:0;box-shadow:inset 0 0 120px 20px ${rgba(c.pal.a, 0.85)};`);
          c.track(edge.animate([{ opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }], { duration: 520, iterations: Infinity }));
          for (const x of [0.2, 0.8]) {
              const beam = c.el("div", `position:absolute;left:${c.W * x - c.H}px;top:${-c.H * 0.4}px;width:${c.H * 2}px;height:${c.H * 2}px;background:conic-gradient(from 0deg, transparent 0deg, ${rgba(c.pal.a, 0.45)} 20deg, transparent 40deg, transparent 180deg, ${rgba(c.pal.a, 0.45)} 200deg, transparent 220deg);mix-blend-mode:screen;border-radius:50%;`);
              c.track(beam.animate([{ transform: "rotate(0)" }, { transform: `rotate(${x < 0.5 ? 360 : -360}deg)` }], { duration: 1400, iterations: Infinity }));
              c.track(beam.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          }
          const word = c.el("div", `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:900 ${Math.min(120, c.W / 8)}px ui-sans-serif,system-ui;letter-spacing:.25em;color:transparent;-webkit-text-stroke:2px ${c.pal.c};text-shadow:0 0 30px ${c.pal.a};white-space:nowrap;`, c.text ?? "BLOKADA");
          c.track(word.animate([{ opacity: 0, letterSpacing: "1em" }, { opacity: 1, letterSpacing: ".25em", offset: 0.15 }, { opacity: 0.4, offset: 0.3 }, { opacity: 1, offset: 0.45 }, { opacity: 0.4, offset: 0.6 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          c.scene([{ filter: "saturate(1)" }, { filter: "saturate(0.25) brightness(0.8)", offset: 0.12 }, { filter: "saturate(0.25) brightness(0.8)", offset: 0.85 }, { filter: "saturate(1)" }], { duration: c.durationMs });
          c.after(c.durationMs * 0.12, () => c.shake(8, 300));
      },
  };
      return lockdown;
    })(),
    /* ── matrix-rain */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ΣΔΞΨ";
  const matrixRain = {
      id: "screen.matrix-rain",
      family: "screen",
      title: "Deszcz kodu",
      blurb: "Kolumny glifów spadają z jasną głowicą i zanikającym ogonem, przesłaniając pulpit.",
      durationMs: 3400,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const size = 16;
          const cols = Math.ceil(c.W / size);
          const drops = Array.from({ length: cols }, () => ({ y: c.rand(-c.H, 0), v: c.rand(4, 11), on: Math.random() < 0.55 + 0.35 * Math.min(1, c.intensity) }));
          const veil = c.el("div", "position:absolute;inset:0;background:#000;opacity:0;");
          veil.parentElement.insertBefore(veil, g.canvas);
          c.track(veil.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.2 }, { opacity: 0.55, offset: 0.75 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          g.font = `600 ${size}px ui-monospace, monospace`;
          g.textAlign = "center";
          c.loop((t, _ms, dt) => {
              fadeCanvas(g, c.W, c.H, 0.09);
              const env = envelope(t, 0.1, 0.25);
              g.canvas.style.opacity = String(env);
              for (let i = 0; i < cols; i++) {
                  const d = drops[i];
                  if (!d.on)
                      continue;
                  d.y += d.v * dt;
                  const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                  g.fillStyle = c.pal.core;
                  g.shadowColor = c.pal.a;
                  g.shadowBlur = 10;
                  g.fillText(ch, i * size + size / 2, d.y);
                  g.shadowBlur = 0;
                  g.fillStyle = c.pal.a;
                  g.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], i * size + size / 2, d.y - size);
                  if (d.y > c.H + 40 && t < 0.75)
                      d.y = c.rand(-200, 0);
              }
          });
      },
  };
      return matrixRain;
    })(),
    /* ── pixel-dissolve */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const pixelDissolve = {
      id: "screen.pixel-dissolve",
      family: "screen",
      title: "Rozpad pikseli",
      blurb: "Ekran zakrywają w losowej kolejności bloki z danymi, po czym rozsypują się, odsłaniając pulpit.",
      durationMs: 2400,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const s = c.lite ? 64 : 40;
          const cols = Math.ceil(c.W / s);
          const rows = Math.ceil(c.H / s);
          const { x: ox, y: oy } = c.anchors.orb;
          const cells = Array.from({ length: cols * rows }, (_, i) => {
              const x = (i % cols) * s;
              const y = Math.floor(i / cols) * s;
              const d = Math.hypot(x - ox, y - oy) / Math.hypot(c.W, c.H);
              return { x, y, inAt: d * 0.25 + c.rand(0.12), outAt: 0.55 + c.rand(0.35), l: c.rand(6, 22), g: Math.random() < 0.25 };
          });
          g.font = `700 ${s * 0.4}px ui-monospace, monospace`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          c.loop((t) => {
              clear(g, c.W, c.H);
              for (const cell of cells) {
                  if (t < cell.inAt || t > cell.outAt)
                      continue;
                  const pin = seg(t, cell.inAt, cell.inAt + 0.08);
                  const pout = seg(t, cell.outAt - 0.06, cell.outAt);
                  const k = pin * (1 - pout);
                  const size = s * (0.4 + 0.6 * k);
                  g.fillStyle = `hsl(${c.pal.hue} 70% ${cell.l + (Math.random() < 0.03 ? 30 : 0)}%)`;
                  g.fillRect(cell.x + (s - size) / 2, cell.y + (s - size) / 2, size - 1, size - 1);
                  if (cell.g && k > 0.8) {
                      g.fillStyle = c.pal.c;
                      g.fillText(Math.random() < 0.5 ? "0" : "1", cell.x + s / 2, cell.y + s / 2);
                  }
              }
          });
      },
  };
      return pixelDissolve;
    })(),
    /* ── ripples */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const ripples = {
      id: "screen.ripples",
      family: "screen",
      title: "Interferencja fal",
      blurb: "Trzy źródła fal — kula, kursor i odbicie — nakładają się we wzór interferencji na całej scenie.",
      durationMs: 3600,
      weight: "accent",
      gl: true,
      run(c) {
          const { x: ox, y: oy } = c.anchors.orb;
          const s2 = [c.anchors.pointer.x, c.anchors.pointer.y];
          const s3 = [c.W - ox * 0.6, c.H * 0.75];
          const gl = c.gl(`uniform vec2 uS2; uniform vec2 uS3;
        float src(vec2 p, vec2 s, float delay) {
          float d = length(p - s);
          float t = max(uTime - delay, 0.0);
          float front = t * 520.0;
          float mask = smoothstep(front, front - 120.0, d) * exp(-d * 0.0022);
          return sin(d * 0.06 - t * 9.0) * mask;
        }
        void main(){
          vec2 p = px();
          float env = smoothstep(0.0,0.1,uT) * (1.0 - smoothstep(0.7,1.0,uT));
          float w = src(p, uOrb.xy, 0.0) + src(p, uS2, 0.35) + src(p, uS3, 0.7);
          float hi = pow(max(w, 0.0), 3.0);
          float lo = pow(max(-w, 0.0), 4.0);
          vec3 col = uA * hi * 0.9 + uC * pow(max(w - 1.2, 0.0), 2.0) * 1.5 + uB * lo * 0.25;
          float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
          outColor = vec4(col, a) * env * uI;
        }`);
          if (gl) {
              c.loop(() => gl.draw({ uS2: s2, uS3: s3 }));
              return;
          }
          const g = c.canvas();
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              for (const [sx, sy, d] of [[ox, oy, 0], [s2[0], s2[1], 350], [s3[0], s3[1], 700]]) {
                  const tt = Math.max(0, ms - d) / 1000;
                  for (let k = 0; k < 6; k++) {
                      const r = tt * 520 - k * 105;
                      if (r <= 0)
                          continue;
                      g.strokeStyle = rgba(c.pal.a, 0.5 * envelope(t) * Math.exp(-r * 0.002));
                      g.lineWidth = 3;
                      g.beginPath();
                      g.arc(sx, sy, r, 0, Math.PI * 2);
                      g.stroke();
                  }
              }
          });
      },
  };
      return ripples;
    })(),
    /* ── shockwave */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const shockwave = {
      id: "screen.shockwave",
      family: "screen",
      title: "Uderzenie w taflę",
      blurb: "Słup światła uderza w jezioro: eliptyczna fala biegnie po tafli w perspektywie, woda pryska.",
      durationMs: 2400,
      weight: "accent",
      run(c) {
          const g = c.canvas();
          const { x: ox } = c.anchors.orb;
          const wy = c.anchors.waterY;
          const spr = glowSprite(c.pal.c, 48);
          const drops = [];
          let splashed = false;
          const pillar = c.el("div", `position:absolute;left:${ox - 30}px;top:0;width:60px;height:${wy}px;background:linear-gradient(to bottom, transparent, ${rgba(c.pal.c, 0.9)});filter:blur(6px);mix-blend-mode:screen;transform-origin:bottom;`);
          c.track(pillar.animate([{ transform: "scaleY(0) scaleX(0.3)", opacity: 1 }, { transform: "scaleY(1) scaleX(1)", opacity: 1, offset: 0.12 }, { transform: "scaleY(1) scaleX(0.1)", opacity: 0, offset: 0.4 }, { opacity: 0 }], { duration: c.durationMs, fill: "both", easing: "ease-out" }));
          c.loop((t, _ms, dt) => {
              clear(g, c.W, c.H);
              if (t > 0.12 && !splashed) {
                  splashed = true;
                  c.shake(9, 400);
                  c.scene([{ transform: "translateY(0)" }, { transform: "translateY(6px)" }, { transform: "translateY(0)" }], { duration: 400, composite: "add" });
                  for (let i = 0; i < c.n(160); i++) {
                      const a = -Math.PI / 2 + c.rand(-1.1, 1.1);
                      const sp = c.rand(3, 13);
                      drops.push({ x: ox, y: wy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 1 });
                  }
              }
              for (let k = 0; k < 4; k++) {
                  const p = seg(t, 0.12 + k * 0.08, 0.85 + k * 0.04);
                  if (p <= 0 || p >= 1)
                      continue;
                  const rx = ease.outCubic(p) * c.W * 0.9;
                  const ry = rx * 0.14;
                  const a = (1 - p) * (k === 0 ? 1 : 0.5);
                  for (const [off, col] of [[-3, "#ff4477"], [0, c.pal.c], [3, "#44aaff"]]) {
                      g.globalAlpha = a * (off === 0 ? 1 : 0.5);
                      g.strokeStyle = col;
                      g.lineWidth = (k === 0 ? 5 : 2) * (1 - p) + 1;
                      g.beginPath();
                      g.ellipse(ox, wy, Math.max(1, rx + off), Math.max(1, ry + off * 0.3), 0, 0, Math.PI * 2);
                      g.stroke();
                  }
                  g.globalAlpha = 1;
              }
              for (const d of drops) {
                  d.vy += 0.35 * dt;
                  d.x += d.vx * dt;
                  d.y += d.vy * dt;
                  if (d.y > wy)
                      d.l = 0;
                  blit(g, spr, d.x, d.y, 5, d.l);
              }
              if (t > 0.1 && t < 0.3)
                  glowStroke(g, [{ x: ox - 200, y: wy }, { x: ox + 200, y: wy }], c.pal.a, c.pal.core, 2, 1 - seg(t, 0.1, 0.3));
          });
      },
  };
      return shockwave;
    })(),
    /* ── thermal */
    (() => {
  const thermal = {
      id: "screen.thermal",
      family: "screen",
      title: "Termowizja",
      blurb: "Linia skanu przełącza cały pulpit w paletę kamery termowizyjnej z odczytami temperatury.",
      durationMs: 3200,
      weight: "accent",
      run(c) {
          const fid = `fx-thermal-${Math.random().toString(36).slice(2, 7)}`;
          const holder = c.svg("width:0;height:0;position:absolute;");
          holder.innerHTML = `<filter id="${fid}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="0 0.1 0.55 0.95 1 1"/><feFuncG type="table" tableValues="0 0 0.05 0.35 0.8 1"/><feFuncB type="table" tableValues="0.05 0.45 0.6 0.15 0 0.7"/></feComponentTransfer></filter>`;
          const scene = c.sceneEls();
          const prev = scene.map((e) => e.style.filter);
          c.after(c.durationMs * 0.12, () => scene.forEach((e) => (e.style.filter = `url(#${fid})`)));
          c.after(c.durationMs * 0.88, () => scene.forEach((e, i) => (e.style.filter = prev[i])));
          c.onCleanup(() => scene.forEach((e, i) => (e.style.filter = prev[i])));
          const bar = c.el("div", `position:absolute;top:0;bottom:0;width:4px;background:#fff;box-shadow:0 0 30px 8px #f97316;left:0;`);
          c.track(bar.animate([{ transform: "translateX(-10px)", opacity: 1 }, { transform: `translateX(${c.W + 10}px)`, opacity: 1, offset: 0.12 }, { opacity: 0, offset: 0.13 }, { opacity: 0, offset: 0.87 }, { transform: `translateX(${c.W + 10}px)`, opacity: 1, offset: 0.875 }, { transform: "translateX(-10px)", opacity: 1 }], { duration: c.durationMs, fill: "both" }));
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const reticle = c.el("div", `position:absolute;left:${ox - or * 1.5}px;top:${oy - or * 1.5}px;width:${or * 3}px;height:${or * 3}px;border:1px solid #fff8;border-radius:4px;`);
          c.el("div", "position:absolute;left:50%;top:-1px;bottom:-1px;width:1px;background:#fff6;", undefined, reticle);
          c.el("div", "position:absolute;top:50%;left:-1px;right:-1px;height:1px;background:#fff6;", undefined, reticle);
          const temp = c.el("div", `position:absolute;left:${ox + or * 1.6}px;top:${oy - or * 1.5}px;font:700 22px ui-monospace,monospace;color:#fff;text-shadow:0 0 8px #000;`, "36.6°C");
          const hud = c.el("div", "position:absolute;left:24px;bottom:96px;font:600 11px ui-monospace,monospace;letter-spacing:.2em;color:#fde68a;line-height:1.6;", "FLIR · MODE IR\nMAX 97.4°C\nMIN 12.1°C");
          hud.style.whiteSpace = "pre";
          for (const n of [reticle, temp, hud])
              c.track(n.animate([{ opacity: 0 }, { opacity: 0, offset: 0.14 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.84 }, { opacity: 0, offset: 0.86 }], { duration: c.durationMs, fill: "both" }));
          c.loop((_t, ms) => {
              temp.textContent = `${(36 + Math.sin(ms * 0.004) * 4 + Math.random()).toFixed(1)}°C`;
          });
      },
  };
      return thermal;
    })(),
    /* ── warp-jump */
    (() => {
  // Extracted from src/effects/signature/fx-screen.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const warpJump = {
      id: "screen.warp-jump",
      family: "screen",
      title: "Skok nadświetlny",
      blurb: "Gwiazdy rozciągają się w smugi, scena przyspiesza w głąb, biały błysk i wyhamowanie.",
      durationMs: 3000,
      weight: "hero",
      run(c) {
          const veil = c.el("div", "position:absolute;inset:0;background:radial-gradient(circle at 50% 45%, #020617cc, #000 80%);opacity:0;");
          c.track(veil.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.25 }, { opacity: 0.9, offset: 0.5 }, { opacity: 0.4, offset: 0.7 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const g = c.canvas();
          const cx = c.W / 2;
          const cy = c.H * 0.45;
          const stars = Array.from({ length: c.n(700) }, () => ({ x: c.rand(-1, 1) * c.W, y: c.rand(-1, 1) * c.H, z: c.rand(0.05, 1), pz: 1, hue: c.rand(-20, 40) }));
          const flash = c.el("div", `position:absolute;inset:0;background:${c.pal.core};opacity:0;`);
          c.track(flash.animate([{ opacity: 0 }, { opacity: 0, offset: 0.47 }, { opacity: 1, offset: 0.52 }, { opacity: 0, offset: 0.7 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          c.scene([{ transform: "scale(1)", filter: "blur(0)" }, { transform: "scale(1.12)", filter: "blur(3px)", offset: 0.5 }, { transform: "scale(0.97)", filter: "blur(0)", offset: 0.62 }, { transform: "scale(1)", filter: "blur(0)" }], { duration: c.durationMs, easing: "ease-in" }, { x: cx, y: cy });
          c.after(c.durationMs * 0.52, () => c.shake(10, 500));
          c.loop((t, _ms, dt) => {
              clear(g, c.W, c.H);
              const v = t < 0.5 ? 0.002 + ease.inExpo(seg(t, 0, 0.5)) * 0.06 : 0.062 * (1 - ease.outCubic(seg(t, 0.5, 0.95))) + 0.001;
              const env = envelope(t, 0.1, 0.12);
              for (const s of stars) {
                  s.pz = s.z;
                  s.z -= v * dt;
                  if (s.z <= 0.01) {
                      s.z = 1;
                      s.pz = 1;
                      s.x = c.rand(-1, 1) * c.W;
                      s.y = c.rand(-1, 1) * c.H;
                  }
                  const x = cx + s.x / (s.z * 4);
                  const y = cy + s.y / (s.z * 4);
                  const px = cx + s.x / (s.pz * 4);
                  const py = cy + s.y / (s.pz * 4);
                  const w = (1 - s.z) * 3 + 0.4;
                  g.strokeStyle = `hsla(${c.pal.hue + s.hue}, 90%, ${70 + (1 - s.z) * 25}%, ${env * (1 - s.z * 0.6)})`;
                  g.lineWidth = w;
                  g.beginPath();
                  g.moveTo(px, py);
                  g.lineTo(x, y);
                  g.stroke();
              }
          });
      },
  };
      return warpJump;
    })(),
  );
})();
