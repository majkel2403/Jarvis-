/* =========================================================
   JARVIS OS — Sędzia: Jev (TypeSafe AI, „System One”) przez OpenRouter
   Jev nie generuje tekstu. Dostaje stan + typowane pytania i zwraca decyzje
   z rozkładem prawdopodobieństwa i skalibrowaną pewnością (0–1) w ~100–300 ms.
   Rola w Jarvisie: szybka intuicja obok Hermesa (rozumowanie) i rejestru (wykonanie):
     · intencja wypowiedzi (Choice nad poleceniami rejestru) → wykonaj / zapytaj / oddaj Hermesowi
     · rozstrzyganie dwuznaczności (która notatka / zadanie)
     · bramka ryzyka (Noul: działanie nieodwracalne?)
     · weryfikacja odpowiedzi Hermesa względem wyników narzędzi (Noul)
     · pilność sygnału w trybie aktywnym (Score)
   Endpoint: POST https://openrouter.ai/api/v1/systemone  { model, questions:{id:{type,instructions,criteria}}, state }
   Odpowiedź:  { model, answers:{id:{type, choice|score|noul, probabilities, confidence}}, usage:{input_tokens, output_tokens, cost} }
   Bez klucza lub przy błędzie wszystko degraduje się do rejestru i Hermesa.
   ========================================================= */
'use strict';
(() => {
const S = () => J.state.settings;
const ENDPOINT = 'https://openrouter.ai/api/v1/systemone';
const MODELS = ['typesafe/jev-1.13', '~typesafe/jev-latest'];
const TH = () => ({ execute: +S().jevExecute || .85, ask: +S().jevAsk || .5, destructive: +S().jevDestructive || .8, interrupt: +S().jevInterrupt || .6, verify: +S().jevVerify || .4 });

const status = { state: 'unknown', latency: 0, calls: 0, cost: 0, lastError: '', last: null };
const enabled = () => !!(S().jevOn && S().jevKey);
const setState = st => { if (status.state !== st) { status.state = st; J.emit('judge'); } };

/* stan dla sędziego: zwięzły obraz środowiska (bez treści notatek, bez sygnałów drenowanych) */
const stateFor = (extra = {}) => {
  const p = J.context.packet({ full: true, quiet: true });
  const st = {
    time: p.time.local, weekday: p.time.weekday,
    focused_app: p.desktop.focused ? { app: p.desktop.focused.app, title: p.desktop.focused.title, state: p.desktop.focused.state } : null,
    open_windows: p.desktop.windows.map(w => w.app + (w.min ? ' (minimized)' : '')),
    widgets: p.desktop.widgets.map(w => w.title + ' [' + w.type + ']'),
    notes: p.notes.recent.map(n => n.title),
    tasks_today: p.tasks.today.map(t => (t.time || '--:--') + ' ' + t.text + (t.done ? ' ✓' : '')),
    timer: p.desktop.timer, focus_mode: p.desktop.focus_mode,
    recent_events: p.events, pending_signals: p.signals.map(s => s.text),
    user_profile: S().jevPrivate ? undefined : p.user.profile,
    ...extra
  };
  if (S().jevPrivate) { delete st.notes; delete st.widgets; }
  return st;
};

/* ---------- wywołanie ---------- */
const call = async (questions, state, opts = {}) => {
  const t0 = performance.now();
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), opts.timeout || 2500);
  let r;
  try {
    r = await fetch(S().jevUrl || ENDPOINT, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S().jevKey, 'HTTP-Referer': location.origin, 'X-Title': 'Jarvis OS' }, body: JSON.stringify({ model: S().jevModel || MODELS[0], questions, state }) });
  } catch (e) { clearTimeout(to); status.lastError = e.name === 'AbortError' ? 'timeout' : 'network'; setState('down'); throw Object.assign(new Error(e.name === 'AbortError' ? 'Jev: przekroczono czas (' + (opts.timeout || 2500) + ' ms)' : 'Jev: brak połączenia z OpenRouter (sieć lub CORS)'), { code: 'OFFLINE' }); }
  clearTimeout(to);
  if (!r.ok) { let msg = ''; try { const j = await r.json(); msg = j.error?.message || j.message || JSON.stringify(j); } catch (e) { } status.lastError = r.status + ' ' + msg; setState(r.status === 401 || r.status === 403 ? 'down' : 'down'); throw Object.assign(new Error('Jev: HTTP ' + r.status + (msg ? ' — ' + msg.slice(0, 160) : '')), { code: r.status === 401 || r.status === 403 ? 'DENIED' : 'INTERNAL' }); }
  const j = await r.json();
  status.latency = Math.round(performance.now() - t0); status.calls++; status.cost += +(j.usage?.cost || 0); status.last = j; status.lastError = '';
  J.state.stats.jevCalls = (J.state.stats.jevCalls || 0) + 1; J.state.stats.jevCost = +((J.state.stats.jevCost || 0) + (+(j.usage?.cost || 0))).toFixed(6); J.save();
  setState('up');
  return { answers: j.answers || {}, usage: j.usage || {}, model: j.model, ms: status.latency };
};
/* pomocnicze: pewność odpowiedzi (Noul jej nie ma — bierzemy odległość od 0.5) */
const conf = a => a == null ? 0 : a.type === 'noul' ? Math.abs((a.noul ?? .5) - .5) * 2 : (a.confidence ?? 0);

