# NAVIGATION — Katalog nawigacji systemu

## Klasyfikacja operacji

Każda operacja ma format:
```
KATEGORIA
└── OBIEKT
    └── OPERACJA
        ├── input: co przyjmuje
        ├── output: co zwraca
        └── preconditions: warunki wykonania
```

---

## 1. DESKTOP — Pulpit

### 1.1 Aplikacje (apps)

```
DESKTOP
└── APP
    ├── open (id)
    │   ├── input: app_id (chat|notes|tasks|calc|timer|weather|market|schedule|settings|library|terminal|monitor)
    │   ├── output: { ok, app, window }
    │   └── preconditions: app istnieje w J.APP_NAMES
    │
    ├── close (app)
    │   ├── input: app_id | "all"
    │   ├── output: { ok, closed: [] }
    │   └── preconditions: okno jest otwarte
    │
    ├── focus (app)
    │   ├── input: app_id | "current" | "next"
    │   ├── output: { ok, focused: app_id }
    │   └── preconditions: okno istnieje
    │
    ├── minimize (app)
    │   ├── input: app_id | "all"
    │   ├── output: { ok, minimized: [] }
    │   └── preconditions: okno jest otwarte
    │
    ├── restore (app)
    │   ├── input: app_id | "all"
    │   ├── output: { ok, restored: [] }
    │   └── preconditions: okno jest zminimalizowane
    │
    ├── move (x, y)
    │   ├── input: { x: number, y: number, app?: string }
    │   ├── output: { ok, position: {x, y} }
    │   └── preconditions: okno istnieje
    │
    ├── resize (w, h)
    │   ├── input: { w: number, h: number, app?: string }
    │   ├── output: { ok, size: {w, h} }
    │   └── preconditions: okno istnieje
    │
    ├── pin (on, app?)
    │   ├── input: { on: boolean, app?: string }
    │   ├── output: { ok, pinned: [] }
    │   └── preconditions: okno istnieje
    │
    ├── list
    │   ├── input: —
    │   ├── output: { windows: [{id, app, title, x, y, w, h, minimized, pinned}] }
    │   └── preconditions: —
    │
    └── arrange (mode)
        ├── input: mode (tile|left|right|top|bottom|max|center|layout)
        ├── output: { ok, arrangement: mode }
        └── preconditions: —
```

### 1.2 Layout pulpitu

```
DESKTOP
└── LAYOUT
    ├── save (name)
    │   ├── input: { name: string }
    │   ├── output: { ok, name }
    │   └── preconditions: —
    │
    ├── load (name)
    │   ├── input: { name: string }
    │   ├── output: { ok, name }
    │   └── preconditions: układ istnieje
    │
    ├── list
    │   ├── input: —
    │   ├── output: { layouts: [{name, apps: [], windows: []}] }
    │   └── preconditions: —
    │
    ├── remove (name)
    │   ├── input: { name: string }
    │   ├── output: { ok }
    │   └── preconditions: układ istnieje
    │
    └── setStartup (name | "last")
        ├── input: { name: string }
        ├── output: { ok }
        └── preconditions: —
```

### 1.3 Workspace

```
DESKTOP
└── WORKSPACE
    ├── switch (index)
    │   ├── input: { index: number }
    │   ├── output: { ok, workspace: index }
    │   └── preconditions: workspace istnieje
    │
    ├── create (name)
    │   ├── input: { name: string }
    │   ├── output: { ok, workspace: index }
    │   └── preconditions: —
    │
    └── list
        ├── input: —
        ├── output: { workspaces: [{index, name, windows: []}] }
        └── preconditions: —
```

---

## 2. FILES — System plików

```
FILES
└── FILE_SYSTEM
    ├── read (path)
    │   ├── input: { path: string }
    │   ├── output: { ok, content: string, size, modified }
    │   └── preconditions: plik istnieje i jest tekstowy
    │
    ├── write (path, content)
    │   ├── input: { path: string, content: string }
    │   ├── output: { ok, path }
    │   └── preconditions: —
    │
    ├── list (path, glob?)
    │   ├── input: { path: string, glob?: string }
    │   ├── output: { files: [{name, path, size, isDir}] }
    │   └── preconditions: folder istnieje
    │
    ├── copy (src, dst)
    │   ├── input: { src: string, dst: string }
    │   ├── output: { ok, dst }
    │   └── preconditions: src istnieje
    │
    ├── move (src, dst)
    │   ├── input: { src: string, dst: string }
    │   ├── output: { ok, dst }
    │   └── preconditions: src istnieje
    │
    ├── delete (path)
    │   ├── input: { path: string }
    │   ├── output: { ok }
    │   └── preconditions: plik istnieje
    │
    ├── search (pattern, path?)
    │   ├── input: { pattern: string, path?: string }
    │   ├── output: { matches: [{file, line, content}] }
    │   └── preconditions: —
    │
    └── exists (path)
        ├── input: { path: string }
        ├── output: { ok, exists: boolean, isDir: boolean }
        └── preconditions: —
```

---

## 3. BROWSER — Przeglądarka agenta

