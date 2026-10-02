# MEMORY — Pamięć systemu

## Struktura pamięci

```
                  MEMORY
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
   SHORT-TERM     TASK MEMORY   LONG-TERM
       │             │             │
   bieżące        aktualne      wiedza
   działania      zadanie       użytkownika
       │             │             │
       └─────────────┼─────────────┘
                     ▼
                  CONTEXT
```

---

## 1. SHORT-TERM — Pamięć krótkoterminowa

### 1.1 Bieżące działania

```
SHORT-TERM
├── currentAction: Action
│   ├── type: string
│   ├── target: string
│   ├── status: "pending" | "executing" | "verified" | "failed"
│   ├── startTime: timestamp
│   └── result?: any
│
├── pendingActions: Action[]
├── completedActions: Action[]
├── currentObservation: Observation
└── sessionId: string
```

### 1.2 Cechy

- Czas życia: do końca sesji
- Pojemność: unlimited
- Dostęp: tylko odczyt dla Jev

### 1.3 Zawartość

```
- Aktualnie wykonywana akcja
- Ostatnie 10 akcji
- Bieżący stan ekranu
- Ostatnie odpowiedzi użytkownika
- Kontekst rozmowy
```

---

## 2. TASK MEMORY — Pamięć zadania

### 2.1 Aktualne zadanie

```
TASK_MEMORY
├── currentTask: Task
│   ├── id: string
│   ├── goal: string
│   ├── steps: Step[]
│   ├── currentStep: number
│   ├── status: "planning" | "executing" | "verifying" | "completed" | "failed"
│   ├── context: Context
│   └── history: StepResult[]
│
├── previousTasks: Task[]
└── taskQueue: Task[]
```

### 2.2 Kontekst zadania

```
Context
├── userQuery: string
├── parsedIntent: string
├── entities: { [key]: string }
├── requiredCapabilities: string[]
├── expectedResult: any
├── constraints: Constraint[]
└── userPreferences: { [key]: any }
```

### 2.3 Cechy

- Czas życia: do ukończenia zadania
- Pojemność: 1 aktywne zadanie
- Dostęp: odczyt i zapis dla Jev

### 2.4 Co pamięta

```
- Cel zadania
- Kolejne kroki
- Wykonane akcje
- Wyniki każdego kroku
- Błędy i retry
- Stan weryfikacji
```

---

## 3. LONG-TERM — Pamięć długoterminowa

### 3.1 Wiedza o użytkowniku

```
LONG-TERM.user
├── preferences: { [key]: any }
│   ├── language: "pl" | "en"
│   ├── theme: string
│   ├── autonomyLevel: number
│   └── notifications: boolean
│
├── habits: { [key]: any }
│   ├── frequentApps: string[]
│   ├── frequentActions: string[]
│   └── workingHours: { start: string, end: string }
│
├── facts: Fact[]
│   ├── id: string
│   ├── content: string
│   ├── source: "user" | "system" | "inferred"
│   ├── confidence: number
│   └── createdAt: timestamp
│
└── history: Session[]
```

### 3.2 Stan systemu

```
LONG-TERM.system
├── savedLayouts: Layout[]
├── customCommands: Command[]
├── shortcuts: Shortcut[]
├── automations: Automation[]
├── projects: Project[]
└── lastState: { ... }
```

### 3.3 Cechy

- Czas życia: trwała (localStorage / IndexedDB)
- Pojemność: limitowana (TTL dla faktów)
- Dostęp: odczyt i zapis dla Jev

### 3.4 Rodzaje faktów

| Typ | Opis | TTL |
|-----|------|-----|
| explicit | Wyraźnie podane przez użytkownika | bez limitu |
| inferred | Wywnioskowane z zachowania | 30 dni |
| temporary | Kontekst sesji | do końca sesji |

---

## 4. CONTEXT — Kontekst

### 4.1 Budowanie kontekstu

```
CONTEXT = {
  // Z SHORT-TERM
  currentAction: ...,
  recentActions: [...],
  
  // Z TASK_MEMORY
  taskGoal: ...,
  taskSteps: [...],
  completedSteps: [...],
  
  // Z LONG-TERM
  userPreferences: ...,
  userFacts: [...],
  
  // Z SYSTEM
  systemState: ...,
  windowState: ...,
  
  // Z ROZMOWY
  lastUserMessage: ...,
  lastAgentResponse: ...,
}
```

### 4.2 Limit kontekstu

```
CONTEXT_LIMITS = {
  maxRecentActions: 10,
  maxTaskSteps: 50,
  maxUserFacts: 100,
  maxContextTokens: 8000,
}
```

### 4.3 Priorytetyzacja kontekstu

Gdy kontekst przekracza limit:

```
1. Zachowaj: taskGoal, currentStep, completedSteps
2. Zachowaj: userPreferences, key facts
3. Usuń: oldest actions, old observations
4. Kompresuj: summarize older history
```

---

## 5. Implementacja

### 5.1 Istniejące rozwiązania (z kodu)

```javascript
// J.notes — notatki jako pamięć
J.notes.live() // aktywne notatki
J.notes.create(title, content)
J.notes.read(id)
J.notes.update(id, changes)

// J.state — stan aplikacji
J.state.settings // ustawienia
J.state.tasks // zadania
J.state.ui // stan UI

// J.memory — pamięć (jeśli istnieje)
J.memory.remember(fact)
J.memory.recall(query)
J.memory.forget(fact)
```

### 5.2 Co dodać

| Funkcja | Stan | Uwagi |
|---------|------|-------|
| Task memory | ❌ Brak | Przechowywanie celu i kroków |
| Session history | ❌ Brak | Pełna historia sesji |
| User facts | ⚠️ Częściowe | J.memory działa |
| Context aggregation | ❌ Brak | Budowanie kontekstu dla Jev |

---

## 6. Przepływ informacji

```
USER INPUT
     │
     ▼
PARSE INTENT
     │
     ▼
BUILD CONTEXT
     │
     ├── SHORT-TERM: current action
     ├── TASK: goal + steps
     ├── LONG-TERM: facts + preferences
     └── SYSTEM: state
     │
     ▼
JEV DECIDE
     │
     ▼
EXECUTE ACTION
     │
     ▼
UPDATE MEMORY
     │
     ├── SHORT-TERM: add action
     ├── TASK: update step status
     └── LONG-TERM: save result if important
```

---

## 7. Co Jev musi wiedzieć

```
JEV_QUERIES = {
  "Co robię?": taskMemory.currentTask.goal
  "Po co to robię?": taskMemory.currentTask.goal
  "Co już zrobiłem?": taskMemory.completedSteps
  "Co się zmieniło?": shortTerm.lastObservation vs currentObservation
  "Co mam zrobić dalej?": taskMemory.nextStep
  "Jakie mam preferencje?": longTerm.userPreferences
  "Co wiem o użytkowniku?": longTerm.userFacts
}
```
