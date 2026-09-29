/* =========================================================
   JARVIS OS — Process Log: kroki aktualnego zadania (prawy panel)
   Pokazuje wszystko: polecenie, myśli modelu, wywołania narzędzi
   (argumenty, wyniki, błędy, czas). Po zakończeniu trafia do historii.
   ========================================================= */
'use strict';
(() => {
const { $, $$, h, esc } = J;
const MAX_HISTORY = 30, CAP = 6000, AUTOHIDE_MS = 8000;

let cur = null;          // aktywne zadanie {id,title,ts,status,steps[],result}
let viewing = null;      // zadanie pokazywane w panelu (aktywne albo z historii)
let tab = 'task', pinned = false, hideT = null, tick = null, hover = false, seq = 0;

const KIND = {
  input:  { g: '›', label: 'Polecenie' },
  model:  { g: '◈', label: 'Model' },
  thought:{ g: '◌', label: 'Myśli modelu' },
  tool:   { g: '⚙', label: 'Narzędzie' },
  server: { g: '⚡', label: 'Narzędzie Hermesa' },
  system: { g: '·', label: 'System' },
  reply:  { g: '✦', label: 'Odpowiedź' },
  error:  { g: '⚠', label: 'Błąd' }
};
const cap = v => { const t = typeof v === 'string' ? v : JSON.stringify(v, null, 2); return t == null ? '' : (t.length > CAP ? t.slice(0, CAP) + '\n… (' + (t.length - CAP) + ' znaków ucięto)' : t); };
const fmtDur = ms => ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(ms < 10000 ? 2 : 1) + ' s';

/* ---------- rysowanie kroku ---------- */
const paintStep = (s, base) => {
  let el = s.el;
  if (!el) { el = h('details', { class: 'pstep' }); el.dataset.kind = s.kind; Object.defineProperty(s, 'el', { value: el, writable: true, enumerable: false }); }
  el.dataset.status = s.status;
  const k = KIND[s.kind] || KIND.system;
  const off = s.ts - base;
  const dur = s.status === 'run' ? '…' : s.dur != null ? fmtDur(s.dur) : '';
  const prev = s.preview || '';
  el.innerHTML = `<summary><span class="pg">${k.g}</span><span class="pt"></span><span class="pd">${esc(dur)}</span><span class="pdot"></span></summary>
    <div class="pbody"></div>`;
  el.querySelector('.pt').textContent = s.title + (prev ? ' — ' + prev : '');
  const body = el.querySelector('.pbody');
  (s.fields || []).forEach(([label, val, cls]) => {
    if (val == null || val === '') return;
    const row = h('div', { class: 'pf' }, `<em></em><pre></pre>`);
    row.querySelector('em').textContent = label; const pre = row.querySelector('pre'); pre.textContent = cap(val);
    if (cls) pre.classList.add(cls);
    body.appendChild(row);
  });
  body.appendChild(h('div', { class: 'pmeta' }, `<span>${esc(k.label)}</span><span>+${(off / 1000).toFixed(2)} s · ${J.hhmm(new Date(s.ts))}</span>`));
  if (s.status === 'err' && !s.opened) { el.open = true; s.opened = true; }
  return el;
};
const stepsBox = () => $('#lpSteps');
const stick = box => { if (box.dataset.follow !== '0') box.scrollTop = box.scrollHeight; };

/* ---------- API kroku ---------- */
const step = (kind, title, fields = [], opts = {}) => {
  if (!cur) return { set() { }, done() { }, append() { }, fail() { } };
  const s = { id: ++seq, kind, title, fields, status: opts.running ? 'run' : (opts.status || 'ok'), ts: Date.now(), preview: opts.preview || '' };
  const task = cur; task.steps.push(s);
  if (viewing === task) { const box = stepsBox(); box.querySelector('.lp-empty')?.remove(); box.appendChild(paintStep(s, task.ts)); stick(box); }
  let raf = 0;
  // po zakończeniu zadania panel pokazuje wersję „saved” z _live === task
  const shown = () => viewing === task || viewing?._live === task;
  const repaint = () => { if (shown() && !raf) raf = requestAnimationFrame(() => { raf = 0; paintStep(s, task.ts); stick(stepsBox()); }); };
  return {
    set(fields2, preview) { if (fields2) s.fields = fields2; if (preview !== undefined) s.preview = preview; repaint(); },
    append(text, label = 'Treść') { const f = s.fields.find(x => x[0] === label); if (f) f[1] += text; else s.fields.push([label, text]); repaint(); },
    done(fields2, preview) { s.status = 'ok'; s.dur = Date.now() - s.ts; if (fields2) s.fields = s.fields.concat(fields2); if (preview !== undefined) s.preview = preview; repaint(); },
    fail(err, fields2) { s.status = 'err'; s.dur = Date.now() - s.ts; s.fields = s.fields.concat(fields2 || [], [['Błąd', String(err), 'err']]); s.preview = String(err).slice(0, 80); repaint(); },
    get step() { return s; }
  };
};

/* ---------- zadanie ---------- */
const start = title => {
  clearTimeout(hideT);
  cur = { id: J.uid(), title: String(title).slice(0, 200), ts: Date.now(), status: 'run', steps: [], result: '' };
  viewing = cur; tab = 'task';
  step('input', 'Polecenie użytkownika', [['Treść', title]], { preview: String(title).slice(0, 70) });
  cur.steps[0].dur = 0;
  render(); if (!matchMedia('(max-width:900px)').matches) setOpen(true);   // na wąskich ekranach panel zasłaniałby czat — otwierany ręcznie
  clearInterval(tick); tick = setInterval(meta, 250);
  return cur;
};
const end = (status, result) => {
  if (!cur) return;
  clearInterval(tick);
  const t = cur; t.status = status; t.dur = Date.now() - t.ts; t.result = String(result || '');
  t.steps.forEach(s => { if (s.status === 'run') { s.status = 'ok'; s.dur = Date.now() - s.ts; } });
  // do historii trafia wersja bez elementów DOM i z ucięciem długich pól
  const saved = { id: t.id, title: t.title, ts: t.ts, dur: t.dur, status: t.status, result: cap(t.result),
    steps: t.steps.map(s => ({ id: s.id, kind: s.kind, title: s.title, status: s.status, ts: s.ts, dur: s.dur, preview: s.preview, fields: (s.fields || []).map(f => [f[0], cap(f[1]), f[2]]) })) };
  J.state.history.unshift(saved); J.state.history.length = Math.min(J.state.history.length, MAX_HISTORY); J.save();
  cur = null; viewing = saved; Object.defineProperty(saved, '_live', { value: t, enumerable: false });   // panel dalej pokazuje ten sam log (z żywymi elementami)
  render(); scheduleHide();
  J.emit('proc-end', saved);
};
// wpisy J.log() (systemowe) trafiają do aktywnego zadania jako kroki; poza zadaniem nie tworzą szumu
const log = (title, text = '', level = '') => {
  if (!cur) return;
  step('system', title, text ? [['Szczegóły', text]] : [], { status: level === 'err' ? 'err' : 'ok', preview: String(text).slice(0, 70) });
};

/* ---------- panel ---------- */
const ws = () => $('#workspace');
const setOpen = on => {
  if (on && matchMedia('(max-width:900px)').matches) J.chatPanel?.hide();   // na wąskich ekranach jedna szuflada naraz
  ws().classList.toggle('log-open', on); $('#btnLog')?.classList.toggle('on', on);
  if (!on) { clearTimeout(hideT); }
};
const isOpen = () => ws().classList.contains('log-open');
const scheduleHide = () => {
  clearTimeout(hideT);
  if (pinned) return;
  hideT = setTimeout(() => { if (hover || pinned || cur) return scheduleHide(); setOpen(false); }, AUTOHIDE_MS);
};
const statusText = { run: 'wykonuję…', ok: 'zakończono', err: 'błąd', abort: 'przerwano' };
const meta = () => {
  const t = viewing && (viewing === cur ? cur : viewing._live || viewing); if (!t) return;
  const dur = t.status === 'run' ? Date.now() - t.ts : t.dur;
  $('#lpMeta').textContent = new Date(t.ts).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · ' + fmtDur(dur || 0) + ' · ' + (t.steps.length) + ' kroków';
};
const render = () => {
  $$('.lp-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  $('#lpTask').classList.toggle('hidden', tab !== 'task'); $('#lpHist').classList.toggle('hidden', tab !== 'hist');
  $('#lpHistN').textContent = J.state.history.length;
  const stEl = $('#lpState'), running = !!cur;
  const t = viewing;
  stEl.textContent = running ? statusText.run : t ? statusText[t.status] || t.status : 'bezczynny';
  stEl.dataset.s = running ? 'run' : t ? t.status : 'idle';
  if (tab === 'hist') return renderHist();
  const box = stepsBox(), foot = $('#lpFoot');
  box.innerHTML = ''; foot.innerHTML = '';
  if (!t) { $('#lpTitle').textContent = ''; $('#lpMeta').textContent = ''; box.innerHTML = '<div class="lp-empty">Brak aktywnego zadania.<br>Log pojawi się, gdy Jarvis zacznie działać — z każdym krokiem, argumentem i wynikiem.</div>'; return; }
  $('#lpTitle').textContent = t.title; meta();
  const live = t._live || t;
  live.steps.forEach(s => box.appendChild(paintStep(s, live.ts)));
  box.dataset.follow = '1'; stick(box);
  if (t.status !== 'run') {
    const b1 = h('button', { class: 'btn sm' }, J.icon('pin', 'width="12" height="12"') + ' Przypnij wynik na pulpicie');
    b1.onclick = () => { J.widgets.create('result', { title: t.title.slice(0, 40), content: t.result || '(brak odpowiedzi)', meta: 'Zadanie · ' + new Date(t.ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) + ' · ' + fmtDur(t.dur || 0) }); };
    const b2 = h('button', { class: 'btn sm ghost' }, J.icon('download', 'width="12" height="12"') + ' Eksport .json');
    b2.onclick = () => { const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify({ title: t.title, ts: t.ts, dur: t.dur, status: t.status, result: t.result, steps: live.steps.map(({ el, ...r }) => r) }, null, 2)], { type: 'application/json' })), download: 'process-log-' + t.id + '.json' }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    foot.append(b1, b2);
  }
};
const renderHist = () => {
  const box = $('#lpHist'); box.innerHTML = '';
  if (!J.state.history.length) { box.innerHTML = '<div class="lp-empty">Historia jest pusta.</div>'; return; }
  const clear = h('button', { class: 'btn sm ghost danger', style: 'margin:8px 12px' }, J.icon('trash', 'width="12" height="12"') + ' Wyczyść historię');
  clear.onclick = () => { J.state.history = []; J.save(); if (viewing && viewing !== cur) viewing = null; render(); };
  box.appendChild(clear);
  J.state.history.forEach(t => {
    const b = h('button', { class: 'hitem', 'data-s': t.status }, '<span class="hdot"></span><div><b></b><small></small></div>');
    b.querySelector('b').textContent = t.title;
    b.querySelector('small').textContent = new Date(t.ts).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' · ' + fmtDur(t.dur || 0) + ' · ' + t.steps.length + ' kroków';
    b.onclick = () => { viewing = t; tab = 'task'; render(); };
    box.appendChild(b);
  });
};

