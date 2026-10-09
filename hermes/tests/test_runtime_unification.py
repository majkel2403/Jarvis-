from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8-sig")


def test_runtime_contract_uses_multiplex_port_8642(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text("API_SERVER_KEY=test-key\n", encoding="utf-8")
    monkeypatch.delenv("JARVIS_HERMES_URL", raising=False)
    monkeypatch.setenv("JARVIS_HERMES_ENV", str(env_file))
    spec = importlib.util.spec_from_file_location("writer_proxy_contract", ROOT / "bridge" / "writer_proxy.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    assert mod.hermes_target()[0] == "http://127.0.0.1:8642/p/jarvis-desktop/v1/chat/completions"

    home = tmp_path / "home"
    (home / "profiles" / "jarvis-desktop").mkdir(parents=True)
    (home / "profiles" / "jarvis-desktop" / "config.yaml").write_text("{}\n", encoding="utf-8")
    p = subprocess.run(
        [sys.executable, str(ROOT / "hermes" / "apply_profile.py"), "--home", str(home), "--name", "jarvis-desktop", "--dry-run"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    assert p.returncode == 0, p.stdout + p.stderr
    assert "http://127.0.0.1:8642/p/jarvis-desktop/v1" in p.stdout
    assert "8643" not in read("hermes/scripts/health_check.py")


def test_jarvis_tasks_do_not_own_a_second_gateway():
    install = read("bridge/install-autostart.ps1")
    runner = read("bridge/run-service.ps1")
    restart = read("bridge/restart-gateway.ps1")
    assert "'JarvisOS-DesktopGateway' = 'gateway'" not in install
    assert "$obsolete = 'JarvisOS-DesktopGateway'" in install
    assert "Unregister-ScheduledTask -TaskName $obsolete" in install
    assert "ValidateSet('site', 'bridge', 'tab')" in runner
    assert "gateway = 8643" not in runner
    assert "profiles\\jarvis-desktop\\gateway_state.json" not in restart
    assert "gateway_state.json" in restart
    assert "-p default gateway restart" in restart
    assert "8642" in restart and "8643" not in restart


def test_profile_policy_is_single_and_current():
    apply = read("hermes/apply_profile.py")
    guard = read("hermes/scripts/config_guard.py")
    assert '"sessions.retention_days": 30' in apply
    assert '"session_reset.mode"' in apply and "REMOVE_KEYS" in apply
    assert '("JarvisOS-DesktopGateway", True)' not in guard
    assert "check(_old.returncode != 0" in guard
    assert "8642" in guard
