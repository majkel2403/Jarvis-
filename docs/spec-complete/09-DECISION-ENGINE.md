# DECISION ENGINE — Silnik decyzyjny JEV

## Definicja

JEV to warstwa decyzyjna Jarvis OS. Odpowiada za rozumienie intencji użytkownika, podejmowanie decyzji i wybór kolejnych działań.

---

## Architektura

```
                    USER INPUT
                         │
                         ▼
                  ┌─────────────┐
                  │   PARSER    │ ← rozpoznanie typu polecenia
                  └──────┬──────┘
                         ▼
                  ┌─────────────┐
                  │    JUDGE    │ ← ocena i wybór działania
                  └──────┬──────┘
                         ▼
                  ┌─────────────┐
                  │   POLICY    │ ← poziom autonomii
                  └──────┬──────┘
                         ▼
                  ┌─────────────┐
                  │  EXECUTOR   │ ← wykonanie przez Hermes/Bridge
                  └──────┬──────┘
                         ▼
                  ┌─────────────┐
                  │  VERIFIER   │ ← weryfikacja wyniku
                  └─────────────┘
```

---

## 1. PARSER — Rozpoznanie polecenia

### 1.1 Funkcja

Parser przekształca tekst użytkownika w strukturę zrozumiałą dla systemu.

### 1.2 Wejście / Wyjście

```
INPUT: "Otwórz kalkulator za 5 minut"
       │
       ▼
OUTPUT: {
  intent: "open_app",
  entities: {
    app: "calc",
    time: "5 minutes"
  },
  confidence: 0.95,
  raw: "Otwórz kalkulator za 5 minut"
}
```

### 1.3 Typy rozpoznawanych poleceń

| Typ | Przykład | Obsługa |
|-----|----------|---------|
| `command` | "Otwórz kalkulator" | Bezpośrednie wykonanie |
| `question` | "Jaka jest pogoda?" | Odpowiedź z danych |
| `task` | "Przygotuj raport" | Sekwencja działań |
| `clarification` | "Co masz na myśli?" | Pytanie o doprecyzowanie |
| `confirmation` | "Tak, zgadzam się" | Potwierdzenie |
| `negation` | "Nie, nie rób tego" | Anulowanie |
| `meta` | "Co możesz zrobić?" | Pomoc |

### 1.4 Istniejący parser

W `js/jev-flow.js` istnieje już parser rozpoznający polecenia z rejestru.

---

## 2. JUDGE — Ocena i decyzja

### 2.1 Funkcja

Judge ocenia kontekst i wybiera najlepsze działanie.

### 2.2 Wejście / Wyjście

```
INPUT: {
  parsed: { intent: "open_app", entities: {...} },
  context: { currentApps: [...], recentActions: [...] },
  history: [...]
}
       │
       ▼
OUTPUT: {
  action: "open_app",
  target: "calc",
  confidence: 0.92,
  reasoning: "Użytkownik chce otworzyć kalkulator",
  alternatives: [
    { action: "web_search", query: "kalkulator online", confidence: 0.3 }
  ]
}
```

### 2.3 Podejmowanie decyzji

```
Decision process:
1. Znajdź dopasowania w Rejestrze
2. Oblicz confidence dla każdego
3. Wybierz najlepszy (threshold > 0.7)
4. Jeśli brak dopasowania → fallback do AI (TypeSafe)
5. Jeśli wiele dopasowań → ask user
```

### 2.4 Istniejący judge

W `js/judge.js` jest już implementacja z TypeSafe AI.

---

## 3. REASONING ROUTING — Wybór poziomu analizy

### 3.1 Definicja

Nie każde zadanie wymaga maksymalnego poziomu analizy. Jev musi wiedzieć, jak intensywnie myśleć.

### 3.2 Poziomy reasoningu

