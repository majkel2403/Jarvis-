# OBSERVATION — Co agent może widzieć

## Model świata agenta

```
                 ┌─────────────┐
                 │    JEV      │
                 └──────┬──────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
       SCREEN          DOM          STATE
          │             │             │
       obraz        struktura      stan aplikacji
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                   WORLD MODEL
                        │
                        ▼
                    DECISION
```

---

## 1. SCREEN — Co jest widoczne

### 1.1 Zrzut ekranu (screenshot)

Agent otrzymuje aktualny obraz pulpitu/aplikacji.

```
SCREEN
├── viewport: { width, height }
├── elements: []
│   ├── type: "button" | "input" | "link" | "text" | "image"
│   ├── bounds: { x, y, width, height }
│   ├── visible: boolean
│   └── text?: string
└── ocr_text?: string (opcjonalnie)
```

**Zastosowanie:**
- Weryfikacja czy coś jest widoczne
- Sprawdzenie układu interfejsu
- Wykrywanie zmian wizualnych

### 1.2 Dostępne okna

```
SCREEN.windows
├── id: string
├── app: string
├── title: string
├── bounds: { x, y, width, height }
├── state: "normal" | "minimized" | "maximized"
├── focused: boolean
└── visible: boolean
```

---

## 2. DOM — Struktura dokumentu

### 2.1 HTML DOM (przeglądarka)

```
DOM
├── url: string
├── title: string
├── readyState: "loading" | "interactive" | "complete"
├── viewport: { width, height }
├── elements: []
│   ├── tag: string
│   ├── id?: string
│   ├── class?: string
│   ├── attributes: { [key]: value }
│   ├── text?: string
│   ├── children: []
│   ├── visible: boolean
│   ├── enabled: boolean
│   ├── boundingClientRect: { x, y, width, height }
│   └── shadowRoot?: DOM
└── forms: []
    ├── action: string
    ├── method: string
    └── inputs: []
```

### 2.2 Selector

Identyfikacja elementów:

| Typ | Przykład | Użycie |
|-----|-----------|--------|
| ID | `#submit-btn` | Unikalny element |
| Class | `.input-field` | Wiele elementów |
| Tag | `button` | Wszystkie tagi |
| Attribute | `[name="email"]` | Atrybut |
| Text | `text=Zaloguj` | Tekst elementu |
| XPath | `//div[@id="main"]` | Ścieżka |
| CSS | `form input[type="email"]` | Złożony |

### 2.3 Dostępne operacje na DOM

```
DOM.operations
├── query(selector) → element
├── queryAll(selector) → elements[]
├── getAttribute(element, name) → value
├── getText(element) → text
├── getValue(element) → value
├── isVisible(element) → boolean
├── isEnabled(element) → boolean
├── getPosition(element) → {x, y}
└── getSize(element) → {width, height}
```

---

## 3. STATE — Stan aplikacji

### 3.1 Stan Jarvis OS

```
STATE.jarvis
├── windows: { [id]: WindowState }
├── widgets: Widget[]
├── apps: { [appId]: AppState }
├── tasks: Task[]
├── notes: Note[]
├── settings: Settings
├── memory: Memory
└── desktop: DesktopState
```

### 3.2 Window State

```
WindowState
├── id: string
├── app: string
├── title: string
├── position: { x, y }
├── size: { width, height }
├── state: "normal" | "minimized" | "maximized"
├── pinned: boolean
├── focused: boolean
└── zIndex: number
```

### 3.3 Widget State

```
WidgetState
├── id: string
├── type: "note" | "list" | "result" | "chart"
├── title: string
├── content: string
├── position: { x, y }
├── size: { width, height }
├── collapsed: boolean
├── visible: boolean
└── data: any
```

### 3.4 App State

```
AppState
├── id: string
├── name: string
├── open: boolean
├── data: any
└── lastUpdate: timestamp
```

---

## 4. EVENTS — Zdarzenia

### 4.1 Zdarzenia systemowe

```
EVENTS.system
├── user_click: { x, y, target }
├── user_input: { value, target }
├── window_opened: { app, id }
├── window_closed: { app, id }
├── notification: { title, body, type }
├── task_completed: { id }
├── note_saved: { id }
└── error: { code, message }
```

### 4.2 Event Bus

Wszystkie zdarzenia przechodzą przez Event Bus:

```
EventBus
├── emit(event, data) → void
├── on(event, handler) → unsubscribe
├── once(event, handler) → unsubscribe
├── off(event, handler) → void
└── listeners: { [event]: handlers[] }
```

### 4.3 Zdarzenia w Jarvis OS

