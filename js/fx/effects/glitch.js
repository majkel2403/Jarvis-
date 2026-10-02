'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — glitch (4)
   GENEROWANE z katalog/01-signature-fx/glitch/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: glitch.datamosh, glitch.displace, glitch.failure, glitch.vhs */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.glitch = J.fxEffects.glitch || [];
const { clear } = J.fxDraw;
const { rgba } = J.fxPal;
const { envelope } = J.fxRt;
J.fxEffects.glitch.push(
    /* ── datamosh */
    (() => {
  // Extracted from src/effects/signature/fx-glitch.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const datamosh = {
      id: "glitch.datamosh",
      family: "glitch",
      title: "Datamosh",
      blurb: "Pulpit rwie się na przesunięte pasy z błędną barwą i rozmazanymi blokami kompresji, skokowo.",
      durationMs: 2200,
      weight: "accent",
      run(c) {
          const g = c.canvas({ blend: "source-over", css: "mix-blend-mode:hard-light;" });
          const frames = Array.from({ length: 14 }, (_, i) => ({
              transform: i % 3 === 0 ? `translateX(${c.rand(-24, 24)}px) skewX(${c.rand(-4, 4)}deg)` : "none",
              filter: i % 2 ? `hue-rotate(${Math.round(c.rand(-180, 180))}deg) saturate(${c.rand(1.5, 3).toFixed(1)}) contrast(1.3)` : "none",
          }));
          c.scene(frames, { duration: c.durationMs * 0.85, easing: "steps(14)" });
          let next = 0;
          c.loop((t, ms) => {
              if (ms < next)
                  return;
              next = ms + 75;
              clear(g, c.W, c.H);
              const env = envelope(t, 0.05, 0.2);
              if (env < 0.05)
                  return;
              for (let i = 0; i < Math.round(14 * env * c.intensity); i++) {
                  const y = c.rand(c.H);
                  const h = c.rand(4, 60);
                  const x = c.rand(-100, c.W);
                  const w = c.rand(80, c.W * 0.6);
                  g.fillStyle = Math.random() < 0.5 ? rgba(c.pick([c.pal.a, c.pal.b, "#ff00aa", "#00ffcc"]), c.rand(0.25, 0.7)) : `rgba(0,0,0,${c.rand(0.3, 0.8)})`;
                  g.fillRect(x, y, w, h);
              }
              for (let i = 0; i < Math.round(30 * env); i++) {
                  const s = c.pick([8, 16, 32]);
                  g.fillStyle = `hsla(${c.rand(360)} 80% 50% / ${c.rand(0.2, 0.6)})`;
                  g.fillRect(Math.floor(c.rand(c.W) / s) * s, Math.floor(c.rand(c.H) / s) * s, s, s);
              }
              for (let i = 0; i < 3; i++) {
                  const x = c.rand(c.W);
                  const lg = g.createLinearGradient(0, 0, 0, c.H);
                  lg.addColorStop(0, "transparent");
                  lg.addColorStop(0.5, rgba(c.pal.c, 0.35));
                  lg.addColorStop(1, "transparent");
                  g.fillStyle = lg;
                  g.fillRect(x, 0, c.rand(2, 10), c.H);
              }
          });
      },
  };
      return datamosh;
    })(),
    /* ── displace */
    (() => {
  // Extracted from src/effects/signature/fx-glitch.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  function svgFilter(c, inner) {
      const id = `fx-f-${Math.random().toString(36).slice(2, 8)}`;
      const holder = c.svg("width:0;height:0;position:absolute;");
      holder.innerHTML = `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">${inner}</filter>`;
      const els = c.sceneEls();
      const prev = els.map((e) => e.style.filter);
      return {
          id,
          filter: holder.querySelector("filter"),
          apply: (on) => els.forEach((e, i) => (e.style.filter = on ? `url(#${id})` : prev[i])),
          restore: () => els.forEach((e, i) => (e.style.filter = prev[i])),
      };
  }
  const displace = {
      id: "glitch.displace",
      family: "glitch",
      title: "Płynna deformacja",
      blurb: "Filtr feTurbulence + feDisplacementMap wykrzywia cały pulpit jak obraz pod wodą, po czym go prostuje.",
      durationMs: 2400,
      weight: "accent",
      run(c) {
          const f = svgFilter(c, `<feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/>`);
          const turb = f.filter.querySelector("feTurbulence");
          const disp = f.filter.querySelector("feDisplacementMap");
          f.apply(true);
          c.onCleanup(f.restore);
          c.loop((t, ms) => {
              const env = envelope(t, 0.3, 0.4);
              disp.setAttribute("scale", String(env * 70 * c.intensity));
              turb.setAttribute("baseFrequency", `${0.006 + Math.sin(ms * 0.002) * 0.002} ${0.018 + Math.cos(ms * 0.0015) * 0.006}`);
          });
      },
  };
      return displace;
    })(),
    /* ── failure */
    (() => {
  // Extracted from src/effects/signature/fx-glitch.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const failure = {
      id: "glitch.failure",
      family: "glitch",
      title: "Awaria krytyczna",
      blurb: "Pulpit gaśnie na czerwono, ekran rwie się poziomo, trójkąty ostrzegawcze mrugają, napis drga w RGB.",
      durationMs: 3600,
      weight: "hero",
      run(c) {
          c.scene([{ filter: "none" }, { filter: "grayscale(1) sepia(1) hue-rotate(-50deg) saturate(4) brightness(.6)", offset: 0.08 }, { filter: "grayscale(1) sepia(1) hue-rotate(-50deg) saturate(4) brightness(.45)", offset: 0.5 }, { filter: "grayscale(1) sepia(1) hue-rotate(-50deg) saturate(4) brightness(.6)", offset: 0.85 }, { filter: "none" }], { duration: c.durationMs });
          const vign = c.el("div", "position:absolute;inset:0;background:radial-gradient(ellipse at center, transparent 35%, rgba(220,0,30,.65));");
          c.track(vign.animate([{ opacity: 0.4 }, { opacity: 1 }, { opacity: 0.4 }], { duration: 700, iterations: Infinity }));
          const s = c.svg();
          for (let i = 0; i < 6; i++) {
              const x = c.rand(80, c.W - 80);
              const y = c.rand(80, c.H - 140);
              const sz = c.rand(26, 52);
              const tri = c.svgEl("g", { transform: `translate(${x} ${y})` }, s);
              c.svgEl("path", { d: `M0 ${-sz} L${sz * 0.9} ${sz * 0.6} L${-sz * 0.9} ${sz * 0.6} Z`, fill: "rgba(239,68,68,.15)", stroke: "#ef4444", "stroke-width": 3 }, tri);
              const ex = c.svgEl("text", { x: 0, y: sz * 0.35, "text-anchor": "middle", fill: "#fecaca", "font-size": sz * 0.9, "font-weight": 900, "font-family": "system-ui" }, tri);
              ex.textContent = "!";
              c.track(tri.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.2 }], { duration: 420, delay: 200 + i * 130, iterations: Infinity, direction: "alternate" }));
          }
          const word = c.text ?? "BŁĄD KRYTYCZNY";
          const size = Math.min(84, c.W / (word.length * 0.7));
          const mk = (col, blend) => c.el("div", `position:absolute;left:0;right:0;top:${c.H * 0.42 - size / 2}px;text-align:center;font:900 ${size}px ui-sans-serif,system-ui;letter-spacing:.06em;color:${col};mix-blend-mode:${blend};white-space:pre;`, word);
          const layers = [mk("#ff0040", "screen"), mk("#00e5ff", "screen"), mk("#ffffff", "normal")];
          const g = c.canvas({ blend: "source-over" });
          let next = 0;
          c.loop((t, ms) => {
              const env = envelope(t, 0.06, 0.15);
              layers.forEach((l, i) => {
                  const j = i === 2 ? 0 : (Math.random() < 0.3 ? c.rand(-14, 14) : c.rand(-3, 3)) * (i ? -1 : 1);
                  l.style.transform = `translate(${j}px, ${i === 2 && Math.random() < 0.08 ? c.rand(-6, 6) : 0}px)`;
                  l.style.opacity = String(env * (i === 2 ? 1 : 0.85));
                  l.style.clipPath = Math.random() < 0.15 ? `inset(${c.rand(0, 60)}% 0 ${c.rand(0, 40)}% 0)` : "none";
              });
              if (ms < next)
                  return;
              next = ms + 90;
              clear(g, c.W, c.H);
              for (let i = 0; i < Math.round(6 * env); i++) {
                  const y = c.rand(c.H);
                  g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${c.rand(0.6, 0.95)})` : "rgba(255,40,60,.35)";
                  g.fillRect(0, y, c.W, c.rand(2, 22));
              }
          });
          c.after(c.durationMs * 0.08, () => c.shake(12, 400));
      },
  };
      return failure;
    })(),
    /* ── vhs */
    (() => {
  // Extracted from src/effects/signature/fx-glitch.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const vhs = {
      id: "glitch.vhs",
      family: "glitch",
      title: "Kaseta VHS",
      blurb: "Toczący się pas śledzenia, rozjazd chromy, linie szumu i OSD „▶ PLAY” jak z magnetowidu.",
      durationMs: 3400,
      weight: "accent",
      run(c) {
          c.scene([{ filter: "none", transform: "none" }, { filter: "drop-shadow(4px 0 0 rgba(255,0,60,.7)) drop-shadow(-4px 0 0 rgba(0,220,255,.7)) saturate(1.3) contrast(1.1)", transform: "skewX(0.6deg)", offset: 0.1 }, { filter: "drop-shadow(2px 0 0 rgba(255,0,60,.6)) drop-shadow(-2px 0 0 rgba(0,220,255,.6)) saturate(1.2)", transform: "skewX(-0.4deg)", offset: 0.5 }, { filter: "drop-shadow(5px 0 0 rgba(255,0,60,.7)) drop-shadow(-5px 0 0 rgba(0,220,255,.7))", transform: "none", offset: 0.85 }, { filter: "none", transform: "none" }], { duration: c.durationMs });
          c.el("div", "position:absolute;inset:0;background:repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 2px, transparent 2px 4px);mix-blend-mode:multiply;");
          const g = c.canvas({ blend: "source-over" });
          const osd = c.el("div", `position:absolute;left:40px;top:40px;font:700 26px ${MONO};color:#fff;text-shadow:2px 2px 0 #000, 0 0 8px #fff;letter-spacing:.08em;`, "▶ PLAY");
          const tc = c.el("div", `position:absolute;right:48px;bottom:110px;font:700 22px ${MONO};color:#fff;text-shadow:2px 2px 0 #000;`, "SP 0:00:00");
          c.track(osd.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 900, iterations: Infinity }));
          c.loop((t, ms) => {
              clear(g, c.W, c.H);
              const env = envelope(t, 0.05, 0.15);
              const bandY = c.H - ((ms * 0.35) % (c.H + 200));
              const lg = g.createLinearGradient(0, bandY - 60, 0, bandY + 60);
              lg.addColorStop(0, "transparent");
              lg.addColorStop(0.5, `rgba(0,0,0,${0.55 * env})`);
              lg.addColorStop(1, "transparent");
              g.fillStyle = lg;
              g.fillRect(0, bandY - 60, c.W, 120);
              for (let i = 0; i < 120; i++) {
                  g.fillStyle = `rgba(255,255,255,${c.rand(0.2, 0.7) * env})`;
                  g.fillRect(c.rand(c.W), bandY + c.rand(-30, 30), c.rand(4, 60), 1);
              }
              for (let i = 0; i < 4; i++) {
                  g.fillStyle = `rgba(255,255,255,${0.12 * env})`;
                  g.fillRect(0, c.rand(c.H), c.W, 1);
              }
              const secs = Math.floor(ms / 1000) + 12;
              tc.textContent = `SP 0:00:${String(secs).padStart(2, "0")}`;
              osd.style.visibility = env > 0.1 ? "visible" : "hidden";
          });
      },
  };
      return vhs;
    })(),
  );
})();
