"""Regresje po audycie 2026-10-11: reguła kopii SOUL, haki sejfu, patrol bez spamu, backup state.db, apply_profile."""
from __future__ import annotations

import ast
import importlib.util
import io
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit
ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "hermes" / "scripts"
TODAY = date.today().isoformat()


def load(name: str):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_")[:-3], SCRIPTS / name)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ---------------------------------------------------------------- config_guard: reguła kopii SOUL
def snap_rule():
    """Wyciąga samą funkcję _snap_soul_recent (strażnik wykonuje kontrole przy imporcie)."""
    tree = ast.parse((SCRIPTS / "config_guard.py").read_text(encoding="utf-8"))
    fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "_snap_soul_recent")
    ns = {"Path": Path, "re": re, "time": time, "SNAP_DIR": Path("."), "PROFILE": Path(".")}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), "config_guard", "exec"), ns)
    return ns["_snap_soul_recent"]


def test_soul_snapshot_rule_uses_folder_date_and_content(tmp_path):
    rule = snap_rule()
    soul = tmp_path / "SOUL.md"
    soul.write_text("aktualny SOUL\n", encoding="utf-8")
    snaps = tmp_path / "snaps"
    old = (date.today() - timedelta(days=9)).isoformat()
    for day, text in ((TODAY, "aktualny SOUL\r\n"), (old, "aktualny SOUL\n")):
        (snaps / day).mkdir(parents=True)
        (snaps / day / "SOUL.md").write_text(text, encoding="utf-8", newline="")
    os.utime(snaps / old / "SOUL.md")   # świeża data pliku nie może „odmłodzić” starego folderu
    assert [p.parent.name for p in rule(snaps, soul)] == [TODAY]

    (snaps / TODAY / "SOUL.md").write_text("stary, inny SOUL\n", encoding="utf-8")
    assert rule(snaps, soul) == []      # kopia z inną treścią nie jest aktualną kopią


def test_guard_no_longer_touches_mtimes_or_copies_env():
    src = (SCRIPTS / "config_guard.py").read_text(encoding="utf-8")
    assert "os.utime" not in src
    assert 'PROFILE / ".env"):' not in src and '(day / ".env").unlink' in src


# ---------------------------------------------------------------- obsidian-capture: bez tytułu nic nie zapisuje
@pytest.fixture()
def vault(tmp_path):
    v = tmp_path / "vault"
    (v / "Templates" / "Sessions").mkdir(parents=True)
    (v / "hot.md").write_text("# hot\n\n## 🕐 Ostatnia aktualizacja\n\n---\n", encoding="utf-8")
    (v / "log.md").write_text("# log\n\n| Czas | Typ | Opis |\n|---|---|---|\n", encoding="utf-8")
    return v