| Event | Opis | Dane |
|-------|------|------|
| `app.opened` | Otwarto aplikację | `{ app, id }` |
| `app.closed` | Zamknięto aplikację | `{ app, id }` |
| `window.focused` | Otrzymano focus | `{ id, app }` |
| `widget.created` | Utworzono widget | `{ id, type }` |
| `widget.updated` | Zaktualizowano widget | `{ id, changes }` |
| `note.saved` | Zapisano notatkę | `{ id, title }` |
| `task.created` | Utworzono zadanie | `{ id, text }` |
| `task.completed` | Ukończono zadanie | `{ id }` |
| `settings.changed` | Zmieniono ustawienie | `{ key, value }` |
| `timer.started` | Uruchomiono timer | `{ id, seconds }` |
| `timer.ended` | Timer zakończony | `{ id }` |
| `error` | Błąd systemu | `{ code, message }` |

---

## 5. HISTORY — Historia

### 5.1 Historia sesji

```
HISTORY.session
├── actions: Action[]
├── decisions: Decision[]
├── results: Result[]
├── startTime: timestamp
└── totalDuration: number
```

### 5.2 Action

```
Action
├── id: string
├── type: "click" | "type" | "navigate" | ...
├── target: string
├── params: any
├── startTime: timestamp
├── endTime?: timestamp
├── status: "pending" | "running" | "success" | "failed"
└── result?: any
```

### 5.3 Decision

```
Decision
├── id: string
├── input: string
├── intent: string
├── confidence: number
├── action: string
├── reasoning: string
├── timestamp: timestamp
└── verified: boolean
```

---

## 6. GOAL — Cel

### 6.1 Aktualny cel

```
GOAL.current
├── id: string
├── description: string
├── steps: Step[]
├── currentStep: number
├── status: "planning" | "executing" | "verifying" | "completed" | "failed"
├── context: { ... }
└── createdAt: timestamp
```

### 6.2 Krok

```
Step
├── id: string
├── action: string
├── params: any
├── status: "pending" | "running" | "completed" | "failed"
├── result?: any
├── verified?: boolean
└── retryCount: number
```

### 6.3 Kontekst

```
GOAL.context
├── userQuery: string
├── parsedIntent: string
├── entities: { [key]: value }
├── previousResults: any[]
├── userPreferences: { ... }
└── systemState: { ... }
```

---

## 7. WORLD MODEL — Model świata

### 7.1 Agregacja

Agent agreguje wszystkie źródła w model:

```
WORLD_MODEL
├── screen: SCREEN (wizualny)
├── dom: DOM (struktura)
├── state: STATE (aplikacja)
├── events: EVENTS[] (historia)
├── history: HISTORY (sesja)
└── goal: GOAL (cel)
```

### 7.2 Update modelu

```
Update cycle (co action):
1. Wykonaj akcję
2. Pobierz nowy screen/DOM/state
3. Porównaj z poprzednim
4. Wykryj zmiany
5. Zaktualizuj world model
6. Zweryfikuj rezultat
```

### 7.3 Synchronizacja

| Źródło | Częstotliwość | Metoda |
|---------|----------------|--------|
| Screen | Po każdej akcji | Screenshot |
| DOM | Po każdej akcji | querySelector |
| State | Ciągle | Event Bus |
| Events | Ciągle | Event Bus |
| History | Ciągle | Append only |
| Goal | Na początku zadania | Parser |

---

## 8. PRZYPADKI UŻYCIA

### 8.1 Kliknięcie przycisku

```
1. OBSERVE
   - screen: screenshot
   - dom: querySelector("#submit-btn")
   - state: button enabled?
   
2. UNDERSTAND
   - "Użytkownik chce wysłać formularz"
   - "Przycisk istnieje i jest aktywny"
   
3. DECIDE
   - "Kliknij #submit-btn"
   
4. ACTION
   - execute: click("#submit-btn")
   
5. VERIFY
   - screen: sprawdź czy formularz wysłany
   - dom: sprawdź nowy stan
   - events: sprawdź event submit
```

### 8.2 Weryfikacja sukcesu

```
1. OBSERVE (before)
   - screen, dom, state
   
2. ACTION
   - wykonaj akcję
   
3. OBSERVE (after)
   - screen, dom, state
   
4. COMPARE
   - różnica = zmiany
   
5. VERIFY
   ├── zmiana oczekiwana → SUCCESS
   ├── brak zmiany → FAILED
   └── zmiana nieoczekiwana → UNCERTAIN
```

---

## 9. DO CZEGO AGENT MA DOSTĘP

| Źródło | Odczyt | Zapis |
|---------|--------|-------|
| Screen (screenshot) | ✓ | — |
| DOM | ✓ | — |
| Stan okien | ✓ | ✓ |
| Stan widgetów | ✓ | ✓ |
| Notatki | ✓ | ✓ |
| Zadania | ✓ | ✓ |
| Ustawienia | ✓ | ✓ |
| Event Bus | ✓ | ✓ |
| Historia | ✓ | — |
| Cel | ✓ | ✓ |

---

## 10. CO JEV MOŻE WIDZIEĆ — PODSUMOWANIE

- **Co jest na ekranie** — screenshot
- **Co jest w strukturze** — DOM
- **Co jest w stanie** — application state
- **Co się wydarzyło** — events
- **Co zrobiłem wcześniej** — history
- **Co mam zrobić** — goal

To jest fundament dla decyzji. Bez tego Jev działa w próżni.
