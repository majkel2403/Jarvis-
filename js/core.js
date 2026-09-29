/* =========================================================
   JARVIS OS — rdzeń: narzędzia, stan, dźwięk, głos, okna
   ========================================================= */
'use strict';
const J = window.J = {};

/* ---------- narzędzia ---------- */
J.$ = (sel, root = document) => root.querySelector(sel);
J.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
J.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
J.h = (tag, attrs = {}, html = '') => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  if (html) e.innerHTML = html;
  return e;
};
J.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
J.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
J.pad = n => String(n).padStart(2, '0');
J.hhmm = (d = new Date()) => J.pad(d.getHours()) + ':' + J.pad(d.getMinutes());
J.today = () => { const d = new Date(); return d.getFullYear() + '-' + J.pad(d.getMonth() + 1) + '-' + J.pad(d.getDate()); };
J.fmtMoney = v => v >= 1000 ? '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 1 ? '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$' + v.toPrecision(4);
J.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
J.rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); };

/* ---------- ikony (SVG, obrys) ---------- */
const P = {
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>',
  notes: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  market: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/><path d="M16 7h4v4"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h2M14 14h2M8 18h2"/>',
  monitor: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  terminal: '<path d="m4 17 6-5-6-5M12 19h8"/>',
  weather: '<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 1 0 6 16.4"/><path d="M8 19h9.5"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4M12 2v3"/>',
  settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  apps: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  focus: '<circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>',
  sound: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  min: '<path d="M5 12h14"/>',
  max: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  pin: '<path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'
};
J.icon = (name, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${P[name] || P.star}</svg>`;

/* ---------- stan (localStorage) ---------- */
const KEY = 'jarvis-os:v2';
const DEFAULTS = () => ({
  settings: {
    accent: '#21d9ff', accent2: '#9a63ff', wall: 'photo', particles: true, sound: true,
    speech: true, voiceName: '',
    hermesOn: true, hermesProvider: 'agent', hermesUrl: 'http://localhost:8642/v1', hermesKey: '', hermesModel: 'hermes-agent', city: 'Wrocław', lat: 51.1079, lon: 17.0385,
    user: 'JD', skipBoot: false
  },
  notes: [
    { id: J.uid(), title: 'Projekty Jarvis OS', body: '• Wirtualne środowisko użytkownika\n• Jarvis steruje pulpitem i aplikacjami\n• Tworzenie skrótów z poleceń\n• Widgety jako żywe obiekty\n• Orb = wizualny stan systemu', ts: Date.now() }
  ],
  tasks: [
    { id: J.uid(), date: J.today(), time: '09:00', text: 'Spotkanie zespołu', done: false, fired: false },
    { id: J.uid(), date: J.today(), time: '11:30', text: 'Analiza rynku', done: false, fired: false },
    { id: J.uid(), date: J.today(), time: '14:00', text: 'Budowa Jarvis OS', done: false, fired: false },
    { id: J.uid(), date: J.today(), time: '16:00', text: 'Testy środowiska', done: false, fired: false }
  ],
  shortcuts: [],
  log: [],
  history: [],
  winPos: {},
  stats: { actions: 0 }
});
J.state = (() => {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* brak dostępu do storage */ }
  const d = DEFAULTS();
  if (!s) return d;
  s.settings = Object.assign(d.settings, s.settings || {});
  delete s.settings.apiKey; delete s.settings.model; // stara konfiguracja (przed Hermesem)
  for (const k of ['notes', 'tasks', 'shortcuts', 'log', 'history']) if (!Array.isArray(s[k])) s[k] = d[k];
  s.winPos = s.winPos || {}; s.stats = s.stats || { actions: 0 };
  return s;
})();
J.save = J.debounce(() => { try { localStorage.setItem(KEY, JSON.stringify(J.state)); } catch (e) { /* tryb prywatny */ } }, 250);
J.resetAll = () => { try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); };

/* ---------- zdarzenia ---------- */
const bus = {};
J.on = (ev, fn) => { (bus[ev] = bus[ev] || []).push(fn); return () => { bus[ev] = bus[ev].filter(f => f !== fn); }; };
J.emit = (ev, data) => (bus[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });

/* ---------- dźwięk (Web Audio, syntezowany) ---------- */
J.sfx = (() => {
  let ctx = null;
  const ac = () => { if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) ctx = new A(); } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
  const tone = (f, dur = .12, type = 'sine', vol = .06, delay = 0, slide = 0) => {
    if (!J.state.settings.sound) return; const c = ac(); if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05);
  };
  return {
    unlock: ac,
    click: () => tone(1800, .04, 'sine', .025),
    open: () => { tone(520, .12, 'sine', .045, 0, 880); tone(1320, .08, 'triangle', .02, .06); },
    close: () => tone(700, .12, 'sine', .04, 0, 320),
    notify: () => { tone(880, .12, 'sine', .05); tone(1320, .18, 'sine', .05, .1); },
    alarm: () => { for (let i = 0; i < 6; i++) { tone(1046, .12, 'square', .03, i * .25); tone(1318, .12, 'square', .03, i * .25 + .12); } },
    error: () => { tone(220, .18, 'sawtooth', .04); tone(160, .25, 'sawtooth', .04, .12); },
    listen: () => { tone(660, .08, 'sine', .05); tone(990, .1, 'sine', .05, .08); },
    boot: () => {
      tone(55, 1.6, 'sine', .12, 0, 110); tone(110, 1.4, 'triangle', .04, .1, 220);
      [523, 659, 784, 1046].forEach((f, i) => tone(f, .5, 'sine', .035, .5 + i * .12));
    },
    type: () => tone(2400 + Math.random() * 600, .015, 'square', .008)
  };
})();

/* ---------- głos: synteza mowy ---------- */
J.voice = (() => {
  const synth = window.speechSynthesis;
  let voices = [];
  const load = () => { voices = synth ? synth.getVoices() : []; };
  if (synth) { load(); synth.onvoiceschanged = load; }
  const pick = () => {
    const want = J.state.settings.voiceName;
    return voices.find(v => v.name === want) || voices.find(v => /pl/i.test(v.lang) && /google|natural|online/i.test(v.name)) || voices.find(v => /^pl/i.test(v.lang)) || null;
  };
  return {
    supported: !!synth,
    list: () => voices.filter(v => /^pl/i.test(v.lang)).concat(voices.filter(v => !/^pl/i.test(v.lang))),
    speaking: false,
    speak(text) {
      if (!synth || !J.state.settings.speech || !text) return;
      const clean = String(text).replace(/[*_`#>]/g, '').replace(/https?:\/\/\S+/g, 'link').slice(0, 600);
      synth.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      const v = pick(); if (v) u.voice = v;
      u.lang = v ? v.lang : 'pl-PL'; u.rate = 1.04; u.pitch = .92;
      u.onstart = () => { this.speaking = true; J.orb.set('speaking'); };
      u.onend = u.onerror = () => { this.speaking = false; J.orb.set('idle'); };
      synth.speak(u);
    },
    stop() { if (synth) synth.cancel(); this.speaking = false; }
  };
})();

