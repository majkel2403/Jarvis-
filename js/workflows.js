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
  const head = '**Workflow: ' + r.name + '** — ' + (ACTIVE(r.state) ? 'krok ' + Math.min(r.steps.length, done + 1) + '/' + r.steps.length : STATE_PL[r.state] || r.state);
  const lines = r.steps.map(s => MARK[s.state] + ' ' + s.title + (s.state === 'running' && s.attempts > 1 ? ' (próba ' + s.attempts + ')' : '') + (s.ms != null && s.state === 'done' ? ' · ' + fmtS(s.ms) + (s.attempts > 1 ? ' · ' + s.attempts + ' próby' : '') : ''));
  const tail = r.state === 'waiting' && r.pending ? '\n\n⏸ ' + r.pending.question : r.state === 'done' ? '\n\n' + (r.report || '') : r.reason ? '\n\n' + r.reason : '\n\nPrzebieg na żywo: „pokaż mapę pracy”.';
  return head + '\n' + lines.join('\n') + tail;
};

const touch = r => { if (r.chat) r.chat.set(cardText(r)); J.emit('workflows', r.id); };
const stepOf = (r, e) => r.steps.find(s => s.id === e.step_id);
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
  runs, cardText,
  get list() { return [...runs.values()].sort((a, b) => (b.started || 0) - (a.started || 0)); },
  current() { return WF.list.find(r => ACTIVE(r.state)) || WF.list[0] || null; },
  onEvent(e) {
    if (!e || typeof e.type !== 'string' || typeof e.run_id !== 'string') return;
    let r = runs.get(e.run_id);
    if (e.type === 'run.snapshot') { r = fromSnapshot(e.snapshot || {}, r); runs.set(r.id, r); touch(r); return; }
    if (!r) { if (e.type !== 'run.started') return; r = blank(e); runs.set(r.id, r); }
    r.state = e.state || r.state;
    r.timeline.push({ ts: e.ts, type: e.type, title: e.title || '', text: e.reason || e.preview || e.question || '' }); if (r.timeline.length > 60) r.timeline.shift();
    const s = stepOf(r, e);
    switch (e.type) {
      case 'run.started':
        r.autonomy = e.autonomy;
        r.chat = J.chat.add('jarvis', cardText(r));
        adopt(r);
        break;
      case 'run.resumed': J.proc.active || J.toast?.('Workflow „' + r.name + '” wznowiony po restarcie mostu', 4000); break;
      case 'step.started':
        if (s) Object.assign(s, { state: 'running', attempts: e.attempt || 1 });
        adopt(r);
        if (ownsProc(r)) { r.handles[e.step_id] = J.proc.step('server', 'Krok ' + e.n + '/' + e.total + ': ' + e.title + (e.attempt > 1 ? ' (próba ' + e.attempt + ')' : ''), [['Rodzaj', e.kind]], { running: true }); J.ev.emit('tool.started', { task_id: r.id, tool: 'workflow:' + e.kind, source: 'workflow' }, 'workflow'); }
        break;
      case 'step.retry':
        if (s) s.errors.push(e.reason);
        if (ownsProc(r)) { r.handles[e.step_id]?.fail('nie przeszło sprawdzenia — ponawiam ze zmianą: ' + e.reason); J.ev.emit('tool.failed', { task_id: r.id, tool: 'workflow:' + e.kind, source: 'workflow', code: 'RETRY' }, 'workflow'); }
        break;
      case 'step.completed': case 'step.skipped':
        if (s) Object.assign(s, { state: e.type === 'step.completed' ? 'done' : 'skipped', ms: e.ms ?? s.ms, preview: e.preview || '', score: e.score ?? s.score });
        if (ownsProc(r)) { const st = r.handles[e.step_id] || J.proc.step('server', 'Krok ' + e.n + '/' + e.total + ': ' + e.title); st.done(e.score != null ? [['Ocena', String(e.score)]] : null, e.preview || ''); J.proc.planStep(e.n - 1); J.ev.emit('tool.completed', { task_id: r.id, tool: 'workflow:' + e.kind, source: 'workflow', code: 'OK' }, 'workflow'); }
        break;
      case 'step.failed':
        if (s) { s.state = e.reason === 'DENIED' ? 'denied' : 'failed'; if (e.reason) s.errors.push(e.reason); }
        if (ownsProc(r)) { r.handles[e.step_id]?.fail(e.reason || 'błąd'); J.ev.emit('tool.failed', { task_id: r.id, tool: 'workflow:' + e.kind, source: 'workflow', code: 'ERROR' }, 'workflow'); }
        break;
      case 'ask.waiting':
        r.pending = { question: e.question, options: e.options || [] };
        WF.ask(r);
        break;
      case 'ask.answered': r.pending = null; break;
      case 'run.completed': case 'run.failed': case 'run.stopped': {
        r.ended = e.ts; r.report = e.report || r.report; r.reason = e.reason || r.reason; r.budget_used = e.budget_used || r.budget_used; r.pending = null;
        const st = e.type === 'run.completed' ? 'ok' : e.type === 'run.failed' ? 'err' : 'abort';
        if (ownsProc(r)) { J.proc.step('reply', 'Wynik workflow', [['Treść', r.report || r.reason || '']], { preview: String(r.report || r.reason || '').slice(0, 70) }); J.proc.end(st, r.report || r.reason || ''); J.ev.emit(st === 'ok' ? 'task.completed' : st === 'err' ? 'task.failed' : 'task.cancelled', { task_id: r.id, result: String(r.report || r.reason || '').slice(0, 300) }, 'workflow'); }
        r.proc = null; J.sfx?.[st === 'ok' ? 'notify' : 'error']?.();
        break;
      }
    }
    touch(r);
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

/* ---------- aplikacja „Mapa pracy” ---------- */
J.apps.workflows = {
  title: 'Mapa pracy', icon: 'flow', minW: 360, minH: 320, w: 760, h: 480,
  mount(body, ctx) {
    let sel = null, focusStep = null;
    body.innerHTML = '<div class="wf"><div class="wf-bar"><select class="input" id="wfRun" aria-label="Przebieg"></select><span class="wf-meta" id="wfMeta" aria-live="polite"></span>' +
      '<button class="btn sm ghost danger" id="wfStop">Stop</button><button class="btn sm ghost" id="wfNew">Nowy…</button></div>' +
      '<div class="wf-new hidden" id="wfForm"><select class="input" id="wfDef" aria-label="Workflow"></select><textarea class="input" id="wfIn" rows="2" placeholder="Pomysł / dane wejściowe…"></textarea><button class="btn sm primary" id="wfGo">Uruchom</button></div>' +
      '<div class="wf-graph" id="wfGraph" role="list" aria-label="Kroki workflow"></div><div class="wf-detail" id="wfDetail"></div>' +
      '<div class="label">Oś czasu</div><div class="wf-time" id="wfTime"></div></div>';
    const $b = s => body.querySelector(s);
    const render = () => {
      const list = WF.list, opts = $b('#wfRun');
      if (!sel || !runs.get(sel)) sel = WF.current()?.id || null;
      opts.innerHTML = list.length ? list.map(r => '<option value="' + esc(r.id) + '"' + (r.id === sel ? ' selected' : '') + '>' + esc(r.name) + ' · ' + new Date((r.started || 0) * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) + ' · ' + (STATE_PL[r.state] || r.state) + '</option>').join('') : '<option>Brak przebiegów</option>';
      const r = sel && runs.get(sel), g = $b('#wfGraph');
      $b('#wfStop').disabled = !(r && ACTIVE(r.state));
      if (!r) { g.innerHTML = '<div class="empty">Brak przebiegów. Powiedz np. „zrób projekt z pomysłu aplikacja do nawyków” albo kliknij „Nowy…”.</div>'; $b('#wfMeta').textContent = ''; $b('#wfTime').innerHTML = ''; $b('#wfDetail').innerHTML = ''; return; }
      const used = r.budget_used || {}, done = r.steps.filter(s => s.state === 'done' || s.state === 'skipped').length;
      $b('#wfMeta').textContent = (STATE_PL[r.state] || r.state) + ' · ' + done + '/' + r.steps.length + (r.autonomy ? ' · ' + r.autonomy : '') + (used.seconds ? ' · ' + Math.round(used.seconds) + ' s' : '') + (used.tokens ? ' · ' + Math.round(used.tokens / 1000) + 'k tok.' : '');
      g.innerHTML = '';
      r.steps.forEach((s, i) => {
        if (i) g.appendChild(h('span', { class: 'wf-edge' + (s.state !== 'pending' ? ' on' : ''), 'aria-hidden': 'true' }));
        const b = h('button', { class: 'wf-node', 'data-s': s.state, role: 'listitem', 'aria-label': 'Krok ' + (i + 1) + ': ' + s.title + ' — ' + s.state + (s.attempts > 1 ? ', ' + s.attempts + ' próby' : '') },
          '<b></b><small></small>' + (s.attempts > 1 ? '<i class="wf-retry" title="ponowienia">↻' + (s.attempts - 1) + '</i>' : ''));
        b.querySelector('b').textContent = MARK[s.state] + ' ' + s.title;
        b.querySelector('small').textContent = [s.ms != null ? fmtS(s.ms) : '', s.score != null ? 'ocena ' + s.score : ''].filter(Boolean).join(' · ') || s.state;
        b.onclick = () => { focusStep = s.id; render(); };
        g.appendChild(b);
      });
      const fs = r.steps.find(s => s.id === focusStep) || r.steps.find(s => s.state === 'running') || null;
      $b('#wfDetail').innerHTML = fs ? '<b>' + esc(fs.title) + '</b> · ' + esc(fs.state) + (fs.preview ? '<div class="dim">' + esc(fs.preview) + '</div>' : '') + (fs.errors?.length ? '<div class="wf-err">' + fs.errors.map(esc).join('<br>') + '</div>' : '') : (r.report || r.reason ? '<div>' + esc(r.report || r.reason) + '</div>' : '');
      $b('#wfTime').innerHTML = r.timeline.slice(-30).reverse().map(t => '<div class="wf-ev"><em>' + new Date(t.ts * 1000).toLocaleTimeString('pl-PL') + '</em> ' + esc(t.type) + (t.title ? ' · ' + esc(t.title) : '') + (t.text ? ' — ' + esc(String(t.text).slice(0, 140)) : '') + '</div>').join('') || '<div class="dim">—</div>';
    };
    $b('#wfRun').onchange = e => { sel = e.target.value; focusStep = null; render(); };
    $b('#wfStop').onclick = () => sel && J.uiRun('workflow_stop', { run_id: sel });
    $b('#wfNew').onclick = async () => { const f = $b('#wfForm'); f.classList.toggle('hidden'); const d = await WF.defs(); $b('#wfDef').innerHTML = d.map(x => '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>').join(''); };
    $b('#wfGo').onclick = async () => {
      const d = (WF.defList || []).find(x => x.id === $b('#wfDef').value), text = $b('#wfIn').value.trim(); if (!d) return;
      const key = Object.keys(d.inputs || {})[0], res = await J.uiRun('workflow_run', { workflow: d.id, inputs: key ? { [key]: text } : {} });
      if (res?.ok) { sel = res.data.id; $b('#wfForm').classList.add('hidden'); $b('#wfIn').value = ''; }
    };
    ctx.onClose(J.on('workflows', id => { if (!id || id === sel || !sel) render(); }));
    WF.refresh().then(render); render();
  }
};
})();
