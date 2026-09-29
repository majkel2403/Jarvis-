'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const eq = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const { load } = require('../harness.js');
const J = load({ state: { settings: { hermesOn: false } } });

test('parseCalls: <tool_call> w tekście, arguments jako obiekt i jako string, błędny JSON', () => {
  const raw = 'Robię to.\n<tool_call>\n{"name":"open_app","arguments":{"app":"notes"}}\n</tool_call>\n<tool_call>{"name":"add_task","arguments":"{\\"text\\":\\"x\\"}"}</tool_call>\n<tool_call>{oops</tool_call>';
  const c = J.brain.parseCalls(raw);
  assert.equal(c.length, 3);
  eq(c[0], { name: 'open_app', args: { app: 'notes' }, ok: true, idx: c[0].idx });
  eq(c[1].args, { text: 'x' });
  assert.equal(c[2].ok, false);
});
test('parsePlan: JSON i lista tekstowa', () => {
  eq(J.brain.parsePlan('<plan>["a","b"]</plan> tekst'), ['a', 'b']);
  eq(J.brain.parsePlan('<plan>\n1. sprawdź pogodę\n2. zapisz notatkę\n</plan>'), ['sprawdź pogodę', 'zapisz notatkę']);
  assert.equal(J.brain.parsePlan('bez planu'), null);
});
test('visible: ukrywa think/plan/tool_call/environment', () => {
  const v = J.brain.visible('<think>hm</think><plan>["x"]</plan>Cześć.<tool_call>{}</tool_call>\n\n\n<environment>{}</environment>');
  assert.equal(v, 'Cześć.');
});
test('local: small talk i polecenia z rejestru', async () => {
  assert.match(await J.brain.local('cześć'), /W czym mogę pomóc/);
  assert.match(await J.brain.local('kim jesteś'), /Jarvis/);
  assert.match(await J.brain.local('ile to 15% z 2400'), /360/);
  assert.match(await J.brain.local('która godzina'), /Jest \d{2}:\d{2}/);
  assert.equal(await J.brain.local('opowiedz mi o teorii względności'), null);
});
test('local: łańcuch poleceń wykonuje oba kroki', async () => {
  const r = await J.brain.local('otwórz notatnik i minutnik 2 minuty');
  assert.match(r, /Notatnik/); assert.match(r, /Minutnik ustawiony/);
  // „i” wewnątrz treści notatki nie rozbija polecenia
  assert.match(await J.brain.local('zanotuj: mleko i chleb'), /notatkę „mleko i chleb”/);
  J.timer.stop();
});
test('events: reduktor, plan, hold, log', () => {
  const eg = J.engine;
  J.ev.emit('task.created', { title: 't', task_id: 'x1' });
  assert.equal(eg.mode, 'THINKING'); assert.equal(eg.taskId, 'x1');
  J.ev.emit('plan.created', { steps: ['a', 'b'], task_id: 'x1' });
  assert.equal(eg.plan.steps.length, 2);
  J.ev.emit('tool.started', { tool: 'get_weather', task_id: 'x1' });
  assert.equal(eg.mode, 'EXECUTING');
  J.ev.emit('approval.requested', { task_id: 'x1' });
  assert.equal(eg.mode, 'APPROVAL_REQUIRED'); assert.equal(eg.hold, 'APPROVAL_REQUIRED');
  J.ev.emit('tool.completed', { tool: 'get_weather', task_id: 'x1' });
  assert.equal(eg.mode, 'APPROVAL_REQUIRED', 'hold blokuje recompute');
  assert.equal(eg.plan.done, 1);
  J.ev.emit('approval.resolved', { task_id: 'x1' });
  assert.notEqual(eg.hold, 'APPROVAL_REQUIRED');
  J.ev.emit('task.paused', { task_id: 'x1' }); assert.equal(eg.mode, 'PAUSED');
  J.ev.emit('task.resumed', { task_id: 'x1' });
  J.ev.emit('task.completed', { title: 't', task_id: 'x1' });
  assert.equal(eg.mode, 'COMPLETED'); assert.equal(eg.taskId, null);
  assert.ok(eg.recent(3).length === 3);
  assert.match(eg.rgb() || '', /57,229,154/);
});
test('context.packet: pełny i diff', () => {
  J.context.reset();
  const full = J.context.packet({ full: true });
  assert.equal(full._full, true); assert.ok(full.desktop && full.tasks && full.notes && full.conn);
  assert.equal(full.conn.hermes, 'off');
  const diff = J.context.packet();
  assert.equal(diff._full, false); assert.ok(diff.time); assert.equal(diff.notes, undefined, 'niezmienione sekcje są pomijane');
  J.notes.add('Nowa', 'x');
  const diff2 = J.context.packet();
  assert.ok(diff2.notes, 'zmiana notatek trafia do diffu');
  const txt = J.context.text(); assert.match(txt, /^<environment>/);
});
test('signals: kolejka i drenaż do pakietu', () => {
  J.signals.push('timer.ended', { label: 'Pomodoro' }, { notice: false });
  assert.equal(J.signals.pending().length, 1);
  const p = J.context.packet({ full: true });
  assert.equal(p.signals.length, 1); assert.match(p.signals[0].text, /Pomodoro/);
  assert.equal(J.signals.pending().length, 0, 'po wysłaniu sygnał jest dostarczony');
});
test('ics: import wydarzeń', () => {
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20261001T090000\r\nSUMMARY:Dentysta\\, kontrola\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261002\r\nSUMMARY:Urlop\r\nEND:VEVENT\r\nEND:VCALENDAR';
  const ev = J.ics.parse(ics);
  assert.equal(ev.length, 2); assert.equal(ev[0].start.time, '09:00'); assert.equal(ev[0].summary, 'Dentysta, kontrola'); assert.equal(ev[1].start.time, '');
  assert.equal(J.ics.import(ics), 2); assert.equal(J.ics.import(ics), 0, 'duplikaty pomijane');
});
test('bootstrapConfig: config.local.js i parametry adresu, tylko dozwolone pola', () => {
  const { load: L } = require('../harness.js');
  const K = L({ files: ['core.js'], config: { jevKey: 'sk-or-file', jevOn: 'true', hackerField: 'no', city: 'Gdańsk' } });
  assert.equal(K.state.settings.jevKey, 'sk-or-file'); assert.equal(K.state.settings.jevOn, true); assert.equal(K.state.settings.city, 'Gdańsk'); assert.equal(K.state.settings.hackerField, undefined);
  const U = L({ files: ['core.js'], location: { href: 'http://localhost/index.html?jevKey=sk-or-url&hermesOn=0&foo=1#x', search: '?jevKey=sk-or-url&hermesOn=0&foo=1' } });
  assert.equal(U.state.settings.jevKey, 'sk-or-url'); assert.equal(U.state.settings.jevOn, true, 'sam klucz włącza Jeva'); assert.equal(U.state.settings.hermesOn, false);
  assert.equal(U.configuredFrom, 'url');
  assert.ok(!/jevKey/.test(U.__ctx.location.href), 'klucz usunięty z adresu'); assert.ok(/foo=1/.test(U.__ctx.location.href), 'obce parametry zostają');
});

