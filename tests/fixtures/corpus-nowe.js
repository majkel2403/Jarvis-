/* Zdania dla PLANOWANYCH poleceń (docs/spec/nowe-polecenia.js): parafrazy inne niż przykłady w specyfikacji.
   Dziś służą do sprawdzenia spójności specyfikacji (tests/unit/spec.test.js); po wdrożeniu danej fali trafiają do
   tests/fixtures/corpus.js i do sondy Jeva. Format: [zdanie, id polecenia, kategoria] (local = parser powinien trafić, para = parafraza dla Jeva). */
'use strict';
module.exports = [
  // nawigacja
  // okna
  // widgety
  ['zrób mi kafelek z kursem ethereum', 'widget_build', 'para'], ['stwórz widget z listą zadań na jutro', 'widget_build', 'para'], ['widget z odliczaniem do piątku', 'widget_build', 'para'],
  ['w tym widgecie pokaż też solanę', 'widget_edit', 'para'], ['zamień tabelę na wykres słupkowy', 'widget_edit', 'para'],
  ['odśwież dane w widgetach', 'widget_refresh', 'local'], ['niech widget krypto pobierze nowe ceny', 'widget_refresh', 'para'],
  // notatki
  // zadania
  // aplikacje
  // wygląd
  ['efekty na minimum', 'fx_level', 'local'], ['za dużo tych animacji', 'fx_level', 'para'],
  ['wykres ethereum z miesiąca', 'chart_show', 'local'], ['narysuj ile miałem zadań w tym tygodniu', 'chart_show', 'para'],
  // ustawienia
  // agent
  ['utwórz rutynę wieczór', 'routine_create', 'local'], ['co piątek o 16 rób mi podsumowanie tygodnia', 'routine_create', 'para'],
  ['uruchom rutynę wieczór', 'routine_run', 'local'], ['odpal mój poranek', 'routine_run', 'para'],
  ['pokaż rutyny', 'routine_list', 'local'], ['co mam zautomatyzowane', 'routine_list', 'para'],
  ['usuń rutynę wieczór', 'routine_remove', 'local'], ['wyłącz na stałe automatyzację poranną', 'routine_remove', 'para'],
  ['pauza zadania', 'plan_control', 'local'], ['poczekaj chwilę z tym planem', 'plan_control', 'para']
];
