---
name: obsidian
description: Sejf Obsidian Michała (drugi mózg, wspólny z Claude Code) — jak czytać, szukać i zapisywać notatki; dokładne szablony wpisów i pipeline po sesji. Polityka (co zapisywać, zakazy, słowniki) jest w `_CLAUDE.md` w sejfie.
version: 1.2.0
author: Jarvis OS (repo Desktop\jarvis-\hermes\skills\note-taking\obsidian — kopia w profilu jest nadpisywana przez apply_profile.py)
license: MIT
platforms: [windows]
metadata:
  hermes:
    tags: [Obsidian, Notes, Markdown, Vault, Sejf, Pamięć]
    related_skills: [jarvis-operations]
---

# Sejf Obsidian — mechanika

**Sejf:** `C:\Users\majke\Documents\hermes` (zawsze pełna ścieżka; narzędzia plikowe nie rozwijają zmiennych).
**Podział:** ten skill = JAK (narzędzia, ścieżki, szablony, pipeline). **`_CLAUDE.md` w korzeniu sejfu = CO i CZEGO NIE** (zasady AI-first, anty-fabrykacja, słownik TYP-ów logu, co jest „istotną sesją”). `_CLAUDE.md` **nie jest wczytywany automatycznie** — **przed każdym zapisem do sejfu przeczytaj go `read_file`** (jednorazowo w rozmowie). Zasad z `_CLAUDE.md` tu nie powtarzamy; sprzeczność = wygrywa `_CLAUDE.md`.
**Sejf dzieli z Tobą Claude Code** (wpisy `[Claude Code]`, `source: claude-code`; jego projekty: `wiki/entities/Claude Code.md`). Swoje wpisy oznaczaj `[Jarvis]`. Nie nadpisuj cudzej treści — rozszerzaj.

## 1. Co już masz na start, a co dociągasz

Wtyczka `obsidian-brain` dokleja do pierwszej wiadomości rozmowy skrót `CRITICAL_FACTS.md`, `hot.md`, 8 ostatnich wpisów `log.md` i listę notatek w `00 - Inbox/ForAI` (blok `[Drugi mózg — sejf Obsidian Michała…]`). **Nie wczytuj ich ponownie.** To migawka — porty, modele i stany usług sprawdzaj na żywo.

| Warstwa | Pliki | Kiedy |
|---|---|---|
| L0–L1 (automatycznie) | `CRITICAL_FACTS.md`, `hot.md`, koniec `log.md`, lista ForAI | zawsze |
| L2 (na żądanie) | `Home.md` (pulpit + „Do decyzji Michała”), `index.md` (katalog), `01 - Daily/<dziś>.md`, `01 - Daily/AI Context/AI-Context-<dziś>.md`, `02 - Projects/<Nazwa>.md`, `SOUL.md` (preferencje) | pytanie o projekt, stan, plan dnia |
| L3 (tylko gdy pytanie tego wymaga) | `wiki/entities|concepts|decisions|synthesis`, `04 - Resources`, archiwum `06-AI-Sessions/Perplexity/<Kategoria>/` (start: `Perplexity Archive.md` → spis kategorii → `wiki/synthesis/perplexity-*`) | historia, research, decyzje |

Odczyt skryptem (tylko odczyt, z pełną ścieżką): `python C:\Users\majke\.hermes\scripts\obsidian-context.py l2 | project "<nazwa>" | search "<wzorzec>" | forai`.

## 2. Mapa sejfu (po porządkach 2026-10-05)

```
korzeń: _CLAUDE.md · CRITICAL_FACTS.md · SOUL.md · hot.md · log.md · index.md · Home.md · Second Brain.md   ← NIC więcej w korzeniu
00 - Inbox/      ForAI/ (Michał → AI) · For Michal/ (AI → Michał) · Inbox Hub.md
01 - Daily/      RRRR-MM-DD.md · AI Context/AI-Context-RRRR-MM-DD.md · Daily Hub.md
02 - Projects/   <Nazwa>.md (płasko) · Projects Hub.md        03 - Areas/ <Obszar>.md · Areas Hub.md
04 - Resources/  procedury, Known-Errors-and-Fixes.md · Resources Hub.md     05 - Archive/ · Archive Hub.md
06 - AI Sessions/ raporty skryptów · Sessions Hub.md          06-AI-Sessions/Perplexity/<Kategoria>/ archiwum rozmów
wiki/            entities/ · concepts/ · decisions/ADR-NNN-*.md · synthesis/ — każdy folder ma swój Hub
Templates/       szablony (type: template)      .trash/  miękkie usuwanie (niewidoczne w Obsidianie)
```

