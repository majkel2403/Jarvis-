# AUTONOMY — Poziomy autonomii agenta

## Definicja

Poziom autonomii określa, ile agent może zrobić samodzielnie zanim zapyta użytkownika o zgodę.

---

## Poziomy autonomii

```
┌─────────────────────────────────────────────────────────┐
│  POZIOM 0  │  Doradca                                 │
│             │  Agent tylko doradza, nie działa         │
├─────────────┼─────────────────────────────────────────┤
│  POZIOM 1  │  Proponujący                             │
│             │  Proponuje akcję, czeka na zatwierdzenie│
├─────────────┼─────────────────────────────────────────┤
│  POZIOM 2  │  Wykonawca bezpiecznych akcji           │
│             │  Wykonuje bezpieczne akcje samodzielnie  │
├─────────────┼─────────────────────────────────────────┤
│  POZIOM 3  │  Wykonawca zadania                       │
│             │  Wykonuje całe zadanie krok po kroku    │
├─────────────┼─────────────────────────────────────────┤
│  POZIOM 4  │  Planista                               │
│             │  Planuje, wykonuje, obserwuje, koryguje │
├─────────────┼─────────────────────────────────────────┤
│  POZIOM 5  │  Pasywna autonomia                       │
│             │  Obserwuje, wykrywa, decyduje, działa   │
└─────────────────────────────────────────────────────────┘
```

---

## Poziom 0 — Doradca (Adviser)

Agent tylko analizuje i doradza, nie wykonuje żadnych akcji.

### Zachowanie

```
User: "Powiedz mi coś o BTC"
  ↓
JEV: "Bitcoin kosztuje $43,000. To jest +2% w ciągu 24h."
  ↓
(Działanie: BRAK - tylko odpowiedź)
```

### Zastosowanie

- Pierwsze uruchomienie
- Nieznane polecenia
- Działania o wysokim ryzyku
- Tryb nauki

### Konfiguracja

```
autonomy.level = 0
autonomy.askForEverything = true
```

---

## Poziom 1 — Proponujący (Proposer)

Agent analizuje, proponuje akcję i czeka na potwierdzenie.

### Zachowanie

```
User: "Otwórz kalkulator"
  ↓
JEV: "Otworzę kalkulator. Zgadzasz się?"
  ↓
User: "Tak"
  ↓
HERMES: open_app("calc")
```

### Zastosowanie

- Nieznane akcje
- Akcje z umiarkowanym ryzykiem
- Nowi użytkownicy

### Konfiguracja

```
autonomy.level = 1
autonomy.confirmActions = true
autonomy.confirmThreshold = "medium"
```

---

## Poziom 2 — Wykonawca bezpiecznych akcji (Safe Executor)

Agent sam wykonuje bezpieczne akcje (A3), pyta o pozostałe.

### Zachowanie

```
User: "Jaka jest pogoda?"
  ↓
JEV: (A3 - bez pytania)
  ↓
HERMES: get_weather() → "Pogoda: 15°C, słonecznie"
  ↓
---
User: "Stwórz notatkę"
  ↓
JEV: (A2 - z "Cofnij")
  ↓
HERMES: create_note() → "Notatka utworzona"
  ↓
(User może cofnąć w ciągu 10 minut)
```

### Zastosowanie

- Codzienna praca
- Znane akcje
- Odwracalne operacje

### Akcje wykonywane bez pytania (A3)

Z `jev-policy.js`:
- `open_app`, `wm_focus`, `wm_minimize`, `wm_arrange`
- `notes_list`, `notes_read`, `notes_search`
- `tasks_list`, `get_datetime`, `get_weather`, `get_crypto_prices`
- `widgets_list`, `memory_recall`, `files_list`, `files_read`
- `set_theme`, `set_wallpaper`, `focus_mode`, `speak`

### Konfiguracja

```
autonomy.level = 2
autonomy.executeA3 = true
autonomy.confirmA2 = true
autonomy.confirmA1 = true
autonomy.confirmA0 = true
```

---

## Poziom 3 — Wykonawca zadania (Task Executor)

Agent wykonuje całe zadanie samodzielnie, wybierając kolejne akcje.

### Zachowanie

```
User: "Przygotuj raport z notatek"
  ↓
JEV: 
  1. Pobierz wszystkie notatki
  2. Przeanalizuj treść
  3. Utwórz nową notatkę z podsumowaniem
  4. Pokaż wynik
  ↓
HERMES: (wykonuje sekwencję)
  → notes_list()
  → notes_read(id1)
  → notes_read(id2)
  → create_note({title: "Raport", content: "..."})
```

### Zastosowanie

- Złożone zadania
- Znany cel, nieznana ścieżka
- Zadania wymagające wielu kroków

### Konfiguracja

```
autonomy.level = 3
autonomy.executeMultiStep = true
autonomy.maxSteps = 20
autonomy.verifyEachStep = true
```

---

## Poziom 4 — Planista (Planner)

Agent planuje, wykonuje, obserwuje i koryguje.

### Zachowanie

