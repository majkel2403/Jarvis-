'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — success (3)
   GENEROWANE z katalog/01-signature-fx/success/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: success.gold-rain, success.level-up, success.trophy */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.success = J.fxEffects.success || [];
const { blit, clear, glowSprite } = J.fxDraw;
const { ease, envelope, seg } = J.fxRt;
const { rgba } = J.fxPal;
J.fxEffects.success.push(
    /* ── gold-rain */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const goldRain = {
      id: "success.gold-rain",
      family: "success",
      title: "Złoty deszcz",
      blurb: "Złote monety wirują w locie, odbijają się od tafli jeziora i błyskają gwiazdkami.",
      durationMs: 3800,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over" });
          const floor = c.anchors.waterY + 30;
          const glint = glowSprite("#fff7c2", 48, 0.1);
          const coins = Array.from({ length: c.n(120) }, () => ({ x: c.rand(c.W * 0.05, c.W * 0.95), y: c.rand(-c.H, -20), vx: c.rand(-1, 1), vy: c.rand(2, 6), ph: c.rand(6), vp: c.rand(0.15, 0.35), r: c.rand(12, 22), bounced: false, glintAt: -1 }));
          c.loop((t, ms, dt) => {
              clear(g, c.W, c.H);
              const fade = 1 - seg(t, 0.85, 1);
              for (const k of coins) {
                  k.vy += 0.35 * dt;
                  k.x += k.vx * dt;
                  k.y += k.vy * dt;
                  k.ph += k.vp * dt;
                  if (!k.bounced && k.y > floor) {
                      k.bounced = true;
                      k.y = floor;
                      k.vy *= -0.45;
                      k.glintAt = ms;
                  }
                  const w = Math.abs(Math.cos(k.ph)) * k.r;
                  g.globalAlpha = fade;
                  const lg = g.createLinearGradient(k.x - w, k.y - k.r, k.x + w, k.y + k.r);
                  lg.addColorStop(0, "#fde68a");
                  lg.addColorStop(0.5, Math.cos(k.ph) > 0 ? "#f59e0b" : "#b45309");
                  lg.addColorStop(1, "#fffbeb");
                  g.fillStyle = lg;
                  g.beginPath();
                  g.ellipse(k.x, k.y, Math.max(1.5, w), k.r, 0, 0, Math.PI * 2);
                  g.fill();
                  g.strokeStyle = "#92400e";
                  g.lineWidth = 1;
                  g.stroke();
                  if (k.glintAt > 0 && ms - k.glintAt < 400) {
                      g.globalCompositeOperation = "lighter";
                      blit(g, glint, k.x, k.y, 26 * (1 - (ms - k.glintAt) / 400), 1);
                      g.globalCompositeOperation = "source-over";
                  }
                  if (Math.random() < 0.01) {
                      g.globalCompositeOperation = "lighter";
                      blit(g, glint, k.x - w * 0.3, k.y - k.r * 0.4, 14, 0.9);
                      g.globalCompositeOperation = "source-over";
                  }
              }
              g.globalAlpha = 1;
          });
      },
  };
      return goldRain;
    })(),
    /* ── level-up */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const SANS = "ui-sans-serif, system-ui, sans-serif";
  const levelUp = {
      id: "success.level-up",
      family: "success",
      title: "Awans",
      blurb: "Kolumna światła wystrzeliwuje z dołu, w górę wędrują eliptyczne pierścienie i iskry, wskakuje +1.",
      durationMs: 3000,
      weight: "accent",
      run(c) {
          const { x: ox } = c.anchors.orb;
          const pw = Math.min(260, c.W * 0.18);
          const pillar = c.el("div", `position:absolute;left:${ox - pw / 2}px;top:0;bottom:0;width:${pw}px;background:linear-gradient(to top, ${rgba(c.pal.c, 0.85)}, ${rgba(c.pal.a, 0.35)} 50%, transparent);filter:blur(12px);mix-blend-mode:screen;transform-origin:bottom;`);
          c.track(pillar.animate([{ transform: "scaleY(0) scaleX(.2)" }, { transform: "scaleY(1) scaleX(1)", offset: 0.15 }, { transform: "scaleY(1) scaleX(.8)", offset: 0.7 }, { transform: "scaleY(1) scaleX(0)", opacity: 0 }], { duration: c.durationMs, fill: "both", easing: "cubic-bezier(.2,.9,.2,1)" }));
          const core = c.el("div", `position:absolute;left:${ox - 3}px;top:0;bottom:0;width:6px;background:${c.pal.core};box-shadow:0 0 20px 6px ${c.pal.a};transform-origin:bottom;`);
          c.track(core.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)", offset: 0.1 }, { transform: "scaleY(1)", opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const g = c.canvas();
          const spark = glowSprite(c.pal.c, 32);
          const ps = [];
          const label = c.el("div", `position:absolute;left:0;right:0;top:${c.H * 0.2}px;text-align:center;font:900 64px ${SANS};color:${c.pal.core};text-shadow:0 0 30px ${c.pal.a};`, c.text ?? "+1 POZIOM");
          c.track(label.animate([{ opacity: 0, transform: "translateY(60px) scale(.5)" }, { opacity: 0, offset: 0.2 }, { opacity: 1, transform: "translateY(0) scale(1.1)", offset: 0.32 }, { opacity: 1, transform: "scale(1)", offset: 0.8 }, { opacity: 0, transform: "translateY(-40px)" }], { duration: c.durationMs, fill: "both", easing: "cubic-bezier(.2,1.5,.4,1)" }));
          c.loop((t, _ms, dt) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.1, 0.25);
              for (let k = 0; k < 6; k++) {
                  const u = (seg(t, 0.1, 0.9) * 1.6 + k / 6) % 1;
                  const y = c.H - u * c.H * 0.95;
                  const rx = pw * (0.9 - u * 0.5);
                  g.strokeStyle = rgba(c.pal.c, (1 - u) * env);
                  g.lineWidth = 3;
                  g.beginPath();
                  g.ellipse(ox, y, rx, rx * 0.22, 0, 0, Math.PI * 2);
                  g.stroke();
              }
              if (t < 0.75)
                  for (let i = 0; i < 3 * dt; i++)
                      ps.push({ x: ox + c.rand(-pw / 2, pw / 2), y: c.H, v: c.rand(5, 14), l: 1 });
              for (const p of ps) {
                  p.y -= p.v * dt;
                  p.l -= 0.01 * dt;
                  blit(g, spark, p.x, p.y, 5, p.l * env);
              }
          });
      },
  };
      return levelUp;
    })(),
    /* ── trophy */
    (() => {
  // Extracted from src/effects/signature/fx-misc.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const SANS = "ui-sans-serif, system-ui, sans-serif";
  function star(g, r) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = i % 2 ? r * 0.45 : r;
          if (i)
              g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          else
              g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
  }
  const trophy = {
      id: "success.trophy",
      family: "success",
      title: "Trofeum",
      blurb: "Okrąg i checkmark rysują się na kuli, po czym wystrzeliwują wirujące gwiazdy i napis UKOŃCZONO.",
      durationMs: 3200,
      weight: "hero",
      run(c) {
          const { x: ox, y: oy, r: or } = c.anchors.orb;
          const s = c.svg(`filter:drop-shadow(0 0 10px ${c.pal.a});`);
          const R = or * 1.3;
          const circle = c.svgEl("circle", { cx: ox, cy: oy, r: R, fill: rgba(c.pal.a, 0.12), stroke: c.pal.c, "stroke-width": 6, transform: `rotate(-90 ${ox} ${oy})` }, s);
          const circ = 2 * Math.PI * R;
          circle.style.strokeDasharray = `${circ}`;
          c.track(circle.animate([{ strokeDashoffset: circ }, { strokeDashoffset: 0 }], { duration: 600, fill: "both", easing: "cubic-bezier(.6,0,.2,1)" }));
          const check = c.svgEl("path", { d: `M${ox - R * 0.45} ${oy + R * 0.02} L${ox - R * 0.1} ${oy + R * 0.36} L${ox + R * 0.5} ${oy - R * 0.32}`, fill: "none", stroke: c.pal.core, "stroke-width": 12, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
          const cl = check.getTotalLength();
          check.style.strokeDasharray = `${cl}`;
          c.track(check.animate([{ strokeDashoffset: cl }, { strokeDashoffset: cl, offset: 0.4 }, { strokeDashoffset: 0 }], { duration: 1000, fill: "both", easing: "ease-out" }));
          c.track(s.animate([{ transform: "scale(1)" }, { transform: "scale(1)", offset: 0.3 }, { transform: "scale(1.12)", offset: 0.36 }, { transform: "scale(1)", offset: 0.45 }, { transform: "scale(1)", opacity: 1, offset: 0.85 }, { transform: "scale(1.3)", opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          s.style.transformOrigin = `${ox}px ${oy}px`;
          const label = c.el("div", `position:absolute;left:0;right:0;top:${oy + R + 24}px;text-align:center;font:900 30px ${SANS};letter-spacing:.4em;color:${c.pal.core};text-shadow:0 0 20px ${c.pal.a};`, c.text ?? "UKOŃCZONO");
          c.track(label.animate([{ opacity: 0, transform: "translateY(20px)" }, { opacity: 0, offset: 0.32 }, { opacity: 1, transform: "none", offset: 0.42 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: c.durationMs, fill: "both", easing: "cubic-bezier(.2,1.5,.4,1)" }));
          const g = c.canvas();
          const stars = [];
          let burst = false;
          c.loop((t, _ms, dt) => {
              clear(g, c.W, c.H);
              if (t > 0.33 && !burst) {
                  burst = true;
                  c.scene([{ filter: "brightness(1)" }, { filter: "brightness(1.5)" }, { filter: "brightness(1)" }], { duration: 400 });
                  for (let i = 0; i < c.n(60); i++) {
                      const a = c.rand(Math.PI * 2);
                      const sp = c.rand(4, 13);
                      stars.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: c.rand(5, 13), rot: c.rand(6), vr: c.rand(-0.2, 0.2), col: c.pick([c.pal.c, c.pal.core, "#fde047"]) });
                  }
              }
              const life = 1 - seg(t, 0.33, 1);
              const ring = ease.outExpo(seg(t, 0.33, 0.7));
              if (burst && ring < 1) {
                  g.strokeStyle = rgba(c.pal.c, 1 - ring);
                  g.lineWidth = 4;
                  g.beginPath();
                  g.arc(ox, oy, R + ring * or * 6, 0, Math.PI * 2);
                  g.stroke();
              }
              for (const st of stars) {
                  st.vx *= Math.pow(0.96, dt);
                  st.vy = st.vy * Math.pow(0.96, dt) + 0.12 * dt;
                  st.x += st.vx * dt;
                  st.y += st.vy * dt;
                  st.rot += st.vr * dt;
                  g.save();
                  g.translate(st.x, st.y);
                  g.rotate(st.rot);
                  g.globalAlpha = life;
                  g.fillStyle = st.col;
                  star(g, st.r);
                  g.fill();
                  g.restore();
              }
          });
      },
  };
      return trophy;
    })(),
  );
})();
