# Katalog poleceń (wygenerowany z kodu)

> Plik generuje `node tools/gen-spec.js` z `js/commands.js` i `js/jev-policy.js`. **Nie edytuj ręcznie** — test `tests/unit/spec.test.js` sprawdza, czy jest aktualny.

Poleceń: **63** · odwracalnych: 18 · wymagających zgody (ryzyko ≠ safe): 11 · treść z zewnątrz (sprawdzana pod kątem wstrzyknięć): 4

Poziomy autonomii (plan Jeva): A3 sam, po cichu · A2 sam + Cofnij · A1 pyta „Chodzi o…?” · A0 zawsze zgoda. Pogrubione argumenty są wymagane.

| poziom | liczba |
|---|---|
| A3 sam, po cichu | 34 |
| A2 sam + Cofnij | 15 |
| A1 pyta „Chodzi o…?” | 4 |
| A0 zawsze zgoda | 10 |

## Aplikacje i okna

| id | co robi | argumenty | ryzyko | poziom | cofanie | przykłady PL |
|---|---|---|---|---|---|---|
| `open_app` | Otwórz aplikację — Otwiera aplikację Jarvis OS: chat=Czat, notes=Notatnik, market=Monitor rynku, schedule=Harmonogram, monitor=Monitor systemu, terminal=Terminal, weather=Pogoda,  | **app**: chat\|notes\|market\|schedule\|monitor\|terminal\|weather\|calc\|timer\|settings\|library | safe | A3 | — | „otworz {app}”, „uruchom {app}”, „pokaz {app}” |
| `close_app` | Zamknij okno — Zamyka okno aplikacji. app="all" zamyka wszystkie okna (wymaga potwierdzenia). | **app**: chat\|notes\|market\|schedule\|monitor\|terminal\|weather\|calc\|timer\|settings\|library\|all\|… | confirm | A0 | — | „zamknij {app}”, „wylacz {app}”, „zamknij (wszystko\|wszystkie okna\|okna)” |
| `wm_list` | Lista okien — Zwraca otwarte okna z pozycją, rozmiarem, stanem i tym, które jest aktywne. | — | safe | A3 | — | „jakie okna sa otwarte”, „lista okien”, „co jest otwarte” |
| `wm_focus` | Aktywuj okno — Przenosi okno na wierzch (przywraca, jeśli zminimalizowane). app="next" = następne okno. | **app**: chat\|notes\|market\|schedule\|monitor\|terminal\|weather\|calc\|timer\|settings\|library\|next | safe | A3 | — | „przelacz na {app}”, „aktywuj {app}”, „nastepne okno” |
| `wm_minimize` | Minimalizuj — Minimalizuje okno do doku. app="all" pokazuje pulpit. | **app**: chat\|notes\|market\|schedule\|monitor\|terminal\|weather\|calc\|timer\|settings\|library\|all\|… | safe | A3 | — | „zminimalizuj {app}”, „schowaj {app}”, „pokaz pulpit” |
| `wm_arrange` | Ułóż okna — Układa okna: tile (kafelki z otwartych okien), left/right/top/bottom (przyciąga aktywne okno do krawędzi), max (maksymalizuje), center; layout=nazwa zapisanego  | **mode**: tile\|left\|right\|top\|bottom\|max\|center\|layout; layout: string; app: chat\|notes\|market\|schedule\|monitor\|terminal\|weather\|calc\|timer\|settings\|library | safe | A3 | — | „uloz okna”, „rozmiesc okna”, „kafelkuj okna” |
| `wm_move` | Przesuń / zmień rozmiar okna — Ustawia pozycję (x,y) i/lub rozmiar (w,h) okna w pikselach względem pulpitu. | **app**: chat\|notes\|market\|schedule\|monitor\|terminal\|weather\|calc\|timer\|settings\|library; x: number; y: number; w: number; h: number | safe | A2 | tak | — |
| `nav_back` | Wróć do poprzedniego okna — Wraca do poprzednio aktywnego okna (historia nawigacji); otwiera je, jeśli zostało zamknięte. | — | safe | A3 | — | „wroc”, „cofnij okno”, „wroc do poprzedniego okna” |
| `layout_save` | Zapisz układ okien — Zapisuje bieżący układ otwartych okien pod nazwą (do wm_arrange mode=layout). | **name**: string | safe | A2 | tak | „zapisz uklad [jako] {name}”, „zapamietaj uklad [jako] {name}” |

## Zadania i czas

