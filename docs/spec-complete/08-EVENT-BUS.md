# EVENT BUS — Magistrala zdarzeń

## Definicja

Event Bus to centralny system komunikacji w Jarvis OS. Wszystkie moduły komunikują się przez zdarzenia.

---

## Architektura

```
                    ┌─────────────┐
                    │  EventBus  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
    ┌──────┐          ┌──────┐          ┌──────┐
    │ JEV  │          │  UI  │          │Bridge│
    └──────┘          └──────┘          └──────┘
        │                  │                  │
        ▼                  ▼                  ▼
    ┌──────┐          ┌──────┐          ┌──────┐
    │Hermes│          │ Widgets│          │  OS  │
    └──────┘          └──────┘          └──────┘
```

---

## 1. Podstawowe operacje

```javascript
// Emitowanie zdarzenia
EventBus.emit(event, data)

// Nasłuchiwianie
EventBus.on(event, handler) → unsubscribe

// Nasłuchiwianie jednorazowe
EventBus.once(event, handler) → unsubscribe

// Usunięcie nasłuchiwacza
EventBus.off(event, handler)

// Usunięcie wszystkich
EventBus.clear(event?)
```

---

## 2. Katalog zdarzeń

### 2.1 Zdarzenia użytkownika

| Event | Opis | Dane |
|-------|------|------|
| `user.message` | Wiadomość od użytkownika | `{ text, timestamp }` |
| `user.command` | Polecenie od użytkownika | `{ command, args }` |
| `user.click` | Kliknięcie w interfejsie | `{ x, y, target }` |
| `user.input` | Wprowadzenie tekstu | `{ value, target }` |
| `user.voice` | Komenda głosowa | `{ text, confidence }` |

### 2.2 Zdarzenia okien

| Event | Opis | Dane |
|-------|------|------|
| `app.opened` | Otwarto aplikację | `{ app, id, title }` |
| `app.closed` | Zamknięto aplikację | `{ app, id }` |
| `app.focused` | Aplikacja otrzymała focus | `{ app, id }` |
| `window.moved` | Przesunięto okno | `{ id, position }` |
| `window.resized` | Zmieniono rozmiar okna | `{ id, size }` |
| `window.minimized` | Zminimalizowano okno | `{ id }` |
| `window.maximized` | Zmaksymalizowano okno | `{ id }` |
| `window.closed` | Zamknięto okno | `{ id }` |

### 2.3 Zdarzenia widgetów

| Event | Opis | Dane |
|-------|------|------|
| `widget.created` | Utworzono widget | `{ id, type, title }` |
| `widget.updated` | Zaktualizowano widget | `{ id, changes }` |
| `widget.removed` | Usunięto widget | `{ id }` |
| `widget.focused` | Widget otrzymał focus | `{ id }` |
| `widget.collapsed` | Zwinięto widget | `{ id }` |
| `widget.expanded` | Rozwinięto widget | `{ id }` |

### 2.4 Zdarzenia notatek

| Event | Opis | Dane |
|-------|------|------|
| `note.created` | Utworzono notatkę | `{ id, title }` |
| `note.updated` | Zaktualizowano notatkę | `{ id, changes }` |
| `note.deleted` | Usunięto notatkę | `{ id }` |
| `note.restored` | Przywrócono notatkę | `{ id }` |

### 2.5 Zdarzenia zadań

| Event | Opis | Dane |
|-------|------|------|
| `task.created` | Utworzono zadanie | `{ id, text, time }` |
| `task.updated` | Zaktualizowano zadanie | `{ id, changes }` |
| `task.completed` | Ukończono zadanie | `{ id }` |
| `task.removed` | Usunięto zadanie | `{ id }` |
| `task.snoozed` | Uśpiono zadanie | `{ id, until }` |

### 2.6 Zdarzenia JEV

| Event | Opis | Dane |
|-------|------|------|
| `jev.start` | Rozpoczęto przetwarzanie | `{ input }` |
| `jev.parsing` | Trwa parsowanie | `{ input }` |
| `jev.deciding` | Trwa podejmowanie decyzji | `{ input, options }` |
| `jev.action` | Wybrano akcję | `{ action, target, autonomy }` |
| `jev.executing` | Wykonuję akcję | `{ action, target }` |
| `jev.success` | Akcja udana | `{ action, result }` |
| `jev.failed` | Akcja nieudana | `{ action, error }` |
| `jev.complete` | Zadanie ukończone | `{ input, result }` |
| `jev.error` | Błąd Jev | `{ error, context }` |

### 2.7 Zdarzenia Hermes

| Event | Opis | Dane |
|-------|------|------|
| `hermes.call` | Wywołano narzędzie Hermes | `{ tool, args }` |
| `hermes.result` | Wynik z Hermes | `{ tool, result }` |
| `hermes.error` | Błąd Hermes | `{ tool, error }` |
| `hermes.connected` | Połączono z Hermes | `{}` |
| `hermes.disconnected` | Rozłączono z Hermes | `{}` |

### 2.8 Zdarzenia systemowe

| Event | Opis | Dane |
|-------|------|------|
| `system.ready` | System gotowy | `{}` |
| `system.error` | Błąd systemu | `{ code, message }` |
| `settings.changed` | Zmiana ustawień | `{ key, oldValue, newValue }` |
| `theme.changed` | Zmiana motywu | `{ theme }` |
| `focus.mode` | Zmiana trybu focus | `{ active }` |
| `timer.started` | Uruchomiono timer | `{ id, seconds }` |
| `timer.ended` | Timer zakończony | `{ id }` |
| `timer.paused` | Timer zapauzowany | `{ id }` |

