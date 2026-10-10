"""Straznik autonomii (budzet 0, bez modelu).

Milczy (pusty stdout), gdy wszystko OK. Wypisuje alert, gdy:
- w logs/agent.log pojawily sie nowe bledy od ostatniego sprawdzenia,
- cron zakonczyl sie bledem od ostatniego sprawdzenia,
- testy Jarvis OS sa czerwone,
- malo miejsca na dysku,
- budzet dnia przekroczony,
- kontrola nie mogla sie wykonac (jawnie, zeby cisza nie klamala).

Plik AUTO/STOP wstrzymuje petle: wtedy nic nie robimy i nie alarmujemy.
Stan pomocniczy: AUTO/.patrol_state.json
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
from pathlib import Path

HOME = Path.home()
PROFILE = HOME / ".hermes" / "profiles" / "jarvis-desktop"
AUTO = HOME / "JarvisWorkspace" / "AUTO"
REPO = HOME / "Desktop" / "jarvis-"
STATE_F = AUTO / ".patrol_state.json"
LOG = PROFILE / "logs" / "agent.log"
CRON_DB = PROFILE / "cron" / "executions.db"
JOBS = PROFILE / "cron" / "jobs.json"
BAD_STATUS = {"failed", "error", "errored", "timeout", "timed_out", "interrupted", "crashed", "exception"}
OK_STATUS = {"completed", "success", "succeeded", "suppressed", "skipped"}

alerts = []


def load_state():
    try:
        return json.loads(STATE_F.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_state(st):
    try:
        AUTO.mkdir(parents=True, exist_ok=True)
        STATE_F.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception as e:
        alerts.append(f"nie moge zapisac stanu straznika: {e}")


def job_names():
    try:
        data = json.loads(JOBS.read_text(encoding="utf-8"))
        jobs = data.get("jobs", data) if isinstance(data, dict) else data
        if isinstance(jobs, dict):
            jobs = list(jobs.values())
        return {j.get("id"): j.get("name") or j.get("id") for j in jobs if isinstance(j, dict)}
    except Exception:
        return {}


def check_log(st):
    """Nowe bledy w agent.log (od ostatniej pozycji)."""
    try:
        size = LOG.stat().st_size
    except Exception as e:
        alerts.append(f"nie sprawdzilem agent.log ({e}) — sprawdz recznie")
        return
    pos = int(st.get("log_pos") or 0)
    if size < pos:
        pos = 0  # rotacja logu
    if size == pos:
        return
    try:
        with LOG.open("r", encoding="utf-8", errors="replace") as f:
            f.seek(pos)
            chunk = f.read()
    except Exception as e:
        alerts.append(f"nie przeczytalem agent.log ({e}) — sprawdz recznie")
        return
    lines = [ln.strip() for ln in chunk.splitlines()]
    bad = [ln for ln in lines if re.match(r"^\d{4}-\d\d-\d\d[ T][\d:,.+]+\s+(ERROR|CRITICAL)\b", ln)]
    st["log_pos"] = size
    st["bad_log_lines"] = st.get("bad_log_lines", 0) + len(bad)
    if bad:
        sample = "\n".join("   " + b[:180] for b in bad[-3:])
        alerts.append(f"nowe bledy w agent.log: {len(bad)} (razem {st['bad_log_lines']}):\n{sample}")


def check_cron(st):
    """Nieudane uruchomienia cronow od ostatniego sprawdzenia."""
    if not CRON_DB.exists():
        alerts.append("nie sprawdzilem cronow (brak cron/executions.db) — sprawdz recznie")
        return
    since = st.get("cron_seen") or "1970-01-01"
    try:
        con = sqlite3.connect(f"file:{CRON_DB.as_posix()}?mode=ro", uri=True)
        rows = list(con.execute(
            "select job_id, status, finished_at, error from executions "
            "where finished_at is not null and finished_at > ? order by finished_at",
            (since,),
        ))
        con.close()
    except Exception as e:
        alerts.append(f"nie sprawdzilem cronow ({e}) — sprawdz recznie")
        return
    names = job_names()
    # "Fire claim lost" = zrownolegle uruchomienie (reczny run vs tick) — to nie awaria.
    bad = [r for r in rows
           if (r[1] or "").lower() not in OK_STATUS
           and "fire claim lost" not in (r[3] or "").lower()]
    if rows:
        st["cron_seen"] = max(r[2] for r in rows)
    if bad:
        opis = "\n".join(f"   {names.get(r[0], r[0])}: {r[1]} {(r[3] or '')[:120]}" for r in bad[-5:])
        alerts.append(f"crony z bledem ({len(bad)} od {since[:16]}):\n{opis}")


def resolve_repo():
    """Sciezka repo Jarvis OS; puste repo kanoniczne odtwarza z kopii zapasowej.

    Kolejnosc: kanoniczna sciezka (marker bridge/jarvis_bridge.py) -> AUTO/repo-path.json
    -> najnowsza kopia Documents/JarvisDesktop-Backup-*/working-tree. Gdy kanoniczny katalog
    jest pusty, a kopia istnieje — odtwarza go i zglasza to (naprawa bez udzialu czlowieka).
    """
    marker = Path("bridge") / "jarvis_bridge.py"
    if (REPO / marker).exists():
        return REPO
    override = AUTO / "repo-path.json"
    if override.exists():
        try:
            p = Path(json.loads(override.read_text(encoding="utf-8"))["repo"])
            if (p / marker).exists():
                return p
        except Exception:
            pass
    try:
        pusty = not any(REPO.iterdir())
    except Exception:
        pusty = True
    kopia = None
    for cand in sorted((HOME / "Documents").glob("JarvisDesktop-Backup-*/working-tree"), reverse=True):
        if (cand / marker).exists():
            kopia = cand
            break
    if not REPO.exists() or pusty:
        if kopia is not None:
            try:
                shutil.copytree(kopia, REPO, dirs_exist_ok=True)
                alerts.append(
                    f"repo Jarvis OS bylo puste — odtworzone z {kopia.parent.name}, testy sprawdzone nizej"
                )
                return REPO
            except Exception as e:
                alerts.append(f"repo Jarvis OS puste, odtworzenie z kopii nie udalo sie ({e}) — sprawdz recznie")
                return None
        alerts.append(f"repo Jarvis OS puste ({REPO}) i brak kopii zapasowej — sprawdz recznie")
        return None
    alerts.append(f"w {REPO} brak repo Jarvis OS (brak bridge/jarvis_bridge.py), katalog niepusty — sprawdz recznie")
    return None


def check_tests(st):
    """Testy Jarvis OS — tylko gdy repo sie zmienilo od ostatniego razu."""
    repo = resolve_repo()
    if repo is None:
        return
    tests = glob.glob(str(repo / "tests" / "unit" / "*.test.js"))
    if not tests:
        alerts.append(f"nie sprawdzilem testow Jarvis OS (brak plikow tests/unit w {repo}) — sprawdz recznie")
        return
    watched = []
    for pat in ("js/*.js", "tests/**/*.js", "bridge/*.js"):
        watched += glob.glob(str(repo / pat), recursive=True)
    newest = max((os.path.getmtime(p) for p in watched), default=0)
    if newest <= float(st.get("test_mtime") or 0) and st.get("test_result"):
        return
    node = shutil.which("node")
    if not node:
        alerts.append("nie sprawdzilem testow (brak node w PATH) — sprawdz recznie")
        return
    try:
        out = subprocess.run([node, "--test", *tests], cwd=str(repo), capture_output=True,
                             text=True, errors="replace", timeout=420)
        text = (out.stdout or "") + (out.stderr or "")
    except Exception as e:
        alerts.append(f"nie uruchomilem testow ({e}) — sprawdz recznie")
        return
    p = re.search(r"pass\s+(\d+)", text)
    fail = re.search(r"fail\s+(\d+)", text)
    st["test_mtime"] = newest
    st["test_result"] = f"pass={p.group(1) if p else '?'} fail={fail.group(1) if fail else '?'}"
    if not p or (fail and fail.group(1) != "0"):
        tail = "\n".join("   " + ln for ln in text.strip().splitlines()[-6:])
        alerts.append(f"testy Jarvis OS CZERWONE ({st['test_result']}):\n{tail}")


def check_disk():
    try:
        free = shutil.disk_usage(str(HOME)).free / 2**30
    except Exception as e:
        alerts.append(f"nie sprawdzilem dysku ({e}) — sprawdz recznie")
        return
    if free < 8:
        alerts.append(f"malo miejsca na dysku: {free:.1f} GB wolne")


def check_budget(st):
    try:
        b = json.loads((AUTO / "budzet.json").read_text(encoding="utf-8"))
    except Exception as e:
        alerts.append(f"nie sprawdzilem budzetu ({e}) — sprawdz recznie")
        return
    st["budzet_wydane"] = b.get("wydane_usd", 0)
    st["budzet_limit"] = b.get("limit_usd_dzien")
    if b.get("limit_usd_dzien") is not None and (b.get("wydane_usd") or 0) > b["limit_usd_dzien"]:
        alerts.append(f"budzet dnia przekroczony: {b.get('wydane_usd')} USD > {b['limit_usd_dzien']} USD — "
                      "petle myslace wstrzymane do jutra")


def check_autonomia():
    """Kontrole autonomii JAIA (Faza 3-6): plan dnia, indeks wiedzy, cisza cronow, budzet.

    Importuje AUTO/tools/autonomy_health.py — jedno zrodlo prawdy dla tych kontroli.
    Koszt rozmowy na platnym modelu to nie awaria petli, wiec alarmuje tylko powyzej 10 USD/24 h.
    """
    try:
        sys.path.insert(0, str(AUTO / "tools"))
        import autonomy_health as ah
        wyniki = ah.sprawdz()
    except Exception as e:
        alerts.append(f"nie sprawdzilem autonomii ({e}) — sprawdz recznie")
        return
    for nazwa, ok, opis in wyniki:
        if ok is True:
            continue
        if nazwa.startswith("budzet"):
            m = re.search(r"([\d.]+) USD / 24 h", opis)
            if ok is False and (not m or float(m.group(1)) < 10.0):
                continue          # zwykly koszt rozmowy — nie zasypujemy Telegrama
        prefiks = "autonomia — " if ok is False else "autonomia — NIE SPRAWDZILEM "
        alerts.append(f"{prefiks}{nazwa}: {opis}")


def main():
    if (AUTO / "STOP").exists():
        return 0  # pauza: bez pracy i bez alarmow
    st = load_state()
    check_log(st)
    check_cron(st)
    check_tests(st)
    check_disk()
    check_budget(st)
    check_autonomia()
    st["ostatnie_sprawdzenie"] = time.strftime("%Y-%m-%d %H:%M")
    if alerts:
        st["ostatni_alert"] = st["ostatnie_sprawdzenie"]
    save_state(st)
    if alerts:
        print("ALERT autonomia Jarvisa:\n- " + "\n- ".join(alerts))
    return 0


if __name__ == "__main__":
    sys.exit(main())
