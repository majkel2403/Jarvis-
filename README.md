# Jarvis OS

Wirtualne środowisko AI w przeglądarce — neonowy pulpit HUD sterowany przez agenta **Jarvis**, głosem lub tekstem.
Czysty HTML/CSS/JS, bez builda i bez zależności: wystarczy otworzyć `index.html` albo wdrożyć na GitHub Pages.

Zasada projektu: **nic „na niby”**. Każda karta HUD, każdy impuls, plan, sygnał i liczba w telemetrii pochodzi z realnego zdarzenia lub pomiaru.

## Co potrafi

| | |
|---|---|
| **Animacja startowa** | reaktor łukowy, siatka HUD, log rozruchu z procentem, syntezowany dźwięk, powitanie głosowe |
| **Core** | żywa kula z orbitami, wiązką i odbiciem w jeziorze; pierścienie HUD reagujące na stan (czuwam / słucham / analizuję / działam / czekam na zgodę / pauza / błąd); wokół Core **10 kart** zasilanych wyłącznie zdarzeniami Event Busa |
| **Dashboard agenta** | pasek górny: segmentowy wskaźnik trybu wprost z maszyny stanów, status Hermesa, licznik narzędzi, FPS, zegar; **Telemetria** (zwijana, `Alt+3`): pogoda, zegar, wykres aktywności agenta, FPS, pamięć, sieć, bateria, zadania, akcje, czas pracy, okna |
| **Jarvis ↔ Hermes** | mózgiem jest **Hermes Agent** (Nous Research) albo dowolny serwer OpenAI-compatible z modelem Hermes. Model dostaje w każdej turze **Context Packet** (stan pulpitu, aktywna aplikacja, widgety, notatki, zadania, minutnik, sygnały, profil) i steruje systemem przez **58 narzędzi** z Command Registry; wywołania w formacie `<tool_call>` **albo** natywnym `tool_calls` (autodetekcja) |
| **Sędzia Jev** | opcjonalny model decyzyjny **Jev** (TypeSafe AI, „System One”) przez OpenRouter: w ~200 ms ocenia intencję wypowiedzi z kalibrowaną pewnością, ryzyko działania, dwuznaczność i to, czy chodzi o aktywne okno. Wysoka pewność = wykonanie z rejestru bez czekania na Hermesa, środek = pytanie „Chodzi o…?”, reszta = Hermes z podpowiedzią `<judge>`. Rozstrzyga też, którą notatkę lub zadanie masz na myśli, weryfikuje odpowiedzi Hermesa względem wyników narzędzi (stan WERYFIKACJA) i ocenia pilność sygnałów w trybie aktywnym. Klucz OpenRouter w Ustawieniach, poziomy prywatności, autonomia z przyciskiem „Cofnij”, budżet, tryb cienia; bez klucza wszystko działa jak dotąd |
| **Command Registry** | jedno źródło prawdy: każde polecenie ma schemat, poziom ryzyka, przykłady PL i z tego samego wpisu powstają narzędzie dla modelu, wzorce silnika lokalnego, pozycja palety `Ctrl+K` i opis „co potrafisz” |
| **Silnik lokalny** | działa bez modelu: dopasowanie do przykładów z rejestru z rozumieniem czasu („za 20 minut”, „w piątek o 9”, „o osiemnastej trzydzieści”), łańcuchy („otwórz notatnik i ustaw minutnik 5 minut”), procenty, jednostki |
| **Narzędzia** | notatki (lista/odczyt/szukaj/dopisz/zmień/usuń), zadania (lista/dodaj/odhacz/przełóż/odłóż/usuń), okna (lista/aktywuj/minimalizuj/przyciągnij/kafelkuj/układy), widgety (lista/zmień/usuń), minutnik (start/stop/przedłuż/status), pogoda, kursy krypto i **alerty kursów**, kalkulator, strony WWW, schowek, ustawienia, terminal, pamięć, pliki, wskazywanie elementów, pytania do użytkownika |
| **Uprawnienia** | narzędzia ryzykowne (usuwanie, zamknięcie wszystkiego, obce adresy, schowek) wymagają zgody: chip **Tak / Nie / Zawsze** przy Core, szybkie odpowiedzi w czacie i głos; model dostaje `DENIED`, gdy odmówisz |
| **Plan i pytania** | model deklaruje plan (`<plan>`) widoczny jako lista kroków w Process Log i karcie „Logika”; przy dwuznaczności pyta (`ui_ask`) zamiast zgadywać; długie zadania wstrzymują się z pytaniem „kontynuować?” (budżet tur, narzędzi, czasu) |
| **Pamięć i ciągłość** | historia rozmowy i czat w IndexedDB (wracają po odświeżeniu), streszczenie kroczące długich rozmów, fakty o użytkowniku („zapamiętaj, że…”) wstrzykiwane do kontekstu |
| **Sygnały i proaktywność** | minutnik, przypomnienia (także zaległe po powrocie do karty), alerty kursów, zmiany połączenia trafiają do **centrum powiadomień** (`Alt+N`) i do następnej rozmowy; w trybie **aktywnym** Jarvis sam zaczyna rozmowę (limit/h, cisza nocna); rutyny: poranny briefing i podsumowanie dnia |
| **Głos 2.0** | pojedyncze nasłuchiwanie (`Ctrl+Spacja`) albo **czuwanie ze słowem „Jarvis, …”** (`Alt+J`); kolejka mowy z priorytetami, alarm nie ucina odpowiedzi; odpowiedzi na pytania głosem; cichy tryb głosowy |
| **Okna** | przeciąganie z przyciąganiem do krawędzi (podgląd), kafelkowanie, `Alt+strzałki`, `Alt+Enter`, `Alt+W` (następne), układy zapisane i presety (praca, rynek, skupienie, czysto) |
| **Process Log** | polecenie, myśli modelu, zapytania, narzędzia z argumentami i wynikami, plan, błędy, czasy; historia z eksportem i **Replay** na Core |
| **Aplikacje** | Czat (przypinanie odpowiedzi jako widget), Notatnik, Monitor rynku (Binance WebSocket + CoinGecko), Harmonogram (import `.ics`), Pogoda (Open-Meteo), Monitor systemu, Terminal, Kalkulator, Minutnik/Stoper, Ustawienia, Biblioteka |
| **Pliki** | folder roboczy przez File System Access (Chrome/Edge): lista, odczyt, zapis, eksport notatek do `.md` |
| **Wydajność** | rysowanie zatrzymane w tle, adaptacyjna jakość efektów przy niskim FPS, ping Hermesa z backoffem, WebSocket rynku pauzowany w tle, Wake Lock przy minutniku i czuwaniu |
| **PWA** | instalowalna, działa offline (service worker), powiadomienie o nowej wersji |

