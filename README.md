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
| **Widgety** | Notatka, Lista, Wynik zadania, Kalkulator — wiele naraz, przesuwalne; tworzone z docka, menu prawym przyciskiem, palety `Ctrl+K` lub przez Jarvisa (`create_widget`). **Zapisują się** wraz z pozycją i stanem paneli (czat schowany, log przypięty) |
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

## Jak Jarvis steruje sobą (zasady działania)

Każde polecenie przechodzi przez trzy warstwy (`js/ai.js`):

1. **Szybka ścieżka lokalna** — jednoznaczne polecenia sterowania pulpitem („stwórz widget listy zakupów: mleko, chleb”, „ułóż okna obok siebie”, „zminimalizuj notatnik”, „otwórz kalkulator”, „zanotuj…”, „minutnik 5 minut”) wykonuje od razu silnik lokalny (~30 ms), bez pytania Hermesa. Pytania (kończące się `?`), rozmowa, wiedza, pogoda i kursy idą do Hermesa. Wyłączysz to w *Ustawienia → Szybkie polecenia pulpitu*.
2. **Hermes** — dostaje w promptcie: tożsamość, 10 zasad działania (działaj zamiast opisywać, weryfikuj wynik z `ok`, nie kłam o wykonaniu, nic nieodwracalnego bez prośby…), katalog „co gdzie”, przepisy na typowe zadania, obsługę błędów oraz **16 przykładowych wiadomości** pokazujących dokładny format `<tool_call>`. Model widzi też pełne sygnatury 18 narzędzi; `skills_list()` zwraca mu podręcznik.
3. **Zabezpieczenia** — parser rozumie `<tool_call>`, niezamknięty tag, gołe JSON-y i pseudo-format Hermesa (`invoke create_widget with type is list …`); gdy model opisze wywołanie słowami, dostaje jedną korektę, a potem polecenie wykonuje silnik lokalny. Pętla identycznych wywołań (3×), zawieszony strumień (120 s bez danych) i agent mielący własne narzędzia serwerowe (>14 wywołań w turze) są przerywane z przejściem na silnik lokalny.

Narzędzia (18): `open_app`, `close_app`, `window_control`, `arrange_windows`, `get_status`, `focus_mode`, `create_widget` (note · list · result · calc), `create_note`, `add_task`, `start_timer`, `add_shortcut`, `set_theme`, `set_wallpaper`, `get_weather`, `get_crypto_prices`, `open_url`, `calculate`, `get_datetime`.

> **Uwaga o Hermes Agent.** To pełny agent inżynieryjny z własnymi skillami (np. `jarvis-os-*`). Na polecenia o „Jarvis OS” potrafi zacząć od czytania skilli zamiast wywołać `<tool_call>`. Dlatego proste polecenia obsługuje szybka ścieżka, a do trybu pulpitu najlepiej użyć osobnego, lekkiego profilu Hermesa bez skilli programistycznych.

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
js/ai.js              akcje systemowe (18 narzędzi), silnik lokalny, integracja z Hermesem
js/apps.js            usługi (pogoda, rynek, zadania) i aplikacje
js/widgets.js         widgety pulpitu (notatka, lista, wynik, kalkulator)
js/hud.js             karty HUD i geometria sceny
js/main.js            start, efekty, pulpit, dok, paleta, skróty
sw.js                 service worker (offline)
assets/               tapeta i ikona
```
