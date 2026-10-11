---
name: jarvis-operations
description: Restart gatewaya, Telegram, delegowanie, mapa projektów.
version: 1.0.0
author: majke
metadata:
  hermes:
    tags: [Hermes, Gateway, Telegram, Operations, Jarvis OS]
    related_skills: [claude-delegate, hermes-agent]
---

# Jarvis — operacje Hermesa i Jarvis OS

Załaduj ten skill przed: restartem gatewaya, zmianą `config.yaml`/pluginów/skilli, pracą z Telegramem lub cronami, delegowaniem kodu do zewnętrznego CLI, pytaniami „który to projekt / gdzie to leży”.

## 1. Restart gatewaya — TYLKO tak

**Nigdy** nie uruchamiaj ze swojego terminala `hermes gateway restart` ani `hermes gateway stop`. Twój terminal jest procesem potomnym gatewaya: zatrzymanie gatewaya zabija ten terminal, zanim uruchomi gateway ponownie — i zostajesz offline (tak było 2026-10-03 o 14:58).

Gdy restart jest potrzebny (zmiana `config.yaml`, włączenie pluginu/skilla, nowe zmienne w `.env`):
1. Najpierw wyślij użytkownikowi odpowiedź: co zrobiłeś i że za chwilę restartujesz.
2. Uruchom: `schtasks /Run /TN JarvisOS-GatewayRestart`. Zadanie Harmonogramu działa poza gatewayem: odczekuje 10 s, zatrzymuje gateway, startuje go przez `JarvisOS-DesktopGateway` i samo wysyła na Telegram „gateway zrestartowany, jestem znów online”.
3. Po restarcie sesja wraca przerwana — **wznów zadanie sam**: ustal, co zostało niedokończone (ostatnia wiadomość użytkownika, `logs/agent.log`, `state.db`, świeże artefakty), dokończ brakujące kroki i dopiero potem zamelduj jednym podsumowaniem. Pytaj tylko wtedy, gdy dalszy krok jest nieodwracalny (usuwanie, wysyłka, zakup) albo gdy nie wiadomo, co było celem.

Awaryjnie: watchdogi Harmonogramu co 5 min podnoszą gateway (`JarvisOS-DesktopGateway`), most (`JarvisOS-Bridge`) i stronę (`JarvisOS-Site`), gdy padną. Log restartów: `%USERPROFILE%\.jarvis-os\logs\restart.log`.

## 1B. Kiedy NIE jestem adminem na Windows — i co z tym zrobić