| id | co robi | argumenty | ryzyko | poziom | cofanie | przykłady PL |
|---|---|---|---|---|---|---|
| `schedule_day` | Pokaż dzień w harmonogramie — Otwiera Harmonogram na wskazanym dniu (data YYYY-MM-DD, jutro, piątek…) — nawigacja, niczego nie zmienia. | **date**: string (date) | safe | A3 | — | — |
| `tasks_list` | Lista zadań — Zwraca zadania: range=today (domyślnie), tomorrow, week, all, overdue. | range: today\|tomorrow\|week\|all\|overdue | safe | A3 | — | „[pokaz] (zadania\|plan\|harmonogram) na (dzis\|dzisiaj)”, „co mam (dzis\|dzisiaj) do zrobienia”, „jakie mam zadania” |
| `add_task` | Dodaj zadanie / przypomnienie — Dodaje zadanie do Harmonogramu; o podanej godzinie Jarvis przypomni głosem. Obsługuje czas względny przez pole "in" (np. "20 minut"). | **text**: string; time: string (time); date: string (date); in: string; show: boolean | safe | A2 | tak | „przypomnij [mi] {text}”, „dodaj zadanie {text}”, „zaplanuj {text}” |
| `tasks_complete` | Odhacz zadanie — Oznacza zadanie jako wykonane (done=false cofa). | **task**: string; done: boolean | safe | A2 | tak | „odhacz {task}”, „zrobione {task}”, „oznacz {task} jako (zrobione\|wykonane\|ukonczone)” |
| `tasks_update` | Zmień zadanie — Zmienia treść, godzinę lub datę zadania. Do przesunięcia o czas użyj snooze_minutes. | **task**: string; text: string; time: string (time); date: string (date); snooze_minutes: integer | safe | A2 | tak | „przesun {task} na {time}”, „przeloz {task} na {date}”, „odloz {task} o {snooze_minutes} minut” |
| `tasks_remove` | Usuń zadanie — Usuwa zadanie z Harmonogramu (wymaga potwierdzenia). | **task**: string | confirm | A0 | — | „usun zadanie {task}”, „skasuj zadanie {task}”, „usun przypomnienie {task}” |
| `start_timer` | Minutnik — Uruchamia minutnik na podaną liczbę sekund. | **seconds**: number; label: string; show: boolean | safe | A2 | tak | „minutnik {seconds}”, „ustaw minutnik na {seconds}”, „odliczaj {seconds}” |
| `timer_control` | Sterowanie minutnikiem — stop zatrzymuje minutnik, extend dodaje sekundy, status zwraca pozostały czas. | **action**: stop\|extend\|status; seconds: number | safe | A2 | tak | „(zatrzymaj\|wylacz\|stop) minutnik”, „ile zostalo [minutnika\|czasu]”, „przedluz minutnik o {seconds}” |
| `get_datetime` | Data i godzina — Zwraca aktualną datę, godzinę, dzień tygodnia i strefę czasową. | — | safe | A3 | — | „ktora [jest] godzina”, „jaki [jest] (dzis\|dzisiaj) dzien”, „jaka [jest] [dzis] data” |

## Interfejs

