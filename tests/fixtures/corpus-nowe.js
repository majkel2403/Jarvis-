/* Zdania dla PLANOWANYCH poleceń (docs/spec/nowe-polecenia.js): parafrazy inne niż przykłady w specyfikacji.
   Dziś służą do sprawdzenia spójności specyfikacji (tests/unit/spec.test.js); po wdrożeniu danej fali trafiają do
   tests/fixtures/corpus.js i do sondy Jeva. Format: [zdanie, id polecenia, kategoria] (local = parser powinien trafić, para = parafraza dla Jeva). */
'use strict';
module.exports = [
  // nawigacja
  ['przeszukaj wszystko pod kątem faktury', 'search_all', 'para'], ['szukaj wszędzie dentysta', 'search_all', 'local'],
  ['do czego ostatnio zaglądałem', 'recent_list', 'para'], ['ostatnio otwierane', 'recent_list', 'local'],
  ['włącz tryb prezentacji', 'ui_mode', 'local'], ['schowaj wszystko prywatne, będę pokazywał ekran', 'ui_mode', 'para'], ['czysty pulpit', 'ui_mode', 'para'],
  // okna
  ['pokaż moje układy okien', 'layout_list', 'local'], ['jakie układy mam zapisane', 'layout_list', 'para'],
  ['usuń zapisany układ wieczór', 'layout_remove', 'local'], ['wywal układ test', 'layout_remove', 'para'],
  ['zmień nazwę układu test na nocny', 'layout_rename', 'local'], ['układ praca niech się nazywa biuro', 'layout_rename', 'para'],
  ['przy starcie otwieraj układ skupienie', 'layout_startup', 'para'], ['układ startowy praca', 'layout_startup', 'local'],
  // widgety
  ['zrób mi kafelek z kursem ethereum', 'widget_build', 'para'], ['stwórz widget z listą zadań na jutro', 'widget_build', 'para'], ['widget z odliczaniem do piątku', 'widget_build', 'para'],
  ['w tym widgecie pokaż też solanę', 'widget_edit', 'para'], ['zamień tabelę na wykres słupkowy', 'widget_edit', 'para'],
  ['odśwież dane w widgetach', 'widget_refresh', 'local'], ['niech widget krypto pobierze nowe ceny', 'widget_refresh', 'para'],
  ['zrób drugi taki sam widget', 'widget_duplicate', 'para'], ['duplikuj widget pogoda', 'widget_duplicate', 'local'],
  ['zwiń widget zakupy', 'widget_collapse', 'local'], ['schowaj zawartość tego widgetu', 'widget_collapse', 'para'],
  ['dopisz jajka do listy zakupy', 'widget_items', 'para'], ['odhacz chleb na liście zakupy', 'widget_items', 'local'],
  // notatki
  ['dodaj tag dom do notatki zakupy', 'notes_tag', 'local'], ['ta notatka jest o pracy, oznacz ją', 'notes_tag', 'para'],
  ['przypnij notatkę projekty', 'notes_pin', 'local'], ['niech plan dnia będzie zawsze na górze', 'notes_pin', 'para'],
  ['duplikuj notatkę plan', 'notes_duplicate', 'local'], ['potrzebuję drugiej takiej notatki', 'notes_duplicate', 'para'],
  ['pokaż kosz', 'notes_trash', 'local'], ['które notatki usunąłem', 'notes_trash', 'para'],
  ['przywróć z kosza notatkę zakupy', 'notes_restore', 'local'], ['jednak chcę z powrotem notatkę plan', 'notes_restore', 'para'],
  ['opróżnij kosz notatek', 'notes_empty_trash', 'local'], ['usuń trwale wszystko z kosza', 'notes_empty_trash', 'para'],
  ['wersje notatki zakupy', 'notes_versions', 'local'], ['co się zmieniało w tej notatce', 'notes_versions', 'para'],
  ['przywróć poprzednią wersję notatki zakupy', 'notes_revert', 'local'], ['wróć do starej treści tej notatki', 'notes_revert', 'para'],
  ['zrób zadanie z notatki plan', 'notes_to_task', 'local'], ['dodaj tę notatkę do harmonogramu na piątek', 'notes_to_task', 'para'],
  ['przenieś notatkę plan do folderu praca', 'notes_folder', 'local'], ['wrzuć tę notatkę do folderu dom', 'notes_folder', 'para'],
  // zadania
  ['ważne: oddać raport jutro o 9', 'add_task', 'para'], ['przypomnij mi 10 minut przed dentystą o 16', 'add_task', 'local'],
  ['przypominaj o dentyście godzinę wcześniej', 'tasks_update', 'para'], ['przesuń wszystkie treningi z serii na 18', 'tasks_update', 'para'],
  ['powtarzaj trening co tydzień', 'tasks_repeat', 'local'], ['to zadanie ma wracać codziennie', 'tasks_repeat', 'para'],
  ['priorytet wysoki dla dentysty', 'tasks_priority', 'local'], ['to jest najważniejsze na dziś: raport', 'tasks_priority', 'para'],
  ['dodaj podzadanie kupić taśmę do przeprowadzki', 'tasks_subtask', 'local'], ['rozbij przeprowadzkę na kroki: pakowanie', 'tasks_subtask', 'para'],
  ['przenieś dzisiejsze zadania na jutro', 'tasks_move_many', 'local'], ['nie zdążę, wszystko z dziś daj na piątek', 'tasks_move_many', 'para'],
  ['usuń zrobione zadania z tygodnia', 'tasks_clear_done', 'local'], ['posprzątaj listę z odhaczonych', 'tasks_clear_done', 'para'],
  ['eksportuj zadania do ics', 'tasks_export_ics', 'local'], ['chcę te zadania w kalendarzu Google', 'tasks_export_ics', 'para'],
  // aplikacje
  ['pokaż listę minutników', 'timer_list', 'local'], ['ile jeszcze do końca odliczania', 'timer_list', 'para'],
  ['minutnik 8 minut makaron', 'start_timer', 'local'], ['zacznij sesję pomodoro', 'start_timer', 'para'],
  ['dodaj ripple do obserwowanych', 'market_watchlist', 'local'], ['nie chcę już widzieć bnb w rynku', 'market_watchlist', 'para'],
  ['pokaż alerty kursów', 'market_alerts', 'local'], ['usuń wszystkie powiadomienia o cenach', 'market_alerts', 'para'],
  ['szukaj w czacie urlop', 'chat_search', 'local'], ['co mi mówiłeś o inflacji', 'chat_search', 'para'],
  ['eksportuj rozmowę', 'chat_export', 'local'], ['zapisz naszą rozmowę', 'chat_export', 'para'],
  ['wyczyść historię czatu', 'chat_clear', 'local'], ['zapomnij całą naszą rozmowę', 'chat_clear', 'para'],
  ['nowy wątek', 'chat_thread', 'local'], ['zacznijmy osobną rozmowę o pracy', 'chat_thread', 'para'],
  ['popraw fakt o pracy w pamięci', 'memory_edit', 'local'], ['źle zapamiętałeś, mam kota nie psa', 'memory_edit', 'para'],
  ['otwórz plik todo.md', 'files_open', 'local'], ['pokaż co jest w pliku raport', 'files_open', 'para'],
  ['notatnik na pierwsze miejsce w doku', 'dock_order', 'local'], ['przestaw kolejność w doku', 'dock_order', 'para'],
  // wygląd
  ['powiększ wszystko', 'ui_scale', 'local'], ['litery są za małe', 'ui_scale', 'para'],
  ['efekty na minimum', 'fx_level', 'local'], ['za dużo tych animacji', 'fx_level', 'para'],
  ['wykres ethereum z miesiąca', 'chart_show', 'local'], ['narysuj ile miałem zadań w tym tygodniu', 'chart_show', 'para'],
  // ustawienia
  ['zmień skrót palety na Alt+P', 'keys_set', 'local'], ['chcę otwierać czat klawiszem F2', 'keys_set', 'para'],
  ['przywróć domyślne ustawienia wyglądu', 'settings_reset', 'local'], ['cofnij wszystkie moje zmiany w głosie', 'settings_reset', 'para'],
  ['wyłącz powiadomienia o sieci', 'notif_channel', 'local'], ['rynek niech mnie nie zaczepia', 'notif_channel', 'para'],
  // agent
  ['utwórz rutynę wieczór', 'routine_create', 'local'], ['co piątek o 16 rób mi podsumowanie tygodnia', 'routine_create', 'para'],
  ['uruchom rutynę wieczór', 'routine_run', 'local'], ['odpal mój poranek', 'routine_run', 'para'],
  ['pokaż rutyny', 'routine_list', 'local'], ['co mam zautomatyzowane', 'routine_list', 'para'],
  ['usuń rutynę wieczór', 'routine_remove', 'local'], ['wyłącz na stałe automatyzację poranną', 'routine_remove', 'para'],
  ['pauza zadania', 'plan_control', 'local'], ['poczekaj chwilę z tym planem', 'plan_control', 'para']
];
