# CONTEXT ENGINE — Silnik kontekstu

## Definicja

Context Engine towarzyszy Decision Engine i odpowiada na pytanie: **"Co wiem o świecie w tej chwili?"**

Zbiera, porządkuje i dostarcza kontekst dla Jev z wielu źródeł.

---

## Architektura

```
                    ┌──────────────────┐
                    │ CONTEXT ENGINE   │
                    └────────┬─────────┘
                             │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌──────────┐          ┌──────────┐          ┌──────────┐
│  USER    │          │  TASK    │          │  SYSTEM  │
│ CONTEXT  │          │ CONTEXT  │          │ CONTEXT  │
└──────────┘          └──────────┘          └──────────┘
    │                     │                     │
    └─────────────────────┼─────────────────────┘
                          ▼
                 ┌──────────────────┐
                 │ CONTEXT BUILDER │
                 └────────┬─────────┘
                          ▼
                 ┌──────────────────┐
                 │CONTEXT PACKAGE   │
                 │ DLA JEV         │
                 └──────────────────┘
```

---

## 1. Źródła kontekstu

### 1.1 USER CONTEXT — Kontekst użytkownika

```
USER_CONTEXT:
├── identity
│   ├── id: "user_001"
│   ├── name: "Michał"
│   ├── preferences: { ... }
│   └── permissions: [...]
│
├── preferences
│   ├── language: "pl"
│   ├── theme: "crimson"
│   ├── autonomy_level: 3
│   ├── proactive: false
│   └── notification_preferences: { ... }
│
├── habits
│   ├── frequent_apps: ["chat", "notes", "terminal"]
│   ├── frequent_actions: ["open_app", "create_note"]
│   ├── working_hours: { start: "09:00", end: "18:00" }
│   └── typical_tasks: [...]
│
├── history_summary
│   ├── tasks_completed_today: 5
│   ├── tasks_completed_week: 23
│   ├── avg_session_duration: "2h"
│   └── common_patterns: [...]
│
└── current_state
    ├── is_focus_mode: false
    ├── is_available: true
    └── last_interaction: timestamp
```

### 1.2 TASK CONTEXT — Kontekst zadania

```
TASK_CONTEXT:
├── current_task
│   ├── id: "task_001"
│   ├── goal: "Przygotuj raport z notatek"
│   ├── status: "executing"
│   ├── current_step: 2
│   ├── total_steps: 4
│   ├── created_at: timestamp
│   └── deadline: timestamp
│
├── task_tree
│   ├── steps: [
│   │   { id: 1, status: "completed", action: "notes_list" },
│   │   { id: 2, status: "executing", action: "notes_read" },
│   │   { id: 3, status: "pending", action: "analyze" },
│   │   { id: 4, status: "pending", action: "create_note" }
│   │ ]
│   └── dependencies: { 2: [1], 3: [2], 4: [3] }
│
├── completed_steps
│   ├── step_1: { action: "notes_list", result: { count: 15 } }
│   └── step_2: { action: "notes_read", result: { notes: [...] } }
│
├── pending_steps
│   ├── step_3: { action: "analyze", input: {...} }
│   └── step_4: { action: "create_note", input: {...} }
│
└── task_history
    ├── attempts: 1
    ├── errors: []
    └── recovery_actions: []
```

### 1.3 CONVERSATION CONTEXT — Kontekst rozmowy

```
CONVERSATION_CONTEXT:
├── messages
│   ├── [
│   │   { role: "user", content: "Przygotuj raport", timestamp },
│   │   { role: "assistant", content: "Rozumiem, zaczynam...", timestamp },
│   │   { role: "user", content: "Tylko notatki z projektu X", timestamp },
│   │   { role: "assistant", content: "Ok, filtruję...", timestamp }
│   │ ]
│   └── last_n: 10
│
├── pending_clarifications
│   ├── []
│   └── // pytania czekające na odpowiedź
│
├── confirmed_actions
│   ├── [
│   │   { action: "notes_list", confirmed: true },
│   │   { action: "create_note", confirmed: true }
│   │ ]
│   └── // akcje potwierdzone przez użytkownika
│
├── last_user_intent
│   ├── intent: "create_report"
│   ├── entities: { scope: "project_x_notes" }
│   └── timestamp
│
└── conversation_topic
    ├── topic: "raport"
    ├── subtopic: "notatki_projekt"
    └── established: true
```