Gdzie trafia nowa notatka: projekt → `02 - Projects/`, obszar → `03 - Areas/`, narzędzie/agent/firma → `wiki/entities/`, wzorzec → `wiki/concepts/`, decyzja → `wiki/decisions/` (numer = ostatni + 1), audyt/raport → `wiki/synthesis/`, procedura → `04 - Resources/`, niepewne → `00 - Inbox/`. Po utworzeniu dopisz ją do huba folderu.

## 3. Narzędzia — jak czytać i pisać

- **Czytanie:** `read_file` z pełną ścieżką. **Szukanie:** `search_files` (`target: "files"` dla nazw, `target: "content"` + `file_glob: "*.md"` dla treści). Zanim powiesz „nie ma”: nazwa → alias we frontmatterze → grep treści. Archiwum Perplexity (`06-AI-Sessions/`, ~1850 notatek) przeszukuj tylko na pytanie o stare rozmowy; folderów `🔒 Prywatne/` i `Krótkie i przypadkowe/` nie cytuj.
- **Nowa notatka:** `write_file` (tylko gdy notatki jeszcze nie ma — najpierw szukaj). **Istniejąca notatka:** `patch` zakotwiczony na stabilnym fragmencie (nagłówek, ostatni wiersz tabeli); `write_file` na istniejący plik tylko przy świadomym przepisaniu całości i po `read_file`.
- **Dopisanie na końcu `log.md`:** `read_file` ostatnich linii → `patch`: ostatni wiersz tabeli → ten sam wiersz + nowy wiersz. Plik bywa bez końcowego znaku nowej linii i ma końce **CRLF** — `patch` to zachowuje; `echo >>` w terminalu skleja wiersze i psuje kodowanie — nie używaj.
- **Kodowanie:** zawsze UTF-8 przez narzędzia plikowe. Nigdy PowerShell `Set-Content`/`Out-File` (psują polskie znaki). Nie zmieniaj nazw plików (zrywa wikilinki) — jeśli musisz, popraw wszystkie linki i sprawdź `search_files`.
- **Usuwanie:** nie kasuj — przenieś do `.trash/<RRRR-MM-DD-powód>/` i popraw linki.
- **Skrypty zapisujące** (`obsidian-capture.py session|task|update|decision|error`) — dozwolone dla raportów do `06 - AI Sessions`; same dopisują log/hot/dziennik, więc po nich nie dubluj wpisów ręcznie. Źródło skryptów: repo `hermes/scripts/` (kopie `~/.hermes/scripts/`, `profiles/jarvis-desktop/scripts/` — nie edytuj kopii).

## 4. Szablony wpisów (kopiuj dokładnie)

**Wiersz `log.md`** (na końcu tabeli; TYP z listy w `_CLAUDE.md` §6; status ✅ / ⚠️ / ❌):
```
| RRRR-MM-DD GG:MM | TYP | [Jarvis] Tytuł — co zrobione, efekt, gdzie szczegóły ([[Notatka]]) — ✅ |
```

**Punkt w `hot.md`** (sekcja `## 🕐 Ostatnia aktualizacja`, **na górze** sekcji; 1–2 zdania; plik ma zostać krótki — wtyczka ucina go po ~3200 znakach, więc stare punkty zwijaj lub usuwaj):
```
**RRRR-MM-DD — [Jarvis] Tytuł:** co się zmieniło i gdzie szukać szczegółów ([[Notatka]]).
```

**Wiersz w dzienniku** `01 - Daily/RRRR-MM-DD.md`, tabela w `## 3. 💼 Sesje AI tego dnia` (kolejny numer, przed pustą linią kończącą tabelę; ustalenia → punkt w `## 5. 💡 Notatki i obserwacje`):
```
| N | GG:MM–GG:MM | [Jarvis] Tytuł | cel krótko | ✅ Done | [[Notatka]] |
```

