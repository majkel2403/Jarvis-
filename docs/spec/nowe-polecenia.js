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
  { id: 'widget_duplicate', group: 'Pulpit i widgety', label: 'Duplikuj widget', description: 'Tworzy kopię widgetu obok oryginału.', args: S({ widget: WIDGET }, ['widget']), level: 'A2', risk: 'safe', undo: 'usuń kopię', writes: ['widgets'], phase: 'W3', doc: '05-widgety.md',
    examples: ['zduplikuj ten widget', 'zrób kopię listy zakupów', 'skopiuj widget krypto'] },
  { id: 'widget_collapse', group: 'Pulpit i widgety', label: 'Zwiń / rozwiń widget', description: 'Zwija widget do paska tytułu albo rozwija.', args: S({ widget: WIDGET, on: bool }, ['widget']), level: 'A3', risk: 'safe', undo: 'odwrotny stan', writes: ['widgets'], phase: 'W3', doc: '05-widgety.md',
    examples: ['zwiń widget krypto', 'rozwiń listę', 'zwiń wszystkie widgety'] },
  { id: 'widget_items', group: 'Pulpit i widgety', label: 'Pozycje listy w widgecie', description: 'Dodaje, odhacza, zmienia lub usuwa pozycję w widgecie-liście.', args: S({ widget: WIDGET, op: str({ enum: ['add', 'check', 'uncheck', 'rename', 'remove', 'clear_done'] }), item: str(), to: str() }, ['widget', 'op']), level: 'A2', risk: 'safe', undo: 'poprzednia lista', writes: ['widgets'], phase: 'W3', doc: '05-widgety.md',
    examples: ['dodaj masło do listy zakupów', 'odhacz mleko na liście', 'usuń zrobione z listy'] },

  /* ================= NOTATKI (06-notatki.md) ================= */
  { id: 'notes_tag', group: 'Notatki', label: 'Tagi notatki', description: 'Dodaje lub usuwa tagi notatki (małe litery, bez spacji, maks. 10).', args: S({ note: NOTE, add: { type: 'array', items: str({ maxLength: 24 }) }, remove: { type: 'array', items: str() } }, ['note']), level: 'A2', risk: 'safe', undo: 'poprzednie tagi', writes: ['notes'], phase: 'W3', doc: '06-notatki.md',
    examples: ['oznacz notatkę zakupy tagiem dom', 'dodaj tag praca do tej notatki', 'usuń tag pilne z notatki plan'] },
  { id: 'notes_pin', group: 'Notatki', label: 'Przypnij notatkę', description: 'Przypina notatkę na górze listy (albo odpina).', args: S({ note: NOTE, on: bool }, ['note']), level: 'A2', risk: 'safe', undo: 'odwrotny stan', writes: ['notes'], phase: 'W3', doc: '06-notatki.md',
    examples: ['przypnij notatkę zakupy', 'odepnij tę notatkę', 'przypnij plan dnia na górze'] },
  { id: 'notes_duplicate', group: 'Notatki', label: 'Duplikuj notatkę', description: 'Tworzy kopię notatki z dopiskiem „(kopia)”.', args: S({ note: NOTE }, ['note']), level: 'A2', risk: 'safe', undo: 'usuń kopię', writes: ['notes'], phase: 'W3', doc: '06-notatki.md',
    examples: ['zduplikuj notatkę zakupy', 'zrób kopię tej notatki', 'skopiuj notatkę plan'] },
  { id: 'notes_trash', group: 'Notatki', label: 'Kosz notatek', description: 'Lista notatek w koszu (usunięte w ciągu 30 dni).', args: S({}), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W3', doc: '06-notatki.md',
    examples: ['co jest w koszu', 'pokaż usunięte notatki', 'kosz notatek'] },
  { id: 'notes_restore', group: 'Notatki', label: 'Przywróć notatkę z kosza', description: 'Przywraca notatkę z kosza.', args: S({ note: NOTE }, ['note']), level: 'A2', risk: 'safe', undo: 'z powrotem do kosza', writes: ['notes'], phase: 'W3', doc: '06-notatki.md',
    examples: ['przywróć notatkę zakupy', 'odzyskaj usuniętą notatkę plan', 'wyciągnij z kosza notatkę pomysły'] },
  { id: 'notes_empty_trash', group: 'Notatki', label: 'Opróżnij kosz', description: 'Trwale usuwa notatki z kosza (nieodwracalne).', args: S({}), level: 'A0', risk: 'confirm', undo: null, writes: ['notes'], phase: 'W3', doc: '06-notatki.md',
    examples: ['opróżnij kosz', 'usuń na zawsze notatki z kosza', 'wyczyść kosz'] },
  { id: 'notes_versions', group: 'Notatki', label: 'Wersje notatki', description: 'Lista zapisanych wersji notatki (maks. 20, co najmniej 5 min odstępu albo przed zmianą przez Jarvisa).', args: S({ note: NOTE }, ['note']), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W3', doc: '06-notatki.md',
    examples: ['pokaż wersje notatki plan', 'historia zmian tej notatki', 'jak wyglądała ta notatka wcześniej'] },
  { id: 'notes_revert', group: 'Notatki', label: 'Przywróć wersję notatki', description: 'Przywraca wskazaną wersję (bieżąca staje się nową wersją, więc można wrócić).', args: S({ note: NOTE, version: str({ description: 'id wersji albo "previous"' }) }, ['note', 'version']), level: 'A2', risk: 'safe', undo: 'wersja sprzed przywrócenia', writes: ['notes'], phase: 'W3', doc: '06-notatki.md',
    examples: ['przywróć poprzednią wersję notatki', 'cofnij notatkę plan do wczoraj', 'wróć do wersji sprzed zmiany Jarvisa'] },
  { id: 'notes_to_task', group: 'Notatki', label: 'Zadanie z notatki', description: 'Tworzy zadanie z notatki albo z jej linii (link zwrotny w zadaniu).', args: S({ note: NOTE, line: str(), time: str(), date: str({ format: 'date' }) }, ['note']), level: 'A2', risk: 'safe', undo: 'usuń zadanie', writes: ['tasks'], phase: 'W3', doc: '06-notatki.md',
    examples: ['zrób zadanie z notatki zakupy na jutro', 'z tej linijki zrób zadanie', 'przypomnij mi o notatce plan o 17'] },
  { id: 'notes_folder', group: 'Notatki', label: 'Folder notatki', description: 'Przenosi notatkę do folderu (jeden poziom; folder powstaje sam).', args: S({ note: NOTE, folder: str({ maxLength: 40, description: 'nazwa albo "" = bez folderu' }) }, ['note', 'folder']), level: 'A2', risk: 'safe', undo: 'poprzedni folder', writes: ['notes'], phase: 'W3', doc: '06-notatki.md',
    examples: ['przenieś notatkę zakupy do folderu dom', 'włóż tę notatkę do pracy', 'wyjmij notatkę z folderu'] },

  /* ================= ZADANIA (07-zadania.md) ================= */
  { id: 'add_task', extends: true, group: 'Zadania i czas', label: 'Dodaj zadanie (rozszerzenie: priorytet, powtarzanie, przypomnienie przed)', description: 'Rozszerzenie: priority, repeat (jak tasks_repeat), remind = minuty przed terminem.', args: S({ text: str(), time: str({ format: 'time' }), date: str({ format: 'date' }), priority: str({ enum: ['high', 'normal', 'low'] }), repeat: { type: 'object' }, remind: num({ minimum: 0, maximum: 1440 }) }, ['text']), level: 'A2', risk: 'safe', undo: 'usuń zadanie', writes: ['tasks'], phase: 'W3', doc: '07-zadania.md',
    examples: ['pilne: zadzwonić do banku o 10', 'przypomnij mi 15 minut przed spotkaniem o 14', 'codziennie o 7 witaminy'] },
  { id: 'tasks_update', extends: true, group: 'Zadania i czas', label: 'Zmień zadanie (rozszerzenie: przypomnienie, seria)', description: 'Rozszerzenie: remind (minuty przed), scope = this | series dla zadań powtarzanych.', args: S({ task: TASK, text: str(), time: str({ format: 'time' }), date: str({ format: 'date' }), snooze_minutes: num({ minimum: 1 }), remind: num({ minimum: 0, maximum: 1440 }), scope: str({ enum: ['this', 'series'] }) }, ['task']), level: 'A2', risk: 'safe', undo: 'poprzednie wartości', writes: ['tasks'], phase: 'W3', doc: '07-zadania.md',
    examples: ['przypominaj o treningu pół godziny wcześniej', 'przesuń całą serię treningów na 19', 'tylko dzisiejszy trening przełóż na jutro'] },
  { id: 'tasks_repeat', group: 'Zadania i czas', label: 'Powtarzanie zadania', description: 'Ustawia powtarzanie: daily, weekdays, weekly (dni), monthly, co N dni; until = data końca; none = wyłącz.', args: S({ task: TASK, rule: str({ enum: ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'every_n_days'] }), days: { type: 'array', items: str({ enum: ['pn', 'wt', 'sr', 'cz', 'pt', 'so', 'nd'] }) }, n: num({ minimum: 2, maximum: 365 }), until: str({ format: 'date' }) }, ['task', 'rule']), level: 'A2', risk: 'safe', undo: 'poprzednia reguła', writes: ['tasks'], phase: 'W3', doc: '07-zadania.md',
    examples: ['trening powtarzaj w poniedziałki i czwartki', 'podlewanie kwiatów co 3 dni', 'raport co miesiąc', 'przestań powtarzać trening'] },
  { id: 'tasks_priority', group: 'Zadania i czas', label: 'Priorytet zadania', description: 'Ustawia priorytet: high, normal, low.', args: S({ task: TASK, priority: str({ enum: ['high', 'normal', 'low'] }) }, ['task', 'priority']), level: 'A2', risk: 'safe', undo: 'poprzedni priorytet', writes: ['tasks'], phase: 'W3', doc: '07-zadania.md',
    examples: ['dentysta jest pilny', 'ustaw wysoki priorytet dla raportu', 'trening może poczekać'] },
  { id: 'tasks_subtask', group: 'Zadania i czas', label: 'Podzadania', description: 'Dodaje, odhacza lub usuwa podzadanie (jeden poziom).', args: S({ task: TASK, op: str({ enum: ['add', 'check', 'uncheck', 'remove'] }), text: str({ maxLength: 120 }) }, ['task', 'op', 'text']), level: 'A2', risk: 'safe', undo: 'poprzednie podzadania', writes: ['tasks'], phase: 'W3', doc: '07-zadania.md',
    examples: ['do przeprowadzki dodaj podzadanie pakowanie', 'odhacz pakowanie w przeprowadzce', 'usuń podzadanie kartony'] },
  { id: 'tasks_move_many', group: 'Zadania i czas', label: 'Przenieś wiele zadań', description: 'Przenosi zadania pasujące do filtra (dzień, niezrobione, zaległe) na inny dzień. Jedno „Cofnij” cofa całość.', args: S({ from: str({ description: 'dziś, jutro, data, overdue' }), to: str({ format: 'date' }), only_open: bool }, ['from', 'to']), level: 'A1', risk: 'safe', undo: 'poprzednie daty wszystkich', writes: ['tasks'], phase: 'W3', doc: '07-zadania.md',
    examples: ['przenieś wszystkie dzisiejsze na jutro', 'przesuń zaległe na dziś', 'przełóż niezrobione na poniedziałek'] },
  { id: 'tasks_clear_done', group: 'Zadania i czas', label: 'Usuń zrobione', description: 'Usuwa zrobione zadania z zakresu (dzień, tydzień, wszystkie). Zbiorowe usuwanie ⇒ zgoda.', args: S({ range: str({ enum: ['today', 'week', 'all'] }) }, ['range']), level: 'A0', risk: 'confirm', undo: 'przywróć usunięte (10 min)', writes: ['tasks'], phase: 'W3', doc: '07-zadania.md',
    examples: ['usuń zrobione zadania', 'wyczyść zrobione z tego tygodnia', 'posprzątaj ukończone'] },
  { id: 'tasks_export_ics', group: 'Zadania i czas', label: 'Eksport do kalendarza', description: 'Zapisuje zadania z zakresu jako plik .ics (pobranie przez przeglądarkę).', args: S({ range: str({ enum: ['today', 'week', 'month', 'all'] }) }, ['range']), level: 'A1', risk: 'safe', undo: null, writes: [], phase: 'W3', doc: '07-zadania.md',
    examples: ['wyeksportuj zadania do kalendarza', 'zapisz tydzień jako ics', 'eksport zadań na miesiąc'] },

  /* ================= APLIKACJE (08-aplikacje.md) ================= */
  { id: 'timer_list', group: 'Zadania i czas', label: 'Lista minutników', description: 'Wszystkie działające minutniki (po zmianie: kilka naraz) z czasem do końca.', args: S({}), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['ile zostało na minutnikach', 'jakie minutniki działają', 'lista minutników'] },
  { id: 'start_timer', extends: true, group: 'Zadania i czas', label: 'Minutnik (rozszerzenie: kilka naraz, pomodoro)', description: 'Rozszerzenie: label rozróżnia minutniki (maks. 5), preset pomodoro (25/5 ×4), repeat.', args: S({ seconds: num({ minimum: 1, maximum: 86400 }), label: str({ maxLength: 40 }), preset: str({ enum: ['pomodoro', 'short_break', 'long_break'] }) }), level: 'A2', risk: 'safe', undo: 'zatrzymaj ten minutnik', writes: ['timers'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['drugi minutnik 10 minut na herbatę', 'pomodoro', 'minutnik 3 minuty jajka'] },
  { id: 'market_watchlist', group: 'Dane', label: 'Lista obserwowanych', description: 'Dodaje/usuwa kryptowalutę z listy w Monitorze rynku (tylko podgląd — żadnego handlu).', args: S({ op: str({ enum: ['add', 'remove', 'list'] }), symbol: str({ maxLength: 12 }) }, ['op']), level: 'A2', risk: 'safe', undo: 'odwrotna operacja', writes: ['settings'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['dodaj dogecoina do obserwowanych', 'usuń solanę z rynku', 'jakie kryptowaluty obserwuję'] },
  { id: 'market_alerts', group: 'Dane', label: 'Alerty kursów', description: 'Lista i usuwanie alertów market_watch.', args: S({ op: str({ enum: ['list', 'remove', 'clear'] }), alert: str() }, ['op']), level: 'A2', risk: 'safe', undo: 'przywróć alert', writes: ['alerts'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['jakie mam alerty', 'usuń alert na bitcoina', 'wyczyść alerty kursów'] },
  { id: 'memory_edit', group: 'Pamięć', label: 'Popraw zapamiętany fakt', description: 'Zmienia treść faktu w pamięci.', args: S({ fact: str(), text: str({ maxLength: 300 }) }, ['fact', 'text']), level: 'A2', risk: 'safe', undo: 'poprzednia treść', writes: ['memory'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['popraw w pamięci: pracuję hybrydowo, nie zdalnie', 'zmień fakt o kawie na herbatę', 'zaktualizuj to co wiesz o moim psie'] },
  { id: 'files_open', group: 'Pliki', label: 'Pokaż plik', description: 'Otwiera podgląd pliku (tekst, Markdown, JSON, obraz) w oknie Pliki.', args: S({ path: str() }, ['path']), level: 'A3', risk: 'safe', undo: null, writes: ['windows'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['pokaż plik raport.md', 'otwórz plik notatki.txt', 'podgląd pliku dane.json'] },
  { id: 'dock_order', group: 'Pulpit i widgety', label: 'Kolejność w doku', description: 'Ustawia kolejność aplikacji i skrótów w doku (przesuń element na pozycję).', args: S({ item: str(), position: num({ minimum: 1, maximum: 30 }) }, ['item', 'position']), level: 'A2', risk: 'safe', undo: 'poprzednia kolejność', writes: ['settings'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['przesuń notatnik na początek doku', 'terminal jako ostatni w doku', 'daj pogodę na drugie miejsce'] },

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
