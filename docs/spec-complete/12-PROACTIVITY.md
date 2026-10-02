# PROACTIVITY & PRIORITIZATION — Proaktywność i priorytetyzacja

---

## 1. Proaktywność — kiedy Jarvis działa sam

### 1.1 Model proaktywności

```
                    ┌──────────────────┐
                    │   EVENT occurs   │
                    └────────┬─────────┘
                             ▼
              ┌────────────────────────┐
              │  ANALYZE importance    │
              │  • urgency             │
              │  • context clarity    │
              │  • user availability   │
              └────────┬───────────────┘
                       ▼
         ┌────────────────────────────┐
         │     CRITICAL?              │
         └────────────┬───────────────┘
                      │
         YES          │          NO
          ▼            │            ▼
    ┌─────────┐       │     ┌────────────────┐
    │ ACT NOW │       │     │  NOTIFY USER   │
    └─────────┘       │     │  "Zauważyłem X"│
                      │     └────────────────┘
                      │            │
                      │           MAYBE
                      │            │
                      ▼            ▼
              ┌────────────────────────┐
              │   USER RESPONDS?      │
              └────────┬───────────────┘
                       │
             YES       │       NO
              ▼        │        ▼
        ┌─────────┐   │   ┌──────────────┐
        │ EXECUTE │   │   │ WAIT / SKIP  │
        └─────────┘   │   └──────────────┘
```

### 1.2 Poziomy ważności

| Poziom | Opis | Przykłady | Reakcja |
|--------|------|-----------|---------|
| **CRITICAL** | Zagrożenie, błąd krytyczny | Krach, włamanie, utrata danych | ACT - napraw natychmiast |
| **HIGH** | Ważne, wymaga uwagi | Zadanie z deadline, alert | NOTIFY - poinformuj |
| **MEDIUM** | Warte uwagi | Okazja, zmiana | SUGGEST - zaproponuj |
| **LOW** | Może poczekać | Informacja, ciekawostka | SKIP - zapisz na później |

---

## 2. Priorytetyzacja zadań

### 2.1 Kryteria oceny

```
Priority Score = {
  urgency:      0-10,  // jak pilne (deadline, czas)
  importance:   0-10,  // jak ważne (wartość, konsekwencje)
  risk:        0-10,  // ryzyko niewykonania
  deadline:    0-10,  // jak blisko deadline
  userPriority: 0-10, // priorytet użytkownika
  dependencies: 0-10  // ile zależy od tego
}
```

### 2.2 Formuła

```
finalPriority = (urgency * 0.3) + (importance * 0.2) + (risk * 0.2) + 
                (deadline * 0.15) + (userPriority * 0.1) + (dependencies * 0.05)
```

### 2.3 Kolejność wykonania

```
Priority Queue:
1. CRITICAL (90-100)     → Wykonaj natychmiast
2. HIGH (70-89)         → W ciągu minuty
3. MEDIUM (40-69)       → W ciągu 10 minut
4. LOW (0-39)           → Gdy zasoby dostępne
5. BACKGROUND           → Gdy nic innego
```

---

## 3. Konflikty zadań

### 3.1 Wykrywanie konfliktu

```
Conflict Detection:
├── Zadanie A potrzebuje zasób R
├── Zadanie B modyfikuje zasób R
└── CONFLICT: simultaneous access
```

### 3.2 Strategie rozwiązywania

| Strategia | Kiedy stosować | Akcja |
|-----------|----------------|-------|
| **WAIT** | Niskie priorytety | Zadanie B czeka na A |
| **QUEUE** | Ten sam plik | Sekwencyjnie |
| **COPY** | Oba modyfikują | Kopia dla B |
| **MERGE** | Git-like | Spróbuj scalić |
| **ASK** | Konflikt semantyczny | Zapytaj użytkownika |
| **ABORT** | Nierozwiązywalny | Anuluj B |

### 3.3 Przykład

```
Zadanie A: "Edytuj raport.txt"
Zadanie B: "Usuń raport.txt"

System: "Zadanie B wymaga usunięcia pliku, który jest edytowany 
         przez Zadanie A. Co robić?"
         
Opcje:
├── Poczekać na zakończenie A
├── Anulować B
└── Spytać użytkownika
```

---

## 4. Resource Manager

### 4.1 Zasoby systemowe

```
Resources = {
  cpu:     { used: %, limit: % },
  gpu:     { used: %, limit: % },
  memory:  { used: MB, limit: MB },
  network: { used: MB/s, limit: MB/s },
  tokens:  { used: $, limit: $ },
  agents:  { active: N, max: N }
}
```

