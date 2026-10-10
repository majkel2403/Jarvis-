# Jarvis OS — fundament przebudowy i bezpiecznej migracji

**Data:** 2026-10-10
**Status:** projekt specyfikacji do przeglądu użytkownika (zatwierdzony kierunek B, niezatwierdzona jeszcze pełna specyfikacja)
**Zakres:** architektura zarządzania przebudową, inwentaryzacja, dokumentacja, kolejność i bramki migracji.
**Punkt odniesienia kodu:** lokalny commit `fb74cb1`, gałąź `auto/nowa-petla-2026-10-09`; istniejące niezacommitowane zmiany nie są częścią tej specyfikacji.

## 1. Cel i definicja sukcesu

Budujemy nową, uporządkowaną architekturę Jarvis OS, **nie przepisując całego programu od zera**. Zachowujemy działające funkcje obecnego systemu jako punkt odniesienia i przenosimy je po jednej, testowalnej zdolności na raz. Celem jest Jarvis, który działa autonomicznie także bez otwartej karty przeglądarki, zachowuje postęp, weryfikuje własne działania i wyświetla wyłącznie rzeczywiste stany oraz zdarzenia.

Sukces tego etapu oznacza, że zespół agentów dysponuje jednym, niesprzecznym źródłem decyzji i weryfikowalną macierzą migracji; każda kolejna migracja ma jawny właściciel modułu, zależności, testy, punkt cofnięcia i kryteria zakończenia. **Ten etap nie ogłasza jeszcze działającego nowego Core.**

## 2. Wspólne rozumienie potrzeb użytkownika

- Główny produkt: osobisty Jarvis OS, który realnie steruje zadaniami, aplikacjami i agentami, a nie tylko je wizualizuje.
- Priorytet: autonomia Hermesa, przewidywalność działania, zachowywanie stanu oraz późniejsze wyjątkowe UX i premium animacje.
- Hermes pełni rolę mózgu planującego i wykonującego zadania; Jev (TypeSafe) pozostaje opcjonalną warstwą klasyfikacji i szybkich decyzji.
- Orb, grafy, Cinematic Engine, JEV Neural i trading mogą współdzielić kontrakty, ale rozwijamy je jako odrębne moduły/produkty.
- Pracujemy metodą Superpowers: specyfikacja, przegląd, szczegółowy plan, zadanie + testy + niezależna weryfikacja.
- Dokumenty tworzymy **przed migracją kodu**, ale nie mnożymy ich bez potrzeby; istniejące specyfikacje i ADR-y aktualizujemy zamiast dublować.

## 3. Fakty wejściowe i ograniczenia

Stan lokalny odczytany 2026-10-10: roboczy katalog `C:\Users\majke\Desktop\jarvis-`, aktywna gałąź `auto/nowa-petla-2026-10-09`, commit `fb74cb1`, 19 pozycji zmienionych lub nieśledzonych w `git status --porcelain`. Istnieje dodatkowy worktree `chore/hermes-runtime-unification`. Stan `origin/main`, lokalnego `main` i innych worktree nie może być utożsamiany z aktualnym katalogiem roboczym.

Repo zawiera już `docs/spec/`, `docs/adr/`, `docs/superpowers/`, `docs/TS-MIGRATION.md`, `hermes/`, `bridge/`, `js/`, `integrations/`, `tests/` i `workflows/`. `docs/spec/17-wdrozenie.md` dokumentuje historyczne fale funkcji W1–W5; **nie jest** planem tej przebudowy. Decyzję o JSDoc bez bundlera zapisano w `docs/TS-MIGRATION.md`: pozostaje obowiązująca dla starego interfejsu, dopóki nowy ADR jej świadomie nie zastąpi.

Specyfikacja `docs/superpowers/specs/2026-10-07-hermes-runtime-unification-design.md` określa cel migracji runtime na **jeden gateway hosta na porcie 8642**, Bridge :8651 i Site :4000. Nie wolno zakładać, że stan rzeczywisty jest identyczny z planem — wymagamy odrębnego, odczytowego sprawdzenia środowiska. Wcześniejsze odniesienia do portu 8643 nie są podstawą do tworzenia nowego kontraktu.

### Nienaruszalne granice podczas obecnego etapu

Nie zmieniamy kodu produkcyjnego, konfiguracji Hermesa, cronów, procesów, portów, aktualnego worktree, branchy użytkownika ani deploymentów. Nie wykonujemy `reset --hard`, `clean`, `stash`, przełączania gałęzi w brudnym katalogu i nie usuwamy katalogów. Nie odczytujemy ani nie ujawniamy wartości sekretów; raportujemy tylko ich obecność i sposób podłączenia. Specyfikacja powstaje na **osobnej gałęzi dokumentacyjnej w osobnym worktree**.

