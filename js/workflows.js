/* =========================================================
   JARVIS OS — workflow (ADR 0007): polecenia rejestru, przebiegi na żywo (zdarzenia mostu „event: workflow”),
   karta przebiegu w czacie (chat-first), Orb / HUD / Process Log i aplikacja „Mapa pracy”.
   Silnik działa w moście (bridge/workflow_engine.py) — karta uruchamia, pokazuje i odpowiada na pytania;
   bez karty workflow dalej działa (np. uruchomiony z Telegrama przez Hermesa).
   ========================================================= */
'use strict';
(() => {
const R = J.registry, { ok, fail } = R, h = J.h, esc = J.esc, norm = J.norm;
const api = (...a) => J.agents.api(...a);   // wspólny klient mostu (token, limity czasu, kody błędów)
const guard = fn => async (...a) => { try { return await fn(...a); } catch (e) { return fail(e.code || 'INTERNAL', e.message || String(e)); } };
const MARK = { pending: '·', running: '⟳', done: '✓', failed: '✗', skipped: '⤼', denied: '⊘' };
const STATE_PL = { running: 'trwa', waiting: 'czeka na Ciebie', done: 'zakończony', failed: 'nie powiódł się', stopped: 'zatrzymany', queued: 'w kolejce' };
const fmtS = ms => ms == null ? '' : ms < 1000 ? ms + ' ms' : Math.round(ms / 100) / 10 + ' s';
const ACTIVE = s => s === 'running' || s === 'waiting' || s === 'queued';

/* ---------- stan przebiegów (z mostu) ---------- */
const runs = new Map();
const blank = e => ({ id: e.run_id, workflow: e.workflow, name: e.name, state: e.state || 'running', started: e.ts, ended: null, report: null, reason: null,
  pending: null, steps: (e.steps || []).map(s => ({ ...s, state: 'pending', attempts: 0, ms: null, preview: '', score: null, errors: [] })), timeline: [], chat: null, proc: null, handles: {} });
const fromSnapshot = (s, prev) => Object.assign(prev || blank({ run_id: s.id, workflow: s.workflow, name: s.name, ts: s.started }), {
  id: s.id, workflow: s.workflow, name: s.name, state: s.state, started: s.started, ended: s.ended, report: s.report, reason: s.reason, pending: s.pending,
  autonomy: s.autonomy, budget: s.budget, budget_used: s.budget_used, steps: (s.steps || []).map(x => ({ errors: [], ...x }))
});

/* tekst karty w czacie — jedna wiadomość Jarvisa aktualizowana przy każdym zdarzeniu */
const cardText = r => {
  const done = r.steps.filter(s => s.state === 'done' || s.state === 'skipped').length;
  const head = '**Workflow: ' + r.name + '** — ' + (ACTIVE(r.state) ? 'krok ' + Math.min(r.steps.length, done + 1) + '/' + r.steps.length : STATE_PL[r.state] || r.state)
    + '\n' + '▰'.repeat(done) + '▱'.repeat(Math.max(0, r.steps.length - done)) + ' ' + (r.steps.length ? Math.round(done / r.steps.length * 100) : 0) + '%';
  const lines = r.steps.map(s => MARK[s.state] + ' ' + s.title + (s.state === 'running' && s.attempts > 1 ? ' (próba ' + s.attempts + ')' : '') + (s.state === 'running' && s.live?.chars ? ' · pisze… ' + s.live.chars.toLocaleString('pl-PL') + ' znaków' : '') + (s.ms != null && s.state === 'done' ? ' · ' + fmtS(s.ms) + (s.attempts > 1 ? ' · ' + s.attempts + ' próby' : '') : ''));
  const tail = r.state === 'waiting' && r.pending ? '\n\n⏸ ' + r.pending.question : r.state === 'done' ? '\n\n' + (r.report || '') : r.reason ? '\n\n' + r.reason : '\n\nPrzebieg na żywo: „pokaż mapę pracy”.';
  return head + '\n' + lines.join('\n') + tail;
};

const touch = (r, e) => {
  if (r.chat && (e?.type !== 'step.progress' || Date.now() - (r._cardAt || 0) > 3000)) { r._cardAt = Date.now(); r.chat.set(cardText(r)); }
  J.emit('workflows', { id: r.id, e }); pill.render();
};
/* typowy czas kroku: mediana z ukończonych przebiegów tego samego workflow (do 10), inaczej domyślny dla rodzaju kroku */
const DEF_MS = { hermes: 60000, check: 3000, write_files: 3000, tool: 2000, ask: 30000 };
const expect = r => {
  const by = {}, med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  [...runs.values()].filter(x => x.workflow === r.workflow && x.id !== r.id && x.state === 'done').slice(0, 10)
    .forEach(x => x.steps.forEach(st => { if (st.state === 'done' && st.ms != null) (by[st.id] = by[st.id] || []).push(st.ms); }));
  const out = {}; r.steps.forEach(st => { out[st.id] = by[st.id]?.length ? med(by[st.id]) : DEF_MS[st.kind] || 30000; }); return out;
};
/* szacowany czas do końca (s): pozostałe kroki + reszta bieżącego */
const eta = (r, now = Date.now() / 1000) => {
  if (!ACTIVE(r.state)) return 0;
  const ex = expect(r); let ms = 0;
  r.steps.forEach(st => { if (st.state === 'pending') ms += ex[st.id]; else if (st.state === 'running') ms += Math.max(0, ex[st.id] - (now - (st.startedAt || now)) * 1000); });
  return ms / 1000;
};
const clock = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ---------- pływająca pigułka na pulpicie: trwający workflow widać także przy zamkniętej Mapie pracy ---------- */
const pill = (() => {
  let el = null, iv = 0, doneAt = 0, lastId = null;
  const ensure = () => {
    if (el) return el;
    const host = typeof document !== 'undefined' && document.querySelector('#desktop'); if (!host || !host.appendChild) return null;
    el = h('button', { class: 'wf-pill', type: 'button', title: 'Otwórz Mapę pracy', 'aria-live': 'polite' },
      '<span class="wf-pr"><svg viewBox="0 0 24 24"><circle class="tr" cx="12" cy="12" r="10"/><circle class="pg" cx="12" cy="12" r="10"/></svg><i></i></span><span class="wf-pt"><b></b><small></small></span>');
    el.onclick = () => J.wm.open('workflows');
    host.appendChild(el); return el;
  };
  const render = () => {
    try {
      const act = WF.list.find(r => ACTIVE(r.state)), recent = !act && WF.list[0] && WF.list[0].id === lastId && Date.now() - doneAt < 6000 ? WF.list[0] : null, r = act || recent;
      if (act) { lastId = act.id; doneAt = 0; } else if (lastId && WF.list[0]?.id === lastId && !doneAt) doneAt = Date.now();
      const mapOpen = J.wm?.isOpen?.('workflows') && !J.wm?.isMin?.('workflows');
      const p = ensure(); if (!p) return;
      const on = !!r && !mapOpen;
      p.classList.toggle('show', on); p.dataset.s = r?.state || '';
      if (!on) { clearInterval(iv); iv = 0; return; }
      const total = r.steps.length, done = r.steps.filter(x => x.state === 'done' || x.state === 'skipped').length, cur = r.steps.find(x => x.state === 'running');
      p.querySelector('.pg').style.strokeDashoffset = String(62.83 * (1 - (total ? done / total : 0)));
      p.querySelector('b').textContent = r.name;
      p.querySelector('small').textContent = ACTIVE(r.state) ? (r.state === 'waiting' ? '⏸ czeka na Ciebie' : 'krok ' + Math.min(total, done + 1) + '/' + total + (cur ? ' · ' + cur.title : '') + ' · ~' + clock(eta(r)))
        : (STATE_PL[r.state] || r.state) + ' ✓';
      if (!iv && ACTIVE(r.state)) iv = setInterval(() => { render(); WF.watchdog(); }, 1000);
      if (!ACTIVE(r.state)) { clearInterval(iv); iv = 0; setTimeout(render, 6100); }
    } catch (er) { /* pigułka jest dodatkiem — nie może zatrzymać obsługi zdarzeń */ }
  };
  return { render };
})();
/* stan przebiegu z jednego zdarzenia — bez efektów ubocznych (używa go też powtórka w Mapie pracy) */
const reduce = (r, e) => {
  if (e.type === 'step.progress') {   // podgląd pisania Hermesa na żywo — stan kroku, bez wpisu na osi czasu
    const s = r.steps.find(x => x.id === e.step_id); if (!s) return s;
    const lv = s.live || {};
    if (typeof e.tail === 'string') Object.assign(lv, { tail: e.tail, chars: e.chars || e.tail.length, at: e.ts });
    if (e.tool) Object.assign(lv, { tool: e.tool, label: e.label || '', toolState: e.status || '' });
    s.live = lv; return s;
  }
  r.state = e.state || r.state;
  r.timeline.push({ ts: e.ts, type: e.type, title: e.title || '', text: e.reason || e.preview || e.question || '' }); if (r.timeline.length > 60) r.timeline.shift();
  const s = r.steps.find(x => x.id === e.step_id);
  switch (e.type) {
    case 'run.started': r.autonomy = e.autonomy; break;
    case 'step.started': if (s) Object.assign(s, { state: 'running', attempts: e.attempt || 1, startedAt: e.ts, live: null }); break;
    case 'step.retry': if (s) s.errors.push(e.reason); break;
    case 'step.completed': case 'step.skipped': if (s) Object.assign(s, { state: e.type === 'step.completed' ? 'done' : 'skipped', ms: e.ms ?? s.ms, preview: e.preview || '', score: e.score ?? s.score, artifact: e.artifact || s.artifact || null, live: null }); break;
    case 'step.failed': if (s) { s.state = e.reason === 'DENIED' ? 'denied' : 'failed'; if (e.reason) s.errors.push(e.reason); } break;
    case 'ask.waiting': r.pending = { question: e.question, options: e.options || [] }; break;
    case 'ask.answered': r.pending = null; break;
    case 'run.completed': case 'run.failed': case 'run.stopped': r.ended = e.ts; r.report = e.report || r.report; r.reason = e.reason || r.reason; r.budget_used = e.budget_used || r.budget_used; r.pending = null; break;
  }
  return s;
};
/* Process Log i Orb: przebieg workflow przejmuje je tylko, gdy nie trwa zadanie z czatu tej karty (jak zadania z Telegrama) */
const ownsProc = r => r.proc && J.proc.current === r.proc;
/* przejęcie, gdy tylko Process Log jest wolny — także później, np. gdy skończyło się polecenie z czatu, które uruchomiło przebieg */
const adopt = r => {
  if (r.proc || !ACTIVE(r.state) || J.brain?.busy || J.proc.active) return;
  r.proc = J.proc.start('Workflow: ' + r.name); J.proc.plan(r.steps.map(x => x.title));
  r.steps.forEach((x, i) => { if (x.state === 'done' || x.state === 'skipped') J.proc.planStep(i); });
  J.ev.emit('task.created', { task_id: r.id, title: r.name, source: 'workflow' }, 'workflow');
};

const WF = J.workflows = {
  runs, cardText, reduce, expect, eta, pill,
  get list() { return [...runs.values()].sort((a, b) => (b.started || 0) - (a.started || 0)); },
  current() { return WF.list.find(r => ACTIVE(r.state)) || WF.list[0] || null; },
  onEvent(e) {
    if (!e || typeof e.type !== 'string' || typeof e.run_id !== 'string') return;
    let r = runs.get(e.run_id);
    if (e.type === 'run.snapshot') { r = fromSnapshot(e.snapshot || {}, r); runs.set(r.id, r); touch(r, e); return; }
    if (!r) { if (e.type !== 'run.started') return; r = blank(e); runs.set(r.id, r); }
    r.lastEventAt = Date.now();
    reduce(r, e);
    switch (e.type) {
      case 'run.started': r.chat = J.chat.add('jarvis', cardText(r)); adopt(r); break;
      case 'run.resumed': J.proc.active || J.toast?.('Workflow „' + r.name + '” wznowiony po restarcie mostu', 4000); break;
      case 'step.started':
        adopt(r);
        if (ownsProc(r)) { r.handles[e.step_id] = J.proc.step('server', 'Krok ' + e.n + '/' + e.total + ': ' + e.title + (e.attempt > 1 ? ' (próba ' + e.attempt + ')' : ''), [['Rodzaj', e.kind]], { running: true }); J.ev.emit('tool.started', { task_id: r.id, tool: 'workflow:' + e.kind, source: 'workflow' }, 'workflow'); }
        break;
      case 'step.retry':
        if (ownsProc(r)) { r.handles[e.step_id]?.fail('nie przeszło sprawdzenia — ponawiam ze zmianą: ' + e.reason); J.ev.emit('tool.failed', { task_id: r.id, tool: 'workflow:' + e.kind, source: 'workflow', code: 'RETRY' }, 'workflow'); }
        break;
      case 'step.completed': case 'step.skipped':
        if (ownsProc(r)) { const st = r.handles[e.step_id] || J.proc.step('server', 'Krok ' + e.n + '/' + e.total + ': ' + e.title); st.done(e.score != null ? [['Ocena', String(e.score)]] : null, e.preview || ''); J.proc.planStep(e.n - 1); J.ev.emit('tool.completed', { task_id: r.id, tool: 'workflow:' + e.kind, source: 'workflow', code: 'OK' }, 'workflow'); }
        break;
      case 'step.failed':
        if (ownsProc(r)) { r.handles[e.step_id]?.fail(e.reason || 'błąd'); J.ev.emit('tool.failed', { task_id: r.id, tool: 'workflow:' + e.kind, source: 'workflow', code: 'ERROR' }, 'workflow'); }
        break;
      case 'ask.waiting': WF.ask(r); break;
      case 'run.completed': case 'run.failed': case 'run.stopped': {
        const st = e.type === 'run.completed' ? 'ok' : e.type === 'run.failed' ? 'err' : 'abort';
        if (ownsProc(r)) { J.proc.step('reply', 'Wynik workflow', [['Treść', r.report || r.reason || '']], { preview: String(r.report || r.reason || '').slice(0, 70) }); J.proc.end(st, r.report || r.reason || ''); J.ev.emit(st === 'ok' ? 'task.completed' : st === 'err' ? 'task.failed' : 'task.cancelled', { task_id: r.id, result: String(r.report || r.reason || '').slice(0, 300) }, 'workflow'); }
        r.proc = null; J.sfx?.[st === 'ok' ? 'notify' : 'error']?.();
        break;
      }
    }
    touch(r, e);
  },
  /* pytanie przebiegu: chip przy rdzeniu + szybkie odpowiedzi w czacie; odpowiedź wraca do mostu */
  async ask(r) {
    const q = r.pending; if (!q) return;
    const a = await J.ask('Workflow „' + r.name + '”: ' + q.question, q.options.map((o, i) => ({ label: o, value: o, primary: i === 0 })), { timeout: 590000 });
    if (a == null || runs.get(r.id)?.pending !== q) return;   // brak odpowiedzi tu — most ma własny limit i odpowiedź domyślną
    try { await api('/workflows/runs/' + r.id + '/answer', { method: 'POST', body: { answer: a } }); } catch (e) { J.toast?.('Nie przekazano odpowiedzi: ' + e.message, 4000); }
  },
  /* stan z mostu; przebieg, który tu wciąż „trwa”, a w moście już się skończył (zgubione zdarzenie), domykamy jak zdarzeniem */
  async refresh() {
    WF.refreshedAt = Date.now();
    try {
      const j = await api('/workflows/runs', { timeout: 10000 });
      (j.runs || []).forEach(s => {
        const before = runs.get(s.id), was = before && ACTIVE(before.state), r = fromSnapshot(s, before); runs.set(r.id, r);
        if (was && !ACTIVE(r.state)) WF.onEvent({ v: 1, type: r.state === 'done' ? 'run.completed' : r.state === 'failed' ? 'run.failed' : 'run.stopped', run_id: r.id, workflow: r.workflow, name: r.name, ts: r.ended || Date.now() / 1000, state: r.state, report: r.report, reason: r.reason, total: r.steps.length });
      });
      J.emit('workflows');
    } catch (e) { /* most niedostępny */ }
  },
  /* bezpiecznik: przebieg „trwa”, a od minuty nie ma zdarzeń — dopytaj most (co najwyżej co 30 s) */
  watchdog() {
    const now = Date.now(), stale = [...runs.values()].some(r => ACTIVE(r.state) && now - (r.lastEventAt || now) > 60000);
    if (stale && now - (WF.refreshedAt || 0) > 30000) WF.refresh();
  },
  async defs() { try { const j = await api('/workflows', { timeout: 10000 }); WF.defList = j.workflows || []; return WF.defList; } catch (e) { return WF.defList || []; } }
};

const describe = r => r ? cardText(r).replace(/\*\*/g, '') : 'Żaden workflow jeszcze nie działał.';
const pickDef = (defs, q) => { const n = norm(q || ''); return defs.find(d => d.id === q) || defs.find(d => norm(d.name) === n) || defs.find(d => n && (norm(d.name).includes(n) || d.id.includes(n.replace(/\s+/g, '-')))); };
const tail = (raw, n, part) => { const i = n.lastIndexOf(part); return i >= 0 && String(raw).length === n.length ? String(raw).slice(i, i + part.length).trim() : part; };

/* ---------- polecenia rejestru (Hermes woła te same nazwy przez MCP — obsługuje je wtedy most, bez karty) ---------- */
R.add({ id: 'workflow_list', group: 'Workflow', label: 'Workflow: lista', idempotent: true, reads: ['workflows'],
  description: 'Lista dostępnych workflow (powtarzalnych procesów pracy z krokami, sprawdzeniami i budżetem) z ich danymi wejściowymi.',
  args: { type: 'object', properties: {} }, examples: ['jakie mam workflow', 'lista workflow', 'pokaz workflow'],
  run: guard(async () => { const d = await WF.defs(); return ok({ workflows: d }, d.length ? 'Workflow: ' + d.map(x => '„' + x.name + '” (' + x.steps.length + ' kroków)').join(', ') + '.' : 'Brak zdefiniowanych workflow.'); }) });

R.add({ id: 'workflow_run', group: 'Workflow', label: 'Workflow: uruchom', writes: ['workflows', 'files'], spansConj: true,
  description: 'Uruchamia workflow — proces pracy wykonywany krok po kroku przez silnik w moście (Hermes myśli w krokach, każdy krok jest sprawdzany, ponawiany ze zmianą i mieści się w budżecie). Np. workflow="od-pomyslu-do-projektu", inputs={pomysl: "…"} zamienia pomysł w brief, architekturę, strukturę i szkielet projektu w JarvisWorkspace\\projects. Postęp widać na żywo w czacie i w Mapie pracy.',
  args: { type: 'object', properties: { workflow: { type: 'string', description: 'id workflow (workflow_list)' }, inputs: { type: 'object', description: 'dane wejściowe, np. {"pomysl": "aplikacja do nawyków"}' }, autonomy: { type: 'string', enum: ['L0', 'L1', 'L2', 'L3'], description: 'samodzielność; domyślnie z definicji' } }, required: ['workflow'] },
  examples: ['zrob projekt z pomyslu {pomysl}', 'od pomyslu do projektu {pomysl}', 'uruchom workflow {workflow}'],
  parse(raw, n) {
    let m = /^(?:zrob|stworz|zaprojektuj|przygotuj|zbuduj)\s+projekt\s+z\s+pomyslu[:,]?\s+(.+)$/.exec(n) || /^od\s+pomyslu\s+do\s+projektu[:,]?\s+(.+)$/.exec(n) || /^(?:mam\s+)?pomysl\s+na\s+projekt[:,]?\s+(.+)$/.exec(n);
    if (m) return { args: { workflow: 'od-pomyslu-do-projektu', inputs: { pomysl: tail(raw, n, m[1]).replace(/[?!.]+$/, '') } }, score: 45 };
    if ((m = /^(?:uruchom|odpal|wlacz)\s+workflow\s+(.+)$/.exec(n))) return { args: { workflow: m[1] }, score: 40 };
    return null;
  },
  run: guard(async ({ workflow, inputs, autonomy }) => {
    const defs = await WF.defs(), d = pickDef(defs, workflow);
    if (!d) return fail('NOT_FOUND', 'Nie ma workflow „' + workflow + '”.' + (defs.length ? ' Są: ' + defs.map(x => '„' + x.name + '”').join(', ') + '.' : ''));
    const missing = Object.entries(d.inputs || {}).filter(([k, v]) => v.required && !String(inputs?.[k] || '').trim()).map(([k, v]) => v.description || k);
    if (missing.length) return fail('INVALID_ARGS', 'Brakuje: ' + missing.join(', ') + '.');
    const snap = await api('/workflows/run', { method: 'POST', body: { workflow: d.id, inputs: inputs || {}, ...(autonomy ? { autonomy } : {}) }, timeout: 20000 });
    return ok(snap, 'Uruchomiłem „' + d.name + '” (' + snap.steps.length + ' kroków, samodzielność ' + snap.autonomy + '). Postęp widać na żywo w czacie i w Mapie pracy.');
  }) });

R.add({ id: 'workflow_status', group: 'Workflow', label: 'Workflow: status', idempotent: true, reads: ['workflows'],
  description: 'Stan workflow: bieżący krok, ponowienia, pytania do użytkownika, raport końcowy. Bez run_id — ostatni przebieg.',
  args: { type: 'object', properties: { run_id: { type: 'string' } } }, examples: ['status workflow', 'jak idzie workflow', 'co robi workflow'],
  run: guard(async ({ run_id }) => {
    if (run_id) { const s = await api('/workflows/runs/' + encodeURIComponent(run_id)); const r = fromSnapshot(s, runs.get(s.id)); runs.set(r.id, r); return ok(s, describe(r)); }
    if (!WF.current()) await WF.refresh();
    const r = WF.current(); return ok(r ? { id: r.id, state: r.state } : { state: 'idle' }, describe(r));
  }) });

R.add({ id: 'workflow_stop', group: 'Workflow', label: 'Workflow: zatrzymaj', writes: ['workflows'],
  description: 'Zatrzymuje workflow (run_id) albo wszystkie („stop wszystko”: także bieżące zadanie Jarvisa). Zrobione kroki zostają.',
  args: { type: 'object', properties: { run_id: { type: 'string', description: 'id przebiegu albo "all"' } } },
  examples: ['zatrzymaj workflow', 'stop workflow', 'stop wszystko', 'zatrzymaj wszystko'],
  parse(raw, n) { return /^(?:stop|zatrzymaj|przerwij)\s+(?:wszystko|workflow|workflowy|przebieg)$/.test(n) ? { args: { run_id: 'all' }, score: 45 } : null; },
  run: guard(async ({ run_id }) => {
    const all = !run_id || run_id === 'all';
    if (all && J.brain?.busy) J.brain.abort?.();
    const r = await api(all ? '/workflows/runs/all/stop' : '/workflows/runs/' + encodeURIComponent(run_id) + '/stop', { method: 'POST' });
    return ok(r, r.stopped?.length ? 'Zatrzymałem ' + r.stopped.length + ' ' + J.pl(r.stopped.length, 'workflow', 'workflow', 'workflow') + '.' : 'Żaden workflow nie trwał.');
  }) });

R.add({ id: 'workflow_answer', group: 'Workflow', label: 'Workflow: odpowiedz', palette: false, voice: false,
  description: 'Odpowiedź na pytanie zadane przez workflow (krok ask albo zgoda na krok) — po pytaniu użytkownika w rozmowie.',
  args: { type: 'object', properties: { run_id: { type: 'string' }, answer: { type: 'string', maxLength: 200 } }, required: ['run_id', 'answer'] },
  run: guard(async ({ run_id, answer }) => { const r = await api('/workflows/runs/' + encodeURIComponent(run_id) + '/answer', { method: 'POST', body: { answer } }); return ok(r, 'Przekazałem odpowiedź: „' + answer + '”.'); }) });

['workflow_list', 'workflow_status', 'workflow_stop'].forEach(id => J.policy?.A3?.add(id));

/* ---------- aplikacja „Mapa pracy” — centrum dowodzenia przebiegiem ----------
   Scena (zorza, siatka, promień skanera, przechył 3D za myszą), węzły-przyciski z pierścieniem wypełnianym według typowego czasu
   kroku (pomarańczowy po przekroczeniu), kanwa: płynąca energia na połączeniach, satelity wokół kroku w toku, fale przy ukończeniu,
   konfetti i baner na koniec. Panel „Co powstaje”: wynik każdego kroku animowany na żywo (pola briefu, nagłówki, drzewo plików,
   zapisany folder). Aktualizacja bez przebudowy — animacje CSS się nie urywają. Ruch wg J.fx (0 statycznie … 3 kino). */
const KIND_IC = { hermes: 'spark', check: 'search', write_files: 'folder', tool: 'bolt', ask: 'chat' };
const KIND_PL = { hermes: 'Hermes myśli', check: 'sprawdzenie', write_files: 'zapis plików', tool: 'polecenie pulpitu', ask: 'pytanie do Ciebie' };
const FIELD_PL = { nazwa: 'Nazwa', cel: 'Cel', odbiorcy: 'Dla kogo', mvp: 'MVP', poza_zakresem: 'Poza zakresem', ograniczenia: 'Ograniczenia', ryzyka: 'Ryzyka', stos_sugestia: 'Stos', title: 'Tytuł', words: 'Słowa' };
const RING = 2 * Math.PI * 17, BIG = 2 * Math.PI * 30, GAUGE = 2 * Math.PI * 13;
const fxRank = () => J.fx?.rank?.() ?? 2;

/* animowane wpisywanie i liczniki (przy fx 0 — od razu) */
const typeText = (el, text, dur = 900) => {
  text = String(text ?? ''); if (fxRank() < 1 || text.length < 2) { el.textContent = text; return; }
  const t0 = performance.now(), step = () => { const k = Math.min(1, (performance.now() - t0) / dur); el.textContent = text.slice(0, Math.ceil(text.length * k)); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
  el.textContent = ''; requestAnimationFrame(step);
};
const countUp = (el, n, dur = 1100) => {
  if (fxRank() < 1) { el.textContent = String(n); return; }
  const t0 = performance.now(), step = () => { const k = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = String(Math.round(n * e)); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
  requestAnimationFrame(step);
};
/* drzewo z płaskiej listy ścieżek */
const treeOf = paths => {
  const root = {}; paths.forEach(p => { let cur = root; String(p).split('/').forEach((seg, i, a) => { cur[seg] = cur[seg] || (i === a.length - 1 ? null : {}); if (cur[seg]) cur = cur[seg]; }); });
  const rows = [], walk = (node, depth, prefix) => Object.keys(node).sort((a, b) => (node[b] ? 1 : 0) - (node[a] ? 1 : 0) || a.localeCompare(b)).forEach(k => { const path = prefix ? prefix + '/' + k : k; rows.push({ name: k, depth, dir: !!node[k], path }); if (node[k]) walk(node[k], depth + 1, path); });
  walk(root, 0, ''); return rows;
};

/* wynik kroku jako animowany element (Mapa pracy i hologram trybu kinowego) */
const renderArt = a => {
  const wrap = h('div', { class: 'wf-a wf-a-' + a.kind });
  if (a.kind === 'fields') {
    const f = a.fields || {}, title = f.nazwa || f.title;
    if (title) { const t = h('div', { class: 'wf-a-title' }); wrap.appendChild(t); typeText(t, title, 700); }
    let i = 0;
    Object.entries(f).forEach(([k, v]) => {
      if (k === 'nazwa' || k === 'title' || /^(id|updated|created|ts|words)$/.test(k)) return;   // pola techniczne nie są „tym, co powstaje”
      const row = h('div', { class: 'wf-a-row', style: '--i:' + (i++) }, '<em></em><div></div>'); row.querySelector('em').textContent = FIELD_PL[k] || k;
      const val = row.querySelector('div');
      if (Array.isArray(v)) v.forEach((x, j) => { const c = h('span', { class: 'wf-chipx', style: '--j:' + j }); c.textContent = x; val.appendChild(c); });
      else if (k === 'cel') typeText(val, v, 1200); else val.textContent = String(v);
      wrap.appendChild(row);
    });
  } else if (a.kind === 'doc') {
    const head = h('div', { class: 'wf-a-meta' }, '<b>0</b> znaków · <span></span> ' + J.pl((a.headings || []).length, 'sekcja', 'sekcje', 'sekcji')); wrap.appendChild(head); countUp(head.querySelector('b'), a.chars || 0); head.querySelector('span').textContent = (a.headings || []).length;
    const ol = h('ol', { class: 'wf-a-heads' }); (a.headings || []).forEach((t, i) => { const li = h('li', { style: '--i:' + i }); li.textContent = t; ol.appendChild(li); }); wrap.appendChild(ol);
    if (a.excerpt) { const ex = h('div', { class: 'wf-a-ex' }); ex.textContent = a.excerpt; wrap.appendChild(ex); }
  } else if (a.kind === 'tree') {
    const rows = treeOf(a.paths || []), head = h('div', { class: 'wf-a-meta' }, '<b>0</b> ' + J.pl((a.paths || []).length, 'plik', 'pliki', 'plików') + (a.filled ? ' · <span class="ok">treść gotowa</span>' : ' · plan struktury')); wrap.appendChild(head); countUp(head.querySelector('b'), (a.paths || []).length);
    const ul = h('div', { class: 'wf-tree' + (a.filled ? ' filled' : '') });
    rows.forEach((x, i) => { const row = h('div', { class: 'wf-tr ' + (x.dir ? 'dir' : 'file'), style: '--i:' + i + ';--d:' + x.depth, title: a.notes?.[x.path] || '' }, '<i></i><span></span>'); row.querySelector('span').textContent = x.name + (x.dir ? '/' : ''); ul.appendChild(row); });
    wrap.appendChild(ul);
  } else if (a.kind === 'files_written') {
    const big = h('div', { class: 'wf-a-big' }, '<b>0</b><span>' + J.pl(a.count || 0, 'plik zapisany', 'pliki zapisane', 'plików zapisanych') + '</span>'); wrap.appendChild(big); countUp(big.querySelector('b'), a.count || 0, 1400);
    const path = h('div', { class: 'wf-a-path' }, '📁 <code></code>' + (a.commit ? ' <span class="wf-commit"></span>' : '')); path.querySelector('code').textContent = a.root; if (a.commit) path.querySelector('.wf-commit').textContent = 'git ' + a.commit; wrap.appendChild(path);
    const grid = h('div', { class: 'wf-dots' }); (a.files || []).forEach((f, i) => { const d = h('i', { style: '--i:' + i, title: f }); grid.appendChild(d); }); wrap.appendChild(grid);
  }
  return wrap;
};

J.apps.workflows = {
  title: 'Mapa pracy', icon: 'flow', minW: 460, minH: 420, w: 980, h: 660,
  mount(body, ctx) {
    let sel = null, built = null, prev = {}, replay = null, raf = 0, last = 0, edges = [], parts = [], bursts = [], waves = [], confetti = [], tsec = 0, artKey = '', focusStep = null, shown = 0;
    body.innerHTML = '<div class="wf">' +
      '<div class="wf-head">' +
        '<div class="wf-prog" aria-hidden="true"><svg viewBox="0 0 72 72"><defs><linearGradient id="wfGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent2)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient></defs><circle class="tr" cx="36" cy="36" r="30"/><circle class="pg" id="wfPg" cx="36" cy="36" r="30"/></svg><b id="wfPct">0%</b><small id="wfPctL">postęp</small></div>' +
        '<div class="wf-title"><select class="input" id="wfRun" aria-label="Przebieg"></select>' +
          '<div class="wf-stats"><span class="wf-chip" id="wfState"><i></i><em></em></span><span id="wfClock" title="czas przebiegu">⏱ 0:00</span><span id="wfEta" class="wf-eta" title="szacowany czas do końca (z poprzednich przebiegów)"></span><span id="wfAut" title="samodzielność"></span></div></div>' +
        '<div class="wf-gauges" aria-hidden="true">' + ['czas', 'kroki', 'tokeny'].map(g => '<div class="wf-g" data-g="' + g + '"><svg viewBox="0 0 32 32"><circle class="tr" cx="16" cy="16" r="13"/><circle class="pg" cx="16" cy="16" r="13"/></svg><b>0</b><small>' + g + '</small></div>').join('') + '</div>' +
        '<div class="wf-acts"><button class="btn sm ghost" id="wfReplay" title="Odtwórz przebieg jak film">▶ Powtórka</button><button class="btn sm ghost danger" id="wfStop">Stop</button><button class="btn sm ghost" id="wfNew">Nowy…</button></div>' +
      '</div>' +
      '<div class="wf-new hidden" id="wfForm"><select class="input" id="wfDef" aria-label="Workflow"></select><textarea class="input" id="wfIn" rows="2" placeholder="Pomysł / dane wejściowe…"></textarea><button class="btn sm primary" id="wfGo">Uruchom</button></div>' +
      '<div class="wf-stage" id="wfStage"><div class="wf-3d" id="wfTilt"><canvas class="wf-cv" id="wfCv" aria-hidden="true"></canvas><div class="wf-graph" id="wfGraph" role="list" aria-label="Kroki workflow"></div></div><div class="wf-banner" id="wfBanner" aria-hidden="true"><b></b><small></small></div></div>' +
      '<div class="wf-live" id="wfLive" aria-live="polite"></div>' +
      '<div class="wf-cols"><section class="wf-art" aria-label="Co powstaje"><div class="wf-art-h"><span class="label">Co powstaje</span><em id="wfArtStep"></em></div><div class="wf-art-body" id="wfArt"></div></section>' +
      '<section class="wf-side"><div class="wf-report" id="wfReport"></div><div class="wf-detail" id="wfDetail"></div><div class="label">Oś czasu</div><div class="wf-time" id="wfTime"></div></section></div></div>';
    const $b = s => body.querySelector(s), stage = $b('#wfStage'), tilt = $b('#wfTilt'), cv = $b('#wfCv'), g2 = cv.getContext('2d'), graph = $b('#wfGraph');
    const view = () => replay?.run || (sel && runs.get(sel)) || null;
    const rgb = name => getComputedStyle(body).getPropertyValue(name).trim() || '51,214,255';
    const nodes = () => [...graph.querySelectorAll('.wf-node')];
    const nowOf = r => r?._at != null ? r._at + (Date.now() - (r._wall || Date.now())) / 1000 * (r._scale || 1) : Date.now() / 1000;

    /* ---------- węzły ---------- */
    const build = r => {
      graph.innerHTML = ''; prev = {}; shown = 0; artKey = ''; $b('#wfTime').innerHTML = ''; $b('#wfArt').innerHTML = ''; parts = []; bursts = []; waves = []; confetti = [];
      if (!r) { graph.innerHTML = '<div class="empty">Brak przebiegów. Powiedz np. „zrób projekt z pomysłu aplikacja do nawyków” albo kliknij „Nowy…”.</div>'; built = null; return; }
      r.steps.forEach((s, i) => {
        const b = h('button', { class: 'wf-node', 'data-s': 'pending', 'data-k': s.kind, role: 'listitem', style: '--i:' + i },
          '<span class="wf-n">' + String(i + 1).padStart(2, '0') + '</span><span class="wf-ring"><svg viewBox="0 0 40 40"><circle class="tr" cx="20" cy="20" r="17"/><circle class="pg" cx="20" cy="20" r="17"/></svg><span class="wf-ic">' + J.icon(KIND_IC[s.kind] || 'star') + '</span><span class="wf-ok">✓</span></span>' +
          '<span class="wf-txt"><b></b><small></small></span><i class="wf-retry"></i><i class="wf-scan" aria-hidden="true"></i>');
        b.querySelector('b').textContent = s.title;
        b.onclick = () => { focusStep = focusStep === s.id ? null : s.id; artKey = ''; update(view()); };
        graph.appendChild(b);
      });
      built = r.id; requestAnimationFrame(geometry);
    };

    /* ---------- aktualizacja ---------- */
    const update = (r, e) => {
      if (!r) return;
      if (built !== r.id) {
        build(r);
        if (!replay && !r.timeline.length && !r._tlLoading) {
          r._tlLoading = true;
          api('/workflows/runs/' + encodeURIComponent(r.id) + '?events=1').then(j => { if (r.timeline.length) return; r.timeline = (j.events || []).filter(x => x.type !== 'run.snapshot').slice(-60).map(x => ({ ts: x.ts, type: x.type, title: x.title || '', text: x.reason || x.preview || x.question || '' })); if (view() === r) timeline(r); }).catch(() => { });
        }
      }
      const total = r.steps.length, done = r.steps.filter(s => s.state === 'done' || s.state === 'skipped').length, pct = total ? done / total : 0;
      $b('#wfPg').style.strokeDashoffset = String(BIG * (1 - pct)); $b('#wfPct').textContent = Math.round(pct * 100) + '%';
      $b('#wfPctL').textContent = done + ' z ' + total;
      const chip = $b('#wfState'); chip.dataset.s = r.state; chip.querySelector('em').textContent = STATE_PL[r.state] || r.state;
      $b('#wfAut').textContent = r.autonomy ? 'samodzielność ' + r.autonomy : '';
      $b('#wfStop').disabled = replay ? true : !ACTIVE(r.state);
      nodes().forEach((el, i) => {
        const s = r.steps[i]; if (!s) return;
        const was = prev[s.id];
        if (el.dataset.s !== s.state) el.dataset.s = s.state;
        el.querySelector('small').textContent = s.state === 'running' ? KIND_PL[s.kind] + (s.attempts > 1 ? ' · próba ' + s.attempts : '') + '…'
          : [s.ms != null ? fmtS(s.ms) : '', s.score != null ? 'ocena ' + s.score : '', s.state === 'skipped' ? 'pominięte' : ''].filter(Boolean).join(' · ') || (s.state === 'pending' ? 'czeka' : s.state);
        const rt = el.querySelector('.wf-retry'); rt.textContent = s.attempts > 1 ? '↻' + (s.attempts - 1) : ''; rt.classList.toggle('on', s.attempts > 1);
        el.setAttribute('aria-label', 'Krok ' + (i + 1) + ': ' + s.title + ' — ' + s.state + (s.attempts > 1 ? ', ' + s.attempts + ' próby' : ''));
        if (s.state !== 'running') { el.classList.remove('over'); el.querySelector('.pg').style.strokeDashoffset = ''; }
        if (was && was !== s.state) {
          if (s.state === 'done') { flash(el, 'pop'); wave(i, rgb('--ok-rgb')); burst(i, rgb('--ok-rgb'), 18); }
          else if (s.state === 'failed' || s.state === 'denied') { flash(el, 'shake'); wave(i, rgb('--err-rgb')); burst(i, rgb('--err-rgb'), 12); }
        }
        if (e?.type === 'step.retry' && e.step_id === s.id) { flash(el, 'retry'); wave(i, rgb('--warn-rgb')); }
        prev[s.id] = s.state;
      });
      const cur = r.steps.find(s => s.state === 'running');
      $b('#wfLive').textContent = r.state === 'waiting' && r.pending ? '⏸ Czekam na Twoją odpowiedź: ' + r.pending.question
        : cur ? '▸ ' + cur.title + ' — ' + (KIND_PL[cur.kind] || cur.kind) + (cur.attempts > 1 ? ' (próba ' + cur.attempts + ', poprawiam po sprawdzeniu)' : '') : '';
      const rep = $b('#wfReport'), fin = !ACTIVE(r.state) && (r.report || r.reason);
      rep.className = 'wf-report' + (fin ? ' show ' + r.state : ''); rep.textContent = fin ? (r.report || r.reason) : '';
      if (e && /^run\.(completed|failed|stopped)$/.test(e.type)) finale(r);
      artifact(r); timeline(r); detail(r); gauges(r); tick(); kick();
    };
    const flash = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 900); };

    /* ---------- „Co powstaje”: wynik kroku animowany ---------- */
    const artifact = r => {
      const withArt = r.steps.filter(s => s.artifact && s.kind !== 'tool'), pick = r.steps.find(s => s.id === focusStep && s.artifact) || withArt[withArt.length - 1];
      const cur = r.steps.find(s => s.state === 'running');
      const key = (pick ? pick.id + ':' + pick.state : '-') + '|' + (cur ? cur.id + cur.attempts : '');
      const lv = cur && !focusStep && (!pick || r.steps.indexOf(cur) > r.steps.indexOf(pick)) ? cur.live : null;
      if (key === artKey) { if (lv) liveText(lv); return; }
      artKey = key;
      const box = $b('#wfArt'); box.innerHTML = '';
      $b('#wfArtStep').textContent = pick ? 'krok: ' + pick.title : '';
      if (cur && (!pick || r.steps.indexOf(cur) > r.steps.indexOf(pick)) && !focusStep) {
        box.appendChild(h('div', { class: 'wf-art-wip' }, '<i></i><i></i><i></i><span></span>')).querySelector('span').textContent = 'Hermes pracuje nad: ' + cur.title;
        box.appendChild(h('div', { class: 'wf-live-txt', 'aria-hidden': 'true' }, '<em></em><pre></pre>'));
        if (lv) liveText(lv);
      }
      if (!pick) { if (!cur) box.appendChild(h('div', { class: 'dim' }, 'Wyniki kroków pojawią się tutaj na żywo.')); return; }
      box.appendChild(renderArt(pick.artifact));
    };

    /* tekst, który Hermes właśnie pisze (zdarzenia step.progress z mostu), i narzędzie, po które sięga */
    const liveText = lv => {
      const w = $b('#wfArt .wf-live-txt'); if (!w) return;
      w.classList.toggle('on', !!(lv.tail || lv.tool));
      w.querySelector('em').textContent = [lv.chars ? 'pisze · ' + lv.chars.toLocaleString('pl-PL') + ' znaków' : '', lv.tool && lv.toolState !== 'completed' ? 'sięga po: ' + lv.tool + (lv.label ? ' · ' + lv.label : '') : ''].filter(Boolean).join(' · ');
      const pre = w.querySelector('pre'); pre.textContent = String(lv.tail || '').slice(-700); pre.scrollTop = pre.scrollHeight;
    };
    const timeline = r => {
      const box = $b('#wfTime'), list = r.timeline;
      if (shown > list.length) { box.innerHTML = ''; shown = 0; }
      for (; shown < list.length; shown++) {
        const t = list[shown], row = h('div', { class: 'wf-ev', 'data-t': t.type.split('.')[1] || t.type }, '<i></i><em></em><span></span>');
        row.querySelector('em').textContent = new Date(t.ts * 1000).toLocaleTimeString('pl-PL');
        row.querySelector('span').textContent = ({ 'run.started': 'start', 'run.resumed': 'wznowiono po restarcie', 'step.started': 'krok', 'step.completed': '✓', 'step.retry': '↻ ponawiam', 'step.failed': '✗', 'step.skipped': 'pominięto', 'ask.waiting': '⏸ pytanie', 'ask.answered': 'odpowiedź', 'run.completed': 'koniec ✓', 'run.failed': 'porażka', 'run.stopped': 'zatrzymano' }[t.type] || t.type) + (t.title ? ' · ' + t.title : '') + (t.text ? ' — ' + String(t.text).slice(0, 120) : '');
        box.prepend(row);
      }
      while (box.children.length > 40) box.lastChild.remove();
    };
    const detail = r => {
      const box = $b('#wfDetail'), fs = r.steps.find(s => s.id === focusStep);
      nodes().forEach((el, i) => el.classList.toggle('sel', r.steps[i]?.id === focusStep));
      box.innerHTML = fs ? '<b>' + esc(fs.title) + '</b> · ' + esc(KIND_PL[fs.kind] || fs.kind) + ' · ' + esc(fs.state) + (fs.errors?.length ? '<div class="wf-err">' + fs.errors.map(esc).join('<br>') + '</div>' : '') : '';
    };
    const gauges = r => {
      const b = r.budget || {}, u = r.budget_used || {}, now = nowOf(r);
      const secs = r.steps.reduce((a, s) => a + (s.state === 'running' ? Math.max(0, now - (s.startedAt || now)) : (s.ms || 0) / 1000), 0);   // czas pracy kroków — jak budżet w silniku
      const steps = r.steps.reduce((a, s) => a + (s.attempts || 0), 0) || u.steps || 0;
      const set = (g, frac, label) => { const el = $b('.wf-g[data-g="' + g + '"]'); if (!el) return; el.querySelector('.pg').style.strokeDashoffset = String(GAUGE * (1 - Math.min(1, frac || 0))); el.querySelector('b').textContent = label; el.classList.toggle('hot', frac > .85); };
      set('czas', b.minutes ? secs / (b.minutes * 60) : 0, clock(secs));
      set('kroki', b.steps ? steps / b.steps : 0, String(steps) + (b.steps ? '/' + b.steps : ''));
      set('tokeny', b.tokens && u.tokens ? u.tokens / b.tokens : 0, u.tokens ? Math.round(u.tokens / 1000) + 'k' : '—');
    };
    const tick = () => {
      const r = view(); if (!r) return;
      const now = nowOf(r);
      $b('#wfClock').textContent = '⏱ ' + clock((r.ended || now) - (r.started || now));
      const left = !replay && ACTIVE(r.state) ? eta(r, now) : 0; $b('#wfEta').textContent = left ? '≈ ' + clock(left) + ' do końca' : '';
      gauges(r);
      /* pierścień kroku w toku: ile z typowego czasu minęło; po przekroczeniu — pomarańczowy */
      const ex = expect(r);
      nodes().forEach((el, i) => {
        const s = r.steps[i]; if (!s || s.state !== 'running') return;
        const frac = Math.min(1, Math.max(.04, (now - (s.startedAt || now)) * 1000 / ex[s.id]));
        el.querySelector('.pg').style.strokeDashoffset = String(RING * (1 - frac)); el.classList.toggle('over', frac >= 1);
      });
    };

    /* ---------- kanwa ---------- */
    const geometry = () => {
      const dpr = Math.min(2, devicePixelRatio || 1), W = tilt.clientWidth, H = tilt.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rs = nodes().map(el => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
      edges = [];
      for (let i = 0; i < rs.length - 1; i++) {
        const a = rs[i], b = rs[i + 1], wrap = b.y > a.y + a.h / 2;
        const p0 = wrap ? { x: a.x + a.w / 2, y: a.y + a.h } : { x: a.x + a.w, y: a.y + a.h / 2 };
        const p3 = wrap ? { x: b.x + b.w / 2, y: b.y } : { x: b.x, y: b.y + b.h / 2 };
        const dy = (p3.y - p0.y) * .6, dx = (p3.x - p0.x) * .5;
        edges.push(wrap ? [p0, { x: p0.x, y: p0.y + dy }, { x: p3.x, y: p3.y - dy }, p3] : [p0, { x: p0.x + dx, y: p0.y }, { x: p3.x - dx, y: p3.y }, p3]);
      }
      edges.boxes = rs; draw(0);
    };
    const at = (e, t) => { const u = 1 - t; return { x: u * u * u * e[0].x + 3 * u * u * t * e[1].x + 3 * u * t * t * e[2].x + t * t * t * e[3].x, y: u * u * u * e[0].y + 3 * u * u * t * e[1].y + 3 * u * t * t * e[2].y + t * t * t * e[3].y }; };
    const center = i => { const b = edges.boxes?.[i]; return b ? { x: b.x + 34, y: b.y + b.h / 2 } : null; };
    const burst = (i, color, n) => {
      const c = center(i); if (!c || fxRank() < 2) return;
      for (let k = 0; k < n * (fxRank() >= 3 ? 1.6 : 1); k++) { const a = Math.random() * Math.PI * 2, v = 50 + Math.random() * 140; bursts.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: color, r: 1.2 + Math.random() * 2.2 }); }
      kick();
    };
    const wave = (i, color) => { const c = center(i); if (!c || fxRank() < 1) return; waves.push({ x: c.x, y: c.y, r: 14, life: 1, c: color }); kick(); };
    const finale = r => {
      const ban = $b('#wfBanner'), ok = r.state === 'done';
      ban.dataset.s = r.state; ban.querySelector('b').textContent = ok ? 'MISJA ZAKOŃCZONA' : r.state === 'stopped' ? 'MISJA ZATRZYMANA' : 'MISJA PRZERWANA'; ban.querySelector('small').textContent = r.name;
      ban.classList.remove('show'); void ban.offsetWidth; ban.classList.add('show'); clearTimeout(ban._t); ban._t = setTimeout(() => ban.classList.remove('show'), 4300);
      if (!ok || fxRank() < 2) return;
      flash($b('.wf-prog'), 'pop');
      nodes().forEach((el, i) => setTimeout(() => { wave(i, rgb('--ok-rgb')); burst(i, i % 2 ? rgb('--accent-rgb') : rgb('--ok-rgb'), 10); }, i * 110));
      const W = tilt.clientWidth, cols = [rgb('--accent-rgb'), rgb('--ok-rgb'), rgb('--accent2-rgb'), rgb('--warn-rgb')];
      for (let k = 0; k < (fxRank() >= 3 ? 160 : 70); k++) confetti.push({ x: Math.random() * W, y: -10 - Math.random() * 120, vx: (Math.random() - .5) * 60, vy: 60 + Math.random() * 120, rot: Math.random() * 6, vr: (Math.random() - .5) * 8, w: 4 + Math.random() * 5, h: 2 + Math.random() * 3, c: cols[k % 4], life: 1 });
      kick();
    };
    const draw = dt => {
      const r = view(), W = tilt.clientWidth, H = tilt.clientHeight, rank = fxRank();
      tsec += dt; g2.clearRect(0, 0, W, H); if (!r) return;
      const acc2 = rgb('--accent-rgb'), ok2 = rgb('--ok-rgb'), warn2 = rgb('--warn-rgb');
      edges.forEach((e, i) => {
        const from = r.steps[i]?.state, to = r.steps[i + 1]?.state, lit = from === 'done' || from === 'skipped', live = to === 'running';
        const path = () => { g2.beginPath(); g2.moveTo(e[0].x, e[0].y); g2.bezierCurveTo(e[1].x, e[1].y, e[2].x, e[2].y, e[3].x, e[3].y); };
        if (lit) {
          const gr = g2.createLinearGradient(e[0].x, e[0].y, e[3].x, e[3].y); gr.addColorStop(0, 'rgba(' + ok2 + ',.8)'); gr.addColorStop(1, 'rgba(' + (live ? acc2 : ok2) + ',.95)');
          path(); g2.strokeStyle = gr; g2.lineWidth = 2.4; g2.shadowColor = 'rgba(' + (live ? acc2 : ok2) + ',.85)'; g2.shadowBlur = rank >= 2 ? 12 : 0; g2.stroke(); g2.shadowBlur = 0;
          if (rank >= 2) { path(); g2.setLineDash([2, 14]); g2.lineDashOffset = -tsec * (live ? 60 : 24); g2.strokeStyle = 'rgba(255,255,255,' + (live ? .9 : .45) + ')'; g2.lineWidth = 2; g2.stroke(); g2.setLineDash([]); }
        } else { path(); g2.strokeStyle = 'rgba(160,190,240,.2)'; g2.lineWidth = 1.4; g2.setLineDash([4, 7]); g2.lineDashOffset = 0; g2.stroke(); g2.setLineDash([]); }
        if (rank >= 2 && dt) { const rate = live ? (rank >= 3 ? 10 : 6) : lit && rank >= 3 && ACTIVE(r.state) ? 1 : 0; if (Math.random() < rate * dt) parts.push({ e: i, t: 0, v: .35 + Math.random() * .4, c: live ? acc2 : ok2, r: live ? 2.8 : 1.8 }); }
      });
      /* aura i satelity wokół kroku w toku */
      r.steps.forEach((s, i) => {
        if (s.state !== 'running' || rank < 1) return; const c = center(i); if (!c) return;
        const over = nodes()[i]?.classList.contains('over'), col = over ? warn2 : acc2;
        const gr = g2.createRadialGradient(c.x, c.y, 8, c.x, c.y, 70); gr.addColorStop(0, 'rgba(' + col + ',.28)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        g2.fillStyle = gr; g2.beginPath(); g2.arc(c.x, c.y, 70, 0, Math.PI * 2); g2.fill();
        if (rank >= 2) for (let k = 0; k < 3; k++) { const a = tsec * (1.6 + k * .35) + k * 2.094, rr = 30 + k * 6, x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr * .55;
          g2.fillStyle = 'rgba(' + col + ',.95)'; g2.shadowColor = 'rgba(' + col + ',1)'; g2.shadowBlur = 10; g2.beginPath(); g2.arc(x, y, 2.2 - k * .4, 0, Math.PI * 2); g2.fill(); g2.shadowBlur = 0; }
      });
      parts = parts.filter(p => p.t <= 1 && edges[p.e]);
      parts.forEach(p => {
        p.t += p.v * dt; const q = at(edges[p.e], Math.min(1, p.t)), tl = at(edges[p.e], Math.max(0, p.t - .07));
        const gr = g2.createLinearGradient(tl.x, tl.y, q.x, q.y); gr.addColorStop(0, 'rgba(' + p.c + ',0)'); gr.addColorStop(1, 'rgba(' + p.c + ',.95)');
        g2.strokeStyle = gr; g2.lineWidth = p.r; g2.lineCap = 'round'; g2.beginPath(); g2.moveTo(tl.x, tl.y); g2.lineTo(q.x, q.y); g2.stroke();
        g2.fillStyle = 'rgba(' + p.c + ',1)'; g2.shadowColor = 'rgba(' + p.c + ',.95)'; g2.shadowBlur = 14; g2.beginPath(); g2.arc(q.x, q.y, p.r, 0, Math.PI * 2); g2.fill(); g2.shadowBlur = 0;
      });
      waves = waves.filter(w => w.life > 0);
      waves.forEach(w => { w.r += 120 * dt; w.life -= dt * 1.4; g2.strokeStyle = 'rgba(' + w.c + ',' + Math.max(0, w.life) + ')'; g2.lineWidth = 2.5 * Math.max(.2, w.life); g2.shadowColor = 'rgba(' + w.c + ',.9)'; g2.shadowBlur = 12; g2.beginPath(); g2.arc(w.x, w.y, w.r, 0, Math.PI * 2); g2.stroke(); g2.shadowBlur = 0; });
      bursts = bursts.filter(b => b.life > 0);
      bursts.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= .93; b.vy = b.vy * .93 + 40 * dt; b.life -= dt * 1.2;
        g2.fillStyle = 'rgba(' + b.c + ',' + Math.max(0, b.life) + ')'; g2.shadowColor = 'rgba(' + b.c + ',.9)'; g2.shadowBlur = 8; g2.beginPath(); g2.arc(b.x, b.y, b.r, 0, Math.PI * 2); g2.fill(); g2.shadowBlur = 0; });
      confetti = confetti.filter(c => c.life > 0 && c.y < H + 20);
      confetti.forEach(c => { c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; c.life -= dt * .28;
        g2.save(); g2.translate(c.x, c.y); g2.rotate(c.rot); g2.fillStyle = 'rgba(' + c.c + ',' + Math.min(1, c.life * 1.5) + ')'; g2.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); g2.restore(); });
    };
    let secAcc = 0;
    const loop = t => {
      raf = 0; const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
      draw(dt); secAcc += dt; if (secAcc > .5) { secAcc = 0; tick(); }
      const r = view();
      if (fxRank() >= 1 && !document.hidden && body.isConnected && (ACTIVE(r?.state) || parts.length || bursts.length || waves.length || confetti.length)) raf = requestAnimationFrame(loop); else last = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    /* przechył 3D sceny za myszą (poziom efektów ≥ 2, nie na dotyku) */
    stage.addEventListener('pointermove', ev => {
      if (fxRank() < 2 || ev.pointerType === 'touch') return;
      const b = stage.getBoundingClientRect(), x = (ev.clientX - b.left) / b.width - .5, y = (ev.clientY - b.top) / b.height - .5;
      tilt.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg'); tilt.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg');
      stage.style.setProperty('--mx', ((x + .5) * 100).toFixed(1) + '%'); stage.style.setProperty('--my', ((y + .5) * 100).toFixed(1) + '%');
    });
    stage.addEventListener('pointerleave', () => { tilt.style.setProperty('--ry', '0deg'); tilt.style.setProperty('--rx', '0deg'); });

    /* ---------- powtórka ---------- */
    const stopReplay = () => { if (!replay) return; replay.timers.forEach(clearTimeout); replay = null; $b('#wfReplay').textContent = '▶ Powtórka'; built = null; update(view()); };
    $b('#wfReplay').onclick = async () => {
      if (replay) return stopReplay();
      const r = sel && runs.get(sel); if (!r) return;
      let evs; try { evs = (await api('/workflows/runs/' + encodeURIComponent(r.id) + '?events=1')).events || []; } catch (er) { J.toast?.('Powtórka niedostępna: ' + er.message, 4000); return; }
      const start = evs.find(e => e.type === 'run.started'); if (!start) { J.toast?.('Brak zapisu startu tego przebiegu.', 3000); return; }
      replay = { run: Object.assign(blank(start), { id: 'replay:' + r.id, workflow: r.workflow, autonomy: start.autonomy, budget: r.budget }), timers: [] };
      $b('#wfReplay').textContent = '■ Zakończ powtórkę'; built = null; update(replay.run);
      let t = 0, prevTs = start.ts;
      evs.forEach(e => {
        const gap = Math.min(1600, Math.max(320, (e.ts - prevTs) * 60)); t += gap; const scale = gap / 1000 > 0 && e.ts - prevTs > 0 ? (e.ts - prevTs) / (gap / 1000) : 1; prevTs = e.ts;
        replay.timers.push(setTimeout(() => { if (!replay) return; const rr = replay.run; reduce(rr, e); rr.started = start.ts; rr._at = e.ts; rr._wall = Date.now(); rr._scale = scale; if (e.budget_used) rr.budget_used = e.budget_used; update(rr, e); }, t));
      });
      replay.timers.push(setTimeout(() => replay && J.toast?.('Koniec powtórki — „■” wraca do bieżącego stanu.', 3500), t + 900));
    };

    /* ---------- reszta ---------- */
    const renderList = () => {
      const list = WF.list, opts = $b('#wfRun');
      if (!sel || !runs.get(sel)) sel = WF.current()?.id || null;
      opts.innerHTML = list.length ? list.map(r => '<option value="' + esc(r.id) + '"' + (r.id === sel ? ' selected' : '') + '>' + esc(r.name) + ' · ' + new Date((r.started || 0) * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (STATE_PL[r.state] || r.state) + '</option>').join('') : '<option>Brak przebiegów</option>';
    };
    const refreshView = e => { renderList(); const r = view(); if (!r) { build(null); draw(0); return; } update(r, e); };
    $b('#wfRun').onchange = ev => { stopReplay(); sel = ev.target.value; built = null; focusStep = null; refreshView(); };
    $b('#wfStop').onclick = () => sel && J.uiRun('workflow_stop', { run_id: sel });
    $b('#wfNew').onclick = async () => { const f = $b('#wfForm'); f.classList.toggle('hidden'); const d = await WF.defs(); $b('#wfDef').innerHTML = d.map(x => '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>').join(''); };
    $b('#wfGo').onclick = async () => {
      const d = (WF.defList || []).find(x => x.id === $b('#wfDef').value), text = $b('#wfIn').value.trim(); if (!d) return;
      const key = Object.keys(d.inputs || {})[0], res = await J.uiRun('workflow_run', { workflow: d.id, inputs: key ? { [key]: text } : {} });
      if (res?.ok) { sel = res.data.id; $b('#wfForm').classList.add('hidden'); $b('#wfIn').value = ''; }
    };
    ctx.onClose(J.on('workflows', p => { if (replay) { renderList(); return; } const id = p?.id; if (!sel || !id || id === sel || !runs.get(sel)) { if (id && !runs.get(sel)) sel = id; refreshView(p?.e); } else renderList(); }));
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => geometry()) : null; ro?.observe(tilt);
    const iv = setInterval(tick, 1000);
    ctx.onClose(() => { ro?.disconnect(); clearInterval(iv); cancelAnimationFrame(raf); if (replay) replay.timers.forEach(clearTimeout); setTimeout(pill.render, 50); });
    pill.render();
    WF.refresh().then(() => refreshView()); refreshView();
  }
};
})();