### 4.2 Zarządzanie zasobami

```
Resource Allocation:
├── Zadanie potrzebuje X zasobów
├── Sprawdź dostępność
├── Jeśli dostępne → przydziel
├── Jeśli limit bliski → queue
├── Jeśli przekroczony → reject z informacją
└── Po zakończeniu → zwolnij
```

### 4.3 Przykład

```
Request: Uruchom 3 agentów
Current: 2 agentów, GPU 80%

Decisions:
├── Agent 3: GPU 90% → QUEUE
├── Sprawdź czy Agent 1 może zwolnić
└── Powiadom: "Oczekiwanie na zasoby GPU"
```

---

## 5. AI Budget

### 5.1 Budżet

```
AI Budget = {
  daily:     { spent: $, limit: $ },
  weekly:    { spent: $, limit: $ },
  monthly:   { spent: $, limit: $ },
  perTask:   { spent: $, limit: $ }
}
```

### 5.2 Routing modeli

```
Model Selection:
├── Quality:   gpt-4, claude
├── Speed:     gpt-4o-mini, haiku
└── Cost:      $$$

Budget-aware routing:
├── Budżet wysoki → wybierz najlepszy
├── Budżet niski → wybierz tańszy
├── Budżet przekroczony → queue lub ask
└── Historia: ucz się z wzorców
```

### 5.3 Trzy parametry

```
Task Requirements:
├── Quality > Speed > Cost:   Research, code review
├── Speed > Quality > Cost:   Quick lookup, simple task
├── Speed > Cost > Quality:   Batch processing
└── Cost > Speed > Quality:   Background tasks
```

---

## 6. Latency Budget

### 6.1 Poziomy czasowe

| Poziom | Maksymalny czas | Przykłady |
|--------|-----------------|-----------|
| **INSTANT** | < 100ms | Odczyt, nawigacja |
| **FAST** | < 1s | Proste operacje |
| **NORMAL** | < 3s | Większość zadań |
| **DEEP** | < 30s | Analiza, research |
| **LONG** | minuty | Budowanie, deployment |

### 6.2 Wybór strategii

```
Task: "Wykonaj X"
  ↓
Estimation:
├── complexity: medium
├── estimatedTime: 2-5s
└── requiredLatency: NORMAL
  ↓
Selection:
├── jeśli NORMAL → standardowe wykonanie
├── jeśli INSTANT → cache, local
├── jeśli LONG → background z notify
└── jeśli przekroczy → ask user
```

---

## 7. Task Estimation

### 7.1 Estymacja przed wykonaniem

```
Before execution show:
├── "Szacowany czas: 2-4 minuty"
├── "Zużycie AI: średnie"
├── "Wymagana zgoda: nie"
└── "Koszt: $0.02"
```

### 7.2 Co jest estymowane

| Metryka | Opis |
|---------|------|
| **Time** | Czas wykonania |
| **Tokens** | Zużycie tokenów |
| **Cost** | Koszt monetary |
| **Confidence** | Pewność estymacji |
| **Steps** | Liczba kroków |

### 7.3 Jak estymować

```
Estimation = {
  historicalData: similar_tasks,
  complexity: task_analysis,
  resources: current_load,
  model: selected_model
}
```

---

## 8. Dry Run & Simulation

### 8.1 Poziomy symulacji

| Poziom | Opis | Przykład |
|--------|------|----------|
| **PREVIEW** | Co zrobię | "Otworzę plik X" |
| **DRY RUN** | Pokaż plan | "1. Otwórz 2. Przeczytaj 3. Zapisz" |
| **SIMULATION** | Symuluj efekt | Znaleziono 43 pliki... |
| **EXECUTE** | Wykonaj | Wykonanie |

### 8.2 Dry Run

```
User: "Usuń stare pliki"
  ↓
JEV: Dry Run
  ↓
PRZED WYKONANIEM:
├── Znalazłem 43 pliki starsze niż 30 dni.
├── 37 kwalifikuje się do usunięcia.
├── 6 wymaga dodatkowej weryfikacji.
├── Szacowany czas: 2 minuty.
└── "Wykonuję?"
```

### 8.3 Simulation

```
User: "Przenieś projekt na serwer"
  ↓
SIMULATION:
├── Kopia lokalna: ✓
├── Budowanie: ✓ (3 min)
├── Testy: ✓ (2 min)
├── Package: ✓
├── Upload: ~5 min
├── Deploy: ~2 min
└── Sprawdź: ✓
```
