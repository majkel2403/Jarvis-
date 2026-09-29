# Katalog planowanych poleceń (wygenerowany z docs/spec/nowe-polecenia.js)

> Generuje `node tools/gen-spec.js`. Źródło: `docs/spec/nowe-polecenia.js`. Szczegóły w dokumencie z kolumny „opis w”. „rozszerzenie” = polecenie już istnieje, zmieniają się argumenty.

Planowanych: **10** (nowych 10, rozszerzeń 0). Po wdrożeniu rejestr będzie miał ok. 122 poleceń.

| fala | liczba |
|---|---|
| W1 | 0 |
| W2 | 0 |
| W3 | 0 |
| W4 | 9 |
| W5 | 1 |

## Pulpit i widgety

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `widget_build` | Zbuduj widget z opisu — Tworzy widget z opisu (spec JSON wg docs/spec/widget.schema.json): bloki z dozwolonej listy, dane tylko z poleceń rejestru poziomu A3, przyciski wywołujące polecenia. Bez dowolnego HTML/JS. | **spec**: object; prompt: string | A2 | usuń widget | W4 | [05-widgety.md](05-widgety.md) | „zrób widget z top 5 tokenów i zmianą 24h”, „zrób kartę z checklistą na dziś”, „mini wykres BTC na pulpicie” |
| `widget_edit` | Zmień widget zdaniem — Zmienia opis istniejącego widgetu (dodaj blok, zmień wykres, odświeżanie, tytuł). Łatka JSON Merge Patch albo instrukcja do Hermesa. | **widget**: string; patch: object; instruction: string | A2 | poprzedni opis | W4 | [05-widgety.md](05-widgety.md) | „zmień ten widget na wykres”, „dodaj kolumnę 7 dni”, „odświeżaj co minutę” |
| `widget_refresh` | Odśwież widget — Pobiera dane widgetu od nowa (wszystkich albo jednego). | widget: string | A3 | — | W4 | [05-widgety.md](05-widgety.md) | „odśwież widgety”, „odśwież widget krypto”, „zaktualizuj ten widget” |

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