```
BROWSER
└── NAVIGATION
    ├── open (url)
    │   ├── input: { url: string }
    │   ├── output: { ok, url, title }
    │   └── preconditions: URL jest poprawny
    │
    ├── go (url)
    │   ├── input: { url: string }
    │   ├── output: { ok, url, title }
    │   └── preconditions: karta istnieje
    │
    ├── back
    │   ├── input: —
    │   ├── output: { ok, url, title }
    │   └── preconditions: historia wstecz
    │
    ├── forward
    │   ├── input: —
    │   ├── output: { ok, url, title }
    │   └── preconditions: historia forward
    │
    ├── reload
    │   ├── input: —
    │   ├── output: { ok }
    │   └── preconditions: —
    │
    ├── newTab (url?)
    │   ├── input: { url?: string }
    │   ├── output: { ok, tabId }
    │   └── preconditions: —
    │
    ├── closeTab (tabId?)
    │   ├── input: { tabId?: string }
    │   ├── output: { ok }
    │   └── preconditions: karta istnieje
    │
    └── switchTab (tabId)
        ├── input: { tabId: string }
        ├── output: { ok }
        └── preconditions: karta istnieje
```

```
BROWSER
└── INTERACTION
    ├── click (selector | coordinates)
    │   ├── input: { selector?: string, x?: number, y?: number }
    │   ├── output: { ok, element?: string }
    │   └── preconditions: element istnieje
    │
    ├── type (selector, text)
    │   ├── input: { selector: string, text: string }
    │   ├── output: { ok }
    │   └── preconditions: input istnieje
    │
    ├── select (selector, value)
    │   ├── input: { selector: string, value: string }
    │   ├── output: { ok }
    │   └── preconditions: select istnieje
    │
    ├── scroll (direction, amount?)
    │   ├── input: { direction: "up"|"down"|"to", amount?: number }
    │   ├── output: { ok }
    │   └── preconditions: —
    │
    ├── hover (selector)
    │   ├── input: { selector: string }
    │   ├── output: { ok }
    │   └── preconditions: element istnieje
    │
    └── drag (fromSelector, toSelector)
        ├── input: { from: string, to: string }
        ├── output: { ok }
        └── preconditions: elementy istnieją
```

```
BROWSER
└── CONTENT
    ├── read
    │   ├── input: —
    │   ├── output: { ok, title, url, text, html }
    │   └── preconditions: —
    │
    ├── extract (selector)
    │   ├── input: { selector: string }
    │   ├── output: { ok, elements: [{tag, text, attributes}] }
    │   └── preconditions: —
    │
    ├── screenshot
    │   ├── input: { fullPage?: boolean }
    │   ├── output: { ok, image: base64 }
    │   └── preconditions: —
    │
    └── evaluate (script)
        ├── input: { script: string }
        │   ├── output: { ok, result }
        │   └── preconditions: —
```

---

## 4. JARVIS DESKTOP — Widgety

```
JARVIS
└── WIDGET
    ├── create (type, config)
    │   ├── input: { type: "note"|"list"|"result", title?: string, content?: string }
    │   ├── output: { ok, id }
    │   └── preconditions: —
    │
    ├── open (id)
    │   ├── input: { id: string }
    │   ├── output: { ok }
    │   └── preconditions: widget istnieje
    │
    ├── close (id)
    │   ├── input: { id: string }
    │   ├── output: { ok }
    │   └── preconditions: widget istnieje
    │
    ├── move (id, x, y)
    │   ├── input: { id: string, x: number, y: number }
    │   ├── output: { ok }
    │   └── preconditions: widget istnieje
    │
    ├── resize (id, w, h)
    │   ├── input: { id: string, w: number, h: number }
    │   ├── output: { ok }
    │   └── preconditions: widget istnieje
    │
    ├── update (id, changes)
    │   ├── input: { id: string, title?: string, content?: string }
    │   ├── output: { ok }
    │   └── preconditions: widget istnieje
    │
    ├── list
    │   ├── input: —
    │   ├── output: { widgets: [{id, type, title, x, y, w, h}] }
    │   └── preconditions: —
    │
    └── remove (id)
        ├── input: { id: string }
        ├── output: { ok }
        └── preconditions: widget istnieje
```

```
JARVIS
└── PROJECT
    ├── create (name)
    │   ├── input: { name: string }
    │   ├── output: { ok, id }
    │   └── preconditions: —
    │
    ├── open (id)
    │   ├── input: { id: string }
    │   ├── output: { ok }
    │   └── preconditions: projekt istnieje
    │
    ├── save (id)
    │   ├── input: { id: string }
    │   ├── output: { ok }
    │   └── preconditions: projekt istnieje
    │
    ├── list
    │   ├── input: —
    │   ├── output: { projects: [{id, name, widgets: []}] }
    │   └── preconditions: —
    │
    └── delete (id)
        ├── input: { id: string }
        ├── output: { ok }
        └── preconditions: projekt istnieje
```

---

## 5. TERMINAL