/* ---------- głos: rozpoznawanie mowy ---------- */
J.ear = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, active = false, stream = null;
  const api = { supported: !!SR, active: false, analyser: null };
  const startAnalyser = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const c = J.sfx.unlock(); if (!c) return;
      const src = c.createMediaStreamSource(stream);
      const an = c.createAnalyser(); an.fftSize = 256; src.connect(an); api.analyser = an;
    } catch (e) { /* brak zgody — orb pokaże animację zastępczą */ }
  };
  const stopAnalyser = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; api.analyser = null; };
  api.stop = () => { if (rec) try { rec.stop(); } catch (e) { } };
  api.toggle = () => active ? api.stop() : api.start();
  api.start = () => {
    if (!SR) { J.toast('Twoja przeglądarka nie obsługuje rozpoznawania mowy — użyj Chrome lub Edge'); J.sfx.error(); return; }
    if (active) return;
    J.voice.stop();
    rec = new SR(); rec.lang = 'pl-PL'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let finalText = '';
    rec.onstart = () => { active = api.active = true; J.sfx.listen(); J.orb.set('listening', 'słucham…'); J.emit('ear', true); startAnalyser(); };
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      J.orb.banner('„' + (finalText + interim).trim() + '”');
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') J.toast('Brak dostępu do mikrofonu — zezwól w ustawieniach przeglądarki');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') J.toast('Błąd rozpoznawania mowy: ' + e.error);
    };
    rec.onend = () => {
      active = api.active = false; stopAnalyser(); J.emit('ear', false);
      const t = finalText.trim();
      if (t) J.emit('voice-command', t); else { J.orb.set('idle'); J.orb.banner(null); }
    };
    try { rec.start(); } catch (e) { J.toast('Nie udało się uruchomić mikrofonu'); }
  };
  return api;
})();

/* ---------- toasty ---------- */
J.toast = (text, ms = 2600) => {
  const box = J.$('#toasts'); if (!box) return;
  const t = J.h('div', { class: 'toast' }, '<i></i><span></span>');
  t.querySelector('span').textContent = text;
  box.appendChild(t);
  while (box.children.length > 4) box.firstElementChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
};

