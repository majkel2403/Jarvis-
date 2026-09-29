/* =========================================================
   JARVIS OS — usługi i aplikacje
   ========================================================= */
'use strict';
(() => {
const { $, $$, h, esc, icon } = J;

/* =================== USŁUGI =================== */

/* ---------- bezpieczny kalkulator (parser zejść rekurencyjnych) ---------- */
J.calc = (src) => {
  const s = String(src).toLowerCase().replace(/,/g, '.').replace(/×|x(?=\s*[\d(])/g, '*').replace(/÷|:/g, '/').replace(/\s+/g, '');
  let i = 0;
  const fns = { sqrt: Math.sqrt, pierwiastek: Math.sqrt, sin: x => Math.sin(x * Math.PI / 180), cos: x => Math.cos(x * Math.PI / 180), tan: x => Math.tan(x * Math.PI / 180), log: Math.log10, ln: Math.log, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil };
  const consts = { pi: Math.PI, 'π': Math.PI, e: Math.E };
  const peek = () => s[i];
  const num = () => {
    const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));
    if (m) { i += m[0].length; return parseFloat(m[0]); }
    const w = /^[a-zπ]+/.exec(s.slice(i));
    if (w) {
      i += w[0].length;
      if (w[0] in consts) return consts[w[0]];
      if (w[0] in fns) { if (peek() !== '(') throw new Error('oczekiwano ('); i++; const v = expr(); if (s[i++] !== ')') throw new Error('brak )'); return fns[w[0]](v); }
      throw new Error('nieznane: ' + w[0]);
    }
    if (peek() === '(') { i++; const v = expr(); if (s[i++] !== ')') throw new Error('brak )'); return v; }
    throw new Error('błąd składni');
  };
  const unary = () => { if (peek() === '-') { i++; return -unary(); } if (peek() === '+') { i++; return unary(); } return postfix(); };
  const postfix = () => { let v = num(); while (peek() === '%' || peek() === '!') { const c = s[i++]; if (c === '%') v /= 100; else { let f = 1; for (let k = 2; k <= v; k++) f *= k; v = f; } } return v; };
  const pow = () => { const b = unary(); if (peek() === '^') { i++; return Math.pow(b, pow()); } return b; };
  const term = () => { let v = pow(); while (peek() === '*' || peek() === '/') { const o = s[i++]; const r = pow(); v = o === '*' ? v * r : v / r; } return v; };
  const expr = () => { let v = term(); while (peek() === '+' || peek() === '-') { const o = s[i++]; const r = term(); v = o === '+' ? v + r : v - r; } return v; };
  if (!s) throw new Error('puste wyrażenie');
  const v = expr();
  if (i < s.length) throw new Error('nieoczekiwany znak „' + s[i] + '”');
  if (!isFinite(v)) throw new Error('wynik nieskończony');
  return +v.toPrecision(12);
};

/* ---------- pogoda (Open-Meteo, bez klucza) ---------- */
const WX = {
  0: ['☀️', 'bezchmurnie'], 1: ['🌤️', 'przeważnie słonecznie'], 2: ['⛅', 'częściowe zachmurzenie'], 3: ['☁️', 'pochmurno'],
  45: ['🌫️', 'mgła'], 48: ['🌫️', 'szadź'], 51: ['🌦️', 'lekka mżawka'], 53: ['🌦️', 'mżawka'], 55: ['🌧️', 'gęsta mżawka'],
  56: ['🌧️', 'marznąca mżawka'], 57: ['🌧️', 'marznąca mżawka'], 61: ['🌦️', 'lekki deszcz'], 63: ['🌧️', 'deszcz'], 65: ['🌧️', 'ulewa'],
  66: ['🌧️', 'marznący deszcz'], 67: ['🌧️', 'marznący deszcz'], 71: ['🌨️', 'lekki śnieg'], 73: ['🌨️', 'śnieg'], 75: ['❄️', 'śnieżyca'],
  77: ['🌨️', 'krupa śnieżna'], 80: ['🌦️', 'przelotny deszcz'], 81: ['🌧️', 'przelotne opady'], 82: ['⛈️', 'gwałtowne opady'],
  85: ['🌨️', 'przelotny śnieg'], 86: ['❄️', 'intensywny śnieg'], 95: ['⛈️', 'burza'], 96: ['⛈️', 'burza z gradem'], 99: ['⛈️', 'burza z gradem']
};
J.wxInfo = code => WX[code] || ['🌡️', '—'];
J.weather = {
  data: null, ts: 0,
  async geocode(name) {
    let r; try { r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=pl&name=' + encodeURIComponent(name)); } catch (e) { throw new Error('Brak połączenia z serwisem pogody'); }
    const j = await r.json(); if (!j.results?.length) throw new Error('Nie znalazłem miasta „' + name + '”');
    const g = j.results[0]; return { city: g.name, lat: g.latitude, lon: g.longitude, country: g.country };
  },
  async fetch(loc) {
    const s = J.state.settings;
    const l = loc || { city: s.city, lat: s.lat, lon: s.lon };
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=6`;
    let r; try { r = await fetch(url); } catch (e) { throw new Error('Brak połączenia z serwisem pogody'); }
    if (!r.ok) throw new Error('Serwis pogody niedostępny');
    const j = await r.json();
    const d = { city: l.city, current: j.current, daily: j.daily };
    if (!loc || loc.city === s.city) { this.data = d; this.ts = Date.now(); J.emit('weather', d); }
    return d;
  },
  async get(city) {
    if (!city) { if (this.data && Date.now() - this.ts < 10 * 60e3) return this.data; return this.fetch(); }
    // polska odmiana: „we Wrocławiu”, „w Krakowie”, „w Gdańsku”
    const variants = [...new Set([city, city.replace(/iu$/i, ''), city.replace(/ie$/i, 'a'), city.replace(/ie$/i, ''), city.replace(/u$/i, ''), city.replace(/ach$/i, 'y')])];
    let err;
    for (const v of variants) { try { return await this.fetch(await this.geocode(v)); } catch (e) { err = e; } }
    throw err;
  },
  describe(d) {
    const c = d.current, [ico, txt] = J.wxInfo(c.weather_code);
    return `${d.city}: ${Math.round(c.temperature_2m)}°C, ${txt} ${ico}. Odczuwalna ${Math.round(c.apparent_temperature)}°C, wiatr ${Math.round(c.wind_speed_10m)} km/h, wilgotność ${c.relative_humidity_2m}%. Jutro od ${Math.round(d.daily.temperature_2m_min[1])} do ${Math.round(d.daily.temperature_2m_max[1])}°C.`;
  }
};

/* ---------- rynek krypto (CoinGecko + Binance WebSocket na żywo) ---------- */
J.market = (() => {
  const COINS = [
    { id: 'bitcoin', sym: 'BTC', name: 'Bitcoin', pair: 'btcusdt', seed: 67400 },
    { id: 'ethereum', sym: 'ETH', name: 'Ethereum', pair: 'ethusdt', seed: 3240 },
    { id: 'solana', sym: 'SOL', name: 'Solana', pair: 'solusdt', seed: 142 },
    { id: 'binancecoin', sym: 'BNB', name: 'BNB', pair: 'bnbusdt', seed: 586 }
  ];
  const data = {}; COINS.forEach(c => data[c.sym] = { ...c, price: c.seed, chg: 0, spark: [], live: false });
  let ws = null, users = 0, poll = null, tick = null, sim = null, source = '—', loaded = false;
  const emit = sym => J.emit('market', sym);
  const simulate = () => {
    source = 'symulacja (offline)';
    COINS.forEach(c => { const d = data[c.sym]; if (!d.spark.length) { let p = d.price; d.spark = Array.from({ length: 80 }, () => (p *= 1 + (Math.random() - .5) * .01)); d.price = p; } });
    clearInterval(sim);
    sim = setInterval(() => COINS.forEach(c => { const d = data[c.sym]; d.price *= 1 + (Math.random() - .5) * .003; d.spark.push(d.price); d.spark.shift(); d.chg = (d.price - d.spark[0]) / d.spark[0] * 100; emit(c.sym); }), 1500);
  };
  const fetchCG = async () => {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&sparkline=true&price_change_percentage=24h&ids=' + COINS.map(c => c.id).join(','));
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      j.forEach(x => { const c = COINS.find(k => k.id === x.id); if (!c) return; const d = data[c.sym]; d.price = x.current_price; d.chg = x.price_change_percentage_24h || 0; const sp = x.sparkline_in_7d?.price || []; d.spark = sp.filter((_, i) => i % 2 === 0).slice(-80); emit(c.sym); });
      clearInterval(sim); sim = null; loaded = true;
      if (!ws || ws.readyState !== 1) source = 'CoinGecko';
      return true;
    } catch (e) { if (!loaded) simulate(); return false; }
  };
  const openWS = () => {
    try {
      ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + COINS.map(c => c.pair + '@miniTicker').join('/'));
      ws.onopen = () => { source = 'Binance · na żywo'; J.emit('market', null); };
      ws.onmessage = ev => {
        const m = JSON.parse(ev.data).data; if (!m) return;
        const c = COINS.find(k => k.pair === m.s.toLowerCase()); if (!c) return;
        const d = data[c.sym], p = +m.c, o = +m.o;
        d.dir = p > d.price ? 1 : p < d.price ? -1 : 0; d.price = p; d.chg = o ? (p - o) / o * 100 : d.chg; d.live = true;
        if (d.spark.length) { d.spark[d.spark.length - 1] = p; }
        emit(c.sym);
      };
      ws.onclose = () => { ws = null; };
      ws.onerror = () => { try { ws.close(); } catch (e) { } };
    } catch (e) { ws = null; }
  };
  let bg = false, hiddenT = null;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(hiddenT);
    if (document.hidden) { hiddenT = setTimeout(() => { if (ws) { try { ws.close(); } catch (e) { } ws = null; } }, 60e3); }
    else if (users && !ws) openWS();
  });
  return {
    COINS, data, get source() { return source; },
    async ensure() { if (!loaded) await fetchCG(); return data; },
    /* alerty kursów działają także bez otwartego okna rynku */
    subscribeBackground() { if (bg) return; bg = true; this.subscribe(); },
    subscribe() {
      users++;
      if (users === 1) {
        fetchCG(); poll = setInterval(fetchCG, 90e3);
        openWS();
        clearInterval(tick);
        tick = setInterval(() => { COINS.forEach(c => { const d = data[c.sym]; if (d.spark.length) { d.spark.push(d.price); if (d.spark.length > 80) d.spark.shift(); } }); }, 30e3);
      }
    },
    unsubscribe() {
      users = Math.max(0, users - 1);
      if (!users) { clearInterval(poll); clearInterval(tick); clearInterval(sim); sim = null; if (ws) { try { ws.close(); } catch (e) { } ws = null; } }
    },
    summary() { return COINS.map(c => `${c.sym} ${J.fmtMoney(data[c.sym].price)} (${data[c.sym].chg >= 0 ? '+' : ''}${data[c.sym].chg.toFixed(2)}%)`).join(', '); }
  };
})();

/* ---------- notatki ---------- */
J.notes = {
  add(title, body = '') {
    const n = { id: J.uid(), title: title || 'Nowa notatka', body, ts: Date.now() };
    J.state.notes.unshift(n); J.save(); J.emit('notes', n.id);
    J.log('Utworzono notatkę', n.title, ''); return n;
  },
  remove(id) { J.state.notes = J.state.notes.filter(n => n.id !== id); J.save(); J.emit('notes'); }
};

/* ---------- zadania / przypomnienia ---------- */
J.tasks = {
  add(time, text, date = J.today()) {
    const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(time || '').trim());
    const t = m ? J.pad(+m[1]) + ':' + m[2] : '';
    const task = { id: J.uid(), date, time: t, text: text || 'Zadanie', done: false, fired: false };
    J.state.tasks.push(task); J.state.tasks.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); J.save(); J.emit('tasks');
    J.log('Dodano zadanie', (t ? t + ' — ' : '') + task.text); return task;
  },
  today() { return J.state.tasks.filter(t => t.date === J.today()); }
  // sprawdzanie terminów (J.tasks.check) mieszka w context.js — dokładny timer + zaległe po powrocie do karty
};

/* ---------- minutnik (globalny) ---------- */
J.timer = {
  end: 0, total: 0, label: '', running: false, _t: null,
  start(sec, label = 'Minutnik') {
    this.total = sec * 1000; this.end = Date.now() + this.total; this.label = label; this.running = true;
    clearInterval(this._t); this._t = setInterval(() => this.tick(), 250);
    J.log('Minutnik uruchomiony', label + ' · ' + J.timer.fmt(sec * 1000), 'info'); J.emit('timer');
  },
  stop() { this.running = false; clearInterval(this._t); J.emit('timer'); },
  extend(sec) { if (!this.running) return; this.end += sec * 1000; this.total += sec * 1000; J.emit('timer'); },
  left() { return Math.max(0, this.end - Date.now()); },
  fmt(ms) { const s = Math.ceil(ms / 1000), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60; return (hh ? hh + ':' + J.pad(mm) : J.pad(mm)) + ':' + J.pad(ss); },
  tick() {
    J.emit('timer');
    if (this.running && this.left() <= 0) {
      this.stop(); J.sfx.alarm(); J.orb.set('alert', '⏰ ' + this.label + ' — czas minął!');
      J.toast('⏰ ' + this.label + ' — czas minął!', 6000); J.log('Minutnik zakończony', this.label, 'warn');
      J.voice.speak(this.label + '. Czas minął.', { priority: 2 }); J.notify?.('Jarvis — minutnik', this.label + ': czas minął');
      J.emit('timer-ended', this);
      setTimeout(() => J.orb.state === 'alert' && J.orb.set('idle'), 4000);
    }
  }
};

/* ---------- skróty na pulpicie ---------- */
J.shortcuts = {
  add(name, target = {}) {
    const s = { id: J.uid(), name: name || 'Nowy skrót', app: target.app || null, url: target.url || null, icon: target.icon || (target.url ? 'link' : target.app ? J.apps[target.app]?.icon : 'star') };
    J.state.shortcuts.push(s); J.save(); J.emit('shortcuts');
    J.log('Nowy skrót na pulpicie', s.name); return s;
  },
  remove(id) { J.state.shortcuts = J.state.shortcuts.filter(s => s.id !== id); J.save(); J.emit('shortcuts'); },
  run(s) {
    if (s.url) { window.open(s.url, '_blank', 'noopener'); J.toast('Otwieram ' + s.name); }
    else if (s.app && J.apps[s.app]) J.wm.open(s.app);
    else J.toast('Skrót „' + s.name + '” nie ma jeszcze celu — edytuj go prawym przyciskiem');
  }
};

/* ---------- wykres liniowy (sparkline) ---------- */
J.spark = (canvas, arr, color, fill = true) => {
  const dpr = devicePixelRatio || 1, w = canvas.clientWidth, hgt = canvas.clientHeight;
  if (!w || !hgt) return;
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = hgt * dpr; }
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, hgt);
  if (!arr || arr.length < 2) return;
  let mn = Math.min(...arr), mx = Math.max(...arr); if (mx === mn) { mx += 1; mn -= 1; }
  const X = i => i / (arr.length - 1) * w, Y = v => hgt - 3 - (v - mn) / (mx - mn) * (hgt - 6);
  c.beginPath(); arr.forEach((v, i) => i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)));
  c.strokeStyle = color; c.lineWidth = 1.6; c.shadowColor = color; c.shadowBlur = 6; c.stroke(); c.shadowBlur = 0;
  if (fill) { c.lineTo(w, hgt); c.lineTo(0, hgt); c.closePath(); const g = c.createLinearGradient(0, 0, 0, hgt); g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00'); c.fillStyle = g; c.fill(); }
};
const accent = () => J.state.settings.accent;

/* ---------- pomocnik: subskrypcja zdarzeń z auto-sprzątaniem ---------- */
// lekka wersja: zdarzenia z flagą życia okna
const sub = (ctx, ev, fn) => ctx.onClose(J.on(ev, fn));
/* widok w aplikacji: argument okna może być tekstem (stary sposób) albo obiektem { view, target } (app_view, historia „wróć”) */
const viewOf = arg => arg && typeof arg === 'object' ? arg : null;
const flash = el => { if (!el) return; el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl'); setTimeout(() => el.classList.remove('hl'), 2200); };
J.viewOf = viewOf;

/* =================== APLIKACJE =================== */

/* ---------- CZAT ---------- */
J.apps.chat = {
  title: 'Czat z Jarvisem', icon: 'chat', minW: 320, minH: 360, w: 420, h: 540, flush: true,
  mount(body, ctx, arg) {
    body.innerHTML = `<div class="chat">
      <div class="panel-head" style="font-weight:600"><span class="status"></span> Jarvis <span class="mode-pill" id="modePill"></span>
        <select class="input chat-thread" id="chatThread" title="Wątek rozmowy"></select>
        <button class="btn sm ghost" id="chatFind" title="Szukaj w rozmowach">${icon('search', 'width="12" height="12"')}</button>
        <button class="btn sm ghost" id="chatMore" title="Więcej: eksport, nowy wątek">⋯</button>
        <button class="btn sm ghost" id="chatClear" title="Wyczyść rozmowę (można cofnąć)">${icon('refresh', 'width="12" height="12"')}</button>
        <button class="btn sm ghost" id="chatHide" title="Schowaj panel czatu">${icon('close', 'width="12" height="12"')}</button></div>
      <div class="messages" id="messages"></div>
      <div class="suggest" id="suggest"></div>
      <div class="composer">
        <button class="mic" id="chatMic" title="Mów">${icon('mic')}</button>
        <textarea class="input" id="chatInput" rows="1" placeholder="Powiedz Jarvisowi, co ma zrobić… (Shift Enter — nowa linia)" autocomplete="off"></textarea>
        <button class="send" id="chatSend" title="Wyślij">${icon('send')}</button>
      </div></div>`;
    const box = $('#messages', body), input = $('#chatInput', body);
    const pill = () => { const ai = J.aiReady(), st = J.hermes.status, p = $('#modePill', body); p.textContent = !ai ? 'tryb lokalny' : st === 'up' ? 'Hermes · ' + J.state.settings.hermesModel : st === 'down' ? 'Hermes offline · tryb lokalny' : 'Hermes · sprawdzam…'; p.classList.toggle('ai', ai && st === 'up'); p.classList.toggle('bad', ai && st === 'down'); };
    pill(); sub(ctx, 'settings', pill); sub(ctx, 'hermes', pill);
    J.chat.bind(box);
    const sugg = ['Co potrafisz?', 'Jaka jest pogoda?', 'Kurs bitcoina', 'Ustaw minutnik na 5 minut', 'Zanotuj: kupić mleko', 'Przypomnij mi o 18:00 trening', 'Oblicz 15% z 2400', 'Zmień motyw na fiolet'];
    $('#suggest', body).innerHTML = sugg.map(s => `<button>${esc(s)}</button>`).join('');
    $('#suggest', body).onclick = e => { const b = e.target.closest('button'); if (b) J.brain.handle(b.textContent); };
    const fit = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight || 36, 6 * 20 + 16) + 'px'; };
    const send = () => { const v = input.value.trim(); if (!v) return; input.value = ''; fit(); J.brain.handle(v); };
    $('#chatSend', body).onclick = send;
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === 'ArrowUp' && !input.value) { input.value = J.chat.lastUser() || ''; fit(); } });
    input.addEventListener('input', fit);
    /* wątki */
    const drawThreads = () => { const sel = $('#chatThread', body); if (!sel) return; sel.innerHTML = ''; J.threads.list().forEach(t => { const o = J.h('option', { value: t.id }); o.textContent = t.name; sel.appendChild(o); }); const o = J.h('option', { value: '__new' }); o.textContent = '+ Nowy wątek…'; sel.appendChild(o); sel.value = J.threads.current(); };
    drawThreads(); sub(ctx, 'thread', drawThreads);
    $('#chatThread', body).onchange = e => { const v = e.target.value; if (v === '__new') { const n = prompt('Nazwa nowego wątku:', 'Nowy wątek'); if (n && n.trim()) J.uiRun('chat_thread', { op: 'new', name: n.trim() }, { offer: false }); else drawThreads(); } else J.uiRun('chat_thread', { op: 'switch', name: v }, { offer: false }); };
    $('#chatFind', body).onclick = () => J.palette.open('');
    $('#chatMore', body).onclick = e => { const r = e.target.getBoundingClientRect(); J.ctxMenu?.(r.left, r.bottom + 4, [
      { ic: 'download', t: 'Eksportuj ten wątek (.md)', run: () => J.uiRun('chat_export', { range: 'session' }) },
      { ic: 'download', t: 'Eksportuj wszystkie wątki (.md)', run: () => J.uiRun('chat_export', { range: 'all' }) },
      { ic: 'plus', t: 'Nowy wątek', run: () => { const n = prompt('Nazwa nowego wątku:', 'Nowy wątek'); if (n && n.trim()) J.uiRun('chat_thread', { op: 'new', name: n.trim() }, { offer: false }); } },
      { ic: 'notes', t: 'Zmień nazwę wątku', run: () => { const n = prompt('Nowa nazwa wątku:'); if (n && n.trim()) J.uiRun('chat_thread', { op: 'rename', name: n.trim() }); } },
      { ic: 'refresh', t: 'Ponów ostatnie pytanie', run: () => { const l = J.chat.lastUser(); if (l) J.brain.handle(l); } },
      '-', { ic: 'trash', t: 'Wyczyść ten wątek', danger: true, run: () => J.uiRun('chat_clear', {}) }
    ]); };
    $('#chatMic', body).onclick = () => J.ear.toggle();
    sub(ctx, 'ear', on => $('#chatMic', body)?.classList.toggle('rec', on));
    $('#chatHide', body).onclick = () => J.chatPanel.hide();
    $('#chatClear', body).onclick = () => J.uiRun('chat_clear', {});
    ctx.onClose(() => J.chat.unbind(box));
    setTimeout(() => input.focus(), 50);
    if (arg) J.brain.handle(arg);
  },
  onArg(arg) { if (arg) J.brain.handle(arg); }
};

/* historia czatu (niezależna od okna) */
/* ---------- wątki rozmów: każdy ma własną historię dla modelu, dymki i streszczenie („Ogólny” = stare klucze) ---------- */
J.threads = {
  list() { const l = J.state.ui.threads = J.state.ui.threads || []; if (!l.some(t => t.id === 'main')) l.unshift({ id: 'main', name: 'Ogólny', ts: Date.now() }); return l; },
  current: () => J.state.ui.thread && J.threads.list().some(t => t.id === J.state.ui.thread) ? J.state.ui.thread : 'main',
  key: (k, id) => { const t = id || J.threads.current(); return t === 'main' ? 'chat.' + k : 'chat.t.' + t + '.' + k; },
  byName(q) { const n = J.norm(q); return J.threads.list().find(t => t.id === q || J.norm(t.name) === n) || J.threads.list().find(t => J.norm(t.name).includes(n)); },
  touch() { const t = J.threads.list().find(x => x.id === J.threads.current()); if (t) { t.ts = Date.now(); J.save(); } },
  create(name) { const l = J.threads.list(); if (l.length >= 50) throw Object.assign(new Error('Masz już 50 wątków — usuń albo użyj istniejącego.'), { code: 'LIMIT' }); const t = { id: J.uid(), name: String(name || 'Nowy wątek').slice(0, 40), ts: Date.now() }; l.push(t); J.save(); return t; },
  async switch(id) { if (id === J.threads.current()) return; J.state.ui.thread = id; J.save(); await J.brain?.reload?.(); await J.chat.reload(); J.emit('thread'); }
};
J.chat = (() => {
  let items = [], box = null, restored = false;
  const persist = J.debounce(() => J.store.set(J.threads.key('items'), items.filter(i => !i.typing).slice(-80).map(({ role, text }) => ({ role, text }))), 500);
  const restore = async () => { if (restored) return; restored = true; try { const saved = await J.store.get(J.threads.key('items'), []); if (saved.length && !items.some(i => i.role === 'user')) { items = saved.map(x => ({ ...x })); if (box) { box.innerHTML = ''; items.forEach(it => box.appendChild(draw(it))); scroll(); } } } catch (e) { } };
  const fmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const draw = it => {
    const e = h('div', { class: 'msg ' + it.role });
    if (it.role === 'link') { const a = h('a', { href: it.text, target: '_blank', rel: 'noopener' }); a.textContent = it.text; e.appendChild(a); it.el = e; return e; }
    if (it.typing) e.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; else e.innerHTML = fmt(it.text);
    if (it.role === 'jarvis' && it.text) { const pin = h('button', { class: 'msg-pin', title: 'Przypnij jako widget' }, icon('pin', 'width="11" height="11"')); pin.onclick = () => J.widgets.create('result', { title: it.text.slice(0, 40), content: it.text, meta: 'Z czatu · ' + J.hhmm() }); e.appendChild(pin); }
    it.el = e; return e;
  };
  const scroll = () => { if (box) box.scrollTop = box.scrollHeight; };
  const api = {
    bind(b) { box = b; b.innerHTML = ''; restore(); if (!items.length) api.add('jarvis', 'Jestem gotowy. To moje środowisko — otwieram aplikacje, tworzę notatki, skróty i przypomnienia, sprawdzam pogodę i rynek. Napisz lub powiedz, co mam zrobić.' + (J.aiReady() ? '\n\nHermes (' + J.state.settings.hermesModel + ') jest skonfigurowany — status połączenia widać w nagłówku.' : '\n\nWskazówka: podłącz Hermesa (Nous Research) w Ustawieniach, a odpowiem na każde pytanie.'), true); else items.forEach(it => b.appendChild(draw(it))); scroll(); },
    unbind(b) { if (box === b) box = null; },
    reset() { items = []; J.store.del(J.threads.key('items')); },
    /* ponowne wczytanie po zmianie wątku */
    async reload() { items = []; restored = false; if (box) { box.innerHTML = ''; await restore(); if (!items.length) api.add('jarvis', 'Wątek „' + (J.threads.list().find(t => t.id === J.threads.current())?.name || '') + '”. O czym rozmawiamy?', true); } else await restore(); },
    items: () => items.filter(i => !i.typing).map(({ role, text }) => ({ role, text })),
    /* kopia do „Cofnij” po wyczyszczeniu */
    snapshot: () => items.filter(i => !i.typing).map(({ role, text }) => ({ role, text })),
    async restoreSnapshot(l) { items = l.map(x => ({ ...x })); await J.store.set(J.threads.key('items'), l); if (box) { box.innerHTML = ''; items.forEach(it => box.appendChild(draw(it))); scroll(); } },
    /* szukanie w rozmowach wszystkich wątków */
    async searchAll(q) {
      const out = [], cur = J.threads.current();
      for (const t of J.threads.list()) {
        const l = t.id === cur ? api.items() : await J.store.get(J.threads.key('items', t.id), []);
        l.forEach((it, i) => { if (it.role !== 'user' && it.role !== 'jarvis') return; const sc = J.search.score(q, it.text); if (sc) out.push({ id: t.id + ':' + i, text: it.text, role: it.role, thread: t.name, threadId: t.id, index: i, score: sc * .9 }); });
      }
      return out.sort((a, b) => b.score - a.score).slice(0, 30);
    },
    async goto(threadId, index) {
      if (threadId && threadId !== J.threads.current()) await J.threads.switch(threadId);
      J.chatPanel?.show(); const l = items.filter(i => !i.typing), it = l[index]; if (it?.el) { it.el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); it.el.classList.remove('hl'); void it.el.offsetWidth; it.el.classList.add('hl'); }
    },
    /* rozmowa jako Markdown */
    async markdown(scope = 'session') {
      const threads = scope === 'all' ? J.threads.list() : J.threads.list().filter(t => t.id === J.threads.current());
      let md = '# Rozmowa z Jarvisem — ' + new Date().toLocaleString('pl-PL') + '\n';
      for (const t of threads) {
        const l = t.id === J.threads.current() ? api.items() : await J.store.get(J.threads.key('items', t.id), []);
        md += '\n## Wątek: ' + t.name + '\n\n' + l.map(it => it.role === 'user' ? '**Ty:** ' + it.text : it.role === 'jarvis' ? '**Jarvis:** ' + it.text : '> ' + it.text).join('\n\n') + '\n';
      }
      return md;
    },
    link(url) { const it = { role: 'link', text: url }; items.push(it); if (box) { const e = h('div', { class: 'msg link' }); const a = h('a', { href: url, target: '_blank', rel: 'noopener' }); a.textContent = url; e.appendChild(a); it.el = e; box.appendChild(e); scroll(); } },
    /* szybkie odpowiedzi (ui_ask / potwierdzenia): zwraca element do usunięcia */
    quick(question, options, onPick) { if (!box) return null; const e = h('div', { class: 'msg quick' }, '<div class="q"></div><div class="opts"></div>'); e.querySelector('.q').textContent = question; const o = e.querySelector('.opts'); options.forEach(op => { const b = h('button', { class: 'btn sm' + (op.primary ? ' primary' : op.danger ? ' ghost danger' : ' ghost') }, ''); b.textContent = op.label; b.onclick = () => onPick(op.value); o.appendChild(b); }); box.appendChild(e); scroll(); return e; },
    add(role, text, silent) {
      const it = { role, text: text || '', typing: role === 'jarvis' && text === '' };
      items.push(it); if (items.length > 200) items.shift();
      if (box) { box.appendChild(draw(it)); scroll(); }
      if (!silent) persist();
      return {
        set(t) { persist(); it.text = t; it.typing = false; if (it.el) { it.el.innerHTML = fmt(t); if (it.role === 'jarvis' && t) { const pin = h('button', { class: 'msg-pin', title: 'Przypnij jako widget' }, icon('pin', 'width="11" height="11"')); pin.onclick = () => J.widgets.create('result', { title: t.slice(0, 40), content: t, meta: 'Z czatu · ' + J.hhmm() }); it.el.appendChild(pin); } } scroll(); },
        get text() { return it.text; },
        remove() { items = items.filter(x => x !== it); it.el?.remove(); }
      };
    },
    lastUser() { for (let i = items.length - 1; i >= 0; i--) if (items[i].role === 'user') return items[i].text; },
    get visible() { return !!box && J.wm.isOpen('chat') && !J.wm.isMin('chat'); }
  };
  return api;
})();

/* ---------- NOTATNIK ---------- */
J.apps.notes = {
  title: 'Notatnik', icon: 'notes', minW: 420, minH: 280, w: 620, h: 420, flush: true,
  mount(body, ctx, arg) {
    const va = viewOf(arg);
    let sel = ((typeof arg === 'string' ? arg : va?.view === 'note' ? va.target : null) && J.state.notes.find(n => n.id === (typeof arg === 'string' ? arg : va.target))?.id) || J.state.notes[0]?.id, q = va?.view === 'search' ? String(va.target || '').toLowerCase() : '';
    body.innerHTML = `<div class="notes">
      <div class="notes-side"><div class="top"><input class="input" placeholder="Szukaj…" id="nq"><button class="btn" id="nNew" title="Nowa notatka">${icon('plus', 'width="14" height="14"')}</button></div><div class="notes-list" id="nList"></div></div>
      <div class="notes-main"><input id="nTitle" placeholder="Tytuł"><textarea id="nBody" placeholder="Zacznij pisać… (zapis automatyczny)"></textarea>
      <div class="notes-foot"><span id="nInfo"></span><span class="sp"></span>
        <button class="btn sm ghost" id="nRead" title="Przeczytaj na głos">${icon('sound', 'width="12" height="12"')} Czytaj</button>
        <button class="btn sm ghost" id="nExp">${icon('download', 'width="12" height="12"')} .txt</button>
        <button class="btn sm ghost danger" id="nDel">${icon('trash', 'width="12" height="12"')}</button></div></div></div>`;
    const list = $('#nList', body), ti = $('#nTitle', body), bo = $('#nBody', body), info = $('#nInfo', body);
    const cur = () => J.state.notes.find(n => n.id === sel);
    const renderList = () => {
      const items = J.state.notes.filter(n => !q || (n.title + ' ' + n.body).toLowerCase().includes(q));
      list.innerHTML = items.length ? '' : '<div class="empty">Brak notatek</div>';
      items.forEach(n => {
        const b = h('button', { class: 'note-item' + (n.id === sel ? ' sel' : '') }, '<b></b><span></span>');
        b.querySelector('b').textContent = n.title || 'Bez tytułu';
        b.querySelector('span').textContent = new Date(n.ts).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        b.onclick = () => { sel = n.id; renderList(); renderEd(); };
        list.appendChild(b);
      });
    };
    const renderEd = () => {
      const n = cur(); const dis = !n;
      ti.disabled = bo.disabled = dis; ti.value = n?.title || ''; bo.value = n?.body || '';
      info.textContent = n ? (n.body.trim().split(/\s+/).filter(Boolean).length + ' słów') : 'Utwórz notatkę przyciskiem +';
    };
    const upd = J.debounce(() => { const n = cur(); if (!n) return; n.title = ti.value; n.body = bo.value; n.ts = Date.now(); J.save(); renderList(); info.textContent = 'Zapisano · ' + n.body.trim().split(/\s+/).filter(Boolean).length + ' słów'; }, 350);
    ti.oninput = bo.oninput = upd;
    $('#nq', body).oninput = e => { q = e.target.value.toLowerCase(); renderList(); };
    $('#nNew', body).onclick = () => { const n = J.notes.add('Nowa notatka', ''); sel = n.id; renderList(); renderEd(); ti.select(); };
    $('#nDel', body).onclick = async () => { const n = cur(); if (!n) return; const r = await J.uiRun('notes_delete', { note: n.id }); if (r.ok) { sel = J.state.notes[0]?.id; renderList(); renderEd(); } };
    $('#nExp', body).onclick = () => { const n = cur(); if (!n) return; const a = h('a', { href: URL.createObjectURL(new Blob([n.title + '\n\n' + n.body], { type: 'text/plain' })), download: (n.title || 'notatka').replace(/[^\w\-ąćęłńóśźż ]/gi, '') + '.txt' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    $('#nRead', body).onclick = () => { const n = cur(); if (n) { const was = J.state.settings.speech; J.state.settings.speech = true; J.voice.speak(n.title + '. ' + n.body); J.state.settings.speech = was; } };
    sub(ctx, 'notes', id => { if (id) sel = id; renderList(); renderEd(); });
    ctx.state = () => { const n = cur(); return n ? { view: 'note', target: n.id, label: n.title, noteId: n.id, title: n.title, words: n.body.trim().split(/\s+/).filter(Boolean).length } : null; };
    ctx.setQuery = v => { q = String(v || '').toLowerCase(); $('#nq', body).value = v || ''; renderList(); };
    if (q) $('#nq', body).value = va.target;
    renderList(); renderEd();
  },
  onArg(arg, ctx) { const v = viewOf(arg); if (!v) return J.emit('notes', arg); if (v.view === 'search') ctx?.setQuery?.(v.target); else if (v.target) J.emit('notes', v.target); J.emit('app-view'); },
  state: ctx => ctx?.state?.() || null
};

/* ---------- RYNEK ---------- */
J.apps.market = {
  title: 'Monitor rynku', icon: 'market', minW: 320, minH: 300, w: 440, h: 400,
  mount(body, ctx, arg) {
    body.innerHTML = `<div class="market" id="mk"></div><div class="src"><span id="mkSrc">Łączenie…</span><span class="dim">aktualizacja na żywo</span></div>`;
    const grid = $('#mk', body), cards = {};
    J.market.COINS.forEach(c => {
      const el = h('div', { class: 'coin' }, `<div class="h"><div><b>${c.name}</b><span class="sym">${c.sym}</span></div><span class="chg"></span></div><div class="price">—</div><canvas></canvas>`);
      grid.appendChild(el); cards[c.sym] = el;
    });
    const draw = sym => {
      (sym ? [sym] : Object.keys(cards)).forEach(s => {
        const d = J.market.data[s], el = cards[s]; if (!el) return;
        const pr = $('.price', el); pr.textContent = J.fmtMoney(d.price);
        if (d.dir) { pr.classList.remove('flash-up', 'flash-down'); void pr.offsetWidth; pr.classList.add(d.dir > 0 ? 'flash-up' : 'flash-down'); clearTimeout(pr._t); pr._t = setTimeout(() => pr.classList.remove('flash-up', 'flash-down'), 500); d.dir = 0; }
        const ch = $('.chg', el); ch.textContent = (d.chg >= 0 ? '▲ +' : '▼ ') + d.chg.toFixed(2) + '%'; ch.className = 'chg ' + (d.chg >= 0 ? 'up' : 'down');
        J.spark($('canvas', el), d.spark, d.chg >= 0 ? '#39e59a' : '#ff5d7a');
      });
      $('#mkSrc', body).textContent = 'Źródło: ' + J.market.source;
    };
    sub(ctx, 'market', draw); sub(ctx, 'wm-resize', () => draw());
    J.market.subscribe(); ctx.onClose(() => J.market.unsubscribe());
    requestAnimationFrame(() => draw());
    let focusSym = null;
    ctx.showCoin = sym => { const k = String(sym || '').toUpperCase(); const el = cards[k]; if (!el) return false; focusSym = k; Object.values(cards).forEach(c => c.classList.toggle('sel', c === el)); flash(el); return true; };
    ctx.state = () => focusSym ? { view: 'coin', target: focusSym, label: focusSym } : null;
    const va = viewOf(arg); if (va?.view === 'coin') setTimeout(() => ctx.showCoin(va.target), 60);
  },
  onArg(arg, ctx) { const v = viewOf(arg); if (v?.view === 'coin') ctx?.showCoin?.(v.target); J.emit('app-view'); },
  state: ctx => ctx?.state?.() || null
};

/* ---------- HARMONOGRAM ---------- */
J.apps.schedule = {
  title: 'Harmonogram', icon: 'calendar', minW: 340, minH: 360, w: 420, h: 480,
  mount(body, ctx, arg) {
    const isDay = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
    const va = viewOf(arg); let day = isDay(arg) ? arg : isDay(va?.target) ? va.target : J.today();
    body.innerHTML = `<div class="day-strip" id="days"></div>
      <form class="row" id="tf" style="margin-bottom:12px"><input class="input" type="time" id="tt" style="width:100px"><input class="input" id="tx" placeholder="Nowe zadanie…" required><button class="btn primary">${icon('plus', 'width="13" height="13"')}</button></form>
      <div class="tasks" id="tl"></div>`;
    const days = $('#days', body), tl = $('#tl', body);
    const renderDays = () => {
      days.innerHTML = '';
      const base = new Date();
      for (let i = -1; i < 5; i++) {
        const d = new Date(base); d.setDate(base.getDate() + i);
        const key = d.getFullYear() + '-' + J.pad(d.getMonth() + 1) + '-' + J.pad(d.getDate());
        const cnt = J.state.tasks.filter(t => t.date === key && !t.done).length;
        const b = h('button', { class: 'day' + (key === day ? ' today' : '') }, `${d.toLocaleDateString('pl-PL', { weekday: 'short' })}<b>${d.getDate()}</b>${cnt ? '<span style="color:var(--accent)">• ' + cnt + '</span>' : '&nbsp;'}`);
        b.onclick = () => { day = key; renderDays(); render(); };
        days.appendChild(b);
      }
    };
    const render = () => {
      const now = J.hhmm();
      const list = J.state.tasks.filter(t => t.date === day);
      tl.innerHTML = ''; if (!list.length) { if (J.ui?.state) J.ui.state(tl, 'empty', { text: 'Brak zadań na ten dzień. Dodaj pierwsze powyżej albo powiedz: „przypomnij mi o 18:00 trening”.' }); else tl.innerHTML = '<div class="empty">Brak zadań na ten dzień.</div>'; }
      const nextIdx = day === J.today() ? list.findIndex(t => !t.done && t.time >= now) : -1;
      list.forEach((t, i) => {
        const el = h('div', { class: 'task' + (t.done ? ' done' : '') + (i === nextIdx ? ' now' : '') }, `<input type="checkbox" ${t.done ? 'checked' : ''}><span class="t">${esc(t.time || '—')}</span><span class="n"></span><button class="del" title="Usuń">×</button>`);
        $('.n', el).textContent = t.text;
        $('input', el).onchange = e => { J.uiRun('tasks_complete', { task: t.id, done: e.target.checked }, { offer: false }); };
        $('.del', el).onclick = () => J.uiRun('tasks_remove', { task: t.id });
        tl.appendChild(el);
      });
    };
    $('#tf', body).onsubmit = e => { e.preventDefault(); const tx = $('#tx', body), v = tx.value.trim(); if (!v) return; J.uiRun('add_task', { text: v, time: $('#tt', body).value || undefined, date: day }, { offer: false }); tx.value = ''; J.sfx.click(); };
    sub(ctx, 'tasks', () => { renderDays(); render(); });
    const iv = setInterval(render, 30e3); ctx.onClose(() => clearInterval(iv));
    ctx.state = () => ({ view: 'day', target: day, day, label: new Date(day + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }) });
    ctx.setDay = d => { if (isDay(d)) { day = d; renderDays(); render(); } };   // nawigacja: „pokaż piątek”
    // import kalendarza .ics (VEVENT → zadania)
    const imp = h('label', { class: 'btn sm ghost', style: 'cursor:pointer;margin-left:auto', title: 'Importuj wydarzenia z pliku .ics' }, icon('download', 'width="12" height="12"') + ' .ics<input type="file" accept=".ics,text/calendar" hidden>');
    $('#tf', body).appendChild(imp);
    $('input[type=file]', imp).onchange = async e => { const f = e.target.files[0]; if (!f) return; const n = J.ics.import(await f.text()); J.toast(n ? 'Zaimportowano ' + n + ' ' + J.pl(n, 'wydarzenie', 'wydarzenia', 'wydarzeń') : 'Brak wydarzeń w pliku'); };
    renderDays(); render();
  },
  onArg(arg, ctx) { const v = viewOf(arg); ctx?.setDay?.(v ? v.target : arg); J.emit('app-view'); },
  state: ctx => ctx?.state?.() || null
};

/* ---------- import kalendarza (.ics, VEVENT z DTSTART i SUMMARY) ---------- */
J.ics = {
  parse(text) {
    const out = [], lines = String(text).replace(/\r\n[ \t]/g, '').split(/\r?\n/); let ev = null;
    for (const l of lines) {
      if (l === 'BEGIN:VEVENT') ev = {}; else if (l === 'END:VEVENT') { if (ev?.start && ev.summary) out.push(ev); ev = null; }
      else if (ev) { const i = l.indexOf(':'); if (i < 0) continue; const key = l.slice(0, i).split(';')[0], val = l.slice(i + 1); if (key === 'SUMMARY') ev.summary = val.replace(/\\,/g, ',').replace(/\\n/g, ' '); else if (key === 'DTSTART') { const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(val); if (m) ev.start = { date: m[1] + '-' + m[2] + '-' + m[3], time: m[4] ? m[4] + ':' + m[5] : '' }; } }
    }
    return out;
  },
  import(text) { const l = J.ics.parse(text); let n = 0; l.forEach(ev => { if (J.state.tasks.some(t => t.date === ev.start.date && t.text === ev.summary)) return; J.tasks.add(ev.start.time, ev.summary, ev.start.date); n++; }); return n; }
};

/* ---------- MONITOR SYSTEMU ---------- */
J.apps.monitor = {
  title: 'Monitor systemu', icon: 'monitor', minW: 340, minH: 320, w: 440, h: 470,
  onArg(arg, ctx) { const v = viewOf(arg); if (v?.view === 'section') ctx?.goSection?.(v.target); },
  mount(body, ctx, arg) {
    ctx.goSection = sec => { const id = { fps: 'sFps', klatki: 'sFps', pamiec: 'sMem', pamięć: 'sMem', siec: 'sNet', sieć: 'sNet', dane: 'sSto', bateria: 'sBat', okna: 'sWin' }[J.norm(sec || '')] || 'sFps'; flash($('#' + id, body)?.closest('.stat')); };
    setTimeout(() => { const va = viewOf(arg); if (va?.view === 'section') ctx.goSection(va.target); }, 80);
    body.innerHTML = `<div class="stats">
      <div class="stat wide"><span>Klatki / s</span><strong id="sFps">—</strong><canvas id="cFps"></canvas></div>
      <div class="stat"><span>Pamięć JS</span><strong id="sMem">—</strong><canvas id="cMem"></canvas></div>
      <div class="stat"><span>Opóźnienie pętli</span><strong id="sLag">—</strong><canvas id="cLag"></canvas></div>
      <div class="stat"><span>Czas pracy</span><strong id="sUp">—</strong></div>
      <div class="stat"><span>Rdzenie CPU</span><strong>${navigator.hardwareConcurrency || '?'}</strong></div>
      <div class="stat"><span>Sieć</span><strong id="sNet">—</strong></div>
      <div class="stat"><span>Bateria</span><strong id="sBat">—</strong></div>
      <div class="stat"><span>Okna / akcje</span><strong id="sWin">—</strong></div>
      <div class="stat"><span>Dane lokalne</span><strong id="sSto">—</strong></div>
    </div>`;
    const hist = { fps: [], mem: [], lag: [] };
    let bat = null; navigator.getBattery?.().then(b => bat = b).catch(() => { });
    let last = performance.now();
    const tick = () => {
      const now = performance.now(), lag = Math.max(0, now - last - 1000); last = now;
      const fps = J.fps || 0;
      hist.fps.push(fps); hist.lag.push(lag);
      const mem = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null;
      if (mem != null) hist.mem.push(mem);
      for (const k in hist) if (hist[k].length > 60) hist[k].shift();
      $('#sFps', body).textContent = fps;
      $('#sMem', body).textContent = mem != null ? mem.toFixed(1) + ' MB' : 'n/d';
      $('#sLag', body).textContent = lag.toFixed(0) + ' ms';
      const up = (Date.now() - J.bootTime) / 1000;
      $('#sUp', body).textContent = Math.floor(up / 3600) + 'h ' + J.pad(Math.floor(up % 3600 / 60)) + 'm ' + J.pad(Math.floor(up % 60)) + 's';
      const cn = navigator.connection;
      $('#sNet', body).textContent = navigator.onLine ? (cn?.effectiveType ? cn.effectiveType.toUpperCase() + (cn.downlink ? ' · ' + cn.downlink + 'Mb' : '') : 'ONLINE') : 'OFFLINE';
      $('#sBat', body).textContent = bat ? Math.round(bat.level * 100) + '%' + (bat.charging ? ' ⚡' : '') : 'n/d';
      $('#sWin', body).textContent = J.wm.count() + ' / ' + (J.state.stats.actions || 0);
      let bytes = 0; try { bytes = (localStorage.getItem('jarvis-os:v2') || '').length * 2; } catch (e) { }
      $('#sSto', body).textContent = (bytes / 1024).toFixed(1) + ' KB';
      J.spark($('#cFps', body), hist.fps, accent());
      J.spark($('#cMem', body), hist.mem, J.state.settings.accent2);
      J.spark($('#cLag', body), hist.lag, '#ffb84d');
    };
    tick(); const iv = setInterval(tick, 1000); ctx.onClose(() => clearInterval(iv));
  }
};

/* ---------- POGODA ---------- */
J.apps.weather = {
  title: 'Pogoda', icon: 'weather', minW: 320, minH: 300, w: 440, h: 400,
  mount(body, ctx, arg) {
    body.innerHTML = `<form class="row" id="wf" style="margin-bottom:14px"><input class="input" id="wc" placeholder="Miasto…"><button class="btn">Szukaj</button><button class="btn ghost" type="button" id="wg" title="Moja lokalizacja">📍</button></form><div id="wo"><div class="empty">Pobieram prognozę…</div></div>`;
    const out = $('#wo', body);
    const show = d => {
      const c = d.current, [ico, txt] = J.wxInfo(c.weather_code), dl = d.daily;
      out.innerHTML = `<div class="wx-now"><div class="wx-big">${ico}</div><div><div class="wx-temp">${Math.round(c.temperature_2m)}°</div><div class="muted">${esc(d.city)} · ${txt}</div></div>
        <div style="margin-left:auto;text-align:right;font-size:11px;line-height:1.8" class="muted">Odczuwalna <b style="color:#fff">${Math.round(c.apparent_temperature)}°</b><br>Wiatr <b style="color:#fff">${Math.round(c.wind_speed_10m)} km/h</b><br>Wilgotność <b style="color:#fff">${c.relative_humidity_2m}%</b></div></div>
        <div class="wx-days">${dl.time.slice(1, 6).map((t, i) => { const k = i + 1; return `<div class="wx-day">${new Date(t).toLocaleDateString('pl-PL', { weekday: 'short' })}<div class="i">${J.wxInfo(dl.weather_code[k])[0]}</div><b>${Math.round(dl.temperature_2m_max[k])}°</b> <span class="dim">${Math.round(dl.temperature_2m_min[k])}°</span><div class="dim" style="margin-top:3px">💧${dl.precipitation_probability_max[k] ?? 0}%</div></div>`; }).join('')}</div>
        <div class="src"><span>Wschód ${dl.sunrise[0].slice(11)} · Zachód ${dl.sunset[0].slice(11)}</span><span>Open-Meteo</span></div>`;
    };
    const load = async city => {
      if (J.ui?.state) J.ui.state(out, 'loading', { text: 'Pobieram prognozę…' }); else out.innerHTML = '<div class="empty">Pobieram prognozę…</div>';
      try { show(await J.weather.get(city)); } catch (e) { if (J.ui?.state) J.ui.state(out, navigator.onLine === false || J.state.settings.offlineMode ? 'offline' : 'error', { text: navigator.onLine === false ? 'Brak internetu — pogoda wróci, gdy połączenie wróci.' : (e.message || 'Nie udało się pobrać pogody.'), action: { label: 'Spróbuj ponownie', run: () => load(city) } }); else out.innerHTML = '<div class="empty">' + esc(e.message || 'Brak połączenia z serwisem pogody') + '</div>'; }
    };
    $('#wf', body).onsubmit = e => { e.preventDefault(); const v = $('#wc', body).value.trim(); if (v) load(v); };
    $('#wg', body).onclick = () => {
      if (!navigator.geolocation) return J.toast('Geolokalizacja niedostępna');
      navigator.geolocation.getCurrentPosition(async p => {
        const s = J.state.settings; s.lat = p.coords.latitude; s.lon = p.coords.longitude; s.city = 'Moja lokalizacja'; J.save();
        try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${s.lat}&lon=${s.lon}`); const j = await r.json(); s.city = j.address?.city || j.address?.town || j.address?.village || s.city; J.save(); } catch (e) { }
        J.weather.ts = 0; load(); J.toast('Ustawiono lokalizację: ' + s.city);
      }, () => J.toast('Brak zgody na lokalizację'));
    };
    let cityNow = null;
    const load0 = load; ctx.body._load = c => { cityNow = c || null; return load0(c); };
    ctx.state = () => cityNow ? { view: 'city', target: cityNow, label: cityNow } : null;
    const va = viewOf(arg); ctx.body._load(typeof arg === 'string' ? arg : va?.view === 'city' ? va.target : undefined);
  },
  onArg(arg, ctx) { const v = viewOf(arg); ctx.body._load?.(v ? v.target : arg); J.emit('app-view'); },
  state: ctx => ctx?.state?.() || null
};