/* ---------- pytania ---------- */
const intentQuestion = () => {
  const criteria = {};
  J.registry.list(c => c.hermes !== false || c.id === 'help').forEach(c => { criteria[c.id] = c.description.replace(/\s+/g, ' ').slice(0, 140) + (c.examples[0] ? ' e.g. "' + c.examples[0].replace(/[{}[\]]/g, '') + '"' : ''); });
  criteria.conversation = 'The user is chatting, asking a general knowledge question, or making small talk that does not map to any command.';
  criteria.multi_step = 'The request needs several different commands or reasoning across steps (e.g. "plan my evening", "check the weather and note it").';
  criteria.unclear = 'The utterance is ambiguous, incomplete, or cannot be mapped confidently.';
  return { type: 'choice', instructions: 'The user speaks Polish to Jarvis, a desktop assistant. Which single command from the registry best matches the utterance in "utterance", given the desktop state? Pick "conversation" for chat, "multi_step" for compound requests, "unclear" when unsure.', criteria };
};
const Q = {
  destructive: { type: 'noul', instructions: 'Would carrying out the utterance delete, overwrite, close, or irreversibly change user data or windows, or open an untrusted website?', criteria: { true: 'The action removes or overwrites notes, tasks, widgets, files, layouts, closes windows, or opens an unknown URL.', false: 'The action is read-only, opens an app, creates something new, or changes a reversible setting.' } },
  clarify: { type: 'noul', instructions: 'Does the utterance reference an object (note, task, widget, window) that cannot be identified unambiguously from the state, so Jarvis should ask before acting?', criteria: { true: 'Several candidates match, or the referenced object does not exist in the state.', false: 'Exactly one target is clear, or the command needs no target.' } },
  current: { type: 'noul', instructions: 'Does the utterance refer to the currently focused window/app ("this", "here", "close it", "add here") rather than naming a target?', criteria: { true: 'It uses deixis like "to", "tu", "ten", "tego" pointing at the focused app.', false: 'It names the target explicitly or needs none.' } }
};

