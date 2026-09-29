# Katalog planowanych poleceń (wygenerowany z docs/spec/nowe-polecenia.js)

> Generuje `node tools/gen-spec.js`. Źródło: `docs/spec/nowe-polecenia.js`. Szczegóły w dokumencie z kolumny „opis w”. „rozszerzenie” = polecenie już istnieje, zmieniają się argumenty.

Planowanych: **65** (nowych 59, rozszerzeń 6). Po wdrożeniu rejestr będzie miał ok. 122 poleceń.

| fala | liczba |
|---|---|
| W1 | 11 |
| W2 | 15 |
| W3 | 29 |
| W4 | 9 |
| W5 | 1 |

## Nawigacja

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `nav_forward` | Dalej (po „wróć”) — Idzie do przodu w historii okien — odwrotność nav_back. | — | A3 | — | W1 | [03-nawigacja.md](03-nawigacja.md) | „dalej”, „naprzód”, „wróć do przodu” |
| `app_view` | Przejdź do widoku w aplikacji — Otwiera aplikację na konkretnym widoku lub obiekcie (np. notatka, dzień, zakładka stopera, para w rynku, miasto w pogodzie, sekcja ustawień). Lista widoków: 03-nawigacja.md §3. | **app**: chat\|notes\|market\|schedule\|monitor\|terminal\|weather\|calc\|timer\|settings\|library\|files; view: string; target: string | A3 | nav_back | W1 | [03-nawigacja.md](03-nawigacja.md) | „pokaż stoper”, „otwórz notatkę zakupy”, „pokaż ethereum w rynku” |
| `search_all` | Szukaj wszędzie — Jedno wyszukiwanie po notatkach, zadaniach, widgetach, skrótach, pamięci, historii czatu, ustawieniach i poleceniach. Zwraca listę wyników z typem i akcją „otwórz”. | **query**: string; types: string[]; limit: number | A3 | — | W2 | [03-nawigacja.md](03-nawigacja.md) | „szukaj wszędzie bank”, „gdzie mam coś o wakacjach”, „znajdź wszystko o spotkaniu” |
| `recent_list` | Ostatnio otwierane — Lista ostatnio otwieranych okien, notatek i widoków (do szybkiego powrotu). | limit: number | A3 | — | W2 | [03-nawigacja.md](03-nawigacja.md) | „co ostatnio otwierałem”, „ostatnie okna”, „pokaż ostatnie” |
| `ui_mode` | Tryb przestrzeni — Przełącza tryb pulpitu: work (okna), clean (pusty pulpit, sam rdzeń), focus (jedno okno + cisza), present (bez prywatnych danych i logu). Tryb idle/thinking ustawia agent sam. | **mode**: work\|clean\|focus\|present | A3 | poprzedni tryb | W2 | [03-nawigacja.md](03-nawigacja.md) | „tryb prezentacji”, „posprzątaj pulpit”, „tryb pracy” |

