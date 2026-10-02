# CAPABILITIES — Zdolności systemu

## Definicja

**CAPABILITY** = "Co Jev może zrobić?"  
**TOOL** = "Czym Jev może to zrobić?"  
**ACTION** = "Jaką konkretną operację wykonuje?"

Jev nie zakłada, że potrafi wykonać dowolną akcję. Sprawdza dostępne capabilities przed podjęciem decyzji.

---

## 1. Struktura Capability

Każda capability posiada:

```
CAPABILITY:
├── id: unikalny identyfikator
├── name: nazwa wyświetlana
├── description: co oferuje
├── category: kategoria (SYSTEM, FILES, BROWSER, etc.)
├── actions: lista akcji
├── requirements: wymagania
├── permissions: potrzebne uprawnienia
├── risk: poziom ryzyka (low → critical)
├── cost: szacunkowy koszt
├── latency: szacunkowy czas
├── availability: status (available, degraded, unavailable)
├── verification: jak sprawdzić wynik
└── fallbacks: alternatywy przy błędzie
```

---

## 2. Katalog Capabilities

### 2.1 SYSTEM

```
ID: system
NAME: System Operations
DESCRIPTION: Operacje systemowe - uruchamianie, zamykanie, informacje
CATEGORY: SYSTEM
RISK: low → high
AVAILABILITY: available

ACTIONS:
├── get_system_info
├── get_processes
├── kill_process
├── open_app
├── close_app
└── restart_system

VERIFICATION:
├── check_process_exists
├── check_app_running
└── check_system_state
```

### 2.2 FILES

```
ID: files
NAME: File Operations
DESCRIPTION: Operacje na plikach i folderach
CATEGORY: FILES
RISK: low → critical
AVAILABILITY: available

ACTIONS:
├── search          (glob, regex, content)
├── read            (plik tekstowy, binarny)
├── create          (nowy plik/folder)
├── write           (nadpisz, dopisz)
├── copy            (lokalnie, do/from)
├── move            (lokalnie)
├── rename          (zmiana nazwy)
├── delete          (do kosza, permanent)
├── archive         (zip, tar)
├── compare         (diff)
└── classify        (kategorie, tagi)

REQUIREMENTS:
├── parent_directory_exists
└── (dla delete): file_exists

RISK MATRIX:
├── read:       LOW
├── search:     LOW
├── create:     LOW
├── copy:       MEDIUM
├── move:       MEDIUM
├── rename:     MEDIUM
├── delete:     HIGH
└── archive:    LOW

VERIFICATION:
├── check_file_exists
├── check_file_content
├── check_hash
└── check_location

FALLBACKS:
├── primary: API
├── fallback: terminal (cp, mv, rm)
└── final: ask_user
```

### 2.3 DESKTOP

```
ID: desktop
NAME: Jarvis Desktop Control
DESCRIPTION: Kontrola środowiska Jarvis OS
CATEGORY: DESKTOP
RISK: low
AVAILABILITY: available

ACTIONS:
├── open_app           (uruchom aplikację Jarvis)
├── close_app          (zamknij aplikację)
├── focus_app          (aktywuj okno)
├── move_window        (przesuń okno)
├── resize_window      (zmień rozmiar)
├── minimize_window    (minimalizuj)
├── maximize_window    (maksymalizuj)
├── pin_window        (przypnij nad innymi)
├── arrange_layout     (układ: tile, left, right...)
├── save_layout        (zapisz układ)
├── load_layout        (wczytaj układ)
├── create_widget      (utwórz widget)
├── update_widget      (aktualizuj widget)
├── delete_widget      (usuń widget)
├── create_project     (utwórz projekt)
└── create_folder      (utwórz folder)

RISK: LOW (wszystkie operacje)

VERIFICATION:
├── check_window_exists
├── check_widget_visible
└── check_layout_saved
```

### 2.4 BROWSER

```
ID: browser
NAME: Browser Automation
DESCRIPTION: Sterowanie przeglądarką agenta
CATEGORY: BROWSER
RISK: low → medium
AVAILABILITY: available

ACTIONS:
├── open_url           (nawigacja do URL)
├── open_new_tab       (nowa karta)
├── close_tab          (zamknij kartę)
├── switch_tab         (przełącz kartę)
├── click              (element lub coordinates)
├── type               (wpisz tekst)
├── select             (wybierz z listy)
├── hover              (najedź na element)
├── scroll             (direction, amount)
├── go_back            (wstecz)
├── go_forward         (dalej)
├── reload             (odśwież)
├── wait_for           (czekaj na warunek)
├── screenshot         (zrzut ekranu)
├── evaluate_js        (wykonaj JavaScript)
├── upload_file        (prześlij plik)
├── extract_content    (pobierz tekst/HTML)
├── fill_form          (wypełnij formularz)
└── search             (wyszukiwanie)

REQUIREMENTS:
├── url_valid (dla open_url)
├── element_exists (dla click, type)
└── page_loaded (dla wait_for)

VERIFICATION:
├── check_url_changed
├── check_element_exists
├── check_content_extracted
├── check_download_started
└── check_form_filled

FALLBACKS:
├── primary: browser_api
├── fallback: web_command
└── final: ask_user
```

