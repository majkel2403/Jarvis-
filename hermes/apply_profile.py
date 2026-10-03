"""Konfiguruje profil Hermesa dla Jarvis OS: most MCP pulpitu + ograniczony kanał API pulpitu.

Od 2026-10-03 jarvis-desktop to JEDYNY profil (Telegram z pełnym zestawem narzędzi + API pulpitu).
Skrypt NIE wyłącza narzędzi globalnie, NIE usuwa sekretów Telegrama i NIE nadpisuje reasoning_effort —
ogranicza tylko kanał api_server (platform_toolsets.api_server).

Uruchamiaj Pythonem z venv Hermesa (ma PyYAML):
  %USERPROFILE%\\.hermes\\hermes-agent\\venv\\Scripts\\python.exe hermes\\apply_profile.py --home %USERPROFILE%\\.hermes --name jarvis-desktop

Zmienia WYŁĄCZNIE profil docelowy: config.yaml (z kopią zapasową), .env, SOUL.md.
"""
from __future__ import annotations

import argparse
import re
import secrets
import shutil
import sys
import time
from pathlib import Path

import yaml

for _s in (sys.stdout, sys.stderr):   # konsola Windows bywa w cp1250 — bez tego polskie znaki to krzaczki
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parent
# Pełny zestaw jak na Telegramie (SOUL §2.9 obiecuje terminal/pliki/kod/skille także z pulpitu — decyzja z 2026-10-03),
# bez stt/tts (kanały głosowe; pulpit ma własną mowę). jarvis_desktop = nazwa serwera MCP (allowlista).
ENABLED = ["browser", "clarify", "code_execution", "computer_use", "connections", "cronjob", "delegation",
           "file", "memory", "session_search", "skills", "terminal", "todo", "vision", "web", "jarvis_desktop"]
ORIGINS = "http://localhost:4000,http://127.0.0.1:4000,https://majkel2403.github.io"


def read_env(p: Path) -> list[str]:
    return p.read_text(encoding="utf-8").splitlines() if p.exists() else []


def set_env(lines: list[str], key: str, value: str, keep_existing: bool = False) -> list[str]:
    pat = re.compile(rf"^\s*{re.escape(key)}\s*=")
    for i, ln in enumerate(lines):
        if pat.match(ln):
            if not keep_existing:
                lines[i] = f"{key}={value}"
            return lines
    lines.append(f"{key}={value}")
    return lines


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", required=True, help="HERMES_HOME (katalog z profiles/)")
    ap.add_argument("--name", default="jarvis-desktop")
    ap.add_argument("--port", type=int, default=8643)
    ap.add_argument("--bridge-url", default="http://127.0.0.1:8651")
    ap.add_argument("--bridge-token", default="", help="token mostu (z: jarvis_bridge.py --show-token)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    pdir = Path(a.home) / "profiles" / a.name
    if not pdir.is_dir():
        print(f"BŁĄD: brak profilu {pdir} (najpierw: hermes profile create {a.name} --clone-from <profil>)", file=sys.stderr)
        return 2
    cfg_path, env_path, soul_path = pdir / "config.yaml", pdir / ".env", pdir / "SOUL.md"
    cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}
    cfg = cfg or {}

    cfg.setdefault("mcp_servers", {})["jarvis_desktop"] = {
            "url": a.bridge_url.rstrip("/") + "/mcp",
            "headers": {"Authorization": "Bearer ${JARVIS_BRIDGE_TOKEN}", "X-Jarvis-Profile": a.name},
            "enabled": True,
            "timeout": 120,   # most czeka do 90 s na zgodę użytkownika (Tak / Nie)
            "connect_timeout": 20,
            "keepalive_interval": 60,
            "trust": "full",
            "tools": {"resources": False, "prompts": False},
    }
    pt = cfg.setdefault("platform_toolsets", {})
    pt["api_server"] = list(ENABLED)

    env = read_env(env_path)
    # Najmniejsze uprawnienia: usuń sekrety kanałów, których ten profil nie obsługuje (Telegram ZOSTAJE — to kanał tego profilu).
    drop = re.compile(r"^\s*(WHATSAPP|DISCORD|SLACK|MATRIX|MATTERMOST|SIGNAL|EMAIL|NOTION|HERMES_DASHBOARD|BROWSERBASE|OBSIDIAN|TERMINAL_MODAL)_\w*\s*=")
    scrubbed = sorted({ln.split("=")[0].strip() for ln in env if drop.match(ln)})
    env = [ln for ln in env if not drop.match(ln)]
    have_key = any(re.match(r"^\s*API_SERVER_KEY\s*=\s*\S", ln) for ln in env)
    key = None if have_key else secrets.token_urlsafe(32)
    for k, v, keep in [("API_SERVER_ENABLED", "true", False), ("API_SERVER_HOST", "127.0.0.1", False), ("API_SERVER_PORT", str(a.port), False),
                       ("API_SERVER_CORS_ORIGINS", ORIGINS, False), ("API_SERVER_MODEL_NAME", a.name, False)]:
        env = set_env(env, k, v, keep)
    if key:
        env = set_env(env, "API_SERVER_KEY", key)
    if a.bridge_token:
        env = set_env(env, "JARVIS_BRIDGE_TOKEN", a.bridge_token)

    print(f"Profil: {pdir}")
    print(f"  mcp_servers -> jarvis_desktop ({a.bridge_url.rstrip('/')}/mcp)")
    print(f"  platform_toolsets.api_server -> {ENABLED}")
    print(f"  API: http://127.0.0.1:{a.port}/v1  (model: {a.name})")
    print(f"  .env: usunięto zbędne sekrety ({len(scrubbed)}): {', '.join(scrubbed) or '—'}")
    if a.dry_run:
        print("(dry-run: nic nie zapisano)")
        return 0

    if cfg_path.exists():
        bak = cfg_path.with_name(f"config.yaml.bak-jarvis-desktop-{time.strftime('%Y%m%d-%H%M%S')}")
        shutil.copy2(cfg_path, bak)
        print(f"  kopia zapasowa: {bak.name}")
    for old in sorted(pdir.glob("config.yaml.bak-jarvis-desktop-*"))[:-3]:   # zostaw 3 ostatnie kopie
        old.unlink(missing_ok=True)
    cfg_path.write_text(yaml.safe_dump(cfg, allow_unicode=True, sort_keys=False), encoding="utf-8")
    env_path.write_text("\n".join(env) + "\n", encoding="utf-8")
    if soul_path.exists():
        soul_bak = soul_path.with_name(f"SOUL.md.bak-jarvis-desktop-{time.strftime('%Y%m%d-%H%M%S')}")
        shutil.copy2(soul_path, soul_bak)
        print(f"  kopia zapasowa SOUL: {soul_bak.name}")
    for old_soul in sorted(pdir.glob("SOUL.md.bak-jarvis-desktop-*"))[:-3]:
        old_soul.unlink(missing_ok=True)
    shutil.copy2(HERE / "SOUL.md", soul_path)
    if key:
        print(f"\nAPI_SERVER_KEY (wpisz w Jarvis OS → Ustawienia → klucz API): {key}")
    else:
        print("\nAPI_SERVER_KEY: zachowano istniejący z .env profilu")
    return 0


if __name__ == "__main__":
    sys.exit(main())
