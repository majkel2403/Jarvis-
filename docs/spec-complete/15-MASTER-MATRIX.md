# MASTER MATRIX — Jarvis OS

## Przegląd

Dokument łączy wszystkie elementy systemu w jedną spójną całość.

---

## Master Action Matrix

### Akcje podstawowe

| Akcja | JEV Decision | Hermes | Tool | Event | Orb | Process Log | Approval | Verification |
|-------|-------------|--------|------|-------|-----|------------|----------|--------------|
| **open_app** | ✓ decide | ✓ execute | App | app.opened | ACTING | ✓ | nie | simple |
| **close_app** | ✓ decide | ✓ execute | App | app.closed | ACTING | ✓ | nie | simple |
| **create_note** | ✓ decide | ✓ execute | Notes | note.created | SUCCESS | ✓ | tak (undo) | detailed |
| **create_task** | ✓ decide | ✓ execute | Tasks | task.created | SUCCESS | ✓ | tak (undo) | detailed |
| **create_widget** | ✓ decide | ✓ execute | Widget | widget.created | SUCCESS | ✓ | tak (undo) | detailed |
| **get_weather** | ✓ decide | ✓ execute | API | - | IDLE | ✓ | nie | simple |
| **get_crypto** | ✓ decide | ✓ execute | API | - | IDLE | ✓ | nie | simple |
| **set_theme** | ✓ decide | ✓ execute | Settings | theme.changed | SUCCESS | ✓ | nie | simple |

### Akcje plikowe

| Akcja | JEV Decision | Hermes | Tool | Event | Orb | Process Log | Approval | Verification |
|-------|-------------|--------|------|-------|-----|------------|----------|--------------|
| **files_read** | ✓ decide | ✓ execute | Files | - | IDLE | ✓ | nie | simple |
| **files_write** | ✓ decide | ✓ execute | Files | file.written | SUCCESS | ✓ | tak | detailed |
| **files_delete** | ✓ decide | ✓ execute | Files | file.deleted | WARNING | ✓ | tak | verification |
| **files_mkdir** | ✓ decide | ✓ execute | Files | folder.created | SUCCESS | ✓ | nie | simple |

### Akcje przeglądarki

| Akcja | JEV Decision | Hermes | Tool | Event | Orb | Process Log | Approval | Verification |
|-------|-------------|--------|------|-------|-----|------------|----------|--------------|
| **browser_open** | ✓ decide | ✓ execute | Browser | browser.opened | ACTING | ✓ | nie | simple |
| **browser_click** | ✓ decide | ✓ execute | Browser | browser.clicked | ACTING | ✓ | nie | detailed |
| **browser_type** | ✓ decide | ✓ execute | Browser | browser.typed | ACTING | ✓ | nie | detailed |
| **browser_navigate** | ✓ decide | ✓ execute | Browser | browser.navigated | ACTING | ✓ | nie | simple |
| **web_search** | ✓ decide | ✓ execute | Browser | - | THINKING | ✓ | nie | simple |

### Akcje terminala

| Akcja | JEV Decision | Hermes | Tool | Event | Orb | Process Log | Approval | Verification |
|-------|-------------|--------|------|-------|-----|------------|----------|--------------|
| **terminal_run** | ✓ decide | ✓ execute | Terminal | terminal.started | ACTING | ✓ | tak | detailed |
| **terminal_kill** | ✓ decide | ✓ execute | Terminal | terminal.killed | SUCCESS | ✓ | tak | simple |

### Akcje złożone

| Akcja | JEV Decision | Hermes | Tool | Event | Orb | Process Log | Approval | Verification |
|-------|-------------|--------|------|-------|-----|------------|----------|--------------|
| **multi_step_task** | ✓ plan | ✓ orchestrate | Multiple | task.progress | PROGRESS | ✓ | zależnie | detailed |
| **goal** | ✓ decompose | ✓ orchestrate | Multiple | goal.progress | MULTI | ✓ | zależnie | comprehensive |
| **research** | ✓ analyze | ✓ orchestrate | Browser+Files | research.progress | THINKING | ✓ | nie | comprehensive |