| Poziom | Kiedy stosować | Przykład |
|--------|----------------|-----------|
| **INSTANT** | Proste polecenia | "Otwórz Chrome" |
| **SIMPLE** | Jednoznaczne zadania | "Znajdź plik X" |
| **STANDARD** | Większość zadań | "Przygotuj raport" |
| **COMPLEX** | Wiele możliwości | "Zaprojektuj aplikację" |
| **DEEP** | Analiza systemu | "Przeanalizuj architekturę i przebuduj" |

### 3.3 Drzewo decyzyjne

```
INPUT
  │
  ▼
CLASSIFY TASK
  │
  ├── Czy jednoznaczne? → INSTANT
  │
  ├── Czy proste? → SIMPLE
  │
  ├── Czy wymaga wyboru? → STANDARD
  │
  ├── Czy wymaga planowania? → COMPLEX
  │
  └── Czy wymaga analizy? → DEEP
```

### 3.4 Koszt vs Jakość

```
REASONING_COST:
INSTANT:   token_cost = 0, latency = 0ms
SIMPLE:    token_cost = 50, latency = 100ms
STANDARD:  token_cost = 500, latency = 1s
COMPLEX:   token_cost = 2000, latency = 5s
DEEP:      token_cost = 10000+, latency = 30s+
```

### 3.5 Przykłady

```
"Otwórz kalkulator"
→ INSTANT
→ Wykonaj natychmiast, bez analizy AI

"Zapisz tę notatkę"
→ SIMPLE
→ Parsuj, wykonaj

"Znajdź wszystkie pliki PDF z raportami"
→ STANDARD
→ Zrozum cel, wybierz narzędzia, wykonaj

"Zbadaj rynek i przygotuj strategię"
→ COMPLEX
→ Dekomponuj cel, planuj kroki, wykonaj sekwencyjnie

"Przeanalizuj całą architekturę systemu i przedstaw rekomendacje"
→ DEEP
→ Pełna analiza, wiele źródeł, synteza
```

---

## 4. MODEL ROUTING — Wybór modelu AI

### 4.1 Definicja

Jev musi wybrać odpowiedni model AI do zadania na podstawie wymagań jakości, szybkości i kosztu.

### 4.2 Parametry routingu

| Parametr | Opis |
|----------|------|
| **Quality** | Najlepsza jakość wyniku |
| **Speed** | Najszybszy czas odpowiedzi |
| **Cost** | Najniższy koszt |
| **Multimodal** | Obsługa obrazów, głosu |
| **Specialized** | Specjalizacja (kod, tekst, dane) |
| **Available** | Aktualnie dostępny |

### 4.3 Macierz modeli

```
MODEL_MATRIX:
                    Quality  Speed   Cost    Context
gpt-4o              high     fast    high    128k
gpt-4o-mini         medium   fast    low     128k
claude-3.5-sonnet    high     medium  high    200k
claude-3-haiku       medium   fast    low     200k
gpt-4-turbo         high     medium  medium  128k
gemini-1.5-pro      high     medium  medium  2M
gemini-1.5-flash    medium   fast    low     1M
local-llama         medium   fast    free    8k
```

### 4.4 Routing logic

```
TASK REQUIREMENTS
  │
  ▼
ANALYZE
  │
  ├── Quality needed?    → use best model
  ├── Speed needed?      → use fastest model
  ├── Cost limit?        → use cheapest
  ├── Multimodal?        → check vision support
  └── Specialized?       → check domain
  │
  ▼
SELECT MODEL
  │
  ├── if quality > speed → gpt-4o / claude
  ├── if speed > quality → gpt-4o-mini / haiku
  ├── if cost limit      → check budget remaining
  └── if multimodal     → verify vision support
  │
  ▼
EXECUTE WITH SELECTED MODEL
```

### 4.5 Budget-aware routing

```
BUDGET_TRACKING:
daily_limit: $5
current_spent: $3.50
remaining: $1.50

DECISION:
├── remaining > $1 → use standard model
├── remaining > $0.50 → use cheap model
└── remaining <= $0.50 → queue or ask user
```

---

## 5. CAPABILITY SELECTION — Wybór zdolności

### 5.1 Definicja

