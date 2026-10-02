# ACTIONS — Katalog działań

## Struktura działania

Każde działanie ma formalny opis:
```
Action: <name>
├── INPUT: parametry wejściowe
├── PRECONDITIONS: warunki konieczne przed wykonaniem
├── EXECUTE: jak wykonać
├── VERIFY: jak sprawdzić czy się udało
└── RESULT: co zwraca
```

---

## 1. PODSTAWOWE DZIAŁANIA

### 1.1 Click

```
Action: click
INPUT
├── target: string (CSS selector lub "coordinates")
├── x?: number (jeśli coordinates)
├── y?: number (jeśli coordinates)
└── button?: "left" | "right" | "middle"
PRECONDITIONS
└── element exists: document.querySelector(target) !== null
EXECUTE
├── if selector: element.click()
├── if coordinates: mouseClick(x, y)
└── wait for potential navigation
VERIFY
└── expected state changed (url, element state, or callback)
RESULT
├── success: { ok: true, element: selector }
├── failed: { ok: false, code: "ELEMENT_NOT_FOUND" | "TIMEOUT" }
└── uncertain: { ok: false, code: "VERIFICATION_UNCLEAR" }
```

### 1.2 Type

```
Action: type
INPUT
├── selector: string (input lub textarea)
├── text: string
└── clear?: boolean (czy wyczyścić przed wpisaniem)
PRECONDITIONS
└── input element exists and is editable
EXECUTE
├── if clear: element.value = ""
├── focus element
├── element.value += text
└── dispatch input event
VERIFY
└── element.value contains text
RESULT
├── success: { ok: true }
├── failed: { ok: false, code: "INPUT_NOT_FOUND" | "READONLY" }
└── uncertain: { ok: false, code: "VALUE_MISMATCH" }
```

### 1.3 Navigate

```
Action: navigate
INPUT
├── target: string (URL lub app_id)
└── newTab?: boolean
PRECONDITIONS
└── URL is valid lub app_id jest znany
EXECUTE
├── if URL: browser.goto(url)
├── if app_id: J.apps.open(app_id)
└── wait for load
VERIFY
└── url changed lub app opened
RESULT
├── success: { ok: true, url, title }
├── failed: { ok: false, code: "INVALID_URL" | "APP_NOT_FOUND" }
└── uncertain: { ok: false, code: "LOAD_TIMEOUT" }
```

### 1.4 Read

```
Action: read
INPUT
├── source: "screen" | "dom" | "file" | "api"
├── selector?: string (dla DOM)
├── path?: string (dla pliku)
└── url?: string (dla API)
PRECONDITIONS
├── dla DOM: element istnieje
├── dla pliku: plik istnieje i jest tekstowy
└── dla API: endpoint odpowiada
EXECUTE
├── DOM: element.textContent lub outerHTML
├── file: fs.readFile(path)
├── API: fetch(url)
└── screen: screenshot()
VERIFY
└── data retrieved non-empty
RESULT
├── success: { ok: true, data: string | object }
├── failed: { ok: false, code: "NOT_FOUND" | "PERMISSION_DENIED" }
└── uncertain: { ok: false, code: "EMPTY_RESULT" }
```

---

## 2. ZŁOŻONE DZIAŁANIA

### 2.1 Fill Form

```
Action: fillForm
INPUT
├── selector: string (form)
└── fields: { [fieldName]: value }
PRECONDITIONS
└── form exists
EXECUTE
├── for each field:
│   ├── find input by name/label/selector
│   ├── clear if needed
│   ├── type value
│   └── dispatch events
└── optional: click submit button
VERIFY
├── all fields filled correctly
└── optional: form submitted
RESULT
├── success: { ok: true, filled: fields[] }
├── failed: { ok: false, code: "FIELD_NOT_FOUND", field: string }
└── uncertain: { ok: false, code: "SUBMIT_FAILED" }
```

### 2.2 Drag and Drop

```
Action: dragDrop
INPUT
├── source: string (selector)
├── target: string (selector lub coordinates)
└── action: "move" | "copy" | "link"
PRECONDITIONS
├── source element exists
└── target element/location exists
EXECUTE
├── get source position
├── mouse down on source
├── drag to target position
├── mouse up
└── handle drop event
VERIFY
├── element moved/copied
└── visual feedback confirmed
RESULT
├── success: { ok: true }
├── failed: { ok: false, code: "DRAG_FAILED" | "DROP_TARGET_MISSING" }
└── uncertain: { ok: false, code: "DROP_UNCLEAR" }
```

### 2.3 Wait For

```
Action: waitFor
INPUT
├── condition: "element" | "url" | "text" | "state"
├── target: string (selector/url/text)
├── timeout: number (ms)
└── state?: "visible" | "hidden" | "enabled" | "disabled"
PRECONDITIONS
└── —
EXECUTE
├── poll condition every 500ms
├── max until timeout
└── resolve on condition met
VERIFY
└── condition met within timeout
RESULT
├── success: { ok: true, met: true }
├── timeout: { ok: false, code: "TIMEOUT", met: false }
└── failed: { ok: false, code: "CONDITION_IMPOSSIBLE" }
```

### 2.4 Scroll

```
Action: scroll
INPUT
├── direction: "up" | "down" | "to" | "toElement"
├── amount?: number (pixels, default 300)
├── selector?: string (dla toElement)
└── behavior?: "smooth" | "instant"
PRECONDITIONS
└── scrollable element exists
EXECUTE
├── if direction: window.scrollBy(0, amount lub -amount)
├── if to: window.scrollTo(0, amount)
├── if toElement: element.scrollIntoView()
└── optional: wait for scroll end
VERIFY
└── scroll position changed
RESULT
├── success: { ok: true, position: {x, y} }
├── failed: { ok: false, code: "NOT_SCROLLABLE" }
└── uncertain: { ok: false, code: "SCROLL_NO_CHANGE" }
```

