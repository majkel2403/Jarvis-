'use strict';
/* =========================================================
   JARVIS OS — Efekty sygnaturowe — text (5)
   GENEROWANE z katalog/01-signature-fx/text/<efekt>/effect.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: text.decode, text.kinetic-slam, text.neon, text.split, text.terminal */
(() => {
J.fxEffects = J.fxEffects || {};
J.fxEffects.text = J.fxEffects.text || [];
const { rgba } = J.fxPal;
const { clamp, envelope, seg } = J.fxRt;
J.fxEffects.text.push(
    /* ── decode */
    (() => {
  // Extracted from src/effects/signature/fx-text.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$<>/\\=+*";
  const decode = {
      id: "text.decode",
      family: "text",
      title: "Dekodowanie",
      blurb: "Duży napis wyłania się z szumu znaków litera po literze; każda zatrzaskuje się z błyskiem.",
      durationMs: 2600,
      weight: "accent",
      run(c) {
          const text = (c.text ?? "JARVIS ONLINE").toUpperCase();
          const { y: oy, r: or } = c.anchors.orb;
          const size = Math.min(72, (c.W * 0.8) / Math.max(6, text.length) / 0.7);
          const wrap = c.el("div", `position:absolute;left:0;right:0;top:${oy - or * 2.4 - size}px;text-align:center;font:800 ${size}px ${MONO};letter-spacing:.12em;white-space:pre;`);
          const spans = [...text].map((ch) => c.el("span", `display:inline-block;color:${c.pal.a};text-shadow:0 0 12px ${c.pal.a};transition:none;`, ch === " " ? " " : "", wrap));
          const line = c.el("div", `position:absolute;left:50%;top:${oy - or * 2.4 + 14}px;height:2px;width:${text.length * size * 0.75}px;margin-left:${(-text.length * size * 0.75) / 2}px;background:linear-gradient(90deg, transparent, ${c.pal.core}, transparent);box-shadow:0 0 14px ${c.pal.a};transform-origin:left;`);
          c.track(line.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)", offset: 0.6 }, { transform: "scaleX(1)", opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
          const locked = spans.map(() => false);
          c.loop((t, ms) => {
              const env = envelope(t, 0.05, 0.15);
              wrap.style.opacity = String(env);
              spans.forEach((s, i) => {
                  if (text[i] === " ")
                      return;
                  const lockAt = 0.12 + (i / text.length) * 0.5;
                  if (t < 0.04 + i * 0.01) {
                      s.textContent = "";
                      return;
                  }
                  if (t < lockAt) {
                      if (Math.floor(ms / 45 + i) % 2 === 0)
                          s.textContent = SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
                      s.style.color = rgba(c.pal.a, 0.7);
                      return;
                  }
                  if (!locked[i]) {
                      locked[i] = true;
                      s.textContent = text[i];
                      s.style.color = c.pal.core;
                      c.track(s.animate([{ transform: "scale(1.6)", textShadow: `0 0 30px ${c.pal.core}`, filter: "brightness(2)" }, { transform: "scale(1)", textShadow: `0 0 12px ${c.pal.a}`, filter: "brightness(1)" }], { duration: 320, easing: "cubic-bezier(.2,1.6,.4,1)" }));
                  }
              });
          });
      },
  };
      return decode;
    })(),
    /* ── kinetic-slam */
    (() => {
  // Extracted from src/effects/signature/fx-text.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const SANS = "ui-sans-serif, system-ui, sans-serif";
  const kineticSlam = {
      id: "text.kinetic-slam",
      family: "text",
      title: "Uderzenie słów",
      blurb: "Słowa spadają kolejno z ogromnej skali i rozmycia, każde uderzenie trzęsie kamerą.",
      durationMs: 3000,
      weight: "hero",
      run(c) {
          const words = (c.text ?? "SKUPIENIE. PRECYZJA. MOC.").split(/\s+/).filter(Boolean);
          const step = (c.durationMs * 0.8) / words.length;
          const size = Math.min(140, c.W / 7);
          words.forEach((w, i) => {
              const el = c.el("div", `position:absolute;left:0;right:0;top:50%;margin-top:${-size * 0.6}px;text-align:center;font:900 ${size}px ${SANS};letter-spacing:-.02em;color:${i === words.length - 1 ? c.pal.core : "#fff"};text-shadow:0 0 40px ${c.pal.a}, 0 6px 0 ${rgba(c.pal.a, 0.6)};opacity:0;`, w);
              const last = i === words.length - 1;
              c.track(el.animate([
                  { opacity: 0, transform: "scale(3.2)", filter: "blur(14px)" },
                  { opacity: 1, transform: "scale(0.94)", filter: "blur(0)", offset: 0.14 },
                  { opacity: 1, transform: "scale(1)", offset: 0.2 },
                  { opacity: last ? 1 : 0, transform: last ? "scale(1.04)" : "translateY(-120px) scale(0.7)", filter: last ? "blur(0)" : "blur(6px)" },
              ], { duration: last ? step * 1.9 : step * 1.25, delay: i * step, fill: "both", easing: "cubic-bezier(.2,.9,.2,1)" }));
              c.after(i * step + step * 1.25 * 0.14, () => {
                  c.shake(14 * c.intensity, 260);
                  c.scene([{ filter: "brightness(1.6)" }, { filter: "brightness(1)" }], { duration: 220 });
              });
          });
          const veil = c.el("div", "position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(2,6,23,.2), rgba(2,6,23,.8));opacity:0;");
          veil.parentElement.prepend(veil);
          c.track(veil.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: c.durationMs, fill: "both" }));
      },
  };
      return kineticSlam;
    })(),
    /* ── neon */
    (() => {
  // Extracted from src/effects/signature/fx-text.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const SANS = "ui-sans-serif, system-ui, sans-serif";
  const neon = {
      id: "text.neon",
      family: "text",
      title: "Neon",
      blurb: "Neonowy szyld zapala się nierówno litera po literze, brzęczy migotaniem i odbija w tafli jeziora.",
      durationMs: 3600,
      weight: "accent",
      run(c) {
          const text = c.text ?? "Jarvis";
          const size = Math.min(130, c.W / 6);
          const y = c.anchors.waterY - size * 1.15;
          const mk = (mirror) => {
              const el = c.el("div", `position:absolute;left:0;right:0;top:${mirror ? c.anchors.waterY + 4 : y}px;text-align:center;font:italic 300 ${size}px "Brush Script MT", "Segoe Script", cursive, ${SANS};color:${c.pal.core};white-space:pre;${mirror ? "transform:scaleY(-1);transform-origin:top;opacity:.35;filter:blur(3px);-webkit-mask-image:linear-gradient(to top, transparent, #000 80%);mask-image:linear-gradient(to top, transparent, #000 80%);" : ""}`);
              return [...text].map((ch) => c.el("span", `display:inline-block;opacity:.08;text-shadow:none;`, ch, el));
          };
          const lit = mk(false);
          const ref = mk(true);
          const on = lit.map((_, i) => 0.08 + (i / lit.length) * 0.35 + c.rand(0.05));
          const glow = `0 0 4px #fff, 0 0 10px ${c.pal.c}, 0 0 22px ${c.pal.a}, 0 0 44px ${c.pal.a}, 0 0 80px ${c.pal.b}`;
          c.loop((t, ms) => {
              const fade = 1 - seg(t, 0.85, 1);
              lit.forEach((s, i) => {
                  let o;
                  if (t < on[i])
                      o = 0.08;
                  else if (t < on[i] + 0.08)
                      o = Math.random() < 0.5 ? 1 : 0.1;
                  else
                      o = Math.random() < 0.012 ? 0.2 : 1;
                  o *= fade;
                  s.style.opacity = String(Math.max(o, 0.06 * fade));
                  s.style.textShadow = o > 0.5 ? glow : "none";
                  ref[i].style.opacity = s.style.opacity;
                  ref[i].style.textShadow = s.style.textShadow;
              });
              void ms;
          });
      },
  };
      return neon;
    })(),
    /* ── split */
    (() => {
  // Extracted from src/effects/signature/fx-text.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const SANS = "ui-sans-serif, system-ui, sans-serif";
  const split = {
      id: "text.split",
      family: "text",
      title: "Cięcie",
      blurb: "Napis zostaje przecięty laserem; połówki rozjeżdżają się, odsłaniając oślepiającą szczelinę.",
      durationMs: 2600,
      weight: "accent",
      run(c) {
          const text = (c.text ?? "NOWA SESJA").toUpperCase();
          const size = Math.min(120, c.W / (text.length * 0.7));
          const { y: oy } = c.anchors.orb;
          const top = oy - size * 0.6;
          const half = (clip) => c.el("div", `position:absolute;left:0;right:0;top:${top}px;text-align:center;font:900 ${size}px ${SANS};letter-spacing:.06em;color:#fff;text-shadow:0 0 30px ${c.pal.a};clip-path:${clip};white-space:pre;`, text);
          const a = half("inset(0 0 50% 0)");
          const b = half("inset(50% 0 0 0)");
          const slit = c.el("div", `position:absolute;left:0;right:0;top:${top + size * 0.6 - 2}px;height:4px;background:${c.pal.core};box-shadow:0 0 30px 10px ${c.pal.a}, 0 0 80px 30px ${rgba(c.pal.b, 0.6)};transform-origin:left;`);
          const o = { duration: c.durationMs, fill: "both", easing: "cubic-bezier(.7,0,.2,1)" };
          c.track(a.animate([{ opacity: 0, transform: "none" }, { opacity: 1, offset: 0.12 }, { transform: "none", offset: 0.35 }, { transform: "translate(-60px,-14px)", offset: 0.55 }, { transform: "translate(-80px,-18px)", opacity: 1, offset: 0.85 }, { transform: "translate(-400px,-40px)", opacity: 0 }], o));
          c.track(b.animate([{ opacity: 0, transform: "none" }, { opacity: 1, offset: 0.12 }, { transform: "none", offset: 0.35 }, { transform: "translate(60px,14px)", offset: 0.55 }, { transform: "translate(80px,18px)", opacity: 1, offset: 0.85 }, { transform: "translate(400px,40px)", opacity: 0 }], o));
          c.track(slit.animate([{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(0)", offset: 0.2 }, { transform: "scaleX(1) scaleY(1)", offset: 0.34 }, { transform: "scaleX(1) scaleY(6)", opacity: 1, offset: 0.55 }, { transform: "scaleX(1) scaleY(3)", opacity: 0.8, offset: 0.85 }, { transform: "scaleX(1) scaleY(0)", opacity: 0 }], o));
          c.after(c.durationMs * 0.35, () => c.shake(8, 220));
      },
  };
      return split;
    })(),
    /* ── terminal */
    (() => {
  // Extracted from src/effects/signature/fx-text.ts by scripts/fx-catalog.mjs — edit the source, then regenerate.
  const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
  const CMDS = ["mount /dev/neural0", "load model jarvis-4o", "spawn agent planner", "spawn agent researcher", "handshake tls1.3 ok", "index 18,442 docs", "warm cache 2.1GB", "sync calendar", "route voice → core", "verify signature ✓", "compile graph 37 nodes", "allocate ctx 128k", "probe gpu ok", "attach memory store", "stream tokens ▸"];
  const terminal = {
      id: "text.terminal",
      family: "text",
      title: "Terminal",
      blurb: "W rogu otwiera się terminal: szybki log poleceń, migający kursor i pasek postępu ASCII.",
      durationMs: 3400,
      weight: "accent",
      run(c) {
          const term = c.el("div", `position:absolute;left:${Math.max(16, c.W * 0.06)}px;bottom:110px;width:min(440px, 80vw);height:240px;padding:12px 14px;border:1px solid ${rgba(c.pal.a, 0.5)};border-radius:10px;background:rgba(2,6,23,.86);box-shadow:0 20px 60px #000a, 0 0 30px ${rgba(c.pal.a, 0.25)};font:500 11.5px ${MONO};color:${c.pal.c};overflow:hidden;`);
          const bar = c.el("div", `display:flex;gap:6px;margin-bottom:8px;`, undefined, term);
          for (const col of ["#ef4444", "#f59e0b", "#22c55e"])
              c.el("span", `width:9px;height:9px;border-radius:50%;background:${col};`, undefined, bar);
          const body = c.el("div", "white-space:pre;line-height:1.55;", "", term);
          c.track(term.animate([{ opacity: 0, transform: "translateY(20px) scale(.96)" }, { opacity: 1, transform: "none", offset: 0.08 }, { opacity: 1, offset: 0.9 }, { opacity: 0, transform: "translateY(10px)" }], { duration: c.durationMs, fill: "both", easing: "ease-out" }));
          const out = [];
          let next = 0;
          c.loop((t, ms) => {
              if (ms > next && t < 0.78) {
                  next = ms + c.rand(40, 110);
                  const cmd = c.pick(CMDS);
                  out.push(Math.random() < 0.3 ? `  ${(Math.random() * 1000).toFixed(1)}ms  ${cmd}` : `$ ${cmd}`);
                  if (out.length > 10)
                      out.shift();
              }
              const p = clamp(t / 0.8);
              const n = Math.round(p * 24);
              const cursor = Math.floor(ms / 250) % 2 ? "▌" : " ";
              body.textContent = `${out.join("\n")}\n[${"#".repeat(n)}${".".repeat(24 - n)}] ${Math.round(p * 100)}% ${cursor}`;
          });
      },
  };
      return terminal;
    })(),
  );
})();