/* ---------- orb / stan asystenta ---------- */
J.orb = (() => {
  let state = 'idle', bannerTimer;
  const labels = { idle: 'centrum środowiska', listening: 'słucham', thinking: 'analizuję', speaking: 'mówię', alert: 'uwaga' };
  return {
    get state() { return state; },
    set(s, bannerText) {
      state = s;
      const w = J.$('#coreWrap'); if (w) w.dataset.state = s;
      const cs = J.$('#coreState'); if (cs) cs.textContent = labels[s] || s;
      if (bannerText !== undefined) this.banner(bannerText);
      if (s === 'idle') { clearTimeout(bannerTimer); bannerTimer = setTimeout(() => this.banner(null), 2600); }
    },
    banner(text) {
      const b = J.$('#task'); if (!b) return;
      clearTimeout(bannerTimer);
      if (!text) { b.classList.remove('show'); return; }
      J.$('#taskText').textContent = text; b.classList.add('show');
    }
  };
})();

/* ---------- akcent kolorystyczny ---------- */
J.applyTheme = () => {
  const s = J.state.settings, r = document.documentElement.style;
  r.setProperty('--accent', s.accent); r.setProperty('--accent-rgb', J.rgb(s.accent));
  r.setProperty('--accent2', s.accent2); r.setProperty('--accent2-rgb', J.rgb(s.accent2));
  const app = J.$('#app'); if (app) app.dataset.wall = s.wall;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', '#050d1a');
};
J.THEMES = {
  cyjan: ['#21d9ff', '#9a63ff'], niebieski: ['#3d8bff', '#21d9ff'], fiolet: ['#b07cff', '#ff5ec4'],
  zielony: ['#39e59a', '#21d9ff'], złoty: ['#ffc24d', '#ff6a3d'], czerwony: ['#ff4d6d', '#ffb84d'], różowy: ['#ff5ec4', '#9a63ff']
};

