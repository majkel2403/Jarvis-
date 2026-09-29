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
    const n = Math.min(120, Math.round(W * H / 15000));
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
          if (d < 115) { c.strokeStyle = `rgba(${rgb},${(1 - d / 115) * .22})`; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
        }
        const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (dm < 170) { c.strokeStyle = `rgba(${rgb},${(1 - dm / 170) * .45})`; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(mouse.x, mouse.y); c.stroke(); }
        c.fillStyle = `rgba(${rgb},.75)`; c.beginPath(); c.arc(a.x, a.y, a.r, 0, 7); c.fill();
      }
    }
    orbDraw(now); flowDraw(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return { resize };
})();

/* =================== ORB: fala dźwiękowa wokół rdzenia =================== */
const orbCv = $('#orbCanvas'), oc = orbCv.getContext('2d');
let orbAmp = 0, freq = new Uint8Array(128);
function orbDraw(t) {
  const size = 460, dpr = Math.min(devicePixelRatio || 1, 2);
  if (orbCv.width !== size * dpr) { orbCv.width = orbCv.height = size * dpr; oc.setTransform(dpr, 0, 0, dpr, 0, 0); }
  oc.clearRect(0, 0, size, size);
  const st = J.orb.state, wrap = $('#coreWrap');
  const eg = J.engine;
  const col = eg.rgb() || getComputedStyle(wrap).getPropertyValue('--accent-rgb').trim() || '33,217,255';
  let target = st === 'speaking' ? .55 + Math.random() * .45 : st === 'listening' ? .25 : st === 'thinking' ? .35 : st === 'alert' ? .6 : .08;
  if (st !== 'speaking' && st !== 'listening') target = Math.max(target, eg.activity * .8);
  const breath = st === 'idle' && eg.mode === 'IDLE' ? .72 + .28 * Math.sin(t / 1600) : 1;   // powolny oddech: 72%→100% jasności
  const an = J.ear.analyser;
  if (st === 'listening' && an) { an.getByteFrequencyData(freq); target = Math.min(1, freq.slice(2, 40).reduce((a, b) => a + b, 0) / 38 / 110); }
  orbAmp += (target - orbAmp) * .12;
  const cx = size / 2, cy = size / 2, R = 122, N = 140;
  for (let ring = 0; ring < 2; ring++) {
    oc.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2;
      let k;
      if (st === 'listening' && an) k = (freq[(i % 70) + 2] / 255) * 28 * (ring ? .6 : 1);
      else k = (Math.sin(a * 6 + t / (ring ? 420 : 300)) * .5 + Math.sin(a * 11 - t / 260) * .35 + Math.sin(a * 3 + t / 900) * .4) * orbAmp * 26 * (ring ? .7 : 1);
      const r = R + ring * 9 + k;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? oc.lineTo(x, y) : oc.moveTo(x, y);
    }
    oc.closePath();
    oc.strokeStyle = `rgba(${col},${(ring ? .25 : .55 + orbAmp * .4) * breath})`; oc.lineWidth = ring ? 1 : 1.6;
    oc.shadowColor = `rgba(${col},.9)`; oc.shadowBlur = 12; oc.stroke(); oc.shadowBlur = 0;
  }
  if (st === 'thinking') {
    for (let k = 0; k < 3; k++) {
      const a0 = t / (300 + k * 140) * (k % 2 ? -1 : 1) + k * 2;
      oc.beginPath(); oc.arc(cx, cy, 150 + k * 10, a0, a0 + .9); oc.strokeStyle = `rgba(${col},${.7 - k * .18})`; oc.lineWidth = 2; oc.stroke();
    }
  }
  // wskaźniki tiku jak w HUD
  oc.save(); oc.translate(cx, cy); oc.rotate(t / 9000);
  for (let i = 0; i < 72; i++) { oc.rotate(Math.PI * 2 / 72); oc.fillStyle = `rgba(${col},${i % 6 ? .12 : .4})`; oc.fillRect(176, -.5, i % 6 ? 5 : 10, 1); }
  oc.restore();
}

