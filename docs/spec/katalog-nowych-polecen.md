# Katalog planowanych poleceń (wygenerowany z docs/spec/nowe-polecenia.js)

> Generuje `node tools/gen-spec.js`. Źródło: `docs/spec/nowe-polecenia.js`. Szczegóły w dokumencie z kolumny „opis w”. „rozszerzenie” = polecenie już istnieje, zmieniają się argumenty.

Planowanych: **38** (nowych 35, rozszerzeń 3). Po wdrożeniu rejestr będzie miał ok. 122 poleceń.

| fala | liczba |
|---|---|
| W1 | 0 |
| W2 | 0 |
| W3 | 28 |
| W4 | 9 |
| W5 | 1 |

## Pulpit i widgety

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `widget_build` | Zbuduj widget z opisu — Tworzy widget z opisu (spec JSON wg docs/spec/widget.schema.json): bloki z dozwolonej listy, dane tylko z poleceń rejestru poziomu A3, przyciski wywołujące polecenia. Bez dowolnego HTML/JS. | **spec**: object; prompt: string | A2 | usuń widget | W4 | [05-widgety.md](05-widgety.md) | „zrób widget z top 5 tokenów i zmianą 24h”, „zrób kartę z checklistą na dziś”, „mini wykres BTC na pulpicie” |
| `widget_edit` | Zmień widget zdaniem — Zmienia opis istniejącego widgetu (dodaj blok, zmień wykres, odświeżanie, tytuł). Łatka JSON Merge Patch albo instrukcja do Hermesa. | **widget**: string; patch: object; instruction: string | A2 | poprzedni opis | W4 | [05-widgety.md](05-widgety.md) | „zmień ten widget na wykres”, „dodaj kolumnę 7 dni”, „odświeżaj co minutę” |
| `widget_refresh` | Odśwież widget — Pobiera dane widgetu od nowa (wszystkich albo jednego). | widget: string | A3 | — | W4 | [05-widgety.md](05-widgety.md) | „odśwież widgety”, „odśwież widget krypto”, „zaktualizuj ten widget” |
| `widget_duplicate` | Duplikuj widget — Tworzy kopię widgetu obok oryginału. | **widget**: string | A2 | usuń kopię | W3 | [05-widgety.md](05-widgety.md) | „zduplikuj ten widget”, „zrób kopię listy zakupów”, „skopiuj widget krypto” |
| `widget_collapse` | Zwiń / rozwiń widget — Zwija widget do paska tytułu albo rozwija. | **widget**: string; on: boolean | A3 | odwrotny stan | W3 | [05-widgety.md](05-widgety.md) | „zwiń widget krypto”, „rozwiń listę”, „zwiń wszystkie widgety” |
| `widget_items` | Pozycje listy w widgecie — Dodaje, odhacza, zmienia lub usuwa pozycję w widgecie-liście. | **widget**: string; **op**: add\|check\|uncheck\|rename\|remove\|clear_done; item: string; to: string | A2 | poprzednia lista | W3 | [05-widgety.md](05-widgety.md) | „dodaj masło do listy zakupów”, „odhacz mleko na liście”, „usuń zrobione z listy” |
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
| `fx_level` | Poziom efektów — Efekty: tool (oszczędnie), standard, cinema (pełne); off = bez animacji. | **level**: off\|tool\|standard\|cinema | A2 | poprzedni poziom | W5 | [09-wyglad-stany.md](09-wyglad-stany.md) | „wyłącz animacje”, „tryb kinowy”, „mniej efektów” |
| `chart_show` | Pokaż wykres — Skrót do widget_build: wykres z danych polecenia A3 (kursy, zadania w tygodniu, aktywność, koszt, pewność Jeva). | **source**: crypto\|tasks_week\|activity\|cost\|jev_confidence\|weather_hours; symbol: string; range: 1h\|24h\|7d\|30d; kind: line\|bar\|area\|spark | A2 | usuń widget | W4 | [09-wyglad-stany.md](09-wyglad-stany.md) | „pokaż wykres bitcoina z tygodnia”, „wykres zadań w tym tygodniu”, „pokaż na wykresie temperaturę na dziś” |

## Agent

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `routine_create` | Utwórz rutynę — Rutyna = nazwa + wyzwalacz (godzina, dni, zdarzenie, na żądanie) + kroki (polecenia rejestru albo zdanie do Hermesa). Kroki A0 zawsze pytają w chwili wykonania. | **name**: string; trigger: object; **steps**: object[] | A1 | usuń rutynę | W4 | [11-agent.md](11-agent.md) | „zrób rutynę poranek: pogoda, zadania na dziś i układ praca”, „codziennie o 18 pokaż podsumowanie dnia”, „kiedy mówię start pracy, otwórz notatnik i włącz skupienie” |
| `routine_run` | Uruchom rutynę — Uruchamia rutynę teraz (kroki z paskiem postępu; pauza/pominięcie/stop). | **name**: string | A1 | cofnij kroki odwracalne | W4 | [11-agent.md](11-agent.md) | „uruchom rutynę poranek”, „start pracy”, „zrób mój wieczór” |
| `routine_list` | Lista rutyn — Rutyny z wyzwalaczami i ostatnim uruchomieniem. | — | A3 | — | W4 | [11-agent.md](11-agent.md) | „jakie mam rutyny”, „lista rutyn”, „pokaż automatyzacje” |
| `routine_remove` | Usuń rutynę — Usuwa rutynę. | **name**: string | A0 | przywróć rutynę (10 min) | W4 | [11-agent.md](11-agent.md) | „usuń rutynę poranek”, „skasuj automatyzację wieczór”, „nie potrzebuję już rutyny start pracy” |
| `plan_control` | Sterowanie planem — Pauza, wznowienie, pominięcie kroku albo zatrzymanie trwającego zadania wieloetapowego. | **op**: pause\|resume\|skip\|stop | A3 | — | W4 | [11-agent.md](11-agent.md) | „wstrzymaj”, „pomiń ten krok”, „dokończ” |