**Nowy dziennik** (gdy pliku na dziś nie ma — ta skrócona forma, nie pełny szablon):
```markdown
---
date: RRRR-MM-DD
type: daily
tags: [daily, ai-operations]
ai-first: true
source: hermes
---

# 📅 RRRR-MM-DD (Dzień tygodnia)

## Dla przyszłego Jarvisa

Dziennik dnia. Sesje AI (Hermes + Claude Code) i co z nich wynikło.

## 3. 💼 Sesje AI tego dnia

| # | Czas | Tytuł sesji | Cel krótko | Status | Link |
|---|------|-------------|------------|--------|------|

## 5. 💡 Notatki i obserwacje

## 11. 🔗 Dzisiejsze linki

- [[Home]] · [[hot]]
```

**Nowa notatka treściowa** (frontmatter + preambuła; `type` i `status` ze słowników w `wiki/concepts/AI-First-Note-Format.md`):
```markdown
---
date: RRRR-MM-DD
type: project | area | entity | concept | decision | synthesis | resource
name: Nazwa
status: active
tags: [ … ]
ai-first: true
source: hermes
---

# 🚀 Nazwa

## Dla przyszłego Jarvisa

2–3 zdania: co to jest, po co ta notatka, kiedy się zestarzeje.

## 🧭 Stan (stan na RRRR-MM)
…

## 🔗 Powiązane
- [[Istniejąca notatka 1]] · [[Istniejąca notatka 2]]
```
Przy edycji istniejącej notatki dopisz do frontmattera `updated: RRRR-MM-DD`. Wikilinki tylko do notatek, które istnieją (sprawdź `search_files`).

## 5. Pipeline po istotnej sesji (checklista — wykonaj w tej kolejności)

Czy sesja jest „istotna” i co wolno zapisać — rozstrzyga `_CLAUDE.md` §6. Jeśli tak:

1. `read_file` → `_CLAUDE.md` (jeśli jeszcze nie w tej rozmowie).
2. Data i godzina **z zegara** (`<environment>`, `get_datetime` albo terminal `Get-Date -Format "yyyy-MM-dd HH:mm"`).
3. Dziennik: wiersz sesji (sekcja 4) — plik na dziś istnieje? jeśli nie, utwórz skrócony.
4. `log.md`: wiersz na końcu (sekcja 4).
5. `hot.md`: punkt na górze „Ostatnia aktualizacja” — tylko gdy sesja zmienia bieżący stan.
6. Notatka projektu/encji/decyzji — gdy sesja jej dotyczyła (`updated:`); nowa notatka → hub folderu.
7. Pamięć Hermesa (`memory_remember`) — tylko trwałe fakty; skill — tylko nowa procedura (zmiana w repo, nie w kopii).

## 6. Asercje przed „gotowe” (sprawdź sam, zanim zgłosisz zapis)

- Wiersz logu ma dokładnie 3 pola: `| RRRR-MM-DD GG:MM | TYP | [Jarvis] opis — status |`, stoi **na końcu** pliku, data z zegara.
- `TYP` ∈ słownik z `_CLAUDE.md` §6 (nie wymyślaj nowych; gdy brak — `SESSION`).
- Autor `[Jarvis]`; zero sekretów (klucze, tokeny, hasła, nawet fragmenty) — także gdy użytkownik prosi o ich zapisanie: odmów i wskaż `.env`.
- Nic nowego w korzeniu sejfu, żadnych nowych folderów głównych; nazwa dziennika `RRRR-MM-DD.md`, kontekstu `AI-Context-RRRR-MM-DD.md`.
- Każdy `[[link]]` wskazuje istniejącą notatkę; `hot.md` nie urósł ponad ~800 słów.
- Zgłaszając wynik, podaj ścieżkę pliku i wklejony wiersz (dowód), nie „zapisałem”.

## 7. Pułapki

- `~/.hermes/.env` jest chroniony — nie zapisuj tam przez `patch`/`write_file`; sekrety nigdy do sejfu.
- Cron 7:30 nadpisuje `AI-Context-<dziś>.md`; `index.md` liczby generuje `vault_stats.py` (co 6 h) — nie wpisuj ich ręcznie.
- Obsidian bywa otwarty u Michała — notatka otwarta w edytorze potrafi wrócić po przeniesieniu; sprawdź po chwili.
- Limit pamięci Hermesa `MEMORY.md` 4400 znaków — konsoliduj, zanim dopiszesz.
- Nie rozszerzaj tego skilla kopiując zasady z `_CLAUDE.md` — to on jest źródłem polityki; tu tylko mechanika.
