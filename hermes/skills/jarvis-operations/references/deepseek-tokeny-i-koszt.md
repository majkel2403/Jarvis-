# Tokeny i koszt sesji (DeepSeek) — procedura odpowiedzi

Klasa pytań: „za co płacę”, „czemu jedna wiadomość tyle kosztuje”, „czy opłaca się nowa sesja”, „ile tokenów zjada system”. Odpowiedź ma zawierać **liczby z tej instalacji** i wzór, nie ogólniki.

## 1. Skąd wziąć liczby

Baza: `C:\Users\majke\.hermes\profiles\jarvis-desktop\state.db` (SQLite).

| tabela | co daje |
|---|---|
| `sessions` | `api_call_count`, `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `estimated_cost_usd`, `actual_cost_usd`, `pricing_version`, `model` |
| `session_model_usage` | to samo **per model i per linia** (`task`: `''` = praca główna, `background_review`, `compression`, `vision`) — jedyne miejsce z poprawnym kosztem; suma tych wierszy to koszt sesji |
| `messages` | przebieg sesji: `role`, `tool_name`, `timestamp`, `active`/`compacted` — jedyne źródło liczby wywołań narzędzi (`sessions.tool_call_count` bywa nieaktualne) |
| `cron/usage_audit.jsonl` | przebiegi cronów |
| `logs/deepseek-chat-usage.json`, `logs/deepseek-forced-usage.json` | ostatnie wywołanie danej ścieżki (surowe `usage` z API) |

Uruchamiaj skryptem przez interpreter Hermesa: `C:\Users\majke\.hermes\hermes-agent\venv\Scripts\python.exe` (powłokowy `python` nie ma `yaml`, ale `sqlite3` ma — do samej bazy wystarczy).

## 2. Wzór i stawki

```
koszt = świeży_input × stawka_in + cache_read × stawka_cache + output × stawka_out
```

Stawki (za 1 mln tokenów, USD, off-peak) — źródło: `hermes-agent/agent/usage_pricing.py` (snapshot providera, pole `pricing_version`):

| model | input (cache miss) | cache hit (read) | output |
|---|---|---|---|
| `deepseek-flash` | 0,15 | 0,003 | 0,60 |

- Godziny szczytu: pon.–pt. **01:00–04:00** i **06:00–10:00 UTC** = **2×** stawki (u użytkownika, CEST, to 03:00–06:00 i 08:00–12:00).
- `cache_write` w typowych sesjach jest 0 — DeepSeek nalicza tylko odczyt.

## 3. Kontekst startowy (ile waży „pusty” system)

Policz znaki SOUL.md + `memories/MEMORY.md` + `memories/USER.md` + każdy skill z `skills.auto_load` (`config.yaml`), podziel przez ~3,6 na tokeny.

Pomiar referencyjny: 8 skilli auto_load = 56,2 tys. znaków, całość ~63,6 tys. znaków ≈ **17,7 tys. tokenów** ≈ `$0,0027` za pierwsze wywołanie, gdy całość jest świeża.

Wniosek do przekazania: długi kontekst nie jest katastrofą (cache), ale **każdy skill w `auto_load` płaci się w każdej turze**.

## 4. Jak odpowiadać na „czy opłaca się `/new`”

1. Rozbij koszt sesji na linie: `main` (praca) vs `compression` + `background_review` (narzut).
2. Wskaż, że narzut znika w nowej sesji, a praca nie.
3. Dodaj, że liczba **wywołań API** (nie długość historii) jest mnożnikiem — każde narzędzie to kolejna runda z pełnym kontekstem.
4. Podaj cenę utraconej pamięci rozmowy (pamięć faktów, sejf i skille zostają).
5. Rekomendacja: `/new` przy zmianie tematu lub końcu wątku, nigdy w środku pracy.

Kalibracja z tej instalacji (sesja ~5 h, 447 wywołań API, `deepseek-flash`): praca główna **$0,67**, `compression`
**$0,26**, `background_review` **$0,10**, `vision` **$0,10** — razem **$1,12**. Uwaga na kierunek: przy takiej
liczbie rund **~47% rachunku to OUTPUT** (każda runda pisze odpowiedź, a `compression` generuje długie streszczenia),
więc „przecież wszystko idzie z cache” nie tłumaczy kwoty.

## 5. Pułapki

- **Wiersz `sessions` nie jest kosztem sesji.** Miesza modele darmowe/fallback i nie rozbija linii; sumowanie tokenów z niego daje zawyżoną kwotę. Koszt czytaj z `session_model_usage`.
- **Nie zgaduj stawek.** Provider zmienia cennik i snapshot w `usage_pricing.py` może być świeższy niż pamięć — sprawdź pole `pricing_version` i sam plik.
- **Nie zgaduj długości kontekstu** — zmierz go (znaki/3,6) i podaj razem z metodą.
- Gdy podajesz saldo, bierz je z `GET https://api.deepseek.com/user/balance` (jak strażnik konfiguracji), nie z poprzedniej rozmowy.
- **Wiersz `sessions.tool_call_count` jest nieaktualny.** W tej samej sesji pokazywał 26, gdy `messages` miało 1506 wyników narzędzi — liczbę wywołań narzędzi i ich rozkład (`tool_name`, godziny) bierz z `messages`.
- **Nazwy kolumn sprawdzaj w bazie (`pragma table_info(<tabela>)`), nie w pamięci.** Skrypt, który szuka kolumny
  `lane`/`role`, gdy tabela ma `task`, zgłosi „brak kolumny linii” i policzy koszt tylko z wiersza `sessions`
  (zaniżonego) — komunikat o brakującej kolumnie to hipoteza o schemacie, nie ustalenie.