### 1.4 PROJECT CONTEXT — Kontekst projektu

```
PROJECT_CONTEXT:
├── current_project
│   ├── id: "project_001"
│   ├── name: "Jarvis OS"
│   ├── path: "/Users/majke/Desktop/jarvis-"
│   ├── type: "code"
│   └── last_accessed: timestamp
│
├── recent_projects
│   ├── [
│   │   { id: "project_001", name: "Jarvis OS", last: timestamp },
│   │   { id: "project_002", name: "BTC Paper Lab", last: timestamp }
│   │ ]
│   └── last_5
│
├── project_structure
│   ├── root_files: ["js/", "bridge/", "docs/", "hermes/"]
│   ├── main_files: ["main.js", "jev-flow.js", "judge.js"]
│   └── config_files: ["package.json", "config.yaml"]
│
├── project_state
│   ├── git_branch: "main"
│   ├── git_status: "clean"
│   ├── last_build: "success"
│   └── last_test: "passed"
│
└── project_memory
    ├── key_facts: ["JEV is the decision layer", "Bridge connects to Hermes"]
    ├── decisions: []
    └── pending_issues: []
```

### 1.5 DESKTOP STATE — Stan pulpitu

```
DESKTOP_STATE:
├── windows
│   ├── [
│   │   { id: "w1", app: "chat", title: "Chat", focused: true },
│   │   { id: "w2", app: "notes", title: "Notatki", focused: false },
│   │   { id: "w3", app: "terminal", title: "Terminal", focused: false }
│   │ ]
│   └── active: 3
│
├── widgets
│   ├── [
│   │   { id: "widget_1", type: "list", title: "Zadania", visible: true },
│   │   { id: "widget_2", type: "note", title: "Szybka notatka", visible: true }
│   │ ]
│   └── count: 2
│
├── layout
│   ├── name: "work"
│   ├── windows_count: 3
│   └── widgets_count: 2
│
├── focus_mode
│   ├── active: false
│   └── started_at: null
│
└── theme
    ├── name: "crimson"
    └── accent: "#DC143C"
```

### 1.6 OPEN APPS — Otwarte aplikacje

```
OPEN_APPS:
├── [
│   { id: "chat", name: "Chat", status: "active", focused: true },
│   { id: "notes", name: "Notes", status: "active", focused: false },
│   { id: "terminal", name: "Terminal", status: "active", focused: false },
│   { id: "weather", name: "Weather", status: "background", focused: false },
│   { id: "calculator", name: "Calculator", status: "minimized", focused: false }
│ ]
│
├── foreground_apps: ["chat"]
├── background_apps: ["weather", "calculator"]
└── recently_opened: ["chat", "notes", "terminal"]
```

### 1.7 FILES — Pliki

```
FILES_CONTEXT:
├── current_directory
│   ├── path: "/Users/majke/Desktop/jarvis-/js"
│   ├── files: ["main.js", "jev-flow.js", "judge.js", ...]
│   └── directories: ["commands/", "widgets/", "events/"]
│
├── recent_files
│   ├── [
│   │   { path: "js/jev-flow.js", accessed: timestamp },
│   │   { path: "bridge/jarvis_bridge.py", accessed: timestamp }
│   │ ]
│   └── last_10
│
├── open_files
│   ├── [
│   │   { path: "js/jev-flow.js", modified: false },
│   │   { path: "docs/SPEC.md", modified: true }
│   │ ]
│   └── currently_editing
│
├── file_search_results
│   ├── query: "function open"
│   ├── results: [...]
│   └── timestamp
│
└── clipboard
    ├── has_content: true
    ├── content_type: "text"
    └── preview: "..."
```

### 1.8 BROWSER STATE — Stan przeglądarki