---

## 3. PLIKOWE

### 3.1 Create File

```
Action: createFile
INPUT
├── path: string
├── content: string
└── encoding: "utf8" | "binary"
PRECONDITIONS
├── parent directory exists
└── file does not exist (lub overwrite=true)
EXECUTE
├── ensure parent dir exists
├── write file with content
└── verify written
VERIFY
└── file exists and content matches
RESULT
├── success: { ok: true, path, size }
├── failed: { ok: false, code: "PERMISSION_DENIED" | "PATH_INVALID" }
└── uncertain: { ok: false, code: "WRITE_VERIFY_FAILED" }
```

### 3.2 Delete File

```
Action: deleteFile
INPUT
├── path: string
└── permanent?: boolean (false = trash)
PRECONDITIONS
└── file exists
EXECUTE
├── move to trash lub permanent delete
└── verify removed
VERIFY
└── file no longer exists
RESULT
├── success: { ok: true }
├── failed: { ok: false, code: "NOT_FOUND" | "PERMISSION_DENIED" }
└── uncertain: { ok: false, code: "DELETE_VERIFY_FAILED" }
```

---

## 4. JARVIS SPECIFIC

### 4.1 Create Note

```
Action: createNote
INPUT
├── title: string
└── content?: string
PRECONDITIONS
└── —
EXECUTE
├── J.notes.create(title, content)
└── get created note id
VERIFY
└── note exists in list
RESULT
├── success: { ok: true, id }
├── failed: { ok: false, code: "CREATE_FAILED" }
└── uncertain: { ok: false, code: "VERIFY_FAILED" }
```

### 4.2 Create Task

```
Action: createTask
INPUT
├── text: string
├── time?: string (HH:MM)
└── date?: string (YYYY-MM-DD)
PRECONDITIONS
└── —
EXECUTE
├── J.tasks.add(text, time, date)
└── get created task id
VERIFY
└── task in list
RESULT
├── success: { ok: true, id }
├── failed: { ok: false, code: "CREATE_FAILED" }
└── uncertain: { ok: false, code: "VERIFY_FAILED" }
```

### 4.3 Create Widget

```
Action: createWidget
INPUT
├── type: "note" | "list" | "result"
├── title?: string
└── content?: string
PRECONDITIONS
└── —
EXECUTE
├── J.widgets.create(type, title, content)
└── get widget id
VERIFY
└── widget visible on desktop
RESULT
├── success: { ok: true, id }
├── failed: { ok: false, code: "WIDGET_TYPE_INVALID" }
└── uncertain: { ok: false, code: "VERIFY_FAILED" }
```

---

## 5. WERYFIKACJA

### 5.1 Verify Success

Po każdym działaniu system sprawdza:

```
VERIFY
├── 1. Check return code
│   ├── ok=true → continue verification
│   └── ok=false → analyze error code
│
├── 2. Check observable state
│   ├── URL changed?
│   ├── Element appeared/disappeared?
│   ├── Content changed?
│   └── Visual feedback present?
│
├── 3. Check side effects
│   ├── File created?
│   ├── Data saved?
│   └── Notification shown?
│
└── 4. Decision
    ├── all checks pass → SUCCESS
    ├── any check fails → FAILED
    └── unclear → UNCERTAIN (retry or ask user)
```

### 5.2 Error Handling

| Kod błędu | Opis | Akcja |
|-----------|------|-------|
| ELEMENT_NOT_FOUND | Element nie istnieje | Retry z nowym selectorem |
| TIMEOUT | Przekroczony czas | Retry z dłuższym timeoutem |
| PERMISSION_DENIED | Brak uprawnień | Ask user |
| INVALID_ARGS | Złe argumenty | Validate before run |
| AMBIGUOUS | Wiele dopasowań | Ask user to choose |
| OFFLINE | Brak połączenia | Retry when online |

---

## 6. PRZEBIEG DZIAŁANIA

```
         ┌─────────────┐
         │    INPUT    │
         └──────┬──────┘
                ▼
         ┌─────────────┐
         │ PRECONDITIONS│ ← Sprawdź warunki
         └──────┬──────┘
                ▼
         ┌─────────────┐
         │   EXECUTE   │ ← Wykonaj akcję
         └──────┬──────┘
                ▼
         ┌─────────────┐
         │   VERIFY    │ ← Sprawdź rezultat
         └──────┬──────┘
                ▼
    ┌──────────┼──────────┐
    ▼          ▼          ▼
 SUCCESS    FAILED    UNCERTAIN
    │          │          │
    ▼          ▼          ▼
CONTINUE   RETRY    ASK USER
```

---

## 7. STOSOWANIE W JEV

Każde działanie w Jev loop:

```
OBSERVE (co widzę teraz?)
   ↓
UNDERSTAND (co to znaczy w kontekście?)
   ↓
DECIDE (co mam zrobić?)
   ↓
PLAN (jakie działania?)
   ↓
EXECUTE (wykonaj pierwsze działanie)
   ↓
VERIFY (czy się udało?)
   ↓
   ├── YES → NEXT ACTION lub COMPLETE
   ├── NO → RETRY lub REPLAN
   └── UNCERTAIN → ASK USER
```

Każde działanie musi mieć:
1. Preconditions — co musi być spełnione
2. Execute — jak wykonać
3. Verify — jak sprawdzić sukces
4. Error codes — co może pójść nie tak
