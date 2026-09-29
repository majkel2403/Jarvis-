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
  { id: 'nav_forward', group: 'Nawigacja', label: 'Dalej (po „wróć”)', description: 'Idzie do przodu w historii okien — odwrotność nav_back.', args: S({}), level: 'A3', risk: 'safe', undo: null, writes: ['windows'], phase: 'W1', doc: '03-nawigacja.md',
    examples: ['dalej', 'naprzód', 'wróć do przodu'] },
  { id: 'app_view', group: 'Nawigacja', label: 'Przejdź do widoku w aplikacji', description: 'Otwiera aplikację na konkretnym widoku lub obiekcie (np. notatka, dzień, zakładka stopera, para w rynku, miasto w pogodzie, sekcja ustawień). Lista widoków: 03-nawigacja.md §3.', args: S({ app: str({ enum: APPS }), view: str({ description: 'nazwa widoku z §3' }), target: str({ description: 'obiekt w widoku (id, nazwa, data)' }) }, ['app']), level: 'A3', risk: 'safe', undo: 'nav_back', writes: ['windows'], phase: 'W1', doc: '03-nawigacja.md',
    examples: ['pokaż stoper', 'otwórz notatkę zakupy', 'pokaż ethereum w rynku', 'pokaż pogodę w Gdańsku'] },
  { id: 'search_all', group: 'Nawigacja', label: 'Szukaj wszędzie', description: 'Jedno wyszukiwanie po notatkach, zadaniach, widgetach, skrótach, pamięci, historii czatu, ustawieniach i poleceniach. Zwraca listę wyników z typem i akcją „otwórz”.', args: S({ query: str({ maxLength: 120 }), types: { type: 'array', items: str({ enum: ['notes', 'tasks', 'widgets', 'shortcuts', 'memory', 'chat', 'settings', 'commands', 'files'] }) }, limit: num({ minimum: 1, maximum: 50 }) }, ['query']), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W2', doc: '03-nawigacja.md',
    examples: ['szukaj wszędzie bank', 'gdzie mam coś o wakacjach', 'znajdź wszystko o spotkaniu'] },
  { id: 'recent_list', group: 'Nawigacja', label: 'Ostatnio otwierane', description: 'Lista ostatnio otwieranych okien, notatek i widoków (do szybkiego powrotu).', args: S({ limit: num({ minimum: 1, maximum: 20 }) }), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W2', doc: '03-nawigacja.md',
    examples: ['co ostatnio otwierałem', 'ostatnie okna', 'pokaż ostatnie'] },
  { id: 'ui_mode', group: 'Nawigacja', label: 'Tryb przestrzeni', description: 'Przełącza tryb pulpitu: work (okna), clean (pusty pulpit, sam rdzeń), focus (jedno okno + cisza), present (bez prywatnych danych i logu). Tryb idle/thinking ustawia agent sam.', args: S({ mode: str({ enum: ['work', 'clean', 'focus', 'present'] }) }, ['mode']), level: 'A3', risk: 'safe', undo: 'poprzedni tryb', writes: ['ui', 'windows'], phase: 'W2', doc: '03-nawigacja.md',
    examples: ['tryb prezentacji', 'posprzątaj pulpit', 'tryb pracy'] },

  /* ================= OKNA (04-okna.md) ================= */
  { id: 'wm_move', extends: true, group: 'Aplikacje i okna', label: 'Przesuń / zmień rozmiar okna (rozszerzenie)', description: 'Rozszerzenie: widgety („w:<id>”), ruch względny (direction + amount), rozmiar z presetu (size).', args: S({ app: WIN, x: num(), y: num(), w: num(), h: num(), direction: str({ enum: ['left', 'right', 'up', 'down'] }), amount: str({ enum: ['small', 'medium', 'large'] }), size: str({ enum: ['S', 'M', 'L', 'XL', 'half', 'third', 'quarter'] }) }, ['app']), level: 'A2', risk: 'safe', undo: 'poprzednia pozycja i rozmiar', writes: ['windows'], phase: 'W1', doc: '04-okna.md',
    examples: ['przesuń notatnik trochę w prawo', 'powiększ to okno', 'zrób minutnik mały', 'rozciągnij pogodę na pół ekranu'] },
  { id: 'wm_arrange', extends: true, group: 'Aplikacje i okna', label: 'Ułóż okna (rozszerzenie: pół na pół, cofanie)', description: 'Rozszerzenie: mode=split układa dwa okna obok siebie (apps=[lewe, prawe]); każde ułożenie odkłada poprzednie pozycje na stos „Cofnij”.', args: S({ mode: str({ enum: ['tile', 'left', 'right', 'top', 'bottom', 'max', 'center', 'layout', 'split'] }), layout: str(), app: WIN, apps: { type: 'array', items: str(), maxItems: 2 } }, ['mode']), level: 'A3', risk: 'safe', undo: 'poprzednie pozycje okien', writes: ['windows'], phase: 'W1', doc: '04-okna.md',
    examples: ['notatnik i harmonogram obok siebie', 'podziel ekran na pogodę i rynek', 'pół na pół notatki i terminal'] },
  { id: 'close_app', extends: true, group: 'Aplikacje i okna', label: 'Zamknij okno (rozszerzenie: poziom wg argumentu)', description: 'Rozszerzenie: jedno okno → A3 z „Cofnij” (wm_reopen); app="all" → A0 jak dziś.', args: S({ app: str({ description: 'id aplikacji, "w:<id>", "current" albo "all"' }) }, ['app']), level: 'A3', risk: 'safe', undo: 'wm_reopen', writes: ['windows'], phase: 'W1', doc: '04-okna.md', levelDependsOnArgs: true,
    examples: ['zamknij pogodę', 'zamknij to okno', 'wyłącz kalkulator'] },
  { id: 'wm_pin', group: 'Aplikacje i okna', label: 'Zawsze na wierzchu', description: 'Przypina okno lub widget nad innymi (albo odpina).', args: S({ app: WIN, on: bool }, ['app']), level: 'A2', risk: 'safe', undo: 'przywróć poprzedni stan przypięcia', writes: ['windows'], phase: 'W1', doc: '04-okna.md',
    examples: ['przypnij minutnik na wierzchu', 'odepnij to okno', 'minutnik zawsze na wierzchu'] },
  { id: 'wm_reopen', group: 'Aplikacje i okna', label: 'Otwórz ponownie zamknięte', description: 'Otwiera ostatnio zamknięte okno w tej samej pozycji i widoku (stos 10 ostatnich).', args: S({}), level: 'A3', risk: 'safe', undo: 'zamknij ponownie', writes: ['windows'], phase: 'W1', doc: '04-okna.md',
    examples: ['otwórz ponownie zamknięte', 'przywróć zamknięte okno', 'otwórz to co zamknąłem'] },
  { id: 'wm_restore', group: 'Aplikacje i okna', label: 'Przywróć okna', description: 'Przywraca zminimalizowane okno albo wszystkie (odwrotność „pokaż pulpit”).', args: S({ app: str({ description: 'id albo "all"' }) }, ['app']), level: 'A3', risk: 'safe', undo: 'zminimalizuj ponownie', writes: ['windows'], phase: 'W1', doc: '04-okna.md',
    examples: ['przywróć okna', 'pokaż z powrotem wszystkie okna', 'przywróć notatnik'] },
  { id: 'wm_close_others', group: 'Aplikacje i okna', label: 'Zamknij pozostałe', description: 'Zamyka wszystkie okna poza wskazanym (widgety zostają). Można cofnąć przez wm_reopen.', args: S({ app: WIN }, ['app']), level: 'A1', risk: 'safe', undo: 'otwórz ponownie zamknięte okna', writes: ['windows'], phase: 'W1', doc: '04-okna.md',
    examples: ['zostaw tylko notatnik', 'zamknij pozostałe okna', 'zamknij wszystko poza harmonogramem'] },
  { id: 'layout_list', group: 'Aplikacje i okna', label: 'Lista układów', description: 'Presety i zapisane układy okien z listą aplikacji.', args: S({}), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W2', doc: '04-okna.md',
    examples: ['jakie mam układy', 'lista układów', 'pokaż zapisane układy'] },
  { id: 'layout_remove', group: 'Aplikacje i okna', label: 'Usuń układ', description: 'Usuwa zapisany układ okien (presetów nie można usunąć).', args: S({ name: str() }, ['name']), level: 'A0', risk: 'confirm', undo: 'przywróć układ (10 min)', writes: ['layouts'], phase: 'W2', doc: '04-okna.md',
    examples: ['usuń układ biuro', 'skasuj układ praca2', 'nie potrzebuję układu wieczór'] },
  { id: 'layout_rename', group: 'Aplikacje i okna', label: 'Zmień nazwę układu', description: 'Zmienia nazwę zapisanego układu.', args: S({ name: str(), to: str({ maxLength: 40 }) }, ['name', 'to']), level: 'A2', risk: 'safe', undo: 'poprzednia nazwa', writes: ['layouts'], phase: 'W2', doc: '04-okna.md',
    examples: ['zmień nazwę układu biuro na praca', 'nazwij układ wieczór domowy', 'przemianuj układ rynek na giełda'] },
  { id: 'layout_startup', group: 'Aplikacje i okna', label: 'Układ startowy', description: 'Ustawia układ stosowany przy każdym uruchomieniu (albo wyłącza).', args: S({ name: str({ description: 'nazwa albo "none"' }) }, ['name']), level: 'A2', risk: 'safe', undo: 'poprzedni układ startowy', writes: ['settings'], phase: 'W2', doc: '04-okna.md',
    examples: ['na starcie włączaj układ praca', 'ustaw układ startowy rynek', 'wyłącz układ startowy'] },

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
  { id: 'chat_search', group: 'Czat', label: 'Szukaj w rozmowach', description: 'Szuka w historii czatu (IndexedDB); wynik przewija czat do wiadomości.', args: S({ query: str({ maxLength: 120 }) }, ['query']), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W2', doc: '08-aplikacje.md',
    examples: ['o czym rozmawialiśmy wczoraj o banku', 'znajdź w czacie przepis', 'szukaj w rozmowach hasło wifi'] },
  { id: 'chat_export', group: 'Czat', label: 'Eksport rozmowy', description: 'Zapisuje rozmowę jako .md (pobranie).', args: S({ range: str({ enum: ['session', 'all'] }) }), level: 'A1', risk: 'safe', undo: null, writes: [], phase: 'W2', doc: '08-aplikacje.md',
    examples: ['zapisz tę rozmowę do pliku', 'eksportuj czat', 'pobierz historię rozmowy'] },
  { id: 'chat_clear', group: 'Czat', label: 'Wyczyść rozmowę', description: 'Usuwa historię czatu (i streszczenie). Nieodwracalne.', args: S({}), level: 'A0', risk: 'confirm', undo: null, writes: ['chat'], phase: 'W2', doc: '08-aplikacje.md',
    examples: ['wyczyść czat', 'usuń historię rozmowy', 'zacznijmy od czystej karty'] },
  { id: 'chat_thread', group: 'Czat', label: 'Wątki rozmów', description: 'Nowy wątek, przełączenie, lista, zmiana nazwy (każdy wątek ma własną historię i streszczenie).', args: S({ op: str({ enum: ['new', 'switch', 'list', 'rename'] }), name: str({ maxLength: 40 }) }, ['op']), level: 'A2', risk: 'safe', undo: 'poprzedni wątek', writes: ['chat'], phase: 'W2', doc: '08-aplikacje.md',
    examples: ['nowy wątek o wakacjach', 'przełącz na wątek praca', 'jakie mam wątki'] },
  { id: 'memory_edit', group: 'Pamięć', label: 'Popraw zapamiętany fakt', description: 'Zmienia treść faktu w pamięci.', args: S({ fact: str(), text: str({ maxLength: 300 }) }, ['fact', 'text']), level: 'A2', risk: 'safe', undo: 'poprzednia treść', writes: ['memory'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['popraw w pamięci: pracuję hybrydowo, nie zdalnie', 'zmień fakt o kawie na herbatę', 'zaktualizuj to co wiesz o moim psie'] },
  { id: 'files_open', group: 'Pliki', label: 'Pokaż plik', description: 'Otwiera podgląd pliku (tekst, Markdown, JSON, obraz) w oknie Pliki.', args: S({ path: str() }, ['path']), level: 'A3', risk: 'safe', undo: null, writes: ['windows'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['pokaż plik raport.md', 'otwórz plik notatki.txt', 'podgląd pliku dane.json'] },
  { id: 'shortcut_edit', group: 'Pulpit i widgety', label: 'Edytuj skrót', description: 'Zmienia nazwę, adres, aplikację albo ikonę skrótu.', args: S({ shortcut: str(), name: str({ maxLength: 40 }), url: str(), app: str({ enum: APPS }), icon: str() }, ['shortcut']), level: 'A2', risk: 'safe', undo: 'poprzednie wartości', writes: ['shortcuts'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['zmień nazwę skrótu github na kod', 'skrót poczta niech otwiera gmail.com', 'zmień ikonę skrótu'] },
  { id: 'dock_order', group: 'Pulpit i widgety', label: 'Kolejność w doku', description: 'Ustawia kolejność aplikacji i skrótów w doku (przesuń element na pozycję).', args: S({ item: str(), position: num({ minimum: 1, maximum: 30 }) }, ['item', 'position']), level: 'A2', risk: 'safe', undo: 'poprzednia kolejność', writes: ['settings'], phase: 'W3', doc: '08-aplikacje.md',
    examples: ['przesuń notatnik na początek doku', 'terminal jako ostatni w doku', 'daj pogodę na drugie miejsce'] },

  /* ================= WYGLĄD (09-wyglad-stany.md) ================= */
  { id: 'ui_scale', group: 'Interfejs', label: 'Skala interfejsu', description: 'Powiększa albo zmniejsza cały interfejs (80–130%).', args: S({ percent: num({ minimum: 80, maximum: 130 }), step: str({ enum: ['up', 'down', 'reset'] }) }), level: 'A2', risk: 'safe', undo: 'poprzednia skala', writes: ['settings'], phase: 'W2', doc: '09-wyglad-stany.md',
    examples: ['powiększ interfejs', 'zmniejsz wszystko', 'skala 110 procent'] },
  { id: 'fx_level', group: 'Interfejs', label: 'Poziom efektów', description: 'Efekty: tool (oszczędnie), standard, cinema (pełne); off = bez animacji.', args: S({ level: str({ enum: ['off', 'tool', 'standard', 'cinema'] }) }, ['level']), level: 'A2', risk: 'safe', undo: 'poprzedni poziom', writes: ['settings'], phase: 'W5', doc: '09-wyglad-stany.md',
    examples: ['wyłącz animacje', 'tryb kinowy', 'mniej efektów'] },
  { id: 'chart_show', group: 'Interfejs', label: 'Pokaż wykres', description: 'Skrót do widget_build: wykres z danych polecenia A3 (kursy, zadania w tygodniu, aktywność, koszt, pewność Jeva).', args: S({ source: str({ enum: ['crypto', 'tasks_week', 'activity', 'cost', 'jev_confidence', 'weather_hours'] }), symbol: str(), range: str({ enum: ['1h', '24h', '7d', '30d'] }), kind: str({ enum: ['line', 'bar', 'area', 'spark'] }) }, ['source']), level: 'A2', risk: 'safe', undo: 'usuń widget', writes: ['widgets'], phase: 'W4', doc: '09-wyglad-stany.md',
    examples: ['pokaż wykres bitcoina z tygodnia', 'wykres zadań w tym tygodniu', 'pokaż na wykresie temperaturę na dziś'] },

  /* ================= USTAWIENIA (10-ustawienia.md) ================= */
  { id: 'keys_set', group: 'Interfejs', label: 'Zmień skrót klawiszowy', description: 'Przypisuje skrót do akcji z mapy skrótów (sprawdza konflikty z przeglądarką i innymi skrótami).', args: S({ action: str(), keys: str({ description: 'np. Alt+K' }) }, ['action', 'keys']), level: 'A2', risk: 'safe', undo: 'poprzedni skrót', writes: ['settings'], phase: 'W2', doc: '10-ustawienia.md',
    examples: ['paleta pod Alt+P', 'zmień skrót czatu na Alt+C', 'przywróć domyślne skróty'] },
  { id: 'settings_reset', group: 'Interfejs', label: 'Przywróć ustawienia sekcji', description: 'Przywraca domyślne wartości jednej sekcji (klucze zostają).', args: S({ section: str({ enum: ['wyglad', 'glos', 'agent', 'jev', 'hermes', 'skroty', 'powiadomienia'] }) }, ['section']), level: 'A0', risk: 'confirm', undo: 'poprzednie wartości (10 min)', writes: ['settings'], phase: 'W2', doc: '10-ustawienia.md',
    examples: ['przywróć domyślny wygląd', 'zresetuj ustawienia głosu', 'domyślne ustawienia Jeva'] },
  { id: 'notif_channel', group: 'Interfejs', label: 'Kanał powiadomień', description: 'Włącza/wyłącza rodzaj powiadomień (zadania, minutnik, rynek, sieć, agent) albo zmienia dźwięk/limit na godzinę.', args: S({ kind: str({ enum: ['task', 'timer', 'market', 'network', 'agent', 'files', 'hermes'] }), on: bool, sound: bool, per_hour: num({ minimum: 0, maximum: 60 }) }, ['kind']), level: 'A2', risk: 'safe', undo: 'poprzednie ustawienie', writes: ['settings'], phase: 'W2', doc: '10-ustawienia.md',
    examples: ['wyłącz powiadomienia z rynku', 'bez dźwięku przy zadaniach', 'maksymalnie 3 powiadomienia na godzinę'] },

  /* ================= AGENT (11-agent.md) ================= */
  { id: 'routine_create', group: 'Agent', label: 'Utwórz rutynę', description: 'Rutyna = nazwa + wyzwalacz (godzina, dni, zdarzenie, na żądanie) + kroki (polecenia rejestru albo zdanie do Hermesa). Kroki A0 zawsze pytają w chwili wykonania.', args: S({ name: str({ maxLength: 40 }), trigger: { type: 'object' }, steps: { type: 'array', maxItems: 12, items: { type: 'object' } } }, ['name', 'steps']), level: 'A1', risk: 'safe', undo: 'usuń rutynę', writes: ['routines'], phase: 'W4', doc: '11-agent.md',
    examples: ['zrób rutynę poranek: pogoda, zadania na dziś i układ praca', 'codziennie o 18 pokaż podsumowanie dnia', 'kiedy mówię start pracy, otwórz notatnik i włącz skupienie'] },
  { id: 'routine_run', group: 'Agent', label: 'Uruchom rutynę', description: 'Uruchamia rutynę teraz (kroki z paskiem postępu; pauza/pominięcie/stop).', args: S({ name: str() }, ['name']), level: 'A1', risk: 'safe', undo: 'cofnij kroki odwracalne', writes: [], phase: 'W4', doc: '11-agent.md',
    examples: ['uruchom rutynę poranek', 'start pracy', 'zrób mój wieczór'] },
  { id: 'routine_list', group: 'Agent', label: 'Lista rutyn', description: 'Rutyny z wyzwalaczami i ostatnim uruchomieniem.', args: S({}), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W4', doc: '11-agent.md',
    examples: ['jakie mam rutyny', 'lista rutyn', 'pokaż automatyzacje'] },
  { id: 'routine_remove', group: 'Agent', label: 'Usuń rutynę', description: 'Usuwa rutynę.', args: S({ name: str() }, ['name']), level: 'A0', risk: 'confirm', undo: 'przywróć rutynę (10 min)', writes: ['routines'], phase: 'W4', doc: '11-agent.md',
    examples: ['usuń rutynę poranek', 'skasuj automatyzację wieczór', 'nie potrzebuję już rutyny start pracy'] },
  { id: 'undo', group: 'Agent', label: 'Cofnij', description: 'Cofa ostatnią akcję (albo N ostatnich; albo wszystko z ostatnich M minut). Dziś „cofnij” działa jako zdanie specjalne — to formalizuje je w rejestrze.', args: S({ count: num({ minimum: 1, maximum: 10 }), minutes: num({ minimum: 1, maximum: 10 }) }), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W1', doc: '11-agent.md',
    examples: ['cofnij', 'cofnij dwie ostatnie rzeczy', 'cofnij wszystko z ostatnich 5 minut'] },
  { id: 'undo_list', group: 'Agent', label: 'Historia do cofnięcia', description: 'Pokazuje stos akcji, które da się cofnąć (z czasem i opisem).', args: S({}), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W1', doc: '11-agent.md',
    examples: ['co mogę cofnąć', 'historia zmian', 'co ostatnio zrobiłeś'] },
  { id: 'plan_control', group: 'Agent', label: 'Sterowanie planem', description: 'Pauza, wznowienie, pominięcie kroku albo zatrzymanie trwającego zadania wieloetapowego.', args: S({ op: str({ enum: ['pause', 'resume', 'skip', 'stop'] }) }, ['op']), level: 'A3', risk: 'safe', undo: null, writes: [], phase: 'W4', doc: '11-agent.md',
    examples: ['wstrzymaj', 'pomiń ten krok', 'dokończ', 'stop'] }
];
