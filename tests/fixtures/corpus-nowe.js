/* Zdania dla PLANOWANYCH poleceń (docs/spec/nowe-polecenia.js): parafrazy inne niż przykłady w specyfikacji.
   Dziś służą do sprawdzenia spójności specyfikacji (tests/unit/spec.test.js); po wdrożeniu danej fali trafiają do
   tests/fixtures/corpus.js i do sondy Jeva. Format: [zdanie, id polecenia, kategoria] (local = parser powinien trafić, para = parafraza dla Jeva). */
'use strict';
module.exports = [
  // nawigacja
  // okna
  // widgety
  // notatki
  // zadania
  // aplikacje
  // wygląd
  ['efekty na minimum', 'fx_level', 'local'], ['za dużo tych animacji', 'fx_level', 'para'],
  // ustawienia
  // agent
];