---

## State Transition Matrix

| From State | Event | To State | Side Effects |
|------------|-------|----------|--------------|
| IDLE | user.input | LISTENING | Orb glow |
| LISTENING | parsed | UNDERSTANDING | Process log |
| UNDERSTANDING | intent | DECIDING | - |
| DECIDING | decision | PLANNING | - |
| PLANNING | plan | EXECUTING | Process log |
| EXECUTING | action_start | ACTING | Orb pulse |
| ACTING | action_end | VERIFYING | - |
| VERIFYING | success | SUCCESS | Orb success |
| VERIFYING | failure | FAILED | Orb error |
| FAILED | retry | REPLANNING | - |
| FAILED | abort | IDLE | Orb idle |
| SUCCESS | next | EXECUTING | - |
| SUCCESS | complete | COMPLETING | Orb complete |
| COMPLETING | done | IDLE | Orb idle |

---

## Proactivity Matrix

| Trigger | Analysis | Decision | Action | User Notification |
|---------|----------|----------|--------|------------------|
| error_critical | instant | instant | ACT | always |
| deadline_approaching | fast | fast | NOTIFY | always |
| task_completed | fast | fast | SUGGEST | optional |
| opportunity_detected | normal | normal | SUGGEST | optional |
| pattern_learned | slow | slow | - | never |

---

## Resource Management Matrix

| Resource | Warning | Critical | Action |
|----------|---------|----------|--------|
| CPU 80% | notify | limit new tasks | queue |
| RAM 90% | notify | force gc | swap |
| GPU 90% | notify | queue GPU tasks | wait |
| Tokens $5/day | notify | use cheaper model | reroute |
| Agents 3/3 | queue | queue | wait |

---

## Capability Discovery Matrix

| User Request | Check Available | If Missing | If Present |
|--------------|----------------|------------|------------|
| "Wyślij na Slacka" | Slack tool | "Nie mam Slacka" | Execute |
| "Zrób backup" | Files + backup | "Brak narzędzi" | Execute |
| "Uruchom testy" | Terminal + test | "Nie widzę testów" | Execute |
| "Wyszukaj w necie" | Browser | "Brak przeglądarki" | Execute |

---

## Security Matrix

| Action | Risk Level | Approval | Logging | Vault Needed |
|--------|------------|----------|---------|--------------|
| read_file | LOW | no | yes | no |
| write_file | MEDIUM | yes | yes | no |
| delete_file | HIGH | yes (explicit) | yes | no |
| terminal_run | CRITICAL | yes | yes | no |
| api_request | MEDIUM | no | yes | yes (key) |
| github_push | CRITICAL | yes | yes | yes (token) |
| send_email | CRITICAL | yes | yes | yes (oauth) |

---

## Event Flow Examples

### Example 1: Open App

```
User: "Otwórz kalkulator"
  ↓
JEV: parse("open_app", app="calc")
  ↓
JEV: decide(action="open_app", target="calc", autonomy=A3)
  ↓
HERMES: execute("open_app", app="calc")
  ↓
EventBus: emit("app.opened", {app: "calc", id: "calc-001"})
  ↓
Orb: setState("acting")
  ↓
ProcessLog: "[12:30] WYKONUJĘ: open_app('calc')"
  ↓
Result: ok=true
  ↓
EventBus: emit("app.focused", {app: "calc"})
  ↓
Orb: setState("success") → "idle"
  ↓
ProcessLog: "[12:30] SUKCES: Kalkulator otwarty"
```

### Example 2: Delete File