### 2.5 TERMINAL

```
ID: terminal
NAME: Terminal Operations
DESCRIPTION: Wykonywanie poleceń systemowych
CATEGORY: TERMINAL
RISK: medium → critical
AVAILABILITY: available

ACTIONS:
├── run_command        (wykonaj polecenie)
├── run_interactive   (sesja interaktywna)
├── kill_process      (zabij proces)
├── get_output        (pobierz wyjście)
└── background_task   (uruchom w tle)

RISK MATRIX:
├── npm test:         LOW
├── npm install:      LOW
├── npm run:          LOW
├── git status:       LOW
├── git pull:         MEDIUM
├── git push:         HIGH
├── rm file:          HIGH
├── rm -rf:           CRITICAL
├── dd:               CRITICAL
├── curl | sh:        CRITICAL

REQUIREMENTS:
├── command_safe (sprawdź czy nie niebezpieczne)
└── permissions_ok

VERIFICATION:
├── check_exit_code
├── check_output
└── check_process_state

PERMISSIONS:
├── read_only: ls, cat, grep, find
├── standard: npm, git, python
└── restricted: rm, dd, curl|sh (wymaga confirm)
```

### 2.6 CODE

```
ID: code
NAME: Code Operations
DESCRIPTION: Operacje programistyczne
CATEGORY: CODE
RISK: low → high
AVAILABILITY: available

ACTIONS:
├── analyze_code       (analiza struktury)
├── search_bugs       (wyszukiwanie błędów)
├── edit_file         (edycja pliku)
├── refactor          (refaktoryzacja)
├── create_component  (tworzenie komponentu)
├── create_app        (tworzenie aplikacji)
├── run_tests         (uruchomienie testów)
├── fix_bugs          (naprawianie błędów)
├── analyze_architecture (analiza architektury)
├── document_code     (dokumentacja)
├── lint              (sprawdzenie stylu)
├── typecheck         (sprawdzenie typów)
├── build             (budowanie)
└── deploy            (deployment)

VERIFICATION:
├── lint_passed
├── tests_passed
├── build_succeeded
└── typecheck_passed
```

### 2.7 GIT

```
ID: git
NAME: Git Operations
DESCRIPTION: Operacje na repozytoriach Git
CATEGORY: GIT
RISK: low → high

ACTIONS:
├── status            (stan repozytorium)
├── diff              (zmiany)
├── log               (historia commitów)
├── branch            (zarządzanie branchami)
├── checkout          (przełącz branch)
├── commit            (commit zmian)
├── merge             (scalenie branchy)
├── pull              (pobranie zmian)
├── push              (wysłanie zmian)
├── revert            (cofnij commit)
├── stash            (schowaj zmiany)
└── analyze_history  (analiza historii)

RISK MATRIX:
├── status:          LOW
├── diff:            LOW
├── log:             LOW
├── branch:          LOW
├── checkout:        LOW
├── commit:          MEDIUM
├── merge:           MEDIUM
├── pull:            MEDIUM
├── push:            HIGH
├── revert:          HIGH
└── force_push:      CRITICAL
```

### 2.8 VISION

```
ID: vision
NAME: Vision & UI Analysis
DESCRIPTION: Analiza obrazu i interfejsu
CATEGORY: VISION
RISK: low
AVAILABILITY: available

ACTIONS:
├── analyze_screenshot   (analiza zrzutu ekranu)
├── detect_elements      (wykryj elementy UI)
├── detect_buttons       (wykryj przyciski)
├── analyze_layout       (analiza układu)
├── compare_images       (porównaj dwa obrazy)
├── detect_visual_errors (wykryj błędy wizualne)
├── check_responsiveness (sprawdź responsywność)
└── verify_design_match  (weryfikacja zgodności z projektem)

REQUIREMENTS:
├── screenshot_exists
└── (dla compare): two_images

VERIFICATION:
├── elements_detected
├── layout_analyzed
└── comparison_result
```

