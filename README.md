# Jarvis OS

Wirtualne środowisko AI w przeglądarce — holograficzny pulpit sterowany przez asystenta **Jarvis**, głosem lub tekstem.
Czysty HTML/CSS/JS, bez builda i bez zależności: wystarczy otworzyć `index.html` albo wdrożyć na GitHub Pages.

## Co potrafi

| | |
|---|---|
| **Animacja startowa** | sekwencja „reaktora łukowego”, log rozruchu i syntezowany dźwięk (głos nie startuje sam — rozmowę zaczynasz Ty) |
| **Orb Jarvisa** | żywa fala dźwiękowa reagująca na mikrofon i mowę, stany: słucham / analizuję / mówię / uwaga; najechanie pokazuje panel telemetrii na żywo |
| **Sterowanie głosem** | kliknij orb lub `Ctrl + Spacja` i mów po polsku (Chrome / Edge); Jarvis odpowiada syntezatorem mowy |
| **Hermes (Nous Research)** | mózgiem Jarvisa jest **Hermes Agent** (lub model Hermes z Nous Portal / Ollama). Rozumie dowolne polecenia i **sam steruje systemem** wywołaniami funkcji w natywnym formacie Hermes `<tool_call>` (otwiera okna, tworzy notatki, zadania, minutniki, skróty, zmienia motyw…); narzędzia serwerowe Hermes Agent (wyszukiwanie, terminal, pamięć) działają równolegle i są widoczne w czacie |
| **Tryb lokalny** | gdy Hermes jest wyłączony lub nieosiągalny, działa wbudowany silnik poleceń: „otwórz notatnik”, „zanotuj: …”, „przypomnij mi o 18:00 trening”, „minutnik 5 minut”, „pogoda w Krakowie”, „kurs bitcoina”, „oblicz 15% z 2400”, „motyw fiolet”, „otwórz YouTube”… |
| **Układ 3 paneli** | po lewej **czat z Jarvisem**, w środku **główny pulpit**, po prawej **Process Log** (wysuwa się, gdy Jarvis pracuje) |
| **Process Log** | log tylko bieżącego zadania: polecenie, myśli modelu, zapytania do Hermesa, wywołania narzędzi z argumentami, wynikami, błędami i czasem; zakończone zadania trafiają do **historii** (eksport .json, przypięcie wyniku na pulpit) |
| **Visual Engine** | Core jest żywym monitorem stanu: **Event Bus** (`js/events.js`, zdarzenia z `task_id`: `task.*`, `model.*`, `tool.*`) → maszyna stanów (IDLE · LISTENING · THINKING · EXECUTING · COMPLETED · ERROR) → renderer. W spoczynku: szklana kula z orbitami, wiązką i odbiciem w jeziorze. Gdy trwa zadanie, wokół Core pojawia się **10 kart HUD** (`js/hud.js`: Model AI, Analiza polecenia, Tool Calls, Internet, Dane zewnętrzne, Pliki, Status systemu, Wykonywanie, Logika, Zakończenie) połączonych liniami obwodów. Każda karta i każdy impuls pochodzi z realnego zdarzenia (fala Model AI = faktycznie odebrane znaki ze strumienia); brak zdarzenia = karta przygaszona, linia pusta. Nic nie jest animowane „na niby” |
| **Replay** | w Process Log przy zakończonym zadaniu: „▶ Replay” odtwarza jego przebieg (węzły, przepływ) na Core |
| **Skróty** | `Alt+1` czat · `Alt+2` Process Log · `Ctrl+K` paleta · `Esc` przerwij |
| **Widgety** | Notatka, Lista, Wynik zadania, Kalkulator oraz **na żywo**: Zegar (dowolna strefa czasowa), Pogoda, Kursy krypto, Odliczanie do daty, Pasek postępu — wiele naraz, przesuwalne; tworzone z docka, menu prawym przyciskiem, palety `Ctrl+K` lub przez Jarvisa (`create_widget`). **Zapisują się** wraz z pozycją i stanem paneli (czat schowany, log przypięty) |
| **Okna** | przeciąganie, zmiana rozmiaru, minimalizacja do doku, maksymalizacja (dwuklik), pamięć pozycji. Jarvis steruje nimi sam: `window_control` (focus / minimize / maximize / restore / close) i `arrange_windows` (kafelki, kaskada, pokaż pulpit) — także głosem: „ułóż okna”, „ułóż okna kaskadą” |
| **Aplikacje** | Czat, Notatnik (autozapis, eksport, czytanie na głos), Monitor rynku (Binance WebSocket na żywo + CoinGecko), Harmonogram z przypomnieniami, Pogoda (Open-Meteo, geolokalizacja), Monitor systemu (FPS, pamięć, bateria, sieć), Terminal, Kalkulator, Minutnik/Stoper, Ustawienia, Biblioteka |
| **Paleta poleceń** | `Ctrl + K` lub `/` — aplikacje, akcje, notatki, skróty, pytanie do Jarvisa |
| **Pulpit** | własne skróty (aplikacje lub strony WWW), menu kontekstowe pod prawym przyciskiem, tapety, 7 motywów kolorystycznych, tryb skupienia |
| **PWA** | instalowalna aplikacja, działa offline (service worker) |