/* ---------- publiczne API ---------- */
J.proc = {
  start, end, step, log,
  get current() { return cur; },
  get active() { return !!cur; },
  open: () => { clearTimeout(hideT); setOpen(true); },
  close: () => setOpen(false),
  toggle: () => { if (isOpen()) { setOpen(false); } else { setOpen(true); if (!viewing && J.state.history[0]) { viewing = J.state.history[0]; render(); } } },
  get isOpen() { return isOpen(); },
  init() {
    $('#lpClose').innerHTML = J.icon('close'); $('#lpPin').innerHTML = J.icon('pin');
    $('#lpClose').onclick = () => setOpen(false);
    $('#lpPin').onclick = () => { pinned = !pinned; $('#lpPin').classList.toggle('on', pinned); if (pinned) clearTimeout(hideT); else if (!cur) scheduleHide(); };
    $$('.lp-tabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    const panel = $('#logPanel');
    panel.addEventListener('pointerenter', () => { hover = true; }); panel.addEventListener('pointerleave', () => { hover = false; if (!cur) scheduleHide(); });
    stepsBox().addEventListener('scroll', e => { const b = e.target; b.dataset.follow = (b.scrollHeight - b.scrollTop - b.clientHeight < 40) ? '1' : '0'; });
    render();
  }
};
J.log = log;
})();