```
BROWSER_STATE:
├── agent_browser
│   ├── open: true
│   ├── url: "https://github.com/majkel2403/Jarvis-"
│   ├── title: "GitHub - Jarvis"
│   ├── tabs: [
│   │   { url: "https://github.com/...", title: "GitHub", active: true },
│   │   { url: "https://docs.python.org/...", title: "Python Docs", active: false }
│   │ ]
│   └── tab_count: 2
│
├── visible_elements
│   ├── buttons: 15
│   ├── inputs: 3
│   ├── links: 42
│   └── forms: 1
│
├── last_interaction
│   ├── type: "click"
│   ├── selector: "#submit-btn"
│   └── timestamp
│
├── page_state
│   ├── loaded: true
│   ├── errors: []
│   └── javascript_enabled: true
│
└── downloads
    ├── active: []
    └── completed: []
```

### 1.9 EVENTS — Zdarzenia

```
EVENTS_CONTEXT:
├── recent_events
│   ├── [
│   │   { type: "app.opened", data: { app: "chat" }, timestamp },
│   │   { type: "note.created", data: { id: "123" }, timestamp },
│   │   { type: "task.completed", data: { id: "456" }, timestamp }
│   │ ]
│   └── last_20
│
├── event_patterns
│   ├── repeating: ["timer_ended", "notification"]
│   └── suspicious: []
│
├── active_timers
│   ├── [
│   │   { id: "timer_1", seconds: 300, started: timestamp }
│   │ ]
│   └── count: 1
│
└── pending_notifications
    ├── [
    │   { type: "timer", message: "Timer zakończony" }
    │ ]
    └── unread: 1
```

### 1.10 ACTIVE AGENTS — Aktywni agenci

```
ACTIVE_AGENTS:
├── hermes
│   ├── connected: true
│   ├── profile: "jarvis-desktop"
│   ├── model: "MiniMax-M2.5"
│   └── active_tasks: 0
│
├── browser_agent
│   ├── running: true
│   ├── current_url: "https://github.com/..."
│   ├── last_action: "click"
│   └── session_id: "abc123"
│
├── web_task
│   ├── active: false
│   └── progress: null
│
├── computer_use
│   ├── active: false
│   └── last_action: null
│
└── subagents
    ├── []
    └── // delegowane zadania
```

### 1.11 CAPABILITIES — Zdolności

```
CAPABILITIES_CONTEXT:
├── available_capabilities
│   ├── system: { available: true, health: "ok" }
│   ├── files: { available: true, health: "ok" }
│   ├── desktop: { available: true, health: "ok" }
│   ├── browser: { available: true, health: "ok" }
│   ├── terminal: { available: true, health: "ok" }
│   ├── code: { available: true, health: "ok" }
│   ├── memory: { available: true, health: "ok" }
│   └── task_management: { available: true, health: "ok" }
│
├── capability_health
│   ├── all_healthy: true
│   └── degraded: []
│
├── loaded_tools
│   ├── count: 150
│   └── categories: ["browser", "files", "terminal", "jarvis"]
│
└── dynamic_capabilities
    ├── loaded: []
    └── // capability załadowane na żądanie
```

### 1.12 PERMISSIONS — Uprawnienia

```
PERMISSIONS_CONTEXT:
├── user_permissions
│   ├── can_read: true
│   ├── can_write: true
│   ├── can_delete: true
│   ├── can_execute_terminal: true
│   └── can_network: true
│
├── tool_permissions
│   ├── browser: { allowed: true }
│   ├── terminal: { allowed: true, restrictions: [...] }
│   ├── files: { allowed: true, restrictions: [...] }
│   └── network: { allowed: true }
│
├── sensitive_operations
│   ├── requires_approval: ["delete", "send", "terminal_sudo"]
│   └── blocked: []
│
└── vault_access
    ├── api_keys: "available"
    ├── tokens: "available"
    └── secrets: "read_only"
```

### 1.13 SYSTEM STATE — Stan systemu

