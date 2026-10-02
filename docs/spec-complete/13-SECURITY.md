# SECURITY & ACCOUNTS — Bezpieczeństwo i konta

---

## 1. Secrets Vault

### 1.1 Architektura

```
┌─────────────────────────────────────┐
│           VAULT                      │
│  ┌─────────────────────────────┐    │
│  │  Secrets (encrypted)        │    │
│  │  • API Keys                │    │
│  │  • Passwords               │    │
│  │  • Tokens                  │    │
│  │  • SSH Keys                │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │  Access Control            │    │
│  │  • Role-based              │    │
│  │  • Per-secret permissions  │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 1.2 Zasady bezpieczeństwa

```
Security Rules:
├── Jarvis NIE WIDZI sekretów w plaintext
├── Jarvis ma dostęp DO UPRAWNIENIA
├── Sekrety są szyfrowane lokalnie
├── Każde użycie jest logowane
└── Sekrety wygasają (TTL)
```

### 1.3 Przykład użycia

```
User: "Wyślij na GitHub"
  ↓
Jarvis: (używa uprawnienia 'github_push')
  ↓
System: Wykonuje z dostępem bez podawania hasła
  ↓
Log: "github_push użyte przez Jarvis dla repo X"
```

---

## 2. Identity & Accounts

### 2.1 Konta użytkownika

```
User Accounts:
├── GitHub
├── Google
├── Microsoft
├── Slack
├── Discord
├── AWS
├── Custom APIs
└── ...
```

### 2.2 Uprawnienia

```
Account → Permissions → Tools → Agents

GitHub
├── read:repo
├── write:repo
├── create:pr
└── create:issue

Slack
├── read:channel
├── write:channel
└── send:message
```

### 2.3 Zarządzanie kontami

```
Account Management:
├── Dodaj konto (OAuth)
├── Usuń konto
├── Odśwież token
├── Sprawdź uprawnienia
└── Logowanie konta
```

---

## 3. Multi-user (przyszłościowo)

### 3.1 Profile

```
System Users:
├── Owner (pełne uprawnienia)
├── Admin (zarządzanie)
├── Editor (projekty)
└── Viewer (tylko odczyt)
```

### 3.2 Projekty

```
Projects:
├── Public (wszyscy widzą)
├── Shared (wybrani)
├── Private (tylko właściciel)
└── Shared with: [users]
```

### 3.3 Role

```
Roles:
├── Owner: pełne zarządzanie
├── Admin: użytkownicy, ustawienia
├── Editor: tworzenie, edycja
├── Viewer: tylko odczyt
└── Guest: ograniczony dostęp
```

---

## 4. Audit Trail

### 4.1 Struktura logu

```
Audit Entry = {
  timestamp: Date,
  user: User,
  action: String,
  resource: String,
  result: "success" | "failure",
  details: Object,
  reasoning: String  // "Dlaczego"
}
```

### 4.2 Przykłady

```
[2026-10-02 12:30:15]
User: michal
Action: file.delete
Resource: /project/old.txt
Result: success
Reasoning: "Usunięto plik starszy niż 90 dni"

[2026-10-02 12:31:00]
User: jarvis
Action: ai.decision
Decision: "Użyto modelu gpt-4 zamiast gpt-4o-mini"
Reasoning: "Zadanie wymaga wysokiej jakości"
```

### 4.3 Dostęp

```
Audit Access:
├── Owner: pełny dostęp
├── Admin: przeglądanie
├── Editor: własne akcje
└── Viewer: brak
```

---

## 5. Disaster Recovery

### 5.1 Strategie

```
Recovery Options:
├── Automatic Backup (co 24h)
├── Manual Snapshot (na żądanie)
├── Version History (30 dni)
├── Rollback (dowolny punkt)
└── Export/Import (pełny)
```

### 5.2 Co jest backupowane

```
Backup includes:
├── Ustawienia systemu
├── Konta i uprawnienia
├── Projekty i pliki
├── Notatki i zadania
├── Automatyzacje
├── Pamięć (long-term)
└── Konfiguracja
```

### 5.3 Recovery procedura

```
Recovery Flow:
1. Wykryj problem
2. Oceniaj krytyczność
3. Automatyczny rollback LUB
4. Zaproponuj opcje
5. Wykonaj restore
6. Zweryfikuj działanie
```

---

## 6. Versioning

### 6.1 Wersjonowane elementy

```
Versioned:
├── Projekty (git-like)
├── Konfiguracje
├── Automatyzacje
├── Workflow
├── Widgety
├── Agenty
└── Ustawienia
```

### 6.2 Strategia wersjonowania

```
Version Control:
├── Automatyczne snapshoty
├── Manual commits z opisem
├── Diff między wersjami
├── Rollback do dowolnej wersji
├── Branch dla eksperymentów
└── Merge zmian
```

---

## 7. Plugin Marketplace (przyszłościowo)

### 7.1 Struktura pluginu

```
Plugin = {
  name: String,
  version: String,
  author: String,
  
  capabilities: [String],
  permissions: [String],
  dataAccess: [String],
  
  install: Function,
  uninstall: Function,
  config: Object
}
```

### 7.2 Permission declarations

```
Plugin Permissions:
├── Browser: read | write
├── Files: read | write | delete
├── Network: read | write
├── System: read | write
├── AI: use | manage
└── Storage: read | write
```

### 7.3 Security

```
Plugin Security:
├── Sandboxed execution
├── Permission request on install
├── Automatic revocation on abuse
├── Regular security audit
└── User approval for sensitive
```

---

## 8. Graceful Degradation

### 8.1 Zasady

```
Degradation Rules:
├── Jeśli jedna część padnie, reszta działa
├── System nie przestaje działać całkowicie
├── Użytkownik wie co nie działa
├── Automatyczna próba naprawy
└── Fallback do prostszych rozwiązań
```

### 8.2 Przykłady

```
Scenario 1: Hermes off
├── Jarvis działa lokalnie
├── Ograniczone możliwości AI
└── Powiadomienie: "Tryb offline"

Scenario 2: Browser tool fail
├── Terminal i Files działają
└── Powiadomienie: "Browser niedostępny"

Scenario 3: Database corruption
├── In-memory fallback
├── Export danych do pliku
└── Recovery options
```

### 8.3 Health Check

```
System Health:
├── Jarvis core: ✓
├── Hermes: ✓/✗
├── Browser: ✓/✗
├── Filesystem: ✓/✗
├── Memory: ✓/✗
├── Audio: ✓/✗
└── GPU: ✓/✗
```