### 2.9 VOICE

```
ID: voice
NAME: Voice Operations
DESCRIPTION: Obsługa głosu
CATEGORY: VOICE
RISK: low
AVAILABILITY: available

ACTIONS:
├── speech_to_text    (rozpoznawanie mowy)
├── interpret_command (interpretacja polecenia)
├── text_to_speech    (synteza mowy)
├── detect_interrupt  (wykryj przerwanie)
├── continue_conversation (kontynuuj rozmowę)
└── voice_activity    (wykryj aktywność głosową)

REQUIREMENTS:
├── microphone_available
└── speech_recognition_supported

VERIFICATION:
├── command_interpreted
├── speech_recognized
└── tts_completed
```

### 2.10 WEB_SEARCH

```
ID: web_search
NAME: Web Search & Research
DESCRIPTION: Wyszukiwanie i badanie internetu
CATEGORY: WEB_SEARCH
RISK: low
AVAILABILITY: available

ACTIONS:
├── search             (wyszukiwanie)
├── compare_sources    (porównanie źródeł)
├── filter_results    (filtrowanie wyników)
├── analyze_page      (analiza strony)
├── extract_data      (ekstrakcja danych)
├── monitor_changes   (monitorowanie zmian)
└── research_topic    (badanie tematu)

REQUIREMENTS:
├── internet_available
└── url_valid

DECISION:
├── "Czy potrzebuję internetu?"
├── if local_data_sufficient → use local
└── else → use web_search
```

### 2.11 DATA

```
ID: data
NAME: Data Operations
DESCRIPTION: Praca z danymi
CATEGORY: DATA
RISK: low
AVAILABILITY: available

ACTIONS:
├── parse_csv          (parsowanie CSV)
├── parse_json         (parsowanie JSON)
├── parse_excel        (parsowanie Excel)
├── transform_data     (transformacja danych)
├── analyze_stats     (analiza statystyczna)
├── create_chart      (tworzenie wykresów)
├── export_data       (eksport danych)
├── query_database    (zapytania do bazy)
└── analyze_sql       (analiza zapytań SQL)

REQUIREMENTS:
├── file_format_valid
└── (dla query): database_connection
```

### 2.12 DATABASE

```
ID: database
NAME: Database Operations
DESCRIPTION: Operacje na bazach danych
CATEGORY: DATABASE
RISK: medium → high

ACTIONS:
├── read_data         (odczyt danych)
├── execute_query     (wykonaj zapytanie)
├── create_record    (utwórz rekord)
├── update_record    (aktualizuj rekord)
├── delete_record    (usuń rekord)
├── analyze_schema   (analiza schematu)
└── backup           (kopia zapasowa)

REQUIREMENTS:
├── database_connected
└── permissions_ok

RISK MATRIX:
├── read:            LOW
├── execute_query:   MEDIUM
├── create:          MEDIUM
├── update:          HIGH
├── delete:          HIGH
└── backup:          LOW

VERIFICATION:
├── query_succeeded
├── record_exists
└── backup_created
```

### 2.13 COMMUNICATION

```
ID: communication
NAME: Communication
DESCRIPTION: Komunikacja z zewnętrznymi usługami
CATEGORY: COMMUNICATION
RISK: medium → critical

ACTIONS:
├── prepare_email     (przygotuj email)
├── send_email       (wyślij email)
├── send_message     (wyślij wiadomość)
├── read_messages    (czytaj wiadomości)
├── send_notification (wyślij powiadomienie)
├── read_calendar    (czytaj kalendarz)
├── create_event     (utwórz wydarzenie)
└── update_event     (aktualizuj wydarzenie)

REQUIREMENTS:
├── service_authenticated
└── permissions_ok

RISK MATRIX:
├── prepare_email:   LOW
├── read_messages:   LOW
├── send_message:    HIGH
├── send_email:      CRITICAL
└── create_event:    MEDIUM

VERIFICATION:
├── message_sent
├── email_delivered
└── event_created
```

### 2.14 MEMORY

```
ID: memory
NAME: Memory Operations
DESCRIPTION: Zarządzanie pamięcią systemu
CATEGORY: MEMORY
RISK: low

ACTIONS:
├── remember          (zapisz fakt)
├── recall           (wyszukaj wspomnienia)
├── forget           (usuń wspomnienie)
├── update_context   (aktualizuj kontekst)
├── analyze_history  (analiza historii)
├── manage_project_memory (pamięć projektu)
└── save_preference  (zapisz preferencję)

REQUIREMENTS:
└── memory_available

DECISION:
├── Co robię?
├── Po co to robię?
├── Co już zrobiłem?
├── Co się zmieniło?
└── Co mam zrobić dalej?
```