### 2.9 Zdarzenia przeglądarki (agenta)

| Event | Opis | Dane |
|-------|------|------|
| `browser.opened` | Otwarto przeglądarkę | `{ url }` |
| `browser.closed` | Zamknięto przeglądarkę | `{}` |
| `browser.navigated` | Nawigacja | `{ url, title }` |
| `browser.element_found` | Znaleziono element | `{ selector, count }` |
| `browser.element_not_found` | Nie znaleziono elementu | `{ selector }` |

---

## 3. Struktura zdarzenia

```javascript
Event = {
  type: string,           // np. "app.opened"
  data: any,              // dane zdarzenia
  timestamp: number,      // Unix timestamp
  source: string,         // źródło (np. "jev", "ui", "hermes")
  id: string,             // unikalne ID zdarzenia
  correlationId?: string, // ID do śledzenia łańcucha
}
```

---

## 4. Subscriber — kto nasłuchuje

```javascript
// Każdy moduł może nasłuchiwać
EventBus.on('app.opened', (event) => {
  // Logika
})

// Z identyfikatorem modułu
EventBus.on('app.opened', handler, { 
  module: 'jev', 
  priority: 'high' 
})
```

---

## 5. Event Bus w praktyce

### 5.1 Przykład: Utworzenie notatki

```
User: "Utwórz notatkę"
  ↓
JEV: Analizuje, decyduje
  ↓
EventBus.emit('jev.start', { input: "Utwórz notatkę" })
  ↓
EventBus.emit('jev.action', { action: 'createNote' })
  ↓
HERMES: create_note() → result
  ↓
EventBus.emit('note.created', { id: '123', title: 'Nowa notatka' })
  ↓
EventBus.emit('jev.success', { action: 'createNote', result })
  ↓
Orb: aktualizuje stan (visual feedback)
  ↓
Process Log: wyświetla "Notatka utworzona"
```

### 5.2 Przykład: Błąd

```
User: "Otwórz nieistniejącą aplikację"
  ↓
JEV: Decyduje → open_app
  ↓
HERMES: open_app() → ERROR
  ↓
EventBus.emit('jev.failed', { action: 'open_app', error: 'APP_NOT_FOUND' })
  ↓
EventBus.emit('app.error', { code: 'APP_NOT_FOUND', app: 'xyz' })
  ↓
Orb: error state
  ↓
Process Log: "Nie mogę otworzyć aplikacji xyz"
  ↓
JEV: Informuje użytkownika o błędzie
```

---

## 6. Orb jako wizualizacja stanu

Orb nie jest tylko animacją — wizualizuje Event Bus:

```
Orb.state = {
  idle:      // Brak zdarzeń
  listening: // Oczekiwanie na input
  thinking:  // jev.parsing / jev.deciding
  acting:    // jev.executing
  success:   // jev.success
  error:     // jev.failed / system.error
}
```

```javascript
EventBus.on('jev.*', (e) => {
  if (e.type === 'jev.parsing' || e.type === 'jev.deciding') {
    Orb.setState('thinking')
  } else if (e.type === 'jev.executing') {
    Orb.setState('acting')
  } else if (e.type === 'jev.success') {
    Orb.setState('success')
  } else if (e.type === 'jev.failed') {
    Orb.setState('error')
  }
})
```

---

## 7. Process Log

Process Log pokazuje zdarzenia:

```
[12:30:15] USER: "Otwórz kalkulator"
[12:30:15] JEV: Parsuję polecenie
[12:30:16] JEV: Decyduję → open_app("calc")
[12:30:16] JEV: Poziom A3 — wykonuję sam
[12:30:17] APP: Otwarto aplikację calc
[12:30:17] JEV: Sukces
```

---

## 8. Filtrowanie i transformacje

### 8.1 Wildcard

```javascript
// Wszystkie zdarzenia JEV
EventBus.on('jev.*', handler)

// Wszystkie zdarzenia okien
EventBus.on('window.*', handler)

// Wszystkie zdarzenia błędów
EventBus.on('*.error', handler)
```

### 8.2 Filtry

```javascript
EventBus.on('app.opened', handler, {
  filter: (event) => event.data.app === 'calculator'
})
```

---

## 9. Debugowanie

```javascript
// Włącz logowanie wszystkich zdarzeń
EventBus.debug = true

// Nasłuchuj wszystkiego
EventBus.on('*', (event) => {
  console.log(event.type, event.data)
})

// Historia zdarzeń
EventBus.history // Array<Event>
```

---

## 10. Stan implementacji

### 10.1 Istniejące rozwiązania

W projekcie istnieje `BroadcastChannel` do komunikacji między kartami (main.js, core.js).

### 10.2 Co wymaga implementacji

| Funkcja | Stan | Uwagi |
|---------|------|-------|
| Centralny EventBus | ❌ Brak | Obecny BroadcastChannel służy do sync kart |
| Katalog zdarzeń | ⚠️ Częściowe | Część zdarzeń w kodzie |
| Orb integration | ⚠️ Częściowe | Stan wizualizacji istnieje |
| Process Log integration | ⚠️ Częściowe | Wyświetla logi, nie pełny event flow |

### 10.3 Rekomendacja

Zamiast budować nowy Event Bus od zera, rozbudować istniejący system:

1. **Zachować** BroadcastChannel (komunikacja kart)
2. **Dodać** EventBus jako singleton w js/core.js
3. **Zintegrować** z istniejącym Orb i Process Log
4. **Dodać** pełny katalog zdarzeń