const judge = J.judge = {
  MODELS, status, enabled, thresholds: TH,
  /* fan-out dla wypowiedzi: intencja + ryzyko + dwuznaczność + deixis w jednym wywołaniu */
  async decide(text, opts = {}) {
    if (!enabled()) return null;
    const st = J.proc.active ? J.proc.step('judge', 'Jev: ocena wypowiedzi', [['Wypowiedź', text]], { running: true }) : null;
    J.ev.emit('judge.started', { text: text.slice(0, 80) });
    try {
      const { answers, usage, ms } = await call({ intent: intentQuestion(), destructive: Q.destructive, clarify: Q.clarify, current: Q.current }, stateFor({ utterance: text }), { timeout: opts.timeout || 2500 });
      const it = answers.intent || {};
      const probs = it.probabilities || {};
      const alts = Object.entries(probs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, p]) => ({ id, p: +p.toFixed(3) }));
      const v = { intent: { id: it.choice, confidence: +(it.confidence ?? 0).toFixed(3), alts }, destructive: +(answers.destructive?.noul ?? 0).toFixed(3), clarify: +(answers.clarify?.noul ?? 0).toFixed(3), current: +(answers.current?.noul ?? 0).toFixed(3), ms, cost: +(usage.cost || 0) };
      const th = TH();
      v.route = v.intent.id === 'conversation' || v.intent.id === 'multi_step' ? 'hermes' : v.intent.id === 'unclear' ? 'ask' : v.intent.confidence >= th.execute ? 'execute' : v.intent.confidence >= th.ask ? 'ask' : 'hermes';
      st?.done([['Decyzja', v]], v.intent.id + ' ' + Math.round(v.intent.confidence * 100) + '% → ' + v.route + ' · ' + ms + ' ms');
      J.engine.judge = { ...v, t: Date.now() }; J.ev.emit('judge.completed', { intent: v.intent.id, confidence: v.intent.confidence, route: v.route, ms });
      return v;
    } catch (e) { st?.fail(e.message); J.ev.emit('judge.failed', { error: e.message }); return null; }
  },
  /* dwuznaczność: który kandydat? candidates: [{id,label}] */
  async pick(question, candidates, text) {
    if (!enabled() || !candidates?.length) return null;
    const criteria = {}; candidates.forEach(c => { criteria[c.id] = c.label; }); criteria.none = 'None of the candidates is what the user means.';
    try {
      const { answers } = await call({ pick: { type: 'choice', instructions: question + ' The utterance is in "utterance".', criteria } }, stateFor({ utterance: text }), { timeout: 2000 });
      const a = answers.pick; if (!a || a.choice === 'none') return null;
      const r = { id: a.choice, confidence: +(a.confidence ?? 0).toFixed(3) };
      J.proc.active && J.proc.step('judge', 'Jev: rozstrzygnięcie dwuznaczności', [['Pytanie', question], ['Kandydaci', candidates], ['Wybór', r]], { preview: r.id + ' ' + Math.round(r.confidence * 100) + '%' });
      return r;
    } catch (e) { return null; }
  },
  /* weryfikacja: czy odpowiedź modelu jest zgodna z wynikami narzędzi? zwraca P(zgodna) albo null */
  async verify(reply, results) {
    if (!enabled() || !results?.length) return null;
    try {
      const { answers } = await call({ grounded: { type: 'noul', instructions: 'Is the assistant reply in "reply" consistent with the actual tool results in "tool_results" (no claimed action that failed or was not executed, no invented data)?', criteria: { true: 'Every claim in the reply is supported by tool results or the state.', false: 'The reply claims something that the tool results contradict or do not show.' } } }, stateFor({ reply: reply.slice(0, 1500), tool_results: results.slice(-12) }), { timeout: 2500 });
      const p = answers.grounded?.noul; if (p == null) return null;
      J.proc.active && J.proc.step('judge', 'Jev: weryfikacja odpowiedzi', [['P(zgodna z wynikami)', p]], { preview: Math.round(p * 100) + '%', status: p < TH().verify ? 'err' : 'ok' });
      return p;
    } catch (e) { return null; }
  },
  /* pilność sygnału (0–1) do decyzji o przerwaniu użytkownikowi */
  async urgency(sig) {
    if (!enabled()) return null;
    try {
      const { answers } = await call({ urgency: { type: 'score', instructions: 'How urgent is it to interrupt the user right now with the signal in "signal", given what they are doing?', criteria: ['Not worth interrupting; mention later.', 'Low: can wait for the next conversation.', 'Medium: worth a short notice.', 'High: interrupt now.'] } }, stateFor({ signal: sig.text, signal_type: sig.type }), { timeout: 2000 });
      const a = answers.urgency; if (!a) return null;
      return +(((a.score ?? 0) / 3)).toFixed(3);
    } catch (e) { return null; }
  },
  /* test połączenia z Ustawień: prawdziwe wywołanie z polskim zdaniem */
  async test() {
    if (!S().jevKey) throw new Error('Podaj klucz OpenRouter.');
    const t0 = performance.now();
    const { answers, usage, model, ms } = await call({ intent: intentQuestion(), lang: { type: 'noul', instructions: 'Is the utterance in Polish?', criteria: { true: 'Polish', false: 'Another language' } } }, stateFor({ utterance: 'otwórz notatnik i ustaw minutnik na 5 minut' }), { timeout: 8000 });
    const it = answers.intent || {};
    return `${model || S().jevModel} odpowiada (${ms} ms): intencja „${it.choice}” ${Math.round((it.confidence || 0) * 100)}% · polski ${Math.round((answers.lang?.noul || 0) * 100)}% · koszt ${usage.cost != null ? '$' + (+usage.cost).toFixed(6) : usage.input_tokens + ' tok'}`;
  }
};
})();