Wszystkie dane (notatki, zadania, ustawienia) są zapisywane lokalnie w przeglądarce; można je wyeksportować i zaimportować w Ustawieniach.

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
4. W Jarvis OS wpisz ten sam klucz i kliknij **Połącz i testuj**.

Jarvis wysyła nagłówek `X-Hermes-Session-Id`, więc pamięć długoterminowa Hermesa jest przypisana do tej przeglądarki. Postęp narzędzi agenta (`hermes.tool.progress`) pojawia się w czacie jako „⚡ Hermes: …”.

### Inne źródła modelu Hermes

| Tryb | Adres | Model |
|---|---|---|
| Nous Portal | `https://inference-api.nousresearch.com/v1` | `Hermes-4-405B`, `Hermes-4-70B` |
| Ollama / LM Studio / vLLM | np. `http://localhost:11434/v1` | np. `hermes3` (Ollama: ustaw `OLLAMA_ORIGINS` na adres Jarvisa) |

Klucz **nigdy nie jest częścią kodu ani repozytorium** — wpisujesz go w Ustawieniach, trafia wyłącznie do `localStorage` tej przeglądarki (eksport kopii zapasowej go pomija). Hermes Agent uruchamiaj natywnie w Windows (nie przez WSL). Gdy Hermes nie odpowiada lub odrzuca klucz, polecenie wykonuje lokalny silnik, a w czacie pojawia się ostrzeżenie. `Esc` przerywa generowanie odpowiedzi.

## Jak Jarvis steruje pulpitem (architektura)

Każde polecenie przechodzi przez trzy warstwy (`js/ai.js`):

1. **Szybka ścieżka lokalna** — jednoznaczne polecenia sterowania pulpitem („stwórz widget listy zakupów: mleko, chleb”, „ułóż okna obok siebie”, „zminimalizuj notatnik”, „otwórz kalkulator”, „zanotuj…”, „minutnik 5 minut”) wykonuje od razu silnik lokalny (~30 ms), bez pytania Hermesa. Pytania (kończące się `?`), rozmowa, wiedza, pogoda i kursy idą do Hermesa. Wyłączysz to w *Ustawienia → Szybkie polecenia pulpitu*.
2. **Hermes z natywnymi narzędziami (MCP) — zalecane.** Most `bridge/jarvis_bridge.py` udostępnia Hermesowi **29 prawdziwych narzędzi MCP** `mcp__jarvis_desktop__*` (okna i przyciąganie, 9 typów widgetów z edycją, notatki z CRUD, zadania, pomodoro, rutyny/makra, briefing dnia, wyszukiwanie, efekty, mowa, powiadomienia, `get_desktop_state`). Hermes woła je natywnym function calling, a wynik (albo błąd z podpowiedzią) wraca do agenta — bez parsowania tekstu.
3. **Tryb awaryjny „prompt”** — gdy most nie działa lub profil Hermesa go nie używa, klient dostaje długi prompt z zasadami i przykładami, a wywołania `<tool_call>` są parsowane z tekstu (obsługuje też pseudo-format `invoke create_widget with type is list …`; agent mielący własne narzędzia >14 razy w turze jest przerywany).

