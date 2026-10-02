# STATE MACHINE & SYSTEM ARCHITECTURE — Architektura stanów

---

## 1. State Machine

### 1.1 Główne stany

```
                    ┌─────────────────────────────────────────┐
                    │            JARVIS OS                    │
                    └─────────────────┬───────────────────────┘
                                      │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
   ┌─────────┐                 ┌─────────────┐              ┌─────────┐
   │  IDLE   │                 │  LISTENING  │              │  ERROR  │
   └────┬────┘                 └──────┬──────┘              └────┬────┘
        │                            │                            │
        ▼                            ▼                            ▼
   ┌─────────┐                 ┌─────────────┐              ┌─────────┐
   │ FOCUS   │                 │ UNDERSTANDING│              │RECOVERING│
   └────┬────┘                 └──────┬──────┘              └────┬────┘
        │                            │                            │
        ▼                            ▼                            ▼
   ┌─────────┐                 ┌─────────────┐              ┌─────────┐
   │ PLANNING │◄───────────────│  DECIDING   │─────────────│REPLANNING│
   └────┬────┘                 └──────┬──────┘              └────┬────┘
        │                            │                            │
        ▼                            ▼                            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                    EXECUTING                              │
   │   ┌───────────┐  ┌───────────┐  ┌───────────┐          │
   │   │  ACTING   │──│ VERIFYING │──│  SUCCESS  │          │
   │   └───────────┘  └───────────┘  └───────────┘          │
   │         │                                      │         │
   │         ▼                                      ▼         │
   │   ┌───────────┐                         ┌───────────┐    │
   │   │  FAILED   │                         │COMPLETING │    │
   │   └───────────┘                         └───────────┘    │
   └─────────────────────────────────────────────────────────────┘
```

### 1.2 Opis stanów

| Stan | Opis | Kiedy |
|------|------|--------|
| **IDLE** | Oczekiwanie na input | Brak aktywności |
| **LISTENING** | Nasłuchiwanie | Oczekiwanie na voice/input |
| **FOCUS** | Tryb skupienia | Aktywny focus mode |
| **UNDERSTANDING** | Analiza inputu | Trwa parsowanie |
| **DECIDING** | Podejmowanie decyzji | JEV ocenia opcje |
| **PLANNING** | Planowanie zadania | Tworzenie sekwencji |
| **EXECUTING** | Wykonywanie akcji | Hermes działa |
| **VERIFYING** | Weryfikacja wyniku | Sprawdzanie rezultatu |
| **SUCCESS** | Sukces | Zadanie ukończone |
| **FAILED** | Błąd | Coś poszło nie tak |
| **RECOVERING** | Naprawa | Próba naprawy błędu |
| **REPLANNING** | Nowy plan | Zmiana podejścia |
| **COMPLETING** | Kończenie | Finalizacja zadania |
| **ERROR** | Błąd systemu | Awaria |

---

## 2. Interrupt System

### 2.1 Typy przerwań

```
Interrupt Types:
├── LOW: "Nowa wiadomość"
├── MEDIUM: "Nowe zadanie"
├── HIGH: "Błąd do naprawy"
└── CRITICAL: "Zagrożenie bezpieczeństwa"
```

### 2.2 Obsługa przerwań

```
Interrupt Handling:
├── CRITICAL: Przerwij natychmiast
├── HIGH: Zaproponuj przerwanie
├── MEDIUM: Poczekaj na break point
└── LOW: Zakończ bieżące zadanie
```

### 2.3 Przykład

```
Executing: "Buduję projekt X"
  ↓
Interrupt: HIGH - "Nowe zadanie: napraw błąd Y"
  ↓
Decision:
├── Czy przerwać budowanie?
├── Czy najpierw dokończyć?
├── Czy utworzyć nowe zadanie?
└── Wybór: Utwórz nowe zadanie, dokończ budowanie
```

---

## 3. Long-term Tasks

### 3.1 Typy zadań

```
Task Types:
├── ONE-SHOT: Pojedyncza akcja
├── SEQUENCE: Sekwencja kroków
├── PERSISTENT: Monitoring przez czas
├── SCHEDULED: O czasie T
└── RECURRING: Powtarzające się
```

### 3.2 Persistent Agent

```
Persistent Task:
├── Goal: "Monitoruj projekt przez tydzień"
├── Interval: 5 minut
├── Condition: "Jeśli zmiana → powiadom"
├── Actions: [check_git, check_deploy, check_errors]
└── Continue: dopóki aktywne
```

---

## 4. Goals (wyższy poziom)

### 4.1 Od zadania do celu

```
Task vs Goal:

TASK: "Otwórz plik X"
→ jedna akcja

GOAL: "Chcę gotową stronę produktu"
→ RESEARCH → DESIGN → CODE → TEST → DEPLOY → MONITOR
```

### 4.2 Goal Decomposition

```
Goal: "Zbuduj aplikację"
  ↓
Decomposition:
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

---

## 5. Self-test & Diagnostics

### 5.1 Health Check

```
System Health Check:
├── Jarvis Core:      ✓ OK
├── Hermes Bridge:    ✓ OK / ✗ OFFLINE
├── Event Bus:       ✓ OK / ✗ ERROR
├── Tools:
│   ├── Browser:     ✓ OK / ✗ ERROR
│   ├── Filesystem:  ✓ OK / ✗ ERROR
│   └── Terminal:    ✓ OK / ✗ ERROR
├── Memory:          ✓ OK / ✗ CORRUPTED
├── Audio:           ✓ OK / ✗ NO_DEVICE
└── GPU:             ✓ OK / ✗ NOT_DETECTED
```

### 5.2 Self-diagnostics

```
Diagnostics:
├── "Problem wykryty w Browser Tool"
├── "Szczegóły: Timeout podczas nawigacji"
├── "Sugestia: Sprawdź połączenie sieciowe"
└── "Akcja: Automatyczna próba ponownego połączenia"
```

---

## 6. Learning from Feedback

### 6.1 Preference Learning

```
User Feedback:
├── "Nie rób tego w ten sposób"
├── "Wolę gdy najpierw pytasz"
├── "To było szybkie - lubię"
└── "Użyj innego modelu dla X"
```

### 6.2 Preference Storage

```
Learned Preferences:
├── system_rules: immutable
├── security_rules: immutable
├── project_rules: from project
├── user_preferences: explicit + inferred
├── current_task: temporary
└── temporary_instruction: one-time
```

### 6.3 Preference Hierarchy

```
Priority (highest to lowest):
1. Security Rules (never override)
2. System Rules
3. Project Rules
4. User Preferences
5. Current Task Context
6. Temporary Instructions
```

---

## 7. Explainability

### 7.1 Dlaczego

```
User: "Dlaczego wybrałeś A?"
  ↓
Jarvis: "Wybrałem A, ponieważ:
  • B jest 3x wolniejsze
  • C wymaga dodatkowej zgody
  • A ma najlepszy stosunek jakości do czasu"
```

### 7.2 Decision History

```
Decision Log:
[12:30] Decision: action=A
  Options: [A, B, C]
  Scores: A=0.92, B=0.71, C=0.45
  Reason: "A fastest and sufficient quality"
  User: "Tak"
```

---

## 8. Debug Mode

### 8.1 Poziomy

```
Debug Levels:
├── NORMAL: user-friendly output
├── VERBOSE: detailed logs
├── DEBUG: full inspection
└── TRACE: every step
```

### 8.2 Debug View

```
Debug Mode Shows:
├── Decision tree
├── Tool calls
├── Event flow
├── State transitions
├── Latency per step
├── Verification results
└── Memory state
```