Jev nie wybiera narzędzia na sztywno. Najpierw określa jakie capabilities są potrzebne, potem wybiera najlepsze dostępne narzędzie.

### 5.2 Proces wyboru

```
USER GOAL
    │
    ▼
DECOMPOSE TO CAPABILITIES
    │
    ├── "Otwórz folder" → FILES, DESKTOP
    ├── "Wyślij email" → COMMUNICATION
    ├── "Zbadaj temat" → WEB_SEARCH, DATA
    └── "Zbuduj app" → FILES, CODE, TERMINAL, TEST
    │
    ▼
CHECK CAPABILITY REGISTRY
    │
    ├── capability.available?
    ├── capability.health?
    ├── capability.permissions?
    └── capability.cost?
    │
    ▼
SELECT IMPLEMENTATION
    │
    ├── FILES → fs tool / terminal
    ├── BROWSER → api / web_command
    └── TERMINAL → hermes / system
    │
    ▼
EXECUTE
```

### 5.3 Fallback logic

```
PRIMARY: Files API
FALLBACK 1: Terminal (cp, mv, rm)
FALLBACK 2: Ask user for manual action
```

### 5.4 Capability Graph

```
GOAL: research_and_create_report
    │
    ├─→ CAPABILITY: web_search
    │       └─→ TOOL: browser.search
    │
    ├─→ CAPABILITY: data_extraction
    │       └─→ TOOL: browser.extract / web_read
    │
    ├─→ CAPABILITY: analysis
    │       └─→ TOOL: ai.analyze
    │
    └─→ CAPABILITY: create_document
            └─→ TOOL: notes.create
```

---

## 6. CONTEXT AGGREGATION — Agregacja kontekstu

### 6.1 Definicja

Zanim Jev podejmie decyzję, musi zbudować pełny kontekst z wielu źródeł.

### 6.2 Źródła kontekstu

```
CONTEXT_SOURCES:
├── SHORT_TERM
│   ├── current_action: co robię teraz
│   ├── recent_actions: ostatnie 10 akcji
│   └── last_observation: co widziałem
│
├── TASK_MEMORY
│   ├── goal: jaki jest cel
│   ├── steps: jakie kroki zostały
│   ├── completed: co zrobiono
│   └── remaining: co zostało
│
├── LONG_TERM
│   ├── user_preferences: co użytkownik lubi
│   ├── user_facts: co wiem o użytkowniku
│   ├── system_knowledge: wiedza systemowa
│   └── history:Historia działań
│
├── SYSTEM_STATE
│   ├── windows: jakie okna otwarte
│   ├── apps: jakie aplikacje działają
│   ├── resources: ile zasobów dostępnych
│   └── capabilities: jakie zdolności dostępne
│
└── CONVERSATION
    ├── last_user_message
    ├── last_agent_response
    └── pending_questions
```

### 6.3 Budowanie kontekstu

```
BUILD_CONTEXT(task):
1. Load SHORT_TERM
2. Load TASK_MEMORY (if exists)
3. Load relevant LONG_TERM facts
4. Load SYSTEM_STATE
5. Load CONVERSATION history
6. PRIORITIZE by relevance
7. TRUNCATE if exceeds limit
8. RETURN aggregated context
```

### 6.4 Kontekst dla różnych typów zadań

```
SIMPLE_TASK:
└── just system_state + conversation

STANDARD_TASK:
├── system_state
├── conversation
└── relevant history

COMPLEX_TASK:
├── system_state
├── conversation
├── task_memory (goal, steps)
├── relevant long_term facts
└── capabilities needed
```

---

## 7. TASK DECOMPOSITION — Dekompozycja zadań

### 7.1 Definicja

Duże zadania muszą być rozbite na mniejsze kroki.

### 7.2 Typy dekompozycji

| Typ | Kiedy stosować | Przykład |
|-----|----------------|----------|
| **SEQUENTIAL** | Kroki muszą być w kolejności | A → B → C |
| **PARALLEL** | Kroki niezależne | A, B, C jednocześnie |
| **CONDITIONAL** | Zależne od warunku | IF A THEN B ELSE C |
| **ITERATIVE** | Powtarzaj aż do warunku | WHILE A DO B |

