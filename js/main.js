/* =========================================================
   JARVIS OS — start, pulpit, efekty, paleta, skróty
   ========================================================= */
'use strict';
(() => {
const { $, $$, h, esc, icon } = J;
const S = J.state.settings;
J.bootTime = Date.now();
J.applyTheme();

/* =================== BOOT =================== */
const boot = () => new Promise(resolve => {
  const el = $('#boot');
  const finish = () => {
    J.sfx.unlock(); J.sfx.boot();
    el.classList.add('out'); $('#app').classList.add('on');
    setTimeout(() => el.remove(), 1000);
    resolve();
  };
  if (S.skipBoot) {
    $('#bootTitle').textContent = 'JARVIS'; $('#bootBar').style.width = '100%';
    const e = $('#bootEnter'); e.classList.add('show');
    const go = () => { removeEventListener('keydown', go); el.removeEventListener('click', go); finish(); };
    addEventListener('keydown', go); el.addEventListener('click', go);
    return;
  }
  $('#bootTitle').innerHTML = [...'JARVIS'].map((c, i) => `<span style="animation-delay:${.3 + i * .09}s">${c}</span>`).join('');
  const lines = [
    'BIOS v2.0.26 · weryfikacja rdzenia…', 'ładowanie jądra neuronowego  <span class="ok">[OK]</span>', 'montowanie warstwy pulpitu  <span class="ok">[OK]</span>',
    'kalibracja reaktora łukowego… 3.2 GJ/s', 'moduł mowy pl-PL  <span class="ok">[OK]</span>', 'synchronizacja: pogoda · rynek · harmonogram',
    'przywracanie pamięci użytkownika (' + J.state.notes.length + ' notatek, ' + J.state.tasks.length + ' zadań)', 'uruchamianie interfejsu holograficznego…', 'wszystkie systemy online  <span class="ok">✓</span>'
  ];
  const log = $('#bootLog'), bar = $('#bootBar');
  let i = 0; let done = false;
  const step = () => {
    if (i < lines.length) {
      log.appendChild(h('div', {}, '&gt; ' + lines[i])); i++;
      bar.style.width = (i / lines.length * 100) + '%';
      setTimeout(step, 180 + Math.random() * 200);
    } else if (!done) {
      done = true; const e = $('#bootEnter'); e.classList.add('show');
      const go = ev => { if (ev.type === 'keydown' && ev.key === 'Tab') return; removeEventListener('keydown', go); el.removeEventListener('click', go); finish(); };
      addEventListener('keydown', go); el.addEventListener('click', go);
    }
  };
  setTimeout(step, 600);
});

/* =================== TŁO: sieć cząsteczek + FPS =================== */
const fx = (() => {
  const cv = $('#fx'), c = cv.getContext('2d');
  let W, H, pts = [], mouse = { x: -999, y: -999 }, frames = 0, last = performance.now();
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(70, Math.round(W * H / 26000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .4 }));
  };
  addEventListener('resize', resize); resize();
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    const wp = $('#wallpaper'); if (wp) wp.style.transform = `translate(${(e.clientX / W - .5) * -18}px,${(e.clientY / H - .5) * -12}px) scale(1.02)`;
  });
  const loop = now => {
    frames++;
    if (now - last >= 1000) { J.fps = Math.round(frames * 1000 / (now - last)); frames = 0; last = now; }
    c.clearRect(0, 0, W, H);
    if (S.particles && !document.hidden && !$('#app').classList.contains('focus')) {
      const rgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '33,217,255';
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
        if (d < 160) { p.x -= dx * .004; p.y -= dy * .004; }
      }
      c.lineWidth = .6;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 105) { c.strokeStyle = `rgba(${rgb},${(1 - d / 105) * .07})`; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        }
        const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (dm < 170) { c.strokeStyle = `rgba(${rgb},${(1 - dm / 170) * .45})`; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(mouse.x, mouse.y); c.stroke(); }
        c.fillStyle = `rgba(${rgb},.75)`; c.beginPath(); c.arc(a.x, a.y, a.r, 0, 7); c.fill();
      }
    }
    J.hud.frame(now); orbDraw(now); flowDraw(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return { resize };
})();

/* =================== CORE: szklana kula, orbity, wiązka, cząstki =================== */
const orbCv = $('#orbCanvas'), oc = orbCv.getContext('2d');
let orbAmp = 0, freq = new Uint8Array(128);
const SZ = 560, C0 = SZ / 2, RB = 108;
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const PART = Array.from({ length: 130 }, () => ({ a: rnd() * 6.283, r: .16 + rnd() * .8, sp: (.12 + rnd() * .55) * (rnd() < .5 ? -1 : 1), s: .5 + rnd() * 1.5, v: rnd() < .4 }));
const SPARK = Array.from({ length: 54 }, () => ({ a: rnd() * 6.283, r: 1.12 + rnd() * .95, ph: rnd() * 6.283, s: .5 + rnd() * 1.4, sp: (rnd() - .5) * .04 }));
const ARCS = Array.from({ length: 18 }, (_, i) => ({ r: .36 + rnd() * .58, a: rnd() * 6.283, len: .3 + rnd() * 1.2, sp: (.25 + rnd() * .9) * (i % 2 ? -1 : 1), w: .8 + rnd() * 1.8, v: rnd() < .45 }));
const RAIN = Array.from({ length: 14 }, () => ({ x: (rnd() - .5) * 60, y: rnd(), l: 6 + rnd() * 18, sp: .2 + rnd() * .5 }));
const ORBITS = [{ rx: 1.55, ry: .40, rot: -14, sp: .00042, ph: 0, v: true }, { rx: 1.40, ry: .34, rot: 11, sp: -.00058, ph: 2, v: false }, { rx: 1.78, ry: .52, rot: -32, sp: .0003, ph: 4, v: true, act: true }];
const TWO = Math.PI * 2;

