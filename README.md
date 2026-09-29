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
| **Sędzia Jev** | opcjonalny model decyzyjny **Jev** (TypeSafe AI, „System One”) przez OpenRouter: w ~200 ms ocenia intencję wypowiedzi z kalibrowaną pewnością, ryzyko działania, dwuznaczność i to, czy chodzi o aktywne okno. Wysoka pewność = wykonanie z rejestru bez czekania na Hermesa, środek = pytanie „Chodzi o…?”, reszta = Hermes z podpowiedzią `<judge>`. Rozstrzyga też, którą notatkę lub zadanie masz na myśli, weryfikuje odpowiedzi Hermesa względem wyników narzędzi (stan WERYFIKACJA) i ocenia pilność sygnałów w trybie aktywnym. Klucz OpenRouter w Ustawieniach, tryb prywatny, progi pewności; bez klucza wszystko działa jak dotąd |
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

1. Klucz z [openrouter.ai/keys](https://openrouter.ai/keys) wklej w **Ustawienia → Sędzia Jev**, kliknij **Połącz i testuj** (prawdziwe wywołanie z polskim zdaniem, pokazuje latencję i koszt).
2. Sonda z terminala mierzy trafność intencji na 80 polskich wypowiedziach i sprawdza, czy próg „wykonaj bez pytania” jest bezpieczny:
   ```bash
   OPENROUTER_API_KEY=sk-or-... node tests/jev-probe.js
   ```
3. Endpoint: `POST https://openrouter.ai/api/v1/systemone`, model `typesafe/jev-1.13`; pytania typu `choice` / `noul` / `score`, stan = zwięzły obraz pulpitu (bez treści notatek). Koszt: tokeny wyjściowe darmowe, wejściowe ok. 0,04 $ za milion.

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
js/judge.js           sędzia Jev (OpenRouter): intencja, ryzyko, dwuznaczność, weryfikacja, pilność
js/ai.js              silnik lokalny + pętla Hermesa (dwa transporty + tryb MCP, plan, pytania, budżety, streszczenia)
js/bridge.js          klient mostu MCP: polecenia Hermesa (SSE) → Command Registry, publikacja schematów
js/process.js         Process Log (kroki, plan, historia, replay)
js/apps.js            usługi (pogoda, rynek, zadania, ICS) i aplikacje
js/widgets.js         widgety pulpitu
js/hud.js             10 kart HUD wokół Core
js/dash.js            wskaźnik trybu, pasek statusu, telemetria
js/main.js            start, efekty, pulpit, dok, paleta, pytania/zgody, powiadomienia, onboarding, skróty
sw.js                 service worker (offline)
tests/                testy jednostkowe (Node) i dymne (Playwright)
bridge/               most MCP (Python), migawka narzędzi tools.json, testy, atrapa gatewaya
hermes/               profil jarvis-desktop: SOUL.md, apply_profile.py, install-profile.ps1, start-desktop-gateway.bat
docs/ROADMAP.md       plan rozwoju i stan realizacji
```