### 7.3 Dekompozycja celów

```
GOAL: "Zbuduj aplikację webową"
  │
  ▼
DECOMPOSITION:
1. RESEARCH
   → market_analysis
   → competitor_analysis
   → requirements
2. DESIGN
   → ux_design
   → visual_design
3. ARCHITECTURE
   → system_design
   → database_design
4. IMPLEMENTATION
   → frontend
   → backend
   → integrations
5. TESTING
   → unit_tests
   → integration_tests
6. POLISH
   → performance
   → accessibility
7. DEPLOYMENT
   → staging
   → production
```

### 7.4 Subtask creation

```
CREATE_SUBTASKS(goal):
├── decompose(goal)
├── for each step:
│   ├── create_task(step)
│   ├── set_dependencies(step.depends_on)
│   ├── estimate_time(step)
│   └── estimate_resources(step)
└── return task_tree
```

---

## 8. GOAL PLANNING — Planowanie celów

### 8.1 Definicja

Wyższy poziom niż task decomposition. Plan to sekwencja kroków zależnych od siebie.

### 8.2 Struktura planu

```
PLAN:
{
  id: "plan_001",
  goal: "Zbadaj rynek AI i przygotuj raport",
  tasks: [
    {
      id: "task_1",
      capability: "web_search",
      action: "search",
      params: { query: "AI market trends 2024" },
      depends_on: [],
      status: "pending"
    },
    {
      id: "task_2",
      capability: "web_search", 
      action: "search",
      params: { query: "AI startups 2024" },
      depends_on: ["task_1"],
      status: "pending"
    },
    {
      id: "task_3",
      capability: "ai",
      action: "analyze",
      params: { input: "results from task_1 and task_2" },
      depends_on: ["task_1", "task_2"],
      status: "pending"
    },
    {
      id: "task_4",
      capability: "notes",
      action: "create",
      params: { title: "Raport AI" },
      depends_on: ["task_3"],
      status: "pending"
    }
  ],
  estimated_time: "15-20 minutes",
  estimated_cost: "$0.50"
}
```

### 8.3 Plan execution

```
EXECUTE_PLAN(plan):
for task in topological_sort(plan.tasks):
    if not all_dependencies_met(task):
        wait
    
    result = await execute_task(task)
    
    if result.success:
        update_task_status(task, "completed")
        emit_event("task_completed", task)
    else:
        if can_retry(task):
            retry(task)
        else:
            replan(plan, failed_task)
            break
```

---

## 9. MULTI-STEP EXECUTION — Wykonanie wielokrokowe

### 9.1 Definicja

Wykonywanie sekwencji kroków z weryfikacją każdego.

### 9.2 Workflow

```
MULTI_STEP_EXECUTION:
1. START
   └─→ Create execution context
2. NEXT STEP
   ├─→ Get next task from plan
   ├─→ Check dependencies
   └─→ Execute if ready
3. VERIFY
   ├─→ Check result
   ├─→ Compare with expected
   └─→ Decision: success / retry / replan
4. LOOP
   └─→ Until all complete or failed
5. COMPLETE / FAILED
   └─→ Finalize and report
```

### 9.3 Progress tracking

```
PROGRESS:
{
  total_steps: 5,
  completed: 2,
  current: 3,
  failed: 0,
  percentage: 40,
  estimated_remaining: "10 minutes"
}
```

---

## 10. POLICY — Poziom autonomii

### 10.1 Funkcja

Policy określa, czy działanie wymaga zgody użytkownika.

### 10.2 Poziomy autonomii (A0-A3)

| Poziom | Akcje | Przykłady |
|--------|-------|-----------|
| **A3** | Bez pytania | open_app, notes_list, get_weather |
| **A2** | Z "Cofnij" | create_note, add_task, create_widget |
| **A1** | Pytanie "Chodzi o...?" | Większość poleceń |
| **A0** | Pełne potwierdzenie | terminal, file delete |

