# TOOLS — Narzędzia systemu

## Klasyfikacja narzędzi

```
                    TOOLS
                       │
     ┌─────────────────┼─────────────────┐
     ▼                 ▼                 ▼
  BROWSER          FILESYSTEM         TERMINAL
     │                 │                 │
  webpage           pliki             polecenia
  click             read               run
  type              write              script
  navigate          delete              install
     │                 │                 │
     └─────────────────┼─────────────────┘
                       ▼
                     OS / API
                       │
                   system
                   process
                   network
```

---

## 1. BROWSER — Przeglądarka agenta

### 1.1 Funkcje podstawowe

| Funkcja | Opis | Parametry |
|---------|------|-----------|
| `goto` | Nawigacja do URL | `url` |
| `click` | Kliknięcie elementu | `selector` |
| `type` | Wpisz tekst | `selector, text` |
| `select` | Wybierz z listy | `selector, value` |
| `hover` | Najedź na element | `selector` |
| `scroll` | Przewiń | `direction, amount` |
| `screenshot` | Zrzut ekranu | — |
| `wait` | Czekaj na warunek | `selector, timeout` |

### 1.2 Funkcje zaawansowane

| Funkcja | Opis | Parametry |
|---------|------|-----------|
| `evaluate` | Wykonaj JS | `script` |
| `upload` | Prześlij plik | `selector, file` |
| `drag` | Przeciągnij | `from, to` |
| `iframe` | Obsługa iframe | `selector, action` |
| `newTab` | Nowa karta | `url` |
| `closeTab` | Zamknij kartę | `tabId` |
| `switchTab` | Przełącz kartę | `tabId` |

### 1.3 Odczyt danych

| Funkcja | Opis | Wynik |
|---------|------|-------|
| `text` | Pobierz tekst | `string` |
| `html` | Pobierz HTML | `string` |
| `attr` | Atrybut elementu | `string` |
| `value` | Wartość inputu | `string` |
| `allText` | Cały tekst strony | `string` |
| `visible` | Czy widoczny | `boolean` |
| `count` | Liczba elementów | `number` |

### 1.4 Implementacja

```
browser tool = {
  state: { page, tabs, frames },
  session: { cookies, localStorage },
  methods: { goto, click, type, ... }
}
```

---

## 2. FILESYSTEM — System plików

### 2.1 Odczyt

| Funkcja | Opis | Parametry |
|---------|------|-----------|
| `read` | Czytaj plik | `path` |
| `list` | Lista plików | `directory` |
| `search` | Szukaj w plikach | `pattern, path` |
| `stat` | Info o pliku | `path` |
| `exists` | Czy istnieje | `path` |

### 2.2 Zapis

| Funkcja | Opis | Parametry |
|---------|------|-----------|
| `write` | Zapisz plik | `path, content` |
| `append` | Dopisz do pliku | `path, content` |
| `mkdir` | Utwórz folder | `path` |
| `copy` | Kopiuj | `from, to` |
| `move` | Przenieś | `from, to` |

### 2.3 Usuwanie

| Funkcja | Opis | Parametry |
|---------|------|-----------|
| `delete` | Usuń plik | `path` |
| `rmdir` | Usuń folder | `path` |
| `trash` | Przenieś do kosza | `path` |

### 2.4 Ścieżki

```
File operations support:
├── ścieżki absolutne: /home/user/file.txt
├── ścieżki relatywne: ./file.txt, ../file.txt
├── glob patterns: *.txt, **/*.js
└── user's home: ~/file.txt
```

---

## 3. TERMINAL — Terminal systemowy

### 3.1 Funkcje podstawowe

| Funkcja | Opis | Parametry |
|---------|------|-----------|
| `run` | Wykonaj polecenie | `command, timeout` |
| `shell` | Powłoka interaktywna | `shell` |
| `background` | Proces w tle | `command` |
| `kill` | Zabij proces | `pid` |

### 3.2 Bezpieczeństwo

```
Terminal restrictions:
├── BŁĘDY WYMAGAJĄ ZGODY:
│   ├── rm -rf /
│   ├── dd if=/dev/zero
│   ├── curl | sh
│   ├── wget | sh
│   └── polecenia modyfikujące system
│
└── DOZWOLONE BEZ PYTANIA:
    ├── read-only: ls, cat, grep, find
    ├── npm/yarn (z warning)
    ├── git (z warning)
    └── python bez modyfikacji
```