## 4. Rozważone drogi i decyzja

1. Pisanie wszystkiego od nowa — daje swobodę, ale traci dorobek i utrudnia porównanie zachowania.
2. **Nowa architektura + stopniowa migracja (wybrana)** — nowa warstwa kontraktów i trwały rdzeń, istniejące moduły wprowadzane etapowo po testach zgodności.
3. Porządkowanie starego kodu w miejscu — mniej ryzykowne krótkoterminowo, ale zachowuje część niejasnych zależności i ograniczeń stanu przeglądarki.

Wybrana droga B wymaga **równoległego istnienia starego i nowego systemu** przez okres migracji. Wspólne używanie tych samych danych lub usług dopuszczalne jest wyłącznie przez zdefiniowany adapter i po zweryfikowaniu własności zapisu.

## 5. Granice systemu — architektura docelowa

```text
Wejścia: Desktop / Mobile / Telegram / Harmonogram / API
                    |
             Jarvis Core (backend)
   zadania + stany + trwały dziennik + Event Bus
                    |
           Orkiestracja / Adapter
           /               \
      Hermes             Jev (opcjonalny)
      plan, narzędzia     szybkie decyzje
           \               /
              Bridge / Tool Registry
                    |
        wykonawcy: Windows / WWW / pliki / aplikacje
                    |
       wyniki + weryfikacja + trwały zapis
                    |
     UI / Orb / Graph / Cinema (czytają zdarzenia)
```

**Odpowiedzialności:**
- **Jarvis Core**: identyfikacja zadania, status, kolejka, persystencja, dziennik zdarzeń, retry, idempotencja, prawa do zapisu, wznowienie po awarii; nie rysuje ekranu.
- **Hermes**: rozumie cel, planuje, uruchamia narzędzia i przedstawia wyniki; nie jest jedynym trwałym magazynem stanu aplikacji.
- **Jev**: opcjonalnie rozpoznaje intencję i dobiera szybką ścieżkę; przy braku usługi/przekroczeniu progu niepewności oddaje sterowanie Hermesowi.
- **Bridge/Tool Registry**: jednolite narzędzia, argumenty, uprawnienia, kod błędu, wynik i identyfikator wywołania; istniejące implementacje oceniamy przed decyzją o migracji.
- **UI / Orb / Cinema**: pokazują projekcję zdarzeń, są odtwarzalne ze stanu i nie stanowią jedynego źródła prawdy.
- **Laboratoria**: JEV Neural, trading, Orb Lab i 3D Graph mają własny cykl specyfikacji oraz interfejs integracyjny. Nie blokują Core.

### Fundamentalny kontrakt zachowania (do uściślenia w osobnej specyfikacji Core)

Każde zadanie ma stabilny `task_id`, źródło, deklarowany cel, bieżący status, kolejne próby, wyniki narzędzi i dziennik zdarzeń. Każde zdarzenie ma `event_id`, `task_id`, typ, czas i numer porządkowy w obrębie zadania. Statusy minimum: `queued`, `planning`, `running`, `waiting_for_input`, `verifying`, `completed`, `failed`, `cancelled`. Ponowione zdarzenie lub wykonanie nie może stworzyć przypadkowo drugiej kopii skutku operacji. Dokładny format API, baza danych i mechanizm kolejkowania wymagają odrębnej, zatwierdzonej specyfikacji.

## 6. Hierarchia źródeł prawdy i dokumentacja

W sprawach **stanu faktycznego**: wynik świeżego testu/inspekcji > implementacja w konkretnym commicie > historyczny opis. W sprawach **stanu docelowego**: zatwierdzona specyfikacja i aktualny ADR > plan zadaniowy > koncepcje i makiety. Sprzeczności trafiają do dziennika rozbieżności, nie są rozstrzygane po cichu przez agenta.

Proponowany komplet plików docelowych (utworzenie/aktualizacja po zatwierdzeniu tego projektu, zgodnie z kolejnym planem):