### 10.3 Istniejące polityki

W `js/jev-policy.js` są już zdefiniowane poziomy autonomii.

---

## 11. EXECUTOR — Wykonanie

### 11.1 Funkcja

Executor wykonuje wybrane działanie przez Hermes/Bridge.

### 11.2 Ścieżka wykonania

```
Action chosen
     │
     ▼
Check autonomy level
     │
     ├── A3 → Execute immediately
     ├── A2 → Execute + offer undo
     ├── A1 → Ask user → Execute on confirm
     └── A0 → Full confirm → Execute on confirm
     │
     ▼
Call Hermes/Bridge
     │
     ▼
Get result
     │
     ▼
Verify result
```

### 11.3 Obsługa błędów

| Kod | Opis | Akcja |
|-----|------|-------|
| `OK` | Sukces | Zwróć wynik |
| `NOT_FOUND` | Nie znaleziono | Spróbuj alternatywy |
| `INVALID_ARGS` | Złe argumenty | Popraw i retry |
| `PERMISSION_DENIED` | Brak uprawnień | Poproś zgodę |
| `TIMEOUT` | Przekroczony czas | Retry |
| `AMBIGUOUS` | Wiele możliwości | Zapytaj użytkownika |

---

## 12. VERIFIER — Weryfikacja wyniku

### 12.1 Funkcja

Verifier sprawdza, czy działanie zakończyło się sukcesem.

### 12.2 Proces weryfikacji

```
After action executed:
     │
     ▼
1. Check return code
     ├── ok=true → continue
     └── ok=false → analyze error
     │
     ▼
2. Check observable state
     ├── URL changed?
     ├── Element appeared?
     ├── Content changed?
     └── Visual feedback?
     │
     ▼
3. Compare with expected
     │
     ▼
DECISION
     ├── all pass → SUCCESS
     ├── any fail → FAILED
     └── unclear → UNCERTAIN
```

### 12.3 Akcje po weryfikacji

| Wynik | Akcja |
|-------|-------|
| **SUCCESS** | Następny krok lub zakończ |
| **FAILED** | Retry lub zmień plan |
| **UNCERTAIN** | Zapytaj użytkownika |

---

## 13. RECOVERY — Odzyskiwanie po błędach

### 13.1 Strategie retry

| Strategia | Kiedy stosować | Max retries |
|-----------|----------------|-------------|
| **IMMEDIATE** | Błąd sieciowy | 3 |
| **EXPONENTIAL** | Błąd przejściowy | 5 |
| **FALLBACK** | Narzędzie niedostępne | 2 |
| **REPLAN** | Błąd krytyczny | 1 |

### 13.2 Retry logic

```
RETRY_DECISION(error, context):
├── if network_error → IMMEDIATE retry
├── if timeout → EXPONENTIAL retry
├── if not_found → CHECK ALTERNATIVE → FALLBACK
├── if permission_denied → ASK USER
└── if unknown → LOG AND_ABORT
```

### 13.3 Replan workflow

```
REPLAN(failed_task, error):
1. Analyze failure cause
2. Identify alternative path
3. Create new plan
4. Verify new plan is feasible
5. Execute new plan
6. If still fails → NOTIFY USER
```

---

## 14. Pełny Loop JEV

### 14.1 Schemat