```
Jarvis OS (przeglądarka) ──SSE /bridge/events──┐
   ▲   wynik POST /bridge/result               │
   │                                   bridge/jarvis_bridge.py  (127.0.0.1:8651)
   │                                    ▲ MCP streamable HTTP /mcp  (Bearer token)
   └── chat ──► Hermes gateway (profil jarvis-desktop, :8643) ─┘
```

### Dlaczego nie „prompt”, tylko MCP (wnioski z kodu Hermes Agent 0.21.3)
- Serwer API **ignoruje** `tools` z żądania klienta — nie ma narzędzi klienckich; `system` jest tylko doklejany do rdzenia.
- Rdzeń zawiera regułę *„MUST load skill_view”*; agent z pełnym zestawem (terminal, pliki, skille) traktuje „zrób widget” jak zadanie inżynierskie i w kółko czyta skille (`jarvis-os-*`).
- Z nagłówkiem `X-Hermes-Session-Id` historia pochodzi **z bazy serwera**, więc przykłady w body nigdy nie docierają, a sesja zbiera własne pomyłki.
- Rozwiązanie natywne dla Hermesa: własny serwer **MCP** + dedykowany, lekki profil (`platform_toolsets.api_server` = `memory`, `web`, `session_search`, `jarvis_desktop`; wyłączone: skills, terminal, file, browser, code_execution, computer_use, delegation, cronjob, kanban) + `SOUL.md` z zasadami pracy.

### Instalacja (Windows, Hermes natywnie — bez WSL)
1. **Most:** `bridge\start-bridge.bat` (zostaw uruchomiony). Token jest w `%USERPROFILE%\.jarvis-os\bridge-token`; strona Jarvis OS pobiera go sama (parowanie tylko dla dozwolonego Origin).
2. **Profil Hermesa:** `powershell -ExecutionPolicy Bypass -File hermes\install-profile.ps1 -DryRun`, a potem bez `-DryRun` (dodaj `-LoginXai`, by od razu zalogować profil do Groka — osobne logowanie xAI, bo tokeny xAI są jednorazowe i nie wolno ich kopiować między profilami). Klonuje Twój aktywny profil **bez kanałów** (Telegram zostaje w starym profilu), konfiguruje MCP, toolsety, `.env` i `SOUL.md`, robi kopię `config.yaml`. Twój obecny gateway nie jest zmieniany.
3. **Gateway:** `hermes\start-desktop-gateway.bat` (profil `jarvis-desktop`, API na `:8643`).
4. **Jarvis OS:** *Ustawienia → Hermes → „Hermes Desktop (profil jarvis-desktop + most MCP)”*, wpisz `API_SERVER_KEY` wypisany przez instalator. Tryb MCP włącza się sam, gdy profil zgłosi się do mostu (*Ustawienia → Most pulpitu dla Hermesa* pokazuje status).

Testy: `bridge\test_bridge.py` (symulowana przeglądarka + prawdziwy klient MCP), `bridge\demo_e2e.py` (steruje prawdziwym pulpitem), `bridge\mock_hermes.py` (atrapa gatewaya do testów klienta). Uruchamiaj Pythonem z `%USERPROFILE%\.hermes\hermes-agent\venv\Scripts\python.exe`.

