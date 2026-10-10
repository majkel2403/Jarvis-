"""Przeglad nocy (budzet 0, bez modelu).

Zbiera fakty z ostatniej doby, zapisuje pelny raport do AUTO/raporty/RRRR-MM-DD.md,
dopisuje linie do AUTO/dziennik.md i wypisuje krotki skrot (na Telegram).

Nic nie zmienia poza plikami AUTO/. Gdy AUTO/STOP istnieje — milczy.
"""
import glob
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path

HOME = Path.home()
PROFILE = HOME / ".hermes" / "profiles" / "jarvis-desktop"
AUTO = HOME / "JarvisWorkspace" / "AUTO"
REPO = HOME / "Desktop" / "jarvis-"
RAP = AUTO / "raporty"
OK_STATUS = {"completed", "success", "succeeded", "suppressed", "skipped"}
day = time.strftime("%Y-%m-%d")
fakty = []


def f(tekst):
    fakty.append(tekst)


def git(*args):
    try:
        r = subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True,
                           errors="replace", timeout=60)
        return (r.stdout or "").strip()
    except Exception as e:
        return f"(blad git: {e})"


def zbierz_dysk():
    u = shutil.disk_usage(str(HOME))
    f(f"Dysk C: wolne {u.free / 2**30:.1f} GB z {u.total / 2**30:.0f} GB")
    db = PROFILE / "state.db"
    if db.exists():
        f(f"state.db {db.stat().st_size / 2**20:.0f} MB")
    bk = HOME / ".hermes" / "backups"
    if bk.exists():
        katalogi = [p for p in bk.iterdir() if p.is_dir()]
        f(f"Backupy: {len(katalogi)} katalogow")


def zbierz_crony():
    db = PROFILE / "cron" / "executions.db"
    if not db.exists():
        f("Crony: NIE SPRAWDZONE (brak executions.db)")
        return
    since = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(time.time() - 86400))
    try:
        con = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True)
        rows = list(con.execute("select job_id, status, error from executions where finished_at > ?", (since,)))
        con.close()
    except Exception as e:
        f(f"Crony: NIE SPRAWDZONE ({e})")
        return
    try:
        data = json.loads((PROFILE / "cron" / "jobs.json").read_text(encoding="utf-8"))
        jobs = data.get("jobs", data) if isinstance(data, dict) else data
        if isinstance(jobs, dict):
            jobs = list(jobs.values())
        names = {j.get("id"): (j.get("name") or j.get("id")) for j in jobs if isinstance(j, dict)}
    except Exception:
        names = {}
    zle = [r for r in rows if (r[1] or "").lower() not in OK_STATUS]
    f(f"Crony 24h: {len(rows)} uruchomien, blednych {len(zle)}")
    for r in zle[:5]:
        f(f"  - {names.get(r[0], r[0])}: {r[1]} {(r[2] or '')[:120]}")


def zbierz_log():
    log = PROFILE / "logs" / "agent.log"
    if not log.exists():
        f("Log: NIE SPRAWDZONY (brak agent.log)")
        return
    try:
        with log.open("rb") as fh:
            fh.seek(max(0, log.stat().st_size - 4 * 1024 * 1024))
            tekst = fh.read().decode("utf-8", "replace")
    except Exception as e:
        f(f"Log: NIE SPRAWDZONY ({e})")
        return
    wzory = Counter()
    for ln in tekst.splitlines():
        if re.match(r"^\d{4}-\d\d-\d\d[ T][\d:,.+]+\s+(ERROR|CRITICAL)\b", ln):
            czysty = re.sub(r"\d{4}-\d\d-\d\d[ T][\d:.,+]+", "", ln)
            czysty = re.sub(r"\b\d{2,}\b", "N", czysty).strip()
            wzory[czysty[:110]] += 1
    f(f"Log (ostatnie 4 MB): linii z ERROR {sum(wzory.values())}")
    for wz, n in wzory.most_common(3):
        f(f"  - x{n}: {wz}")


def zbierz_testy():
    testy = sorted(glob.glob(str(REPO / "tests" / "unit" / "*.test.js")))
    node = shutil.which("node")
    if not testy or not node:
        f("Testy: NIE SPRAWDZONE (brak node lub testow)")
        return
    try:
        out = subprocess.run([node, "--test", *testy], cwd=str(REPO), capture_output=True,
                             text=True, errors="replace", timeout=600)
        tekst = (out.stdout or "") + (out.stderr or "")
        p = re.search(r"pass\s+(\d+)", tekst)
        fl = re.search(r"fail\s+(\d+)", tekst)
        f(f"Testy Jarvis OS: pass={p.group(1) if p else '?'} fail={fl.group(1) if fl else '?'}")
    except Exception as e:
        f(f"Testy: NIE SPRAWDZONE ({e})")


def zbierz_git():
    f(f"Repo {REPO.name}: galaz {git('branch', '--show-current') or '?'}, "
      f"zmienionych plikow {len([l for l in git('status', '--short').splitlines() if l.strip()])}")
    for ln in git("log", "-3", "--date=short", "--format=%h %ad %s").splitlines():
        f(f"  commit: {ln[:110]}")


def zbierz_backlog():
    b = AUTO / "backlog.md"
    if not b.exists():
        f("Backlog: brak pliku")
        return
    tresc = b.read_text(encoding="utf-8", errors="replace")
    otwarte = re.findall(r"^- \[ \] (AUTO-\d+) \| ([a-ząćęłńóśźżA-Z]+) \| ([^|]+)\|", tresc, re.M)
    f(f"Backlog: otwartych pozycji {len(otwarte)}")
    for ident, typ, opis in otwarte[:5]:
        f(f"  - {ident} ({typ.strip()}): {opis.strip()[:90]}")


def main():
    if (AUTO / "STOP").exists():
        return 0
    RAP.mkdir(parents=True, exist_ok=True)
    zbierz_dysk()
    zbierz_crony()
    zbierz_log()
    zbierz_testy()
    zbierz_git()
    zbierz_backlog()

    tresc = [f"# Raport nocy {day} (godz. {time.strftime('%H:%M')})", "",
             "Zebrane fakty (bez oceny — ocena należy do Jarvisa w rozmowie):", ""]
    tresc += [f"- {x}" for x in fakty]
    tresc += ["", "## Co dalej", "", "- [ ] (puste — uzupełnia Jarvis w rozmowie)"]
    (RAP / f"{day}.md").write_text("\n".join(tresc) + "\n", encoding="utf-8")

    try:
        with (AUTO / "dziennik.md").open("a", encoding="utf-8") as fh:
            fh.write(f"| {day} {time.strftime('%H:%M')} | A (przeglad nocy) | raport faktow | "
                     f"AUTO/raporty/{day}.md | $0 |\n")
    except Exception:
        pass

    # skrot na Telegram: tylko najwazniejsze linie
    wazne = [x for x in fakty if re.search(r"Crony|Log \(|Testy|Dysk|Backlog|NIE SPRAWDZONE", x)]
    print(f"Przeglad nocy {day} — skrot:")
    for x in wazne:
        print(f"- {x}")
    print(f"Pelny raport: AUTO/raporty/{day}.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