### 2.15 TASK_MANAGEMENT

```
ID: task_management
NAME: Task Management
DESCRIPTION: Zarządzanie zadaniami
CATEGORY: TASK
RISK: low

ACTIONS:
├── create_task       (utwórz zadanie)
├── complete_task    (oznacz wykonane)
├── remove_task      (usuń zadanie)
├── prioritize       (ustaw priorytet)
├── split_task       (podziel na podzadania)
├── track_status     (śledź status)
├── resume_task      (wznowij zadanie)
├── cancel_task      (anuluj zadanie)
├── retry_task       (powtórz zadanie)
└── recover_task     (odtwórz zadanie)

VERIFICATION:
├── task_exists
├── task_completed
└── status_changed
```

### 2.16 MULTI_AGENT

```
ID: multi_agent
NAME: Multi-Agent Coordination
DESCRIPTION: Koordynacja wielu agentów
CATEGORY: AGENT
RISK: low → medium

ACTIONS:
├── delegate_task     (deleguj zadanie)
├── coordinate_agents (koordynuj agentów)
├── gather_results   (zbierz wyniki)
├── merge_outputs    (połącz wyjścia)
└── manage_agent_pool (zarządzaj pulą agentów)

REQUIREMENTS:
└── agents_available

ARCHITECTURE:
JEV (koordynator)
├── RESEARCH AGENT
├── CODE AGENT
├── UI AGENT
├── TEST AGENT
└── REVIEW AGENT
```

### 2.17 MODEL_ROUTING

```
ID: model_routing
NAME: AI Model Selection
DESCRIPTION: Wybór modelu AI odpowiedniego do zadania
CATEGORY: AI
RISK: low

ACTIONS:
├── classify_task     (klasyfikuj zadanie)
├── estimate_complexity (oszacuj złożoność)
├── select_model     (wybierz model)
├── estimate_cost    (oszacuj koszt)
├── estimate_latency (oszacuj czas)
└── optimize_budget  (zoptymalizuj budżet)

DECISION TREE:
Task
  ↓
Classify (simple / standard / complex / deep)
  ↓
Requirements (quality, speed, cost)
  ↓
Model Router
  ↓
SELECT MODEL:
├── simple:    gpt-4o-mini, haiku
├── standard:  gpt-4o, claude
├── complex:   gpt-4, claude
└── deep:      gpt-4 + reasoning

PARAMETERS:
├── Quality:   najlepszy model
├── Speed:     najszybszy model
└── Cost:      najtańszy model
```

---

## 3. Capability Registry

Centralny rejestr wszystkich capabilities:

```
CAPABILITY_REGISTRY = {
  system:      { status: AVAILABLE, actions: 6 },
  files:       { status: AVAILABLE, actions: 11 },
  desktop:     { status: AVAILABLE, actions: 16 },
  browser:     { status: AVAILABLE, actions: 19 },
  terminal:    { status: AVAILABLE, actions: 5 },
  code:        { status: AVAILABLE, actions: 14 },
  git:         { status: AVAILABLE, actions: 12 },
  vision:      { status: AVAILABLE, actions: 8 },
  voice:       { status: AVAILABLE, actions: 6 },
  web_search:  { status: AVAILABLE, actions: 7 },
  data:        { status: AVAILABLE, actions: 9 },
  database:    { status: AVAILABLE, actions: 7 },
  communication: { status: AVAILABLE, actions: 8 },
  memory:      { status: AVAILABLE, actions: 7 },
  task_management: { status: AVAILABLE, actions: 10 },
  multi_agent: { status: AVAILABLE, actions: 5 },
  model_routing: { status: AVAILABLE, actions: 6 }
}
```

---

## 4. Capability Discovery

### 4.1 Sprawdzenie dostępności

```
CAPABILITY_DISCOVERY:
1. User goal: "Wyślij na Slacka"
2. Required: communication.slack
3. Check registry:
   └── communication.status = AVAILABLE
4. Check permissions:
   └── slack.authenticated = true
5. Check health:
   └── communication.health = OK
6. Execute
```

### 4.2 Dynamic Loading

```
DYNAMIC_LOADING:
1. User: "Przeanalizuj plik CAD"
2. JEV: CHECK CAPABILITIES
3. CAD capability? → NO
4. DISCOVER PLUGIN
5. LOAD CAPABILITY
6. VERIFY
7. EXECUTE
```