/* ===================== testy napraw po audycie ===================== */
test('settings_get: żaden klucz API nie trafia do modelu', async () => {
  const K = load({ state: { settings: { hermesOn: false, openrouterKey: 'sk-or-SEKRET1', jevKey: 'sk-or-SEKRET2', hermesKey: 'SEKRET3' } } });
  const r = await K.registry.run('settings_get', {}, { source: 'hermes' });
  assert.equal(r.ok, true);
  const txt = JSON.stringify(r);
  for (const s of ['SEKRET1', 'SEKRET2', 'SEKRET3']) assert.ok(!txt.includes(s), 'wyciek: ' + s);
  assert.equal(Object.keys(r.data).filter(k => /key$/i.test(k)).length, 0);
  assert.equal(r.data.city, 'Wrocław', 'zwykłe ustawienia nadal są zwracane');
});
test('głos: ryzykowne polecenia pytają o zgodę, wpisane ręcznie — nie', async () => {
  const K = load({ state: { settings: { hermesOn: false } } });
  let asked = 0, answer = 'no'; K.confirm = async () => { asked++; return answer; };
  K.notes.add('Testowa', 'x');
  K.brain.lastSource = 'voice';
  const denied = await K.brain.local('usuń notatkę Testowa');
  assert.equal(asked, 1, 'głos → pytanie'); assert.match(denied, /odmówił/); assert.equal(K.state.notes.some(n => n.title === 'Testowa'), true, 'notatka została');
  answer = 'yes';
  const done = await K.brain.local('usuń notatkę Testowa');
  assert.equal(asked, 2); assert.match(done, /Usunąłem/); assert.equal(K.state.notes.some(n => n.title === 'Testowa'), false);
  K.notes.add('Druga', 'x'); K.brain.lastSource = 'user';
  const typed = await K.brain.local('usuń notatkę Druga');
  assert.equal(asked, 2, 'tekst wpisany ręcznie nie pyta'); assert.match(typed, /Usunąłem/);
});
test('trimHistory: przycięcie zawsze zaczyna się od prawdziwej wypowiedzi użytkownika', () => {
  const h = []; for (let i = 0; i < 25; i++) { h.push({ role: 'user', content: 'u' + i }, { role: 'assistant', content: '', tool_calls: [{ id: 'c' + i }] }, { role: 'tool', tool_call_id: 'c' + i, content: '{}' }, { role: 'assistant', content: 'ok' }); }
  for (const max of [3, 7, 8, 10, 39, 40, 41]) { const t = J.brain.trimHistory(h, max); assert.equal(t[0].role, 'user', 'max=' + max); assert.ok(t.length >= Math.min(max, h.length)); assert.equal(t[t.length - 1], h[h.length - 1]); }
  // format tekstowy: wynik narzędzia to wiadomość „user” z <tool_response> — też nie może być początkiem
  const g = [{ role: 'user', content: 'pytanie' }, { role: 'assistant', content: '<tool_call>{}</tool_call>' }, { role: 'user', content: '<tool_response>{}</tool_response>' }, { role: 'assistant', content: 'gotowe' }];
  assert.equal(J.brain.trimHistory(g, 2)[0].content, 'pytanie');
  // bieżące pytanie (keep) nigdy nie znika, nawet gdy wymiana jest dłuższa niż limit
  const longRun = [{ role: 'user', content: 'stare' }, { role: 'assistant', content: 'x' }, { role: 'user', content: 'BIEŻĄCE' }]; for (let i = 0; i < 30; i++) longRun.push({ role: 'assistant', content: 'a' + i }, { role: 'user', content: '<tool_response>r</tool_response>' });
  const keep = longRun[2]; assert.ok(J.brain.trimHistory(longRun, 10, keep).includes(keep));
  assert.equal(J.brain.trimHistory([], 5).length, 0);
});
test('prompt systemowy jest stały: godzina i streszczenie nie zmieniają go między turami', () => {
  const K = load({ state: { settings: { hermesOn: false } } });
  K.hhmm = () => '10:00'; const a = K.brain.systemPrompt('hermes'); K.hhmm = () => '10:01'; const b = K.brain.systemPrompt('hermes');
  assert.equal(a, b); assert.ok(!/godzina \d/.test(a)); assert.match(a, /<environment>/); assert.match(a, /<summary>/);
});
test('zapis stanu: przepełnienie nie jest ciche — najpierw odzysk miejsca, potem ostrzeżenie (raz)', () => {
  const K = load({ files: ['core.js'] }); const ls = K.__ctx.localStorage, orig = ls.setItem.bind(ls);
  let toasts = 0; K.toast = () => { toasts++; };
  for (let i = 0; i < 100; i++) K.state.notifs.push({ id: 'n' + i, title: 'x'.repeat(200) });
  ls.setItem = (k, v) => { if (v.length > 8000) throw new Error('QuotaExceededError'); orig(k, v); };
  assert.equal(K.saveNow(), true, 'po przycięciu powiadomień zapis się udaje'); assert.equal(toasts, 0); assert.ok(K.state.notifs.length <= 20);
  ls.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(K.saveNow(), false); assert.equal(toasts, 1, 'użytkownik dostaje ostrzeżenie');
  assert.equal(K.saveNow(), false); assert.equal(toasts, 1, 'ostrzeżenie tylko raz');
  ls.setItem = orig; assert.equal(K.saveNow(), true); assert.equal(K.saveFailed, false, 'po powrocie miejsca flaga się czyści');
});
test('zapis stanu: historia Process Log nie jest w głównym kluczu po migracji', () => {
  const K = load({ files: ['core.js'] }); K.state.history = [{ id: 'h1', title: 'zadanie', ts: 1, steps: [] }];
  K.saveNow(); assert.equal(JSON.parse(K.__ctx.localStorage.getItem('jarvis-os:v2')).history.length, 1, 'przed migracją historia jest zachowana');
  K.historyMigrated = true; K.saveNow(); assert.equal(JSON.parse(K.__ctx.localStorage.getItem('jarvis-os:v2')).history.length, 0, 'po migracji zapis jest lekki');
  assert.equal(K.state.history.length, 1, 'w pamięci historia zostaje');
});
test('konfiguracja przez fragment #: działa, czyści adres, nie ostrzega o serwerze', () => {
  const H = load({ files: ['core.js'], location: { href: 'http://localhost/index.html#jevKey=sk-or-hash&city=Sopot&inne=1', search: '', hash: '#jevKey=sk-or-hash&city=Sopot&inne=1' } });
  assert.equal(H.state.settings.jevKey, 'sk-or-hash'); assert.equal(H.state.settings.city, 'Sopot'); assert.equal(H.state.settings.jevOn, true);
  assert.equal(H.configViaQuery, undefined);
  const href = H.__ctx.location.href; assert.ok(!/jevKey|Sopot/.test(href), 'sekrety zniknęły z adresu: ' + href); assert.ok(/inne=1/.test(href), 'obce parametry zostają');
  const Q = load({ files: ['core.js'], location: { href: 'http://localhost/?jevKey=sk-or-q', search: '?jevKey=sk-or-q' } });
  assert.equal(Q.state.settings.jevKey, 'sk-or-q'); assert.equal(Q.configViaQuery, true, 'klucz w „?” daje ostrzeżenie');
});