## Aplikacje i okna

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `wm_move` (rozszerzenie) | Przesuń / zmień rozmiar okna (rozszerzenie) — Rozszerzenie: widgety („w:<id>”), ruch względny (direction + amount), rozmiar z presetu (size). | **app**: string; x: number; y: number; w: number; h: number; direction: left\|right\|up\|down; amount: small\|medium\|large; size: S\|M\|L\|XL\|half\|third\|quarter | A2 | poprzednia pozycja i rozmiar | W1 | [04-okna.md](04-okna.md) | „przesuń notatnik trochę w prawo”, „powiększ to okno”, „zrób minutnik mały” |
| `wm_arrange` (rozszerzenie) | Ułóż okna (rozszerzenie: pół na pół, cofanie) — Rozszerzenie: mode=split układa dwa okna obok siebie (apps=[lewe, prawe]); każde ułożenie odkłada poprzednie pozycje na stos „Cofnij”. | **mode**: tile\|left\|right\|top\|bottom\|max\|center\|layout\|split; layout: string; app: string; apps: string[] | A3 | poprzednie pozycje okien | W1 | [04-okna.md](04-okna.md) | „notatnik i harmonogram obok siebie”, „podziel ekran na pogodę i rynek”, „pół na pół notatki i terminal” |
| `close_app` (rozszerzenie) | Zamknij okno (rozszerzenie: poziom wg argumentu) — Rozszerzenie: jedno okno → A3 z „Cofnij” (wm_reopen); app="all" → A0 jak dziś. | **app**: string | A3 | wm_reopen | W1 | [04-okna.md](04-okna.md) | „zamknij pogodę”, „zamknij to okno”, „wyłącz kalkulator” |
| `wm_pin` | Zawsze na wierzchu — Przypina okno lub widget nad innymi (albo odpina). | **app**: string; on: boolean | A2 | przywróć poprzedni stan przypięcia | W1 | [04-okna.md](04-okna.md) | „przypnij minutnik na wierzchu”, „odepnij to okno”, „minutnik zawsze na wierzchu” |
| `wm_reopen` | Otwórz ponownie zamknięte — Otwiera ostatnio zamknięte okno w tej samej pozycji i widoku (stos 10 ostatnich). | — | A3 | zamknij ponownie | W1 | [04-okna.md](04-okna.md) | „otwórz ponownie zamknięte”, „przywróć zamknięte okno”, „otwórz to co zamknąłem” |
| `wm_restore` | Przywróć okna — Przywraca zminimalizowane okno albo wszystkie (odwrotność „pokaż pulpit”). | **app**: string | A3 | zminimalizuj ponownie | W1 | [04-okna.md](04-okna.md) | „przywróć okna”, „pokaż z powrotem wszystkie okna”, „przywróć notatnik” |
| `wm_close_others` | Zamknij pozostałe — Zamyka wszystkie okna poza wskazanym (widgety zostają). Można cofnąć przez wm_reopen. | **app**: string | A1 | otwórz ponownie zamknięte okna | W1 | [04-okna.md](04-okna.md) | „zostaw tylko notatnik”, „zamknij pozostałe okna”, „zamknij wszystko poza harmonogramem” |
| `layout_list` | Lista układów — Presety i zapisane układy okien z listą aplikacji. | — | A3 | — | W2 | [04-okna.md](04-okna.md) | „jakie mam układy”, „lista układów”, „pokaż zapisane układy” |
| `layout_remove` | Usuń układ — Usuwa zapisany układ okien (presetów nie można usunąć). | **name**: string | A0 | przywróć układ (10 min) | W2 | [04-okna.md](04-okna.md) | „usuń układ biuro”, „skasuj układ praca2”, „nie potrzebuję układu wieczór” |
| `layout_rename` | Zmień nazwę układu — Zmienia nazwę zapisanego układu. | **name**: string; **to**: string | A2 | poprzednia nazwa | W2 | [04-okna.md](04-okna.md) | „zmień nazwę układu biuro na praca”, „nazwij układ wieczór domowy”, „przemianuj układ rynek na giełda” |
| `layout_startup` | Układ startowy — Ustawia układ stosowany przy każdym uruchomieniu (albo wyłącza). | **name**: string | A2 | poprzedni układ startowy | W2 | [04-okna.md](04-okna.md) | „na starcie włączaj układ praca”, „ustaw układ startowy rynek”, „wyłącz układ startowy” |