```
SYSTEM_STATE:
├── resources
│   ├── cpu: { usage: 45, cores: 8 }
│   ├── memory: { used: "8GB", total: "16GB", percentage: 50 }
│   ├── gpu: { available: true, usage: 20 }
│   └── network: { online: true, latency: 15 }
│
├── ai_budget
│   ├── daily: { spent: 2.50, limit: 5.00 }
│   ├── weekly: { spent: 12.00, limit: 30.00 }
│   └── tokens_used_today: 150000
│
├── hermes
│   ├── connected: true
│   ├── profile: "jarvis-desktop"
│   ├── model: "MiniMax-M2.5"
│   └── message_latency: 120
│
├── jarvis_os
│   ├── version: "2.0"
│   ├── uptime: "2h 30m"
│   └── last_boot: timestamp
│
├── integrations
│   ├── browser: { connected: true, type: "edge" }
│   ├── computer: { connected: false }
│   └── vault: { connected: true }
│
└── errors
    ├── critical: []
    ├── warnings: []
    └── info: []
```

---

## 2. Context Builder

### 2.1 Agregacja kontekstu

```
BUILD_CONTEXT(request):
1. DETERMINE_CONTEXT_TYPE
   ├── SIMPLE: system_state + conversation
   ├── STANDARD: + user + desktop + apps
   └── COMPLEX: + task + project + capabilities
   
2. GATHER_FROM_SOURCES
   ├── user_context = get_user_context()
   ├── task_context = get_task_context()
   ├── conversation_context = get_conversation_context()
   ├── project_context = get_project_context()
   ├── desktop_state = get_desktop_state()
   ├── open_apps = get_open_apps()
   ├── files_context = get_files_context()
   ├── browser_state = get_browser_state()
   ├── events_context = get_events_context()
   ├── active_agents = get_active_agents()
   ├── capabilities = get_capabilities()
   ├── permissions = get_permissions()
   └── system_state = get_system_state()
   
3. MERGE_AND_WEIGHT
   ├── assign_weights_by_relevance()
   ├── prioritize_recent()
   └── remove_duplicates()
   
4. TRUNCATE_IF_NEEDED
   ├── check_token_limit()
   └── compress_if_needed()
   
5. RETURN CONTEXT_PACKAGE
```

### 2.2 Context Package

```
CONTEXT_PACKAGE:
{
  version: "1.0",
  timestamp: "2026-10-02T12:30:00Z",
  
  user: USER_CONTEXT,
  task: TASK_CONTEXT | null,
  conversation: CONVERSATION_CONTEXT,
  project: PROJECT_CONTEXT | null,
  desktop: DESKTOP_STATE,
  apps: OPEN_APPS,
  files: FILES_CONTEXT,
  browser: BROWSER_STATE,
  events: EVENTS_CONTEXT,
  agents: ACTIVE_AGENTS,
  capabilities: CAPABILITIES_CONTEXT,
  permissions: PERMISSIONS_CONTEXT,
  system: SYSTEM_STATE,
  
  _metadata: {
    token_count: 1500,
    sources_used: 10,
    truncation_applied: false
  }
}
```

---

## 3. Context Selection

### 3.1 Wybór kontekstu według typu zadania

```
CONTEXT_SELECTION:

SIMPLE_TASK (np. "Otwórz kalkulator")
├── user
├── conversation
├── desktop
├── apps
└── system
→ ~500 tokens

STANDARD_TASK (np. "Przygotuj raport")
├── user
├── task (if exists)
├── conversation
├── project (if exists)
├── desktop
├── apps
├── files
├── events
├── capabilities
├── permissions
└── system
→ ~1500 tokens

COMPLEX_TASK (np. "Zbadaj i zbuduj aplikację")
├── user
├── task
├── conversation
├── project
├── desktop
├── apps
├── files
├── browser
├── events
├── agents
├── capabilities
├── permissions
└── system
→ ~3000 tokens

DEEP_ANALYSIS (np. "Przeanalizuj architekturę")
├── user
├── task
├── conversation
├── project
├── ALL desktop
├── ALL files
├── ALL browser
├── ALL events
├── ALL agents
├── ALL capabilities
├── ALL permissions
└── ALL system
→ limitowane do ~8000 tokens
```

### 3.2 Dynamiczna korekta kontekstu

```
CONTEXT_ADJUSTMENT:

1. IF budget_low
   → reduce_conversation_history()
   → reduce_events_count()
   → remove_deprecated_info()

2. IF latency_important
   → prioritize_current_state()
   → minimize_history()

3. IF complex_reasoning_needed
   → expand_project_context()
   → expand_capabilities()
   → include_all_agents()

4. IF sensitive_operation
   → verify_permissions()
   → check_restrictions()
   → add_warning_flags()
```