/* ---------- TERMINAL ---------- */
J.apps.terminal = {
  title: 'Terminal', icon: 'terminal', minW: 380, minH: 220, w: 560, h: 380, flush: true,
  onArg(arg, ctx) { const v = viewOf(arg); if (v?.view === 'run') ctx?.prefill?.(v.target); },
  mount(body, ctx, arg) {
    body.innerHTML = `<div class="term"><div class="term-out" id="to"></div><div class="term-in"><span>jarvis@os:~$</span><input id="ti" autocomplete="off" spellcheck="false"></div></div>`;
    const out = $('#to', body), inp = $('#ti', body), hist = []; let hi = 0;
    const print = (html, cls = '') => { const d = h('div', { class: cls }, html); out.appendChild(d); out.scrollTop = out.scrollHeight; };
    const run = async line => { print('<span class="g">jarvis@os:~$</span> ' + esc(line)); if (line.trim().toLowerCase() === 'clear') { out.innerHTML = ''; return; } const r = await TERM.run(line, print); if (r) print(r); };
    const cmdNames = Object.keys(TERM.cmds);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const v = inp.value; if (v.trim()) { hist.push(v); hi = hist.length; } inp.value = ''; run(v); }
      else if (e.key === 'ArrowUp') { if (hi > 0) inp.value = hist[--hi]; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { inp.value = hi < hist.length - 1 ? hist[++hi] : (hi = hist.length, ''); }
      else if (e.key === 'Tab') { e.preventDefault(); const m = cmdNames.filter(k => k.startsWith(inp.value)); if (m.length === 1) inp.value = m[0] + ' '; else if (m.length) print('<span class="d">' + m.join('  ') + '</span>'); }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
    });
    body.addEventListener('click', () => inp.focus());
    print('<span class="c">Jarvis OS 2.1</span> — terminal. Wpisz <span class="c">help</span>, aby zobaczyć polecenia.');
    ctx.prefill = t => { inp.value = String(t || ''); inp.focus(); };   // tylko wpisuje — wykonanie wymaga Enter
    ctx.dirty = () => !!inp.value.trim();
    const va = viewOf(arg); if (va?.view === 'run') ctx.prefill(va.target);
    setTimeout(() => inp.focus(), 60);
  }
};
/* polecenia terminala: wspólne dla okna Terminala i narzędzia terminal_run (zwracają HTML) */
const TERM = (() => {
    let print = () => { };
    const cmds = {
      help: () => print(`<span class="c">Dostępne polecenia:</span>
  help            ta lista            open &lt;app&gt;     otwórz aplikację
  ls / apps       lista aplikacji     close &lt;app|all&gt; zamknij okno
  note &lt;tekst&gt;     nowa notatka        task HH:MM &lt;t&gt;  nowe zadanie
  calc &lt;wyr&gt;      kalkulator          timer &lt;min&gt;     minutnik
  weather [miasto] pogoda             crypto          kursy krypto
  theme &lt;kolor&gt;    zmień akcent        say &lt;tekst&gt;      powiedz na głos
  ask &lt;pytanie&gt;    zapytaj Jarvisa     neofetch        informacje o systemie
  date / whoami   data / użytkownik   matrix          ;)
  clear           wyczyść             reboot          restart systemu`),
      ls: () => print(Object.entries(J.apps).map(([k, a]) => `<span class="c">${k.padEnd(10)}</span> ${esc(a.title)}`).join('\n')),
      apps: () => cmds.ls(),
      open: a => J.wm.open(a) ? print('<span class="g">✓</span> otwarto ' + esc(a)) : print('<span class="e">nie ma aplikacji: ' + esc(a) + '</span> (wpisz ls)'),
      close: a => { if (a === 'all') { J.wm.closeAll(); print('<span class="g">✓</span> zamknięto wszystkie okna'); } else if (J.wm.isOpen(a)) { J.wm.close(a); print('<span class="g">✓</span> zamknięto ' + esc(a)); } else print('<span class="e">okno nie jest otwarte</span>'); },
      note: t => { if (!t) return print('<span class="e">użycie: note &lt;tekst&gt;</span>'); J.notes.add(t.slice(0, 40), t); J.action('note'); print('<span class="g">✓</span> notatka zapisana'); },
      task: t => { const m = /^(\d{1,2}[:.]\d{2})\s+(.+)$/.exec(t || ''); if (!m) return print('<span class="e">użycie: task 18:00 trening</span>'); J.tasks.add(m[1], m[2]); J.action('task'); print('<span class="g">✓</span> zadanie dodane'); },
      calc: e => { try { print('<span class="v">= ' + J.calc(e) + '</span>'); } catch (er) { print('<span class="e">' + esc(er.message) + '</span>'); } },
      timer: m => { const n = parseFloat(m); if (!(n > 0)) return print('<span class="e">użycie: timer 5</span>'); J.timer.start(Math.round(n * 60)); J.action('timer'); print('<span class="g">✓</span> minutnik: ' + n + ' min'); },
      weather: async c => { print('<span class="d">pobieram…</span>'); try { print(esc(J.weather.describe(await J.weather.get(c || undefined)))); } catch (e) { print('<span class="e">' + esc(e.message) + '</span>'); } },
      crypto: async () => { await J.market.ensure(); print(J.market.COINS.map(c => { const d = J.market.data[c.sym]; return `<span class="c">${c.sym.padEnd(4)}</span> ${J.fmtMoney(d.price).padStart(12)}  <span class="${d.chg >= 0 ? 'g' : 'e'}">${(d.chg >= 0 ? '+' : '') + d.chg.toFixed(2)}%</span>`; }).join('\n')); },
      theme: c => { const t = J.THEMES[(c || '').toLowerCase()]; if (!t) return print('dostępne: ' + Object.keys(J.THEMES).join(', ')); J.state.settings.accent = t[0]; J.state.settings.accent2 = t[1]; J.applyTheme(); J.save(); J.emit('settings'); print('<span class="g">✓</span> motyw: ' + esc(c)); },
      say: t => { const was = J.state.settings.speech; J.state.settings.speech = true; J.voice.speak(t); J.state.settings.speech = was; },
      ask: q => { J.wm.open('chat', q); print('<span class="d">→ czat</span>'); },
      date: () => print(new Date().toLocaleString('pl-PL', { dateStyle: 'full', timeStyle: 'medium' })),
      whoami: () => print(esc(J.state.settings.user) + ' · administrator środowiska Jarvis'),
      echo: t => print(esc(t)),
      clear: () => { },
      matrix: () => J.matrix?.(),
      reboot: () => { print('<span class="c">restart…</span>'); setTimeout(() => location.reload(), 600); },
      neofetch: () => print(`<span class="c">     ◢◤◥◣      </span> <b>jarvis</b>@<b>os</b>
<span class="c">   ◢◤ ◉◉ ◥◣    </span> ─────────────
<span class="c">  ◢◤ ◉  ◉ ◥◣   </span> <span class="c">OS</span>: Jarvis OS 2.1 (web)
<span class="c">  ◥◣ ◉  ◉ ◢◤   </span> <span class="c">Silnik</span>: ${esc(J.aiReady() ? 'Hermes · ' + J.state.settings.hermesModel : 'lokalny')}
<span class="c">   ◥◣ ◉◉ ◢◤    </span> <span class="c">Okna</span>: ${J.wm.count()} · <span class="c">Notatki</span>: ${J.state.notes.length}
<span class="c">     ◥◣◢◤      </span> <span class="c">Rozdzielczość</span>: ${innerWidth}×${innerHeight}
                  <span class="c">Akcje</span>: ${J.state.stats.actions || 0} · <span class="c">CPU</span>: ${navigator.hardwareConcurrency || '?'} rdzeni`)
    };
    const api = {
      cmds,
      async run(line, out) {
        print = out || (() => { });
        const [c, ...rest] = line.trim().split(/\s+/); const arg = rest.join(' ');
        if (!c) return '';
        const fn = cmds[c.toLowerCase()];
        if (!fn) return '<span class="e">nieznane polecenie: ' + esc(c) + '</span> — wpisz <span class="c">help</span>';
        await fn(arg); return '';
      }
    };
    return api;
})();
J.terminalRun = async line => { const buf = []; const r = await TERM.run(line, html => buf.push(html)); if (r) buf.push(r); return buf.join('\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); };

/* ---------- KALKULATOR ---------- */
J.apps.calc = {
  title: 'Kalkulator', icon: 'calc', minW: 260, minH: 380, aspect: .68, w: 300, h: 440,
  onArg(arg, ctx) { const v = viewOf(arg); if (v?.view === 'expr') ctx?.setExpr?.(v.target); },
  mount(body, ctx, arg) {
    let expr = '';
    body.innerHTML = `<div class="calc-disp"><div class="expr" id="ce"></div><div class="res" id="cr">0</div></div><div class="calc-keys" id="ck"></div>`;
    const keys = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '%', '0', ',', '='];
    const map = { '÷': '/', '×': '*', '−': '-', ',': '.' };
    const ck = $('#ck', body);
    keys.forEach(k => { const b = h('button', { class: (/[÷×−+%()]/.test(k) ? 'op' : '') + (k === '=' ? ' eq' : '') }, k); b.onclick = () => press(k); ck.appendChild(b); });
    const show = () => { $('#ce', body).textContent = expr; try { $('#cr', body).textContent = expr ? J.calc(expr) : '0'; } catch (e) { } };
    const press = k => {
      J.sfx.click();
      if (k === 'C') expr = '';
      else if (k === '=') { try { const r = J.calc(expr); J.log('Obliczenie', expr + ' = ' + r); expr = String(r); } catch (e) { $('#cr', body).textContent = 'Błąd'; return; } }
      else if (k === '⌫') expr = expr.slice(0, -1);
      else expr += map[k] || k;
      show();
    };
    const onKey = e => {
      if (!J.wm.isFocused('calc') || e.target.closest('input,textarea')) return;
      if (/^[\d+\-*/().%^]$/.test(e.key)) { expr += e.key; show(); }
      else if (e.key === 'Enter' || e.key === '=') press('=');
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Escape') { /* obsługiwane globalnie */ }
      else if (e.key === ',') { expr += '.'; show(); }
      else if (e.key.toLowerCase() === 'c') press('C');
    };
    addEventListener('keydown', onKey); ctx.onClose(() => removeEventListener('keydown', onKey));
    ctx.setExpr = v => { expr = String(v || '').replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.'); show(); };
    const va = viewOf(arg); if (va?.view === 'expr') ctx.setExpr(va.target);
  }
};

/* ---------- MINUTNIK / STOPER ---------- */
J.apps.timer = {
  title: 'Minutnik', icon: 'timer', minW: 280, minH: 360, w: 340, h: 470,
  onArg(arg, ctx) { const v = viewOf(arg); if (v) ctx?.setMode?.(v.view === 'stopwatch' ? 'sw' : 'timer'); J.emit('app-view'); },
  state: ctx => ctx?.state?.() || null,
  mount(body, ctx, arg) {
    let mode = 'timer', swStart = 0, swAcc = 0, swRun = false, laps = [];
    const C = 2 * Math.PI * 76;
    body.innerHTML = `<div class="seg"><button data-m="timer" class="on">Minutnik</button><button data-m="sw">Stoper</button></div>
      <div id="tv"></div>`;
    const tv = $('#tv', body);
    const drawTimer = () => {
      tv.innerHTML = `<div class="timer-ring"><svg viewBox="0 0 170 170"><circle class="bg" cx="85" cy="85" r="76"/><circle class="fg" id="tfg" cx="85" cy="85" r="76" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div><div class="timer-disp" id="td">05:00</div><div class="dim" style="text-align:center;font-size:10px" id="tl"></div></div></div>
        <div class="chips">${[1, 3, 5, 10, 15, 25, 45, 60].map(m => `<button class="chip" data-min="${m}">${m} min</button>`).join('')}</div>
        <div class="row"><input class="input" id="tmin" type="number" min="0.1" step="0.5" placeholder="min" style="width:80px"><input class="input" id="tlab" placeholder="Etykieta (opcjonalnie)"></div>
        <div class="row" style="margin-top:10px;justify-content:center"><button class="btn primary" id="tgo">Start</button><button class="btn ghost" id="tstop">Stop</button></div>`;
      $$('.chip', tv).forEach(b => b.onclick = () => { J.timer.start(+b.dataset.min * 60, $('#tlab', tv).value || 'Minutnik ' + b.dataset.min + ' min'); J.action('timer'); });
      $('#tgo', tv).onclick = () => { const m = parseFloat($('#tmin', tv).value); if (!(m > 0)) return J.toast('Podaj liczbę minut'); J.timer.start(Math.round(m * 60), $('#tlab', tv).value || 'Minutnik'); J.action('timer'); };
      $('#tstop', tv).onclick = () => J.timer.stop();
      upTimer();
    };
    const upTimer = () => {
      if (mode !== 'timer') return;
      const td = $('#td', tv); if (!td) return;
      const t = J.timer, left = t.running ? t.left() : 0;
      td.textContent = t.running ? t.fmt(left) : '00:00';
      $('#tl', tv).textContent = t.running ? t.label : 'wybierz czas';
      $('#tfg', tv).setAttribute('stroke-dashoffset', t.running && t.total ? C * (1 - left / t.total) : 0);
    };
    const swTime = () => swAcc + (swRun ? Date.now() - swStart : 0);
    const swFmt = ms => J.pad(Math.floor(ms / 60000)) + ':' + J.pad(Math.floor(ms / 1000) % 60) + '.' + J.pad(Math.floor(ms / 10) % 100);
    const drawSw = () => {
      tv.innerHTML = `<div class="timer-disp" id="sd" style="margin:40px 0 20px">00:00.00</div>
        <div class="row" style="justify-content:center"><button class="btn primary" id="ss">${swRun ? 'Pauza' : 'Start'}</button><button class="btn ghost" id="sl">Okrążenie</button><button class="btn ghost" id="sr">Reset</button></div>
        <div class="tasks" id="laps" style="margin-top:14px"></div>`;
      $('#ss', tv).onclick = () => { if (swRun) { swAcc += Date.now() - swStart; swRun = false; } else { swStart = Date.now(); swRun = true; } $('#ss', tv).textContent = swRun ? 'Pauza' : 'Start'; };
      $('#sl', tv).onclick = () => { if (!swRun) return; laps.unshift(swTime()); renderLaps(); };
      $('#sr', tv).onclick = () => { swAcc = 0; swRun = false; laps = []; $('#ss', tv).textContent = 'Start'; renderLaps(); };
      renderLaps();
    };
    const renderLaps = () => { const l = $('#laps', tv); if (l) l.innerHTML = laps.map((t, i) => `<div class="task"><span class="t">#${laps.length - i}</span><span class="n" style="font-family:var(--mono)">${swFmt(t)}</span></div>`).join(''); };
    const raf = () => { if (!alive) return; if (mode === 'sw') { const sd = $('#sd', tv); if (sd) sd.textContent = swFmt(swTime()); } requestAnimationFrame(raf); };
    let alive = true; ctx.onClose(() => alive = false);
    const setMode = m => { mode = m; $$('.seg button', body).forEach(x => x.classList.toggle('on', x.dataset.m === m)); mode === 'timer' ? drawTimer() : drawSw(); J.emit('app-view'); };
    $$('.seg button', body).forEach(b => b.onclick = () => setMode(b.dataset.m));
    sub(ctx, 'timer', upTimer);
    ctx.setMode = setMode;
    ctx.state = () => ({ view: mode === 'sw' ? 'stopwatch' : 'timer', label: mode === 'sw' ? 'stoper' : 'minutnik' });
    drawTimer(); raf();
    const va = viewOf(arg); if (va?.view === 'stopwatch') ctx.setMode('sw');
  }
};

/* ---------- USTAWIENIA ---------- */
J.apps.settings = {
  title: 'Ustawienia', icon: 'settings', minW: 380, minH: 420, w: 460, h: 560,
  onArg(arg, ctx) { const v = viewOf(arg); ctx?.goSection?.(v ? v.target : arg); J.emit('app-view'); },
  state: ctx => ctx?.state?.() || null,
  mount(body, ctx, arg) {
    const s = J.state.settings;
    const walls = [['photo', 'Miasto nocą', "url('assets/wallpaper.jpg')"], ['aurora', 'Aurora', 'linear-gradient(135deg,#1b1147,#0b3b5a)'], ['void', 'Pustka', 'radial-gradient(circle,#0a1a30,#01040a)']];
    body.innerHTML = `
      <div class="label">OpenRouter · jeden klucz dla mózgu i sędziego ${icon('key', 'width="11" height="11" style="vertical-align:-1px"')}</div>
      <div class="card col or-card">
        <div class="row"><input class="input" id="orKey" type="password" placeholder="Wklej klucz OpenRouter (sk-or-v1-…)" autocomplete="off" spellcheck="false"><button class="btn sm ghost" id="orEye" title="Pokaż / ukryj">👁</button></div>
        <label class="toggle" style="padding-top:2px"><div>Mózg: Hermes 4 przez OpenRouter<small>Model <code>nousresearch/hermes-4-70b</code> (natywne tool_calls), zamiast lokalnego Hermes Agent</small></div><span class="switch"><input type="checkbox" id="orBrain"><i></i></span></label>
        <label class="toggle"><div>Sędzia: Jev (TypeSafe „System One”)<small>Intencja, ryzyko, dwuznaczność, weryfikacja w ~200 ms</small></div><span class="switch"><input type="checkbox" id="orJudge"><i></i></span></label>
        <div class="row"><button class="btn primary" id="orTest">Zapisz i testuj</button><a class="btn ghost" href="https://openrouter.ai/keys" target="_blank" rel="noopener">Pobierz klucz</a><button class="btn ghost danger" id="orDel" style="margin-left:auto">Usuń</button></div>
        <div class="dim" id="orInfo" style="font-size:10.5px;line-height:1.55"></div>
      </div>
      <div class="label">Kolor akcentu</div><div class="swatches" id="sw"></div>
      <div class="label">Tapeta</div><div class="walls" id="wl"></div>
      <div class="label">Interfejs</div>
      <label class="toggle"><div>Cząsteczki i sieć neuronowa<small>Animowane tło reagujące na kursor</small></div><span class="switch"><input type="checkbox" data-k="particles"><i></i></span></label>
      <label class="toggle"><div>Dźwięki interfejsu<small>Syntezowane efekty audio</small></div><span class="switch"><input type="checkbox" data-k="sound"><i></i></span></label>
      <label class="toggle"><div>Jarvis mówi na głos<small>Odpowiedzi odczytywane syntezatorem mowy</small></div><span class="switch"><input type="checkbox" data-k="speech"><i></i></span></label>
      <label class="toggle"><div>Pomiń animację startową<small>Szybsze uruchamianie</small></div><span class="switch"><input type="checkbox" data-k="skipBoot"><i></i></span></label>
      <div class="row" style="font-size:11.5px"><span style="flex:1">Skala interfejsu<small class="dim" id="usV" style="margin-left:6px"></small></span><input type="range" id="uiScale" min="80" max="130" step="5" style="width:170px"></div>
      <div class="row" style="font-size:11.5px"><span style="flex:1">Tryb startowy przestrzeni</span><select class="input" id="startMode" style="width:170px"><option value="work">praca (okna)</option><option value="clean">czysty pulpit</option><option value="focus">skupienie</option></select></div>
      <label class="toggle"><div>Tryb bez sieci<small>Żadnych wywołań internetu (Hermes, Jev, pogoda, kursy) — działa parser i dane lokalne</small></div><span class="switch"><input type="checkbox" data-k="offlineMode"><i></i></span></label>
      <div class="label">Głos</div><select class="input" id="vs"></select>
      <div class="row" style="font-size:11.5px"><span style="flex:1">Tempo mowy</span><input type="range" id="spRate" min="0.7" max="1.5" step="0.05" style="width:150px"></div>
      <div class="row" style="font-size:11.5px"><span style="flex:1">Język rozpoznawania mowy</span><select class="input" id="sttLang" style="width:150px"><option value="pl-PL">polski</option><option value="en-US">angielski</option></select></div>
      <div class="label">Użytkownik</div><div class="row"><input class="input" id="un" maxlength="3" placeholder="Inicjały" style="width:90px"><input class="input" id="city" placeholder="Miasto (pogoda)"><button class="btn" id="cityGo">Zapisz</button></div>
      <div class="label">Hermes · Nous Research ${icon('key', 'width="11" height="11" style="vertical-align:-1px"')}</div>
      <div class="card col">
        <label class="toggle" style="padding-top:0"><div>Mózg Jarvisa: Hermes<small>Wyłączone = tylko lokalny silnik poleceń</small></div><span class="switch"><input type="checkbox" id="hOn"><i></i></span></label>
        <select class="input" id="hProv">${Object.entries(J.HERMES_PRESETS).map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join('')}</select>
        <input class="input" id="hUrl" placeholder="Adres API, np. http://localhost:8642/v1" spellcheck="false">
        <div class="row"><input class="input" id="hModel" placeholder="Model" list="hModels" spellcheck="false"><datalist id="hModels"></datalist><button class="btn ghost" id="hList" title="Pobierz listę modeli">${icon('refresh', 'width="12" height="12"')}</button></div>
        <input class="input" id="hKey" type="password" placeholder="Klucz API (API_SERVER_KEY / Nous Portal; dla OpenRouter zostaw puste — użyty będzie klucz z sekcji OpenRouter)" autocomplete="off">
        <div class="row"><button class="btn primary" id="hTest">Połącz i testuj</button><button class="btn ghost danger" id="hDel">Usuń klucz</button></div>
        <div class="dim" id="hInfo" style="font-size:10.5px;line-height:1.5"></div>
        <div class="muted" id="hHelp" style="font-size:10.5px;line-height:1.55"></div>
        <div class="row" style="font-size:11.5px"><span style="flex:1">Koszt odpowiedzi<small class="dim" style="display:block;font-size:10px">tani = lżejszy model zawsze · zrównoważony = lżejszy tylko do rozmowy · najlepszy = zawsze główny</small></span><select class="input" id="hPreset" style="width:150px"><option value="cheap">tani</option><option value="balanced">zrównoważony</option><option value="max">najlepszy</option></select></div>
        <div class="row" style="font-size:11.5px"><span style="flex:1">Dzienny limit (USD, OpenRouter; 0 = bez)<small class="dim" id="hDayUsed" style="display:block;font-size:10px"></small></span><input class="input" id="hDaily" type="number" min="0" max="50" step="0.1" style="width:80px"></div>
      </div>
      <div class="label">Agent i proaktywność</div>
      <div class="card col">
        <label class="toggle" style="padding-top:0"><div>Czuwanie ze słowem „Jarvis”<small>Nasłuch ciągły: powiedz „Jarvis, …” (Chrome / Edge)</small></div><span class="switch"><input type="checkbox" id="aWake"><i></i></span></label>
        <label class="toggle"><div>Cichy tryb głosowy<small>Polecenia głosowe nie otwierają panelu czatu</small></div><span class="switch"><input type="checkbox" data-k="silentVoice"><i></i></span></label>
        <div class="row"><div style="flex:1;font-size:12px">Proaktywność<small class="dim" style="display:block;font-size:10px">cicha = sygnały w następnej rozmowie · aktywna = Jarvis sam zaczyna rozmowę</small></div><select class="input" id="aPro" style="width:130px"><option value="quiet">cicha</option><option value="active">aktywna</option></select></div>
        <div class="row"><div style="flex:1;font-size:12px">Cisza nocna<small class="dim" style="display:block;font-size:10px">bez aktywnych sygnałów i rutyn</small></div><input class="input" type="time" id="aQf" style="width:100px"><span class="dim">–</span><input class="input" type="time" id="aQt" style="width:100px"></div>
        <div class="row"><div style="flex:1;font-size:12px">Poranny briefing<small class="dim" style="display:block;font-size:10px">pogoda, zadania, alerty (wymaga Hermesa)</small></div><input class="input" type="time" id="aBr" style="width:100px"><button class="btn sm ghost" id="aBrNow" title="Uruchom teraz">▶</button></div>
        <div class="row"><div style="flex:1;font-size:12px">Podsumowanie dnia</div><input class="input" type="time" id="aSu" style="width:100px"><button class="btn sm ghost" id="aSuNow" title="Uruchom teraz">▶</button></div>
        <div class="row"><div style="flex:1;font-size:12px">Format narzędzi Hermesa<small class="dim" style="display:block;font-size:10px">auto wykrywa przy „Połącz i testuj”</small></div><select class="input" id="aFmt" style="width:130px"><option value="auto">auto</option><option value="hermes">&lt;tool_call&gt;</option><option value="openai">tool_calls</option></select></div>
        <div class="row"><div style="flex:1;font-size:12px">Zawsze dozwolone bez pytania<small class="dim" id="aAllow" style="display:block;font-size:10px"></small></div><button class="btn sm ghost" id="aAllowClr">Wyczyść</button></div>
      </div>
      <div class="label">Sędzia Jev · OpenRouter ${icon('bolt', 'width="11" height="11" style="vertical-align:-1px"')}</div>
      <div class="card col">
        <label class="toggle" style="padding-top:0"><div>Decyzje przez Jev (TypeSafe „System One”)<small>Intencja, ryzyko, dwuznaczność, weryfikacja odpowiedzi, pilność sygnałów — w ~200 ms, ułamki centa</small></div><span class="switch"><input type="checkbox" id="jvOn"><i></i></span></label>
        <input class="input" id="jvKey" type="password" placeholder="Klucz OpenRouter (sk-or-v1-…)" autocomplete="off">
        <div class="row"><select class="input" id="jvModel">${J.judge.MODELS.map(m => `<option value="${m}">${m}</option>`).join('')}</select><button class="btn primary" id="jvTest">Połącz i testuj</button></div>
        <div class="row" style="font-size:11px"><span style="flex:1">Wykonaj bez pytania od</span><input class="input" id="jvExec" type="number" min="0.5" max="1" step="0.05" style="width:80px"><span style="flex:1;text-align:right">Zapytaj od</span><input class="input" id="jvAsk" type="number" min="0.1" max="1" step="0.05" style="width:80px"></div>
        <div class="row" style="font-size:11px"><span style="flex:1">Co wysyłać do Jeva (prywatność)</span><select class="input" id="jvPrivacy" style="width:210px"><option value="P0">P0 · tylko Twoje zdanie</option><option value="P1">P1 · + aplikacje, okna, dzisiejsze zadania</option><option value="P2">P2 · + tytuły notatek i profil</option></select></div>
        <div class="row" style="font-size:11px"><span style="flex:1">Samodzielność Jeva</span><select class="input" id="jvAuto" style="width:210px"><option value="auto">odczyty i cofalne zapisy — sam</option><option value="reads">tylko odczyty — sam</option><option value="ask">zawsze pytaj „Chodzi o…?”</option></select></div>
        <div class="row" style="font-size:11px"><span style="flex:1">Odczyty sam od</span><input class="input" id="jvA3" type="number" min="0.5" max="1" step="0.05" style="width:80px"><span style="flex:1;text-align:right">Zapisy z „Cofnij” od</span><input class="input" id="jvA2" type="number" min="0.5" max="1" step="0.01" style="width:80px"></div>
        <div class="row" style="font-size:11px"><span style="flex:1">Budżet miesięczny (USD, 0 = bez limitu)</span><input class="input" id="jvBudget" type="number" min="0" max="100" step="0.5" style="width:80px"></div>
        <div class="row" style="font-size:11px"><span style="flex:1">Lżejszy model dla zwykłej rozmowy<small class="dim" style="display:block;font-size:10px">puste = ten sam co mózg</small></span><input class="input" id="jvLite" placeholder="np. nousresearch/hermes-4-70b" style="width:210px"></div>
        <label class="toggle"><div>Szybka ścieżka<small>Pewne odczyty i nawigację wykonuje parser bez czekania na Jeva</small></div><span class="switch"><input type="checkbox" id="jvFast"><i></i></span></label>
        <label class="toggle"><div>Tryb cienia<small>Jev tylko liczy i zapisuje wynik do dziennika; niczego nie zmienia (do porównania z parserem)</small></div><span class="switch"><input type="checkbox" id="jvShadow"><i></i></span></label>
        <label class="toggle"><div>Zapisuj treść zdań w dzienniku<small>Domyślnie tylko skrót zdania. Dziennik zostaje w tej przeglądarce</small></div><span class="switch"><input type="checkbox" id="jvLogText"><i></i></span></label>
        <div class="row"><button class="btn sm ghost" id="jvExport">${icon('download', 'width="12" height="12"')} Dziennik decyzji</button><button class="btn sm ghost" id="jvResetAdapt" title="Wyzerowuj podniesione progi po odrzuceniach">Zresetuj uczenie się</button><button class="btn sm ghost danger" id="jvClearLog">Wyczyść dziennik</button></div>
        <div class="dim" id="jvStats" style="font-size:10.5px;line-height:1.6"></div>
        <div class="dim" id="jvInfo" style="font-size:10.5px;line-height:1.5"></div>
      </div>
      <div class="label">Powiadomienia</div>
      <div class="card col" id="ntBox"><div class="dim" style="font-size:10.5px">Wyłączony kanał trafia tylko do centrum powiadomień (bez dymka i dźwięku). Limit = ile dymków na godzinę.</div><div id="ntList" class="col"></div></div>
      <div class="label">Skróty klawiszowe</div>
      <div class="card col"><div class="dim" style="font-size:10.5px">Kliknij pole i naciśnij nową kombinację (z Ctrl albo Alt). Esc — anuluj. Skróty przeglądarki są zablokowane.</div><div id="kbList" class="col"></div><div class="row"><button class="btn sm ghost" id="kbReset">Przywróć domyślne skróty</button></div></div>
      <div class="label">Układy okien</div>
      <div class="card col"><div class="row" style="font-size:11.5px"><span style="flex:1">Układ przy starcie</span><select class="input" id="layStart" style="width:170px"></select></div><div id="layList" class="col"></div><div class="row"><button class="btn sm ghost" id="laySave">Zapisz bieżący układ…</button></div></div>
      <div class="label">Pamięć Jarvisa</div>
      <div class="card col" id="memBox"><div class="dim" style="font-size:10.5px">Fakty zapamiętane poleceniem „zapamiętaj, że…” trafiają do kontekstu każdej rozmowy.</div><div id="memList" class="col"></div></div>
      <div class="label">Folder roboczy (pliki)</div>
      <div class="card col"><div class="row"><span id="fsInfo" class="dim" style="flex:1;font-size:11px"></span><button class="btn sm" id="fsPick">Wybierz folder</button><button class="btn sm ghost" id="fsPerm" title="Odśwież uprawnienia">Odśwież dostęp</button></div></div>
      <div class="label">Dane</div>
      <div class="row"><button class="btn ghost" id="exp">${icon('download', 'width="12" height="12"')} Eksportuj</button><label class="btn ghost" style="cursor:pointer">Importuj<input type="file" id="imp" accept=".json" hidden></label><button class="btn ghost danger" id="rst" style="margin-left:auto">Resetuj wszystko</button></div>
      <div class="card col" style="margin-top:8px"><div class="row" style="font-size:11.5px"><b style="flex:1">Co jest zapisane w tej przeglądarce</b><button class="btn sm ghost" id="stoRefresh">Odśwież</button></div><div id="stoList" class="col" style="font-size:11px"></div></div>
      <div class="label">O programie</div>
      <div class="card col">
        <div style="font-size:11.5px">Jarvis OS 2.1 · specyfikacja i plan: <code>docs/spec</code></div>
        <div class="row"><button class="btn sm primary" id="diagRun">Testy diagnostyczne</button><button class="btn sm ghost" id="tourRun">Pokaż samouczek</button><button class="btn sm ghost" id="keysShow">Skróty (?)</button></div>
        <div id="diagOut" class="col" style="font-size:11px"></div>
        <label class="toggle"><div>Nakładka diagnostyczna<small>Alt Shift D: pakiet kontekstu, ostatnia decyzja Jeva, FPS, stos „Cofnij”</small></div><span class="switch"><input type="checkbox" id="dbgOverlay"><i></i></span></label>
        <div class="dim" style="font-size:10.5px">Eksperymenty (flagi funkcji) — wyłącz funkcję, jeśli sprawia kłopot:</div><div id="flagList" class="col"></div>
      </div>
      <div class="dim" style="font-size:10px;margin-top:14px;text-align:center">Jarvis OS 2.1 · <kbd>Ctrl K</kbd> paleta · <kbd>Ctrl Spacja</kbd> głos · <kbd>?</kbd> wszystkie skróty · <kbd>Esc</kbd> zamknij</div>`;
    /* nawigacja po sekcjach (polecenie „otwórz ustawienia Jev”): etykiety dostają identyfikatory, okno przewija się do wybranej */
    const SEC = [['openrouter', /^openrouter/], ['akcent', /^kolor akcentu/], ['tapeta', /^tapeta/], ['interfejs', /^interfejs/], ['glos', /^glos/], ['uzytkownik', /^uzytkownik/], ['hermes', /^hermes/], ['agent', /^agent i proaktywnosc/], ['jev', /^sedzia jev/], ['powiadomienia', /^powiadomienia/], ['skroty', /^skroty klawiszowe/], ['uklady', /^uklady okien/], ['pamiec', /^pamiec/], ['pliki', /^folder roboczy/], ['dane', /^dane/], ['oprogramie', /^o programie/]];
    $$('.label', body).forEach(l => { const hit = SEC.find(([, re]) => re.test(J.norm(l.textContent))); if (hit) l.dataset.sec = hit[0]; });
    /* pasek sekcji + wyszukiwanie pól (docs/spec/10-ustawienia.md §1) */
    { const nav = h('div', { class: 'set-nav' }, '<input class="input" id="setFind" placeholder="Szukaj w ustawieniach…"><div class="set-chips"></div>'); body.prepend(nav);
      const labels = { openrouter: 'Konto AI', akcent: 'Kolor', tapeta: 'Tapeta', interfejs: 'Interfejs', glos: 'Głos', uzytkownik: 'Użytkownik', hermes: 'Hermes', agent: 'Agent', jev: 'Jev', powiadomienia: 'Powiadomienia', skroty: 'Skróty', uklady: 'Układy', pamiec: 'Pamięć', pliki: 'Pliki', dane: 'Dane', oprogramie: 'O programie' };
      const chips = $('.set-chips', nav); Object.entries(labels).forEach(([k, t]) => { const b = h('button', { class: 'chip' }); b.textContent = t; b.onclick = () => ctx.goSection(k); chips.appendChild(b); });
      $('#setFind', nav).oninput = e => { const q = J.norm(e.target.value.trim()); $$('.set-hit', body).forEach(x => x.classList.remove('set-hit')); if (q.length < 2) return; const el = [...$$('.label, .toggle, .row, .card > div', body)].find(x => J.norm(x.textContent).includes(q)); if (el) { el.classList.add('set-hit'); el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); } }; }
    const goSection = sec => { const l = $('[data-sec="' + sec + '"]', body); if (!l) return false; l.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); l.classList.remove('hl'); void l.offsetWidth; l.classList.add('hl'); setTimeout(() => l.classList.remove('hl'), 2200); return true; };
    let secNow = null; ctx.goSection = sec => { const r = goSection(sec); if (r !== false) secNow = sec; return r; };
    ctx.state = () => secNow ? { view: 'section', target: secNow, label: secNow } : null;
    { const va = viewOf(arg), sec = va ? va.target : arg; if (sec) setTimeout(() => ctx.goSection(sec), 80); }
    const sw = $('#sw', body);
    const drawSw = () => { sw.innerHTML = ''; Object.entries(J.THEMES).forEach(([n, [a, b]]) => { const e = h('button', { class: 'swatch' + (s.accent === a ? ' on' : ''), title: n, style: `background:linear-gradient(135deg,${a},${b});color:${a}` }); e.onclick = () => { s.accent = a; s.accent2 = b; J.applyTheme(); J.save(); J.emit('settings'); drawSw(); J.sfx.click(); }; sw.appendChild(e); }); };
    drawSw();
    const wl = $('#wl', body);
    const drawWl = () => { wl.innerHTML = ''; walls.forEach(([k, n, bg]) => { const e = h('button', { class: 'wall' + (s.wall === k ? ' on' : ''), style: `background-image:${bg}` }, n); e.onclick = () => { s.wall = k; J.applyTheme(); J.save(); drawWl(); J.sfx.click(); }; wl.appendChild(e); }); };
    drawWl();
    $$('input[data-k]', body).forEach(i => { i.checked = !!s[i.dataset.k]; i.onchange = () => { s[i.dataset.k] = i.checked; J.save(); J.emit('settings'); J.sfx.click(); }; });
    /* Hermes: preset kosztu i dzienny limit */
    { const hp = $('#hPreset', body), hd = $('#hDaily', body), hu = $('#hDayUsed', body); if (hp) { hp.value = s.hermesPreset || 'balanced'; hp.onchange = () => { s.hermesPreset = hp.value; J.save(); }; hd.value = s.hermesDailyBudget || 0; hd.onchange = () => { s.hermesDailyBudget = J.clamp(+hd.value || 0, 0, 50); J.save(); }; hu.textContent = 'dziś: $' + (J.hermesBudget?.used() || 0).toFixed(4); } }
    /* dziennik zgód */
    { const al = $('#aAllow', body); if (al) { const b = h('button', { class: 'btn sm ghost', style: 'margin-left:6px' }, 'Dziennik zgód'); b.onclick = async () => { const l = (await J.store.get('consent.log', [])).slice(-15).reverse(); J.ask(l.length ? l.map(x => new Date(x.ts).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' · ' + x.label + ' (' + x.source + (x.forced ? ', wymuszona' : '') + ') → ' + ({ yes: 'tak', no: 'nie', always: 'zawsze', timeout: 'brak odpowiedzi' }[x.answer] || x.answer)).join('\n') : 'Dziennik zgód jest pusty.', [{ label: 'OK', value: 'ok', primary: true }], { speak: false, timeout: 120000 }); }; $('#aAllowClr', body)?.after(b); } }
    /* interfejs, głos */
    const us = $('#uiScale', body), usV = $('#usV', body); if (us) { us.value = s.uiScale || 100; usV.textContent = us.value + '%'; us.oninput = () => { usV.textContent = us.value + '%'; }; us.onchange = () => J.uiRun('ui_scale', { percent: +us.value }, { offer: false }); }
    const sm = $('#startMode', body); if (sm) { sm.value = s.startMode || 'work'; sm.onchange = () => { s.startMode = sm.value; J.save(); J.emit('settings'); }; }
    const sr = $('#spRate', body); if (sr) { sr.value = s.speechRate || 1; sr.onchange = () => { s.speechRate = +sr.value; J.save(); J.voice.speak('Tak brzmi nowe tempo mowy.', { force: true, replace: true }); }; }
    const sl = $('#sttLang', body); if (sl) { sl.value = s.sttLang || 'pl-PL'; sl.onchange = () => { s.sttLang = sl.value; J.save(); }; }
    /* powiadomienia */
    const CH = { task: 'Zadania i przypomnienia', timer: 'Minutnik', market: 'Rynek (alerty kursów)', network: 'Sieć', agent: 'Agent (Jarvis sam z siebie)', files: 'Pliki', hermes: 'Hermes i Jev', routine: 'Rutyny' };
    const drawNt = () => { const box = $('#ntList', body); if (!box) return; box.innerHTML = ''; Object.entries(CH).forEach(([k, t]) => { const c = J.notifChannel(k); const r = h('div', { class: 'row', style: 'font-size:11.5px' }, '<span style="flex:1"></span><label class="mini"><input type="checkbox" data-f="on"> pokazuj</label><label class="mini"><input type="checkbox" data-f="sound"> dźwięk</label><input class="input" type="number" min="0" max="60" data-f="perHour" style="width:58px" title="limit na godzinę">'); r.children[0].textContent = t; $('[data-f=on]', r).checked = c.on; $('[data-f=sound]', r).checked = c.sound; $('[data-f=perHour]', r).value = c.perHour; $$('input', r).forEach(inp => inp.onchange = () => J.uiRun('notif_channel', { kind: k, on: $('[data-f=on]', r).checked, sound: $('[data-f=sound]', r).checked, per_hour: J.clamp(+$('[data-f=perHour]', r).value || 0, 0, 60) }, { offer: false })); box.appendChild(r); }); };
    drawNt();
    /* skróty klawiszowe: kliknij pole i naciśnij kombinację */
    const drawKb = () => { const box = $('#kbList', body); if (!box || !J.KEY_ACTIONS) return; box.innerHTML = ''; Object.entries(J.KEY_ACTIONS).forEach(([id, a]) => { const cur = s.keys?.[id] || a.def; const r = h('div', { class: 'row', style: 'font-size:11.5px' }, '<span style="flex:1"></span><button class="btn sm ghost kb-key"></button><button class="btn sm ghost" title="Domyślny">↺</button>'); r.children[0].textContent = a.label; const kb = r.children[1]; kb.textContent = cur; r.children[2].onclick = () => J.uiRun('keys_set', { action: id, keys: 'reset' }, { offer: false }).then(drawKb);
      kb.onclick = () => { kb.textContent = 'naciśnij…'; kb.classList.add('rec'); const on = e => { e.preventDefault(); e.stopPropagation(); if (e.key === 'Escape') { done(); return; } if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return; const combo = [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : '', e.code === 'Space' ? 'Space' : /^Digit\d$/.test(e.code) ? e.code.slice(5) : e.key.length === 1 ? e.key.toUpperCase() : e.key].filter(Boolean).join('+'); done(); J.uiRun('keys_set', { action: id, keys: combo }, { offer: false }).then(drawKb); }; const done = () => { removeEventListener('keydown', on, true); kb.classList.remove('rec'); kb.textContent = s.keys?.[id] || a.def; }; addEventListener('keydown', on, true); };
      box.appendChild(r); }); };
    setTimeout(drawKb, 0); $('#kbReset', body).onclick = () => J.uiRun('keys_set', { action: 'all', keys: 'reset' }).then(drawKb);
    /* układy okien */
    const drawLay = () => { const box = $('#layList', body), st = $('#layStart', body); if (!box) return; box.innerHTML = ''; const saved = Object.entries(J.state.layouts || {}); if (!saved.length) box.innerHTML = '<div class="dim" style="font-size:11px">Brak zapisanych układów. Presety: ' + J.layouts.presets().join(', ') + '.</div>';
      saved.forEach(([name, l]) => { const r = h('div', { class: 'row', style: 'font-size:11.5px' }, '<span style="flex:1"><b></b> <small class="dim"></small></span><button class="btn sm ghost">Zastosuj</button><button class="btn sm ghost">Nazwa</button><button class="btn sm ghost danger">×</button>'); $('b', r).textContent = name; $('small', r).textContent = l.apps.map(a => J.APP_NAMES[a.id] || a.id).join(', '); const [ap, rn, rm] = $$('button', r); ap.onclick = () => J.uiRun('wm_arrange', { mode: 'layout', layout: name }); rn.onclick = () => { const n = prompt('Nowa nazwa układu:', name); if (n && n.trim()) J.uiRun('layout_rename', { name, to: n.trim() }).then(drawLay); }; rm.onclick = () => J.uiRun('layout_remove', { name }).then(drawLay); box.appendChild(r); });
      st.innerHTML = ''; [['none', 'bez układu'], ['last', 'okna z poprzedniej sesji'], ...J.layouts.list().map(n => [n, n])].forEach(([v, t]) => { const o = h('option', { value: v }); o.textContent = t; st.appendChild(o); }); st.value = s.layoutStartup || 'none'; st.onchange = () => J.uiRun('layout_startup', { name: st.value }, { offer: false }); };
    drawLay(); $('#laySave', body).onclick = () => { const n = prompt('Nazwa układu:'); if (n && n.trim()) J.uiRun('layout_save', { name: n.trim() }).then(drawLay); };
    sub(ctx, 'settings', () => { drawNt(); });
    /* co jest zapisane */
    const drawSto = async () => { const box = $('#stoList', body); if (!box) return; box.innerHTML = '<div class="dim">Liczę…</div>'; const rows = []; try { rows.push(['localStorage: stan (ustawienia, notatki, zadania, widgety…)', (localStorage.getItem('jarvis-os:v2') || '').length]); } catch (e) { }
      for (const k of ['chat.history', 'chat.items', 'chat.summary', 'memory.facts', 'proc.history', 'jev.log', 'signals.log', 'consent.log', 'widgets.cache']) { try { const v = await J.store.get(k, null); if (v != null) rows.push(['IndexedDB: ' + k, JSON.stringify(v).length]); } catch (e) { } }
      box.innerHTML = ''; rows.forEach(([t, n]) => { const r = h('div', { class: 'row' }, '<span style="flex:1"></span><span class="dim"></span>'); r.children[0].textContent = t; r.children[1].textContent = n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B'; box.appendChild(r); }); };
    $('#stoRefresh', body).onclick = drawSto; drawSto();
    /* o programie: testy diagnostyczne, samouczek, nakładka, flagi */
    $('#diagRun', body).onclick = async () => { const out = $('#diagOut', body); out.innerHTML = '<div class="dim">Sprawdzam…</div>'; const l = await J.diagnostics(); out.innerHTML = ''; l.forEach(([ok, t, d]) => { const r = h('div', { class: 'row' }, '<span></span><span style="flex:1"></span>'); r.children[0].textContent = ok ? '✓' : '✗'; r.children[0].style.color = ok ? 'var(--ok)' : 'var(--err)'; r.children[1].textContent = t + (d ? ' — ' + d : ''); out.appendChild(r); }); const cp = h('button', { class: 'btn sm ghost' }, 'Kopiuj raport'); cp.onclick = () => navigator.clipboard?.writeText(l.map(([o, t, d]) => (o ? '✓ ' : '✗ ') + t + (d ? ' — ' + d : '')).join('\n')).then(() => J.toast('Skopiowano raport')); out.appendChild(cp); };
    $('#tourRun', body).onclick = () => J.tour?.(true);
    $('#keysShow', body).onclick = () => J.keysHelp?.();
    const dbg = $('#dbgOverlay', body); dbg.checked = !!J.state.ui.debugOverlay; dbg.onchange = () => J.debugOverlay?.(dbg.checked);
    const FLAGS = { w1_windows: 'Okna: uchwyty, przypinanie, menu okna', w2_search: 'Wyszukiwanie wszędzie w palecie', w2_modes: 'Tryby przestrzeni', w2_threads: 'Wątki czatu', w3_notes: 'Notatki: kosz, wersje, tagi', w3_tasks: 'Zadania: powtarzanie, priorytety', w4_widget_spec: 'Widgety z opisu', w4_routines: 'Rutyny', w5_fx: 'Efekty (poziom)' };
    const fl = $('#flagList', body); Object.entries(FLAGS).forEach(([k, t]) => { const r = h('label', { class: 'toggle' }, '<div></div><span class="switch"><input type="checkbox"><i></i></span>'); r.children[0].textContent = t; const c = $('input', r); c.checked = J.flag(k); c.onchange = () => { s.flags = { ...(s.flags || {}), [k]: c.checked }; J.save(); J.emit('settings'); J.toast('Zmiana zadziała w pełni po odświeżeniu strony.'); }; fl.appendChild(r); });
    const vs = $('#vs', body);
    const fillVoices = () => { const v = J.voice.list(); vs.innerHTML = '<option value="">Automatyczny (polski)</option>' + v.map(x => `<option ${x.name === s.voiceName ? 'selected' : ''} value="${esc(x.name)}">${esc(x.name)} · ${esc(x.lang)}</option>`).join(''); };
    fillVoices(); setTimeout(fillVoices, 600);
    vs.onchange = () => { s.voiceName = vs.value; J.save(); const was = s.speech; s.speech = true; J.voice.speak('Tak brzmi mój głos.'); s.speech = was; };
    $('#un', body).value = s.user; $('#city', body).value = s.city;
    $('#un', body).oninput = e => { s.user = e.target.value.toUpperCase() || 'JD'; J.save(); J.emit('settings'); };
    $('#cityGo', body).onclick = async () => { const c = $('#city', body).value.trim(); if (!c) return; try { const g = await J.weather.geocode(c); Object.assign(s, { city: g.city, lat: g.lat, lon: g.lon }); J.save(); J.weather.ts = 0; await J.weather.fetch(); J.toast('Lokalizacja: ' + g.city); } catch (e) { J.toast(e.message); } };
    const hOn = $('#hOn', body), hProv = $('#hProv', body), hUrl = $('#hUrl', body), hModel = $('#hModel', body), hKey = $('#hKey', body), hInfo = $('#hInfo', body), hHelp = $('#hHelp', body);
    const fillH = () => { hOn.checked = !!s.hermesOn; hProv.value = s.hermesProvider; hUrl.value = s.hermesUrl; hModel.value = s.hermesModel; hKey.value = s.hermesKey; };
    const help = () => {
      hInfo.textContent = s.hermesOn ? 'Aktywne: ' + s.hermesModel + ' @ ' + s.hermesUrl + (s.hermesKey ? ' · klucz zapisany' : ' · bez klucza') : 'Wyłączone — działa lokalny silnik poleceń.';
      hHelp.innerHTML = s.hermesProvider === 'agent'
        ? `Uruchom Hermes Agent z włączonym serwerem API. W <code>~/.hermes/.env</code>:<br><code>API_SERVER_ENABLED=true</code><br><code>API_SERVER_KEY=twój-klucz</code><br><code>API_SERVER_CORS_ORIGINS=${esc(location.origin)}</code><br>potem <code>hermes gateway</code> i wpisz ten sam klucz powyżej.`
        : s.hermesProvider === 'portal' ? 'Klucz API z <b>portal.nousresearch.com</b>. Modele Hermes: Hermes-4-405B, Hermes-4-70B.'
        : 'Dowolny serwer zgodny z OpenAI z modelem Hermes, np. Ollama: <code>ollama pull hermes3</code>, uruchom z <code>OLLAMA_ORIGINS=' + esc(location.origin) + '</code>.';
    };
    const saveH = () => { s.hermesOn = hOn.checked; s.hermesProvider = hProv.value; s.hermesUrl = hUrl.value.trim(); s.hermesModel = hModel.value.trim() || J.HERMES_PRESETS[s.hermesProvider].model; s.hermesKey = hKey.value.trim(); J.save(); J.emit('settings'); help(); };
    fillH(); help();
    hProv.onchange = () => { const p = J.HERMES_PRESETS[hProv.value]; hUrl.value = p.url; hModel.value = p.model; hKey.value = ''; saveH(); J.brain.reset(); };
    hOn.onchange = hUrl.onchange = hModel.onchange = hKey.onchange = () => { saveH(); J.brain.reset(); };
    $('#hDel', body).onclick = () => { hKey.value = ''; saveH(); };
    $('#hList', body).onclick = async () => { saveH(); hInfo.textContent = 'Pobieram modele…'; try { const l = await J.brain.models(); $('#hModels', body).innerHTML = l.map(m => `<option value="${esc(m)}">`).join(''); hInfo.textContent = 'Dostępne modele: ' + (l.join(', ') || 'brak'); } catch (e) { hInfo.textContent = '✗ ' + e.message; } };
    $('#hTest', body).onclick = async () => { hOn.checked = true; saveH(); hInfo.textContent = 'Łączę z Hermesem…'; try { hInfo.textContent = '✓ ' + await J.brain.test(); J.sfx.notify(); J.log('Hermes połączony', s.hermesModel + ' @ ' + s.hermesUrl); } catch (e) { hInfo.textContent = '✗ ' + e.message; J.sfx.error(); } };
    $('#exp', body).onclick = async () => { const data = await J.backup.export(); const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })), download: 'jarvis-os-kopia-' + J.today() + '.json' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); J.toast('Kopia zapisana (bez kluczy API)'); };
    $('#imp', body).onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const d = JSON.parse(await f.text()); const pv = J.backup.preview(d); const mode = await J.ask('Plik zawiera: ' + pv.text + '. Co zrobić?', [{ label: 'Scal z moimi danymi', value: 'merge', primary: true }, { label: 'Zastąp wszystko', value: 'replace', danger: true }, { label: 'Anuluj', value: 'no' }], { speak: false }); if (mode !== 'merge' && mode !== 'replace') return; await J.backup.import(d, mode); J.toast('Zaimportowano — przeładowuję…'); setTimeout(() => location.reload(), 900); } catch (err) { J.toast('Nie udało się zaimportować: ' + err.message); } };
    $('#rst', body).onclick = async () => { const v = await J.ask('Co wyczyścić?', [{ label: 'Tylko rozmowy', value: 'chat' }, { label: 'Tylko dziennik Jeva', value: 'jevlog' }, { label: 'Pozycje okien', value: 'windows' }, { label: 'Wszystko', value: 'all', danger: true }, { label: 'Anuluj', value: 'no' }], { speak: false }); if (!v || v === 'no') return; if (v === 'all') { const ok2 = await J.ask('Na pewno usunąć WSZYSTKIE dane Jarvis OS (notatki, zadania, ustawienia, rozmowy)? Tego nie da się cofnąć — zrób wcześniej eksport.', [{ label: 'Usuń wszystko', value: 'yes', danger: true }, { label: 'Anuluj', value: 'no', primary: true }], { speak: false }); if (ok2 === 'yes') J.store.clear().finally(() => J.resetAll()); return; } J.toast(await J.backup.clear(v)); drawSto(); };
    /* agent */
    const aWake = $('#aWake', body); aWake.checked = !!s.wakeWord && J.ear.supported; aWake.disabled = !J.ear.supported; aWake.onchange = () => J.ear.setStandby(aWake.checked);
    sub(ctx, 'settings', () => { aWake.checked = !!J.ear.standby; });
    const aPro = $('#aPro', body); aPro.value = s.proactive || 'quiet'; aPro.onchange = () => { s.proactive = aPro.value; J.save(); J.emit('settings'); J.toast(aPro.value === 'active' ? 'Jarvis będzie sam zaczynał rozmowę przy ważnych sygnałach (max ' + (s.proactiveMax || 4) + '/h)' : 'Sygnały trafią do następnej rozmowy'); };
    const bindT = (id, key, after) => { const el = $('#' + id, body); el.value = s[key] || ''; el.onchange = () => { s[key] = el.value; J.save(); J.emit('settings'); after?.(); }; };
    bindT('aQf', 'quietFrom'); bindT('aQt', 'quietTo'); bindT('aBr', 'briefingTime'); bindT('aSu', 'summaryTime');
    $('#aBrNow', body).onclick = () => J.brain.handle('Rutyna: poranny briefing. Na podstawie kontekstu środowiska (pogoda przez get_weather, zadania na dziś, zaległe, alerty) przygotuj zwięzły briefing dnia w 3–5 zdaniach do odczytania na głos.', { source: 'routine', routine: 'briefing', silentWindow: true });
    $('#aSuNow', body).onclick = () => J.brain.handle('Rutyna: podsumowanie dnia. Sprawdź zadania (tasks_list today) i notatki (notes_list) i podsumuj w 3 zdaniach, co zrobiono, a co przechodzi na jutro.', { source: 'routine', routine: 'summary', silentWindow: true });
    const aFmt = $('#aFmt', body); aFmt.value = s.toolFormat || 'auto'; aFmt.onchange = () => { s.toolFormat = aFmt.value; J.hermes.format = null; J.save(); J.brain.reset(); };
    const drawAllow = () => { const l = J.state.ui.allowAlways || []; $('#aAllow', body).textContent = l.length ? l.map(id => J.registry.get(id)?.label || id).join(', ') : 'brak — ryzykowne narzędzia zawsze pytają'; };
    drawAllow(); $('#aAllowClr', body).onclick = () => { J.state.ui.allowAlways = []; J.save(); drawAllow(); J.sfx.click(); };
    /* OpenRouter: wspólny klucz */
    const orKey = $('#orKey', body), orBrain = $('#orBrain', body), orJudge = $('#orJudge', body), orInfo = $('#orInfo', body);
    const orFill = () => { orKey.value = s.openrouterKey || ''; orBrain.checked = s.hermesOn && s.hermesProvider === 'openrouter'; orJudge.checked = !!s.jevOn && !!(s.jevKey || s.openrouterKey); };
    const orHelp = () => { orInfo.textContent = !s.openrouterKey ? 'Klucz z openrouter.ai/keys. Jeden klucz uruchamia sędziego Jev i (opcjonalnie) mózg na modelach Hermes 4 w chmurze. Klucz zostaje tylko w tej przeglądarce.' : 'Klucz zapisany · mózg: ' + (orBrain.checked ? 'Hermes 4 przez OpenRouter' : (s.hermesOn ? J.HERMES_PRESETS[s.hermesProvider]?.label || s.hermesProvider : 'lokalny silnik')) + ' · sędzia Jev: ' + (J.judge.enabled() ? 'włączony' : 'wyłączony') + (J.judge.status.state === 'up' ? ' (' + J.judge.status.latency + ' ms)' : ''); };
    const orSave = () => {
      s.openrouterKey = orKey.value.trim();
      if (orBrain.checked) { const p = J.HERMES_PRESETS.openrouter; s.hermesOn = true; s.hermesProvider = 'openrouter'; s.hermesUrl = p.url; if (!/^nousresearch\//.test(s.hermesModel || '')) s.hermesModel = p.model; s.hermesKey = ''; J.hermes.format = null; J.brain.reset(); }
      else if (s.hermesProvider === 'openrouter') { s.hermesProvider = 'agent'; s.hermesUrl = J.HERMES_PRESETS.agent.url; s.hermesModel = J.HERMES_PRESETS.agent.model; }
      s.jevOn = orJudge.checked && !!(s.jevKey || s.openrouterKey);
      J.save(); J.emit('settings'); J.hermesPing(); orHelp(); fillH?.(); help?.(); jvFill?.(); jvHelp?.();
    };
    orFill(); orHelp();
    [orKey, orBrain, orJudge].forEach(el => el.onchange = orSave);
    $('#orEye', body).onclick = () => { orKey.type = orKey.type === 'password' ? 'text' : 'password'; };
    $('#orDel', body).onclick = () => { orKey.value = ''; orBrain.checked = false; orJudge.checked = false; orSave(); };
    $('#orTest', body).onclick = async () => {
      orSave(); if (!s.openrouterKey) { orInfo.textContent = '✗ Wklej klucz.'; return; }
      const out = [];
      if (orJudge.checked) { orInfo.textContent = 'Testuję Jeva…'; try { out.push('Jev: ✓ ' + await J.judge.test()); } catch (e) { out.push('Jev: ✗ ' + e.message); } }
      if (orBrain.checked) { orInfo.textContent = 'Testuję Hermesa 4…'; try { out.push('Hermes: ✓ ' + await J.brain.test()); } catch (e) { out.push('Hermes: ✗ ' + e.message); } }
      if (!out.length) out.push('Zaznacz, do czego użyć klucza (mózg i/lub sędzia).');
      orInfo.textContent = out.join('\n'); J.sfx[out.some(o => /✗/.test(o)) ? 'error' : 'notify']();
    };
    sub(ctx, 'judge', orHelp); sub(ctx, 'hermes', orHelp);
    /* Jev */
    const jvOn = $('#jvOn', body), jvKey = $('#jvKey', body), jvModel = $('#jvModel', body), jvExec = $('#jvExec', body), jvAsk = $('#jvAsk', body), jvInfo = $('#jvInfo', body), jvStats = $('#jvStats', body);
    const jvPrivacy = $('#jvPrivacy', body), jvAuto = $('#jvAuto', body), jvA3 = $('#jvA3', body), jvA2 = $('#jvA2', body), jvBudget = $('#jvBudget', body), jvLite = $('#jvLite', body), jvFast = $('#jvFast', body), jvShadow = $('#jvShadow', body), jvLogText = $('#jvLogText', body);
    const jvFill = () => { jvOn.checked = !!s.jevOn; jvKey.value = s.jevKey || ''; jvModel.value = s.jevModel || J.judge.MODELS[0]; jvExec.value = s.jevExecute ?? .85; jvAsk.value = s.jevAsk ?? .5; jvPrivacy.value = s.jevPrivacy || 'P1'; jvAuto.value = s.jevAutonomy || 'auto'; jvA3.value = s.jevA3 ?? .8; jvA2.value = s.jevA2 ?? .92; jvBudget.value = s.jevBudget ?? 5; jvLite.value = s.hermesModelLite || ''; jvFast.checked = s.jevFast !== false; jvShadow.checked = !!s.jevShadow; jvLogText.checked = !!s.jevLogText; };
    const jvHelp = () => {
      const st = J.judge.status, bg = J.judge.budget, m = { limit: bg.limit(), cost: bg.used() };
      jvInfo.textContent = !s.jevKey ? 'Podaj klucz OpenRouter (openrouter.ai/keys) — model typesafe/jev-1.13. Bez klucza decyzje podejmuje rejestr i Hermes.' : (s.jevOn ? 'Aktywny' : 'Wyłączony') + (s.jevShadow ? ' (tryb cienia)' : '') + ' · wywołania: ' + (J.state.stats.jevCalls || 0) + ' · koszt łącznie: $' + (J.state.stats.jevCost || 0).toFixed(5) + (m.limit ? ' · ten miesiąc: $' + (+m.cost || 0).toFixed(4) + ' z $' + m.limit : '') + (st.state === 'up' ? ' · ostatnio ' + st.latency + ' ms' : st.state === 'down' ? ' · błąd: ' + st.lastError : '');
      const x = J.judge.log.stats(), ad = J.policy.adaptInfo();
      jvStats.textContent = x.decisions ? 'Ostatnie 30 dni: ' + x.decisions + ' decyzji · sam wykonał ' + x.executed + ' · pytał ' + (x.askedYes + x.askedNo) + ' (tak ' + x.askedYes + ') · cofnięte ' + x.undone + ' · szybka ścieżka ' + x.fast + ' · do Hermesa ' + x.hermes + ' · średnio ' + x.avgMs + ' ms · odrzucone ' + Math.round(x.rejectRate * 100) + '%' + (ad.length ? '\nPodniesione progi: ' + ad.map(a => a.id + ' +' + a.bump).join(', ') : '') : 'Dziennik decyzji jest pusty — statystyki pojawią się po pierwszych poleceniach.';
    };
    const jvSave = () => {
      s.jevOn = jvOn.checked; s.jevKey = jvKey.value.trim(); s.jevModel = jvModel.value; s.jevExecute = J.clamp(+jvExec.value || .85, .5, 1); s.jevAsk = J.clamp(+jvAsk.value || .5, .1, s.jevExecute);
      s.jevPrivacy = jvPrivacy.value; s.jevAutonomy = jvAuto.value; s.jevA3 = J.clamp(+jvA3.value || .8, .5, 1); s.jevA2 = J.clamp(+jvA2.value || .92, .5, 1); s.jevBudget = J.clamp(+jvBudget.value || 0, 0, 100);
      s.hermesModelLite = jvLite.value.trim(); s.jevFast = jvFast.checked; s.jevShadow = jvShadow.checked; s.jevLogText = jvLogText.checked; J.save(); J.emit('settings'); jvHelp();
    };
    jvFill(); jvHelp();
    [jvOn, jvKey, jvModel, jvExec, jvAsk, jvPrivacy, jvAuto, jvA3, jvA2, jvBudget, jvLite, jvFast, jvShadow, jvLogText].forEach(el => el.onchange = jvSave);
    $('#jvTest', body).onclick = async () => { jvSave(); jvInfo.textContent = 'Łączę z OpenRouter…'; try { jvInfo.textContent = '✓ ' + await J.judge.test(); jvOn.checked = true; jvSave(); J.sfx.notify(); } catch (e) { jvInfo.textContent = '✗ ' + e.message; J.sfx.error(); } };
    $('#jvExport', body).onclick = () => { const a = h('a', { href: URL.createObjectURL(new Blob([J.judge.log.export()], { type: 'application/json' })), download: 'jev-dziennik-' + J.today() + '.json' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    $('#jvResetAdapt', body).onclick = () => { J.policy.resetAdapt(); jvHelp(); J.toast('Progi Jeva wróciły do ustawień.'); };
    $('#jvClearLog', body).onclick = () => { J.judge.log.clear(); jvHelp(); };
    sub(ctx, 'judge', jvHelp);
    /* pamięć */
    const drawMem = async () => { const l = await J.memory.all(); const box = $('#memList', body); box.innerHTML = l.length ? '' : '<div class="dim" style="font-size:11px">Brak zapamiętanych faktów.</div>'; l.slice().reverse().forEach(f => { const r = h('div', { class: 'row', style: 'font-size:11.5px' }, '<span style="flex:1"></span><span class="dim" style="font-size:9.5px"></span><button class="btn sm ghost danger" title="Zapomnij">×</button>'); r.children[0].textContent = f.fact; r.children[1].textContent = f.scope; r.children[2].onclick = async () => { await J.uiRun('memory_forget', { fact: f.id }); drawMem(); }; box.appendChild(r); }); };
    drawMem(); sub(ctx, 'memory', drawMem);
    /* pliki */
    const fsInfo = async () => { const el = $('#fsInfo', body); if (!J.files.supported) { el.textContent = 'Dostęp do folderów wymaga Chrome lub Edge.'; return; } const hnd = J.files.handle || await J.files.load(); el.textContent = hnd ? 'Folder: ' + hnd.name : 'Nie wybrano folderu.'; };
    fsInfo(); $('#fsPick', body).onclick = async () => { try { await J.files.pick(); J.toast('Folder roboczy: ' + J.files.handle.name); fsInfo(); } catch (e) { if (e.name !== 'AbortError') J.toast(e.message); } };
    $('#fsPerm', body).onclick = async () => { try { await J.files.ensure(true); J.toast('Dostęp do folderu odświeżony'); } catch (e) { J.toast(e.message); } };
    sub(ctx, 'files', fsInfo);
  }
};

/* ---------- BIBLIOTEKA APLIKACJI ---------- */
J.apps.library = {
  title: 'Biblioteka środowiska', icon: 'apps', minW: 380, minH: 320, w: 470, h: 440,
  onArg(arg, ctx) { const v = viewOf(arg); if (v) ctx?.goView?.(v.view); },
  mount(body, ctx, arg) {
    ctx.goView = v => setTimeout(() => flash($(v === 'shortcut' || v === 'shortcuts' ? '#sf' : '#ag', body)), 60);
    { const va = viewOf(arg); if (va) ctx.goView(va.view); }
    const ids = ['chat', 'notes', 'market', 'schedule', 'weather', 'monitor', 'terminal', 'calc', 'timer', 'settings'];
    body.innerHTML = `<div class="appgrid" id="ag"></div>
      <div class="label" style="margin-top:18px">Utwórz skrót na pulpicie</div>
      <form class="col" id="sf"><div class="row"><input class="input" id="sn" placeholder="Nazwa (np. GitHub)" required><select class="input" id="sa" style="width:150px"><option value="">— link URL —</option>${ids.map(i => `<option value="${i}">${esc(J.apps[i].title)}</option>`).join('')}</select></div>
      <div class="row"><input class="input" id="su" placeholder="https://…"><button class="btn primary">${icon('plus', 'width="12" height="12"')} Dodaj</button></div></form>`;
    const ag = $('#ag', body);
    ids.forEach(i => { const a = J.apps[i]; const b = h('button', {}, `<div class="appico">${icon(a.icon)}</div><span></span>`); b.querySelector('span').textContent = a.title.replace('Czat z Jarvisem', 'Czat').replace('Biblioteka środowiska', 'Aplikacje'); b.onclick = () => { J.wm.open(i); }; ag.appendChild(b); });
    $('#sa', body).onchange = e => { $('#su', body).disabled = !!e.target.value; };
    $('#sf', body).onsubmit = e => {
      e.preventDefault();
      const name = $('#sn', body).value.trim(), app = $('#sa', body).value; let url = $('#su', body).value.trim();
      if (!app && !url) return J.toast('Podaj adres URL lub wybierz aplikację');
      if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
      J.shortcuts.add(name, app ? { app } : { url }); J.action('shortcut');
      J.toast('Jarvis umieścił „' + name + '” na pulpicie'); e.target.reset();
    };
  }
};
})();
