# Zadania pomocnicze (`auxiliary.*`) i powierzchnie providera

## Po co to

Zadania poboczne — tytuł sesji, streszczenie kontekstu, wizja, `web_extract`, `session_search` — mają **własny** provider/model z sekcji `auxiliary:` w `config.yaml`. Ich awaria nie zatrzymuje modelu głównego, ale cicho psuje jakość: brak tytułów, streszczenie robione przez zapas, jedno zmarnowane wywołanie API na każde zadanie. Zgłaszany objaw bywa mylący („Jarvis się psuje”), więc najpierw licz, potem zmieniaj config.

## Objaw → przyczyna

| Objaw | Znaczenie |
|---|---|
| `404 page not found` (tekst w stylu Go) | zła **ścieżka** — klient zbudował URL niepasujący do powierzchni providera (podwójne `/v1` albo ścieżka OpenAI u providera anthropic-messages) |
| `401` / `authorized_error` | klucz: obecność i ważność (`bool(env.get('KLUCZ'))`) |
| `400` z komunikatem od providera | zły slug modelu — zweryfikuj na liście providera |
| `200`, ale pusty/ścięty wynik | limit tokenów albo model nie obsługuje tej roli |

Zawsze najpierw odtwórz **dokładny tekst** z logu (`logs/agent.log`, `logs/errors.log`) — trafiona sonda z tym samym komunikatem jest dowodem, że znalazłeś adres, a nie że masz pecha.

## Powierzchnie MiniMax (zweryfikowane sondą)

- Kanoniczna dla providera `minimax` w Hermesie: **Anthropic Messages** → `POST https://api.minimax.io/anthropic/v1/messages`, nagłówki `x-api-key: <klucz>` + `anthropic-version: 2023-06-01`. Odpowiada `200` dla `MiniMax-M3` i `MiniMax-M2.5`.
- Bratnia OpenAI-compatible: `POST https://api.minimax.io/v1/chat/completions`, `Authorization: Bearer <klucz>` — również `200` dla obu modeli.
- Złożenie obu (`/v1/v1/chat/completions`) → `404 page not found` — to jest dokładnie objaw z logu przy błędzie adresu, nie klucza.
- Rejestracja providera: `hermes-agent/plugins/model-providers/minimax/__init__.py` → `api_mode="anthropic_messages"`, base `https://api.minimax.io/anthropic`, `default_aux_model="MiniMax-M3"`.
- **Potwierdzony mechanizm awarii wpisu `auxiliary.*` z providerem `minimax` na tym silniku:** w `agent/auxiliary_client.py` gałąź obsługi klucza API przepuszcza bazę przez `_to_openai_base_url()`, które na podwójnej powierzchni MiniMaksa zamienia `/anthropic` → `/v1`; klient budowany jest jednak po protokole Anthropic Messages, więc żądanie trafia na `{baza}/v1/messages` = `/v1/v1/messages` → `404 page not found`. Tell w logu: `Auxiliary title_generation: using minimax (MiniMax-…) at https://api.minimax.io/v1` — **wydrukowana baza `/v1` przy providerze anthropic-messages oznacza tę awarię**.
- **To nie zależy od sluga modelu:** tę samą trasę biorą `MiniMax-M2.5`, `MiniMax-M2.7` i `MiniMax-M3` (sonda: wszystkie trzy odpowiadają `200` na obu powierzchniach, a `/v1/v1/…` daje `404`). Podmiana sluga nie naprawia ścieżki — nie powtarzaj jej jako „naprawy”.
- **Para objawów do `grep` w `logs/agent.log`:** `Title generation failed: 404` oraz `Summary model '<slug>' unavailable (404 page not found). Falling back to main model '<model>'`. Drugi objaw znaczy, że streszczenia robi **płatny** model główny — to koszt, nie kosmetyka.
- **Wybór naprawy to decyzja kosztowa użytkownika:** (a) przepiąć zadania pomocnicze na provider sprawdzony tą ścieżką (`deepseek`/`deepseek-flash`, na którym chodzi `auxiliary.vision`) — działa od razu, kosztuje na płatnym API; (b) naprawić trasę w silniku — zostaje plan MiniMaks, ale poprawka żyje do najbliższej aktualizacji Hermesa. Przedstaw oba (rekomendacja pierwsza) i pozwól wybrać; nie przepinaj sam.

## Sonda — bez ruszania configu

Klucz czytaj z `.env` parserem linii, wartości nigdy nie wypisuj; drukuj tylko kod odpowiedzi i początek treści.

```python
import httpx

env = {}
for ln in open(r"C:\Users\majke\.hermes\profiles\jarvis-desktop\.env", encoding="utf-8", errors="replace"):
    ln = ln.strip()
    if "=" in ln and not ln.startswith("#"):
        k, v = ln.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

h = {"x-api-key": env.get("MINIMAX_API_KEY", ""),
     "anthropic-version": "2023-06-01", "content-type": "application/json"}
for model in ("MiniMax-M3", "MiniMax-M2.5"):
    r = httpx.post("https://api.minimax.io/anthropic/v1/messages", headers=h, timeout=40,
                   json={"model": model, "max_tokens": 8,
                         "messages": [{"role": "user", "content": "ping"}]})
    print(r.status_code, model, r.text.replace("\n", " ")[:120])
```

Interpretacja: `200` dla modelu ustawionego w `auxiliary.*` przy jednoczesnym `404` w logu = problem jest w **adresie** budowanym przez klienta, nie w kluczu, saldzie ani modelu. Dopiero wtedy zmiana configu jest uzasadniona — i wiadomo, w którą stronę.

## Wdrożenie (test → kopia → restart → weryfikacja)

1. kopia `config.yaml` do `backups/config-history/` (mtime mówi, która świeża),
2. edycja jedną podmianą zakotwiczonego bloku — narzędzie `patch` odmawia plikom configu, więc `python` przez `terminal` (§5.1),
3. restart: `schtasks /Run /TN JarvisOS-GatewayRestart` — nigdy `hermes gateway restart` z własnego terminala (§1),
4. po restarcie dowód: `grep -c "404 page not found" logs/agent.log` bez przyrostu oraz nowy tytuł sesji w bazie.

## Czego nie robić

- Nie importuj `agent.auxiliary_client` w sondzie: na tej instalacji **żaden dostępny interpreter** tego nie zaimportuje — `hermes-agent/venv/Scripts/python.exe` i dołączony runtime `~/.hermes/tools/python-3.14…` nie mają `ruamel` (błąd `No module named 'ruamel'` / `hermes_yaml`), a gateway chodzi ze zamrożonego launchera `~/.hermes/bin/hermes`. Venv nadaje się wyłącznie do czytania configu (`yaml`) i skryptów profilu; sondę rób po HTTP.
- Nie zmieniaj modelu aux „na czuja”: parę provider/model w `auxiliary.vision` pilnuje strażnik konfiguracji — zamierzona zmiana wymaga poprawienia reguły (§5.3), nie wyłączenia kontroli.
