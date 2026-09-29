'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const eq = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const { load } = require('../harness.js');
const J = load({ state: { settings: { hermesOn: false } } });
const R = J.registry;

/* tabela: wypowiedź → oczekiwane polecenie (+ fragmenty argumentów) */
const TABLE = [
  ['otwórz notatnik', 'open_app', { app: 'notatnik' }],
  ['uruchom monitor rynku', 'open_app'],
  ['zamknij to', 'close_app', { app: 'current' }],
  ['zamknij wszystkie okna', 'close_app', { app: 'all' }],
  ['pokaż pulpit', 'wm_minimize', { app: 'all' }],
  ['okno na prawo', 'wm_arrange', { mode: 'right' }],
  ['ułóż okna', 'wm_arrange', { mode: 'tile' }],
  ['układ praca', 'wm_arrange', { mode: 'layout', layout: 'praca' }],
  ['zapisz układ jako biuro', 'layout_save', { name: 'biuro' }],
  ['zanotuj: kupić mleko', 'create_note', { content: 'kupić mleko' }],
  ['nowa notatka lista zakupów', 'create_note'],
  ['dopisz do notatki zakupy: chleb i masło', 'notes_append', { note: 'zakupy', text: 'chleb i masło' }],
  ['przeczytaj notatkę zakupy', 'notes_read', { note: 'zakupy' }],
  ['szukaj w notatkach mleko', 'notes_search', { query: 'mleko' }],
  ['usuń notatkę zakupy', 'notes_delete', { note: 'zakupy' }],
  ['jakie mam notatki', 'notes_list'],
  ['przypomnij mi o 18:00 trening', 'add_task', { text: 'trening', time: '18:00' }],
  ['przypomnij mi jutro o 9 o dentyście', 'add_task', { time: '09:00' }],
  ['przypomnij mi za 20 minut zadzwonić do mamy', 'add_task', { text: 'zadzwonić do mamy' }],
  ['dodaj zadanie w piątek prezentacja', 'add_task', { text: 'prezentacja' }],
  ['jakie mam zadania', 'tasks_list'],
  ['co mam jutro', 'tasks_list', { range: 'tomorrow' }],
  ['odhacz trening', 'tasks_complete', { task: 'trening' }],
  ['przesuń trening na 19:30', 'tasks_update', { task: 'trening', time: '19:30' }],
  ['odłóż trening o 15 minut', 'tasks_update', { snooze_minutes: 15 }],
  ['przełóż trening na jutro', 'tasks_update', { task: 'trening' }],
  ['usuń zadanie trening', 'tasks_remove', { task: 'trening' }],
  ['minutnik 5 minut', 'start_timer', { seconds: 300 }],
  ['ustaw minutnik na 25 min', 'start_timer', { seconds: 1500 }],
  ['pomodoro', 'start_timer', { seconds: 1500 }],
  ['zatrzymaj minutnik', 'timer_control', { action: 'stop' }],
  ['ile zostało czasu', 'timer_control', { action: 'status' }],
  ['przedłuż minutnik o 2 minuty', 'timer_control', { action: 'extend', seconds: 120 }],
  ['która godzina', 'get_datetime'],
  ['jaki dziś dzień', 'get_datetime'],
  ['stwórz listę zakupy: mleko, chleb', 'create_widget', { type: 'list', title: 'zakupy' }],
  ['dodaj widget notatka pomysły', 'create_widget', { type: 'note' }],
  ['usuń widget zakupy', 'widgets_remove', { widget: 'zakupy' }],
  ['dodaj skrót GitHub github.com', 'add_shortcut', { url: 'github.com' }],
  ['motyw fiolet', 'set_theme', { color: 'fiolet' }],
  ['zmień kolor na zielony', 'set_theme', { color: 'zielony' }],
  ['tapeta aurora', 'set_wallpaper', { wallpaper: 'aurora' }],
  ['tryb skupienia', 'focus_mode', { on: true }],
  ['wyłącz tryb skupienia', 'focus_mode', { on: false }],
  ['jaka jest pogoda', 'get_weather'],
  ['pogoda w Krakowie', 'get_weather', { city: 'Krakowie' }],
  ['czy będzie padać', 'get_weather'],
  ['kurs bitcoina', 'get_crypto_prices', { symbol: 'BTC' }],
  ['kursy krypto', 'get_crypto_prices'],
  ['powiadom gdy bitcoin przekroczy 70k', 'market_watch', { symbol: 'BTC', direction: 'above', price: 70000 }],
  ['alert gdy eth spadnie poniżej 3000', 'market_watch', { symbol: 'ETH', direction: 'below' }],
  ['ile to 15% z 2400', 'calculate', { expression: '15/100*2400' }],
  ['oblicz 12*12', 'calculate'],
  ['2+2*2', 'calculate'],
  ['otwórz youtube', 'open_url', { url: 'https://youtube.com' }],
  ['otwórz stronę onet.pl', 'open_url'],
  ['wyszukaj przepis na pierogi', 'web_search', { query: 'przepis na pierogi' }],
  ['skopiuj hasło123', 'clipboard_write', { text: 'hasło123' }],
  ['status', 'get_status'],
  ['co potrafisz', 'help'],
  ['pomoc', 'help'],
  ['powiedz dzień dobry', 'speak', { text: 'dzień dobry' }],
  ['wycisz dźwięki', 'sound_toggle', { sound: false }],
  ['nie mów', 'sound_toggle', { speech: false }],
  ['zapamiętaj, że pracuję zdalnie', 'memory_remember', { fact: 'pracuję zdalnie' }],
  ['co o mnie wiesz', 'memory_recall'],
  ['zapomnij o pracy zdalnej', 'memory_forget'],
  ['ustaw miasto na Gdańsk', 'settings_set', { key: 'city', value: 'Gdańsk' }],
  ['włącz słowo wybudzające', 'settings_set', { key: 'wakeWord', value: 'true' }],
  ['briefing o 8:00', 'settings_set', { key: 'briefingTime' }],
  ['pokaż powiadomienia', 'notifications_open'],
  ['jakie okna są otwarte', 'wm_list'],
  ['następne okno', 'wm_focus', { app: 'next' }],
  ['przełącz na notatnik', 'wm_focus', { app: 'notatnik' }],
  ['pokaż moje pliki', 'files_list'],
  ['przeczytaj plik notatki.md', 'files_read', { name: 'notatki.md' }],
  ['eksportuj notatkę zakupy do pliku', 'files_export_note', { note: 'zakupy' }],
  ['wykonaj w terminalu neofetch', 'terminal_run', { command: 'neofetch' }]
];
for (const [text, id, args] of TABLE) {
  test('match: ' + text, () => {
    const m = R.match(text)[0];
    assert.ok(m, 'brak dopasowania dla „' + text + '”');
    assert.equal(m.id, id, 'oczekiwano ' + id + ', jest ' + m.id + ' ' + JSON.stringify(m.args));
    for (const [k, v] of Object.entries(args || {})) eq(m.args[k], v, 'arg ' + k + ' w ' + JSON.stringify(m.args));
  });
}
test('match: brak dopasowania dla swobodnego tekstu', () => {
  assert.equal(R.match('opowiedz mi o teorii względności')[0], undefined);
  assert.equal(R.match('hej')[0], undefined);
});
test('chain: dwa polecenia w jednym zdaniu', () => {
  const c = R.chain('otwórz harmonogram i ułóż okna');
  eq(c.map(m => m.id), ['open_app', 'wm_arrange']);
  assert.equal(R.match('otwórz harmonogram i ułóż okna')[0], undefined);   // całość nie udaje jednego polecenia
  assert.equal(R.chain('zanotuj: mleko i chleb'), null);   // „i” w treści notatki to nie łańcuch — całość pasuje do create_note
  assert.equal(R.match('zanotuj: mleko i chleb')[0].id, 'create_note');
});
test('coerce: typy, enum przez aliasy, format czasu i daty', () => {
  eq(R.coerce('open_app', { app: 'notatnik' }).args, { app: 'notes' });
  assert.equal(R.coerce('open_app', { app: 'lodówka' }).code, 'INVALID_ARGS');
  assert.equal(R.coerce('open_app', {}).code, 'INVALID_ARGS');
  eq(R.coerce('start_timer', { seconds: '300', show: 'nie' }).args, { seconds: 300, show: false });
  assert.equal(R.coerce('start_timer', { seconds: 'dużo' }).code, 'INVALID_ARGS');
  const t = R.coerce('add_task', { text: 'x', time: '18', date: 'jutro' }).args;
  assert.equal(t.time, '18:00'); assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/);
  eq(R.coerce('create_widget', { type: 'list', title: 't', items: 'a, b\nc' }).args.items, ['a', 'b', 'c']);
  eq(R.coerce('set_theme', { color: 'purpurowy' }).args, { color: 'fiolet' });
});
test('tools: definicje dla modelu mają schemat i opis', () => {
  const tools = R.tools();
  assert.ok(tools.length >= 50);
  for (const t of tools) { assert.equal(t.type, 'function'); assert.ok(t.function.name && t.function.description); assert.equal(t.function.parameters.type, 'object'); assert.match(t.function.name, /^[a-z0-9_]+$/); }
  assert.ok(!tools.find(t => t.function.name === 'help'), 'help nie jest narzędziem modelu');
});
test('run: koperta wyniku, NOT_FOUND, AMBIGUOUS', async () => {
  const r = await R.run('nope', {}, { source: 'ui' }); assert.equal(r.ok, false); assert.equal(r.code, 'NOT_FOUND');
  const n1 = await R.run('create_note', { title: 'Zakupy', content: 'mleko', show: false }, { source: 'ui' });
  assert.equal(n1.ok, true); assert.equal(n1.code, 'OK'); assert.equal(n1.data.title, 'Zakupy');
  await R.run('create_note', { title: 'Zakupy weekend', content: 'x', show: false }, { source: 'ui' });
  const amb = await R.run('notes_read', { note: 'zakupy' }, { source: 'ui' });
  assert.equal(amb.ok, true, 'dokładny tytuł wygrywa');   // norm('Zakupy') === 'zakupy'
  const amb2 = await R.run('notes_append', { note: 'zaku', text: 'y' }, { source: 'ui' });
  assert.equal(amb2.code, 'AMBIGUOUS'); assert.equal(amb2.data.candidates.length, 2);
  const nf = await R.run('notes_read', { note: 'nie ma takiej' }, { source: 'ui' }); assert.equal(nf.code, 'NOT_FOUND');
});
test('run: potwierdzenia — źródło hermes pyta, ui nie; DENIED; zawsze zezwalaj', async () => {
  let asked = 0; J.confirm = async () => { asked++; return 'no'; };
  await R.run('create_note', { title: 'Do usunięcia', content: 'x', show: false }, { source: 'ui' });
  const d = await R.run('notes_delete', { note: 'Do usunięcia' }, { source: 'hermes' });
  assert.equal(d.code, 'DENIED'); assert.equal(asked, 1);
  const ok = await R.run('notes_delete', { note: 'Do usunięcia' }, { source: 'local' });
  assert.equal(ok.ok, true); assert.equal(asked, 1, 'polecenie użytkownika nie pyta');
  J.confirm = async () => 'always';
  await R.run('create_note', { title: 'Tmp', content: 'x', show: false }, { source: 'ui' });
  const a = await R.run('notes_delete', { note: 'Tmp' }, { source: 'hermes' }); assert.equal(a.ok, true); assert.equal(asked, 1);
  assert.ok(R.allowed('notes_delete'));
  await R.run('create_note', { title: 'Tmp2', content: 'x', show: false }, { source: 'ui' });
  J.confirm = async () => { throw new Error('nie powinno pytać'); };
  const b = await R.run('notes_delete', { note: 'Tmp2' }, { source: 'hermes' }); assert.equal(b.ok, true);
});
test('run: zaufane domeny open_url bez potwierdzenia', async () => {
  let asked = 0; J.confirm = async () => { asked++; return 'no'; };
  const r = await R.run('open_url', { url: 'youtube.com' }, { source: 'hermes' }); assert.equal(r.ok, true); assert.equal(asked, 0);
  const r2 = await R.run('open_url', { url: 'http://evil.example' }, { source: 'hermes' }); assert.equal(r2.code, 'DENIED'); assert.equal(asked, 1);
});
test('zadania: dodanie, odhaczenie, przełożenie, lista', async () => {
  const add = await R.run('add_task', { text: 'trening', time: '18:00' }, { source: 'ui' }); assert.equal(add.ok, true);
  const rel = await R.run('add_task', { text: 'telefon', in: '20 minut' }, { source: 'ui' }); assert.match(rel.data.time, /^\d{2}:\d{2}$/);
  const done = await R.run('tasks_complete', { task: 'trening' }, { source: 'ui' }); assert.equal(done.data.done, true);
  const upd = await R.run('tasks_update', { task: 'trening', time: '19:30' }, { source: 'ui' }); assert.equal(upd.data.time, '19:30'); assert.equal(upd.data.done, false);
  const l = await R.run('tasks_list', { range: 'today' }, { source: 'ui' }); assert.ok(l.data.tasks.some(t => t.text === 'trening'));
});
test('pamięć: remember/recall/forget', async () => {
  await R.run('memory_remember', { fact: 'lubię kawę o 9', scope: 'preference' }, { source: 'ui' });
  const r = await R.run('memory_recall', { query: 'kawę' }, { source: 'ui' }); assert.equal(r.data.facts.length, 1);
  const f = await R.run('memory_forget', { fact: 'kawę' }, { source: 'local' }); assert.equal(f.data.removed, 1);
});
test('describe i groups', () => { assert.match(R.describe(), /Notatki/); assert.ok(Object.keys(R.groups()).length >= 6); });
