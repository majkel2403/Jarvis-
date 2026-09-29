# Jarvis OS

Wirtualne środowisko AI w przeglądarce — holograficzny pulpit sterowany przez asystenta **Jarvis**, głosem lub tekstem.
Czysty HTML/CSS/JS, bez builda i bez zależności: wystarczy otworzyć `index.html` albo wdrożyć na GitHub Pages.

## Co potrafi

| | |
|---|---|
| **Animacja startowa** | sekwencja „reaktora łukowego”, log rozruchu, syntezowany dźwięk i powitanie głosowe |
| **Orb Jarvisa** | żywa fala dźwiękowa reagująca na mikrofon i mowę, stany: słucham / analizuję / mówię / uwaga; najechanie pokazuje panel telemetrii na żywo |
| **Sterowanie głosem** | kliknij orb lub `Ctrl + Spacja` i mów po polsku (Chrome / Edge); Jarvis odpowiada syntezatorem mowy |
| **Hermes (Nous Research)** | mózgiem Jarvisa jest **Hermes Agent** (lub model Hermes z Nous Portal / Ollama). Rozumie dowolne polecenia i **sam steruje systemem** wywołaniami funkcji w natywnym formacie Hermes `<tool_call>` (otwiera okna, tworzy notatki, zadania, minutniki, skróty, zmienia motyw…); narzędzia serwerowe Hermes Agent (wyszukiwanie, terminal, pamięć) działają równolegle i są widoczne w czacie |
| **Tryb lokalny** | gdy Hermes jest wyłączony lub nieosiągalny, działa wbudowany silnik poleceń: „otwórz notatnik”, „zanotuj: …”, „przypomnij mi o 18:00 trening”, „minutnik 5 minut”, „pogoda w Krakowie”, „kurs bitcoina”, „oblicz 15% z 2400”, „motyw fiolet”, „otwórz YouTube”… |
| **Okna** | przeciąganie, zmiana rozmiaru, minimalizacja do doku, maksymalizacja (dwuklik), pamięć pozycji |
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

Jarvis wysyła nagłówek `X-Hermes-Session-Key`, więc pamięć długoterminowa Hermesa jest przypisana do tej przeglądarki. Postęp narzędzi agenta (`hermes.tool.progress`) pojawia się w czacie jako „⚡ Hermes: …”.

### Inne źródła modelu Hermes

| Tryb | Adres | Model |
|---|---|---|
| Nous Portal | `https://inference-api.nousresearch.com/v1` | `Hermes-4-405B`, `Hermes-4-70B` |
| Ollama / LM Studio / vLLM | np. `http://localhost:11434/v1` | np. `hermes3` (Ollama: ustaw `OLLAMA_ORIGINS` na adres Jarvisa) |

Klucz jest przechowywany wyłącznie w `localStorage` tej przeglądarki (eksport kopii zapasowej go pomija). Gdy Hermes nie odpowiada lub odrzuca klucz, polecenie wykonuje lokalny silnik, a w czacie pojawia się ostrzeżenie. `Esc` przerywa generowanie odpowiedzi.

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
js/ai.js              akcje systemowe, silnik lokalny, integracja z Hermesem
js/apps.js            usługi (pogoda, rynek, zadania) i aplikacje
js/main.js            start, efekty, pulpit, dok, paleta, skróty
sw.js                 service worker (offline)
assets/               tapeta i ikona
```
