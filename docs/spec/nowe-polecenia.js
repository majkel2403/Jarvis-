/* Planowane polecenia (jeszcze nie ma ich w rejestrze). Jedno źródło prawdy dla specyfikacji:
   z tego pliku `node tools/gen-spec.js` robi tabelę docs/spec/katalog-nowych-polecen.md, a test tests/unit/spec.test.js sprawdza spójność
   (brak kolizji z rejestrem, poprawne schematy, zasady poziomów, przykłady, pokrycie zbiorem zdań).

   Pola:
     id, group, label, description — jak w js/commands.js
     args      — JSON Schema argumentów (ten sam podzbiór co rejestr)
     level     — A3 odczyt/nawigacja po cichu · A2 odwracalny zapis z „Cofnij” · A1 pyta „Chodzi o…?” · A0 zawsze zgoda
     risk      — 'safe' | 'confirm'  (A0 ⇒ confirm)
     undo      — jak cofnąć (A2 musi mieć); null = nie dotyczy
     writes    — co zmienia (windows, ui, notes, tasks, widgets, settings, memory, files, layouts, shortcuts, alerts, chat, routines, timers)
     phase     — fala wdrożenia z docs/spec/17-wdrozenie.md (W1…W5)
     doc       — dokument, który opisuje szczegóły
     extends   — jeśli to rozszerzenie istniejącego polecenia (wtedy id istnieje w rejestrze i zmieniamy tylko argumenty)
     examples  — co najmniej 3 zdania po polsku
*/
'use strict';
const APPS = ['chat', 'notes', 'market', 'schedule', 'monitor', 'terminal', 'weather', 'calc', 'timer', 'settings', 'library', 'files'];
const S = (props, required = []) => ({ type: 'object', properties: props, required });
const str = (o = {}) => ({ type: 'string', ...o }), num = (o = {}) => ({ type: 'number', ...o }), bool = { type: 'boolean' };
const NOTE = str({ description: 'id albo fragment tytułu notatki; "current" = otwarta' });
const TASK = str({ description: 'id albo fragment treści zadania' });
const WIDGET = str({ description: 'id albo tytuł widgetu; "current" = aktywny' });
const WIN = str({ description: 'id aplikacji, "w:<id>" widgetu, "current" = aktywne okno' });

