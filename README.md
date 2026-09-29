# Jarvis OS

Wirtualne środowisko AI w przeglądarce — holograficzny pulpit sterowany przez asystenta **Jarvis**, głosem lub tekstem.
Czysty HTML/CSS/JS, bez builda i bez zależności: wystarczy otworzyć `index.html` albo wdrożyć na GitHub Pages.

## Co potrafi

| | |
|---|---|
| **Animacja startowa** | sekwencja „reaktora łukowego”, log rozruchu, syntezowany dźwięk i powitanie głosowe |
| **Orb Jarvisa** | żywa fala dźwiękowa reagująca na mikrofon i mowę, stany: słucham / analizuję / mówię / uwaga; najechanie pokazuje panel telemetrii na żywo |
| **Sterowanie głosem** | kliknij orb lub `Ctrl + Spacja` i mów po polsku (Chrome / Edge); Jarvis odpowiada syntezatorem mowy |
| **Claude AI** | po wpisaniu klucza API w Ustawieniach Jarvis rozumie dowolne polecenia i **sam steruje systemem** przez narzędzia (otwiera okna, tworzy notatki, zadania, minutniki, skróty, zmienia motyw…) |
| **Tryb lokalny** | bez klucza działa wbudowany silnik poleceń: „otwórz notatnik”, „zanotuj: …”, „przypomnij mi o 18:00 trening”, „minutnik 5 minut”, „pogoda w Krakowie”, „kurs bitcoina”, „oblicz 15% z 2400”, „motyw fiolet”, „otwórz YouTube”… |
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

## Claude AI

1. Utwórz klucz na [console.anthropic.com](https://console.anthropic.com).
2. W Jarvis OS: **Ustawienia → Claude AI** → wklej klucz → **Testuj**.

Klucz jest przechowywany wyłącznie w `localStorage` tej przeglądarki i wysyłany bezpośrednio do `api.anthropic.com` (oficjalne Anthropic SDK ładowane z CDN, tryb przeglądarkowy). Domyślny model to Claude Opus 5.5 (effort `low` dla szybkich odpowiedzi), do wyboru także Sonnet 5.5 i Haiku 4.5. Dla Opus/Sonnet włączony jest serwerowy fallback przy odmowie (`fallbacks: "default"`).
Nie udostępniaj publicznie przeglądarki z zapisanym kluczem.

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
js/ai.js              akcje systemowe, silnik lokalny, integracja z Claude
js/apps.js            usługi (pogoda, rynek, zadania) i aplikacje
js/main.js            start, efekty, pulpit, dok, paleta, skróty
sw.js                 service worker (offline)
assets/               tapeta i ikona
```