/* ---------- menedżer okien ---------- */
J.apps = {};           // rejestr aplikacji: id -> {title, icon, w, h, mount(body, ctx)}
J.wm = (() => {
  const open = {};      // id -> {el, cleanups, minimized}
  let z = 30, cascade = 0;
  const desk = () => J.$('#desktop');
  const isMobile = () => innerWidth <= 640;

  const savePos = (id, el) => {
    if (el.classList.contains('max') || isMobile() || id.startsWith('w:')) return;
    J.state.winPos[id] = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; J.save();
  };
  const focus = id => {
    const w = open[id]; if (!w) return;
    w.el.style.zIndex = ++z;
    J.$$('.window.focused').forEach(e => e.classList.remove('focused'));
    w.el.classList.add('focused');
    J.emit('wm');
  };
  const place = (id, el, app) => {
    const d = desk().getBoundingClientRect();
    const p = J.state.winPos[id];
    let w = p?.w || app.w || 380, h = p?.h || app.h || 320, x, y;
    w = Math.min(w, d.width - 20); h = Math.min(h, d.height - 100);
    if (p) { x = p.x; y = p.y; }
    else { x = Math.max(100, d.width / 2 - w / 2 + (cascade % 6 - 2.5) * 34); y = Math.max(12, d.height / 2 - h / 2 - 30 + (cascade % 6 - 2.5) * 26); cascade++; }
    x = J.clamp(x, 0, Math.max(0, d.width - w)); y = J.clamp(y, 0, Math.max(0, d.height - h - 80));
    Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  };
  const drag = (id, el, handle, mode) => {
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.win-actions')) return;
      e.preventDefault(); focus(id);
      const d = desk().getBoundingClientRect();
      if (mode === 'move' && el.classList.contains('max')) {
        const ratio = (e.clientX - d.left) / d.width;
        el.classList.remove('max');
        el.style.left = (e.clientX - d.left - el.offsetWidth * ratio) + 'px'; el.style.top = (e.clientY - d.top - 20) + 'px';
      }
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop, ow = el.offsetWidth, oh = el.offsetHeight;
      handle.setPointerCapture(e.pointerId);
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (mode === 'move') {
          el.style.left = J.clamp(ox + dx, -ow + 120, d.width - 120) + 'px';
          el.style.top = J.clamp(oy + dy, 0, d.height - 60) + 'px';
        } else {
          el.style.width = J.clamp(ow + dx, 280, d.width - ox) + 'px';
          el.style.height = J.clamp(oh + dy, 180, d.height - oy) + 'px';
        }
      };
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); savePos(id, el); J.emit('wm-resize', id); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    });
  };

  const api = {
    open(id, arg) {
      if (id === 'chat') { J.chatPanel?.show(arg); return true; }   // czat = stały lewy panel
      const app = J.apps[id]; if (!app) return false;
      if (open[id]) {
        const w = open[id];
        if (w.minimized) { w.minimized = false; w.el.classList.remove('hidden', 'minimizing'); }
        focus(id); if (app.onArg && arg !== undefined) app.onArg(arg, w.ctx);
        return true;
      }
      const el = J.h('div', { class: 'window', 'data-app': id, role: 'dialog', 'aria-label': app.title });
      el.innerHTML = `<div class="win-head"><span class="wico">${J.icon(app.icon)}</span><b></b>
        <div class="win-actions"><button class="mn" title="Minimalizuj">${J.icon('min')}</button><button class="mx" title="Maksymalizuj">${J.icon('max')}</button><button class="x" title="Zamknij">${J.icon('close')}</button></div></div>
        <div class="win-body ${app.flush ? 'flush' : ''}"></div><div class="resize"></div>`;
      el.querySelector('b').textContent = app.title;
      desk().appendChild(el); place(id, el, app);
      const cleanups = [];
      const ctx = {
        el, body: el.querySelector('.win-body'),
        onClose: fn => cleanups.push(fn),
        setTitle: t => { el.querySelector('.win-head b').textContent = t; },
        close: () => api.close(id)
      };
      open[id] = { el, cleanups, minimized: false, ctx };
      const head = el.querySelector('.win-head');
      drag(id, el, head, 'move'); drag(id, el, el.querySelector('.resize'), 'resize');
      head.addEventListener('dblclick', e => { if (!e.target.closest('.win-actions')) api.toggleMax(id); });
      el.querySelector('.mn').onclick = () => api.minimize(id);
      el.querySelector('.mx').onclick = () => api.toggleMax(id);
      el.querySelector('.x').onclick = () => api.close(id);
      el.addEventListener('pointerdown', () => focus(id), true);
      try { app.mount(ctx.body, ctx, arg); } catch (e) { console.error(e); ctx.body.innerHTML = '<div class="empty">Błąd aplikacji: ' + J.esc(e.message) + '</div>'; }
      focus(id); J.sfx.open();
      J.log('Uruchomiono: ' + app.title, 'Okno aplikacji otwarte na pulpicie.', 'info');
      J.emit('wm');
      return true;
    },
    close(id) {
      if (id === 'chat') { J.chatPanel?.hide(); return; }
      const w = open[id]; if (!w) return;
      savePos(id, w.el);
      w.cleanups.forEach(fn => { try { fn(); } catch (e) { } });
      delete open[id];
      w.el.classList.add('closing'); J.sfx.close();
      setTimeout(() => w.el.remove(), 220);
      J.emit('wm');
    },
    closeAll() { Object.keys(open).forEach(api.close); },
    minimize(id) {
      const w = open[id]; if (!w) return;
      w.minimized = true; w.el.classList.add('minimizing'); w.el.classList.remove('focused');
      setTimeout(() => { if (w.minimized) w.el.classList.add('hidden'); }, 290);
      J.emit('wm');
    },
    minimizeAll() { Object.keys(open).forEach(api.minimize); },
    toggleMax(id) { const w = open[id]; if (w) { w.el.classList.toggle('max'); J.emit('wm-resize', id); } },
    toggle(id) {
      if (id === 'chat') { J.chatPanel?.toggle(); return true; }
      const w = open[id];
      if (!w) return api.open(id);
      if (w.minimized) return api.open(id);
      if (w.el.classList.contains('focused')) return api.minimize(id);
      focus(id);
    },
    isOpen: id => id === 'chat' || !!open[id],
    isMin: id => !!open[id]?.minimized,
    isFocused: id => !!open[id]?.el.classList.contains('focused'),
    ctx: id => open[id]?.ctx,
    count: () => Object.keys(open).length,
    list: () => Object.keys(open),
    closeTop() {
      const ids = Object.keys(open).filter(i => !open[i].minimized);
      if (!ids.length) return false;
      ids.sort((a, b) => (+open[b].el.style.zIndex) - (+open[a].el.style.zIndex));
      api.close(ids[0]); return true;
    }
  };
  return api;
})();

/* ---------- licznik akcji (tool calls) ---------- */
J.action = (label) => {
  J.state.stats.actions = (J.state.stats.actions || 0) + 1; J.save();
  J.emit('action', label);
};