module.exports = [
  /* ================= NAWIGACJA (03-nawigacja.md) ================= */

  /* ================= OKNA (04-okna.md) ================= */

  /* ================= WIDGETY (05-widgety.md) ================= */
  { id: 'widget_build', group: 'Pulpit i widgety', label: 'Zbuduj widget z opisu', description: 'Tworzy widget z opisu (spec JSON wg docs/spec/widget.schema.json): bloki z dozwolonej listy, dane tylko z poleceń rejestru poziomu A3, przyciski wywołujące polecenia. Bez dowolnego HTML/JS.', args: S({ spec: { type: 'object' }, prompt: str({ maxLength: 300, description: 'oryginalne zdanie użytkownika (do edycji zdaniem)' }) }, ['spec']), level: 'A2', risk: 'safe', undo: 'usuń widget', writes: ['widgets'], phase: 'W4', doc: '05-widgety.md',
    examples: ['zrób widget z top 5 tokenów i zmianą 24h', 'zrób kartę z checklistą na dziś', 'mini wykres BTC na pulpicie', 'widget z pogodą i zadaniami na dziś'] },
  { id: 'widget_edit', group: 'Pulpit i widgety', label: 'Zmień widget zdaniem', description: 'Zmienia opis istniejącego widgetu (dodaj blok, zmień wykres, odświeżanie, tytuł). Łatka JSON Merge Patch albo instrukcja do Hermesa.', args: S({ widget: WIDGET, patch: { type: 'object' }, instruction: str({ maxLength: 300 }) }, ['widget']), level: 'A2', risk: 'safe', undo: 'poprzedni opis', writes: ['widgets'], phase: 'W4', doc: '05-widgety.md',
    examples: ['zmień ten widget na wykres', 'dodaj kolumnę 7 dni', 'odświeżaj co minutę', 'zmień tytuł widgetu na Krypto'] },
  { id: 'widget_refresh', group: 'Pulpit i widgety', label: 'Odśwież widget', description: 'Pobiera dane widgetu od nowa (wszystkich albo jednego).', args: S({ widget: WIDGET }), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W4', doc: '05-widgety.md',
    examples: ['odśwież widgety', 'odśwież widget krypto', 'zaktualizuj ten widget'] },

  /* ================= NOTATKI (06-notatki.md) ================= */

  /* ================= ZADANIA (07-zadania.md) ================= */

  /* ================= APLIKACJE (08-aplikacje.md) ================= */

  /* ================= WYGLĄD (09-wyglad-stany.md) ================= */
  { id: 'fx_level', group: 'Interfejs', label: 'Poziom efektów', description: 'Efekty: tool (oszczędnie), standard, cinema (pełne); off = bez animacji.', args: S({ level: str({ enum: ['off', 'tool', 'standard', 'cinema'] }) }, ['level']), level: 'A2', risk: 'safe', undo: 'poprzedni poziom', writes: ['settings'], phase: 'W5', doc: '09-wyglad-stany.md',
    examples: ['wyłącz animacje', 'tryb kinowy', 'mniej efektów'] },
  { id: 'chart_show', group: 'Interfejs', label: 'Pokaż wykres', description: 'Skrót do widget_build: wykres z danych polecenia A3 (kursy, zadania w tygodniu, aktywność, koszt, pewność Jeva).', args: S({ source: str({ enum: ['crypto', 'tasks_week', 'activity', 'cost', 'jev_confidence', 'weather_hours'] }), symbol: str(), range: str({ enum: ['1h', '24h', '7d', '30d'] }), kind: str({ enum: ['line', 'bar', 'area', 'spark'] }) }, ['source']), level: 'A2', risk: 'safe', undo: 'usuń widget', writes: ['widgets'], phase: 'W4', doc: '09-wyglad-stany.md',
    examples: ['pokaż wykres bitcoina z tygodnia', 'wykres zadań w tym tygodniu', 'pokaż na wykresie temperaturę na dziś'] },

  /* ================= USTAWIENIA (10-ustawienia.md) ================= */

  /* ================= AGENT (11-agent.md) ================= */
  { id: 'routine_create', group: 'Agent', label: 'Utwórz rutynę', description: 'Rutyna = nazwa + wyzwalacz (godzina, dni, zdarzenie, na żądanie) + kroki (polecenia rejestru albo zdanie do Hermesa). Kroki A0 zawsze pytają w chwili wykonania.', args: S({ name: str({ maxLength: 40 }), trigger: { type: 'object' }, steps: { type: 'array', maxItems: 12, items: { type: 'object' } } }, ['name', 'steps']), level: 'A1', risk: 'safe', undo: 'usuń rutynę', writes: ['routines'], phase: 'W4', doc: '11-agent.md',
    examples: ['zrób rutynę poranek: pogoda, zadania na dziś i układ praca', 'codziennie o 18 pokaż podsumowanie dnia', 'kiedy mówię start pracy, otwórz notatnik i włącz skupienie'] },
  { id: 'routine_run', group: 'Agent', label: 'Uruchom rutynę', description: 'Uruchamia rutynę teraz (kroki z paskiem postępu; pauza/pominięcie/stop).', args: S({ name: str() }, ['name']), level: 'A1', risk: 'safe', undo: 'cofnij kroki odwracalne', writes: [], phase: 'W4', doc: '11-agent.md',
    examples: ['uruchom rutynę poranek', 'start pracy', 'zrób mój wieczór'] },
  { id: 'routine_list', group: 'Agent', label: 'Lista rutyn', description: 'Rutyny z wyzwalaczami i ostatnim uruchomieniem.', args: S({}), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W4', doc: '11-agent.md',
    examples: ['jakie mam rutyny', 'lista rutyn', 'pokaż automatyzacje'] },
  { id: 'routine_remove', group: 'Agent', label: 'Usuń rutynę', description: 'Usuwa rutynę.', args: S({ name: str() }, ['name']), level: 'A0', risk: 'confirm', undo: 'przywróć rutynę (10 min)', writes: ['routines'], phase: 'W4', doc: '11-agent.md',
    examples: ['usuń rutynę poranek', 'skasuj automatyzację wieczór', 'nie potrzebuję już rutyny start pracy'] },
  { id: 'plan_control', group: 'Agent', label: 'Sterowanie planem', description: 'Pauza, wznowienie, pominięcie kroku albo zatrzymanie trwającego zadania wieloetapowego.', args: S({ op: str({ enum: ['pause', 'resume', 'skip', 'stop'] }) }, ['op']), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W4', doc: '11-agent.md',
    examples: ['wstrzymaj', 'pomiń ten krok', 'dokończ', 'stop'] }
];