---

## 4. Context Refresh

### 4.1 Kiedy odświeżać kontekst

```
REFRESH_TRIGGERS:

1. TASK_CHANGE
   → new task started
   → task completed
   → task failed
   → task switched

2. USER_INPUT
   → new message
   → clarification provided
   → confirmation received

3. ENVIRONMENT_CHANGE
   → app opened/closed
   → window focused
   → file changed
   → browser navigation

4. TIME_BASED
   → every 30 seconds for long tasks
   → every 60 seconds for idle sessions

5. EXPLICIT_REQUEST
   → user asks "what's the state?"
   → decision confidence low
```

### 4.2 Partial refresh

```
REFRESH_PARTIAL(changed_component):
1. IDENTIFY_CHANGED = changed_component
2. FETCH_NEW = get_fresh(changed_component)
3. UPDATE_CONTEXT = replace_in_package(changed_component, FETCH_NEW)
4. REVALIDATE = check_consistency()
5. RETURN = updated_package
```

---

## 5. Context Compression

### 5.1 Gdy kontekst przekracza limit

```
COMPRESS_CONTEXT(package, max_tokens):
1. PRIORITIZE
   ├── task context: highest
   ├── user preferences: high
   ├── current state: high
   ├── recent conversation: medium
   ├── system info: medium
   ├── history: low
   └── deprecated: lowest
   
2. REMOVE_LOW_PRIORITY
   ├── drop history beyond n messages
   ├── drop old events
   ├── drop unused capabilities
   └── drop verbose system info
   
3. SUMMARIZE
   ├── conversation: keep last n + summary
   ├── events: keep last n
   └── project: keep key facts only
   
4. VERIFY
   ├── check_token_count
   └── if still over → repeat compress
```

### 5.2 Techniki kompresji

```
COMPRESSION_TECHNIQUES:

1. TRUNCATION
   → "conversation: last 5 messages" zamiast wszystkich
   
2. SUMMARIZATION
   → "Użytkownik chce raport z notatek projektu X"
   
3. KEY_FACTS_ONLY
   → ["JEV is decision layer", "Bridge connects Hermes"]
   
4. DELTA_ONLY
   → "Zmieniło się: app.opened(notes)"
   
5. STRUCTURED_LITE
   → Zamiast pełnych obiektów → tylko kluczowe pola
```

---

## 6. Context Validation

### 6.1 Spójność kontekstu

```
VALIDATE_CONTEXT(package):
1. CHECK_REQUIRED_FIELDS
   ├── user exists
   ├── system connected
   └── at least one state available
   
2. CHECK_CONSISTENCY
   ├── task status matches steps
   ├── desktop state matches apps
   └── permissions match user level
   
3. CHECK_FRESHNESS
   ├── system state < 60s old
   ├── events < 30s old
   └── browser state < 30s old
   
4. CHECK_SECURITY
   ├── no secrets in context
   ├── permissions verified
   └── sensitive ops flagged
   
5. RETURN VALIDATION_RESULT
   ├── valid: true/false
   ├── warnings: []
   └── refresh_recommended: true/false
```

---

## 7. Context Caching

### 7.1 Cache strategy

```
CONTEXT_CACHE:

1. SHORT_TERM_CACHE (session)
   ├── key: hash(request)
   ├── value: context_package
   └── ttl: 5 seconds
   
2. STATE_CACHE (persistent)
   ├── desktop_state: 10s
   ├── open_apps: 10s
   ├── system_state: 30s
   └── capabilities: 60s
   
3. USER_CACHE (session)
   ├── user_preferences: 5min
   ├── user_facts: 5min
   └── project_context: 1min
```

### 7.2 Cache invalidation

```
INVALIDATE_CACHE(trigger):
├── TASK_CHANGE → invalidate task_context
├── PROJECT_CHANGE → invalidate project_context
├── DESKTOP_CHANGE → invalidate desktop_state
├── APP_CHANGE → invalidate open_apps
├── SYSTEM_CHANGE → invalidate system_state
└── PERMISSION_CHANGE → invalidate permissions
```

