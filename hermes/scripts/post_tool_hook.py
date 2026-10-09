#!/usr/bin/env python3
"""Hak post_tool_call (config.yaml) — zapis do sejfu Obsidian tylko dla zdarzen, ktore maja znaczenie.

Zmiana 2026-10-08 [Jarvis]: poprzednia wersja dla KAZDEGO wywolania narzedzia (galeź "domyslnie")
wolala `obsidian-capture.py session`, co kosztowalo ~1,6 s na wywolanie (1308 wywolan/dobe ≈ 35 min
czekania) i zasypywalo `log.md` wpisami SESSION (69/dzien). Teraz:
  1) obslugujemy tylko narzedzia piszace do Jarvis OS, delegacje i zadania w sieci,
  2) "session" ma throttle (domyslnie 900 s) — jeden wpis na sesje na kwadrans,
  3) proces potomny startuje DETACHED — hak wraca natychmiast i nie blokuje narzedzia.
Wejscie (stdin, JSON): {hook_event_name, tool_name, tool_input, status?, result?, error?, ...}
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
THROTTLE_S = {"session": 900}  # kind -> min. odstep w sekundach

TASK_TOOLS = ("add_task", "tasks_complete", "tasks_update", "tasks_remove",
              "tasks_subtask", "tasks_move_many", "tasks_priority", "tasks_repeat",
              "start_timer", "timer_control", "market_watch", "market_watchlist")
NOTE_TOOLS = ("create_note", "notes_append", "notes_update", "notes_delete", "notes_folder",
              "notes_tag", "notes_pin", "notes_create", "notes_to_task", "notes_restore")
WIDGET_TOOLS = ("create_widget", "widgets_update", "widget_build", "widget_items", "widget_edit",
                "widgets_remove")
WIDE_TOOLS = ("delegate_task", "web_task", "media_play", "workflow_run", "computer_use")
FAILED_STATUS = ("failed", "error", "denied", "timeout", "offline")


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


def _spawn(kind: str) -> None:
    """Odpala obsidian-capture.py w tle (bez blokowania haka)."""
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
    tool = str(data.get("tool_name") or "")
    if not tool:
        return 0
    status = str(data.get("status") or data.get("result") or "").lower()
    failed = status in FAILED_STATUS

    if failed:
        kind = "error"
    elif any(t in tool for t in TASK_TOOLS):
        kind = "task"
    elif any(t in tool for t in NOTE_TOOLS) or any(t in tool for t in WIDGET_TOOLS):
        kind = "update"
    elif any(t in tool for t in WIDE_TOOLS):
        kind = "session"
    else:
        return 0  # zwykly odczyt — nic nie zapisujemy i nie spawnujemy procesu

    throttle = THROTTLE_S.get(kind, 0)
    if throttle:
        state = _load_state()
        now = time.time()
        if now - float(state.get(kind, 0)) < throttle:
            return 0
        state[kind] = now
        state["last_tool"] = tool
        _save_state(state)

    _spawn(kind)
    return 0


if __name__ == "__main__":
    sys.exit(main())