/* =================== VISUAL ENGINE: węzły, przepływ danych, puls zakończenia =================== */
const flowCv = $('#flowCanvas'), fc = flowCv.getContext('2d');
const SLOT = { model: -90, internet: -40, files: 12, agent: 52, notes: 205, calendar: 160, desktop: -140, memory: 128, calc: 232, tool: 100 };
const easeOut = x => 1 - Math.pow(1 - x, 3);
function flowDraw(now) {
  const box = flowCv.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  const W = Math.round(box.width), H = Math.round(box.height);
  if (flowCv.width !== W * dpr || flowCv.height !== H * dpr) { flowCv.width = W * dpr; flowCv.height = H * dpr; }
  fc.setTransform(dpr, 0, 0, dpr, 0, 0); fc.clearRect(0, 0, W, H);
  const eg = J.engine; flowCv.classList.toggle('over', !!eg.taskId);   // podczas pracy węzły są widoczne nad oknami
  const wall = Date.now(), cx = W / 2, cy = H / 2;
  const acc = J.rgb(S.accent), col = eg.rgb() || acc;
  const rx = Math.min(W * .3, 270), ry = Math.min(H * .34, 235);
  // Core: puls zakończenia (biały → szmaragdowy / bursztynowy) — tylko po realnym task.*
  const ft = wall - eg.flash.t;
  if (eg.flash.t && ft < 1500) {
    const k = ft / 1500, c = eg.flash.kind === 'ok' ? '57,229,154' : eg.flash.kind === 'err' ? '255,184,77' : '160,190,220';
    fc.lineWidth = 2.2 * (1 - k) + .6; fc.strokeStyle = `rgba(${ft < 180 ? '255,255,255' : c},${(1 - k) * .9})`;
    fc.beginPath(); fc.arc(cx, cy, 128 + easeOut(k) * 150, 0, 7); fc.stroke();
  }
  const list = Object.values(eg.nodes);
  const pos = {};
  list.forEach(n => {
    const a = (SLOT[n.id] ?? 100) * Math.PI / 180;
    pos[n.id] = { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
  // usuwanie wygaszonych węzłów po zakończeniu zadania
  for (const n of list) if (n.status !== 'active' && n.doneAt && wall - n.doneAt > (eg.taskId ? 60000 : 4200)) delete eg.nodes[n.id];
  for (const n of list) {
    const p = pos[n.id], sp = easeOut(Math.min(1, (wall - n.spawn) / 650));
    let alpha = sp; if (n.status !== 'active' && !eg.taskId) alpha *= 1 - Math.max(0, Math.min(1, (wall - n.doneAt - 2600) / 1500));
    if (alpha <= .01) continue;
    const ncol = n.status === 'failed' ? '255,184,77' : n.status === 'done' ? '57,229,154' : (n.id === 'model' ? J.rgb(S.accent2) : acc);
    const px = cx + (p.x - cx) * sp, py = cy + (p.y - cy) * sp;
    // łącze Core → węzeł
    fc.lineWidth = 1; fc.strokeStyle = `rgba(${ncol},${alpha * (n.status === 'active' ? .42 : .16)})`;
    fc.beginPath(); fc.moveTo(cx, cy); fc.lineTo(px, py); fc.stroke();
    // cząstki płyną tylko dopóki węzeł faktycznie pracuje
    if (n.status === 'active') {
      const cnt = 5;
      for (let i = 0; i < cnt; i++) {
        const u = ((now / 1100) + i / cnt + (n.id.length % 5) * .13) % 1;
        fc.fillStyle = `rgba(${ncol},${alpha * (.35 + .5 * Math.sin(u * Math.PI))})`;
        fc.beginPath(); fc.arc(cx + (px - cx) * (.18 + u * .78), cy + (py - cy) * (.18 + u * .78), 1.6, 0, 7); fc.fill();
      }
    }
    // korpus węzła
    const pulse = n.status === 'active' ? 1 + .18 * Math.sin(now / 240) : 1;
    fc.shadowColor = `rgba(${ncol},.9)`; fc.shadowBlur = n.status === 'active' ? 16 : 7;
    fc.fillStyle = `rgba(${ncol},${alpha})`; fc.beginPath(); fc.arc(px, py, 6 * pulse, 0, 7); fc.fill(); fc.shadowBlur = 0;
    fc.strokeStyle = `rgba(${ncol},${alpha * .55})`; fc.lineWidth = 1; fc.beginPath(); fc.arc(px, py, 12 * pulse, 0, 7); fc.stroke();
    fc.font = '600 10px Inter, system-ui, sans-serif'; fc.textAlign = 'center';
    fc.fillStyle = `rgba(226,240,255,${alpha * .92})`; fc.fillText(n.label + (n.calls > 1 ? ' ×' + n.calls : ''), px, py + 27);
    if (n.lastTool && n.id !== 'model') { fc.font = '9px JetBrains Mono, monospace'; fc.fillStyle = `rgba(150,175,200,${alpha * .8})`; fc.fillText(n.lastTool.slice(0, 22), px, py + 39); }
  }
  // pakiety danych: Core → węzeł (start) i węzeł → Core (wynik)
  eg.packets = eg.packets.filter(k => wall - k.t0 < 900);
  for (const k of eg.packets) {
    const p = pos[k.node]; if (!p) continue;
    const u = easeOut((wall - k.t0) / 900), f = k.dir === 'out' ? u : 1 - u;
    const x = cx + (p.x - cx) * (.18 + f * .8), y = cy + (p.y - cy) * (.18 + f * .8);
    fc.shadowColor = `rgba(${col},1)`; fc.shadowBlur = 12; fc.fillStyle = `rgba(255,255,255,${1 - u * .6})`;
    fc.beginPath(); fc.arc(x, y, k.dir === 'in' ? 3.2 : 2.4, 0, 7); fc.fill(); fc.shadowBlur = 0;
  }
}

/* =================== ZEGAR / POGODA / WĘZŁY =================== */
const clock = () => {
  const d = new Date();
  $('#clockBig').textContent = d.toLocaleTimeString('pl-PL');
  $('#dateLine').textContent = d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const sysWeather = d => {
  const [ico] = J.wxInfo(d.current.weather_code);
  $('#wxIco').textContent = ico; $('#wxTemp').textContent = Math.round(d.current.temperature_2m) + '°C'; $('#wxCity').textContent = d.city;
};
J.on('weather', sysWeather);
const loadWeather = () => J.weather.fetch().catch(() => { $('#wxTemp').textContent = 'offline'; });

const nodes = () => {
  const set = (id, v) => { const e = $('#' + id); if (e) e.textContent = v; };
  const bar = (id, p) => { const e = $('#' + id); if (e) e.style.setProperty('--w', J.clamp(p, 3, 100) + '%'); };
  const ai = J.aiReady();
  set('nModel', ai ? 'HERMES' : 'LOKAL'); set('nModelS', ai ? S.hermesModel + ' · ' + (J.HERMES_PRESETS[S.hermesProvider]?.label.split(' (')[0] || 'Hermes') : 'Silnik poleceń offline'); bar('bModel', ai ? 92 : 45);
  const a = J.state.stats.actions || 0; set('nTools', a); bar('bTools', Math.min(100, a * 4));
  set('nFps', J.fps || 60); bar('bFps', (J.fps || 60) / 60 * 100); set('nSysS', 'FPS · ' + (J.fps >= 45 ? 'płynnie' : 'obciążenie'));
  const t = J.tasks.today(), done = t.filter(x => x.done).length; set('nTasks', done + '/' + t.length); bar('bTasks', t.length ? done / t.length * 100 : 0);
  set('nWins', J.wm.count() + ' · ' + J.state.shortcuts.length); bar('bWins', J.wm.count() * 18 + 10);
  const on = navigator.onLine; set('nNet', on ? 'ON' : 'OFF'); set('nNetS', on ? (navigator.connection?.effectiveType ? 'Łącze ' + navigator.connection.effectiveType.toUpperCase() : 'Połączenie aktywne') : 'Brak połączenia'); bar('bNet', on ? 85 : 3);
};

/* =================== PULPIT: ikony i dok =================== */
const BUILTIN = [['notes', 'Notatnik'], ['market', 'Tokeny'], ['schedule', 'Harmonogram'], ['monitor', 'Wynik'], ['weather', 'Pogoda']];
const renderIcons = () => {
  const rail = $('#iconRail'); rail.innerHTML = '';
  BUILTIN.forEach(([id, name], i) => {
    const b = h('button', { class: 'desktop-icon', 'data-app': id, style: `animation-delay:${i * .05}s` }, `<span class="ico">${icon(J.apps[id].icon)}</span><span class="lbl">${esc(name)}</span>`);
    b.onclick = () => J.wm.open(id); rail.appendChild(b);
  });
  J.state.shortcuts.forEach((s, i) => {
    const b = h('button', { class: 'desktop-icon', 'data-sc': s.id, style: `animation-delay:${(i + 5) * .05}s`, title: s.url || '' }, `<span class="ico">${icon(s.icon || 'star')}</span><span class="lbl"></span>`);
    b.querySelector('.lbl').textContent = s.name;
    b.onclick = () => J.shortcuts.run(s); rail.appendChild(b);
  });
  const add = h('button', { class: 'desktop-icon' }, `<span class="ico">${icon('plus')}</span><span class="lbl">Widget</span>`);
  add.onclick = e => { const r = add.getBoundingClientRect(); widgetMenu(r.right + 6, r.top); }; rail.appendChild(add);
};
J.on('shortcuts', renderIcons);

const PINNED = ['notes', 'market', 'schedule', 'weather', 'terminal', 'monitor'];
const LABEL = { chat: 'Czat', notes: 'Notatnik', market: 'Tokeny', schedule: 'Plan', weather: 'Pogoda', terminal: 'Terminal', monitor: 'Wynik', calc: 'Kalkulator', timer: 'Minutnik', settings: 'Ustawienia', library: 'Menu' };
const renderDock = () => {
  const d = $('#dock'); d.innerHTML = '';
  const btn = id => {
    const b = h('button', { 'data-app': id, title: J.apps[id].title }, `${icon(J.apps[id].icon)}<span>${LABEL[id] || J.apps[id].title}</span>`);
    b.onclick = () => J.wm.toggle(id);
    b.classList.toggle('running', J.wm.isOpen(id)); b.classList.toggle('focused', J.wm.isFocused(id) && !J.wm.isMin(id));
    return b;
  };
  const chatBtn = h('button', { title: 'Czat z Jarvisem' }, `${icon('chat')}<span>Czat</span>`); chatBtn.onclick = () => J.chatPanel.toggle(); chatBtn.classList.add('only-narrow-flex');
  d.appendChild(btn('library')); d.appendChild(chatBtn); d.appendChild(h('span', { class: 'sep' }));
  PINNED.forEach(id => d.appendChild(btn(id)));
  const extra = J.wm.list().filter(id => !PINNED.includes(id) && id !== 'library' && id !== 'settings');
  if (extra.length) { d.appendChild(h('span', { class: 'sep' })); extra.forEach(id => d.appendChild(btn(id))); }
  d.appendChild(h('span', { class: 'sep' }));
  const w = h('button', { title: 'Nowy widget na pulpicie' }, `${icon('plus')}<span>Widget</span>`); w.onclick = () => { const r = w.getBoundingClientRect(); widgetMenu(r.left, r.top - 130); }; d.appendChild(w);
  d.appendChild(btn('settings'));
};
J.on('wm', () => { renderDock(); nodes(); });

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
    { g: 'Akcje', ic: 'spark', t: 'Pokaż / ukryj panel rdzenia', run: () => togglePin() },
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
  if (e.target.closest('#core')) return togglePin();
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

/* =================== RDZEŃ: kliknięcie, panel węzłów =================== */
let pinned = false, hoverT;
const wrap = $('#coreWrap');
const togglePin = () => { pinned = !pinned; wrap.classList.toggle('active', pinned); nodes(); J.sfx.click(); };
$('#core').addEventListener('click', e => {
  if (e.shiftKey) return togglePin();
  if (J.ear.supported) J.ear.toggle(); else J.wm.open('chat');
});
$('#core').addEventListener('mouseenter', () => { clearTimeout(hoverT); nodes(); wrap.classList.add('active'); });
$('#core').addEventListener('mouseleave', () => { hoverT = setTimeout(() => { if (!pinned && J.orb.state === 'idle') wrap.classList.remove('active'); }, 900); });
J.on('ear', on => { $('#btnVoice').classList.toggle('rec', on); if (on) wrap.classList.add('active'); else if (!pinned) setTimeout(() => J.orb.state === 'idle' && !pinned && wrap.classList.remove('active'), 1500); });
if (!J.ear.supported) $('#coreHint').textContent = 'kliknij, aby porozmawiać · Shift+klik: panel';
J.on('voice-command', t => J.brain.handle(t, { voice: true }));

/* =================== PASEK GÓRNY =================== */
$('#btnVoice').innerHTML = icon('mic'); $('#btnFocus').innerHTML = icon('focus');
$('#btnLog').insertAdjacentHTML('afterbegin', icon('history'));
const soundIcon = () => { $('#btnSound').innerHTML = icon(S.sound ? 'sound' : 'mute'); $('#btnSound').classList.toggle('on', S.sound); };
soundIcon(); J.on('settings', () => { J.hermesPing(); soundIcon(); $('#btnAvatar').textContent = S.user; nodes(); });
$('#btnAvatar').textContent = S.user;
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

/* =================== PANEL CZATU (lewa kolumna) =================== */
J.chatPanel = (() => {
  const panel = $('#chatPanel'), host = $('#chatHost'), narrow = matchMedia('(max-width:900px)');
  const ctx = { el: panel, body: host, onClose() { }, setTitle() { }, close() { } };
  J.apps.chat.mount(host, ctx);
  const set = on => { if (on && narrow.matches) J.proc.close(); panel.classList.toggle('open', on); $('#workspace').classList.toggle('chat-closed', !on); $('#btnChat').classList.toggle('on', on); if (!narrow.matches) { J.state.ui.chatClosed = !on; J.save(); } };
  const focusInput = () => setTimeout(() => $('#chatInput', host)?.focus(), 30);
  const api = {
    show(arg) { set(true); focusInput(); if (arg) J.brain.handle(arg); },
    hide() { set(false); },
    toggle() { set(!api.isOpen); if (api.isOpen) focusInput(); },
    get isOpen() { return narrow.matches ? panel.classList.contains('open') : !$('#workspace').classList.contains('chat-closed'); }
  };
  narrow.addEventListener('change', () => set(!narrow.matches));
  set(narrow.matches ? false : !J.state.ui.chatClosed);
  $('#edgeL').onclick = () => api.show(); $('#edgeR').onclick = () => J.proc.open();
  return api;
})();

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
J.proc.init(); renderIcons(); renderDock(); nodes();
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
  if (J.state.ui.logPinned && !matchMedia('(max-width:900px)').matches) J.proc.open();
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
