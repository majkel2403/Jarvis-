# Autonomiczne pętle w cronach — wzory i weryfikacja

Zasada nadrzędna: **pętla skryptowa chodzi gęsto i za darmo, model rusza tylko przy zdarzeniu.**
Kolejność warstw: darmowy skrypt → (zmiana?) → model na subskrypcji → zapis dowodu do dziennika.

## 1. Katalog stanu i bezpieczniki

`C:\Users\majke\JarvisWorkspace\AUTO\` — tu mieszka cała autonomia (nie w repo Jarvis OS):

| plik | rola |
|---|---|
| `AUTONOMIA.md` | zasady pętli, poziomy autonomii, zakres „co wolno bez pytania” |
| `backlog.md` | kolejka pracy: `- [ ] AUTO-NNN \| typ \| opis \| ryzyko \| szacunek \| status` |
| `stan.md` | tabela pętli + skrypty + ostatnie wpisy (stan na żywo dla agenta) |
| `dziennik.md` | wpis na przebieg: `kiedy \| pętla \| co \| dowód \| koszt` |
| `budzet.json` | limit USD/dzień (dotyczy płatnych API), poziom autonomii |
| `.patrol_state.json`, `.monitor_state.json` | stan skryptów (pozycja w logu, odciski, znane ID) |
| `STOP` | wyłącznik: istnieje = każda pętla milczy |

Skrypty pętli: `~/.hermes/profiles/jarvis-desktop/scripts/` (`auto_patrol.py`, `auto_monitor.py`,
`auto_nightly.py`, `auto_weekly.py`) — przed uruchomieniem zawsze `py_compile`, a skrypt ma być
**cichy, gdy OK** (pusty stdout = nic nie leci na Telegram).

## 2. Kształt pętli (co czym)

| pętla | kiedy | czym | model |
|---|---|---|---|
| strażnik | co 30 min | `--no-agent --script auto_patrol.py` | brak |
| przegląd nocy | 6:45 | `--no-agent --script auto_nightly.py` | brak |
| raport tygodnia | niedziela 18:00 | `--no-agent --script auto_weekly.py` | brak |
| czujka myśląca | co 15 min | `--monitor-script auto_monitor.py` | przypięty (MiniMax-M3) |
| zespół poranny | codziennie 7:15 | agent + ewentualnie `delegate_task` (2–3 dzieci dziedziczy model joba) | przypięty (MiniMax-M3) |

Zadania bez modelu: `--no-agent --script <nazwa>.py`. Zadania myślące: agent z przypiętym
`--model/--provider` (tylko przez CLI) i **bramką monitora**.

## 3. Skrypt monitora — wymagania

Monitor uruchamia się co tick i jego stdout jest porównywany z poprzednim:

1. **Zdarzeniowość.** Wypisz tylko nowe rzeczy: nowe błędne linie z logu (od zapisanej pozycji
   w bajtach), nowe ID pozycji kolejki, zmianę statusu testów, nowe padnięte crony.
2. **Bez czasu i bez liczników narastających.** Ani daty, ani „razem od startu”, ani numeru ticku —
   każdy z tych elementów zmienia odcisk co przebieg i woła model bez powodu.
3. **Własny plik stanu** (`*.monitor_state.json`) zapisywany na końcu: pozycja w logu, zbiór
   odcisków znanych błędów (z normalizacją cyfr: `re.sub(r"\d+", "N", linia)`), znane ID pozycji,
   znacznik czasu ostatniego sprawdzenia cronów. Po zrolowaniu logu (rozmiar mniejszy niż zapisany)
   wróć do pozycji 0.
4. **Wyłącznik.** `STOP` obecny → wypisz stałą linię `STOP` i zakończ (stabilne = cisza).
5. **Błąd kontroli = odstępstwo, nie cisza.** Gdy nie da się czegoś odczytać, wypisz to jawnie —
   pusty stdout znaczy „wszystko OK”, więc milczenie przy niedziałającej kontroli kłamie.
6. **Dopasuj wzorce do realnego formatu plików.** Pozycja kolejki to `- [ ] AUTO-002 | …`, więc
   wzorzec musi przejść przez checkbox: `^\s*[-*]\s*(?:\[[ xX]\]\s*)?\*{0,2}(AUTO-\d+)`.
   Odcisk pustego zbioru = 0 nowych pozycji i to jest stan spoczynku.

## 4. Weryfikacja pętli (dowód, nie wrażenie)

```bash
# co jest w harmonogramie i na czym ma chodzić
python -c "import json;d=json.load(open(r'C:/Users/majke/.hermes/profiles/jarvis-desktop/cron/jobs.json',encoding='utf-8'));jobs=d.get('jobs',d);jobs=list(jobs.values()) if isinstance(jobs,dict) else jobs;[print(j.get('id'),j.get('name'),(j.get('schedule') or {}).get('expr'),'model=',j.get('model'),'prov=',j.get('model_provider') or j.get('provider'),'monitor=',j.get('monitor_script')) for j in jobs]"

