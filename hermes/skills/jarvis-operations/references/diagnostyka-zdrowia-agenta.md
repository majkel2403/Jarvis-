# Diagnostyka zdrowia agenta — dlaczego praca się urywa

Pytanie „dlaczego się wyłączasz / co się psuje w twojej pracy” rozstrzygaj liczbami z logów i bazy, nie wrażeniem. Poniżej kolejność zbierania dowodów.

## 1. Jak kończyły się tury

`logs/agent.log`, linie `Turn ended: reason=…`:

- `text_response` — normalne zakończenie;
- `max_iterations_reached(N/N)` — tura ucięta limitem kroków (`agent.max_turns`);
- `interrupted_during_api_call(sse_client_disconnected)` — klient rozłączył strumień; tura przerwana w połowie, to nie błąd modelu;
- brak tekstu po ostatnim wywołaniu narzędzia — model urwał się w połowie planu; sprawdź, czy nie zadziałał strażnik pętli (punkt 2).

Zliczaj sygnatury, nie pojedyncze linie: `grep -o "reason=[a-z_()0-9/]*" logs/agent.log | sort | uniq -c | sort -rn` (na Windowsie czytaj plik przez `read_file`/`python`; `grep` po UTF-16 melduje „Binary file matches”).

## 2. Co ucina pracę z definicji

- `tool_loop_guardrails` w `config.yaml`: `warn_after` (`exact_failure: 2`, `same_tool_failure: 3`) i `hard_stop_after` (`exact_failure: 3`, `same_tool_failure: 5`) — **piąte** niepowodzenie tego samego narzędzia kończy turę twardo. Reguła operacyjna: 3 próby = stop i raport, co nie działa.
- `agent.max_turns` — twardy limit kroków jednej tury.
- Klient MCP: po 3 odrzuconych wywołaniach pod rząd parkuje serwer na ~46–49 s (objaw: `Rejected the last 3 calls`, potem `Unknown tool`). W tym oknie kolejne wywołania tylko mnożą błędy — sprawdź stan innym kanałem (`tasklist`, `curl` na port usługi, pliki cache) i wróć po odczekaniu.

## 3. Skala sesji (odpowiedź na „czemu się mylisz”)

`state.db` → `sessions` (`input_tokens`, `output_tokens`, `cache_read_tokens`, `api_call_count`, `estimated_cost_usd`) oraz `session_model_usage` (rozbicie per linia: `''`, `compression`, `background_review`, `vision`). Sygnały ostrzegawcze:

- kontekst ≥ ~100 tys. i `api_call_count` w tysiącach → streszczenie idzie prawie co turę;
- `compression_ineffective_count > 0` albo streszczenie widoczne w kontekście jako `deterministic fallback` (bez treści) → **gubione szczegóły = pomyłki**. Odpowiedź dla użytkownika brzmi `/new` na nowe zadanie, nie „będę uważał”.

Wzory kosztu i pełne zapytania: `references/deepseek-tokeny-i-koszt.md`, `scripts/koszt_sesji.py`.

## 4. Błędy w agregacie

`logs/errors.log` rośnie szybciej, niż wynika to z realnej pracy. Zanim uznasz, że „wszystko się psuje”, pogrupuj plik po **sygnaturze** (linia bez daty, liczb i ID), a nie po pojedynczych wystąpieniach: sygnatura powtarzana codziennie to realna wada, jednorazowa to szum. Użytkownikowi pokazuj wyłącznie nowe sygnatury z bieżącego dnia.

## 5. Jak patrzeć — komendy, które nie marnują tury

- **Nie `grep -r` po drzewie `hermes-agent`** — `node_modules` i `.git` kończą się timeoutem 300 s. Szukaj po pojedynczych plikach albo przez `search_files` (ripgrep, pomija binaria).
- `tasklist` w bashu pisze **UTF-16** — `| grep` zwraca „Binary file matches”. Czytaj `/fo csv` i filtruj w Pythonie: `tasklist /fi "imagename eq comet.exe" /fo csv`.
- Natywne programy (python, git, node) **nie tłumaczą** ścieżek MSYS: podawaj `C:/…`, nie `/c/…`.
- Interpreter profilu: `C:\Users\majke\.hermes\hermes-agent\venv\Scripts\python.exe` — skrypty profilu (`scripts/*.py`) uruchamiaj nim, bo inny `python` nie ma `yaml`/`ruamel`.