def capture(vault, *args):
    env = {**os.environ, "OBSIDIAN_VAULT_PATH": str(vault)}
    r = subprocess.run([sys.executable, str(SCRIPTS / "obsidian-capture.py"), *args], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", env=env, timeout=120)
    assert r.returncode == 0, r.stdout + r.stderr
    return r.stdout


def test_capture_without_title_writes_nothing(vault):
    before = {p: p.read_bytes() for p in vault.rglob("*") if p.is_file()}
    for kind in ("task", "update", "error", "session"):
        capture(vault, kind)
    after = {p: p.read_bytes() for p in vault.rglob("*") if p.is_file()}
    assert before == after


def test_session_appends_and_logs_once_per_day(vault):
    capture(vault, "session", "context=Pierwsze pytanie", "accomplishments=Odpowiedź A")
    capture(vault, "session", "context=Drugie pytanie", "accomplishments=Odpowiedź B")
    note = (vault / "06 - AI Sessions" / "Daily Summaries" / f"session-{TODAY}.md").read_text(encoding="utf-8")
    assert "Drugie pytanie" in note and "Odpowiedź B" in note
    log = (vault / "log.md").read_text(encoding="utf-8")
    assert log.count("| SESSION |") == 1
    assert "Session:" not in (vault / "hot.md").read_text(encoding="utf-8")   # sesje nie zaśmiecają hot.md


# ---------------------------------------------------------------- haki sejfu
def test_tool_hook_passes_title_and_skips_cron(monkeypatch):
    hook = load("post_tool_hook.py")
    calls = []
    monkeypatch.setattr(hook, "_spawn", lambda kind, *a: calls.append((kind, a)))

    def fire(payload):
        monkeypatch.setattr(sys, "stdin", io.StringIO(json.dumps(payload)))
        assert hook.main() == 0

    fire({"tool_name": "mcp__jarvis_desktop__add_task", "tool_input": {"title": "Kup  mleko"}, "session_id": "20261011_1"})
    fire({"tool_name": "mcp__jarvis_desktop__add_task", "tool_input": {}, "session_id": "20261011_1"})
    fire({"tool_name": "mcp__jarvis_desktop__add_task", "tool_input": {"title": "x"}, "session_id": "cron_abc_1"})
    fire({"tool_name": "delegate_task", "tool_input": {"goal": "y"}, "session_id": "20261011_1"})
    assert calls == [("task", ("Kup mleko",))]


def test_llm_hook_describes_session_and_skips_cron(monkeypatch, tmp_path):
    hook = load("post_llm_hook.py")
    monkeypatch.setattr(hook, "STATE", tmp_path / "state.json")
    calls = []
    monkeypatch.setattr(hook, "_spawn", lambda kind, *a: calls.append((kind, a)))

    def fire(payload):
        monkeypatch.setattr(sys, "stdin", io.StringIO(json.dumps(payload)))
        assert hook.main() == 0

    fire({"session_id": "cron_c84542f6a694_1", "extra": {"user_message": "patrol", "assistant_response": "ok"}})
    fire({"session_id": "20261011_2", "extra": {"user_message": "Jaki dziś dzień?", "assistant_response": "Niedziela."}})
    assert calls == [("session", ("context=Jaki dziś dzień?", "accomplishments=Niedziela."))]


# ---------------------------------------------------------------- auto_patrol: ten sam alert nie wraca co 30 min
def test_patrol_sends_same_alert_once(monkeypatch, tmp_path, capsys):
    patrol = load("auto_patrol.py")
    monkeypatch.setattr(patrol, "AUTO", tmp_path)
    monkeypatch.setattr(patrol, "STATE_F", tmp_path / ".patrol_state.json")
    for name in ("check_log", "check_cron", "check_tests", "check_budget"):
        monkeypatch.setattr(patrol, name, lambda st: None)
    monkeypatch.setattr(patrol, "check_disk", lambda: patrol.alerts.append("dysk C: 95%"))
    monkeypatch.setattr(patrol, "check_autonomia", lambda: None)

    outputs = []
    for _ in range(3):
        patrol.alerts.clear()
        patrol.main()
        outputs.append(capsys.readouterr().out)
    assert "dysk C: 95%" in outputs[0] and outputs[1] == "" and outputs[2] == ""


# ---------------------------------------------------------------- backup_state_db: drugi bieg tego samego dnia
def test_state_backup_runs_twice_a_day_without_raw_copy(monkeypatch, tmp_path):
    bk = load("backup_state_db.py")
    db = tmp_path / "state.db"
    con = sqlite3.connect(db)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("CREATE TABLE t (x)")
    con.execute("INSERT INTO t VALUES (1)")
    con.commit()
    monkeypatch.setattr(bk, "STATE_DB", db)
    monkeypatch.setattr(bk, "BACKUP_ROOT", tmp_path / "backups")
    assert bk.main() == 0
    con.execute("INSERT INTO t VALUES (2)")
    con.commit()
    assert bk.main() == 0 and bk.problems == []
    con.close()
    out = tmp_path / "backups" / f"state-{time.strftime('%Y-%m-%d')}.db"
    assert sqlite3.connect(out).execute("SELECT count(*) FROM t").fetchone()[0] == 2
    assert sorted(p.name for p in (tmp_path / "backups").iterdir()) == [out.name]


# ---------------------------------------------------------------- apply_profile
def test_apply_profile_targets_and_fallback_dedup(tmp_path):
    home = tmp_path / "home"
    prof = home / "profiles" / "jarvis-desktop"
    prof.mkdir(parents=True)
    (prof / "config.yaml").write_text(
        "model: {default: deepseek-flash, provider: deepseek}\n"
        "fallback_providers:\n- {provider: minimax, model: MiniMax-M2.7}\n- {provider: deepseek, model: deepseek-flash}\n",
        encoding="utf-8")
    p = subprocess.run([sys.executable, str(ROOT / "hermes" / "apply_profile.py"), "--home", str(home),
                        "--name", "jarvis-desktop", "--dry-run"],
                       cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    assert p.returncode == 0, p.stdout + p.stderr
    assert "fallback_providers bez deepseek-flash" in p.stdout
    assert "agent.max_turns=120" in p.stdout and "tool_output.max_bytes=20000" in p.stdout


def test_repo_skills_copy_subfolders(tmp_path):
    spec = importlib.util.spec_from_file_location("apply_profile_mod", ROOT / "hermes" / "apply_profile.py")
    ap = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ap)
    written = ap.copy_repo_skills(tmp_path / "prof", tmp_path / "home")
    rel = {p.relative_to(tmp_path / "prof" / "skills").as_posix() for p in written if (tmp_path / "prof") in p.parents}
    assert "jarvis-operations/SKILL.md" in rel
    assert "jarvis-operations/references/straznik-test-3-kroki.md" in rel
    assert not any("__pycache__" in r for r in rel)
    ops = (ROOT / "hermes" / "skills" / "jarvis-operations" / "SKILL.md").read_text(encoding="utf-8")
    assert "os.utime(day" not in ops and "fix_snapshot_mtime" not in ops