## Pulpit i widgety

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `widget_build` | Zbuduj widget z opisu — Tworzy widget z opisu (spec JSON wg docs/spec/widget.schema.json): bloki z dozwolonej listy, dane tylko z poleceń rejestru poziomu A3, przyciski wywołujące polecenia. Bez dowolnego HTML/JS. | **spec**: object; prompt: string | A2 | usuń widget | W4 | [05-widgety.md](05-widgety.md) | „zrób widget z top 5 tokenów i zmianą 24h”, „zrób kartę z checklistą na dziś”, „mini wykres BTC na pulpicie” |
| `widget_edit` | Zmień widget zdaniem — Zmienia opis istniejącego widgetu (dodaj blok, zmień wykres, odświeżanie, tytuł). Łatka JSON Merge Patch albo instrukcja do Hermesa. | **widget**: string; patch: object; instruction: string | A2 | poprzedni opis | W4 | [05-widgety.md](05-widgety.md) | „zmień ten widget na wykres”, „dodaj kolumnę 7 dni”, „odświeżaj co minutę” |
| `widget_refresh` | Odśwież widget — Pobiera dane widgetu od nowa (wszystkich albo jednego). | widget: string | A3 | — | W4 | [05-widgety.md](05-widgety.md) | „odśwież widgety”, „odśwież widget krypto”, „zaktualizuj ten widget” |
| `widget_duplicate` | Duplikuj widget — Tworzy kopię widgetu obok oryginału. | **widget**: string | A2 | usuń kopię | W3 | [05-widgety.md](05-widgety.md) | „zduplikuj ten widget”, „zrób kopię listy zakupów”, „skopiuj widget krypto” |
| `widget_collapse` | Zwiń / rozwiń widget — Zwija widget do paska tytułu albo rozwija. | **widget**: string; on: boolean | A3 | odwrotny stan | W3 | [05-widgety.md](05-widgety.md) | „zwiń widget krypto”, „rozwiń listę”, „zwiń wszystkie widgety” |
| `widget_items` | Pozycje listy w widgecie — Dodaje, odhacza, zmienia lub usuwa pozycję w widgecie-liście. | **widget**: string; **op**: add\|check\|uncheck\|rename\|remove\|clear_done; item: string; to: string | A2 | poprzednia lista | W3 | [05-widgety.md](05-widgety.md) | „dodaj masło do listy zakupów”, „odhacz mleko na liście”, „usuń zrobione z listy” |
| `shortcut_edit` | Edytuj skrót — Zmienia nazwę, adres, aplikację albo ikonę skrótu. | **shortcut**: string; name: string; url: string; app: chat\|notes\|market\|schedule\|monitor\|terminal\|weather\|calc\|timer\|settings\|library\|files; icon: string | A2 | poprzednie wartości | W3 | [08-aplikacje.md](08-aplikacje.md) | „zmień nazwę skrótu github na kod”, „skrót poczta niech otwiera gmail.com”, „zmień ikonę skrótu” |
| `dock_order` | Kolejność w doku — Ustawia kolejność aplikacji i skrótów w doku (przesuń element na pozycję). | **item**: string; **position**: number | A2 | poprzednia kolejność | W3 | [08-aplikacje.md](08-aplikacje.md) | „przesuń notatnik na początek doku”, „terminal jako ostatni w doku”, „daj pogodę na drugie miejsce” |