## 6. Kolejność odpowiedzi użytkownikowi

1. Co konkretnie się urywa i czym to zmierzyłeś (liczba, nie opinia).
2. Co jest Twoją winą (rozmiar sesji, dobijanie martwego narzędzia), a co środowiska (zamknięta przeglądarka, rozłączenie klienta).
3. Co już przetestowałeś (liczba testów, sonda HTTP z kodem odpowiedzi).
4. **Jedna** decyzja do podjęcia przez użytkownika (np. zgoda na zmianę configu i restart) — nie lista pięciu wariantów.

## 7. Próg streszczania kontekstu — co naprawdę tnie rozmowę

`config.yaml` → `compression:` (`enabled`, `threshold`, `threshold_tokens`, `target_ratio`, `protect_last_n`).

- **Działający próg = `min(threshold × okno modelu, threshold_tokens)`.** `threshold_tokens` jest **sufitem**. Przy modelu o oknie 1 mln tokenów i `threshold: 0.5` limit proporcjonalny to 500 tys., więc w praktyce wiąże sufit — podniesienie sufitu zmienia zachowanie, a `threshold` nie.
- **Dowód, jaką liczbą tnie działający proces:** `logs/agent.log` — pary `prompt=<N> < threshold=<T>` przy próbie kompresji (np. `prompt=111 713 < threshold=120 000`). Trzy liczby do pokazania użytkownikowi: ostatni `prompt`, działający `threshold`, godzina startu procesu.
- **Ostrzeżenie wklejone przez użytkownika może opisywać poprzedni proces** (sesja trwa przez restart, a banner trafia na Telegram z opóźnieniem). Zanim zmienisz cokolwiek drugi raz: `grep` po starej wartości w `logs/agent.log` i porównaj czas ostatniego wystąpienia z czasem startu (`~/.jarvis-os/logs/restart.log`, linie start/listen/ready w `logs/agent.log`). Stara liczba występuje tylko przed restartem = config działa, a odpowiedź brzmi „to stary proces”, nie „naprawiam”.
- **Powody blokady w ostrzeżeniu** (`… but compression is currently blocked (X)`):

| X | znaczenie | reakcja |
|---|---|---|
| `structural_backoff:<s>` | ~300 s pauzy, którą kompresor nakłada sobie sam po „structural no-op” (nie było czego streszczać) | czekać — zdejmie się sama; nie restartuj i nie zmieniaj progu |
| `cooldown:<…>` | ostatnie streszczenie się nie udało | sprawdź w logu, czym kończy się wywołanie streszczenia (np. 404 ścieżki `auxiliary.*`) |
| `disabled` / brak sekcji | `compression.enabled: false` | dopiero to jest zmiana configu |
| powtarzany `structural_no_op` przy dużym kontekście z cache | streszczenie nie zmniejsza rozmiaru, bo nie ma czego zwijać | normalne; szybszym lekarstwem jest `/new` na nowe zadanie |

- **Awaria modelu streszczeń nie jest awarią progu:** gdy model z `auxiliary.compression` jest niedostępny, log mówi `Summary model '<slug>' unavailable (<błąd>). Falling back to main model '<model>'` — rośnie rachunek, nie próg. Zanim ruszysz `threshold_tokens`, sprawdź, czy streszczenia nie spadają na płatny model główny: `references/aux-i-powierzchnie-providerow.md`.
- Po zmianie progu dowodem są **nowe** linie z nową liczbą po restarcie (`grep "threshold=120000" logs/agent.log`), a nie brak ostrzeżeń — cisza może znaczyć, że sesja była za mała, by próg zadziałał.