| Plik | Jednoznaczna odpowiedzialność |
|---|---|
| `docs/master/00-VISION.md` | cel, miara sukcesu MVP i granice produktów |
| `docs/master/01-CURRENT-STATE.md` | datowany, dowodowy stan repo, runtime i testów |
| `docs/master/02-TARGET-ARCHITECTURE.md` | komponenty i zależności, bez mikroimplementacji |
| `docs/master/03-MODULE-OWNERSHIP.md` | gdzie jest kod, kto kontroluje stan i zapis |
| `docs/master/04-API-AND-EVENT-CONTRACTS.md` | rejestr zatwierdzonych kontraktów i linki do specyfikacji |
| `docs/master/05-AUTONOMY-AND-AGENTS.md` | delegacja, weryfikacja, wznowienie i decyzje Jeva |
| `docs/master/06-MIGRATION-MATRIX.md` | wiersz na moduł/funkcję, status i dowody |
| `docs/master/07-MIGRATION-ROADMAP.md` | zależności, fazy, kryteria bramek |
| `docs/master/08-TEST-AND-ACCEPTANCE.md` | poziomy testów, scenariusze E2E, regresja, rollback |
| `docs/master/09-PROJECT-STATUS.md` | jedyny aktualny checkpoint agentów i następne zadanie |
| `AGENTS.md` | krótka instrukcja dla agentów: gdzie czytać prawdę i jak pracować |

Zachowujemy `docs/spec/` jako specyfikacje funkcji starego UI do oceny, `docs/adr/` jako historię decyzji oraz `docs/superpowers/specs` i `plans` jako szczegóły zatwierdzonych podprojektów. Nie przenosimy automatycznie starego `HERMES.md` do nowego kontraktu — sprawdzamy jego rolę i zgodność z realnym runtime. Dokumenty master powinny **linkować**, a nie kopiować kilkudziesięciostronicowe stare specyfikacje.

## 7. Inwentaryzacja i macierz migracji

Przed jakimkolwiek przeniesieniem kodu powstaje datowany baseline. Obejmuje:

1. **Repozytoria i gałęzie:** URL, nazwa brancha, HEAD SHA, relacja z origin, niezapisane zmiany, worktree, ownership. Dla zmian nieśledzonych: ścieżka i hash/plomba manifestu (bez sekretów).
2. **Kod i zależności:** moduły, eksportowane interfejsy, zależności między procesami, odbiorcy zdarzeń, biblioteki i generatory plików.
3. **Runtime:** działające profile/gatewaye, nasłuchujące porty, cron/autostart, bridge, Telegram, zapisy dyskowe; bez zatrzymywania usług.
4. **Dokumenty:** obowiązujący/archiwalny/projektowy, odniesiony commit, konflikty decyzji.
5. **Testy:** dokładna komenda, data, kod wyjścia, liczba błędów, znane ograniczenia. Test, który modyfikuje dane, uruchamiamy tylko na kopii/fixture.

Każdy wiersz macierzy musi zawierać: `module_id`, `capability`, `old_paths`, `old_commit`, `dependencies`, `owner_of_state`, `target_boundary`, `strategy` (reuse/adapter/refactor/replace/defer), `migration_status`, `baseline_test`, `target_test`, `rollback`, `evidence_link`, `decision_adr`. Nieprawdziwe lub jeszcze niesprawdzone statusy mają wartość `unverified`, nigdy automatyczne `works`.

## 8. Kolejność podprojektów

**Faza 0: Porządek i dokumenty** — baseline, konflikty dokumentacji, macierz migracji i decyzje. Wynik sam w sobie jest użyteczną, zweryfikowaną dokumentacją.

**Faza 1: Core task lifecycle** — osobna specyfikacja trwałego zadania, jego stanów i event logu. Dowód: trwała próba zadania bez UI, ponowienie zdarzenia i wznowienie.

**Faza 2: Adapter narzędzi i Bridge** — zgodność poleceń, schema, wyników, uprawnień i rzeczywistych wykonawców; bez masowego przepisywania narzędzi.

**Faza 3: Pamięć, dane i kontekst** — własność zapisu, eksport/migracja IndexedDB, pamięć Hermesa i Obsidian; bez mieszania danych produkcyjnych w testach.

**Faza 4: Workflow i autonomiczne działanie** — trwałe sekwencje, delegacja, testy automatyczne, polityka błędów, ponowienia, zatrzymanie i odtwarzanie.

**Faza 5: Jev (opcjonalny)** — shadow mode, kalibracja na polskich poleceniach, niezawodny fallback do Hermesa.

**Faza 6: Interfejs i multimedia** — Desktop/Mobile, Orb, grafy, Cinema; animacje wyłącznie od zdarzeń, skalowanie wydajności.

**Faza 7: Laboratoria i trading** — oddzielne specyfikacje produktu; na początku edukacja, symulacje, paper trading i backtesting; brak automatycznych prawdziwych transakcji w podstawowym Jarvis Core.

Między fazami obowiązują zależności, ale niezależne zadania (np. audyt UI i katalog modułów) można realizować równolegle. **Nie tworzymy jednego gigantycznego planu implementacji dla faz 1–7**: każda otrzymuje własny zatwierdzony design, plan, review i testy.