## Notatki

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `notes_tag` | Tagi notatki — Dodaje lub usuwa tagi notatki (małe litery, bez spacji, maks. 10). | **note**: string; add: string[]; remove: string[] | A2 | poprzednie tagi | W3 | [06-notatki.md](06-notatki.md) | „oznacz notatkę zakupy tagiem dom”, „dodaj tag praca do tej notatki”, „usuń tag pilne z notatki plan” |
| `notes_pin` | Przypnij notatkę — Przypina notatkę na górze listy (albo odpina). | **note**: string; on: boolean | A2 | odwrotny stan | W3 | [06-notatki.md](06-notatki.md) | „przypnij notatkę zakupy”, „odepnij tę notatkę”, „przypnij plan dnia na górze” |
| `notes_duplicate` | Duplikuj notatkę — Tworzy kopię notatki z dopiskiem „(kopia)”. | **note**: string | A2 | usuń kopię | W3 | [06-notatki.md](06-notatki.md) | „zduplikuj notatkę zakupy”, „zrób kopię tej notatki”, „skopiuj notatkę plan” |
| `notes_trash` | Kosz notatek — Lista notatek w koszu (usunięte w ciągu 30 dni). | — | A3 | — | W3 | [06-notatki.md](06-notatki.md) | „co jest w koszu”, „pokaż usunięte notatki”, „kosz notatek” |
| `notes_restore` | Przywróć notatkę z kosza — Przywraca notatkę z kosza. | **note**: string | A2 | z powrotem do kosza | W3 | [06-notatki.md](06-notatki.md) | „przywróć notatkę zakupy”, „odzyskaj usuniętą notatkę plan”, „wyciągnij z kosza notatkę pomysły” |
| `notes_empty_trash` | Opróżnij kosz — Trwale usuwa notatki z kosza (nieodwracalne). | — | A0 | — | W3 | [06-notatki.md](06-notatki.md) | „opróżnij kosz”, „usuń na zawsze notatki z kosza”, „wyczyść kosz” |
| `notes_versions` | Wersje notatki — Lista zapisanych wersji notatki (maks. 20, co najmniej 5 min odstępu albo przed zmianą przez Jarvisa). | **note**: string | A3 | — | W3 | [06-notatki.md](06-notatki.md) | „pokaż wersje notatki plan”, „historia zmian tej notatki”, „jak wyglądała ta notatka wcześniej” |
| `notes_revert` | Przywróć wersję notatki — Przywraca wskazaną wersję (bieżąca staje się nową wersją, więc można wrócić). | **note**: string; **version**: string | A2 | wersja sprzed przywrócenia | W3 | [06-notatki.md](06-notatki.md) | „przywróć poprzednią wersję notatki”, „cofnij notatkę plan do wczoraj”, „wróć do wersji sprzed zmiany Jarvisa” |
| `notes_to_task` | Zadanie z notatki — Tworzy zadanie z notatki albo z jej linii (link zwrotny w zadaniu). | **note**: string; line: string; time: string; date: string (date) | A2 | usuń zadanie | W3 | [06-notatki.md](06-notatki.md) | „zrób zadanie z notatki zakupy na jutro”, „z tej linijki zrób zadanie”, „przypomnij mi o notatce plan o 17” |
| `notes_folder` | Folder notatki — Przenosi notatkę do folderu (jeden poziom; folder powstaje sam). | **note**: string; **folder**: string | A2 | poprzedni folder | W3 | [06-notatki.md](06-notatki.md) | „przenieś notatkę zakupy do folderu dom”, „włóż tę notatkę do pracy”, „wyjmij notatkę z folderu” |