- **Nie licz wywołań przez `count(distinct tool_call_id)`** — część wierszy ma puste/powtarzalne id (1530 wierszy
  `role='tool'` wobec 478 unikalnych id). Licz wiersze pogrupowane po `tool_name` i osobno raportuj podział
  `active`/`compacted`.
- **`messages.token_count` jest pusty** (zero wierszy z `token_count > 0` dla każdej roli) — nie buduj na nim kolumny „tokeny na wywołanie”. Patrz §7.

## 6. Pomiar pętli zewnętrznego modelu (klient CLI — np. MiniMax)

Klasa pytań: „ile czasu na to poświęciłeś, ile było wywołań modelu, jaki model i tryb reasoning, ile wywołań narzędzi”. Odpowiadaj **liczbami z plików**, nigdy szacunkiem.

1. **Znajdź log wywołań klienta.** Otwórz kod klienta (`mm.py` i pokrewne) i sprawdź, czy funkcja wysyłająca żądanie dopisuje `usage` do JSONL (szukaj `usage`, `jsonl`, `append`). Plik leży w katalogu projektu jako `usage-*.jsonl` i zawiera po jednym wierszu na każde wywołanie.
2. **Policz z tego pliku:** liczbę wywołań (i rozkład `model`), sumy `prompt_tokens` / `completion_tokens` / `completion_tokens_details.reasoning_tokens` / `prompt_tokens_details.cached_tokens`, rozkład `finish_reason`, pierwszy i ostatni znacznik `t` (czas pętli = różnica), wywołania na godzinę.
3. **„Jaki tryb reasoning”** = przeczytaj payload żądania w kodzie klienta. Gdy nie ma parametru `reasoning`/`thinking`/`reasoning_effort`, odpowiedź brzmi: brak jawnego parametru → domyślne zachowanie modelu, a dowodem jest udział `reasoning_tokens` w wyjściu (tu: 599 538 z 1 173 349 tokenów wyjścia ≈ 51%).
4. **Parametry bierz z kodu, nie z pamięci:** model (stała + `MM_MODEL`), temperatura, `max_tokens`, timeout, endpoint.
5. **Skonfrontuj wywołania z artefaktami:** policz pliki wygenerowane przez pętlę (np. `cache/improve-*.json`) i powiedz wprost, że różnica to naprawy/ponowienia — nie przypisuj zgadywanego podziału do etapów.
6. **Rozdziel dwie warstwy czasu:** pętla modelu zewnętrznego (od pierwszego do ostatniego `t` w jej logu) i cała sesja Hermesa (`started_at` → `last_activity_at` z `sessions`, do tego liczba wywołań API i koszt z `session_model_usage`). Użytkownik pytający „ile na to poświęciłeś” chce obu liczb razem z ich źródłem.
7. **Gdy pytanie brzmi „jak to możliwe, że tak drogo, skoro pętla była darmowa”** — odpowiedź zaczynaj od rozbicia
   na linie i od średniego kontekstu na wywołanie (tokeny z cache ÷ liczba wywołań), nie od kwoty. Mechanizm:
   darmowy model pisze tylko zawartość, a płatna jest **orkiestracja** — każde użycie narzędzia to osobne wywołanie
   z całym kontekstem, a `compression` + `background_review` + `vision` dokładają kilkadziesiąt procent rachunku,
   których nie widać w samym „ile wygenerowano”.
