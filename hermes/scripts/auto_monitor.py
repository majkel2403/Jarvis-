#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
auto_monitor.py — sygnał dla MYŚLĄCEJ czujki autonomii (tryb monitor w cronie).

Zasada: wypisuje TYLKO to, co NOWE od poprzedniego przebiegu. Ten sam odcisk
bajt w bajt = cron nie woła modelu (zero tokenów). Zmiana = budzi agenta.
Dzięki temu "czujka chodzi cały czas", ale plan MiniMaxa pali się tylko wtedy,
gdy naprawdę coś się stało.

Stan:  AUTO/.monitor_state.json  (pozycja w logu, znane odciski błędów, znane ID backlogu)
Budżet: 0 USD — to zwykły skrypt Pythona, żadnego modelu.
Wyłącznik: plik AUTO/STOP → wypisuje stałe "STOP" (stabilne = agent nigdy nie rusza).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
from pathlib import Path

HOME = Path(os.path.expanduser("~"))
PROFILE = HOME / ".hermes" / "profiles" / "jarvis-desktop"
AUTO = HOME / "JarvisWorkspace" / "AUTO"
LOG = PROFILE / "logs" / "agent.log"
CRON_DB = PROFILE / "cron" / "executions.db"
STATE = AUTO / ".monitor_state.json"
BACKLOG = AUTO / "backlog.md"
PATROL_STATE = AUTO / ".patrol_state.json"

ERR_RE = re.compile(r"^\d{4}-\d\d-\d\d[ T][\d:,.+]+\s+(ERROR|CRITICAL)\b")
MAX_ERR = 400


def sha(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8", "replace")).hexdigest()[:10]


def load_state() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_state(st: dict) -> None:
    try:
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception:
        pass


def nowe_bledy(st: dict) -> tuple[list[str], int]:
    """Zwraca (nowe, ile_w_logu_od_ostatniego)."""
    if not LOG.exists():
        return ["agent.log niedostepny"], 0
    size = LOG.stat().st_size
    pos = int(st.get("log_pos", 0))
    if size < pos:  # log się zrolował
        pos = 0
    try:
        with LOG.open("r", encoding="utf-8", errors="replace") as fh:
            fh.seek(pos)
            chunk = fh.read()
    except Exception as e:
        return [f"nie przeczytalem agent.log: {e}"], 0
    znane = set(st.get("znane_bledy", []))
    nowe = []
    for ln in chunk.splitlines():
        if ERR_RE.match(ln):
            odcisk = sha(re.sub(r"\d+", "N", ln)[:300])
            if odcisk not in znane:
                znane.add(odcisk)
                nowe.append(odcisk)
    st["log_pos"] = size
    st["znane_bledy"] = sorted(znane)[-MAX_ERR:]
    return nowe, len(nowe)


def nowy_backlog(st: dict) -> tuple[int, str]:
    """Nowe pozycje backlogu: liczba + odcisk ostatniej nowej."""
    if not BACKLOG.exists():
        return 0, ""
    znane = set(st.get("znane_pozycje", []))
    nowe = []
    try:
        for ln in BACKLOG.read_text(encoding="utf-8", errors="replace").splitlines():
            m = re.match(r"^\s*[-*]\s*(?:\[[ xX]\]\s*)?\*{0,2}(AUTO-\d+)", ln)
            if m and m.group(1) not in znane:
                znane.add(m.group(1))
                nowe.append(m.group(1))
    except Exception:
        return 0, ""
    st["znane_pozycje"] = sorted(znane)
    if not nowe:
        return 0, ""
    return len(nowe), sha(",".join(sorted(nowe)))


def cron_bledy(st: dict) -> int:
    """Ile cronów padło od poprzedniego przebiegu (po dacie ostatniego sprawdzenia)."""
    if not CRON_DB.exists():
        return 0
    od = st.get("cron_od")
    try:
        con = sqlite3.connect(f"file:{CRON_DB}?mode=ro", uri=True)
    except Exception:
        return 0
    try:
        if od:
            q = ("select count(*) from executions where status in ('failed','error') "
                 "and coalesce(finished_at, started_at) > ? "
                 "and lower(coalesce(error,'')) not like '%fire claim lost%'")
            n = con.execute(q, (od,)).fetchone()[0]
        else:
            n = 0
        ostatni = con.execute(
            "select coalesce(finished_at, started_at) from executions order by rowid desc limit 1"
        ).fetchone()
    except Exception:
        return 0
    finally:
        con.close()
    if ostatni and ostatni[0]:
        st["cron_od"] = ostatni[0]
    return int(n or 0)


def testy(st: dict) -> str:
    """Status testów Jarvis OS z raportu strażnika (bez uruchamiania testów tutaj)."""
    try:
        p = json.loads(PATROL_STATE.read_text(encoding="utf-8"))
        return str(p.get("test_result") or "?")
    except Exception:
        return "?"


def main() -> int:
    if (AUTO / "STOP").exists():
        print("STOP")  # stabilne → cron nie budzi modelu
        return 0

    st = load_state()
    nowe, n_nowych = nowe_bledy(st)
    n_backlog, odcisk_backlog = nowy_backlog(st)
    n_cron = cron_bledy(st)
    wynik_testow = testy(st)

    # Odcisk tego, co nowe — identyczny bajt w bajt, gdy nic się nie dzieje.
    odcisk = sha("|".join(sorted(nowe)) + f"|bl{n_backlog}|{odcisk_backlog}")

    print("CZUJKA v1")
    print(f"bledy_nowe: {n_nowych} odcisk={odcisk[:8]}")
    print(f"cron_failed: {n_cron}")
    print(f"testy: {wynik_testow}")
    print(f"backlog_nowe: {n_backlog} odcisk={odcisk_backlog[:8] or '-'}")
    if n_nowych:
        print("probki: " + "; ".join(nowe[-4:]))
    save_state(st)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