Narzędzia po stronie pulpitu (32, `js/ai.js`): `open_app`, `close_app`, `window_control`, `move_window`, `arrange_windows`, `focus_mode`, `get_desktop_state`, `get_status`, `create_widget` (9 typów), `update_widget`, `create_note`, `read_note`, `update_note`, `delete_note`, `search_desktop`, `add_task`, `update_task`, `start_timer`, `start_pomodoro`, `routine`, `daily_briefing`, `add_shortcut`, `set_theme`, `set_wallpaper`, `visual_effect`, `speak`, `notify`, `get_weather`, `get_crypto_prices`, `open_url`, `calculate`, `get_datetime`.

### Co potrafi Jarvis Desktop (przykłady poleceń)
- **Widgety na żywo:** „widget zegara w Tokio”, „widget pogody w Gdańsku”, „widget kursów krypto”, „widget odliczania do urodzin 2026-12-24”, „widget postępu nauka angielskiego 80%”; edycja: „zmień postęp na 7/10”, „odhacz mleko”.
- **Okna:** „ułóż okna obok siebie / kaskadą”, „przesuń notatnik na lewo”, „kalkulator w prawy dolny róg”, „zminimalizuj/zmaksymalizuj X”.
- **Rutyny (makra):** wbudowane *tryb pracy, tryb relaksu, poranek, zamknięcie dnia, centrum dowodzenia, demo*; własne przez Hermesa („zapamiętaj ten układ jako tryb kodowania”). Uruchomisz je też z palety `Ctrl+K`.
- **Czas i skupienie:** „pomodoro 50 10 3” (etapy startują same), przypomnienia z godziną, odliczanie do dat.
- **Sztuczki:** „briefing dnia” (zadania + pogoda), „konfetti”, wyszukiwanie po notatkach/zadaniach/widgetach, mowa i powiadomienia na życzenie, `matrix`.
- **Pamięć Hermesa:** profil `jarvis-desktop` ma narzędzie `memory` — zapamiętuje Twoje preferencje (motyw, układ okien, nazwy rutyn).

Autostart mostu i gatewaya po zalogowaniu do Windows (opcjonalnie): `powershell -ExecutionPolicy Bypass -File bridge\install-autostart.ps1` (usunięcie: `-Remove`).

> **Bezpieczeństwo mostu:** nasłuchuje tylko na `127.0.0.1`; `/mcp` wymaga tokenu Bearer, kanał przeglądarki tokenu i dozwolonego Origin (CORS + Private Network Access); profil `jarvis-desktop` nie ma terminala ani dostępu do plików.

## Skróty klawiszowe

| Skrót | Akcja |
|---|---|
| `Ctrl K` / `/` | paleta poleceń |
| `Ctrl Spacja` | mów do Jarvisa |
| `Esc` | zamknij okno / panel / przerwij mowę |
| Shift + klik na orbie | przypnij panel telemetrii |
| Prawy przycisk | menu kontekstowe pulpitu i skrótów |

## Struktura

```
index.html            szkielet interfejsu
css/jarvis.css        wygląd i animacje
js/core.js            stan, dźwięk, głos, menedżer okien
js/events.js          Event Bus i maszyna stanów Visual Engine
js/process.js         Process Log (kroki zadania, historia, eksport)
js/ai.js              akcje systemowe (24 narzędzia), szybka ścieżka lokalna, integracja z Hermesem (tryby MCP / prompt)
js/bridge.js          klient mostu: odbiera polecenia Hermesa (SSE) i wykonuje je na pulpicie
js/apps.js            usługi (pogoda, rynek, zadania) i aplikacje
js/widgets.js         widgety pulpitu (notatka, lista, wynik, kalkulator)
js/hud.js             karty HUD i geometria sceny
js/main.js            start, efekty, pulpit, dok, paleta, skróty
bridge/               most MCP (Python), start-bridge.bat, testy i atrapa gatewaya
hermes/               SOUL.md, apply_profile.py, install-profile.ps1, start-desktop-gateway.bat (profil jarvis-desktop)
sw.js                 service worker (offline)
assets/               tapeta i ikona
```
