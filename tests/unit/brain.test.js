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
