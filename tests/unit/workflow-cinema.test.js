/* Tryb kinowy workflow (js/workflow-cinema.js): czysta logika filmu — długość scen, zdarzenia odtworzone ze stanu przebiegu,
   napisy końcowe i lektor — oraz polecenie „tryb kinowy”. Obraz i dźwięk sprawdza e2e (tests/e2e/smoke.js) i zrzuty na żywo. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('../harness.js');

const J = load({ dom: true, state: { settings: { sound: false, speech: false } } });
const T = J.workflows.cinema._t;
const arr = x => JSON.parse(JSON.stringify(x));   // tablice z innego kontekstu vm

const STEPS = [
  { id: 'brief', title: 'Brief projektu', kind: 'hermes', state: 'done', attempts: 2, ms: 41000, score: 0.9, errors: ['brak sekcji „ryzyka”'], artifact: { kind: 'fields', fields: { nazwa: 'Habit Tracker', cel: 'nawyki' } } },
  { id: 'architektura', title: 'Architektura', kind: 'hermes', state: 'done', attempts: 1, ms: 52000, artifact: { kind: 'doc', headings: ['Komponenty', 'Dane'], chars: 4200 } },
  { id: 'zapis', title: 'Zapis plików', kind: 'write_files', state: 'done', attempts: 1, ms: 900, artifact: { kind: 'files_written', count: 3, root: 'projects/habit-tracker', commit: 'abc1234', files: ['README.md', 'docs/ARCHITEKTURA.md', 'src/app.js'] } },
  { id: 'pokaz', title: 'Notatka na pulpicie', kind: 'tool', state: 'skipped', attempts: 1, ms: 5 }
];
const RUN = { id: 'r1', workflow: 'od-pomyslu-do-projektu', name: 'Od pomysłu do projektu', state: 'done', started: 1759600000, ended: 1759600100, report: 'Projekt gotowy. Trzy pliki.', inputs: { pomysl: 'aplikacja do nawyków' }, budget_used: { tokens: 120000 }, steps: STEPS };

test('kod czasowy, numeracja aktów, konstelacja kroków', () => {
  assert.equal(T.timecode(0), '00:00:00:00');
  assert.equal(T.timecode(3725.5), '01:02:05:12', '24 klatki na sekundę');
  assert.equal(T.roman(4), 'IV'); assert.equal(T.roman(25), '25');
  const L = arr(T.layout(6));
  assert.equal(L.length, 6);
  assert.ok(L[0].x < L[5].x, 'kroki od lewej do prawej');
  assert.ok(L.every(p => p.z > 900 && p.z < 1900), 'wszystkie w głębi przed kamerą');
});

test('zdarzenia odtworzone ze stanu: start, próby z poprawką, wyniki, pominięcie, finał', () => {
  const ev = arr(T.synth(RUN)), types = ev.map(e => e.type);
  assert.deepEqual(types, ['run.started', 'step.started', 'step.retry', 'step.started', 'step.completed', 'step.started', 'step.completed', 'step.started', 'step.completed', 'step.started', 'step.skipped', 'run.completed']);
  assert.equal(ev[2].reason, 'brak sekcji „ryzyka”', 'powód poprawki z błędów kroku');
  assert.equal(ev[3].attempt, 2);
  assert.equal(ev[4].artifact.fields.nazwa, 'Habit Tracker', 'wynik kroku do hologramu');
  assert.ok(ev.every((e, i) => !i || e.ts >= ev[i - 1].ts), 'czas rośnie');
  const running = arr(T.synth({ ...RUN, state: 'running', steps: [STEPS[0], { ...STEPS[1], state: 'running', artifact: null }, { ...STEPS[2], state: 'pending' }] })).map(e => e.type);
  assert.deepEqual(running.slice(-2), ['step.completed', 'step.started'], 'trwający krok bez końca, brak finału');
});

test('film z zapisu trwa ~1–2 min: minuta pracy Hermesa to kilka sekund ekranu', () => {
  assert.equal(T.holdMs(0), 1300); assert.equal(T.holdMs(60), 2700); assert.equal(T.holdMs(600), 3400);
  const six = { ...RUN, steps: [0, 1, 2, 3, 4, 5].map(i => ({ id: 's' + i, title: 'Krok ' + i, kind: i === 5 ? 'tool' : 'hermes', state: 'done', attempts: 1, ms: 45000, artifact: i === 5 ? null : { kind: 'doc', headings: ['A'] } })) };
  const len = T.filmLength(arr(T.synth(six)));
  assert.ok(len > 50 && len < 110, 'długość filmu bez napisów: ' + len + ' s');
  assert.ok(T.pace({ type: 'step.completed', kind: 'hermes', artifact: { kind: 'doc' } }) > T.pace({ type: 'step.completed', kind: 'tool', artifact: { kind: 'fields' } }), 'hologram tylko dla wyników treści');
});

test('napisy końcowe: tytuł projektu, pomysł, obsada, sceny z czasami, pliki, statystyki', () => {
  const c = arr(T.credits(RUN, { live: true })), txt = JSON.stringify(c);
  assert.equal(c[0].big, 'Habit Tracker', 'nazwa projektu z briefu');
  assert.match(txt, /„aplikacja do nawyków”/);
  assert.match(txt, /01 · Brief projektu — 41 s · ocena 0.9 · 2 próby/);
  assert.match(txt, /04 · Notatka na pulpicie — pominięta/);
  assert.match(txt, /src\/app\.js/); assert.match(txt, /projects\/habit-tracker · git abc1234/);
  assert.match(txt, /Ponowienia: 1/); assert.match(txt, /Tokeny: 120 tys\./); assert.match(txt, /Nakręcono na żywo/);
  assert.ok(!/Jev/.test(txt), 'bez kroków sprawdzenia — bez Jeva w obsadzie');
});

test('lektor: zdanie o wyniku kroku i stan węzła', () => {
  assert.match(T.doneLine(STEPS[0]), /^Brief projektu — gotowe \(41 s, ocena 0.9\)\. Powstał brief: „Habit Tracker”\.$/);
  assert.match(T.doneLine(STEPS[1]), /2 sekcje, 4200 znaków/);
  assert.match(T.doneLine(STEPS[2]), /3 pliki zapisane na dysku/);
  assert.equal(T.stateLine({ state: 'running', kind: 'hermes', attempts: 2 }), 'Hermes myśli · próba 2…');
  assert.equal(T.firstSentence('Projekt gotowy w folderze X. Reszta raportu.'), 'Projekt gotowy w folderze X.');
  assert.equal(T.ideaOf(RUN), 'aplikacja do nawyków'); assert.equal(T.projectName(RUN), 'Habit Tracker');
});

test('polecenie filmu: zdania (bez zabierania „tryb kinowy” poziomowi efektów), zgoda, brak przebiegów', async () => {
  const R = J.registry, m = t => R.match(t)[0];
  for (const t of ['pokaż film', 'pokaż film z workflow', 'odtwórz film z pracy', 'workflow jak film', 'tryb kinowy workflow', 'kino z mapy pracy']) assert.equal(m(t)?.id, 'workflow_film', t);
  assert.equal(m('tryb kinowy')?.id, 'fx_level', '„tryb kinowy” dalej ustawia poziom efektów');
  assert.equal(J.policy.level('workflow_film'), 'A3', 'sam pokaz — bez pytania');
  const r = await R.run('workflow_film', {});
  assert.equal(r.ok, false); assert.equal(r.code, 'NOT_FOUND', 'nic nie działało — nie ma czego pokazać');
});