8. **Dowód, co z pętli weszło do finalnych plików** (jeśli pytanie brzmi „pokaż wszystko, co zrobiłeś”): policz
   kandydatów na dysku, wygenerowane pliki `improve-report.json`/logi i **porównuj pole ładunku, nie bajty** —
   finalne pliki są normalizowane przez builder, więc bajtowy hash nie trafia NIGDY; hash pola (np. `js`) trafia.

## 7. Panel wywołań — telemetria per wywołanie (co jest, a czego nie ma w bazie)

Klasa pytań: „chcę widzieć każde Twoje wywołanie: datę, godzinę, tokeny, czas odpowiedzi, pliki, skille”.

**Twarde ustalenie:** tokenów per wywołanie w bazie **nie ma**. `messages.token_count` jest puste dla wszystkich ról, a `session_model_usage` grupuje per sesja + linia. Nie wymyślaj kolumny „tokeny” przy wywołaniu — pokaż ją jako **szacunek**: `ctx_per_call = input_tokens ÷ api_call_count` dla tej sesji, jawnie nazwany „średni kontekst na wywołanie”.

Pola, które da się wyliczyć dla **każdego** wywołania:

| pole | skąd |
|---|---|
| data + godzina | `messages.timestamp` wiersza `role='tool'` (formatuj lokalnie) |
| narzędzie | `messages.tool_name` |
| czas odpowiedzi | `timestamp(tool) − timestamp(poprzedzająca wiadomość asystenta w tej samej sesji)`: `SELECT timestamp FROM messages WHERE session_id=? AND id<? AND role='assistant' ORDER BY id DESC LIMIT 1` |
| pliki, skill | `tool_calls` tej poprzedzającej wiadomości (JSON): klucze `path`/`file`/`name`/`output_path` + `skill_view`/`skill_manage` → `name`; dołączaj tylko ścieżki z rozszerzeniem pliku |
| tokeny | **nie istnieją per wywołanie** → `ctx_per_call` sesji jako szacunek |
| koszt | wyłącznie per sesja/linia z `session_model_usage` |

- Gotowy zbieracz: `C:\Users\majke\JarvisWorkspace\AUTO\tools\panel_wywolania.py` (uruchamiaj interpreterem Hermesa; `--limit N`, `--json`). Pisze `AUTO/panel-wywolan.json` (+ `panel-wywolan-last.json`) i wypisuje na stdout sumę dnia: wywołania, łączny czas, średni czas, oraz rozbicie sesji/linii z wejściem, wyjściem, cache i kosztem.
- Karta na pulpicie: spec bez `sources` (dane z Twojego skryptu), bloki `kpi` na sumy dnia + `markdown` na listę ostatnich wywołań i rozbicie kosztu. Pamiętaj: `table.rows` to odnośnik, więc tabela statyczna jest niemożliwa — treść tabelaryczną wkładaj w `markdown`.
- Widget jest **zdjęciem stanu** (brak źródeł = brak odświeżania): powiedz to wprost i odświeżaj przez ponowne `widget_build`/`widget_edit` na prośbę, zamiast obiecywać samoczynną aktualizację.
- Gdy pokazujesz koszt dnia, rozbij go na linie (`praca główna`, `kompresja`, `przegląd w tle`, crony na planie = 0 USD) — sama kwota bez rozbicia prowokuje pytanie „za co”.