Wszystkie dane (notatki, zadania, ustawienia, pamięć, rozmowa) są zapisywane lokalnie w przeglądarce; można je wyeksportować i zaimportować w Ustawieniach.

## Uruchomienie

```bash
# dowolny statyczny serwer, np.:
python3 -m http.server 8080
# → http://localhost:8080
```

Plik `index.html` działa też otwarty bezpośrednio z dysku (bez PWA i trybu offline).

## Wdrożenie

Workflow `.github/workflows/pages.yml` publikuje stronę na **GitHub Pages** przy każdym pushu na `main`.
Jednorazowo: *Settings → Pages → Build and deployment → Source: GitHub Actions*.
Adres: `https://<użytkownik>.github.io/<repozytorium>/`.

## Podłączenie Hermesa

Jarvis rozmawia z Hermesem przez API zgodne z OpenAI (`/v1/chat/completions`, strumień SSE). Konfiguracja: **Ustawienia → Hermes · Nous Research**.

### Hermes Agent (domyślnie)

1. Zainstaluj [Hermes Agent](https://github.com/NousResearch/hermes-agent) i skonfiguruj dostawcę modelu (np. `hermes setup --portal`).
2. W `~/.hermes/.env` włącz serwer API i zezwól stronie Jarvisa na połączenie:
   ```bash
   API_SERVER_ENABLED=true
   API_SERVER_KEY=twój-tajny-klucz
   API_SERVER_CORS_ORIGINS=https://majkel2403.github.io   # adres, pod którym otwierasz Jarvis OS
   ```
3. Uruchom `hermes gateway` (serwer nasłuchuje na `http://localhost:8642`).
4. W Jarvis OS wpisz ten sam klucz i kliknij **Połącz i testuj** — test sprawdza połączenie i wykrywa format narzędzi.

Postęp narzędzi agenta (`hermes.tool.progress`) pojawia się w czacie i w karcie „Dane zewnętrzne”. (Nagłówek `X-Hermes-Session-Key` nie jest wysyłany: Hermes Agent 0.21 nie dopuszcza go w CORS, więc zapytanie z przeglądarki zostałoby zablokowane.)

### Hermes Desktop — natywne narzędzia przez most MCP (zalecane, Windows bez WSL)

Hermes Agent **ignoruje** pole `tools` z zapytania klienta, więc najpewniejsza droga to narzędzia MCP. Most `bridge/jarvis_bridge.py` wystawia Hermesowi **wszystkie polecenia z Command Registry** jako `mcp__jarvis_desktop__*` (te same schematy, walidacja, zgody Tak / Nie / Zawsze i Process Log co przy poleceniach lokalnych). Pętlę narzędzi prowadzi Hermes; wynik każdego narzędzia wraca do niego jako koperta `{ok, code, data, text}`.

```
Jarvis OS (przeglądarka) ──SSE /bridge/events──┐
   ▲   wynik POST /bridge/result               │
   │   schematy POST /bridge/tools     bridge/jarvis_bridge.py  (127.0.0.1:8651)
   │                                    ▲ MCP streamable HTTP /mcp  (Bearer token)
   └── chat ──► Hermes gateway (profil jarvis-desktop, :8643) ─┘
```

1. **Most:** `bridge\start-bridge.bat` (zostaw uruchomiony). Token jest w `%USERPROFILE%\.jarvis-os\bridge-token`; strona pobiera go sama (parowanie tylko dla dozwolonego Origin).
2. **Profil Hermesa:** `powershell -ExecutionPolicy Bypass -File hermes\install-profile.ps1 -DryRun`, potem bez `-DryRun` (opcjonalnie `-LoginXai` dla Groka). Klonuje aktywny profil **bez kanałów**, ustawia MCP, lekki zestaw narzędzi (`memory`, `web`, `session_search`, `jarvis_desktop`; bez skilli, terminala i plików), `.env` i `SOUL.md`. Twój obecny gateway nie jest zmieniany.
3. **Gateway:** `hermes\start-desktop-gateway.bat` (API na `:8643`).
4. **Jarvis OS:** *Ustawienia → Hermes → „Hermes Desktop (profil jarvis-desktop + most MCP)”*, wpisz `API_SERVER_KEY` profilu — albo lokalnie w `config.local.js` (`hermesProvider: 'desktop'`, `hermesKey`). Tryb MCP włącza się sam, gdy profil zgłosi się do mostu (*Ustawienia → Most pulpitu dla Hermesa*).

Lista narzędzi, którą Hermes widzi od startu, to migawka `bridge/tools.json`. Po zmianie `js/commands.js` odśwież ją: `node bridge/export-tools.js` (test jednostkowy pilnuje zgodności); otwarta karta i tak zgłasza mostowi aktualne schematy, a Hermes zobaczy zmianę po restarcie gatewaya. Test mostu (symulowana karta + prawdziwy klient MCP): `%USERPROFILE%\.hermes\hermes-agent\venv\Scripts\python.exe bridge\test_bridge.py`. Autostart mostu i gatewaya (opcjonalnie): `bridge\install-autostart.ps1`.

> **Bezpieczeństwo mostu:** nasłuchuje tylko na `127.0.0.1`; `/mcp` wymaga tokenu Bearer, kanał przeglądarki — tokenu i dozwolonego Origin (CORS + Private Network Access); polecenia trafiają do widocznej / ostatnio aktywnej karty.

### Inne źródła modelu Hermes

| Tryb | Adres | Model | Narzędzia |
|---|---|---|---|
| Nous Portal | `https://inference-api.nousresearch.com/v1` | `Hermes-4-405B`, `Hermes-4-70B` | `<tool_call>` |
| Ollama / LM Studio / vLLM | np. `http://localhost:11434/v1` | np. `hermes3` (Ollama: ustaw `OLLAMA_ORIGINS` na adres Jarvisa) | natywne `tool_calls` lub `<tool_call>` (auto) |

Klucz jest przechowywany wyłącznie w `localStorage` tej przeglądarki (eksport kopii zapasowej go pomija). Gdy Hermes nie odpowiada lub odrzuca klucz, polecenie wykonuje lokalny silnik, a w czacie pojawia się ostrzeżenie. `Esc` przerywa generowanie odpowiedzi.

### Jak model „widzi” Jarvis OS

Każda wiadomość użytkownika jest poprzedzona blokiem `<environment>{…}</environment>` — zwięzłym JSON-em ze stanem środowiska, wysyłanym jako różnica względem poprzedniej tury. Wyniki narzędzi wracają jako `{name, ok, code, data, text}` z kodami `OK · NOT_FOUND · AMBIGUOUS · INVALID_ARGS · DENIED · DUPLICATE · OFFLINE · TIMEOUT · UNSUPPORTED · INTERNAL`, a prompt systemowy zawiera reguły groundingu (nie twierdź, że coś zrobiłeś, bez `ok=true`; odczytaj przed zmianą; pytaj przy dwuznaczności). Szczegóły i schematy: [docs/ROADMAP.md](docs/ROADMAP.md).

### OpenRouter — jeden klucz dla mózgu i sędziego

W **Ustawienia → OpenRouter** (także w onboardingu) wklej klucz z [openrouter.ai/keys](https://openrouter.ai/keys) i zaznacz, do czego go użyć:

- **Mózg: Hermes 4 przez OpenRouter** — model `nousresearch/hermes-4-70b` w chmurze (natywne `tool_calls`), bez lokalnego gatewaya;
- **Sędzia: Jev** — model decyzyjny TypeSafe.

„Zapisz i testuj” wykonuje prawdziwe wywołania obu usług i pokazuje wynik. Klucz zostaje wyłącznie w tej przeglądarce (eksport kopii go pomija).

### Jev (OpenRouter)

Jev to szybki „sędzia”: przy każdym zdaniu w ~200 ms decyduje, co zrobić. Pełny opis i decyzje: [docs/JEV-PLAN.md](docs/JEV-PLAN.md).

1. Klucz z [openrouter.ai/keys](https://openrouter.ai/keys) wklej w **Ustawienia → Sędzia Jev**, kliknij **Połącz i testuj**.
2. **Jak działa (zasady w skrócie):**
   - Odczyty i nawigacja (otwórz, pokaż, wróć) — pewne zdania wykonuje parser od razu; niepewne rozstrzyga Jev.
   - Zapisy, które da się cofnąć (dodaj zadanie, notatka, minutnik…) — Jev wykonuje sam od pewności 0,92 i pokazuje przycisk **Cofnij** (8 s; „cofnij” działa też głosem i z klawiatury).
   - Niepewne — pytanie „Chodzi o…?”. Nieodwracalne (usuwanie, terminal, schowek) — zawsze zgoda, jeśli polecenie pochodzi od modelu lub głosu.
   - Jev sprawdza też, czy to, co robi Hermes, jest zgodne z Twoją prośbą (strażnik), czy treść z notatek nie zawiera podszytych instrukcji, czy fakt do zapamiętania nie jest poufny i jak rozumieć odpowiedź „no dobra”.
3. **Ustawienia:** poziom prywatności (P0 tylko zdanie · P1 + okna i dzisiejsze zadania · P2 + tytuły i profil), samodzielność (odczyty i zapisy / tylko odczyty / zawsze pytaj), progi, budżet miesięczny (domyślnie 5 USD), tryb cienia (Jev tylko liczy i zapisuje), dziennik decyzji (eksport, lokalnie), reset uczenia się (dwa odrzucenia w dobie podnoszą próg polecenia o 0,05), lżejszy model do zwykłej rozmowy.
4. **Awarie:** trzy błędy z rzędu wstrzymują Jeva (bezpiecznik), polecenia działają dalej przez parser i Hermesa. Zły klucz — długa pauza z powodem.
5. **Pomiar (do zrobienia z kluczem):** sonda mierzy trafność na 447 zdaniach, krzywą zaufania i koszt, i pisze raport do `tests/reports/`:
   ```bash
   OPENROUTER_API_KEY=sk-or-... node tests/jev-probe.js            # pomiar
   OPENROUTER_API_KEY=sk-or-... node tests/jev-probe.js --e1       # dwa etapy zamiast płaskiego wyboru
   OPENROUTER_API_KEY=sk-or-... node tests/jev-probe.js --e3       # bez kontekstu pulpitu
   OPENROUTER_API_KEY=sk-or-... node tests/jev-probe.js --contract # czy format odpowiedzi się nie zmienił
   ```
   To samo robi workflow **Jev — test kontraktowy i sonda** (nocny test kontraktowy, ręcznie pełna sonda) — wymaga sekretu `OPENROUTER_API_KEY` w repozytorium. Progi w Ustawieniach są na razie ostrożnymi hipotezami, dopóki sonda nie zostanie uruchomiona z prawdziwym kluczem.
6. Endpoint: `POST https://openrouter.ai/api/v1/systemone`, model `typesafe/jev-1.13`; pytania `choice` / `noul` / `score`. Koszt: tokeny wyjściowe darmowe, wejściowe ok. 0,04 $ za milion (jedna decyzja ≈ 0,0001 $).

## Internet i prawdziwy komputer przez Jeva

Jarvis potrafi, przez model decyzyjny **Jev** (TypeSafe „System One”, decyzja w ok. 300 ms), sterować dwiema rzeczami poza swoim pulpitem. Oba źródła to cudze repozytoria, wdrożone bez zmian w kodzie (dwie drobne poprawki: `integrations/patches`):

| | Repozytorium | Co robi | Jak mówisz |
|---|---|---|---|
| **Internet** | [moritzkremb/jev-voice-browser](https://github.com/moritzkremb/jev-voice-browser) | prawdziwy **Google Chrome** (osobna instancja z własnym profilem `%USERPROFILE%\.jarvis-os\chrome-profile`, podpięta przez CDP — Twoje zwykłe okna i logowania nietknięte; bez Chrome'a Chromium z Playwrighta; `JARVIS_WEB_BROWSER=chrome\|chromium\|auto`): zdanie → Jev wybiera intencję i element strony → klik / wpisanie / przewinięcie / nawigacja | „**w przeglądarce** wejdź na wikipedię”, „w przeglądarce wyszukaj zielone jabłka”, „w przeglądarce kliknij pierwszy wynik”, „w przeglądarce przeczytaj stronę” |
| **Prawdziwy komputer** | [awlevin/typesafe-computer-use](https://github.com/awlevin/typesafe-computer-use) | czyta ekran Windows (UI Automation + OCR), Jev wybiera akcję, program klika i pisze na PRAWDZIWYM pulpicie, aż cel zostanie osiągnięty | „**na komputerze** otwórz notatnik”, „w Windows uruchom kalkulator”; stop: „zatrzymaj komputer” |
| **Wewnątrz** (okna, notatki, widgety Jarvis OS) | — | jak dotąd, zwykłe polecenia rejestru (sędzia Jev routuje je bez czekania na Hermesa) | „otwórz notatnik”, „ułóż okna” |

**Przykład dla laika:** „Jarvis, w przeglądarce wyszukaj pogodę w Krakowie i kliknij pierwszy wynik” → Jarvis otwiera osobne okno Chromium, Jev dopasowuje polecenie do elementów strony, kilka sekund i gotowe. „Jarvis, na komputerze otwórz Notatnik i wpisz cześć” → Jarvis **najpierw pyta o zgodę**, potem sam przejmuje mysz i klawiaturę.

**Jak to działa:** polecenia to zwykłe wpisy Command Registry (`js/agents.js`: `web_command`, `web_read`, `computer_use`, `computer_status`, `computer_stop`, `agents_status`), więc mają tę samą walidację, zgody i Process Log co reszta, a Hermes (przez most MCP) widzi je jako narzędzia. Zdania po polsku są tłumaczone deterministycznie na angielskie komendy Jeva (treść zapytania i etykiety zostają dosłownie); domena albo adres otwiera się od razu, bez pytania Jeva. Most (`bridge/agents.py`) uruchamia agenta WWW przy pierwszym użyciu i pilnuje procesów: po zamknięciu mostu (także „na twardo”) system zabija agenta, Chromium i ewentualne zadanie sterujące myszą.

```
„w przeglądarce…” ─► registry (PL→EN) ─► most :8651 ─► agent WWW :8788 ─► Jev ─► Playwright (Chromium)
„na komputerze…”  ─► registry + ZGODA ─► most ─► clicker (uv) ─► UI Automation + OCR ─► Jev ─► mysz/klawiatura
```

### Instalacja (Windows, bez WSL)
1. `powershell -ExecutionPolicy Bypass -File integrations\setup.ps1` — pobiera oba repozytoria na przypięte, przetestowane wersje do `%USERPROFILE%\.jarvis-os\vendor`, nakłada poprawki, instaluje zależności (Node 20+, `uv` i Chromium już masz z Hermesem/Playwrightem).
2. `powershell -ExecutionPolicy Bypass -File integrations\set-key.ps1` — wpisujesz klucz w ukrytym polu; trafia tylko do `%USERPROFILE%\.jarvis-os\jev.env` (dostęp tylko dla Twojego konta). **Jeden klucz OpenRouter** ([openrouter.ai/keys](https://openrouter.ai/keys)) obsługuje Jeva wszędzie: agenta WWW, sterowanie komputerem i sędziego Jev w samym Jarvisie. **OpenRouter służy wyłącznie Jevowi** (`typesafe/jev-1.13`) — nigdy modelom pomocniczym ani Hermesowi (ten jedzie na Grokach z subskrypcji xAI). Można też użyć klucza TypeSafe (`-Provider typesafe`). Model pomocniczy do **wpisywania tekstu** przy sterowaniu komputerem (writer) też nie idzie przez OpenRouter: domyślnie jest nim **Twój Hermes** (profil `jarvis-desktop`, Grok z subskrypcji xAI; `set-key.ps1 -Writer hermes`) — sprawdzone: poprawny JSON i polskie teksty, 4–11 s na wywołanie, używany tylko do wpisywania tekstu i odpowiedzi końcowej, bez wysyłania zrzutów ekranu. Alternatywy: `-Writer anthropic` (klucz Anthropic) albo `-Writer none` (komputer tylko klika).
3. `bridge\start-bridge.bat` (most) i `hermes\start-desktop-gateway.bat` — po zmianie liczby narzędzi zrestartuj gateway, żeby Hermes je zobaczył.
4. `powershell -ExecutionPolicy Bypass -File integrations\doctor.ps1 -Live` — pokazuje, co działa, a co nie, i robi jedno prawdziwe zapytanie do Jeva (ułamek grosza), mierząc opóźnienie.

### Bezpieczeństwo agentów
- **Prawdziwy komputer: każde zadanie wymaga Twojej zgody** (także polecenie wpisane ręcznie; „Zawsze zezwalaj” jest tu wyłączone). Przerwanie w każdej chwili: klawisz **Esc**, „zatrzymaj komputer” albo **mysz w lewy górny róg ekranu**. Limit kroków (domyślnie 25, maks. 60) i twardy limit czasu. Podczas zadania nie dotykaj myszy — program o nią walczy.
- **Internet:** działania nieodwracalne (kup, wyślij, usuń, opublikuj) Jev oznacza jako ryzykowne, a Jarvis pyta o zgodę; niejednoznaczny element → pytanie „który?” z numerami. Osobny profil przeglądarki (`%USERPROFILE%\.jarvis-os\web-profile`) — bez Twoich sesji i haseł; nie loguj się tam na konta, którymi nie chcesz sterować.
- **Treść stron to dane niezaufane:** `web_read` oznacza ją tak dla Hermesa, a jego instrukcje (`hermes/SOUL.md`) zabraniają wykonywania poleceń zaszytych w stronach.
- Agent WWW nasłuchuje tylko na `127.0.0.1`, wymaga tokenu mostu i **odrzuca żądania pochodzące ze stron** (nagłówki `Origin`/`Host`). Celowo nie uruchamiamy panelu z mikrofonem ani gniazda WebSocket z repozytorium autora — gniazdo na `127.0.0.1` jest dostępne z dowolnej strony otwartej w Twojej przeglądarce.
- Zrzuty ekranu z zadań (`%USERPROFILE%\.jarvis-os\runs`) mogą zawierać prywatne dane — most zostawia tylko 5 ostatnich uruchomień.
- Znane ograniczenia: autor określa wsparcie Windows jako eksperymentalne; OCR czyta jeden język (u Ciebie polski, ustawiany w `jev.env`); tylko główny monitor; program widzi tylko okno na pierwszym planie (bez paska zadań i menu Start) i ma tylko akcje: klik, wpisanie, przewinięcie, Esc, Enter, wstecz, czekaj, oraz nasze „uruchom program z listy” — bez skrótów klawiszowych; Comet/Chrome nie publikują drzewa UI Automation, więc w przeglądarce działa OCR.

### Poprawki agenta przeglądarki (`integrations/web/agent.mjs`)
Badanie na prawdziwej Wikipedii (ten sam scenariusz: otwórz → szukaj → kliknij → przewiń → wstecz, z prawdziwym Jevem):

| Problem | Poprawka | Efekt |
|---|---|---|
| Elementy są znakowane atrybutem w chwili zrzutu, a nowoczesne strony (Vue/React) odtwarzają węzły — Playwright czekał 6–30 s na nieistniejący element | samoleczenie: sprawdzenie przed akcją, odświeżenie zrzutu, znalezienie tego samego elementu pod nowym id; gdy pola wyszukiwania brak — wyszukiwarka, jak u autora | scenariusz **40 s → 7 s**, bez wiszących poleceń |
| Domyślny limit czasu Playwrighta 30 s | limit akcji 6 s (`JARVIS_WEB_ACTION_TIMEOUT`) | szybka, czytelna porażka |
| Wolniejszy start Chromium z Playwrighta | prawdziwy Google Chrome przez CDP, własny profil | start 3,9 s → 1,1 s |
| Chrome ma pamięć podręczną „wstecz/dalej”, na którą `goBack` czekał 15 s | `--disable-features=BackForwardCache` (Playwright robi tak w swoim Chromium) | „wstecz” 18 s → 1 s |
| Wynik i następne polecenie widziały stronę sprzed wysłania formularza | czekanie na nawigację po Enter | poprawny adres i treść |

### Rozszerzenia dla Windows (`integrations/computer/jarvis_clicker.py`)
Wynik badań programu autora na Windows 11 (polski system, 125% skalowania). Dodatek nakłada poprawki w locie, bez zmian w kodzie autora (43 testy: `uv run --project %USERPROFILE%\.jarvis-os\vendor\typesafe-computer-use python -m pytest integrations/computer`):

| Problem znaleziony w programie | Poprawka | Efekt (zmierzony) |
|---|---|---|
| Brak akcji „uruchom program”; widoczne jest tylko okno na pierwszym planie, więc z przeglądarki Jarvisa nie dało się otworzyć niczego | akcja `open_app` z **katalogiem** (Notatnik, Kalkulator, Eksplorator plików, Paint, Ustawienia; bez terminali i skryptów), wybór przez Jeva, pewne wysunięcie okna na pierwszy plan | „otwórz Notatnik” po polsku: Jev 0,84, krok 2,9 s (wcześniej: nie do wykonania) |
| Odczyt adresu przeglądarki przeszukiwał drzewo UI w Pythonie na **każdym kroku, także przy Notatniku** (2,9–3,2 s) i szukał tylko angielskiego „address” — na polskim Chrome/Comet nigdy nic nie zwracał | natywne wyszukiwanie UI Automation + pamięć podręczna 5 s, nazwa paska także po polsku | odczyt 0,04 s zamiast 2,9 s; krok 4,4 s → 1–3 s |
| Edytory (Notatnik i inne „Document”) miały pustą rolę, więc `type_text` odmawiał mimo kursora w polu | edytowalny Document/Custom z zapisywalną wartością = pole tekstowe | pisanie w polu działa (Jev 0,99) |
| `type_text` **zastępuje całą zawartość pola** — w Notatniku z odtworzoną sesją skasowałby Twój niezapisany dokument | odmowa dla niepustych pól wieloliniowych (po roli, znaku nowej linii, długości, wysokości); nowa pusta karta po uruchomieniu Notatnika z tekstem; `JARVIS_CLICKER_OVERWRITE=1` znosi ochronę | sprawdzone na żywo: edytor z tekstem nietknięty |
| Wpisywanie po jednym zdarzeniu z przerwą 40 ms (80 ms na znak, 200 znaków = 16 s) | porcje po 32 znaki jednym `SendInput`, przerwanie (mysz w rogu) sprawdzane między porcjami | kilkadziesiąt razy szybciej |
| Końcowa weryfikacja modelem pomocniczym (u nas ~9 s przez Hermesa) także dla prostych zadań | „szybkie done”: gdy Jev ≥ 90% pewny, a cel jest do WYKONANIA (nie „ile/znajdź/sprawdź”), pomijamy weryfikację (`JARVIS_CLICKER_QUICK_DONE=0` włącza ją zawsze) | „otwórz Notatnik” 19 s → ~10 s |
| Uruchomienie programu „na próbę” przy niskiej pewności (zaobserwowane po odmowie pisania) | `open_app` wymaga pewności ≥ 0,7 (`JARVIS_CLICKER_OPEN_APP_MIN`) | brak niechcianych programów |
| Przeglądarka zakładana na sztywno jako „Google Chrome”, a zwykły `chrome.exe` może być Twoim prywatnym oknem | most wykrywa domyślną przeglądarkę z rejestru (u Ciebie Comet) | — |

## Skróty klawiszowe

| Skrót | Akcja |
|---|---|
| `Ctrl K` / `/` | paleta poleceń (dopasowanie rozmyte, ostatnie, wykonanie polecenia lokalnego) |
| `Ctrl Spacja` | mów do Jarvisa |
| `Alt J` | czuwanie ze słowem wybudzającym „Jarvis” |
| `Alt 1` / `Alt 2` / `Alt 3` | czat / Process Log / telemetria |
| `Alt N` | centrum powiadomień |
| `Alt W` | następne okno · `Alt ←→↑↓` przyciągnij okno · `Alt Enter` maksymalizuj |
| `Esc` | zamknij okno / panel / anuluj pytanie / przerwij mowę |
| Prawy przycisk | menu kontekstowe pulpitu i skrótów |

## Testy

```bash
node --test "tests/unit/*.test.js"     # rejestr, silnik lokalny, NLP, kalkulator, parsery Hermesa, reduktor, kontekst, ICS
node tests/e2e/smoke.js http://localhost:8090   # Chromium (Playwright): boot → polecenia → zgody → pytania → trwałość
node --test integrations/tests/web-agent.test.mjs   # agent WWW: prawdziwy Chromium + atrapa Jeva (bez klucza i internetu)
%USERPROFILE%\.hermes\hermes-agent\venv\Scripts\python.exe bridge\test_agents.py   # most: agenci, zadania na komputerze (atrapa), pełny łańcuch
```

Workflow `.github/workflows/ci.yml` uruchamia oba zestawy przy każdym pushu.

## Struktura

```
index.html            szkielet interfejsu
css/jarvis.css        wygląd i animacje (neon HUD)
js/core.js            stan, dźwięk, głos (kolejka, czuwanie), menedżer okien, układy
js/events.js          Event Bus, maszyna stanów agenta
js/store.js           IndexedDB (historia, pamięć, sygnały, uchwyty plików)
js/registry.js        Command Registry: schematy, koercja, uprawnienia, dopasowanie PL, NLP czasu
js/commands.js        wszystkie polecenia / narzędzia modelu
js/context.js         Context Packet, sygnały, proaktywność, rutyny, przypomnienia, pamięć
js/judge.js           sędzia Jev (OpenRouter): pytania, prywatność P0–P2, bezpiecznik, budżet, dziennik
js/jev-policy.js      czysta logika Jeva: poziomy autonomii, tabela routingu R1–R14, progi adaptacyjne, heurystyki
js/jev-flow.js        ścieżka polecenia: parser → Jev → dopytanie → wykonanie (wartości z listy, brakujące argumenty)
js/undo.js            stos „Cofnij” i historia nawigacji („wróć”)
js/ai.js              silnik lokalny + pętla Hermesa (dwa transporty + tryb MCP, plan, pytania, budżety, streszczenia)
js/bridge.js          klient mostu MCP: polecenia Hermesa (SSE) → Command Registry, publikacja schematów
js/agents.js          internet i prawdziwy komputer przez Jeva: polecenia web_* i computer_*, tłumaczenie PL→EN, zgody
js/process.js         Process Log (kroki, plan, historia, replay)
js/apps.js            usługi (pogoda, rynek, zadania, ICS) i aplikacje
js/widgets.js         widgety pulpitu
js/hud.js             10 kart HUD wokół Core
js/dash.js            wskaźnik trybu, pasek statusu, telemetria
js/main.js            start, efekty, pulpit, dok, paleta, pytania/zgody, powiadomienia, onboarding, skróty
sw.js                 service worker (offline)
tests/                testy jednostkowe (Node) i dymne (Playwright)
bridge/               most MCP (Python), agents.py (agent WWW + sterowanie komputerem), migawka narzędzi tools.json, testy
integrations/         wdrożenie agentów Jeva: setup.ps1, set-key.ps1, doctor.ps1, agent WWW (web/agent.mjs), poprawki, testy
hermes/               profil jarvis-desktop: SOUL.md, apply_profile.py, install-profile.ps1, start-desktop-gateway.bat
docs/ROADMAP.md       plan rozwoju i stan realizacji
```

## Bezpieczeństwo i prywatność

- **Klucze API** zostają tylko w tej przeglądarce (`localStorage`). Model nigdy ich nie dostaje (narzędzie ustawień je pomija), a eksport kopii zapasowej je usuwa.
- **Klucz w adresie:** używaj `index.html#jevKey=sk-or-…&jevOn=1` (po znaku `#`). Ta część adresu nie jest wysyłana do serwera strony. Wariant z `?` nadal działa, ale adres z `?` trafia do serwera hostingu, więc program ostrzeże, że warto wygenerować nowy klucz. Najbezpieczniejszy jest lokalny plik `config.local.js`.
- **Sędzia Jev** działa domyślnie na poziomie prywatności P1: nie dostaje tytułów notatek, widgetów ani profilu (to dopiero P2), widzi zdanie, aktywną aplikację, otwarte okna i dzisiejsze zadania. Poziom zmienisz w Ustawieniach.
- **Ryzykowne działania** (usuwanie, zamykanie wszystkich okien, obce adresy, schowek) wymagają zgody, gdy prosi o nie model albo gdy wydajesz polecenie **głosem**. Wpisane ręcznie polecenie jest wykonywane od razu.
- **Zapis danych:** gdy przeglądarka odmówi zapisu (brak miejsca, tryb prywatny), Jarvis ostrzega jednorazowo zamiast milczeć.
