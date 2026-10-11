# Porządki w repozytoriach — grupowanie commitów i skan sekretów

Warianty wykonania dla §14 SKILL.md. Zasada: **osobna gałąź, grupy tematyczne, zero pusha, usuwanie na końcu**.

## 1. Skrypt grupowych commitów (Python, nie bash)

Bashowa funkcja z regexem pada w MSYS na cytowaniu; Python daje czytelny błąd i pozwala przerwać przed commitem.

```python
import subprocess, re
R = r"C:\Users\majke\Desktop\jarvis-"

def git(*a, check=True):
    r = subprocess.run(["git", "-C", R, *a], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        print("BŁĄD:", a, r.stderr[:300]); raise SystemExit(1)
    return r.stdout

WZORY = [
    ("prywatny klucz", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY")),
    ("sk-",            re.compile(r"\bsk-[A-Za-z0-9]{20,}")),
    ("bot token",      re.compile(r"\bbot\d{8,}:[A-Za-z0-9_-]{30,}")),
    ("api key literal",re.compile(r"(?i)api[_-]?key\s*[:=]\s*[\"'][A-Za-z0-9_\-]{20,}")),
    ("haslo literalne",re.compile(r"(?i)(password|haslo|hasło)\s*[:=]\s*[\"'][^\"']{6,}")),
    ("klucz b58",      re.compile(r"\b[1-9A-HJ-NP-Za-km-z]{80,90}\b")),
]

def skan():
    d = git("diff", "--cached")
    traf = [f"{n}: {len(rx.findall(d))}" for n, rx in WZORY if rx.search(d)]
    print("   skan sekretów:", ", ".join(traf) if traf else "czysto")
    return not traf

GRUPY = [
    ("A: pulpit i filmy", ["index.html", "sw.js", "js/", "css/", "tests/"],
     "feat(pulpit): …"),
    ("B: most", ["bridge/"], "feat(most): …"),
]

git("reset")
for nazwa, sciezki, msg in GRUPY:
    git("add", "--", *sciezki)
    print(nazwa, len(git("diff", "--cached", "--name-only").split()))
    if not skan():
        print("PRZERWANE — sekret w stage"); break
    subprocess.run(["git", "-C", R, "commit", "-q", "-m", msg], check=True)
```

Reguły, które ten skrypt realizuje:

- `git reset` na starcie czyści stage — reszta z przerwanego przebiegu nie wejdzie do cudzego commita.
- Skan **przed** commitem, nie po; przy trafieniu przerywamy i pokazujemy plik, nie „naprawiamy” historii commitem odwrotnym.
- Świadome `git add -- <ścieżka>` na grupę, nigdy `git add -A` (wciągnie logi, cache, pliki tymczasowe).
- Nie pushujemy i nie dotykamy `main` — po pracy `git log --oneline main..HEAD` ma pokazać N commitów, a `git status --porcelain` być puste.

## 2. Jak dzielić grupy

| Grupa | Co wchodzi | Uwaga |
|---|---|---|
| pulpit / kod strony | `index.html`, `js/`, `css/`, `sw.js`, `tests/` | najbezpieczniejszy commit, rób pierwszy |
| most i usługi | `bridge/` | nowe trasy mostu opisuj w treści commita |
| dokumentacja | `docs/` | pliki `docs/spec/katalog-*` są **generowane** (`node tools/gen-spec.js`) — commituj razem z kodem, który je zmienił |
| profil / skrypty | `hermes/scripts/`, `hermes/skills/`, `hermes/plugins/` | największa grupa; dziel na podtematy |
| integracje | `integrations/` | sprawdź, czy w diffie nie ma literalnych kluczy |

## 3. Repozytorium bez historii

Gdy `git log` mówi „does not have any commits yet":

1. `git checkout -b auto/porzadki-<data>` — gałąź „unborn”, zmiany idą z Tobą.
2. Dopisz `.gitignore` **przed** pierwszym `git add`: duże katalogi pomiarowe (`obsidian-graph*`, `preview/`, `bench-*`, `learning/`, `raport-pdf/`, `*.pdf`, `__pycache__/`) — inaczej pierwszy commit wciąga setki MB.
3. Commituj świadomie wybrane: `git add -- .gitignore <dokumenty> <katalog roboczy>`.
4. W raporcie napisz, co zostało poza wersjonowaniem i ile to waży (`du -sh`).

## 4. Czego nie robić

- Nie usuwać plików ani gałęzi „przy okazji” porządków — usuwanie to osobny etap, na końcu i po zgodzie.
- Nie force-pushować i nie kasować gałęzi, na której pracował ktoś inny (sprawdź `git branch -a` i commity ponad `main`).
- Nie poprawiać już opublikowanej historii (`git commit --amend`, `rebase -i`) — na gałęzi lokalnej wystarczy kolejny commit, a cofnięcie to powrót na `main`.
