/* Sonda Jeva przez OpenRouter — sprawdza, czy klucz i model działają, i mierzy trafność intencji na polskich wypowiedziach.
   Uruchomienie:  OPENROUTER_API_KEY=sk-or-... node tests/jev-probe.js [liczba_wypowiedzi]
   Nie zapisuje klucza nigdzie. Koszt: ułamki centa (tokeny wyjściowe Jeva są darmowe). */
'use strict';
const KEY = process.env.OPENROUTER_API_KEY || process.env.JEV_KEY;
if (!KEY) { console.error('Brak klucza: ustaw OPENROUTER_API_KEY=sk-or-...'); process.exit(2); }
const MODEL = process.env.JEV_MODEL || 'typesafe/jev-1.13';
const URL = process.env.JEV_URL || 'https://openrouter.ai/api/v1/systemone';
const { load } = require('./harness.js');
const TABLE = require('./fixtures/utterances.js');
const J = load({ state: { settings: { hermesOn: false } } });

const criteria = {};
J.registry.list(c => c.hermes !== false || c.id === 'help').forEach(c => { criteria[c.id] = c.description.replace(/\s+/g, ' ').slice(0, 140) + (c.examples[0] ? ' e.g. "' + c.examples[0].replace(/[{}[\]]/g, '') + '"' : ''); });
criteria.conversation = 'The user is chatting, asking a general knowledge question, or making small talk that does not map to any command.';
criteria.multi_step = 'The request needs several different commands or reasoning across steps.';
criteria.unclear = 'The utterance is ambiguous, incomplete, or cannot be mapped confidently.';
const intent = { type: 'choice', instructions: 'The user speaks Polish to Jarvis, a desktop assistant. Which single command from the registry best matches the utterance in "utterance"? Pick "conversation" for chat, "multi_step" for compound requests, "unclear" when unsure.', criteria };
const state = { focused_app: { app: 'notes', title: 'Notatnik' }, open_windows: ['notes', 'schedule'], notes: ['Zakupy', 'Projekty Jarvis OS'], tasks_today: ['09:00 Spotkanie zespołu', '18:00 trening'], timer: null };

const ask = async (utterance, questions = { intent }) => {
  const t0 = Date.now();
  const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY, 'HTTP-Referer': 'https://github.com/majkel2403/Jarvis-', 'X-Title': 'Jarvis OS probe' }, body: JSON.stringify({ model: MODEL, questions, state: { ...state, utterance } }) });
  const txt = await r.text(); let j; try { j = JSON.parse(txt); } catch (e) { j = { raw: txt }; }
  return { ok: r.ok, status: r.status, ms: Date.now() - t0, body: j };
};

(async () => {
  console.log('Model:', MODEL, '· endpoint:', URL);
  const first = await ask('otwórz notatnik i ustaw minutnik na 5 minut', { intent, lang: { type: 'noul', instructions: 'Is the utterance in Polish?', criteria: { true: 'Polish', false: 'Other' } }, destructive: { type: 'noul', instructions: 'Would carrying out the utterance delete or irreversibly change user data?', criteria: { true: 'Deletes/overwrites/closes.', false: 'Read-only, opens, creates, reversible.' } } });
  if (!first.ok) { console.error('Jev NIE działa: HTTP', first.status, JSON.stringify(first.body).slice(0, 600)); process.exit(1); }
  console.log('Jev działa ·', first.ms, 'ms · model:', first.body.model, '· usage:', JSON.stringify(first.body.usage));
  console.log('Odpowiedzi:', JSON.stringify(first.body.answers, null, 1).slice(0, 900));
  const n = Math.min(+process.argv[2] || TABLE.length, TABLE.length);
  let hit = 0, sure = 0, sureHit = 0, cost = 0, msSum = 0; const miss = [];
  for (const [text, expected] of TABLE.slice(0, n)) {
    const r = await ask(text); if (!r.ok) { console.error('błąd', r.status, text); continue; }
    const a = r.body.answers?.intent || {}; msSum += r.ms; cost += +(r.body.usage?.cost || 0);
    const ok = a.choice === expected; if (ok) hit++;
    if ((a.confidence || 0) >= .85) { sure++; if (ok) sureHit++; }
    if (!ok) miss.push(`${text.padEnd(46)} → ${a.choice} ${Math.round((a.confidence || 0) * 100)}% (oczekiwano ${expected})`);
    process.stdout.write(ok ? '.' : 'x');
  }
  console.log(`\nTrafność intencji: ${hit}/${n} (${Math.round(hit / n * 100)}%) · przy pewności ≥ 0.85: ${sureHit}/${sure} · średnio ${Math.round(msSum / n)} ms · koszt $${cost.toFixed(5)}`);
  if (miss.length) console.log('Pomyłki:\n  ' + miss.join('\n  '));
  console.log(sureHit === sure ? 'Próg 0.85 jest bezpieczny do wykonania bez pytania.' : 'UWAGA: przy pewności ≥ 0.85 zdarzają się pomyłki — podnieś próg jevExecute w Ustawieniach.');
})().catch(e => { console.error('Błąd sondy:', e.message); process.exit(1); });
