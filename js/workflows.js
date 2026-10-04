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
  const lines = r.steps.map(s => MARK[s.state] + ' ' + s.title + (s.state === 'running' && s.attempts > 1 ? ' (próba ' + s.attempts + ')' : '') + (s.ms != null && s.state === 'done' ? ' · ' + fmtS(s.ms) + (s.attempts > 1 ? ' · ' + s.attempts + ' próby' : '') : ''));
  const tail = r.state === 'waiting' && r.pending ? '\n\n⏸ ' + r.pending.question : r.state === 'done' ? '\n\n' + (r.report || '') : r.reason ? '\n\n' + r.reason : '\n\nPrzebieg na żywo: „pokaż mapę pracy”.';
  return head + '\n' + lines.join('\n') + tail;
};

const touch = (r, e) => { if (r.chat) r.chat.set(cardText(r)); J.emit('workflows', { id: r.id, e }); };
/* stan przebiegu z jednego zdarzenia — bez efektów ubocznych (używa go też powtórka w Mapie pracy) */
const reduce = (r, e) => {
  r.state = e.state || r.state;
  r.timeline.push({ ts: e.ts, type: e.type, title: e.title || '', text: e.reason || e.preview || e.question || '' }); if (r.timeline.length > 60) r.timeline.shift();
  const s = r.steps.find(x => x.id === e.step_id);
  switch (e.type) {
    case 'run.started': r.autonomy = e.autonomy; break;
    case 'step.started': if (s) Object.assign(s, { state: 'running', attempts: e.attempt || 1 }); break;
    case 'step.retry': if (s) s.errors.push(e.reason); break;
    case 'step.completed': case 'step.skipped': if (s) Object.assign(s, { state: e.type === 'step.completed' ? 'done' : 'skipped', ms: e.ms ?? s.ms, preview: e.preview || '', score: e.score ?? s.score }); break;
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
  runs, cardText, reduce,
  get list() { return [...runs.values()].sort((a, b) => (b.started || 0) - (a.started || 0)); },
  current() { return WF.list.find(r => ACTIVE(r.state)) || WF.list[0] || null; },
  onEvent(e) {
    if (!e || typeof e.type !== 'string' || typeof e.run_id !== 'string') return;
    let r = runs.get(e.run_id);
    if (e.type === 'run.snapshot') { r = fromSnapshot(e.snapshot || {}, r); runs.set(r.id, r); touch(r, e); return; }
    if (!r) { if (e.type !== 'run.started') return; r = blank(e); runs.set(r.id, r); }
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
  async refresh() {
    try { const j = await api('/workflows/runs', { timeout: 10000 }); (j.runs || []).forEach(s => { const r = fromSnapshot(s, runs.get(s.id)); runs.set(r.id, r); }); J.emit('workflows'); } catch (e) { /* most niedostępny */ }
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

/* ---------- aplikacja „Mapa pracy” — przebieg na żywo: pierścienie postępu, świecące połączenia z cząstkami, rozbłyski, powtórka ----------
   Węzły to przyciski (dostępność), połączenia i cząstki rysuje kanwa pod nimi. Okno nie jest przebudowywane przy każdym zdarzeniu —
   zmieniają się tylko atrybuty, więc animacje CSS się nie urywają. Ruch zależy od poziomu efektów (J.fx): 0 — statycznie,
   1 — przejścia bez cząstek, 2 — cząstki, 3 (kino) — gęstsze cząstki i rozbłysk na koniec przebiegu. */
const KIND_IC = { hermes: 'spark', check: 'search', write_files: 'folder', tool: 'bolt', ask: 'chat' };
const KIND_PL = { hermes: 'Hermes myśli', check: 'sprawdzenie', write_files: 'zapis plików', tool: 'polecenie pulpitu', ask: 'pytanie do Ciebie' };
const RING = 2 * Math.PI * 17;
const fxRank = () => J.fx?.rank?.() ?? 2;
const clock = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

J.apps.workflows = {
  title: 'Mapa pracy', icon: 'flow', minW: 420, minH: 360, w: 900, h: 580,
  mount(body, ctx) {
    let sel = null, built = null, prev = {}, replay = null, raf = 0, last = 0, shown = 0, edges = [], parts = [], bursts = [], acc = 0;
    body.innerHTML = '<div class="wf">' +
      '<div class="wf-head"><div class="wf-prog" aria-hidden="true"><svg viewBox="0 0 64 64"><circle class="tr" cx="32" cy="32" r="27"/><circle class="pg" id="wfPg" cx="32" cy="32" r="27"/></svg><b id="wfPct">0%</b></div>' +
      '<div class="wf-title"><select class="input" id="wfRun" aria-label="Przebieg"></select><div class="wf-stats"><span class="wf-chip" id="wfState"><i></i><em></em></span><span id="wfClock" title="czas przebiegu">0:00</span><span id="wfTok" title="zużyte tokeny"></span><span id="wfAut" title="samodzielność"></span></div></div>' +
      '<div class="wf-acts"><button class="btn sm ghost" id="wfReplay" title="Odtwórz przebieg jak film">▶ Powtórka</button><button class="btn sm ghost danger" id="wfStop">Stop</button><button class="btn sm ghost" id="wfNew">Nowy…</button></div></div>' +
      '<div class="wf-new hidden" id="wfForm"><select class="input" id="wfDef" aria-label="Workflow"></select><textarea class="input" id="wfIn" rows="2" placeholder="Pomysł / dane wejściowe…"></textarea><button class="btn sm primary" id="wfGo">Uruchom</button></div>' +
      '<div class="wf-stage" id="wfStage"><canvas class="wf-cv" id="wfCv" aria-hidden="true"></canvas><div class="wf-graph" id="wfGraph" role="list" aria-label="Kroki workflow"></div></div>' +
      '<div class="wf-live" id="wfLive" aria-live="polite"></div><div class="wf-report" id="wfReport"></div><div class="wf-detail" id="wfDetail"></div>' +
      '<div class="label">Oś czasu</div><div class="wf-time" id="wfTime"></div></div>';
    const $b = s => body.querySelector(s), stage = $b('#wfStage'), cv = $b('#wfCv'), g2 = cv.getContext('2d'), graph = $b('#wfGraph');
    const view = () => replay?.run || (sel && runs.get(sel)) || null;
    const rgb = name => getComputedStyle(body).getPropertyValue(name).trim() || '51,214,255';

    /* ---------- węzły (budowane raz na przebieg) ---------- */
    const build = r => {
      graph.innerHTML = ''; prev = {}; shown = 0; $b('#wfTime').innerHTML = ''; parts = []; bursts = [];
      if (!r) { graph.innerHTML = '<div class="empty">Brak przebiegów. Powiedz np. „zrób projekt z pomysłu aplikacja do nawyków” albo kliknij „Nowy…”.</div>'; built = null; return; }
      r.steps.forEach((s, i) => {
        const b = h('button', { class: 'wf-node', 'data-s': 'pending', 'data-k': s.kind, role: 'listitem', style: '--i:' + i },
          '<span class="wf-ring"><svg viewBox="0 0 40 40"><circle class="tr" cx="20" cy="20" r="17"/><circle class="pg" cx="20" cy="20" r="17"/></svg><span class="wf-ic">' + J.icon(KIND_IC[s.kind] || 'star') + '</span><span class="wf-ok">✓</span></span>' +
          '<span class="wf-txt"><b></b><small></small></span><i class="wf-retry"></i>');
        b.querySelector('b').textContent = s.title;
        b.onclick = () => detail(s.id);
        graph.appendChild(b);
      });
      built = r.id; geometry();
    };
    const nodes = () => [...graph.querySelectorAll('.wf-node')];

    /* ---------- aktualizacja (bez przebudowy) ---------- */
    const update = (r, e) => {
      if (!r) return;
      if (built !== r.id) build(r);
      const total = r.steps.length, done = r.steps.filter(s => s.state === 'done' || s.state === 'skipped').length, pct = total ? done / total : 0;
      $b('#wfPg').style.strokeDashoffset = String(2 * Math.PI * 27 * (1 - pct)); $b('#wfPct').textContent = Math.round(pct * 100) + '%';
      const chip = $b('#wfState'); chip.dataset.s = r.state; chip.querySelector('em').textContent = STATE_PL[r.state] || r.state;
      $b('#wfTok').textContent = r.budget_used?.tokens ? Math.round(r.budget_used.tokens / 1000) + 'k tokenów' : '';
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
        if (was && was !== s.state) {
          if (s.state === 'done') { flash(el, 'pop'); burst(i, rgb('--ok-rgb'), 16); }
          else if (s.state === 'failed' || s.state === 'denied') { flash(el, 'shake'); burst(i, rgb('--err-rgb'), 12); }
          else if (s.state === 'running' && was === 'running') { /* ponowienie */ }
        }
        if (e?.type === 'step.retry' && e.step_id === s.id) { flash(el, 'retry'); burst(i, rgb('--warn-rgb'), 10); }
        prev[s.id] = s.state;
      });
      const cur = r.steps.find(s => s.state === 'running');
      $b('#wfLive').textContent = r.state === 'waiting' && r.pending ? '⏸ Czekam na Twoją odpowiedź: ' + r.pending.question
        : cur ? 'Teraz: ' + cur.title + ' — ' + (KIND_PL[cur.kind] || cur.kind) + (cur.attempts > 1 ? ' (próba ' + cur.attempts + ', poprawiam po sprawdzeniu)' : '') : '';
      const rep = $b('#wfReport'), fin = !ACTIVE(r.state) && (r.report || r.reason);
      rep.className = 'wf-report' + (fin ? ' show ' + r.state : ''); rep.textContent = fin ? (r.report || r.reason) : '';
      if (fin && r.state === 'done' && e?.type === 'run.completed' && fxRank() >= 2) celebrate();
      timeline(r); detail(); clockTick(); kick();
    };
    const flash = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 900); };
    const timeline = r => {
      const box = $b('#wfTime'), list = r.timeline;
      if (shown > list.length) { box.innerHTML = ''; shown = 0; }
      for (; shown < list.length; shown++) {
        const t = list[shown], row = h('div', { class: 'wf-ev', 'data-t': t.type.split('.')[1] || t.type });
        row.innerHTML = '<i></i><em></em><span></span>';
        row.querySelector('em').textContent = new Date(t.ts * 1000).toLocaleTimeString('pl-PL');
        row.querySelector('span').textContent = ({ 'run.started': 'start', 'run.resumed': 'wznowiono po restarcie', 'step.started': 'krok', 'step.completed': '✓', 'step.retry': '↻ ponawiam', 'step.failed': '✗', 'step.skipped': 'pominięto', 'ask.waiting': '⏸ pytanie', 'ask.answered': 'odpowiedź', 'run.completed': 'koniec ✓', 'run.failed': 'porażka', 'run.stopped': 'zatrzymano' }[t.type] || t.type) + (t.title ? ' · ' + t.title : '') + (t.text ? ' — ' + String(t.text).slice(0, 140) : '');
        box.prepend(row);
      }
      while (box.children.length > 40) box.lastChild.remove();
    };
    let focusStep = null;
    const detail = id => {
      if (id !== undefined) focusStep = focusStep === id ? null : id;
      const r = view(), box = $b('#wfDetail'); if (!r) { box.innerHTML = ''; return; }
      const fs = r.steps.find(s => s.id === focusStep);
      nodes().forEach((el, i) => el.classList.toggle('sel', r.steps[i]?.id === focusStep));
      box.innerHTML = fs ? '<b>' + esc(fs.title) + '</b> · ' + esc(KIND_PL[fs.kind] || fs.kind) + ' · ' + esc(fs.state) + (fs.preview ? '<div class="dim">' + esc(fs.preview) + '</div>' : '') + (fs.errors?.length ? '<div class="wf-err">' + fs.errors.map(esc).join('<br>') + '</div>' : '') : '';
    };
    const clockTick = () => { const r = view(); if (!r?.started) { $b('#wfClock').textContent = '0:00'; return; } $b('#wfClock').textContent = '⏱ ' + clock((r.ended || r._at || Date.now() / 1000) - r.started); };   // powtórka: czas z odtwarzanego zdarzenia

    /* ---------- kanwa: połączenia, cząstki, rozbłyski ---------- */
    const geometry = () => {
      const dpr = Math.min(2, devicePixelRatio || 1), W = stage.clientWidth, H = stage.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sr = stage.getBoundingClientRect(), rs = nodes().map(el => { const b = el.getBoundingClientRect(); return { x: b.left - sr.left, y: b.top - sr.top, w: b.width, h: b.height }; });
      edges = [];
      for (let i = 0; i < rs.length - 1; i++) {
        const a = rs[i], b = rs[i + 1], wrap = b.y > a.y + a.h / 2;
        const p0 = wrap ? { x: a.x + a.w / 2, y: a.y + a.h } : { x: a.x + a.w, y: a.y + a.h / 2 };
        const p3 = wrap ? { x: b.x + b.w / 2, y: b.y } : { x: b.x, y: b.y + b.h / 2 };
        const dy = (p3.y - p0.y) * .55, dx = (p3.x - p0.x) * .5;
        edges.push(wrap ? [p0, { x: p0.x, y: p0.y + dy }, { x: p3.x, y: p3.y - dy }, p3] : [p0, { x: p0.x + dx, y: p0.y }, { x: p3.x - dx, y: p3.y }, p3]);
      }
      draw(0);
    };
    const at = (e, t) => { const u = 1 - t; return { x: u * u * u * e[0].x + 3 * u * u * t * e[1].x + 3 * u * t * t * e[2].x + t * t * t * e[3].x, y: u * u * u * e[0].y + 3 * u * u * t * e[1].y + 3 * u * t * t * e[2].y + t * t * t * e[3].y }; };
    const burst = (i, color, n) => {
      if (fxRank() < 2) return;
      const el = nodes()[i]; if (!el) return;
      const sr = stage.getBoundingClientRect(), b = el.getBoundingClientRect(), cx = b.left - sr.left + 26, cy = b.top - sr.top + b.height / 2;
      for (let k = 0; k < n * (fxRank() >= 3 ? 1.6 : 1); k++) { const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 120; bursts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: color, r: 1.2 + Math.random() * 2 }); }
      kick();
    };
    const celebrate = () => { nodes().forEach((el, i) => setTimeout(() => burst(i, i % 2 ? rgb('--accent-rgb') : rgb('--ok-rgb'), 14), i * 90)); flash($b('.wf-prog'), 'pop'); };
    const draw = dt => {
      const r = view(), W = stage.clientWidth, H = stage.clientHeight, rank = fxRank();
      g2.clearRect(0, 0, W, H); if (!r) return;
      const acc2 = rgb('--accent-rgb'), ok2 = rgb('--ok-rgb');
      edges.forEach((e, i) => {
        const from = r.steps[i]?.state, to = r.steps[i + 1]?.state, lit = from === 'done' || from === 'skipped', live = to === 'running';
        g2.beginPath(); g2.moveTo(e[0].x, e[0].y); g2.bezierCurveTo(e[1].x, e[1].y, e[2].x, e[2].y, e[3].x, e[3].y);
        if (lit) {
          const gr = g2.createLinearGradient(e[0].x, e[0].y, e[3].x, e[3].y); gr.addColorStop(0, 'rgba(' + ok2 + ',.75)'); gr.addColorStop(1, 'rgba(' + (live ? acc2 : ok2) + ',.95)');
          g2.strokeStyle = gr; g2.lineWidth = 2.2; g2.setLineDash([]); g2.shadowColor = 'rgba(' + (live ? acc2 : ok2) + ',.8)'; g2.shadowBlur = rank >= 2 ? 10 : 0;
        } else { g2.strokeStyle = 'rgba(160,190,240,.22)'; g2.lineWidth = 1.4; g2.setLineDash([4, 6]); g2.shadowBlur = 0; }
        g2.stroke(); g2.setLineDash([]); g2.shadowBlur = 0;
        if (rank >= 2 && dt) {
          const rate = live ? (rank >= 3 ? 9 : 6) : lit && rank >= 3 && ACTIVE(r.state) ? .8 : 0;
          if (Math.random() < rate * dt) parts.push({ e: i, t: 0, v: .35 + Math.random() * .35, c: live ? acc2 : ok2, r: live ? 2.6 : 1.8 });
        }
      });
      parts = parts.filter(p => p.t <= 1 && edges[p.e]);
      parts.forEach(p => {
        p.t += p.v * dt; const q = at(edges[p.e], Math.min(1, p.t)), tail = at(edges[p.e], Math.max(0, p.t - .06));
        const gr = g2.createLinearGradient(tail.x, tail.y, q.x, q.y); gr.addColorStop(0, 'rgba(' + p.c + ',0)'); gr.addColorStop(1, 'rgba(' + p.c + ',.95)');
        g2.strokeStyle = gr; g2.lineWidth = p.r; g2.lineCap = 'round'; g2.beginPath(); g2.moveTo(tail.x, tail.y); g2.lineTo(q.x, q.y); g2.stroke();
        g2.fillStyle = 'rgba(' + p.c + ',1)'; g2.shadowColor = 'rgba(' + p.c + ',.9)'; g2.shadowBlur = 12; g2.beginPath(); g2.arc(q.x, q.y, p.r, 0, Math.PI * 2); g2.fill(); g2.shadowBlur = 0;
      });
      bursts = bursts.filter(b => b.life > 0);
      bursts.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= .93; b.vy = b.vy * .93 + 30 * dt; b.life -= dt * 1.25;
        g2.fillStyle = 'rgba(' + b.c + ',' + Math.max(0, b.life) + ')'; g2.shadowColor = 'rgba(' + b.c + ',.9)'; g2.shadowBlur = 8; g2.beginPath(); g2.arc(b.x, b.y, b.r, 0, Math.PI * 2); g2.fill(); g2.shadowBlur = 0; });
    };
    const loop = t => {
      raf = 0; const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
      draw(dt);
      acc += dt; if (acc > 1) { acc = 0; clockTick(); }
      const r = view();
      if (fxRank() >= 2 && !document.hidden && (ACTIVE(r?.state) || parts.length || bursts.length)) raf = requestAnimationFrame(loop); else last = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    /* ---------- powtórka: zdarzenia przebiegu z pliku mostu, odtwarzane ze skróconymi przerwami ---------- */
    const stopReplay = () => { if (!replay) return; replay.timers.forEach(clearTimeout); replay = null; $b('#wfReplay').textContent = '▶ Powtórka'; built = null; update(view()); };
    $b('#wfReplay').onclick = async () => {
      if (replay) return stopReplay();
      const r = sel && runs.get(sel); if (!r) return;
      let evs; try { evs = (await api('/workflows/runs/' + encodeURIComponent(r.id) + '?events=1')).events || []; } catch (er) { J.toast?.('Powtórka niedostępna: ' + er.message, 4000); return; }
      const start = evs.find(e => e.type === 'run.started'); if (!start) { J.toast?.('Brak zapisu startu tego przebiegu.', 3000); return; }
      replay = { run: Object.assign(blank(start), { id: 'replay:' + r.id, autonomy: start.autonomy }), timers: [] };
      $b('#wfReplay').textContent = '■ Zakończ powtórkę'; built = null; update(replay.run);
      let t = 0, prevTs = start.ts;
      evs.forEach(e => { t += Math.min(1400, Math.max(260, (e.ts - prevTs) * 120)); prevTs = e.ts;
        replay.timers.push(setTimeout(() => { if (!replay) return; reduce(replay.run, e); replay.run.started = start.ts; replay.run._at = e.ts; update(replay.run, e); }, t)); });
      replay.timers.push(setTimeout(() => replay && J.toast?.('Koniec powtórki — „■” wraca do bieżącego stanu.', 3500), t + 600));
    };

    /* ---------- reszta interfejsu ---------- */
    const renderList = () => {
      const list = WF.list, opts = $b('#wfRun');
      if (!sel || !runs.get(sel)) sel = WF.current()?.id || null;
      opts.innerHTML = list.length ? list.map(r => '<option value="' + esc(r.id) + '"' + (r.id === sel ? ' selected' : '') + '>' + esc(r.name) + ' · ' + new Date((r.started || 0) * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (STATE_PL[r.state] || r.state) + '</option>').join('') : '<option>Brak przebiegów</option>';
    };
    const refreshView = (e) => { renderList(); const r = view(); if (!r) { build(null); draw(0); return; } update(r, e); };
    $b('#wfRun').onchange = ev => { stopReplay(); sel = ev.target.value; built = null; focusStep = null; refreshView(); };
    $b('#wfStop').onclick = () => sel && J.uiRun('workflow_stop', { run_id: sel });
    $b('#wfNew').onclick = async () => { const f = $b('#wfForm'); f.classList.toggle('hidden'); const d = await WF.defs(); $b('#wfDef').innerHTML = d.map(x => '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>').join(''); };
    $b('#wfGo').onclick = async () => {
      const d = (WF.defList || []).find(x => x.id === $b('#wfDef').value), text = $b('#wfIn').value.trim(); if (!d) return;
      const key = Object.keys(d.inputs || {})[0], res = await J.uiRun('workflow_run', { workflow: d.id, inputs: key ? { [key]: text } : {} });
      if (res?.ok) { sel = res.data.id; $b('#wfForm').classList.add('hidden'); $b('#wfIn').value = ''; }
    };
    ctx.onClose(J.on('workflows', p => { if (replay) { renderList(); return; } const id = p?.id; if (!sel || !id || id === sel || !runs.get(sel)) { if (id && !runs.get(sel)) sel = id; refreshView(p?.e); } else renderList(); }));
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => geometry()) : null; ro?.observe(stage);
    const iv = setInterval(clockTick, 1000);
    ctx.onClose(() => { ro?.disconnect(); clearInterval(iv); cancelAnimationFrame(raf); if (replay) replay.timers.forEach(clearTimeout); });
    WF.refresh().then(() => refreshView()); refreshView();
  }
};
})();
