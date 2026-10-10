"""Raport tygodniowy autonomii (budzet 0, bez modelu).

Podsumowuje 7 dni: raporty nocy, alerty straznika, testy, git, backlog.
Zapisuje AUTO/raporty/tydzien-RRRR-WW.md i wypisuje skrot (Telegram).
Gdy AUTO/STOP istnieje — milczy.
"""
import glob
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

HOME = Path.home()
AUTO = HOME / "JarvisWorkspace" / "AUTO"
REPO = HOME / "Desktop" / "jarvis-"
RAP = AUTO / "raporty"
rok, tydz, _ = time.localtime().tm_year, time.strftime("%V"), time.strftime("%Y-%m-%d")
prog = time.time() - 7 * 86400


def git(*a):
    try:
        r = subprocess.run(["git", "-C", str(REPO), *a], capture_output=True, text=True,
                           errors="replace", timeout=60)
        return (r.stdout or "").strip()
    except Exception as e:
        return f"(blad git: {e})"


def main():
    if (AUTO / "STOP").exists():
        return 0
    linie = []
    raporty = sorted(glob.glob(str(RAP / "*.md")))
    swieze = [p for p in raporty if Path(p).stat().st_mtime >= prog
              and not Path(p).name.startswith("tydzien-")]
    linie.append(f"Raporty nocy w tym tygodniu: {len(swieze)}")
    for p in swieze[-7:]:
        linie.append(f"  - {Path(p).name}")

    st = {}
    try:
        st = json.loads((AUTO / ".patrol_state.json").read_text(encoding="utf-8"))
    except Exception:
        pass
    linie.append(f"Straznik: ostatnie sprawdzenie {st.get('ostatnie_sprawdzenie', '?')}, "
                 f"ostatni alert {st.get('ostatni_alert', 'brak')}, "
                 f"bledow w logu narastajaco {st.get('bad_log_lines', 0)}")
    linie.append(f"Budzet: wydane {st.get('budzet_wydane', '?')} USD z limitu {st.get('budzet_limit', '?')} USD/dzien")

    dziennik = AUTO / "dziennik.md"
    wpisy = 0
    if dziennik.exists():
        for ln in dziennik.read_text(encoding="utf-8", errors="replace").splitlines():
            m = re.match(r"\|\s*(\d{4}-\d\d-\d\d)", ln)
            if m:
                try:
                    t = time.mktime(time.strptime(m.group(1), "%Y-%m-%d"))
                    if t >= prog:
                        wpisy += 1
                except Exception:
                    pass
    linie.append(f"Wpisy w dzienniku (7 dni): {wpisy}")

    commits = git("log", "--since=7.days", "--date=short", "--format=%h %ad %s")
    linie.append(f"Commity w repo {REPO.name} (7 dni): {len([c for c in commits.splitlines() if c.strip()])}")
    for c in commits.splitlines()[:8]:
        linie.append(f"  - {c[:110]}")
    linie.append(f"Zmienionych plikow teraz: {len([l for l in git('status', '--short').splitlines() if l.strip()])}")

    bl = AUTO / "backlog.md"
    otwarte, zrobione = [], []
    if bl.exists():
        t = bl.read_text(encoding="utf-8", errors="replace")
        otwarte = re.findall(r"^- \[ \] (AUTO-\d+) \| ([^|]+) \| ([^|]+) \| ryzyko: ([^|]+) \|", t, re.M)
        zrobione = re.findall(r"^- \[x\] (AUTO-\d+)", t, re.M)
    linie.append(f"Backlog: otwarte {len(otwarte)}, zrobione {len(zrobione)}")
    kolejnosc = {"wysokie": 3, "średnie": 2, "srednie": 2, "niskie": 1}
    otwarte.sort(key=lambda o: -kolejnosc.get(o[3].strip().lower(), 0))
    linie.append("Propozycja na przyszly tydzien (najpierw male ryzyko, duzy skutek):")
    for ident, typ, opis, ryzyko in otwarte[:3]:
        linie.append(f"  - {ident} [{typ.strip()}/{ryzyko.strip()}]: {opis.strip()[:80]}")

    tresc = [f"# Raport tygodniowy {rok}-W{tydz} ({_})", ""] + [f"- {x}" for x in linie] + [""]
    RAP.mkdir(parents=True, exist_ok=True)
    (RAP / f"tydzien-{rok}-W{tydz}.md").write_text("\n".join(tresc), encoding="utf-8")

    print(f"Raport tygodnia {rok}-W{tydz}:")
    for x in linie[:12]:
        print(f"- {x}" if not x.startswith("  ") else x)
    print(f"Pelny raport: AUTO/raporty/tydzien-{rok}-W{tydz}.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