## Zadania i czas

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `add_task` (rozszerzenie) | Dodaj zadanie (rozszerzenie: priorytet, powtarzanie, przypomnienie przed) — Rozszerzenie: priority, repeat (jak tasks_repeat), remind = minuty przed terminem. | **text**: string; time: string (time); date: string (date); priority: high\|normal\|low; repeat: object; remind: number | A2 | usuń zadanie | W3 | [07-zadania.md](07-zadania.md) | „pilne: zadzwonić do banku o 10”, „przypomnij mi 15 minut przed spotkaniem o 14”, „codziennie o 7 witaminy” |
| `tasks_update` (rozszerzenie) | Zmień zadanie (rozszerzenie: przypomnienie, seria) — Rozszerzenie: remind (minuty przed), scope = this \| series dla zadań powtarzanych. | **task**: string; text: string; time: string (time); date: string (date); snooze_minutes: number; remind: number; scope: this\|series | A2 | poprzednie wartości | W3 | [07-zadania.md](07-zadania.md) | „przypominaj o treningu pół godziny wcześniej”, „przesuń całą serię treningów na 19”, „tylko dzisiejszy trening przełóż na jutro” |
| `tasks_repeat` | Powtarzanie zadania — Ustawia powtarzanie: daily, weekdays, weekly (dni), monthly, co N dni; until = data końca; none = wyłącz. | **task**: string; **rule**: none\|daily\|weekdays\|weekly\|monthly\|every_n_days; days: string[]; n: number; until: string (date) | A2 | poprzednia reguła | W3 | [07-zadania.md](07-zadania.md) | „trening powtarzaj w poniedziałki i czwartki”, „podlewanie kwiatów co 3 dni”, „raport co miesiąc” |
| `tasks_priority` | Priorytet zadania — Ustawia priorytet: high, normal, low. | **task**: string; **priority**: high\|normal\|low | A2 | poprzedni priorytet | W3 | [07-zadania.md](07-zadania.md) | „dentysta jest pilny”, „ustaw wysoki priorytet dla raportu”, „trening może poczekać” |
| `tasks_subtask` | Podzadania — Dodaje, odhacza lub usuwa podzadanie (jeden poziom). | **task**: string; **op**: add\|check\|uncheck\|remove; **text**: string | A2 | poprzednie podzadania | W3 | [07-zadania.md](07-zadania.md) | „do przeprowadzki dodaj podzadanie pakowanie”, „odhacz pakowanie w przeprowadzce”, „usuń podzadanie kartony” |
| `tasks_move_many` | Przenieś wiele zadań — Przenosi zadania pasujące do filtra (dzień, niezrobione, zaległe) na inny dzień. Jedno „Cofnij” cofa całość. | **from**: string; **to**: string (date); only_open: boolean | A1 | poprzednie daty wszystkich | W3 | [07-zadania.md](07-zadania.md) | „przenieś wszystkie dzisiejsze na jutro”, „przesuń zaległe na dziś”, „przełóż niezrobione na poniedziałek” |
| `tasks_clear_done` | Usuń zrobione — Usuwa zrobione zadania z zakresu (dzień, tydzień, wszystkie). Zbiorowe usuwanie ⇒ zgoda. | **range**: today\|week\|all | A0 | przywróć usunięte (10 min) | W3 | [07-zadania.md](07-zadania.md) | „usuń zrobione zadania”, „wyczyść zrobione z tego tygodnia”, „posprzątaj ukończone” |
| `tasks_export_ics` | Eksport do kalendarza — Zapisuje zadania z zakresu jako plik .ics (pobranie przez przeglądarkę). | **range**: today\|week\|month\|all | A1 | — | W3 | [07-zadania.md](07-zadania.md) | „wyeksportuj zadania do kalendarza”, „zapisz tydzień jako ics”, „eksport zadań na miesiąc” |
| `timer_list` | Lista minutników — Wszystkie działające minutniki (po zmianie: kilka naraz) z czasem do końca. | — | A3 | — | W3 | [08-aplikacje.md](08-aplikacje.md) | „ile zostało na minutnikach”, „jakie minutniki działają”, „lista minutników” |
| `start_timer` (rozszerzenie) | Minutnik (rozszerzenie: kilka naraz, pomodoro) — Rozszerzenie: label rozróżnia minutniki (maks. 5), preset pomodoro (25/5 ×4), repeat. | seconds: number; label: string; preset: pomodoro\|short_break\|long_break | A2 | zatrzymaj ten minutnik | W3 | [08-aplikacje.md](08-aplikacje.md) | „drugi minutnik 10 minut na herbatę”, „pomodoro”, „minutnik 3 minuty jajka” |

## Dane

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `market_watchlist` | Lista obserwowanych — Dodaje/usuwa kryptowalutę z listy w Monitorze rynku (tylko podgląd — żadnego handlu). | **op**: add\|remove\|list; symbol: string | A2 | odwrotna operacja | W3 | [08-aplikacje.md](08-aplikacje.md) | „dodaj dogecoina do obserwowanych”, „usuń solanę z rynku”, „jakie kryptowaluty obserwuję” |
| `market_alerts` | Alerty kursów — Lista i usuwanie alertów market_watch. | **op**: list\|remove\|clear; alert: string | A2 | przywróć alert | W3 | [08-aplikacje.md](08-aplikacje.md) | „jakie mam alerty”, „usuń alert na bitcoina”, „wyczyść alerty kursów” |