```
User: "Usuń plik raport.txt"
  ↓
JEV: parse("delete_file", path="raport.txt")
  ↓
JEV: decide(action="delete_file", path="raport.txt", autonomy=A0)
  ↓
ProcessLog: "[12:30] POTRZEBUJĘ ZGODY: Usunąć raport.txt?"
  ↓
UI: confirm dialog
  ↓
User: "Tak"
  ↓
HERMES: execute("delete_file", path="raport.txt")
  ↓
EventBus: emit("file.deleted", {path: "raport.txt"})
  ↓
Orb: setState("warning")
  ↓
ProcessLog: "[12:30] WYKONUJĘ: delete_file('raport.txt')"
  ↓
Result: ok=true
  ↓
Orb: setState("success") → "idle"
  ↓
ProcessLog: "[12:30] SUKCES: raport.txt usunięty"
```

### Example 3: Complex Task

```
User: "Zbadaj temat AI i przygotuj raport"
  ↓
JEV: parse("research_and_report", topic="AI")
  ↓
JEV: decompose_goal(goal="AI report")
  ↓
Plan: [search, read, analyze, create_note]
  ↓
ProcessLog: "[12:30] PLAN: 1) Szukaj 2) Czytaj 3) Analizuj 4) Raport"
  ↓
EXECUTE step 1: search("AI trends 2024")
  ↓
EventBus: emit("browser.searching", {query: "AI trends 2024"})
  ↓
Orb: setState("thinking")
  ↓
... (repeat for each step)
  ↓
FINAL:
EventBus: emit("task.completed", {goal: "AI report"})
  ↓
Orb: setState("complete")
  ↓
ProcessLog: "[12:35] ZADANIE UKOŃCZONE: Raport o AI gotowy"
```

---

## Autonomy Decision Matrix

| Action Type | Current Autonomy Level | Required Approval |
|-------------|----------------------|------------------|
| read_data | 0-5 | none |
| navigate | 0-5 | none |
| open_app | 0-5 | none |
| create_note | 2-5 | undo available |
| create_task | 2-5 | undo available |
| create_widget | 2-5 | undo available |
| write_file | 3-5 | if important |
| delete_file | 5 only | always |
| terminal_run | 5 only | always |
| api_request | 3-5 | if expensive |
| send_data | 5 only | always |

---

## Verification Matrix

| Action | Verify Method | Success Criteria | On Failure |
|--------|--------------|------------------|------------|
| open_app | window.exists | app visible | retry ×2, then fail |
| click | element.exists | element exists | retry with new selector |
| type | value.check | value matches | clear and retry |
| delete_file | !exists | file gone | verify in trash |
| create_note | note.exists | note in list | retry ×2 |
| terminal | exit_code | code = 0 | show error, ask |
| api_request | status_code | 200-299 | retry ×3 |

---

## Error Recovery Matrix

| Error Code | Meaning | Recovery Action |
|------------|---------|-----------------|
| NOT_FOUND | Element nie istnieje | Retry z alternatywą |
| TIMEOUT | Przekroczony czas | Retry z dłuższym timeoutem |
| PERMISSION_DENIED | Brak uprawnień | Poproś zgodę |
| INVALID_ARGS | Złe argumenty | Validate, popraw |
| AMBIGUOUS | Wiele dopasowań | Zapytaj użytkownika |
| OFFLINE | Brak sieci | Retry when online |
| RATE_LIMITED | Zbyt wiele requestów | Backoff, retry |

---

## Orb State Mapping

| System State | Orb Animation | Color | Effect |
|--------------|---------------|-------|--------|
| IDLE | gentle pulse | base | none |
| LISTENING | glow | base | subtle |
| THINKING | swirl | blue | particles |
| DECIDING | spin | blue | orbit |
| ACTING | active | green | pulse |
| VERIFYING | check | green | verify |
| SUCCESS | success | green | glow + particles |
| FAILED | error | red | glitch |
| RECOVERING | recovering | yellow | pulse |
| WARNING | warning | orange | shake |