---

## 5. Capability Graph

Zależności między capabilities:

```
CREATE_APP
│
├── FILES (read, write, create)
├── CODE (analyze, edit, build)
├── TERMINAL (run commands)
├── BROWSER (test, screenshot)
├── VISION (verify UI)
└── TASK_MANAGEMENT (track progress)

SEND_EMAIL
│
├── COMMUNICATION (prepare)
├── AUTHENTICATION (verify)
├── FILES (attach)
└── VERIFICATION (confirm)

RESEARCH_TOPIC
│
├── WEB_SEARCH (gather)
├── DATA (extract)
├── CODE (analyze)
└── MEMORY (save results)
```

---

## 6. Health Status

Każda capability ma status:

```
HEALTH_STATUS:
├── AVAILABLE:      działa normalnie
├── DEGRADED:      działa wolniej/ograniczenie
├── BUSY:          kolejka oczekujących
├── UNAVAILABLE:   nie działa
├── ERROR:         błąd wewnętrzny
├── DISABLED:      wyłączone przez użytkownika
└── REQUIRES_AUTH: wymaga autoryzacji

EXAMPLE:
{
  browser:    AVAILABLE,
  terminal:   AVAILABLE,
  email:      REQUIRES_AUTH,
  database:   DISABLED,
  vision:     AVAILABLE
}
```

---

## 7. Cost & Latency

Szacunkowe wartości:

```
COST_LATENCY:
local_search:    { cost: LOW,   latency: <100ms }
navigate:        { cost: LOW,   latency: <500ms }
read_file:       { cost: LOW,   latency: <1s }
web_search:      { cost: MEDIUM, latency: 1-3s }
browser_automation: { cost: MEDIUM, latency: 1-5s }
code_analysis:   { cost: MEDIUM, latency: 3-10s }
deep_research:   { cost: HIGH,  latency: 10-30s }
ai_generation:   { cost: HIGH,  latency: 30s+ }
```

---

## 8. Capability Contract

Wzór kontraktu:

```
CAPABILITY CONTRACT:
INPUT:         jakie dane przyjmuje
ACTION:        co wykonuje
OUTPUT:        co zwraca
RISK:          jakie ryzyko generuje
PERMISSION:    jakie uprawnienia są potrzebne
VERIFICATION:  jak sprawdzić wynik
FALLBACK:      co zrobić jeśli się nie powiedzie
LIMITS:        czego capability nie potrafi
```

---

## 9. Przykłady użycia

### Przykład 1: Proste zadanie

```
User: "Otwórz folder Downloads"
  ↓
GOAL: open folder
  ↓
REQUIRED: desktop.files
  ↓
RISK: safe
  ↓
DECISION: execute automatically
  ↓
ACTION: open_folder("Downloads")
  ↓
VERIFICATION: folder_visible
  ↓
RESULT: success
```

### Przykład 2: Złożone zadanie

```
User: "Znajdź PDF-y o projekcie i zrób podsumowanie"
  ↓
DETECTED CAPABILITIES:
├── FILES (search, read)
├── DATA (extract)
├── WEB_SEARCH (research)
└── AI (analyze, summarize)
  ↓
SEQUENCE:
1. FILES.search("*.pdf", "projekt")
2. FILES.read(pdf_files)
3. DATA.extract(content)
4. AI.analyze(summarize)
5. MEMORY.remember(summary)
  ↓
VERIFICATION: summary_created
  ↓
RESULT: success
```

---

## 10. Dynamic Selection

Najważniejszy przepływ:

```
USER_GOAL
    ↓
JEV
    ↓
UNDERSTAND
    ↓
REQUIRED_CAPABILITIES
    ↓
CAPABILITY_REGISTRY
    ↓
AVAILABLE_OPTIONS
    ↓
RISK / COST / LATENCY
    ↓
SELECT_BEST
    ↓
HERMES
    ↓
EXECUTE
    ↓
VERIFY
```

---

## 11. Connection to SOUL

Integracja z warstwą tożsamości:

```
SOUL
   ↓
SYSTEM (current state)
   ↓
USER (who, preferences)
   ↓
PROJECT (context)
   ↓
TASK (what to do)
   ↓
MEMORY (what I know)
   ↓
CAPABILITIES ← TUTAJ: wybór zdolności
   ↓
PERMISSIONS (what I can do)
   ↓
DECISION (what I choose)
   ↓
HERMES (how I do it)
   ↓
TOOLS (with what)
   ↓
EVENT BUS (what happened)
   ↓
VERIFY (did it work?)
```