## Czat

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `chat_search` | Szukaj w rozmowach — Szuka w historii czatu (IndexedDB); wynik przewija czat do wiadomości. | **query**: string | A3 | — | W2 | [08-aplikacje.md](08-aplikacje.md) | „o czym rozmawialiśmy wczoraj o banku”, „znajdź w czacie przepis”, „szukaj w rozmowach hasło wifi” |
| `chat_export` | Eksport rozmowy — Zapisuje rozmowę jako .md (pobranie). | range: session\|all | A1 | — | W2 | [08-aplikacje.md](08-aplikacje.md) | „zapisz tę rozmowę do pliku”, „eksportuj czat”, „pobierz historię rozmowy” |
| `chat_clear` | Wyczyść rozmowę — Usuwa historię czatu (i streszczenie). Nieodwracalne. | — | A0 | — | W2 | [08-aplikacje.md](08-aplikacje.md) | „wyczyść czat”, „usuń historię rozmowy”, „zacznijmy od czystej karty” |
| `chat_thread` | Wątki rozmów — Nowy wątek, przełączenie, lista, zmiana nazwy (każdy wątek ma własną historię i streszczenie). | **op**: new\|switch\|list\|rename; name: string | A2 | poprzedni wątek | W2 | [08-aplikacje.md](08-aplikacje.md) | „nowy wątek o wakacjach”, „przełącz na wątek praca”, „jakie mam wątki” |

## Pamięć

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `memory_edit` | Popraw zapamiętany fakt — Zmienia treść faktu w pamięci. | **fact**: string; **text**: string | A2 | poprzednia treść | W3 | [08-aplikacje.md](08-aplikacje.md) | „popraw w pamięci: pracuję hybrydowo, nie zdalnie”, „zmień fakt o kawie na herbatę”, „zaktualizuj to co wiesz o moim psie” |

## Pliki

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `files_open` | Pokaż plik — Otwiera podgląd pliku (tekst, Markdown, JSON, obraz) w oknie Pliki. | **path**: string | A3 | — | W3 | [08-aplikacje.md](08-aplikacje.md) | „pokaż plik raport.md”, „otwórz plik notatki.txt”, „podgląd pliku dane.json” |

## Interfejs

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `ui_scale` | Skala interfejsu — Powiększa albo zmniejsza cały interfejs (80–130%). | percent: number; step: up\|down\|reset | A2 | poprzednia skala | W2 | [09-wyglad-stany.md](09-wyglad-stany.md) | „powiększ interfejs”, „zmniejsz wszystko”, „skala 110 procent” |
| `fx_level` | Poziom efektów — Efekty: tool (oszczędnie), standard, cinema (pełne); off = bez animacji. | **level**: off\|tool\|standard\|cinema | A2 | poprzedni poziom | W5 | [09-wyglad-stany.md](09-wyglad-stany.md) | „wyłącz animacje”, „tryb kinowy”, „mniej efektów” |
| `chart_show` | Pokaż wykres — Skrót do widget_build: wykres z danych polecenia A3 (kursy, zadania w tygodniu, aktywność, koszt, pewność Jeva). | **source**: crypto\|tasks_week\|activity\|cost\|jev_confidence\|weather_hours; symbol: string; range: 1h\|24h\|7d\|30d; kind: line\|bar\|area\|spark | A2 | usuń widget | W4 | [09-wyglad-stany.md](09-wyglad-stany.md) | „pokaż wykres bitcoina z tygodnia”, „wykres zadań w tym tygodniu”, „pokaż na wykresie temperaturę na dziś” |
| `keys_set` | Zmień skrót klawiszowy — Przypisuje skrót do akcji z mapy skrótów (sprawdza konflikty z przeglądarką i innymi skrótami). | **action**: string; **keys**: string | A2 | poprzedni skrót | W2 | [10-ustawienia.md](10-ustawienia.md) | „paleta pod Alt+P”, „zmień skrót czatu na Alt+C”, „przywróć domyślne skróty” |
| `settings_reset` | Przywróć ustawienia sekcji — Przywraca domyślne wartości jednej sekcji (klucze zostają). | **section**: wyglad\|glos\|agent\|jev\|hermes\|skroty\|powiadomienia | A0 | poprzednie wartości (10 min) | W2 | [10-ustawienia.md](10-ustawienia.md) | „przywróć domyślny wygląd”, „zresetuj ustawienia głosu”, „domyślne ustawienia Jeva” |
| `notif_channel` | Kanał powiadomień — Włącza/wyłącza rodzaj powiadomień (zadania, minutnik, rynek, sieć, agent) albo zmienia dźwięk/limit na godzinę. | **kind**: task\|timer\|market\|network\|agent\|files\|hermes; on: boolean; sound: boolean; per_hour: number | A2 | poprzednie ustawienie | W2 | [10-ustawienia.md](10-ustawienia.md) | „wyłącz powiadomienia z rynku”, „bez dźwięku przy zadaniach”, „maksymalnie 3 powiadomienia na godzinę” |