```
TERMINAL
└── SHELL
    ├── run (command, cwd?)
    │   ├── input: { command: string, cwd?: string, timeout?: number }
    │   ├── output: { ok, stdout, stderr, exitCode }
    │   └── preconditions: —
    │
    ├── runBackground (command)
    │   ├── input: { command: string }
    │   ├── output: { ok, pid }
    │   └── preconditions: —
    │
    ├── kill (pid)
    │   ├── input: { pid: number }
    │   ├── output: { ok }
    │   └── preconditions: proces istnieje
    │
    ├── list
    │   ├── input: —
    │   ├── output: { processes: [{pid, command, status}] }
    │   └── preconditions: —
    │
    └── newSession
        ├── input: —
        ├── output: { ok, sessionId }
        └── preconditions: —
```

---

## 6. JARVIS APPS

### 6.1 Notes

```
NOTES
├── create (title, content?)
│   ├── input: { title: string, content?: string }
│   ├── output: { ok, id }
│   └── preconditions: —
│
├── read (id)
│   ├── input: { id: string }
│   ├── output: { ok, note: {id, title, content, created, modified} }
│   └── preconditions: notatka istnieje
│
├── update (id, changes)
│   ├── input: { id: string, title?: string, content?: string }
│   ├── output: { ok }
│   └── preconditions: notatka istnieje
│
├── delete (id)
│   ├── input: { id: string }
│   ├── output: { ok }
│   └── preconditions: notatka istnieje
│
├── list (query?)
│   ├── input: { query?: string }
│   ├── output: { notes: [{id, title, created, modified}] }
│   └── preconditions: —
│
├── search (query)
│   ├── input: { query: string }
│   ├── output: { matches: [{id, title, preview}] }
│   └── preconditions: —
│
└── append (id, content)
    ├── input: { id: string, content: string }
    ├── output: { ok }
    └── preconditions: notatka istnieje
```

### 6.2 Tasks

```
TASKS
├── create (text, time?, date?)
│   ├── input: { text: string, time?: string, date?: string }
│   ├── output: { ok, id }
│   └── preconditions: —
│
├── complete (id, done?)
│   ├── input: { id: string, done?: boolean }
│   ├── output: { ok }
│   └── preconditions: zadanie istnieje
│
├── update (id, changes)
│   ├── input: { id: string, text?: string, time?: string, date?: string }
│   ├── output: { ok }
│   └── preconditions: zadanie istnieje
│
├── delete (id)
│   ├── input: { id: string }
│   ├── output: { ok }
│   └── preconditions: zadanie istnieje
│
├── list (range)
│   ├── input: { range: "today"|"tomorrow"|"week"|"all"|"overdue" }
│   ├── output: { tasks: [{id, text, time, date, done}] }
│   └── preconditions: —
│
└── snooze (id, minutes)
    ├── input: { id: string, minutes: number }
    ├── output: { ok }
    └── preconditions: zadanie istnieje
```

### 6.3 Timer

```
TIMER
├── start (seconds, label?)
│   ├── input: { seconds: number, label?: string }
│   ├── output: { ok, id }
│   └── preconditions: —
│
├── stop (id)
│   ├── input: { id: string }
│   ├── output: { ok, elapsed }
│   └── preconditions: timer istnieje
│
├── pause (id)
│   ├── input: { id: string }
│   ├── output: { ok }
│   └── preconditions: timer istnieje
│
├── resume (id)
│   ├── input: { id: string }
│   ├── output: { ok }
│   └── preconditions: timer jest zapauzowany
│
├── extend (id, seconds)
│   ├── input: { id: string, seconds: number }
│   ├── output: { ok }
│   └── preconditions: timer istnieje
│
└── list
    ├── input: —
    ├── output: { timers: [{id, label, remaining, status}] }
    └── preconditions: —
```

---

## 7. SYSTEM

```
SYSTEM
├── getStatus
│   ├── input: —
│   ├── output: { windows, widgets, tasks, notes, memory, settings }
│   └── preconditions: —
│
├── getSettings
│   ├── input: —
│   ├── output: { settings: {...} }
│   └── preconditions: —
│
├── setSetting (key, value)
│   ├── input: { key: string, value: any }
│   ├── output: { ok }
│   └── preconditions: klucz istnieje
│
├── getWeather (city, days?)
│   ├── input: { city: string, days?: number }
│   ├── output: { ok, current, forecast: [] }
│   └── preconditions: —
│
├── getCryptoPrices (symbols?)
│   ├── input: { symbols?: string[] }
│   ├── output: { ok, prices: {} }
│   └── preconditions: —
│
└── calculate (expression)
    ├── input: { expression: string }
    ├── output: { ok, result: number }
    └── preconditions: —
```

---

## 8. Identifikatory (do nawigacji)

### 8.1 App IDs
```
chat, notes, tasks, calc, timer, weather, market, schedule, 
settings, library, terminal, monitor, files, search, help
```

### 8.2 Widget Types
```
note, list, result, chart, weather, crypto, timer, notes_list, tasks_list
```

### 8.3 Window States
```
normal, minimized, maximized, pinned, focused
```

### 8.4 Layout Modes
```
tile, left, right, top, bottom, max, center, layout
```

### 8.5 Task Ranges
```
today, tomorrow, week, all, overdue
```