function orbDraw(t) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (orbCv.width !== SZ * dpr) orbCv.width = orbCv.height = SZ * dpr;
  oc.setTransform(dpr, 0, 0, dpr, 0, 0); oc.clearRect(0, 0, SZ, SZ);
  const st = J.orb.state, eg = J.engine, an = J.ear.analyser;
  const A = J.rgb(S.accent), V = J.rgb(S.accent2), ov = eg.rgb();
  const col = ov || A;
  let target = st === 'speaking' ? .55 + Math.random() * .45 : st === 'listening' ? .25 : st === 'thinking' ? .35 : st === 'alert' ? .6 : .08;
  if (st !== 'speaking' && st !== 'listening') target = Math.max(target, eg.activity * .8);
  if (st === 'listening' && an) { an.getByteFrequencyData(freq); target = Math.min(1, freq.slice(2, 40).reduce((a, b) => a + b, 0) / 38 / 110); }
  orbAmp += (target - orbAmp) * .12;
  const idle = st === 'idle' && eg.mode === 'IDLE';
  const breath = idle ? .78 + .22 * Math.sin(t / 1600) : 1;
  const act = J.clamp(eg.activity, 0, 1), busy = !!eg.taskId, energy = J.clamp(.3 + act * .95 + orbAmp * .4, 0, 1.4);
  const sp = .6 + energy * 1.6;   // prędkość ruchu elementów

  // — poświata
  let g = oc.createRadialGradient(C0, C0, RB * .5, C0, C0, RB * 2.4);
  g.addColorStop(0, `rgba(${col},${.5 * breath * (.65 + energy * .4)})`); g.addColorStop(.4, `rgba(${V},${.16 + .12 * energy})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  oc.fillStyle = g; oc.fillRect(0, 0, SZ, SZ);

  // — wiązka pionowa (przez całą kulę, do lustra wody) + „cyfrowy deszcz”
  const yTop = C0 - RB - 120, yBot = C0 + RB * 1.37;
  g = oc.createLinearGradient(0, yTop, 0, yBot);
  g.addColorStop(0, `rgba(${A},0)`); g.addColorStop(.28, `rgba(150,210,255,${.7 * breath})`); g.addColorStop(.7, `rgba(150,210,255,${.55 * breath})`); g.addColorStop(1, 'rgba(255,255,255,.95)');
  oc.fillStyle = g; oc.fillRect(C0 - .8, yTop, 1.6, yBot - yTop);
  g = oc.createLinearGradient(0, yTop, 0, yBot);
  g.addColorStop(0, `rgba(${A},0)`); g.addColorStop(.5, `rgba(${A},${.13 * breath})`); g.addColorStop(1, `rgba(${A},.38)`);
  oc.fillStyle = g; oc.fillRect(C0 - 7, yTop, 14, yBot - yTop);
  RAIN.forEach(r => {
    const u = (r.y + t / 1000 * r.sp * (busy ? 1.6 : .7)) % 1, y = yTop + 20 + u * 100;
    oc.fillStyle = `rgba(160,215,255,${.5 * (1 - u) * breath})`; oc.fillRect(C0 + r.x, y, 1, r.l);
  });

  // — orbity (tylna połowa)
  const orbs = ORBITS.filter(o => !o.act || busy);
  const orbitPath = (o, front) => {
    const rot = (o.rot + Math.sin(t / 3800 + o.ph) * 3) * Math.PI / 180, oc_ = o.v ? V : A;
    oc.save(); oc.translate(C0, C0); oc.rotate(rot);
    oc.beginPath(); oc.ellipse(0, 0, RB * o.rx, RB * o.ry, 0, front ? 0 : Math.PI, front ? Math.PI : TWO);
    oc.strokeStyle = `rgba(${oc_},${(front ? .9 : .34) * breath})`; oc.lineWidth = front ? 1.7 : 1.1; oc.shadowColor = `rgba(${oc_},.95)`; oc.shadowBlur = front ? 12 : 4; oc.stroke(); oc.shadowBlur = 0;
    // cząstka biegnąca po orbicie + ogon
    for (let i = 0; i < 7; i++) {
      const a = t * o.sp * sp * 1.3 + o.ph - i * .07, sn = Math.sin(a);
      if ((sn > 0) !== front) continue;
      oc.fillStyle = `rgba(230,245,255,${(1 - i / 7) * .95})`; oc.beginPath(); oc.arc(Math.cos(a) * RB * o.rx, sn * RB * o.ry, (i ? 1.2 : 2.6), 0, TWO); oc.fill();
    }
    oc.restore();
  };
  orbs.forEach(o => orbitPath(o, false));

  // — kula: korpus
  oc.save(); oc.beginPath(); oc.arc(C0, C0, RB, 0, TWO); oc.clip();
  g = oc.createRadialGradient(C0 - RB * .25, C0 - RB * .35, RB * .05, C0, C0, RB);
  g.addColorStop(0, 'rgba(100,140,255,.20)'); g.addColorStop(.55, 'rgba(10,18,74,.46)'); g.addColorStop(.86, `rgba(${col},.30)`); g.addColorStop(1, `rgba(${V},.58)`);
  oc.fillStyle = g; oc.fillRect(C0 - RB, C0 - RB, RB * 2, RB * 2);
  g = oc.createRadialGradient(C0 + RB * .55, C0 + RB * .6, 0, C0 + RB * .55, C0 + RB * .6, RB * .95);
  g.addColorStop(0, `rgba(${V},${.34 + .2 * energy})`); g.addColorStop(1, `rgba(${V},0)`); oc.fillStyle = g; oc.fillRect(C0 - RB, C0 - RB, RB * 2, RB * 2);
  g = oc.createRadialGradient(C0 - RB * .6, C0 - RB * .5, 0, C0 - RB * .6, C0 - RB * .5, RB * .8);
  g.addColorStop(0, `rgba(70,220,255,${.22 + .1 * energy})`); g.addColorStop(1, 'rgba(70,220,255,0)'); oc.fillStyle = g; oc.fillRect(C0 - RB, C0 - RB, RB * 2, RB * 2);

  // plazma: łuki wirujące w środku (mocniej przy pracy)
  const nArc = idle ? 7 : ARCS.length;
  for (let i = 0; i < nArc; i++) {
    const a = ARCS[i], a0 = a.a + t / 1000 * a.sp * sp;
    oc.beginPath(); oc.arc(C0, C0, RB * a.r, a0, a0 + a.len);
    oc.strokeStyle = `rgba(${a.v ? V : '90,200,255'},${(.18 + .5 * energy) * breath})`; oc.lineWidth = a.w; oc.stroke();
  }
  // cząstki wewnątrz
  const nP = idle ? 46 : PART.length;
  for (let i = 0; i < nP; i++) {
    const p = PART[i], a = p.a + t / 1000 * p.sp * sp, r = RB * p.r;
    oc.fillStyle = `rgba(${p.v ? '200,150,255' : '150,220,255'},${(.25 + .6 * ((i * 37) % 10) / 10) * breath * (.6 + energy * .4)})`;
    oc.beginPath(); oc.arc(C0 + Math.cos(a) * r, C0 + Math.sin(a) * r, p.s, 0, TWO); oc.fill();
  }
  // celownik + pierścienie techniczne
  oc.strokeStyle = 'rgba(140,200,255,.26)'; oc.lineWidth = 1;
  oc.beginPath(); oc.moveTo(C0 - RB * .92, C0); oc.lineTo(C0 - RB * .64, C0); oc.moveTo(C0 + RB * .64, C0); oc.lineTo(C0 + RB * .92, C0); oc.moveTo(C0, C0 - RB * .92); oc.lineTo(C0, C0 - RB * .64); oc.moveTo(C0, C0 + RB * .64); oc.lineTo(C0, C0 + RB * .92); oc.stroke();
  oc.save(); oc.translate(C0, C0); oc.rotate(t / 12000 * sp);
  for (let i = 0; i < 72; i++) { oc.rotate(TWO / 72); oc.fillStyle = `rgba(150,215,255,${i % 6 ? .18 : .5})`; oc.fillRect(RB * .93, -.5, i % 6 ? 3 : 6, 1); }
  oc.restore();
  oc.setLineDash([2, 7]); oc.lineDashOffset = -t / 70; oc.strokeStyle = 'rgba(160,215,255,.5)'; oc.lineWidth = 1.2; oc.beginPath(); oc.arc(C0, C0, RB * .64, 0, TWO); oc.stroke(); oc.setLineDash([]);
  for (let i = 0; i < 4; i++) {   // grube łuki (cyjan) wokół napisu
    const a0 = t / 1000 * (i % 2 ? -.9 : .7) * sp + i * 1.9;
    oc.beginPath(); oc.arc(C0, C0, RB * (.78 - (i > 1 ? .07 : 0)), a0, a0 + .95 - i * .1);
    oc.strokeStyle = `rgba(70,225,255,${.95 * breath})`; oc.lineWidth = 3.4 - i * .3; oc.shadowColor = 'rgba(70,225,255,.9)'; oc.shadowBlur = 8; oc.stroke(); oc.shadowBlur = 0;
  }
  // główny pierścień z napisem
  oc.beginPath(); oc.arc(C0, C0, RB * .5, 0, TWO);
  oc.strokeStyle = `rgba(${ov || '120,190,255'},${.95 * breath})`; oc.lineWidth = 3 + orbAmp * 3; oc.shadowColor = `rgba(${col},1)`; oc.shadowBlur = 16; oc.stroke(); oc.shadowBlur = 0;
  oc.beginPath(); oc.arc(C0, C0, RB * .5 - 6, 0, TWO); oc.strokeStyle = `rgba(${col},.22)`; oc.lineWidth = 1; oc.stroke();
  // odblask
  g = oc.createLinearGradient(C0 - RB * .7, C0 - RB * .9, C0 + RB * .1, C0 - RB * .1);
  g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  oc.fillStyle = g; oc.beginPath(); oc.ellipse(C0 - RB * .32, C0 - RB * .52, RB * .5, RB * .26, -.5, 0, TWO); oc.fill();
  oc.restore();

  // — krawędź kuli (fresnel)
  g = oc.createLinearGradient(C0 - RB, C0 - RB, C0 + RB, C0 + RB);
  g.addColorStop(0, 'rgba(130,230,255,.98)'); g.addColorStop(.5, `rgba(${col},.9)`); g.addColorStop(1, `rgba(${V},.98)`);
  oc.beginPath(); oc.arc(C0, C0, RB, 0, TWO); oc.strokeStyle = g; oc.lineWidth = 2.8; oc.shadowColor = `rgba(${col},1)`; oc.shadowBlur = 22; oc.stroke(); oc.shadowBlur = 0;
  oc.beginPath(); oc.arc(C0, C0, RB - 6, 0, TWO); oc.strokeStyle = 'rgba(200,230,255,.22)'; oc.lineWidth = 1; oc.stroke();
  // pierścień reagujący na głos / mikrofon (fala)
  for (let ring = 0; ring < 2; ring++) {
    oc.beginPath();
    const N = 140;
    for (let i = 0; i <= N; i++) {
      const a = i / N * TWO; let k;
      if (st === 'listening' && an) k = (freq[(i % 70) + 2] / 255) * 26 * (ring ? .6 : 1);
      else k = (Math.sin(a * 6 + t / (ring ? 420 : 300)) * .5 + Math.sin(a * 11 - t / 260) * .35 + Math.sin(a * 3 + t / 900) * .4) * orbAmp * 22 * (ring ? .7 : 1);
      const r = RB + 9 + ring * 8 + k; i ? oc.lineTo(C0 + Math.cos(a) * r, C0 + Math.sin(a) * r) : oc.moveTo(C0 + Math.cos(a) * r, C0 + Math.sin(a) * r);
    }
    oc.closePath(); oc.strokeStyle = `rgba(${col},${(ring ? .16 : .34 + orbAmp * .4) * breath})`; oc.lineWidth = ring ? 1 : 1.3; oc.stroke();
  }
  if (st === 'thinking' || eg.mode === 'THINKING') for (let k = 0; k < 3; k++) {
    const a0 = t / (300 + k * 140) * (k % 2 ? -1 : 1) + k * 2;
    oc.beginPath(); oc.arc(C0, C0, RB + 26 + k * 9, a0, a0 + .9); oc.strokeStyle = `rgba(${col},${.7 - k * .18})`; oc.lineWidth = 2; oc.stroke();
  }

  // — orbity (przednia połowa)
  orbs.forEach(o => orbitPath(o, true));

  // — iskry wokół
  SPARK.forEach(s => {
    const a = s.a + t * s.sp / 1000, r = RB * s.r, tw = .5 + .5 * Math.sin(t / 520 * s.s + s.ph);
    oc.fillStyle = `rgba(${s.ph > 3.1 ? '190,150,255' : '150,215,255'},${tw * .75 * breath})`; oc.beginPath(); oc.arc(C0 + Math.cos(a) * r, C0 + Math.sin(a) * r * .92, s.s * .9, 0, TWO); oc.fill();
  });
  // — romby płynące po wiązce (tylko gdy trwa zadanie)
  if (busy) for (let i = 0; i < 3; i++) {
    const u = ((t / 1500) + i / 3) % 1, y = C0 + RB * 1.02 + u * RB * .32, sz = 3.4 * (1 - u * .4);
    oc.save(); oc.translate(C0, y); oc.rotate(Math.PI / 4); oc.fillStyle = `rgba(${i % 2 ? '190,140,255' : '120,215,255'},${.95 * (1 - u * .5)})`; oc.shadowColor = `rgba(${col},1)`; oc.shadowBlur = 10; oc.fillRect(-sz, -sz, sz * 2, sz * 2); oc.restore();
  }
}

/* =================== SCENA: jezioro (odbicie, fale), linie obwodów HUD, puls zakończenia =================== */
const flowCv = $('#flowCanvas'), fc = flowCv.getContext('2d');
const refCv = document.createElement('canvas'), rc = refCv.getContext('2d');
const easeOut = x => 1 - Math.pow(1 - x, 3);
const TONE = { blue: '90,165,255', purple: '178,116,255', teal: '52,232,212', green: '62,235,152', amber: '255,184,77' };
let lineA = 0;
const pointAt = (pts, u) => {
  let tot = 0; const L = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); L.push(l); tot += l; }
  let d = J.clamp(u, 0, 1) * tot;
  for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const f = L[i] ? d / L[i] : 0; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f }; } d -= L[i]; }
};
function reflect(dpr, sc, now) {
  const yA = C0 + (sc.foot - sc.cy) / sc.k, hR = Math.min(300, yA);
  const w = SZ * dpr, hh = Math.round(hR * dpr);
  if (refCv.width !== w || refCv.height !== hh) { refCv.width = w; refCv.height = hh; }
  rc.setTransform(1, 0, 0, 1, 0, 0); rc.globalCompositeOperation = 'source-over'; rc.clearRect(0, 0, w, hh);
  for (let r = 0; r < hR; r += 3) {
    const sy = yA - r - 3; if (sy < 0) break;
    const wob = Math.sin(r * .34 + now / 430) * (.8 + r * .022) + Math.sin(r * .1 - now / 950) * 1.4;
    rc.drawImage(orbCv, 0, sy * dpr, w, 3 * dpr, wob * dpr, r * dpr, w, 3 * dpr);
  }
  rc.globalCompositeOperation = 'destination-in';
  const g = rc.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.5, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  rc.fillStyle = g; rc.fillRect(0, 0, w, hh);
  fc.save(); fc.globalCompositeOperation = 'screen'; fc.drawImage(refCv, sc.cx - C0 * sc.k, sc.foot, SZ * sc.k, hR * sc.k); fc.restore();
}
function flowDraw(now) {
  const sc = J.hud.scene; if (!sc.W) return;
  const dpr = Math.min(devicePixelRatio || 1, 2), W = sc.W, H = sc.H, { cx, cy, R, k, foot } = sc;
  if (flowCv.width !== Math.round(W * dpr) || flowCv.height !== Math.round(H * dpr)) { flowCv.width = Math.round(W * dpr); flowCv.height = Math.round(H * dpr); }
  fc.setTransform(dpr, 0, 0, dpr, 0, 0); fc.clearRect(0, 0, W, H);
  const eg = J.engine; flowCv.classList.toggle('over', !!eg.taskId);
  const wall = Date.now(), A = J.rgb(S.accent), V = J.rgb(S.accent2), col = eg.rgb() || A, act = eg.activity, busy = !!eg.taskId;

  // — jezioro: odbicie kuli, poświata u podstawy wiązki, fale
  reflect(dpr, sc, now);
  fc.save(); fc.translate(cx, foot); fc.scale(1, .17);
  let g = fc.createRadialGradient(0, 0, 0, 0, 0, 190 * k); g.addColorStop(0, `rgba(170,215,255,${.55 + act * .2})`); g.addColorStop(.35, `rgba(${A},.28)`); g.addColorStop(1, `rgba(${A},0)`);
  fc.fillStyle = g; fc.fillRect(-200 * k, -200 * k, 400 * k, 400 * k); fc.restore();
  for (let i = 0; i < 8; i++) {
    const ph = ((now / (busy ? 2300 : 3900)) + i / 8) % 1, rx = (22 + ph * 310) * k, ry = rx * .078, a = Math.pow(1 - ph, 1.5) * (.55 + act * .4);
    const c = i % 3 === 2 ? V : '120,195,255';
    fc.beginPath(); fc.ellipse(cx, foot, rx, ry, 0, 0, TWO); fc.strokeStyle = `rgba(${c},${a})`; fc.lineWidth = 1.3; fc.shadowColor = `rgba(${c},.9)`; fc.shadowBlur = 9; fc.stroke();
  }
  fc.shadowBlur = 0;
  [46, 92, 150, 214].forEach((r0, i) => { fc.beginPath(); fc.ellipse(cx, foot, r0 * k, r0 * k * .078, 0, 0, TWO); fc.strokeStyle = `rgba(${i % 2 ? V : '130,205,255'},${.34 - i * .06})`; fc.lineWidth = 1; fc.stroke(); });
  fc.beginPath(); fc.ellipse(cx, foot, 30 * k, 4.4 * k, 0, 0, TWO); fc.fillStyle = 'rgba(210,235,255,.9)'; fc.shadowColor = `rgba(${A},1)`; fc.shadowBlur = 16; fc.fill(); fc.shadowBlur = 0;

  // — puls zakończenia Core (tylko po realnym task.*)
  const ft = wall - eg.flash.t;
  if (eg.flash.t && ft < 1500) {
    const q = ft / 1500, c = eg.flash.kind === 'ok' ? '57,229,154' : eg.flash.kind === 'err' ? '255,184,77' : '160,190,220';
    fc.lineWidth = 2.4 * (1 - q) + .6; fc.strokeStyle = `rgba(${ft < 180 ? '255,255,255' : c},${(1 - q) * .9})`;
    fc.beginPath(); fc.arc(cx, cy, R + 8 + easeOut(q) * 170 * k, 0, TWO); fc.stroke();
  }

  // — linie obwodów HUD: Core ↔ karty (świecą tylko przy realnej aktywności karty)
  lineA += ((J.hud.visible ? 1 : 0) - lineA) * .09; if (lineA < .01) return;
  const cards = J.hud.CARDS;
  cards.forEach((c, i) => {
    if (!c.pts) return;
    const s = c.st?.s || 'idle', tone = TONE[s === 'failed' ? 'amber' : c.tone];
    const a = (s === 'active' ? .9 : s === 'failed' ? .6 : s === 'done' ? .36 : .13) * lineA;
    fc.beginPath(); c.pts.forEach((p, j) => j ? fc.lineTo(p.x, p.y) : fc.moveTo(p.x, p.y));
    fc.lineJoin = 'round'; fc.lineWidth = s === 'active' ? 1.9 : 1.3; fc.strokeStyle = `rgba(${tone},${a})`;
    fc.shadowColor = `rgba(${tone},.9)`; fc.shadowBlur = s === 'active' ? 11 : s === 'done' ? 4 : 0; fc.stroke(); fc.shadowBlur = 0;
    [c.A, c.B].forEach(p => { fc.beginPath(); fc.arc(p.x, p.y, 2.6, 0, TWO); fc.fillStyle = `rgba(${tone},${Math.min(1, a + .15)})`; fc.shadowColor = `rgba(${tone},1)`; fc.shadowBlur = s === 'idle' ? 0 : 8; fc.fill(); fc.shadowBlur = 0; });
    if (s === 'active') for (let j = 0; j < 2; j++) {     // impulsy płyną tylko, gdy karta faktycznie pracuje
      const p = pointAt(c.pts, ((now / 1400) + j * .5 + i * .17) % 1);
      fc.beginPath(); fc.arc(p.x, p.y, 2.5, 0, TWO); fc.fillStyle = `rgba(255,255,255,${.9 * lineA})`; fc.shadowColor = `rgba(${tone},1)`; fc.shadowBlur = 12; fc.fill(); fc.shadowBlur = 0;
    }
  });
  // pakiety zdarzeń: start (Core → karta) i wynik (karta → Core)
  eg.packets = eg.packets.filter(p => wall - p.t0 < 900);
  for (const p of eg.packets) {
    const q = easeOut((wall - p.t0) / 900);
    J.hud.cardsFor(p).forEach(id => {
      const c = cards.find(x => x.id === id); if (!c?.pts) return;
      const pt = pointAt(c.pts, p.dir === 'out' ? 1 - q : q);
      fc.beginPath(); fc.arc(pt.x, pt.y, p.dir === 'in' ? 3.4 : 2.6, 0, TWO); fc.fillStyle = `rgba(255,255,255,${(1 - q * .6) * lineA})`; fc.shadowColor = `rgba(${col},1)`; fc.shadowBlur = 13; fc.fill(); fc.shadowBlur = 0;
    });
  }
}

/* =================== ZEGAR / POGODA / WĘZŁY =================== */
const clock = () => {
  const d = new Date();
  $('#clockBig').textContent = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  $('#dateLine').textContent = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
};
const sysWeather = d => {
  const [ico] = J.wxInfo(d.current.weather_code);
  $('#wxIco').textContent = ico; $('#wxTemp').textContent = Math.round(d.current.temperature_2m) + '°C'; $('#wxCity').textContent = d.city;
};
J.on('weather', sysWeather);
const loadWeather = () => J.weather.fetch().catch(() => { $('#wxTemp').textContent = 'offline'; });

const nodes = () => { };   // (dawny panel węzłów zastąpiony kartami HUD)

/* =================== PULPIT: ikony i dok =================== */
const BUILTIN = [['chat', 'Czat', 'blue'], ['notes', 'Notatnik', 'dark'], ['market', 'Lista tokenów', 'blue'], ['schedule', 'Harmonogram', 'blue'], ['monitor', 'Wynik zadania', 'teal']];
const TONES = { chat: 'blue', notes: 'orange', market: 'teal', schedule: 'indigo', monitor: 'green', weather: 'sky', terminal: 'dark', settings: 'dark', calc: 'purple', timer: 'purple', library: 'dark' };
const tile = (name, tone) => `<span class="tile" data-tone="${tone}">${icon(name)}</span>`;
const renderIcons = () => {
  const rail = $('#iconRail'); rail.innerHTML = '';
  BUILTIN.forEach(([id, name, tone], i) => {
    const b = h('button', { class: 'desktop-icon', 'data-app': id, style: `animation-delay:${i * .06}s` }, `${tile(J.apps[id].icon, tone)}<span class="lbl">${esc(name)}</span>${id === 'chat' ? '<i class="ic-dot" id="railChatDot"></i>' : ''}`);
    b.onclick = () => id === 'chat' ? J.chatPanel.toggle() : J.wm.open(id); rail.appendChild(b);
  });
  J.state.shortcuts.forEach((s, i) => {
    const b = h('button', { class: 'desktop-icon', 'data-sc': s.id, style: `animation-delay:${(i + 5) * .06}s`, title: s.url || '' }, `${tile(s.icon || 'star', 'blue')}<span class="lbl"></span>`);
    b.querySelector('.lbl').textContent = s.name;
    b.onclick = () => J.shortcuts.run(s); rail.appendChild(b);
  });
  const add = h('button', { class: 'desktop-icon' }, `${tile('plus', 'dark')}<span class="lbl">Dodaj widget</span>`);
  add.onclick = () => { const r = add.getBoundingClientRect(); widgetMenu(r.right + 8, r.top); }; rail.appendChild(add);
  syncStatus();
};
J.on('shortcuts', renderIcons);

const PINNED = ['chat', 'notes', 'market', 'schedule', 'monitor'];
const LABEL = { chat: 'Czat', notes: 'Notatnik', market: 'Tokeny', schedule: 'Harmonogram', weather: 'Pogoda', terminal: 'Terminal', monitor: 'Wynik', calc: 'Kalkulator', timer: 'Minutnik', settings: 'Ustawienia', library: 'Menu' };
const renderDock = () => {
  const d = $('#dock'); d.innerHTML = '';
  const btn = id => {
    const isChat = id === 'chat';
    const b = h('button', { 'data-app': id, title: J.apps[id].title }, `${tile(J.apps[id].icon, TONES[id] || 'blue')}<span>${LABEL[id] || J.apps[id].title}</span>`);
    b.onclick = () => isChat ? J.chatPanel.toggle() : J.wm.toggle(id);
    const on = isChat ? !!J.chatPanel?.isOpen : J.wm.isOpen(id);
    b.classList.toggle('running', on); b.classList.toggle('focused', !isChat && J.wm.isFocused(id) && !J.wm.isMin(id));
    return b;
  };
  const lib = h('button', { class: 'plain', title: 'Wszystkie aplikacje' }, icon('grid')); lib.onclick = () => J.wm.toggle('library'); d.appendChild(lib);
  d.appendChild(h('span', { class: 'sep' }));
  PINNED.forEach(id => d.appendChild(btn(id)));
  const extra = J.wm.list().filter(id => !PINNED.includes(id) && id !== 'library');
  extra.forEach(id => d.appendChild(btn(id)));
  d.appendChild(h('span', { class: 'sep' }));
  const w = h('button', { class: 'plain', title: 'Nowy widget na pulpicie' }, icon('plus')); w.onclick = () => { const r = w.getBoundingClientRect(); widgetMenu(r.left, r.top - 130); }; d.appendChild(w);
};
J.on('wm', renderDock);

/* =================== WIDGETY: menu tworzenia =================== */
const widgetMenu = (x, y) => ctxMenu(x, y, Object.entries(J.widgets.TYPES).map(([k, t]) => ({ ic: t.icon, t: 'Nowy widget: ' + t.label, run: () => J.widgets.create(k, { title: t.label }) })));

/* =================== PALETA POLECEŃ =================== */
const palette = (() => {
  const bg = $('#paletteBg'), inp = $('#paletteInput'), list = $('#paletteList');
  let items = [], sel = 0;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  const base = () => [
    ...Object.entries(J.apps).filter(([, a]) => !a.widget).map(([id, a]) => ({ g: 'Aplikacje', ic: a.icon, t: a.title, k: id + ' ' + (LABEL[id] || ''), run: () => J.wm.open(id) })),
    { g: 'Akcje', ic: 'mic', t: 'Mów do Jarvisa', s: 'Ctrl Spacja', run: () => J.ear.start() },
    ...Object.entries(J.widgets.TYPES).map(([k, t]) => ({ g: 'Widgety', ic: t.icon, t: 'Nowy widget: ' + t.label, run: () => J.widgets.create(k, { title: t.label }) })),
    { g: 'Akcje', ic: 'history', t: 'Pokaż / ukryj Process Log', s: 'Alt 2', run: () => J.proc.toggle() },
    { g: 'Akcje', ic: 'chat', t: 'Pokaż / ukryj czat', s: 'Alt 1', run: () => J.chatPanel.toggle() },
    { g: 'Akcje', ic: 'notes', t: 'Nowa notatka', run: () => { const n = J.notes.add('Nowa notatka', ''); J.wm.open('notes', n.id); } },
    { g: 'Akcje', ic: 'timer', t: 'Minutnik 5 minut', run: () => { J.timer.start(300, 'Minutnik 5 min'); J.wm.open('timer'); } },
    { g: 'Akcje', ic: 'timer', t: 'Pomodoro 25 minut', run: () => { J.timer.start(1500, 'Pomodoro'); J.wm.open('timer'); } },
    { g: 'Akcje', ic: 'image', t: 'Zmień tapetę', run: () => J.actions.set_wallpaper({}) },
    { g: 'Akcje', ic: 'sun', t: 'Następny motyw kolorystyczny', run: nextTheme },
    { g: 'Akcje', ic: 'focus', t: 'Tryb skupienia', run: () => J.setFocus(!$('#app').classList.contains('focus')) },
    { g: 'Akcje', ic: 'min', t: 'Pokaż pulpit (zminimalizuj okna)', run: () => J.wm.minimizeAll() },
    { g: 'Akcje', ic: 'close', t: 'Zamknij wszystkie okna', run: () => J.wm.closeAll() },
    { g: 'Akcje', ic: 'code', t: 'Matrix', run: () => J.matrix() },
    ...J.state.shortcuts.map(s => ({ g: 'Skróty', ic: s.icon || 'star', t: s.name, s: s.url || '', run: () => J.shortcuts.run(s) })),
    ...J.state.notes.slice(0, 20).map(n => ({ g: 'Notatki', ic: 'notes', t: n.title || 'Bez tytułu', k: n.body.slice(0, 200), run: () => J.wm.open('notes', n.id) }))
  ];
  const render = () => {
    const q = norm(inp.value.trim());
    items = base().filter(it => !q || norm(it.t + ' ' + (it.k || '')).includes(q));
    if (q) {
      items.push({ g: 'Jarvis', ic: 'chat', t: 'Zapytaj Jarvisa: „' + inp.value.trim() + '”', s: 'Enter', run: () => J.brain.handle(inp.value.trim()), jar: true });
      items.push({ g: 'Jarvis', ic: 'globe', t: 'Szukaj w Google: ' + inp.value.trim(), run: () => window.open('https://www.google.com/search?q=' + encodeURIComponent(inp.value.trim()), '_blank', 'noopener') });
      if (!items.some(i => !i.jar && i.g !== 'Jarvis')) sel = 0;
    }
    sel = J.clamp(sel, 0, items.length - 1);
    list.innerHTML = ''; let g = '';
    items.forEach((it, i) => {
      if (it.g !== g) { g = it.g; list.appendChild(h('div', { class: 'pgroup' }, esc(g))); }
      const b = h('button', { class: 'pitem' + (i === sel ? ' sel' : '') }, `<span class="pi">${icon(it.ic)}</span><span></span>${it.s ? `<small>${esc(it.s)}</small>` : ''}`);
      b.children[1].textContent = it.t;
      b.onclick = () => exec(i); b.onmousemove = () => { if (sel !== i) { sel = i; mark(); } };
      list.appendChild(b);
    });
  };
  const mark = () => $$('.pitem', list).forEach((b, i) => b.classList.toggle('sel', i === sel));
  const exec = i => { const it = items[i]; if (!it) return; close(); J.sfx.click(); it.run(); };
  const open = () => { bg.classList.add('open'); inp.value = ''; sel = 0; render(); setTimeout(() => inp.focus(), 30); };
  const close = () => { bg.classList.remove('open'); inp.blur(); };
  inp.addEventListener('input', () => { sel = 0; render(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = (sel + 1) % items.length; mark(); list.children && $$('.pitem', list)[sel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % items.length; mark(); $$('.pitem', list)[sel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); exec(sel); }
    else if (e.key === 'Escape') { e.stopPropagation(); close(); }
  });
  bg.addEventListener('pointerdown', e => { if (e.target === bg) close(); });
  return { open, close, get isOpen() { return bg.classList.contains('open'); } };
})();

function nextTheme() {
  const keys = Object.keys(J.THEMES), cur = keys.findIndex(k => J.THEMES[k][0] === S.accent);
  const k = keys[(cur + 1) % keys.length]; J.actions.set_theme({ color: k }); J.toast('Motyw: ' + k);
}

/* =================== MENU KONTEKSTOWE =================== */
let ctxEl = null;
const closeCtx = () => { ctxEl?.remove(); ctxEl = null; };
const ctxMenu = (x, y, entries) => {
  closeCtx();
  ctxEl = h('div', { class: 'ctx' });
  entries.forEach(e => {
    if (e === '-') return ctxEl.appendChild(h('hr'));
    const b = h('button', { class: e.danger ? 'danger' : '' }, `${icon(e.ic, 'width="14" height="14"')}<span></span>`);
    b.querySelector('span').textContent = e.t; b.onclick = () => { closeCtx(); e.run(); };
    ctxEl.appendChild(b);
  });
  $('#app').appendChild(ctxEl);
  const r = ctxEl.getBoundingClientRect();
  ctxEl.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; ctxEl.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
};
addEventListener('pointerdown', e => { if (ctxEl && !ctxEl.contains(e.target)) closeCtx(); });
$('#app').addEventListener('contextmenu', e => {
  if (e.target.closest('input,textarea,.window .win-body,.chat-panel,.log-panel')) return;
  e.preventDefault();
  const sc = e.target.closest('[data-sc]');
  if (sc) {
    const s = J.state.shortcuts.find(x => x.id === sc.dataset.sc); if (!s) return;
    return ctxMenu(e.clientX, e.clientY, [
      { ic: 'link', t: 'Otwórz', run: () => J.shortcuts.run(s) },
      { ic: 'notes', t: 'Zmień nazwę', run: () => { const n = prompt('Nowa nazwa skrótu:', s.name); if (n) { s.name = n.trim(); J.save(); renderIcons(); } } },
      { ic: 'globe', t: 'Zmień adres', run: () => { const u = prompt('Adres URL:', s.url || 'https://'); if (u) { s.url = /^https?:\/\//i.test(u) ? u : 'https://' + u; s.app = null; s.icon = 'link'; J.save(); renderIcons(); } } },
      '-', { ic: 'trash', t: 'Usuń z pulpitu', danger: true, run: () => { J.shortcuts.remove(s.id); J.toast('Usunięto „' + s.name + '”'); } }
    ]);
  }
  ctxMenu(e.clientX, e.clientY, [
    { ic: 'notes', t: 'Nowa notatka', run: () => { const n = J.notes.add('Nowa notatka', ''); J.wm.open('notes', n.id); } },
    { ic: 'calendar', t: 'Nowe zadanie', run: () => J.wm.open('schedule') },
    { ic: 'plus', t: 'Nowy skrót na pulpicie', run: () => J.wm.open('library') },
    ...Object.entries(J.widgets.TYPES).map(([k, t]) => ({ ic: t.icon, t: 'Nowy widget: ' + t.label, run: () => J.widgets.create(k, { title: t.label }) })),
    '-',
    { ic: 'image', t: 'Zmień tapetę', run: () => J.actions.set_wallpaper({}) },
    { ic: 'sun', t: 'Następny motyw', run: nextTheme },
    { ic: 'min', t: 'Pokaż pulpit', run: () => J.wm.minimizeAll() },
    '-',
    { ic: 'terminal', t: 'Terminal', run: () => J.wm.open('terminal') },
    { ic: 'settings', t: 'Ustawienia', run: () => J.wm.open('settings') },
    { ic: 'refresh', t: 'Uruchom ponownie', run: () => location.reload() }
  ]);
});

/* =================== RDZEŃ =================== */
const wrap = $('#coreWrap');
$('#core').addEventListener('click', () => { if (J.ear.supported) J.ear.toggle(); else J.chatPanel.show(); });
J.on('ear', on => $('#btnVoice').classList.toggle('rec', on));
if (!J.ear.supported) $('#coreHint').textContent = 'kliknij, aby porozmawiać';
J.on('voice-command', t => J.brain.handle(t, { voice: true }));

/* =================== PASEK GÓRNY =================== */
$('#btnVoice').innerHTML = icon('mic'); $('#btnFocus').innerHTML = icon('focus');
$('#btnLog').insertAdjacentHTML('afterbegin', icon('history'));
const soundIcon = () => { $('#btnSound').innerHTML = icon(S.sound ? 'sound' : 'mute'); $('#btnSound').classList.toggle('on', S.sound); };
soundIcon(); J.on('settings', () => { J.hermesPing(); soundIcon(); $('#btnAvatar').textContent = S.user; });
$('#btnNet').innerHTML = icon('wifi'); $('#btnFull').innerHTML = icon('screen');
const netInfo = () => !navigator.onLine ? 'Brak połączenia z internetem' : (J.aiReady() ? 'Hermes: ' + ({ up: 'połączony', down: 'offline', unknown: 'nie sprawdzono' }[J.hermes.status] || '—') : 'Internet: online · silnik lokalny');
$('#btnNet').onclick = () => { J.toast(netInfo()); J.hermesPing(); };
$('#btnFull').onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) { } };
$('#btnAvatar').textContent = S.user;
$('#searchPill').insertAdjacentHTML('afterbegin', '');
$('#btnVoice').onclick = () => J.ear.toggle();
$('#btnSound').onclick = () => { S.sound = !S.sound; J.save(); soundIcon(); J.sfx.click(); J.toast(S.sound ? 'Dźwięki włączone' : 'Dźwięki wyciszone'); };
$('#btnFocus').onclick = () => J.setFocus(!$('#app').classList.contains('focus'));
$('#btnAvatar').onclick = () => J.wm.open('settings');
$('#searchPill').onclick = () => palette.open();
$('#btnLog').onclick = () => J.proc.toggle();
$('#btnChat').innerHTML = icon('chat'); $('#btnChat').onclick = () => J.chatPanel.toggle();
$('#sysWeather').onclick = () => J.wm.open('weather');
$('#sysClock').onclick = () => J.wm.open('schedule');

J.setFocus = on => {
  $('#app').classList.toggle('focus', on); $('#btnFocus').classList.toggle('on', on);
  if (on) J.wm.minimizeAll();
  J.toast(on ? 'Tryb skupienia włączony — tło przygaszone, okna zminimalizowane' : 'Tryb skupienia wyłączony');
  J.log(on ? 'Tryb skupienia' : 'Tryb normalny', on ? 'Rozpraszacze wyciszone.' : 'Pełny interfejs przywrócony.', 'info');
};

/* =================== SKRÓTY KLAWISZOWE =================== */
addEventListener('keydown', e => {
  if (!$('#app').classList.contains('on')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.isOpen ? palette.close() : palette.open(); }
  else if (mod && e.code === 'Space') { e.preventDefault(); J.ear.toggle(); }
  else if (e.altKey && e.key === '1') { e.preventDefault(); J.chatPanel.toggle(); }
  else if (e.altKey && e.key === '2') { e.preventDefault(); J.proc.toggle(); }
  else if (e.key === 'Escape') {
    if (ctxEl) return closeCtx();
    if (palette.isOpen) return palette.close();
    if (J.proc.isOpen && !J.proc.active) return J.proc.close();
    if (J.brain.abort()) return;
    if (J.voice.speaking) return J.voice.stop();
    if (J.ear.active) return J.ear.stop();
    J.wm.closeTop();
  }
  else if (e.key === '/' && !e.target.closest('input,textarea')) { e.preventDefault(); palette.open(); }
});

/* =================== POWIADOMIENIA SYSTEMOWE =================== */
J.notify = (title, body) => {
  try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(title, { body, icon: 'assets/icon.svg' }); } catch (e) { }
};
J.on('tasks', () => { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { } });

/* =================== MATRIX (easter egg) =================== */
J.matrix = () => {
  if ($('#matrix')) return;
  const cv = h('canvas', { id: 'matrix' }); document.body.appendChild(cv);
  const c = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const cols = Math.floor(cv.width / 16), drops = Array(cols).fill(0).map(() => Math.random() * -50);
  const chars = 'アカサタナハマヤラワ0123456789JARVIS<>{}[]#$%'.split('');
  let run = true;
  const stop = () => { run = false; cv.remove(); removeEventListener('keydown', stop); };
  cv.onclick = stop; addEventListener('keydown', stop);
  const acc = S.accent;
  const f = () => {
    if (!run) return;
    c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, 0, cv.width, cv.height);
    c.font = '15px JetBrains Mono, monospace';
    drops.forEach((y, i) => {
      c.fillStyle = Math.random() > .97 ? '#fff' : acc;
      c.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, y * 16);
      drops[i] = y * 16 > cv.height && Math.random() > .975 ? 0 : y + 1;
    });
    requestAnimationFrame(f);
  };
  f(); J.sfx.boot();
};

/* =================== PANEL CZATU (prawy dół; zwinięty = chip) =================== */
J.chatPanel = (() => {
  const panel = $('#chatPanel'), host = $('#chatHost'), narrow = matchMedia('(max-width:900px)');
  const ctx = { el: panel, body: host, onClose() { }, setTitle() { }, close() { } };
  J.apps.chat.mount(host, ctx);
  const set = on => {
    if (on && narrow.matches) J.proc.close();
    panel.classList.toggle('open', on); $('#workspace').classList.toggle('chat-closed', !on); $('#btnChat').classList.toggle('on', on);
    if (!narrow.matches) { J.state.ui.chatClosed = !on; J.save(); }
    J.emit('wm');
  };
  const focusInput = () => setTimeout(() => $('#chatInput', host)?.focus(), 30);
  const api = {
    show(arg) { set(true); focusInput(); if (arg) J.brain.handle(arg); },
    hide() { set(false); },
    toggle() { set(!api.isOpen); if (api.isOpen) focusInput(); },
    get isOpen() { return panel.classList.contains('open'); }
  };
  $('#chatChip').onclick = () => api.show();
  $('#chatChipIc').innerHTML = icon('chat');
  set(narrow.matches ? false : !J.state.ui.chatClosed);
  return api;
})();

/* chipy i ikony stanu: kropka = realny status Hermesa / trwającego zadania */
const syncStatus = () => {
  const st = !J.aiReady() ? 'local' : J.hermes.status, busy = !!J.engine.taskId;
  ['chatChipDot', 'railChatDot'].forEach(id => { const e = $('#' + id); if (e) { e.dataset.s = st; e.classList.toggle('run', busy); } });
  $('#chatChip')?.classList.toggle('run', busy);
  const net = $('#btnNet'); if (net) net.dataset.s = !navigator.onLine ? 'off' : (J.aiReady() && J.hermes.status === 'down') ? 'warn' : 'ok';
};
J.on('hermes', syncStatus); J.on('settings', syncStatus);
['task.created', 'task.completed', 'task.failed', 'task.cancelled'].forEach(t => J.ev.on(t, syncStatus));

/* =================== WYNIK ZADANIA (chip przy Core) + STOP =================== */
{
  const chip = $('#resultChip'), stop = $('#taskStop'); let chipT;
  const pl = J.pl;
  const fmtD = ms => ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(1) + ' s';
  stop.onclick = () => J.brain.abort();
  J.ev.on('task.created', e => { if (e.payload.replay) return; stop.classList.remove('hidden'); chip.classList.remove('show'); clearTimeout(chipT); });
  ['task.completed', 'task.failed', 'task.cancelled'].forEach(t => J.ev.on(t, e => {
    if (e.payload.replay) return;
    stop.classList.add('hidden');
    const l = J.engine.last; if (!l || (l.status === 'completed' && l.tools < 2 && l.nodes < 2)) return;   // proste polecenia i zwykłe odpowiedzi nie tworzą karty wyniku
    const ok = l.status === 'completed';
    chip.dataset.s = l.status;
    chip.innerHTML = `<b>${ok ? 'Zadanie zakończone' : l.status === 'failed' ? 'Zadanie nie powiodło się' : 'Zadanie przerwane'}</b><span>${l.tools} ${pl(l.tools, 'wywołanie', 'wywołania', 'wywołań')} narzędzi · ${l.nodes} ${pl(l.nodes, 'źródło', 'źródła', 'źródeł')} · ${fmtD(l.dur)}</span><div class="rc-act"></div>`;
    const act = $('.rc-act', chip);
    if (ok && l.result) { const b = h('button', { class: 'btn sm primary' }, icon('pin', 'width="12" height="12"') + ' Przypnij wynik'); b.onclick = () => { J.widgets.create('result', { title: l.title.slice(0, 40), content: l.result, meta: 'Zadanie · ' + fmtD(l.dur) }); chip.classList.remove('show'); }; act.appendChild(b); }
    const lg = h('button', { class: 'btn sm ghost' }, 'Process Log'); lg.onclick = () => J.proc.open(); act.appendChild(lg);
    setTimeout(() => chip.classList.add('show'), 700);   // wynik „wyłania się” po pulsie Core
    clearTimeout(chipT); chipT = setTimeout(() => chip.classList.remove('show'), 12000);
  }));
}

/* =================== START =================== */
// kontenery z overflow:hidden potrafią się „przewinąć” przy fokusie — trzymamy je w miejscu
['#app', '#desktop'].forEach(sel => { const el = $(sel); el.addEventListener('scroll', () => { if (el.scrollTop || el.scrollLeft) el.scrollTop = el.scrollLeft = 0; }); });
J.proc.init(); J.hud.init(); renderIcons(); renderDock(); syncStatus();
clock(); setInterval(clock, 1000);
setInterval(nodes, 1500);
setInterval(() => J.tasks.check(), 15e3);
loadWeather(); setInterval(loadWeather, 15 * 60e3);
J.on('action', nodes); J.on('tasks', nodes);
addEventListener('online', () => { nodes(); J.toast('Połączenie przywrócone'); });
addEventListener('offline', () => { nodes(); J.toast('Utracono połączenie z internetem'); J.log('Sieć', 'Tryb offline — działają funkcje lokalne.', 'warn'); });

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });

boot().then(() => {
  J.widgets.restore();
  J.hermesPing();
  J.tasks.check();
  const hr = new Date().getHours();
  const greet = (hr < 5 ? 'Dobranoc' : hr < 12 ? 'Dzień dobry' : hr < 18 ? 'Witaj' : 'Dobry wieczór');
  const pending = J.tasks.today().filter(t => !t.done && t.time >= J.hhmm());
  const msg = `${greet}. Wszystkie systemy online.` + (pending.length ? ` Następne zadanie: ${pending[0].text} o ${pending[0].time}.` : '');
  J.orb.set('idle', msg);
  setTimeout(() => J.voice.speak(msg), 700);
  let seen = '1'; try { seen = localStorage.getItem('jarvis-os:seen'); localStorage.setItem('jarvis-os:seen', '1'); } catch (e) { }
  if (!seen) {
    setTimeout(() => J.toast('Wskazówka: kliknij orb, aby mówić · Ctrl+K otwiera paletę poleceń', 6000), 1800);
  }
});
})();