## Agent

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `routine_create` | Utwórz rutynę — Rutyna = nazwa + wyzwalacz (godzina, dni, zdarzenie, na żądanie) + kroki (polecenia rejestru albo zdanie do Hermesa). Kroki A0 zawsze pytają w chwili wykonania. | **name**: string; trigger: object; **steps**: object[] | A1 | usuń rutynę | W4 | [11-agent.md](11-agent.md) | „zrób rutynę poranek: pogoda, zadania na dziś i układ praca”, „codziennie o 18 pokaż podsumowanie dnia”, „kiedy mówię start pracy, otwórz notatnik i włącz skupienie” |
| `routine_run` | Uruchom rutynę — Uruchamia rutynę teraz (kroki z paskiem postępu; pauza/pominięcie/stop). | **name**: string | A1 | cofnij kroki odwracalne | W4 | [11-agent.md](11-agent.md) | „uruchom rutynę poranek”, „start pracy”, „zrób mój wieczór” |
| `routine_list` | Lista rutyn — Rutyny z wyzwalaczami i ostatnim uruchomieniem. | — | A3 | — | W4 | [11-agent.md](11-agent.md) | „jakie mam rutyny”, „lista rutyn”, „pokaż automatyzacje” |
| `routine_remove` | Usuń rutynę — Usuwa rutynę. | **name**: string | A0 | przywróć rutynę (10 min) | W4 | [11-agent.md](11-agent.md) | „usuń rutynę poranek”, „skasuj automatyzację wieczór”, „nie potrzebuję już rutyny start pracy” |
| `undo` | Cofnij — Cofa ostatnią akcję (albo N ostatnich; albo wszystko z ostatnich M minut). Dziś „cofnij” działa jako zdanie specjalne — to formalizuje je w rejestrze. | count: number; minutes: number | A3 | — | W1 | [11-agent.md](11-agent.md) | „cofnij”, „cofnij dwie ostatnie rzeczy”, „cofnij wszystko z ostatnich 5 minut” |
| `undo_list` | Historia do cofnięcia — Pokazuje stos akcji, które da się cofnąć (z czasem i opisem). | — | A3 | — | W1 | [11-agent.md](11-agent.md) | „co mogę cofnąć”, „historia zmian”, „co ostatnio zrobiłeś” |
| `plan_control` | Sterowanie planem — Pauza, wznowienie, pominięcie kroku albo zatrzymanie trwającego zadania wieloetapowego. | **op**: pause\|resume\|skip\|stop | A3 | — | W4 | [11-agent.md](11-agent.md) | „wstrzymaj”, „pomiń ten krok”, „dokończ” |