Sesja shella Hermesa **nie ma uprawnień administratora** na tym hoście (`net session` zwraca „Access is denied", `touch /c/<plik>` = `Permission denied`). To znaczy, że z poziomu agenta **NIE DZIAŁAJĄ** operacje wymagające admina: zapis w `C:\` (root dysku), modyfikacja plików w `C:\Program Files`, `C:\Windows`, `C:\.git`, zmiana `safe.directory` w `~/.gitconfig` systemowym, instalacja/usuwanie programów, manipulacja usługami (`net stop`, `sc`, `bcdedit`), `wsl --set-sparse`, `diskpart`. Push na GitHub przez HTTPS też wisi — `git credential-manager` wisi na oknie logowania, którego automatycznie nie obsłuży.

**Procedura, gdy widzisz blokadę uprawnień lub autoryzacji:**

1. **Nie udawaj, że zrobisz.** Żadnych „zaraz spróbuję jeszcze raz" w kółko z różnymi wariantami poleceń — kosztuje rundy i nie przejdzie. Trzy próby = stop.
2. **Podaj zmierzoną przyczynę:** `net session >/dev/null 2>&1 && echo ADMIN || echo BRAK ADMINA`; dla git auth: `git config --global --get credential.helper`, `cmdkey /list | grep -i github`.
3. **Wylicz dokładne 2–3 komendy**, które użytkownik ma wkleić w PowerShell uruchomiony jako Administrator (Win+R → `powershell` → Ctrl+Shift+Enter). Komendy kopiuj-wklej, nie opisuj słownie.
4. **Schowek gotowy wcześniej:** jeśli przenosimy plik, utwórz katalog docelowy (`mkdir`) zanim powiesz „przenieś" — dzięki temu użytkownik robi tylko `Move-Item` z gotową ścieżką. Nie planuj „najpierw utwórz folder, potem przenieś" w dwóch krokach.
4a. **Zamiast 2–3 komend do wklejenia — daj gotowy plik `.ps1`** w `C:\Users\majke\JarvisWorkspace\out\<krótka-nazwa>.ps1` (nie na Pulpicie), gdy zadanie ma więcej niż 2 kroki albo wymaga zmiennych. UTF-8, `[CmdletBinding(SupportsShouldProcess)]`, `try/catch` z sensownym komunikatem, domyślnie próba (`-WhatIf`). Uprawnienia administratora tylko, gdy krok naprawdę ich wymaga — git (push, `~/.gitconfig`, zmiana nazwy `C:\.git`) ich **nie** wymaga. **Zanim oddasz skrypt, przeczytaj go jeszcze raz i sprawdź na sucho**, że robi to, co obiecuje (lekcja 2026-10-11: skrypt liczył commity gałęzi `auto/…`, a wypychał `main`; przeniesienie `C:\.git` zabrałoby historię projektu `ai-os` i worktree Kilo). Push i operacje nieodwracalne — tylko po „tak” Michała w bieżącej rozmowie.
5. **Raportuj status tylko tym, co zrobiłeś sam:** zrobione = wykonane i zweryfikowane; zablokowane = wyraźna etykieta „czeka na Twoje wykonanie" + mierzona przyczyna + ścieżka do skryptu. Nie mieszaj — puste sekcje raportu są kłamstwem.

**Wzorzec pułapki:** `mv /c/.git <cel>` z katalogu `/c/Users/...` zwraca `Permission denied`, bo `mv` chce zmodyfikować `C:\` (root). To samo dotyczy `rm` na `C:\.git` i `chmod` na katalogach w `C:\`. Jedyna droga: PowerShell jako Administrator z `Move-Item` / `Remove-Item`, bo te nie wymagają modyfikacji katalogu-rodzica.

**Wzorzec pułapki: git push przez HTTPS.** Po skonfigurowaniu `credential.helper=manager` Windows Credential Manager ma już zapisany token — ale jeśli jest nieważny, wygasł albo nie ma scope `repo`, push wisi bez informacji zwrotnej. Sprawdź, czy `cmdkey /list | grep -i github` zwraca wpisy (to nie jest dowód, że działają), a w razie timeoutu podaj: (a) wejdź na https://github.com/settings/tokens i wygeneruj **classic token** ze scope `repo`, (b) push z tego shella raz — Credential Manager przechwyci i zapisze. SSH klucz (`~/.ssh/id_ed25519` + `gh-key add`) jest alternatywą bez hasła, ale wymaga jednorazowej konfiguracji.

## 6. Pulpit wirtualny vs realny komputer

**`mcp__jarvis_desktop__*`** = wirtualny pulpit Jarvis OS (strona `localhost:4000`, przeglądarka Comet, most MCP `:8651`). Zrzut `desktop_screenshot` pokazuje tylko Comet.

**`computer_use`** = prawdziwy komputer Windows (procesy `msedge.exe`, `comet.exe`, `obsidian.exe`). `focus_app` działa (`raise_window` blokowane — `start_session` wymagany); zrzut realnego monitora = `python` + `mss` przez `terminal` (`monitors[1]` = 1920×1080 primary, `monitors[2]` = 2560×1080). Weryfikacja: `IsWindowVisible`, `GetWindowRect`, `SetForegroundWindow` (ctypes).

Zmiany w `SOUL.md`, `MEMORY.md`, `USER.md`, `AGENTS.md` działają dopiero od **nowej sesji** — na Telegramie użytkownik wysyła `/new` (restart gatewaya do tego nie jest potrzebny).

## 2. Telegram

Telegram (polling) działa w tym profilu (`jarvis-desktop`) obok API gatewaya na `127.0.0.1:8642` (trasa `/p/jarvis-desktop/v1`). Port `8643` **nie nasłuchuje** — wpisy o `:8643` w starszych notatkach i w sejfie są nieaktualne; port potwierdzaj sondą HTTP (§16), nie z dokumentacji. Token jest **tylko** w `.env` tego profilu — nigdy nie kopiuj go do innego profilu (dwa gatewaye z jednym tokenem walczą o polling). Cron Solana (monitor co 5 min, raport dobowy), health-check (co 30 min) i raport dzienny (8:00) dostarczają na Telegram stąd.

- **Komendy skilli na Telegramie:** `/nazwa-skilla` — jeden wyraz, myślniki, **bez spacji**. `/i have adhd` łamie się na spacji: parser bierze `/i` jako nazwę i zwraca „Unknown command /i”. Poprawnie: `/i-have-adhd`. Gdy nazwa ma spacje albo koliduje z komendą wbudowaną (np. `handoff`), użyj `/skill <nazwa>`. `/commands` listuje komendy (stronami).

### 2.1 Niejasne odwołanie („poprzedni projekt”, „ostatni problem”) — czytaj `state.db`, nie zgaduj

Po `/new` sesja dostaje **nowy** `session_id`, a użytkownik pisze skrótem („poprzedni projekt: …”), więc odwołanie wskazuje pracę z *innej* sesji — tej samej treści nie zobaczysz w bieżącym kontekście. Kolejność:

1. `session_search(query=…)` — do szukania **treści**; tryb bez zapytania („browse”) pokazuje tylko 3 najnowsze sesje.
2. **Ostatnie wiadomości użytkownika wprost z bazy** (`python` + `sqlite3` w katalogu profilu):
   `con=sqlite3.connect('file:state.db?mode=ro', uri=True)` → `SELECT id, session_id, role, content, datetime(timestamp,'unixepoch','localtime') FROM messages WHERE role='user' ORDER BY id DESC LIMIT 8`.
   To daje `session_id` i czas każdej wiadomości: odróżnisz nową wiadomość od tej samej treści sprzed kompaktowania i zobaczysz, do której sesji należy praca, o którą pyta użytkownik.
3. `session_search(session_id=…, around_message_id=…)` **odmawia** (`anchor lives in the current session lineage`), gdy kotwica jest w bieżącej sesji — wtedy właśnie baza jest jedynym źródłem. Zakresy czasowe (`after`/`before`) i `role_filter` działają w trybie discovery.
4. **Zanim zaczniesz od nowa, sprawdź, czy praca nie jest już skończona** — `ls -l --time-style=+%H:%M` na artefaktach. „Dokończ X”, gdy pliki X są świeże, znaczy zwykle „pokaż mi to”, nie „przerób od zera”; zaczynanie od nowa marnuje pracę i czas.
5. Dalej niejasne → **jedno** krótkie pytanie. Nie zgaduj kierunku i nie odpalaj ciężkiego zadania na domysł.

Bazę otwieraj tylko do odczytu (`mode=ro`), nigdy nie pisz do `state.db`, a treści wiadomości nie przepisuj w całości (mogą zawierać sekrety).

## 3. Delegowanie — przez Hermesa (bez Claude Code)

Ustalenie Michała (2026-10-09): **delegujemy przez Hermesa**, nie przez Claude Code ani żadne zewnętrzne CLI.
Cięższe zadania rozdzielasz narzędziem `delegate_task` — subagenci chodzą na modelu z sekcji `delegation:`
(`MiniMax-M3`, plan subskrypcyjny = 0 USD na płatne API). Zasady:
- maks. 3 subagenty naraz, jedno zadanie na brief, brief samowystarczalny (dziecko nie widzi tej rozmowy),
- raport dziecka to **twierdzenie**, nie dowód: weryfikuj diff, pliki i testy sam,
- nie wracaj do `claude-delegate`; strażnik konfiguracji pilnuje, że nie ma go w `skills.auto_load`,
  a `delegation.model` zostaje na MiniMax.

## 4. Który projekt to „Jarvis OS”

- **Jarvis OS** = `C:\Users\majke\Desktop\jarvis-` (GitHub `majkel2403/Jarvis-`): statyczna strona (vanilla JS) na `http://localhost:4000`, **bez backendu, bazy i `.env`**; most MCP `:8651` (`bridge/jarvis_bridge.py`), agenci (web / komputer); Hermes dla niej = profil `jarvis-desktop` (API na `127.0.0.1:8642`, trasa `/p/jarvis-desktop/v1`).
- Profil Hermesa ma źródło w repo: `hermes/SOUL.md` → kopiowany do profilu przez `hermes/apply_profile.py` (`install-profile.ps1`). Zmieniając SOUL, zmień **oba** pliki.
- **„Jarvis OS 3.2” / „JARVIS Mission Control”** (`C:\Users\majke\jarvis-os-3.2-handoff-work`, `:8420`, `backend/.env`, `jarvis.db`) to **zakończony, archiwalny, osobny** projekt. Sięgaj do niego tylko, gdy użytkownik wprost o niego pyta.

## 5. Gdzie jest konfiguracja

- Profil: `C:\Users\majke\.hermes\profiles\jarvis-desktop\` (`config.yaml`, `.env` = tylko sekrety, `SOUL.md`, `memories/`, `skills/`, `plugins/`, `cron/`).
- Katalog roboczy: `C:\Users\majke\JarvisWorkspace\` — tu jest `HERMES.md` i `AGENTS.md` (zasady dla tego katalogu).
- Mapa i historia zmian: `C:\Users\majke\.hermes\WHERE-IS-THE-CONFIG.md`; przewodnik po plikach: `HERMES-PLIKI-PRZEWODNIK.md`.
- Strażnik konfiguracji: `C:\Users\majke\.hermes\profiles\jarvis-desktop\scripts\config_guard.py` (cron „Strażnik konfiguracji”, 7:50; ręcznie z `--verbose`) — codziennie sprawdza ustalone reguły i robi kopię kluczowych plików. Nie łam jego reguł bez prośby użytkownika; jeśli zmiana jest zamierzona, przenieś nowy stan do reguły — procedura w §5.3.
- Crony zmieniaj tylko przez `hermes -p jarvis-desktop cron …`, nigdy edytując `cron/jobs.json`. Pole `--script` przyjmuje tylko nazwę pliku — argumenty skryptu (np. `obsidian-capture.py daily`) nie są parsowane i powodują cichy fail. Pattern: stwórz `*_wrapper.py` w repo `Desktop\jarvis-\hermes\scripts\` (do profilu `profiles/jarvis-desktop/scripts/` trafi przez `apply_profile.py`), który woła właściwy skrypt z argumentami przez `subprocess.run`.

### 5.5 Cron, który tylko przeszkadza → przepisz na `no_agent` + skrypt

Gdy cron z odpytaniem agenta zaczyna produkować **powtarzający się fałszywy alarm** (użytkownik nie potwierdza akcji / co tydzień to samo pytanie), agent w pętli nie jest potrzebny — wystarczy deterministyczny skrypt + konwencja "pusty stdout = OK, niepusty = raport na Telegram". Warunek: zadanie nie wymaga rozumowania, a "raport zmian" da się wyrazić w `diff`/liczbach/tabeli.

Procedura przejścia na `no_agent`:

0. **Zapytaj Michała** — zmiana crona to zmiana żółta (AUTO/POLITYKA.md): opisz, co i dlaczego, i czekaj na „tak”.
1. **Napisz skrypt w repo** `Desktop\jarvis-\hermes\scripts\<nazwa>.py` (domyślnie dry-run), z testem w `hermes\tests\`. Konwencja: drukuj tylko gdy coś znaczącego do powiedzenia; **pusty stdout = cisza na Telegramu**. Sprawdź, czy skrypt w ogóle coś daje (zmierz przed/po) — bezużyteczny skrypt to tylko koszt.
2. **Wdróż przez `python hermes/apply_profile.py`** (kopiuje skrypty do profilu; nie kopiuj ręcznie profil → repo).
3. **Przestaw crona przez CLI**: `hermes -p jarvis-desktop cron edit <id> --script <nazwa>.py --no-agent`. Nigdy nie edytuj `cron/jobs.json` ręcznie.
4. **Przypomnienia jednorazowe** (`once`) kończą się same — **nigdy nie każ zadaniu usuwać samego siebie** (`cron remove` w trakcie biegu = „fire claim ownership lost”, wynik i wysyłka przepadają; tak zginęły przypomnienia 2026-10-11 16:00 i 17:00).
5. **Sprawdź efekt** w `cron/executions.db` (`status`, `started_at`, `finished_at`, `delivery_outcome`) i `cron/output/<id>/<RRRR-MM-DD_GG-MM-SS>.md`. Pusty `output/` + `suppressed` = `no_agent` zadziałał, model nie był wołany.

**Uwaga — walidacja po `cron run`:** ręczny `hermes cron run <id>` blokuje do końca skryptu (timeout 180s wystarcza na krótkie, ale VACUUM/kopia dużego pliku to więcej — daj `timeout=300`). Wiersz "Ran now: succeeded" potwierdza trigger, **nie** stdout skryptu; czytaj `cron/output/<id>/<RRRR-MM-DD_GG-MM-SS>.md` po fakcie.

### 5.6 `state.db` — nie vacuumuj, nie podmieniaj (lekcja 2026-10-11)

`state.db` rośnie głównie przez długie sesje i historię streszczeń, nie przez wolne strony: `freelist_count` to ~0,3 MB, więc `VACUUM` nic nie daje. **Nikt nie podmienia `state.db.optimized`** — ani gateway, ani strażnik; ręczna podmiana = utrata wszystkiego, co gateway zapisał od chwili kopii. Kopia żywej bazy tylko przez `VACUUM INTO` albo API `backup()` (cron 4:30, `backup_state_db.py`), nigdy `shutil.copy` (bez `-wal` kopia jest niespójna). Wzrost bazy hamuje: `sessions.auto_prune`, krótsze rozmowy (`/new` na nowy temat) i mniejszy prompt — nie VACUUM. Kompaktowanie (`hermes sessions optimize`) tylko przy zatrzymanym gatewayu i za zgodą Michała.

### 5.1 Edycja `config.yaml` z agenta — bezpiecznie

- Narzędzie `patch` **odmawia** zapisu pliku konfiguracji Hermesa („Refusing to write to Hermes config file”) — to zabezpieczenie, nie błąd treści. Edytuj jednym skryptem `python` przez `terminal` (`open()` → `replace()` → `write()`), nie kombinuj obejść przez narzędzia powłoki.
- Zamieniaj **dokładny, zakotwiczony blok** (`content.replace(old, new)`). Nie wstawiaj nic przez `re.sub` do list YAML: wcięcie i myślnik są częścią struktury — regex wstawił `- - provider:` i rozjechał całą listę `fallback_providers`.
- Po zapisie **odczytaj początek pliku** (pierwsze ~20 linii) i policz trafienia (`content.count(...)`). `exit 0` nie znaczy, że YAML jest poprawny.
- Kopie zapasowe: `profiles/jarvis-desktop/backups/config-history/` — mtime mówi, która zmiana jest świeża.
- Kluczowe klucze: `model:` i `fallback_providers:` na górze pliku; provider wizji to sekcja `vision:` z polami `provider:` + `model:`.
- **Nazwę modelu waliduj przez `/models` providera przed zapisem** — slug z OpenRouter to nie nazwa w natywnym API (skill `llm-provider-verification`).
- **Wdrożenie zmiany w configu = dowód → kopia → weryfikacja po restarcie** (reguła użytkownika: „najpierw testy, potem wdrażanie”). Kolejność: (1) sonda HTTP na *właściwej* powierzchni providera — nowy model/adres musi odpowiedzieć `200`, bo zły adres wraca jako `404 page not found` i cicho degraduje działanie; (2) kopia `config.yaml` do `backups/config-history/`; (3) restart (§1, nigdy z własnego terminala); (4) po restarcie policz przyrost błędu (`grep -c "404 page not found" logs/agent.log` przed i po — ma być bez przyrostu). „Warunek jest oczywisty” to nie test — bez sondy przed i sprawdzenia po nie ogłaszaj zmiany jako działającej.
- **Klucze API, tokeny i hasła to granica, nie prośba do powtórzenia.** Wartość klucza (w tym prefiks, przyrostek, długość, fragment środka) **nigdy nie przechodzi przez Twoje okno**: nie w odpowiedzi, nie w `terminal`, nie w `execute_code`, nie w `text_to_speech`, nie w logach, nie w historii sesji, nie w commitcie. Użytkownik proszący o „wpisz go w .env” albo „przetestuj klucz" — przyjmujesz klucz wyłącznie po swojej stronie użytkownika (`os.environ` w jego skrypcie, `read—host —AsSecureString` w PowerShell, wpis w pliku z `Set-Content` uruchomionym przez niego); Ty czytasz tylko `bool(os.environ.get('KLUCZ'))` lub `len(os.environ.get('KLUCZ',''))`. Nawet gdy użytkownik pisze „wklejam Ci klucz X" — przerywasz, prosisz o wpisanie po swojej stronie i potwierdzasz samym `bool()` / `len()`. Wyjątek dotyczy jedynie dostawców, z których klucz **już** jest w `.env` profilu — tam tylko potwierdzasz obecność przez `bool()`, wartość czytasz Twój skrypt po stronie procesu, nigdy nie wyświetlaj. Reguła nie jest do dyskusji: asystent nie używa sekretów kategorii A, nawet za zgodą użytkownika, bo każda reprodukcja zostawia ślad w kontekście i historii.

### 5.2 Sekrety i obrazy

- `.env` czyta się przez `terminal` + `python` (parser linii `KLUCZ=wartość`); `read_file` odmawia („is a Hermes config”). **Nigdy nie wypisuj wartości klucza** — raportuj tylko `bool(key)` / `len(key)`.
- `vision_analyze` przyjmuje **lokalną ścieżkę absolutną** (`C:/…/shot.png`). Adres `http://localhost:…` jest odrzucany („blocked: unsafe or private URL”) — wystawianie pliku lokalnym serwerem nic nie daje.
- **`404 page not found` / `400` z `vision_analyze` to objaw złego `vision.model`, nie złego obrazu.** Zanim zaczniesz szukać problemu w dostarczaniu pliku (serwer, uprawnienia, format): sprawdź sekcję `vision:` w `config.yaml` i zweryfikuj nazwę modelu przez `/models` providera — ten sam lokalny PNG zadziała po poprawce sluga. Diagnozę „obraz się nie dostarcza” stawiaj dopiero po potwierdzeniu configu.
- **Ten sam `404 page not found` dotyczy zadań pomocniczych** (sekcja `auxiliary.*`: `title_generation`, `compression`, `web_extract`, `session_search`): provider wraca 404 mimo dobrego klucza i salda, bo klient skleja adres na niedopasowanej powierzchni (podwójne `/v1` albo ścieżka OpenAI dla providera zarejestrowanego jako `anthropic_messages`). Objawy uboczne: brak tytułów sesji i jedno zmarnowane wywołanie na każde streszczenie (kompresja spada wtedy na model zapasowy). Zanim ruszysz config — odtwórz sondą **dokładny tekst błędu z logu**; trafiony adres to przyczyna. Powierzchnie MiniMax (zweryfikowane), tabela objaw→przyczyna i gotowa sonda: `references/aux-i-powierzchnie-providerow.md`.
- **Nie testuj ścieżki pomocniczej przez import modułów Hermesa** (`agent.auxiliary_client`): wymaga właściwego interpretera i `PYTHONPATH`, a pomyłka wróci jako `ModuleNotFoundError: hermes_yaml` albo `No module named 'ruamel'` i zmyli diagnozę. Sondę rób po HTTP — klucz czytaj z `.env` parserem linii, nigdy nie wypisuj wartości (`bool()`/`len()`).

### 5.3 Zamierzona zmiana konfiguracji = popraw regułę strażnika, nie wyłączaj kontroli

Gdy strażnik zgłasza odstępstwo, które jest zamierzone (nowy model główny, nowy provider wizji, nowy klucz), przenieś nowy stan do reguły:

1. Reguły są **w repo**, profil ma kopię: `C:\Users\majke\Desktop\jarvis-\hermes\scripts\config_guard.py`. Zmieniaj obie kopie — strażnik porównuje `scripts/*.py` profilu z repo i rozjazd zgłasza jako osobne odstępstwo.
2. Ten sam stan trzyma TARGET w `C:\Users\majke\Desktop\jarvis-\hermes\apply_profile.py` (dla wizji: `auxiliary.vision.provider` + `auxiliary.vision.model`). Zaktualizuj oba pliki — inaczej kolejne `apply_profile` cofnie ustawienie i strażnik znów je zgłosi.
3. Popraw nagłówek-docstring strażnika (data i powód zmiany) — to jedyne miejsce, w którym widać, co jest ustaleniem, a co odstępstwem.
4. Uruchom strażnika **interpreterem Hermesa**: `C:\Users\majke\.hermes\hermes-agent\venv\Scripts\python.exe <profil>\scripts\config_guard.py --verbose`. Powłokowy `python` nie ma `yaml` („ModuleNotFoundError: No module named 'yaml'”) — to nie błąd skryptu, tylko inny interpreter.
5. Dowód: `--verbose` → lista `OK` i zero linii odstępstw; bez `--verbose` → **puste wyjście** (pusty stdout = nic nie leci na Telegram). Dodatkowo `hermes -p jarvis-desktop cron run <job_id>` → `Ran now: succeeded`.
6. Dopisz zmianę do `~/.hermes/WHERE-IS-THE-CONFIG.md` i do sejfu, jeśli dotyczy routingu modeli (`CRITICAL_FACTS.md` — tabela na końcu, `hot.md` — linia „Routing:”, wpis `UPDATE` na końcu `log.md`).
7. Kontrole kluczy pisz jako `bool(env.get('KLUCZ'))`, nigdy wartość ani długość — brak klucza głównego modelu to cichy zjazd routingu na darmowe modele, więc warto go pilnować.
8. **Kontrole progowe (alerty) sprawdzaj na kopii, nie na zainstalowanym skrypcie.** Próg trzymaj w jednej stałej na górze pliku (`DEEPSEEK_MIN_USD = 1.0`), a ścieżkę alertu przetestuj tak: skopiuj skrypt do `cache/scratch/`, podmień w kopii samą stałą na wartość, która **musi** zadziałać (np. `999.0`), uruchom kopię interpreterem Hermesa i sprawdź, czy wypisuje komunikat. Zainstalowany plik zostaje nietknięty. „Warunek jest oczywisty” to nie test — dopóki alert nie odezwał się na kopii, nie wiesz, czy strażnik w ogóle go widzi.
9. **Kontrola, która nie mogła się wykonać, nie może wyglądać jak zaliczona.** Gdy pobranie danych (saldo, HTTP) padnie po ponowieniach, wypisz odstępstwo „nie sprawdziłem (…) — sprawdź ręcznie”, zamiast milczeć: pusty stdout znaczy „wszystko OK”, więc cisza przy niedziałającej kontroli jest kłamstwem. Zanim jednak wyślesz „sprawdź ręcznie”, spróbuj naprawić warunek w tym samym przebiegu (odtwórz brakujący plik/kopię, podnieś usługę) i napisz, co zrobiłeś — człowiek dostaje tylko to, czego system nie umiał naprawić (§13, §15).
10. **Co strażnik sprawdza dziś** (wymiana modelu głównego = zmień te miejsca na raz): model główny `deepseek-flash` / `deepseek`; `auxiliary.vision` = `deepseek` / `deepseek-flash`; obecność `DEEPSEEK_API_KEY` i `MINIMAX_API_KEY` w `.env` (tylko `bool()`); saldo DeepSeek ≥ `DEEPSEEK_MIN_USD` z `GET https://api.deepseek.com/user/balance` (`Authorization: Bearer` z `.env`, pole `balance_infos[].total_balance`, wybieraj wpis z `currency == "USD"`); **obecność kopii `SOUL.md` z ostatnich 7 dni w `~/.hermes/backups/config-snapshots/<RRRR-MM-DD>/`** (nie w `backups/config-history/` — to stary katalog). Ten sam stan trzymaj w `apply_profile.py` TARGET, w tabeli sejfowego `CRITICAL_FACTS.md` i w linii „Routing:” w `hot.md` — inaczej strażnik znów zgłosi odstępstwo po kolejnym `apply_profile`.
10a. **Gdy strażnik alarmuje — nigdy nie zmieniaj dat plików, kopii ani treści kopii, żeby go uciszyć** (to omijanie strażnika, czerwona strefa AUTO/POLITYKA.md). Reguła kopii SOUL (od 2026-10-11) liczy wiek po **dacie w nazwie folderu** `config-snapshots/<RRRR-MM-DD>/` i wymaga **tej samej treści** co `SOUL.md` profilu — daty plików są bez znaczenia. Alarm „brak kopii” znaczy więc: blok kopii strażnika nie zadziałał albo SOUL zmieniono poza repo. Diagnozuj, opisz Michałowi, a poprawkę reguły rób w repo z testem w `hermes\tests\` (§5.3).
11. **Skill z repo ma trzy kopie — po edycji zsynchronizuj wszystkie.** `skill_manage` pisze wyłącznie do profilu (`profiles\jarvis-desktop\skills\…`), a strażnik porównuje ten plik z kopią w repo (`Desktop\jarvis-\hermes\skills\…`) i rozjazd raportuje jako odstępstwo. Procedura: zapisz tę samą treść do repo i do `~/.hermes\skills\…`, z użyciem **identycznych bajtów** (końce linii znormalizowane w każdej kopii do jednego stylu), na końcu potwierdź `md5` wszystkich trzech — dopiero wtedy uruchom strażnika (puste wyjście = OK).
12. **Nadpisanie istniejącego pliku, którego `write_file` nie chce przyjąć:** dotyczy nie tylko skryptów profilu — każdy plik, który w tej sesji czytałeś tylko **fragmentami** (paginacja `offset`/`limit`, `head`/`tail` w terminalu) **albo który sam zapisałeś `write_file`, a potem poprawiałeś `patch`em**, zostaje dla narzędzia w stanie „nie w pełni przeczytany” i `write_file` odmawia („Refusing to overwrite”), mimo że treść masz. Kolejność: (a) raz przeczytaj plik **jednym wywołaniem bez `limit`** i ponów zapis — to zwykle wystarcza; (b) jeśli nadal odmawia albo plik jest duży, zapisz nową wersję w `cache\scratch\<nazwa>.v2.<ext>` i zainstaluj przez `cp` w `terminal`; (c) gdy tylko dopisujesz wpis do listy/słownika w takim pliku, użyj zwykłego `patch` — **działa mimo odmowy `write_file`**, więc nie przepisuj całego pliku bez potrzeby. Po instalacji potwierdź tożsamość bajtów: `md5sum` nowego i docelowego pliku musi być identyczny, a `grep -c` starego odwołania (np. usuwanej zależności) musi dać `0`. Poprawkę powiel w repo tak samo jak przy haku/strażniku.

### 5.4 Próg streszczania kontekstu i blokady kompresji

Pytanie „dalej mamy źle ustawiony próg streszczania” rozstrzygaj porównaniem **godziny w logu z godziną startu procesu**, nie treścią pliku ani wklejonym ostrzeżeniem.

- `compression.threshold_tokens` to **sufit, nie wartość działająca**: kompresor tnie przy `min(threshold × okno modelu, threshold_tokens)`. Przy oknie 1 mln tokenów i `threshold: 0.5` limit proporcjonalny (500 tys.) nigdy nie zadziała — wiąże sufit, więc to jego wartość widać w logu i tylko jego zmiana ma skutek.
- **Liczbę, którą naprawdę widzi proces, czytaj z `logs/agent.log`:** log podaje pary `prompt=<N> < threshold=<T>` (np. `prompt=111 713 < threshold=120 000`) oraz ostrzeżenie `Context is over the compression threshold (~X >= Y) but compression is currently blocked (<powód>)`.
- **Ostrzeżenie wklejone przez użytkownika bywa sprzed restartu — nie „naprawiaj” drugi raz, zanim tego nie sprawdzisz.** `grep` po starej liczbie (`90,000`) w `logs/agent.log`; jeśli ostatnie wystąpienie jest starsze niż start procesu (`~/.jarvis-os/logs/restart.log`, PID), próg działa, a banner pochodzi ze starego procesu — powiedz to wprost i pokaż obie godziny.
- **Powód blokady rozszyfruj po nazwie:** `structural_backoff:<s>` = sam nałożona ~300 s pauza (stała `_STRUCTURAL_NO_OP_BACKOFF_SECONDS`) po „structural no-op”, czyli braku czego streszczać — zdejmuje się sama, to nie usterka configu i nie powód do restartu; `cooldown:*` = nieudane streszczenie; `disabled` = wyłączone. Nie zgłaszaj backoffu jako „źle ustawionego progu”.
- Skutek uboczny, który wygląda jak problem z progiem: gdy model streszczeń pada (np. 404 ścieżki `auxiliary.*`), kompresja spada na **model główny** („Falling back to main model …”), więc rośnie rachunek, a nie próg. Tabela przyczyn i sonda: `references/aux-i-powierzchnie-providerow.md`.
- Głębiej (matematyka progu, tabela powodów blokady, gotowe zapytania i dowód po restarcie): `references/diagnostyka-zdrowia-agenta.md` §7.

## 7. Film z zadania (`task_film` / `workflow_film` / `day_film`)

**ZASADA: NIE generuj filmu automatycznie przy każdym zadaniu ani przy każdym zdarzeniu.** Użytkownik chce **raz dziennie** (`day_film`) z podsumowaniem całego dnia — nie per zadanie, nie per workflow, nie per powiadomienie. Przy zadaniu/workflow wystarczy krótki tekstowy raport (`workflow_status`, `task_report`, zrzut `desktop_screenshot`). Film generuj tylko gdy użytkownik wyraźnie o to poprosi (`pokaz film z zadania`, `pokaz film z workflow`) albo jako `day_film` raz dziennie. Nie zapisuj filmu w tle bez zapytania — to generuje duże pliki i marnuje zasoby.

Kod to egzekwuje: w Jarvis OS moduł filmów jest domyślnie **wyłączony** (`filmOn:false`, `filmRecord:false`, scenariusze `ask` — migracja stanu v5 zdjęła stare `auto`), więc nic nie otwiera się ani nie proponuje samo. Ręczne „pokaż film" (także `workflow_film` / `task_film` / `day_film`) działa dalej. Nagrywanie: `J.filmRec` w `js/film-record.js` (`getDisplayMedia` + `MediaRecorder`, `.webm`, bez `ffmpeg`), przycisk ⏺ i skrót **R** w odtwarzaczu, grupa „Film" w Ustawieniach — szczegóły w skillu `jarvis-os-management`.

## 8. Hooki (`pre_tool_call` / `post_tool_call`)

- `hooks_auto_accept: true` (ON 🟢) — automatyczna akceptacja hooków bez pytania użytkownika (dotyczy non-interactive: gateway, cron).
- `pre_tool_call` = `guard_tools.py` (blokuje zabicie przeglądarki i restart gatewaya).
- `post_tool_call` = plugin `jarvis-events` (rejestruje `post_tool_call`) — ON / używany: wysyła zdarzenia zadań/narzędzi do mostu (`/bridge/agent-event`) dla Orb i Process Log. Plugin `jarvis-events` włączony (`enabled` w `config.yaml`).
- **Haki sejfu** (drugi `post_tool_call` i `post_llm_call`): `scripts/post_tool_hook.py` i `scripts/post_llm_hook.py` wołają `obsidian-capture.py`. Reguły od 2026-10-08: matcher zawężony do zapisów w Jarvis OS / delegacji / zadań w sieci (był `.*` — mielił sejf przy KAŻDYM odczycie i kosztował ~1,6 s na wywołanie, ~35 min/dobę), throttle 15 min (`cache/hooks/vault-hook-state.json`), spawn `DETACHED_PROCESS` — hak wraca w ~0,1 s i nie blokuje narzędzia. Zmieniając te skrypty, popraw **oba** pliki (profil + `Desktop\jarvis-\hermes\scripts\`) i sprawdź `hermes -p jarvis-desktop hooks doctor`.

## 9. Retencja backupów

- `scripts/backup_retention.py` (+ `backup_retention_wrapper.py` dla cronu): kasuje wpisy w `~/.hermes/backups` starsze niż 30 dni, zostawia 5 najnowszych oraz `config` i `config-snapshots`. Wiek bierze z daty w nazwie, a gdy jej nie ma — z mtime najnowszego pliku (dlatego `hermes-agent-broken-20260608-*` jest stary mimo pliku dotkniętego później). Domyślnie dry-run, `--apply` kasuje.
- Cron „Retencja backupów” (nd 3:20, `no_agent`, script = wrapper) — **puste wyjście = nic nie leci na Telegram**; raport tylko, gdy coś usunięto.
- Kasowanie musi zdejmować atrybut read-only (obiekty `.git`) i radzić sobie z nazwami zarezerwowanymi Windows (`nul`) — fallback `cmd /c rmdir /S /Q` z prefiksem `\\?\`. Bez tego `shutil.rmtree` kończy się `WinError 5` i cicho zostawia resztę.
- Pierwszy przebieg (2026-10-08) zwolnił ~2,9 GB z 3,09 GB (60 629 → 2 748 plików).

## 10. Głosówka na Telegramie

**Kolejność obowiązkowa, nie wolno jej skracać:** najpierw wywołaj `text_to_speech`, potem **potwierdź plik** (`ls -l` na ścieżce — MiniMax zwraca `success: true` nawet gdy plik nie powstanie), a linie `[[audio_as_voice]]` + `MEDIA:` wstaw **dopiero po tym potwierdzeniu**. Bąbelek generuj w tej samej turze, w której piszesz odpowiedź. Wpisanie `MEDIA:` z pamięci (nazwa pliku, którego nie wygenerowałeś) to cicha wpadka: użytkownik nie dostaje nic i musi się upominać — zdarzyło się 2026-10-09 dwa razy z rzędu (`frontend-propozycje-1009.ogg`, `research-graf-wiedzy-1009.ogg`). Gdy użytkownik mówi „brakuje głosu/głosów": najpierw `ls -lt` katalogu `cache/audio/`, potem generuj **tylko brakujące** pliki.

**Bąbelek jest dostarczalnym elementem odpowiedzi, nie dodatkiem na koniec pracy** — generuj go **przed** napisaniem raportu końcowego (tekst do `text_to_speech` to treść tego, co zaraz wyślesz), w tej samej turze. Najczęstsza przyczyna wtopy to długa tura robocza: audio zostaje „na potem” i tura kończy się bez niego (raz po wyczerpaniu limitu iteracji narzędzi, raz po samym zrzucie ekranu). Jeśli tura i tak zamyka się bez pliku — napisz to wprost („głosówka w następnej wiadomości”) i **dokończ ją w najbliższej turze**, zamiast czekać, aż użytkownik upomni się ponownie.

Zasada stała (od 2026-10-06): każda odpowiedź kończy się krótkim bąbelkiem MiniMax. Wzór, który działa:
`text_to_speech(provider="minimax", output_path="C:\\Users\\majke\\.hermes\\profiles\\jarvis-desktop\\cache\\audio\\<unikalna_nazwa>.ogg", text="…")` + linia `[[audio_as_voice]]` + `MEDIA:C:\\…\\<unikalna_nazwa>.ogg`.
Ścieżka **musi** mieć backslashe (Windows-native) — forward-slash zwraca `success: true`, ale plik nie powstaje i gateway zgłasza „not found”. `voice_compatible: false` ignorować. Unikać nazw `tts_<słowo>.ogg` (wyścig w auto-ścieżce).

- **Głos wybiera się w configu, nie w wywołaniu.** `text_to_speech` nie przyjmuje `voice_id` — sekcja `tts:` w `config.yaml` (provider `minimax`) trzyma `model`, `voice_id`, `speed`, `vol`, `pitch`, `emotion`, `sample_rate`, `bitrate`. Zmiana = edycja configu + restart gatewaya (§1).
- **Domyślny głos jest angielski** (`speech-02-hd` + `English_expressive_narrator`) i czyta polski tekst z obcym akcentem — to pierwsza rzecz do sprawdzenia, gdy bąbelki brzmią „obco”. MiniMax ma głosy polskie (`Polish_female_1_sample1`, `Polish_female_2_sample3`, `Polish_male_1_sample4`, `Polish_male_2_sample3`).
- **Pytanie „jakie mamy możliwości głosu” obsłuż próbkami, nie opisem:** wygeneruj 3–4 krótkie próbki tym samym zdaniem (razem z obecnym domyślnym do porównania) i wyślij każdą jako bąbel. Użytkownik wybiera słuchem. Pełna procedura (lista głosów, `t2a_v2`, zakresy, `language_boost`, klonowanie): `references/minimax-glosy-tts.md`.
- **Nigdy nie pisz linii `MEDIA:` ani nie podawaj ścieżki, dopóki `text_to_speech` nie zwrócił `success: true`.** Użytkownik sprawdza, czy plik naprawdę jest („a gdzie ta wiadomość głosowa?”), a bąbelek zapowiedziany bez wygenerowanego pliku to obietnica bez pokrycia — kosztuje rundę i podważa zaufanie do reszty raportu. Kolejność: wywołaj `text_to_speech` → potwierdź `ls -l --time-style=+%H:%M <ścieżka>` (rozmiar + godzina) → dopiero wtedy `[[audio_as_voice]]` + `MEDIA:<ta sama ścieżka>`. To samo dotyczy każdego innego załącznika: plik, którego nie wytworzyłeś w tej sesji, nie istnieje.
- **Głębokość bąbelka = głębokość odpowiedzi.** Przy „rozwiń to, a nie w skrócie” bąbelek musi przejść całą treść (warianty lub kroki plus rekomendacja) — ok. 1200–2800 znaków, czyli 1–3 minuty mowy, a nie dwa zdania streszczenia. Tekst czytany na głos pisze się inaczej niż czat: bez ścieżek i backslashy, bez nazw plików i kodu („stary moduł widgetów”, nie `js/widgets.js`), bez skrótów bez rozwinięcia („service worker”, „plik manifest”), liczby słownie, gdy brzmią naturalniej. Długi tekst daje plik ~1–2 MB na ~3 minuty mowy — to normalne, nie usterka.

## 12. Ile kosztuje sesja — tokeny i koszt (DeepSeek)

Pytanie „za co właściwie płacę / czy opłaca się `/new`” wraca. Odpowiadaj **liczbami z bazy**, nie modelem mentalnym — użytkownik chce kwot i mnożników.

- Źródło liczb: SQLite `state.db` w profilu → tabela `sessions` (`input_tokens`, `output_tokens`, `cache_read_tokens`, `api_call_count`, `estimated_cost_usd`) oraz **`session_model_usage`** — dopiero ta druga rozbija koszt na model i linię (`main`, `background_review`, `compression`, `vision`).
- Wzór (zweryfikowany co do centa): `koszt = świeży_input × stawka_in + cache_read × stawka_cache + output × stawka_out`. Stawki bierze Hermes ze snapshotu w `hermes-agent/agent/usage_pricing.py` (dla `deepseek-flash`: `$0,15` / `$0,003` / `$0,60` za milion, off-peak; szczyt pon.–pt. 01–04 i 06–10 UTC = 2×).
- **Nie licz kosztu, mnożąc tokeny z wiersza `sessions`:** ten wiersz miesza modele darmowe/fallback i nie rozbija linii — poprawny koszt to suma po `session_model_usage`.
- Kontekst startowy to stały narzut na **każde** wywołanie: SOUL + `memories/` + skille z `skills.auto_load` (~63,6 tys. znaków ≈ 17,7 tys. tokenów przy 8 skillach). Dodanie skilla do `auto_load` podnosi koszt każdej tury.
- Prawdziwym mnożnikiem nie jest długość historii (powtórzony prefiks idzie z cache ~50× taniej), tylko **liczba wywołań API**: każde użycie narzędzia to kolejna runda z całym kontekstem. Narzut, który znika po `/new`, to linie `compression` i `background_review`.
- **Liczbę wywołań narzędzi bierz z tabeli `messages`, nie z wiersza `sessions`.** Kolumna `sessions.tool_call_count` bywa nieaktualna (pokazywała 26 przy 1506 wynikach narzędzi w tej samej sesji). Naliczenie: `SELECT tool_name, count(*) FROM messages WHERE session_id=? AND role='tool' GROUP BY tool_name`; kolumny `active`/`compacted` mówią, ile wpisów jest już zwiniętych w streszczenie — podawaj oba („N wywołań, z czego M skompaktowanych”). Rozkład po `timestamp` (na godziny) pokazuje, gdzie realnie poszedł czas.
- **Per-wywołaniowa telemetria (panel „każde Twoje wywołanie”): czego w bazie NIE ma.** `messages.token_count` jest **pusty dla wszystkich ról** — nie da się pokazać tokenów przy pojedynczym wywołaniu; prawdziwe liczby są per sesja/linia, więc przy wywołaniu podawaj narzędzie i czas, a tokeny jako **średni kontekst tej sesji** (`input_tokens ÷ api_call_count`) i nazwij to szacunkiem. Czas wywołania = różnica `timestamp` wiersza `role='tool'` i **poprzedzającej go wiadomości asystenta** w tej samej sesji; argumenty narzędzia (ścieżki plików, nazwa skilla) siedzą w `tool_calls` tej poprzedzającej wiadomości. Gotowy zbieracz: `C:\Users\majke\JarvisWorkspace\AUTO\tools\panel_wywolania.py` (zapisuje `AUTO/panel-wywolan.json`) — procedura i pułapki w `references/deepseek-tokeny-i-koszt.md` §7.
- **Koszt sesji to suma linii z `session_model_usage`, nie wiersz `task=''`.** Ta tabela grupuje per `task` (`''` = praca główna, `compression`, `background_review`, `vision`) — wiersz `sessions` podaje tylko częściową kwotę (w tej instalacji zaniżał o ~40%).
- **Metryki zewnętrznej pętli modelu (MiniMax, `claude` CLI) licz z jej własnego logu `usage`**, nie z pamięci ani z liczby artefaktów — klient zewnętrzny dopisuje każdy strzał do JSONL (model, `usage`, `finish`, czas). Procedura i wzór odpowiedzi: `references/deepseek-tokeny-i-koszt.md`, sekcja „Pomiar pętli zewnętrznego modelu”.
- **„Czemu tak drogo, skoro pętlę robił darmowy model?”** — bo płatna jest orkiestracja, nie pisanie: każde użycie narzędzia to osobna runda z całym kontekstem, a linie `compression` + `background_review` + `vision` dokładają ~40% rachunku. Odpowiadaj rozbiciem na linie, średnim kontekstem na wywołanie (tokeny z cache ÷ liczba wywołań) i udziałem OUTPUT w koszcie — nie samą kwotą.
- `scripts/koszt_sesji.py` czyta linię z kolumny `task` (nie `lane`/`role`) i musi się kompilować (`py_compile` przed uruchomieniem). Gdy zgłasza „brak kolumny linii”, sprawdź `pragma table_info(session_model_usage)` — to komunikat o schemacie, nie dowód, że danych nie ma.
- Gotowy pomiar: `scripts/koszt_sesji.py`, tabela stawek i pełna procedura: `references/deepseek-tokeny-i-koszt.md`.
- **Test 3-krokowy po zmianie reguły strażnika** (test jednostkowy na `tmp_path` → pełen przebieg → bez regresji; nigdy zmiana dat kopii): `references/straznik-test-3-kroki.md`.
- **„Dlaczego praca się urywa / asystent się wyłącza” to pytanie o zdrowie agenta, nie o model.** Trzy mechanizmy widać wprost: `Turn ended: reason=max_iterations_reached(100/100)` (limit kroków tury), `interrupted_during_api_call(sse_client_disconnected)` (rozłączenie klienta strumienia przerywa turę w połowie — bez błędu modelu) oraz `tool_loop_guardrails` z `config.yaml` (`hard_stop_after exact_failure: 3, same_tool_failure: 5`) — piąte niepowodzenie TEGO SAMEGO narzędzia ucina turę twardo. Domyka to klient MCP, który po 3 odrzuconych wywołaniach parkuje serwer na ~46–49 s, więc dobijanie martwego narzędzia kończy się urwaną turą (3 próby = stop i raport, reguła użytkownika §6 HERMES.md). Rozmiar sesji domyka obraz: przy ~136 tys. kontekstu streszczenie idzie prawie co turę, a streszczenie zdegradowane („deterministic fallback”) gubi szczegóły i rodzi pomyłki — lekarstwem jest `/new` na nowe zadanie. Gdzie patrzeć, jak agregować błędy i których komend nie używać: `references/diagnostyka-zdrowia-agenta.md`.

## 11. Bundle komend (`/przeglad`, `/dowod`, `/diagnoza`)

Bundle = grupa skilli ładowana jedną komendą. Pliki: `C:\Users\majke\.hermes\profiles\jarvis-desktop\skill-bundles\*.yaml`, komendę listuje `/bundles`. Dodając bundle: **skopiuj istniejący plik z tego katalogu jako wzór** (nazwa bez spacji), przed zapisem sprawdź kolizję sluga z komendami wbudowanymi i skillowymi, a po zapisie potwierdź, że bundle widać w `/bundles`. Nie zgaduj kluczy schematu — działający plik w tym katalogu jest wzorem, implementacja to `hermes-agent/agent/skill_bundles.py`.

## 13. Autonomiczne pętle w cronach — model, monitor, dowód

Pytanie „czy pętla może chodzić ciągle przez MiniMaxa / wykorzystać cały plan” rozstrzygaj **miarą, nie opinią** — i nigdy nie odpalaj płatnego modelu na sztywnym timerze.

- **Model i provider przypina się tylko z CLI:** `hermes -p jarvis-desktop cron create "<wyrażenie>" "<prompt>" --name "…" --model MiniMax-M3 --provider minimax --deliver origin --workdir "C:/Users/majke/JarvisWorkspace"`. Narzędzie `cronjob_manage`, którym operuje agent, **nie** ustawia `--model`/`--provider` — do przypięcia zadania do subskrypcji użyj terminala. Prompt joba musi być samowystarczalny (świeża sesja bez kontekstu rozmowy). **Przypięcie potwierdź w pliku, nie z listy:** `cron list` nie pokazuje modelu ani providera, więc po `create` sprawdź `grep -o '"model": *"[^"]*"' cron/jobs.json` (albo odczytaj wpis joba po `job_id`) — brak pinu oznacza, że job po cichu jedzie na modelu głównym, czyli na płatnym API zamiast na planie.
- **Tryb monitor oszczędza tokeny:** `--monitor-script <nazwa>.py` uruchamia skrypt co tick; wynik **bajt w bajt** taki sam jak w poprzednim ticku → agent **nie rusza** (zero tokenów, przebieg ~1 s). Skrypt monitora musi być **zdarzeniowy**: czyta własny plik stanu (pozycja w logu, odciski znanych błędów, znane ID pozycji kolejki), wypisuje wyłącznie to, co **nowe**, i nigdy nie wstawia daty/czasu ani licznika narastającego — inaczej odcisk zmienia się co tick i model pali plan bez powodu.
- **Dowód, który model naprawdę obsłużył zadanie:** `state.db` → `SELECT id, model FROM sessions WHERE id LIKE 'cron_%'` (klucz to kolumna **`id`**, nie `session_id`; sesja `cron_<job_id>_<RRRRMMDD_GGMMSS>` = agent faktycznie ruszył), tokeny z `session_model_usage`. Brak wiersza `cron_<job_id>` przy szybkim przebiegu = monitor zadziałał i model nie był wołany. Status i dostawę bierz z `cron/executions.db` (tabela `executions`: `status`, `started_at`, `finished_at`, `delivery_outcome`; `suppressed` = nic nie wysłano / agent pominięty).
- **Wiersz `Fire claim lost; execution was not started.` ze statusem `failed` to nie awaria** — tak kończy się kolizja ręcznego `cron run` z tickiem harmonogramu (jeden z dwóch traci prawo do startu). Skrypty alarmowe muszą go filtrować (`lower(coalesce(error,'')) not like '%fire claim lost%'`), inaczej każdy ręczny test joba produkuje fałszywy alarm o „padniętym cronie”.
- **Raport delegacji o ręcznym przebiegu („API calls: 0”) opisuje dyspozytora, nie dziecko.** Gdy uruchamiasz cron przez `cronjob_manage(action='run')`, powiadomienie o delegacji podaje licznik sesji, która zleciła przebieg — job i tak poszedł własną sesją na przypiętym modelu. Stopkę przebiegu bierz z `cron/output/<job_id>/<RRRR-MM-DD_GG-MM-SS>.md` (pełny prompt + raport, jaki job wyprodukował), a to, co job naprawdę zmienił, potwierdź na plikach (`git status`/mtime, `tail` dziennika) — nie z treści raportu.
- **Plan subskrypcyjny ≠ budżet w USD.** Reguła „budżet 0” dotyczy płatnych API (DeepSeek); plan MiniMax to **okna** (5 h i tydzień) plus limity tempa, więc jedno wywołanie myślącej pętli to nie koszt, tylko zużycie okna — i dlatego pętlę trzeba **bramkować zmianą**, a nie gęstością harmonogramu. Zmierzony narzut jednego przebiegu agenta: ~45 tys. tokenów wejścia (sam kontekst startowy).
- **Wyłącznik pętli:** plik `STOP` w katalogu stanu autonomii (`JarvisWorkspace\AUTO\STOP`) — każdy skrypt pętli sprawdza go na starcie i milczy; monitor wypisuje wtedy stałe `STOP` (stabilne = agent nigdy nie rusza).
- **Alert ma nieść przyczynę i wynik próby naprawy — nie oddawaj roboty człowiekowi.** Preferencja Michała: system wykrywa problem i **naprawia go sam**, a w raporcie pisze, co zrobił. Zanim wypiszesz „sprawdź ręcznie”: zejdź niżej w kolejności źródeł (wzorzec `resolve_repo()`: kanoniczna ścieżka → `AUTO/repo-path.json` → najnowsza kopia), odtwórz brakujący artefakt z kopii, podnieś usługę z watchdoga. Ciszę rezerwuj wyłącznie dla potwierdzonego OK, a „nie mogłem sprawdzić” — na wypadek, gdy naprawa też padła; wtedy podaj zmierzoną przyczynę (procedura w §15).
- **Dzienna pętla planu** („rano analizujesz, planujesz, testujesz i wykonujesz”) opiera się na trzech rzeczach: (1) źródłem prawdy jest plik `JarvisWorkspace\AUTO\plan-dnia.json` (data + zadania z id, opisem, kryterium testu, statusem), nie treść promptu joba; (2) widoczna karta to widget pulpitu z blokiem `checklist` — checkbox odhacza się **dopiero po przejściu testu**, a wtedy wpis idzie do `AUTO/reports/dzien-<data>.md` ze ścieżkami screenów przed/po; (3) zadania użytkownika wchodzą wiadomością na Telegramie i lądują w tym samym pliku, więc nie dopisuj ich do promptu. Prompt joba musi zawierać wszystkie trzy punkty oraz sprawdzenie `AUTO\STOP` na starcie — inaczej pętla albo odhacza bez testu, albo gubi źródło prawdy.
- Szczegóły: katalog pętli, szkielet skryptu monitora i gotowe zapytania weryfikacyjne → `references/autonomiczne-petle-cron.md`.
- **Wzorzec „przypominaj co godzinę aż zrobię"** (cykliczne przypomnienie dla Michała). Michał mówi „przypomnij mi X jutro od 15:00 aż zrobię" → utwórz serię **jednorazowych** cronów co godzinę w zadanym oknie czasowym, każdy z `deliver=origin`. Prompt każdego joba ma ten sam szablon: (a) **sprawdź efekt** — konkretne warunki końca („plik `<ścieżka>` nie istnieje" / „commit `<SHA>` jest na origin" / „serwis `<X>` odpowiada 200"); (b) jeśli wszystko spełnione → wyślij 1-zdaniowe „Zrobione, zamykam przypominacz" i **usuń samego siebie** przez `hermes cron remove <job_id>`; (c) jeśli nie spełnione → wyślij 1–2 zdania przypomnienia („Skrypt na pulpicie nadal czeka — Win+R → powershell → Ctrl+Shift+Enter → & '<ścieżka>'") i **też się usuń** (każda tura milczy po sprawdzeniu, następny cron sprawdzi znowu). Brak auto-self-delete = powódź powiadomień. Job_id pobierz z `cron list` po każdym `create` i **wstaw go w prompt** tej samej tury — bo job_id następnych ticków trzeba znać w skrypcie, a po restarcie numeracja się nie zmienia. Pierwszy cron w oknie (np. 15:00) może pominąć sprawdzenie efektu (jeszcze go nie było) — następne sprawdzają.

## 14. Porządki w repozytoriach — osobna gałąź, usuwanie na końcu

Reguła stała (ustalenie Michała): zmiany porządkowe idą na **osobnej gałęzi** — najpierw wszystko uporządkować i scalić, **usuwanie plików dopiero na końcu i za jego zgodą**. Nigdy nie `git push` bez wyraźnej prośby; `main` zostaje nietknięty, więc cofnięcie to jedno `git checkout main`.

Kolejność:
1. Rozpoznaj stan: `git -C <repo> status --porcelain` (policz pozycje), `git branch -a | head`, `git remote -v`, `git log -1 --date=relative --format="%h %ad %s"`.
2. Gałąź: `git -C <repo> checkout -b auto/porzadki-<RRRR-MM-DD>` — niezacommitowane zmiany idą za Tobą, nic nie trzeba przepisywać.
3. Podziel pliki na **grupy tematyczne** (pulpit/filmy, most, dokumentacja, haki, strażnik, profil, integracje) i zrób **jeden commit na grupę**. Jeden commit „wszystko” jest nie do cofnięcia punktowo, a to właśnie po to robimy gałąź.
4. Przed każdym commitem skan stage na sekrety (wzory i gotowy skrypt: `references/git-porzadki-na-galezi.md`) — dopiero potem `git commit`.
5. Dowód na końcu: `git status --porcelain` puste, `git log --oneline main..HEAD` = N commitów, testy projektu **na gałęzi** zielone (`npm test` w `Desktop\jarvis-` → 370/370).

- **Pitfall — nie rób tego bashowymi funkcjami.** Funkcja z długim regexem w `terminal` (MSYS/git-bash) pada na cytowaniu (`syntax error near unexpected token`), a przerwany skrypt zostawia resztę w stage. Cały zestaw commitów zrób w Pythonie (`execute_code` + `subprocess.run(["git","-C",repo,…])`): czytelne błędy i możliwość przerwania **przed** commitem, gdy skan sekretów coś znajdzie.
- **`git add` sprawdź, zanim uznasz commit za zrobiony.** `git add` potrafi zwrócić `0` i nie wstawić nic do stage — wtedy `git commit` odpowiada `no changes added to commit` i pakiet zmian zostaje niezacommitowany, mimo że raport mówi „zacommitowane”. Kolejność: wypisz stderr `add` (ostrzeżenia LF→CRLF są normalne), potwierdź w `git status --porcelain` niepustą **pierwszą** kolumnę (`M  plik` = w stage, ` M plik` = poza), a po commicie odczytaj jego rc i SHA z `git log -1 --format=%h`. Ten sam wzorzec dotyczy każdej operacji, którą ogłaszasz jako wykonaną: `exit 0` to nie dowód efektu.
- **Dwa osobne repozytoria:** `Desktop\jarvis-` (strona, most, `hermes/`) oraz `JarvisWorkspace` (katalog roboczy: `AUTO/`, `HERMES.md`, `projects/`). Katalog roboczy może nie mieć **ani jednego commita** — wtedy `checkout -b` tworzy gałąź „unborn”, a pierwszy commit warto poprzedzić `.gitignore` na duże katalogi pomiarowe/robocze (setki MB), żeby historia była lekka; raportuj, co zostało poza wersjonowaniem.
- **Zostaw otwarte, nie zgaduj:** nieśledzone pliki, stare gałęzie i ewentualny `push` to decyzja Michała — wypisz je jako listę „do decyzji”, zamiast sprzątać po swojemu.

## 15. Repo zniknęło / strona świeci pustką (incydent 2026-10-10)

**Objaw:** `:4000` zwraca „Directory listing for /" (pusty), strażnik/patrol alarmuje „nie sprawdzilem testow Jarvis OS (brak plikow tests/unit)", a procesy `serve_site.py` i `jarvis_bridge.py` nadal działają. Przyczyna: nocne porządki na Pulpicie opróżniły katalog repo (został pusty husk) — procesy i skrypty mierzą **ścieżkę**, nie proces, więc wszystko zależne od `Desktop\jarvis-` cichnie.

1. Potwierdź pustkę: `python` + `os.listdir(r"C:\Users\majke\Desktop\jarvis-")` oraz `urllib.request.urlopen("http://localhost:4000/")` — `curl` przez `rtk` potrafi pokazać `0B` mimo `200`.
2. Znajdź najnowszą kopię: `Documents\JarvisDesktop-Backup-*\working-tree` (drzewo robocze + `history.bundle`; `head.txt` = commit, `status-before.txt` = stan zmian).
3. Odtwórz: `shutil.copytree(kopia, r"C:\Users\majke\Desktop\jarvis-", dirs_exist_ok=True)`; kopii źródłowej nie ruszaj. Strona zaczyna działać **bez restartu** (serwuje katalog po ścieżce) — po odtworzeniu `GET /`, `/js/registry.js`, `/css/jarvis.css` muszą wrócić `200` z treścią.
4. Dowód: `node --test tests/unit/*.test.js` (≥ 370 zielonych), strażnik `--verbose` = zero odstępstw, `git -C <repo> status --porcelain` = 0.
5. Od 2026-10-10 patrol robi to sam: `auto_patrol.py` → `resolve_repo()` (kanoniczna ścieżka → `AUTO/repo-path.json` → najnowsza kopia) odtwarza puste repo i zgłasza to jednym zdaniem; cron „Kopia repo Jarvis OS" (`repo_backup.py`, co 6 h, rotacja 3 najnowsze, ~17 MB/kopia) trzyma świeże kopie. Zmiana lokalizacji repo = wpis `{"repo": "<ścieżka>"}` w `AUTO/repo-path.json` (wtedy odwołania w skryptach zostają na kanonicznej ścieżce).

**Pułapka (pomiary):** szczegóły i obejścia w §16 — `rtk` przepina polecenia powłoki i skraca wyjście, więc `curl` na `:4000` potrafi pokazać `0B` mimo `200`.

## 16. Pomiary i sondy — `rtk` przepina polecenia, mierz przez Pythona

Na tym hoście `rtk` jest wpięty w powłokę i **przepisuje polecenia oraz skraca wyjście**: `ls …` wraca jako `rtk ls …` z doklejonym „(empty)” / „N filtered”, a z `grep`/`find`/`netstat` giną całe linie (bywa, że polecenie zwraca `exit 0` i zero trafień mimo istniejących danych). Objaw, który kosztuje rundy: `curl -w "%{http_code}"` na `http://localhost:4000/` zwracał `0B` i `exit 23`, choć strona odpowiadała `200`.

Zasada: **każdy fakt, na którym opierasz twierdzenie, mierz przez `python`** — HTTP przez `urllib.request`, porty przez `socket.connect_ex` albo parsowanie pełnego `netstat -ano` w kodzie, pliki przez `os.listdir`/`pathlib`, git przez `subprocess.run(["git",…])` i liczenie w Pythonie. Gdy pomiar musi zostać w powłoce, zapisz wynik do pliku (`… > cache/scratch/x.txt`) i czytaj przez `read_file`. Liczby podawaj zmierzone, nie oszacowane.

— **Port i wersja usługi — sondą HTTP, nie z notatek:** `urllib.request.urlopen("http://127.0.0.1:8642/p/jarvis—desktop/v1/health")` zwraca `{"status": "ok", "version": …}`. Tak wyszło, że API stoi na `:8642`, a `:8643` z tabel w sejfie nie istnieje (i że wersja silnika w notatce była o minor starsza).
- **`netstat | grep` pod `rtk` potrafi nic nie zwrócić** — parsuj całe `netstat -ano` w Pythonie i filtruj porty w kodzie, inaczej uznasz działającą usługę za zamkniętą (albo odwrotnie).
- **Dowód istnienia pliku przy raportowaniu:** rozmiar i godzinę potwierdzaj przez `pathlib.Path(...).stat()` (bąbelek głosowy, kopie backupu), a dla HTTP porównuj długość treści, nie sam kod.

## 17. Miejsce na dysku — kopie i sprzątanie (polityka od 2026-10-10)

Dysk C: chodzi przy ~95% zajęcia (26 GB wolne z 476 GB), więc kopie mają **twarde limity**, a nie „tyle, ile wyjdzie”.

- **Kopie repo Jarvis OS:** `Documents\JarvisDesktop-Backup-*` — cron „Kopia repo Jarvis OS” (`repo_backup.py`, co 6 h, `6aefab121c35`), **3 najnowsze** (~17 MB/kopia; kopia robiona od razu po odtworzeniu repo może wyjść 47 MB, bo `jarvis-backup-desktop.ps1` kopiuje drzewo z `node_modules`).
- **Kopie bazy stanu:** `profiles/jarvis-desktop/backups/state-db/` — cron 4:30 (`backup_state_db.py`), `KEEP_DAYS = 5` **plus** limit „5 najnowszych”. Baza rośnie ~30 MB/dzień (49 → 203 MB w 5 dni), więc 14 dni kopii urosłoby do ~2 GB.
- **Codzienne sprzątanie:** cron „Sprzątanie kopii i cache” (`sprzatanie.py`, 3:10, `641e3ff0f5ea`) — kopie bazy 5 szt. / 14 dni, kopie repo 3, `cache/audio` 14 dni, `cache/terminal-output` 3 dni, `cache/scratch` 7 dni, `logs` 14 dni, `cron/output` 30 dni. Milczy, gdy nie ma czego usuwać; jedną linią „zwolnione X MB” melduje się tylko wtedy, gdy coś skasuje.
- **Tygodniowa retencja** `~/.hermes/backups` (nd 3:20, `backup_retention.py --apply`): kasuje starsze niż 30 dni, zostawia 5 najnowszych + `config*`.
- Limity trzymaj w **stałych na górze skryptu** i w identycznej treści w repo (`Desktop\jarvis-\hermes\scripts\`) — `md5` obu kopii równy.
- **Co naprawdę zjada miejsce** (pomiar 2026-10-10): `Desktop\02_Projekty_AI_ML` ~20 GB z 23 GB całego Pulpitu; profil Hermesa ~1,3 GB (`backups` 650 MB, `state.db` 211 MB, `lsp` 69 MB, `state-snapshots` 62 MB); sejf 552 MB. Wszystkie kopie, które robię, to ~250 MB — sprzątanie ich **nie uratuje dysku**; realne oszczędności są w cache'ach aplikacji (AppData) i projektach AI/ML, a to już decyzja Michała.
- **`state.db` (211 MB i rośnie) to historia rozmów — nie kasuj i nie vacuumuj bez zgody Michała;** najpierw pokaż rozmiar i zapytaj. To samo dotyczy `Desktop\02_Projekty_AI_ML` i innych katalogów Michała: sprzątam wyłącznie własne kopie i cache, nigdy jego projekty.

## 18. Kontrola lokalizacji i pułapka repo w `C:\` (JAIA v3, ETAP 01 — 2026-10-10)

**Zanim cokolwiek zmienisz w repozytorium, ustal gdzie jesteś.** W `C:\` istnieje repo git (3,8 GB, bez remote, commity to checkpointy rozszerzenia `saoudrizwan.claude-dev`); w `~/.gitconfig` jest `safe.directory = C:/`. Skutek: `git` uruchomiony w katalogu bez własnego repo (`C:\`, `C:\Users\majke`, `.hermes`, `Desktop`) zwraca `toplevel = C:/`, branch `main`, HEAD `fd6806b` i **626 „zmian”** — jeden `git add -A` w tym miejscu indeksuje cały dysk. Objaw diagnostyczny: `git -C C:/ rev-parse --show-toplevel` → `C:/`; `test -d C:/.git`.

- Narzędzie: `C:\Users\majke\JarvisWorkspace\AUTO\tools\kontrola_lokalizacji.py` (`0` = OK, `2` = BLOKADA: brak zatwierdzenia, brak markera projektu, ścieżka inna niż zatwierdzona, toplevel `C:/`). Rejestr: `AUTO\repo-path.json` (klucz **`repo`**, czyta go też `auto_patrol.py`; pole `status` = `do-zatwierdzenia` | `zatwierdzone`). Testy: `AUTO\tests\test_kontrola_lokalizacji.py` (5/5, `unittest`, interpreter Hermesa).
- **Fail-closed:** dopóki `status` nie jest zatwierdzony, kontrola blokuje zapis — to celowe, nie usterka; nie obchodź jej, tylko poproś Michała o zatwierdzenie ścieżki.
- Rozjazd wersji Jarvisa (stan 2026-10-10): kanoniczne `Desktop\jarvis-` (HEAD `fb74cb1`, testy 370/370) oraz kopie `Jarvis-graph-control` (05.10), `jarvis-os-ultimate\jarvis-` i `~\jarvis-` (29.09), `Documents\Jarvis-Audit-*`. **Nie usuwaj żadnej i nie wybieraj sam** — wybór należy do Michała.
- Uruchamiaj skrypty AUTO interpreterem Hermesa: `C:\Users\majke\.hermes\hermes-agent\venv\Scripts\python.exe` (powłokowy `python` bywa inny).
- Duże heredoki z backslashami w `terminal` psują się (`SyntaxError: unicodeescape` przy `\U`): tekst z Windows-ścieżkami zapisz najpierw `write_file` do pliku tymczasowego i dopiero skryptem dołącz — nie wklejaj ścieżek wprost do heredoka.

## 19. Wolne miejsce: Docker i kompaktowanie WSL (zweryfikowane 2026-10-10)

**Zasada: Hermes działa tylko natywnie w Windows — polecenia `wsl …` i usuwanie danych Dockera to operacje na danych Michała.** Każdy krok z tej sekcji (eksport, `--unregister`, kasowanie `.vhdx`/`.tar`) wykonujesz dopiero po jego wyraźnym „tak” w bieżącej rozmowie — najpierw pokaż liczby i plan. Sekcja to wiedza, nie zgoda.

Gdy brakuje miejsca na `C:`, największymi zjadaczami są dyski WSL/Docker, nie kopie repo. Sprawdzone liczby: `docker_data.vhdx` (66 GB logicznie, ~47 GB na dysku) + Ubuntu `ext4.vhdx` (52 GB logicznie, 37 GB na dysku) = ~84 GB.

- **Docker, gdy użytkownik go nie używa:** zamknij proces `Docker Desktop.exe`, potem `wsl.exe --unregister docker-desktop` i usuń cały katalog `%LOCALAPPDATA%\Docker\wsl` (zawiera `wsl/disk/docker_data.vhdx`). To zwalnia ~47 GB. Samej aplikacji (Program Files, ~12 GB) NIE odinstalowuj bez pytania — wymaga uprawnień administratora.
- **`wsl --manage <dystro> --set-sparse true` bywa ZABLOKOWANE** (WSL 2.6: „Obsługa rozrzedzonych dysków VHD jest obecnie wyłączona z powodu potencjalnego uszkodzenia danych"). **Nie używaj `--allow-unsafe`** — to ryzyko utraty danych użytkownika. Sprawdź też uprawnienia: `net session >/dev/null 2>&1` (bez admina `diskpart`/`Optimize-VHD` odpadają).
- **Bezpieczna droga bez admina = eksport → import:** `wsl --shutdown` → `wsl --export <dystro> <plik.tar>` (sprawdź, że plik ma sensowny rozmiar) → `wsl --unregister <dystro>` → `wsl --import <dystro> <ten SAM katalog> <plik.tar> --version 2`. Kopia `.tar` zostaje jako siatka bezpieczeństwa (u Ubuntu 10,7 GB) — nie kasuj jej, dopóki użytkownik nie potwierdzi, że dystrybucja działa.
- **Po imporcie sprawdź trzy rzeczy:** `wsl -d <dystro> --exec whoami` (użytkownik z `/etc/wsl.conf`), `ls /home` + `du -sh /home`, oraz czy gwiazdka domyślnej dystrybucji nie uciekła na inną (`wsl --set-default <dystro>`). Wynik u Ubuntu: 52 → 12 GB logicznie, 37 → 6,3 GB na dysku, dane nietknięte.
- **Mierz uczciwie:** rozmiar logiczny pliku VHDX nie jest miejscem na dysku. Używaj `du -s --block-size=1 <plik>` i `df -h /c`, a jako dowód podaj różnicę wolnego miejsca przed i po. Python na Windows nie ma `st_blocks`.
- **Zdanie „zwolnione X GB" oprzyj na `df`, nie na sumowaniu plików:** przy plikach rzadkich (sparse) i usuwaniu dużych VHDX liczby z `stat` kłamią.