```
                    ┌─────────────────────┐
                    │   USER INPUT        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      PARSER         │ ──→ intent, entities
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ REASONING ROUTER   │ ──→ INSTANT → DEEP
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   MODEL ROUTER     │ ──→ select model
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    JUDGE           │ ──→ action, confidence
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │CAPABILITY SELECTOR │ ──→ choose tools
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      POLICY         │ ──→ autonomy level
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                   YES                    NO
                    │                     │
                    ▼                     ▼
              ┌─────────┐          ┌─────────────┐
              │ EXECUTE │          │    ASK     │
              └────┬────┘          │   USER     │
                   │               └──────┬──────┘
                   │                      │
                   ▼                      ▼
            ┌─────────────┐        ┌───────────┐
            │  VERIFIER  │        │   WAIT    │
            └──────┬──────┘        │  CONFIRM  │
                   │               └─────┬─────┘
         ┌─────────┴─────────┐            │
         │                   │           YES
        SUCCESS            FAIL         │
         │                   │           │
         ▼                   ▼           ▼
   ┌──────────┐        ┌──────────┐ ┌─────────┐
   │ NEXT /  │        │ RETRY /  │ │ EXECUTE │
   │ COMPLETE│        │  REPLAN  │ └────┬────┘
   └──────────┘        └──────────┘      │
                                       NO
                                        │
                                        ▼
                                   ┌─────────┐
                                   │  ABORT  │
                                   └─────────┘
```

### 14.2 Implementacja

```javascript
async function jevLoop(input) {
  // 1. PARSE
  const parsed = await parser.parse(input)
  
  // 2. REASONING ROUTING
  const reasoningLevel = router.classify(parsed)
  
  // 3. MODEL ROUTING
  const model = router.select(parsed, reasoningLevel)
  
  // 4. JUDGE
  const decision = await judge.decide(parsed, model)
  
  // 5. CAPABILITY SELECTION
  const capabilities = selector.select(decision.action)
  
  // 6. POLICY
  const autonomy = policy.getLevel(decision.action)
  
  // 7. CHECK AUTONOMY
  if (autonomy >= 3) {
    // Execute directly
  } else if (autonomy >= 2) {
    // Execute with undo
  } else if (autonomy >= 1) {
    // Ask user first
    const confirmed = await askUser(decision)
    if (!confirmed) return { status: 'aborted' }
  } else {
    // Full confirm
    const confirmed = await confirmFull(decision)
    if (!confirmed) return { status: 'aborted' }
  }
  
  // 8. BUILD CONTEXT
  const context = await aggregator.build(decision)
  
  // 9. EXECUTE
  const result = await executor.execute(decision.action, decision.params, capabilities)
  
  // 10. VERIFY
  const verified = await verifier.verify(result, decision.expected)
  
  if (verified.success) {
    return { status: 'success', result }
  } else if (verified.canRetry) {
    return await jevLoop(input) // Retry
  } else if (verified.canReplan) {
    return await replan(decision, verified.error)
  } else {
    return { status: 'failed', error: verified.error }
  }
}
```

---

## 15. Stan implementacji

### 15.1 Co istnieje

| Moduł | Plik | Stan |
|-------|------|------|
| Parser | `jev-flow.js` | ✓ Działa |
| Judge | `judge.js` | ✓ Działa |
| Policy | `jev-policy.js` | ✓ Działa |
| Registry | `registry.js` | ✓ Działa (150+ poleceń) |
| Executor | `jarvis_bridge.py` | ✓ Działa |

### 15.2 Czego brakuje

| Funkcja | Stan | Uwagi |
|---------|------|-------|
| Reasoning routing | ❌ Brak | Klasyfikacja złożoności |
| Model routing | ❌ Brak | Wybór modelu |
| Capability selection | ❌ Brak | Dynamiczny wybór narzędzi |
| Context aggregation | ❌ Brak | Budowanie kontekstu |
| Task decomposition | ❌ Brak | Dekompozycja celów |
| Goal planning | ❌ Brak | Planowanie sekwencji |
| Multi-step execution | ⚠️ Częściowe | Obsługa sekwencji |
| Recovery | ❌ Brak | Retry, replan |

### 15.3 Rekomendacja

Rozbudować istniejącą architekturę:

1. ✓ Zachować parser, judge, policy, registry
2. ✓ Dodać reasoning routing
3. ✓ Dodać model routing
4. ✓ Dodać capability selection
5. ✓ Dodać context aggregation
6. ✓ Dodać task decomposition
7. ✓ Dodać goal planning
8. ✓ Dodać multi-step execution
9. ✓ Dodać recovery (retry, replan)
