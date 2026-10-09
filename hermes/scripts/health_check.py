"""Health-check jarvis-desktop. Milczy (pusty stdout), gdy wszystko jest ok; inaczej wypisuje alert."""
import json, os, socket, sys
from pathlib import Path

root = Path.home() / ".hermes"
home = root / "profiles" / "jarvis-desktop"
problems = []

try:
    st = json.loads((root / "gateway_state.json").read_text(encoding="utf-8"))
    pid = st.get("pid")
    alive = False
    if pid:
        try:
            import psutil
            alive = psutil.pid_exists(int(pid))
        except ImportError:
            import subprocess
            out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/NH"], capture_output=True, text=True, errors="replace").stdout or ""
            alive = str(pid) in out
    if st.get("gateway_state") != "running" or not alive:
        problems.append(f"gateway nie dziala (state={st.get('gateway_state')}, pid={pid}, zywy={alive})")
    tg = (st.get("platforms") or {}).get("jarvis-desktop:telegram") or {}
    if tg.get("state") != "connected":
        problems.append(f"platforma jarvis-desktop:telegram: {tg.get('state')} {tg.get('error_message') or ''}".strip())
    if "jarvis-desktop" not in set(st.get("served_profiles") or []):
        problems.append("host gateway nie serwuje profilu jarvis-desktop")
except Exception as e:
    problems.append(f"nie moge odczytac gateway_state.json: {e}")

for port, label in ((8642, "host gateway"), (8651, "most Jarvis")):
    s = socket.socket(); s.settimeout(3)
    try:
        s.connect(("127.0.0.1", port))
    except OSError:
        problems.append(f"port {port} ({label}) nie odpowiada")
    finally:
        s.close()

db = home / "state.db"
if db.exists() and db.stat().st_size > 300 * 1024 * 1024:
    problems.append(f"state.db urosl do {db.stat().st_size // 2**20} MB")

if problems:
    print("ALERT Hermes jarvis-desktop:\n- " + "\n- ".join(problems))
    sys.exit(0)