```
User: "Zbadaj temat AI i przygotuj prezentację"
  ↓
JEV: PLANNING
  → research("AI trends 2024")
  → plan = [search, read, summarize, create_slides]
  ↓
HERMES: EXECUTE
  → step 1: search
  → OBSERVE: check results
  → step 2: read top 5 articles
  → OBSERVE: check understanding
  → step 3: summarize
  → OBSERVE: check quality
  → step 4: create slides
  ↓
VERIFICATION
  → Check slides created
  → If failed: REPLAN and retry
  → If success: DONE
```

### Elementy

- **Planowanie** — tworzenie sekwencji kroków
- **Wykonywanie** — realizacja kroków
- **Obserwacja** — sprawdzanie wyników
- **Korygowanie** — zmiana planu przy błędach

### Konfiguracja

```
autonomy.level = 4
autonomy.planAndExecute = true
autonomy.selfCorrect = true
autonomy.maxRetries = 3
```

---

## Poziom 5 — Pasywna autonomia (Passive Autonomy)

Agent obserwuje środowisko, wykrywa zdarzenia, podejmuje decyzje.

### Zachowanie

```
BACKGROUND OBSERVATION
  ↓
DETECT: "Użytkownik otworzył plik PDF"
  ↓
DECIDE: "To może być interesujące - zaproponuj podobne"
  ↓
ACTION: "Widzę że otworzyłeś raport. Mogę znaleźć podobne?"
  ↓
---
DETECT: "Cena BTC spadła o 5%"
  ↓
DECIDE: "To znaczący spadek - powiadom użytkownika"
  ↓
ACTION: notification({ title: "Alert BTC", body: "Spadek 5%" })
```

### Zastosowanie

- Monitoring
- Proaktywne powiadomienia
- Sugestie kontekstowe

### Konfiguracja

```
autonomy.level = 5
autonomy.passiveMode = true
autonomy.detectPatterns = true
autonomy.suggestActions = true
```

---

## Mapowanie na istniejący system

### Obecne poziomy (A0-A3 z jev-policy.js)

| Poziom w specyfikacji | Odpowiednik w systemie | Opis |
|----------------------|----------------------|------|
| 0 | tryb "ask" | Zawsze pyta |
| 1 | — | Proponuje |
| 2 | A3 + A2 | Bezpieczne sam, inne z pytaniem |
| 3 | A2 (z cofnięciem) | Całe zadanie z undo |
| 4 | — | Planista z weryfikacją |
| 5 | tryb "proactive" | Pasywna autonomia |

### Konfiguracja w settings

```javascript
{
  "jevAutonomy": "auto",  // "auto" | "reads" | "ask"
  "jevProactive": false,   // Poziom 5: proaktywne sugestie
  "jevConfirmDestructive": true  // Zawsze pytaj o niebezpieczne
}
```

---

## Decyzje wymagające zgody

### Zawsze pyta (A0)

- Usunięcie plików
- Zamknięcie wszystkich okien
- Wykonanie poleceń terminala (niebezpiecznych)
- Zmiana ustawień systemowych
- Wysłanie danych zewnętrznych
- Zakupy, płatności
- Logowanie do kont

### Pyta przy niskiej pewności

- Niejasne polecenia
- Wiele możliwych interpretacji
- Brak kontekstu

### Wykonuje sam (A3)

- Odczyt danych
- Nawigacja (otwieranie aplikacji)
- Wyświetlanie informacji
- Proste operacje (minutnik, notatka)

---

## Bezpieczeństwo

### Reguły niezmienne

1. **Nigdy nie wykonuje nieznanych poleceń terminala**
2. **Nigdy nie wysyła danych bez zgody**
3. **Nigdy nie loguje się gdziekolwiek bez wyraźnej zgody**
4. **Zawsze oferuje "Cofnij" dla operacji modyfikujących**
5. **Zawsze pokazuje co zrobił i dlaczego**

### Limit autonomii

```
MAX_AUTONOMY = {
  fileDelete: "confirm",      // zawsze pytaj
  terminal: "confirm",        // zawsze pytaj  
  network: "confirm",         // zawsze pytaj
  system: "confirm",          // zawsze pytaj
  create: "auto",             // sam tworzy
  read: "auto",               // sam czyta
  navigate: "auto"            // sam nawiguje
}
```

---

## Interfejs użytkownika

### Kontrola poziomu

Użytkownik może w każdej chwili zmienić poziom:

```
Ustawienia → Agent → Poziom autonomii
├── Poziom 0: Tylko doradza
├── Poziom 1: Pyta przed każdą akcją
├── Poziom 2: Wykonuje bezpieczne sam
├── Poziom 3: Wykonuje całe zadania
├── Poziom 4: Planuje i koryguje
└── Poziom 5: Proaktywny
```

### Nadzór

Process Log pokazuje wszystkie akcje agenta:

```
[12:30] ANALIZUJĘ: "Otwórz kalkulator"
[12:30] DECYZJA: Poziom A3 - wykonuję sam
[12:30] WYKONUJĘ: open_app("calc")
[12:30] SUKCES: Kalkulator otwarty
```

### Override

Użytkownik może w każdej chwili:

- Zatrzymać agenta ("Stop")
- Cofnąć ostatnią akcję ("Cofnij")
- Zmienić poziom ("Zawsze pytaj")