---

## 4. OS — System operacyjny

### 4.1 Zarządzanie procesami

| Funkcja | Opis |
|---------|------|
| `process_list` | Lista procesów |
| `process_kill` | Zabij proces |
| `process_info` | Info o procesie |

### 4.2 System

| Funkcja | Opis |
|---------|------|
| `os_info` | Info o systemie |
| `memory` | Zużycie pamięci |
| `cpu` | Zużycie CPU |
| `disk` | Zużycie dysku |

### 4.3 Okna (Window Manager)

| Funkcja | Opis |
|---------|------|
| `window_list` | Lista okien |
| `window_focus` | Aktywuj okno |
| `window_move` | Przesuń okno |
| `window_resize` | Zmień rozmiar |
| `window_minimize` | Zminimalizuj |
| `window_maximize` | Zmaksymalizuj |

---

## 5. API — Integracje zewnętrzne

### 5.1 HTTP

| Funkcja | Opis |
|---------|------|
| `http_get` | GET request |
| `http_post` | POST request |
| `http_put` | PUT request |
| `http_delete` | DELETE request |

### 5.2 WebSocket

| Funkcja | Opis |
|---------|------|
| `ws_connect` | Połącz |
| `ws_send` | Wyślij |
| `ws_receive` | Odbierz |
| `ws_close` | Zamknij |

### 5.3 OAuth/API Keys

```
API auth:
├── Wbudowane: weather, crypto, news
├── Użytkownika: własne klucze w settings
└── Vault: bezpieczne przechowywanie
```

---

## 6. JARVIS SPECIFIC — Narzędzia Jarvis

### 6.1 Aplikacje

| Funkcja | Opis |
|---------|------|
| `app_open` | Otwórz aplikację |
| `app_close` | Zamknij aplikację |
| `app_focus` | Aktywuj aplikację |

### 6.2 Widgety

| Funkcja | Opis |
|---------|------|
| `widget_create` | Utwórz widget |
| `widget_update` | Zaktualizuj widget |
| `widget_remove` | Usuń widget |
| `widget_list` | Lista widgetów |

### 6.3 Notatki

| Funkcja | Opis |
|---------|------|
| `note_create` | Utwórz notatkę |
| `note_read` | Czytaj notatkę |
| `note_update` | Aktualizuj notatkę |
| `note_delete` | Usuń notatkę |
| `note_search` | Szukaj w notatkach |

### 6.4 Zadania

| Funkcja | Opis |
|---------|------|
| `task_create` | Utwórz zadanie |
| `task_complete` | Oznacz wykonane |
| `task_list` | Lista zadań |
| `task_remove` | Usuń zadanie |

### 6.5 Ustawienia

| Funkcja | Opis |
|---------|------|
| `settings_get` | Pobierz ustawienie |
| `settings_set` | Ustaw ustawienie |
| `theme_get` | Pobierz motyw |
| `theme_set` | Ustaw motyw |

---

## 7. Narzędzia — Stan implementacji

### 7.1 Istniejące

| Narzędzie | Implementacja | Stan |
|-----------|---------------|------|
| Browser | `integrations/browser/` | ✓ Działa |
| Filesystem | `bridge/filesystem.py` | ✓ Działa |
| Terminal | `bridge/terminal.py` | ✓ Działa |
| Jarvis apps | `js/commands.js` | ✓ Działa |
| Jarvis widgets | `js/widgets.js` | ✓ Działa |
| Jarvis notes | `js/notes.js` | ✓ Działa |
| Jarvis tasks | `js/tasks.js` | ✓ Działa |

### 7.2 Czego brakuje

| Narzędzie | Stan | Uwagi |
|-----------|------|-------|
| OS window management | ⚠️ Częściowe | Tylko przez Bridge |
| Process management | ❌ Brak | Brak narzędzi systemowych |
| WebSocket | ❌ Brak | Tylko HTTP |
| Background processes | ❌ Brak | Brak obsługi |

### 7.3 Rekomendacja

1. ✓ Zachować istniejące narzędzia
2. ✓ Dodać OS process management
3. ✓ Dodać WebSocket support
4. ✓ Dodać background process handling
