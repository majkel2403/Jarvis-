#!/usr/bin/env python3
"""Hak post_llm_call (config.yaml) — session summary w sejfie, z throttlem.

Zmiana 2026-10-08 [Jarvis]: poprzednia wersja wolala `obsidian-capture.py session` po KAZDEJ turze
modelu (i `daily` po kazdej udanej), blokujaco. Teraz: session najwyzej raz na 15 min, daily najwyzej
raz na 6 h, procesy startuja DETACHED (hak wraca natychmiast).
Wejscie (stdin, JSON): {hook_event_name, task_id, status?, result?, ...}
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

SCRIPT_DIR = r"C:\Users\majke\.hermes\profiles\jarvis-desktop\scripts"
CAPTURE = os.path.join(SCRIPT_DIR, "obsidian-capture.py")
VAULT = r"C:\Users\majke\Documents\hermes"
STATE = Path(r"C:\Users\majke\.hermes\profiles\jarvis-desktop\cache\hooks\vault-hook-state.json")
THROTTLE_S = {"llm_session": 900, "llm_daily": 6 * 3600}


def _load_state() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_state(state: dict) -> None:
    try:
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps(state), encoding="utf-8")
    except Exception:
        pass


def _due(state: dict, key: str, seconds: int) -> bool:
    return time.time() - float(state.get(key, 0)) >= seconds


def _spawn(kind: str) -> None:
    cmd = [sys.executable, CAPTURE, kind]
    kw = {"cwd": VAULT, "stdin": subprocess.DEVNULL,
          "stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}
    try:
        if os.name == "nt":
            kw["creationflags"] = 0x00000008 | 0x08000000  # DETACHED_PROCESS | CREATE_NO_WINDOW
        else:
            kw["start_new_session"] = True
        subprocess.Popen(cmd, **kw)
    except Exception:
        pass


def main() -> int:
    try:
        data = json.loads(sys.stdin.read() or "{}")
    except Exception:
        return 0
    status = str(data.get("status") or data.get("result") or "").lower()
    state = _load_state()
    launched = False

    if _due(state, "llm_session", THROTTLE_S["llm_session"]):
        state["llm_session"] = time.time()
        _spawn("session")
        launched = True
    if status in ("completed", "done", "success", "ok") and _due(state, "llm_daily", THROTTLE_S["llm_daily"]):
        state["llm_daily"] = time.time()
        _spawn("daily")
        launched = True
    if launched:
        _save_state(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
