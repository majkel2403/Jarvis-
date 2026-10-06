# ADR 0010 — Skill `obsidian` z repo pod strażnikiem; polityka sejfu tylko w `_CLAUDE.md`

**Status:** przyjęta 2026-10-06 · **Kontekst:** skill `obsidian` (jak Jarvis czyta i zapisuje sejf Obsidian) żył luzem w profilu
`~/.hermes/profiles/jarvis-desktop/skills/note-taking/obsidian/` — jedyny plik sterujący Hermesa poza repo. 2026-10-06 06:35 Jarvis
nadpisał go sobie narzędziem `skill_manage` (405 → 88 linii), a o 06:40 sam zgłosił, że skillowi „brakuje struktury”, i zaproponował
rozbudowę — z błędnym założeniem, że `_CLAUDE.md` (regulamin sejfu) dostaje automatycznie na start rozmowy. Wtyczka `obsidian-brain`
([ADR 0008](0008-sejf-obsidian-w-kontekscie-hermesa.md)) dokleja tylko `CRITICAL_FACTS`, `hot`, `log` i listę ForAI. Ten sam sejf
zapisuje Claude Code (własny skill `obsidian-brain`), więc zasady były w trzech miejscach i rozjeżdżały się (np. „8 pól wpisu logu”
— wpis ma 3; lista typów logu nie istniała nigdzie).

**Decyzja:**
1. **Jedno źródło polityki:** `_CLAUDE.md` w sejfie — co zapisywać, czego nie, co jest „istotną sesją”, zamknięty słownik TYP-ów
   wpisu `log.md` (16 wartości), autor `[Jarvis]`/`[Claude Code]`/`[Codex]`, data z zegara. Plik mówi wprost, że **nie jest wczytywany
   automatycznie** i trzeba go przeczytać przed zapisem.
2. **Skille = mechanika, bez powielania zasad:** skill Jarvisa `obsidian` 1.2.0 (`hermes/skills/note-taking/obsidian/SKILL.md`,
   ~10 KB) — warstwy L0–L3, mapa folderów, narzędzia (`read_file`/`search_files`/`patch`), dokładne szablony wiersza `log.md`,
   punktu `hot.md`, wiersza dziennika i nowej notatki, pipeline po sesji, asercje przed „gotowe”, pułapki. Pierwsza zasada skilla:
   `read_file` `_CLAUDE.md` przed każdym zapisem. Skill Claude Code dostrojony do tej samej listy typów.
3. **Skill pod kontrolą repo:** `apply_profile.py` (`REPO_SKILLS`) kopiuje go do profilu i `~/.hermes/skills`; `config_guard.py`
   zgłasza każdą różnicę kopii od repo oraz brak słownika TYP-ów w `_CLAUDE.md`; `HERMES.md` mówi Jarvisowi, żeby skilli nie zmieniał
   `skill_manage`. Testy: `hermes/tests/test_obsidian_skill.py` (frontmatter, odsyłacz do polityki, szablony, brak sekretów, limit
   12 KB, kopiowanie idempotentne).

**Konsekwencje:** zmiana zasad = jedna edycja w `_CLAUDE.md`; zmiana mechaniki = commit w repo + `apply_profile.py`. Jarvis nie może
już „po cichu” odchudzić własnej instrukcji — strażnik (cron, Telegram) to zgłosi. Koszt: skill ~10 KB trafia do kontekstu tylko po
załadowaniu (nie w każdej turze). Kopie obu wersji skilla z 2026-10-06 (pełna z 05.10 i odchudzona Jarvisa): `~/.hermes/backups/obsidian-skill-2026-10-06/`.
Testy na żywo 2026-10-06 (9 rozmów z Jarvisem przez most `/bridge/v1`, po restarcie gatewaya): odpowiedź z wstawki sejfu bez narzędzi;
pełny pipeline zapisu (skill → `_CLAUDE.md` → godzina z `date` → dziennik, wiersz na końcu `log.md`, punkt w `hot.md`, nowa notatka + hub);
odmowa zapisania klucza API; nowa notatka w `00 - Inbox`, nie w korzeniu; odczyt notatki projektu zamiast zgadywania; wersja 1.2.0 i źródło
w repo; nieznany TYP odrzucony (uwaga: wybrał `FIX`, trafniejszy byłby `AUDIT`); godzina wpisu zgodna z zegarem co do minuty; Jarvis wie,
że `_CLAUDE.md` nie przychodzi automatycznie. Przy okazji: wiersz `DAILY-CONTEXT` crona 7:30 dostał status `— ✅` (format §6).