# czy agent faktycznie ruszył i na jakim modelu
python -c "import sqlite3;c=sqlite3.connect('file:C:/Users/majke/.hermes/profiles/jarvis-desktop/state.db?mode=ro',uri=True);[print(r) for r in c.execute(\"select id,model from sessions where id like 'cron_%' order by rowid desc limit 5\")]"

# status i dostawa przebiegów
python -c "import sqlite3;c=sqlite3.connect('file:C:/Users/majke/.hermes/profiles/jarvis-desktop/cron/executions.db?mode=ro',uri=True);[print(r) for r in c.execute('select status,started_at,finished_at,delivery_outcome,coalesce(error,\'\') from executions order by rowid desc limit 5')]"

# test bramki: uruchom monitor dwa razy — identyczny stdout = model nie ruszy
<profil>/../../hermes-agent/venv/Scripts/python.exe scripts/auto_monitor.py
```

Interpretacja: `cron_<job_id>_<ts>` w `sessions` = model wołany; przebieg w ~1–2 s z `delivery_outcome=suppressed`
przy braku nowej sesji = bramka zadziałała. Ręczne wywołanie joba (`cron run <id>`) można wykonać
raz, żeby zobaczyć ścieżkę agenta — kolejne wywołania bez zmiany danych nic nie robią (to jest dowód).

## 5. Model rozliczeniowy

- Płatne API: budżet w USD/dzień, kontrola w skrypcie strażnika i w `budzet.json`.
- Subskrypcja (MiniMax): nie ma kosztu za wywołanie, są **okna** (5 h, tydzień) i limity tempa;
  plan jest pomyślany do pracy interaktywnej, więc ciągła automatyka 24/7 opiera się na bramkowaniu,
  nie na gęstości. Narzut jednego przebiegu agenta ≈ 45 tys. tokenów wejścia (kontekst startowy:
  SOUL + pamięci + skille z `skills.auto_load`).
- Raport dnia/tygodnia pokazuje zużycie per model (z `session_model_usage`) — to jedyna liczba,
  którą warto podawać użytkownikowi, gdy pyta „ile to zjada planu”.

## 6. Pułapki

- **`write_file` w katalogu profilu a `patch`:** poprawki w skryptach rób `patch`em; pełne
  nadpisanie może zostać odrzucone, jeśli plik czytano tylko fragmentami (patrz SKILL.md §5.3 pkt 12).
- **Interpreter:** skrypty uruchamiaj `C:\Users\majke\.hermes\hermes-agent\venv\Scripts\python.exe`
  — powłokowy `python` nie ma bibliotek Hermesa.
- **Nie dodawaj nowych pętli bez wpisu do `AUTONOMIA.md`, `stan.md` i `dziennik.md`** — inaczej stan
  na żywo rozjeżdża się z rzeczywistością i kolejna sesja pracuje na nieprawdzie.
- **Zmiana istniejącej pętli = popraw tabelę w `stan.md`** (to miejsce, z którego agent czyta stan),
  a nie tylko `jobs.json`.