---

## 8. Connection to Decision Engine

### 8.1 Przepływ

```
USER INPUT
     │
     ▼
┌──────────────────┐
│ CONTEXT ENGINE   │ ← BUILD CONTEXT
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ CONTEXT PACKAGE  │
│ DLA JEV          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ DECISION ENGINE  │ ← USE CONTEXT
└──────────────────┘
```

### 8.2 Co Jev widzi

```
JEV_SEES:
{
  "Kto pyta": user.name + preferences,
  "Co robię": current_task.goal + steps,
  "Co zrobiłem": completed_steps,
  "Co widzę": desktop_state + open_apps,
  "Co się dzieje": recent_events,
  "Co mogę": available_capabilities,
  "Co wolno": permissions,
  "Ile mam zasobów": system.resources,
  "Ile wydałem": ai_budget.spent
}
```

---

## 9. Stan implementacji

### 9.1 Co istnieje

| Komponent | Stan | Uwagi |
|-----------|------|-------|
| User context | ⚠️ Częściowe | preferences w settings |
| Task context | ❌ Brak | Brak task memory |
| Conversation | ⚠️ Częściowe | Historia czatu |
| Desktop state | ✓ | J.wm, J.apps |
| Open apps | ✓ | J.apps.list() |
| Files context | ⚠️ Częściowe | Tylko odczyt |
| Browser state | ⚠️ Częściowe | Przeglądarka agenta |
| Events | ⚠️ Częściowe | BroadcastChannel |
| Capabilities | ❌ Brak | Brak registry |
| Permissions | ⚠️ Częściowe | Policy w A0-A3 |
| System state | ⚠️ Częściowe | Basic info |

### 9.2 Co wymaga implementacji

| Funkcja | Priorytet | Uwagi |
|---------|-----------|-------|
| Task context | 🔴 Wysoki | Pamięć zadania |
| Context aggregation | 🔴 Wysoki | Łączenie źródeł |
| Context compression | 🔴 Wysoki | Zarządzanie limitem |
| Context validation | 🟡 Średni | Spójność |
| Context caching | 🟡 Średni | Performance |
| Partial refresh | 🟢 Niski | Optymalizacja |

---

## 10. Przykłady

### Przykład 1: Proste zapytanie

```
User: "Jaka jest pogoda?"
  ↓
CONTEXT ENGINE:
  - user: ✓
  - conversation: ✓
  - desktop: ✓
  - apps: ✓
  - system: ✓
  ↓
CONTEXT PACKAGE (~400 tokens)
  ↓
DECISION ENGINE:
  - intent: get_weather
  - context: full
  - decision: execute (A3)
  ↓
Result: "Pogoda: 15°C, słonecznie"
```

### Przykład 2: Złożone zadanie

```
User: "Przygotuj raport z notatek projektu Jarvis"
  ↓
CONTEXT ENGINE:
  - user: ✓
  - task: utwórz nowy
  - conversation: ✓
  - project: Jarvis OS ✓
  - desktop: ✓
  - apps: ✓
  - files: ✓
  - events: ✓
  - capabilities: ✓
  - permissions: ✓
  - system: ✓
  ↓
CONTEXT PACKAGE (~1800 tokens)
  ↓
DECISION ENGINE:
  - intent: create_report
  - context: full
  - reasoning: standard
  - decision: multi-step task
  ↓
TASK ENGINE:
  - step 1: notes_list (filter: project=jarvis)
  - step 2: notes_read (for each)
  - step 3: analyze (AI)
  - step 4: create_note (raport)
```

### Przykład 3: Brak kontekstu

```
User: (pierwsza interakcja po restarcie)
  ↓
CONTEXT ENGINE:
  - user: ✓ (z pamięci trwałej)
  - task: null
  - conversation: empty
  - project: null
  - desktop: ✓
  - apps: ✓
  - system: ✓
  ↓
CONTEXT PACKAGE (~600 tokens)
  ↓
DECISION ENGINE:
  - context: minimal
  - decision: ask for clarification if needed
```