## 9. Jednostka migracji i workflow wykonania

Jednostką migracji jest **jedna zdolność biznesowa z testem od wejścia do wyniku**, nie przypadkowo wybrany plik. Może obejmować kilka małych plików, jeśli razem realizują jeden kontrakt.

Dla każdej jednostki:

1. Odczytaj obowiązujący design/ADR i wskaż dokładny `old_commit` i stare pliki.
2. Napisz test kontraktowy starego zachowania (green w starym środowisku).
3. Opracuj krótką specyfikację granicy nowego modułu, test błędu i ścieżkę rollbacku.
4. W osobnym worktree zaimplementuj adapter lub nowy moduł zgodnie z planem.
5. Uruchom test jednostkowy, integracyjny, regresję i scenariusz użytkownika; zapisz dokładne wyniki.
6. Porównaj rezultat z baseline. W razie rozbieżności nie usuwaj starego kodu.
7. Niezależny reviewer sprawdza diff, zgodność z kontraktem, skutki uboczne i dowody.
8. Scal po przeglądzie i aktualizuj macierz, ADR oraz `09-PROJECT-STATUS.md`. Usunięcie starej implementacji jest **osobnym** zadaniem po okresie obserwacji.

Nie uruchamiamy równoległych agentów modyfikujących ten sam moduł/worktree bez synchronizacji. Agent autonomiczny może sam poprawiać kod w zatwierdzonym zakresie i uruchamiać testy, ale nie oznacza `completed` bez dowodu.

## 10. Weryfikacja i dowody akceptacji

**Faza 0 jest gotowa wyłącznie gdy:** istnieje pełny manifest repozytoriów/worktree, 100% krytycznych modułów ma identyfikator oraz ścieżkę, każdy konflikt architektury ma jawny status, testy baseline mają wyniki z kodami wyjścia, zachowano odzyskiwalne źródła niezatwierdzonych zmian, a dokumentacja zawiera linki do ich dowodów. Brak testów lub dostępu oznacza `unverified`.

**Docelowy scenariusz MVP Core:** użytkownik wydaje zadanie stworzenia prostego dashboardu; Hermes planuje, wykonawca tworzy strukturę, Core zapisuje wynik, UI pokazuje zdarzenia i postęp; po zamknięciu i ponownym otwarciu karty rezultat istnieje. Osobny test sprawdza zadanie otrzymane przez Telegram bez otwartej karty. Trzeci symuluje restart i potwierdza wznowienie bez zduplikowania skutków.

Dowody przy każdym ukończonym module: commit/PR, lista plików, komendy testów i exit codes, snapshot wejścia/wyjścia albo raport E2E, log zdarzeń, opis rollbacku. Deklaracja agenta „działa” bez tych dowodów nie przechodzi przeglądu.

## 11. Obsługa awarii, danych i powrotu

- Błąd adaptera: wynik o zdefiniowanym kodzie, status zadania `failed` lub bezpieczne `waiting_for_input`; bez fałszywego sukcesu.
- Brak Jeva: fallback Hermes bez degradacji funkcji podstawowych.
- Zamknięcie karty: zadanie trwa w warstwie backendu; UI po powrocie odtwarza aktualny stan i log.
- Restart usług: odczyt dziennika i wznowienie tylko operacji, które mogą być bezpiecznie ponowione; pozostałe czekają na rozstrzygnięcie stanu skutków.
- Błąd migracji danych: nienaruszony snapshot starej wersji, mechanizm odwrócenia i potwierdzony test odczytu backupu.
- Rozbieżność dokumentacyjna: wpis w rejestrze z dwoma źródłami, preferowanym kontraktem i decyzją właściciela; nie poprawiaj po cichu historii ADR.

## 12. Zakres pierwszego następnego planu (po akceptacji tej specyfikacji)

Pierwszy **osobny** plan Superpowers obejmie tylko fazę 0: (a) read-only manifest baseline, (b) inwentaryzację dokumentów i ich niespójności, (c) uzgodnienie hierarchii źródeł prawdy, (d) utworzenie `docs/master` i macierzy, (e) test poprawności odnośników oraz review. Nie obejmie jeszcze pisania nowego backendu, refaktoru produkcyjnego Hermesa, migracji UI, restartów usług ani wdrożeń.

Kolejna bramka: użytkownik zatwierdza **ten plik specyfikacji**, dopiero potem powstaje szczegółowy `docs/superpowers/plans/2026-10-10-jarvis-migration-foundation.md`. Po przeglądzie planu wybiera sposób wykonania (subagent-driven lub native). Samo zatwierdzenie kierunku B nie upoważnia do wykonania tych etapów.