| id | co robi | argumenty | ryzyko | poziom | cofanie | przykłady PL |
|---|---|---|---|---|---|---|
| `settings_open` | Otwórz sekcję ustawień — Otwiera Ustawienia przewinięte do sekcji: openrouter, akcent, tapeta, interfejs, glos, uzytkownik, hermes, agent, jev, pamiec, pliki, dane (nawigacja, niczego n | **section**: openrouter\|akcent\|tapeta\|interfejs\|glos\|uzytkownik\|hermes\|agent\|jev\|pamiec\|pliki\|dane | safe | A3 | — | „otworz ustawienia {section}”, „pokaz ustawienia {section}”, „przejdz do ustawien {section}” |
| `get_status` | Raport stanu — Pełny stan środowiska: okna, widgety, notatki, zadania, minutnik, skróty, połączenie, tryb agenta. | — | safe | A3 | — | „status”, „raport”, „stan systemu” |
| `ui_highlight` | Wskaż element — Podświetla element interfejsu, żeby pokazać go użytkownikowi: aplikację (np. notes), dock, rail, deck, chat, log, core, widget (w:id) lub skrót (sc:id). | **target**: string; text: string | safe | A3 | — | — |
| `ui_narrate` | Komunikat na Core — Krótki komunikat statusu na Core (np. "szukam w sieci…") bez wpisu w czacie; speak=true wypowiada go. | **text**: string; speak: boolean | safe | A3 | — | — |
| `ui_toast` | Powiadomienie — Pokazuje powiadomienie w interfejsie i zapisuje je w centrum powiadomień. | **title**: string; body: string | safe | A3 | — | — |
| `ui_ask` | Zapytaj użytkownika — Zadaje użytkownikowi pytanie z opcjami (szybkie odpowiedzi w czacie i głosem) i zwraca wybraną odpowiedź. Używaj przy dwuznaczności zamiast zgadywać. | **question**: string; options: string[] | safe | A3 | — | — |
| `speak` | Powiedz na głos — Wypowiada tekst syntezatorem mowy. | **text**: string | safe | A3 | — | „powiedz {text}”, „przeczytaj {text}”, „wypowiedz {text}” |
| `sound_toggle` | Dźwięki — Włącza/wyłącza dźwięki interfejsu i/lub mowę Jarvisa. | sound: boolean; speech: boolean | safe | A3 | tak | „(wylacz\|wycisz) dzwieki”, „wlacz dzwieki”, „(nie mow\|badz cicho\|wylacz mowe\|przestan mowic)” |
| `settings_get` | Ustawienia — Zwraca bieżące ustawienia (bez kluczy API). | — | safe | A3 | — | „jakie mam ustawienia”, „pokaz ustawienia” |
| `settings_set` | Zmień ustawienie — Zmienia jedno ustawienie. Klucze: city, user, particles, sound, speech, skipBoot, proactive (quiet\|active), wakeWord, quietFrom/quietTo (HH:MM), briefingTime (H | **key**: city\|user\|particles\|sound\|speech\|skipBoot\|proactive\|wakeWord\|quietFrom\|quietTo\|briefingTime\|summaryTime\|…; **value**: string | confirm | A1 (zależy od arg.) | — | „ustaw miasto [na] {value}”, „zmien miasto na {value}”, „wlacz slowo wybudzajace” |
| `terminal_run` | Polecenie terminala — Wykonuje wbudowane polecenie Terminala Jarvis OS i zwraca tekstowy wynik. Bez pytania działają tylko polecenia niezmieniające danych (help, ls, apps, calc, weat | **command**: string | confirm | A0 (zależy od arg.) | — | „wykonaj w terminalu {command}”, „terminal {command}” |
| `palette_open` | Paleta poleceń — Otwiera paletę poleceń, opcjonalnie z wpisanym zapytaniem. | query: string | safe | A3 | — | „[otworz] palete [polecen]”, „szukaj polecen” |
| `notifications_open` | Centrum powiadomień — Pokazuje centrum powiadomień (przypomnienia, sygnały, komunikaty). | — | safe | A3 | — | „[pokaz] powiadomienia”, „co mnie ominelo”, „centrum powiadomien” |
| `help` | Co potrafisz — Lista możliwości Jarvisa pogrupowana według dziedzin. | — | safe | A3 | — | „pomoc”, „help”, „co potrafisz” |

## Notatki

| id | co robi | argumenty | ryzyko | poziom | cofanie | przykłady PL |
|---|---|---|---|---|---|---|
| `notes_list` | Lista notatek — Zwraca listę notatek (id, tytuł, data, liczba słów). Użyj przed edycją, jeśli nie znasz id. | limit: integer | safe | A3 | — | „[pokaz] (liste notatek\|moje notatki\|jakie mam notatki)”, „ile mam notatek”, „lista notatek” |
| `notes_read` | Przeczytaj notatkę — Zwraca pełną treść notatki (po id lub fragmencie tytułu). show=true otwiera ją w Notatniku. | **note**: string; show: boolean | safe · zewn. | A3 | — | „przeczytaj notatke {note}”, „odczytaj notatke {note}”, „pokaz notatke {note}” |
| `notes_search` | Szukaj w notatkach — Przeszukuje tytuły i treść notatek; zwraca dopasowania z fragmentem. | **query**: string | safe · zewn. | A3 | — | „szukaj w notatkach {query}”, „znajdz w notatkach {query}”, „wyszukaj notatke {query}” |
| `create_note` | Nowa notatka — Tworzy notatkę. show=false nie otwiera Notatnika. | title: string; **content**: string; show: boolean | safe | A2 | tak | „zanotuj {content}”, „zapisz notatke {content}”, „utworz notatke {content}” |
| `notes_append` | Dopisz do notatki — Dopisuje tekst na końcu istniejącej notatki (po id lub tytule). | **note**: string; **text**: string; show: boolean | safe | A2 | tak | „dopisz do notatki {note}: {text}”, „dodaj do notatki {note}: {text}”, „dopisz do {note}: {text}” |
| `notes_update` | Zmień notatkę — Zmienia tytuł i/lub zastępuje całą treść notatki. | **note**: string; title: string; content: string | safe | A2 | tak | „zmien tytul notatki {note} na {title}”, „przemianuj notatke {note} na {title}” |
| `notes_delete` | Usuń notatkę — Usuwa notatkę (wymaga potwierdzenia). | **note**: string | confirm | A0 | — | „usun notatke {note}”, „skasuj notatke {note}”, „wyrzuc notatke {note}” |

## Pulpit i widgety

| id | co robi | argumenty | ryzyko | poziom | cofanie | przykłady PL |
|---|---|---|---|---|---|---|
| `create_widget` | Nowy widget — Tworzy widget na pulpicie: note (tekst), list (pozycje do odhaczania), result (wynik zadania). | **type**: note\|list\|result; **title**: string; content: string; items: string[] | safe | A2 | tak | „dodaj widget {title}”, „nowy widget (notatka\|lista\|wynik) {title}”, „stworz liste {title}” |
| `widgets_list` | Lista widgetów — Zwraca widgety na pulpicie z id, typem, tytułem i skrótem treści. | — | safe | A3 | — | „jakie mam widgety”, „lista widgetow” |
| `widgets_update` | Zmień widget — Zmienia tytuł, treść (note/result) lub dodaje/odhacza pozycje listy (add_items, check_item). | **widget**: string; title: string; content: string; add_items: string[]; check_item: string; uncheck_item: string | safe | A2 | tak | „dodaj do listy {widget} {add_items}”, „odhacz na liscie {widget} {check_item}” |
| `widgets_remove` | Usuń widget — Usuwa widget z pulpitu (wymaga potwierdzenia). | **widget**: string | confirm | A0 | — | „usun widget {widget}”, „zamknij widget {widget}” |
| `add_shortcut` | Skrót na pulpicie — Dodaje ikonę skrótu do aplikacji (app) lub strony WWW (url). | **name**: string; app: chat\|notes\|market\|schedule\|monitor\|terminal\|weather\|calc\|timer\|settings\|library; url: string | safe | A2 | tak | „dodaj skrot {name}”, „utworz skrot do {name}”, „nowa ikona {name}” |
| `shortcut_remove` | Usuń skrót — Usuwa skrót z pulpitu (wymaga potwierdzenia). | **name**: string | confirm | A0 | — | „usun skrot {name}”, „usun ikone {name}” |
| `set_theme` | Motyw kolorystyczny — Zmienia kolor akcentu interfejsu. | **color**: jarvis\|cyjan\|niebieski\|fiolet\|zielony\|złoty\|czerwony\|różowy | safe | A3 | tak | „motyw {color}”, „ustaw motyw {color}”, „zmien motyw na {color}” |
| `set_wallpaper` | Tapeta — Zmienia tapetę: photo (jezioro w górach), aurora, void (pustka). Bez argumentu — następna. | wallpaper: photo\|aurora\|void | safe | A3 | tak | „tapeta {wallpaper}”, „zmien tapete [na] {wallpaper}”, „zmien tapete” |
| `focus_mode` | Tryb skupienia — Włącza/wyłącza tryb skupienia (minimalizuje okna, wycisza tło). | **on**: boolean | safe | A3 | — | „tryb skupienia”, „wlacz (tryb skupienia\|skupienie\|focus)”, „wylacz (tryb skupienia\|skupienie\|focus)” |

## Dane

| id | co robi | argumenty | ryzyko | poziom | cofanie | przykłady PL |
|---|---|---|---|---|---|---|
| `get_weather` | Pogoda — Aktualna pogoda i prognoza (Open-Meteo). Bez miasta — lokalizacja użytkownika. show=false nie otwiera okna. | city: string; days: integer; show: boolean | safe | A3 | — | „[jaka jest] pogoda”, „pogoda w {city}”, „jaka [jest] pogoda w {city}” |
| `get_crypto_prices` | Kursy krypto — Aktualne kursy BTC, ETH, SOL, BNB w USD ze zmianą 24h (CoinGecko / Binance). | symbol: BTC\|ETH\|SOL\|BNB; show: boolean | safe | A3 | — | „kurs (bitcoina\|btc\|ethereum\|eth\|solany\|sol\|bnb)”, „ile kosztuje (bitcoin\|ethereum\|solana\|bnb)”, „kursy krypto” |
| `market_watch` | Alert kursu — Ustawia alert: gdy kurs symbolu przekroczy (above) lub spadnie poniżej (below) progu USD, Jarvis powiadomi. Bez progu — lista alertów. | symbol: BTC\|ETH\|SOL\|BNB; direction: above\|below; price: number; remove: boolean | safe | A2 | tak | „powiadom gdy (bitcoin\|btc\|eth\|ethereum\|sol\|solana\|bnb) (przekroczy\|spadnie ponizej) {price}”, „alert (bitcoin\|btc\|eth\|sol\|bnb) {price}”, „jakie mam alerty” |
| `calculate` | Oblicz — Dokładnie liczy wyrażenie (+ - * / ^ % nawiasy sqrt sin cos log ln pi) i procenty. | **expression**: string | safe | A3 | — | „oblicz {expression}”, „policz {expression}”, „ile to {expression}” |
| `open_url` | Otwórz stronę — Otwiera stronę WWW w nowej karcie. Znane serwisy: youtube, google, github, gmail, spotify, netflix, facebook, twitter, wikipedia, mapy, linkedin, reddit, allegr | **url**: string | confirm | A0 | — | „otworz strone {url}”, „wejdz na {url}”, „otworz (youtube\|google\|github\|gmail\|spotify\|netflix\|wikipedia\|mapy\|reddit\|allegro\|linkedin)” |
| `web_search` | Szukaj w Google — Otwiera wyszukiwanie Google z zapytaniem w nowej karcie. | **query**: string | safe | A1 | — | „wyszukaj {query}”, „szukaj {query}”, „wygoogluj {query}” |
| `clipboard_write` | Skopiuj do schowka — Kopiuje tekst do schowka systemowego. | **text**: string | safe | A1 | — | „skopiuj {text}”, „skopiuj do schowka {text}” |
| `clipboard_read` | Odczytaj schowek — Zwraca tekst ze schowka (wymaga zgody przeglądarki). | — | confirm · zewn. | A0 | — | „co mam w schowku”, „odczytaj schowek”, „wklej ze schowka” |

## Pamięć

| id | co robi | argumenty | ryzyko | poziom | cofanie | przykłady PL |
|---|---|---|---|---|---|---|
| `memory_remember` | Zapamiętaj — Zapisuje trwały fakt o użytkowniku lub preferencję (np. "pracuję zdalnie", "lubię kawę o 9"). Fakty trafiają do kontekstu każdej rozmowy. | **fact**: string; scope: profile\|preference\|project\|other | safe | A2 | tak | „zapamietaj [ze] {fact}”, „zapamietaj sobie {fact}”, „pamietaj [ze] {fact}” |
| `memory_recall` | Przypomnij fakty — Zwraca zapamiętane fakty pasujące do zapytania (bez zapytania — wszystkie). | query: string | safe | A3 | — | „co o mnie wiesz”, „co pamietasz”, „co pamietasz o {query}” |
| `memory_forget` | Zapomnij — Usuwa zapamiętany fakt (po id lub fragmencie). Wymaga potwierdzenia. | **fact**: string | confirm | A0 | — | „zapomnij [ze] {fact}”, „zapomnij o {fact}” |

## Pliki

| id | co robi | argumenty | ryzyko | poziom | cofanie | przykłady PL |
|---|---|---|---|---|---|---|
| `files_list` | Pliki w folderze — Lista plików w folderze roboczym Jarvisa (File System Access, Chrome/Edge). | — | safe | A3 | — | „[pokaz] [moje] pliki”, „co jest w folderze”, „lista plikow” |
| `files_read` | Przeczytaj plik — Zwraca treść pliku tekstowego z folderu roboczego. | **name**: string | safe · zewn. | A3 | — | „przeczytaj plik {name}”, „otworz plik {name}”, „co jest w pliku {name}” |
| `files_write` | Zapisz plik — Zapisuje (lub dopisuje, append=true) tekst do pliku w folderze roboczym. Nadpisanie istniejącego pliku wymaga potwierdzenia. | **name**: string; **text**: string; append: boolean | confirm | A0 | — | „zapisz plik {name}: {text}”, „zapisz do pliku {name} {text}” |
| `files_export_note` | Eksportuj notatkę do pliku — Zapisuje notatkę jako plik .md w folderze roboczym. | **note**: string | safe | A1 | — | „eksportuj notatke {note} [do pliku]”, „zapisz notatke {note} jako plik” |

