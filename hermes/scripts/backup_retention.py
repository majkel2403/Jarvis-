#!/usr/bin/env python3
"""Retencja backupow Hermesa — trzyma swieze kopie, kasuje stare.

Zasada (ustalona 2026-10-08 [Jarvis]):
  * wiek wpisu = data z nazwy (YYYYMMDD / YYYY-MM-DD), a gdy jej nie ma — mtime najnowszego pliku,
    dlatego wpis "hermes-agent-broken-20260608-*" jest stary mimo pliku dotknietego pozniej,
  * kasujemy wpisy starsze niz MAX_AGE_DAYS (domyslnie 30 dni),
  * zawsze zostawiamy NEWEST_KEEP najnowszych wpisow (domyslnie 5),
  * katalogi `config` i `config-snapshots` sa nietykalne (male, uzywane przez strażnika konfiguracji),
  * nic poza katalogiem backupow; kazda sciezka sprawdzana przed usunieciem.

Kasowanie jest odporne na dwa realne przypadki z 2026-10-08: obiekty `.git` z atrybutem read-only
(zdejmujemy atrybut przed kasowaniem) oraz nazwy zarezerwowane Windows, np. plik `nul` (fallback
`cmd /c del` z prefiksem `\\\\?\\`, potem `rmdir /S /Q`). Raport liczy TYLKO faktycznie usuniete wpisy.

Uzycie:
  python backup_retention.py            # proba (dry-run) — nic nie kasuje
  python backup_retention.py --apply    # faktycznie kasuje
  python backup_retention.py --apply --days 60 --keep 8

Wyjscie dla cron `no_agent`: linie tylko wtedy, gdy cos usunieto (pusto = nic nie ląduje na Telegramie).
"""
import argparse
import os
import re
import shutil
import stat
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

BACKUPS = Path.home() / ".hermes" / "backups"
MAX_AGE_DAYS = 30
NEWEST_KEEP = 5
PROTECTED = {"config", "config-snapshots"}
DATE_RE = re.compile(r"(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})")


def entry_size(p: Path) -> tuple[int, int]:
    if p.is_file():
        try:
            return p.stat().st_size, 1
        except OSError:
            return 0, 0
    size = files = 0
    for root, _dirs, names in os.walk(p):
        for n in names:
            try:
                size += os.path.getsize(os.path.join(root, n))
                files += 1
            except OSError:
                pass
    return size, files


def entry_date(p: Path) -> float:
    """Data wpisu: z nazwy, a gdy brak — mtime najnowszego pliku (epoch)."""
    m = DATE_RE.search(p.name)
    if m:
        try:
            y, mo, d = (int(x) for x in m.groups())
            ts = datetime(y, mo, d, tzinfo=timezone.utc).timestamp()
            if time.time() - 30 * 365 * 86400 < ts < time.time() + 86400:
                return ts
        except ValueError:
            pass
    newest = p.stat().st_mtime
    if p.is_dir():
        for root, _dirs, names in os.walk(p):
            for n in names:
                try:
                    newest = max(newest, os.path.getmtime(os.path.join(root, n)))
                except OSError:
                    pass
    return newest


def _free_write(p: Path) -> None:
    for root, dirs, files in os.walk(p):
        for name in files + dirs:
            try:
                os.chmod(os.path.join(root, name), stat.S_IWRITE)
            except OSError:
                pass


def remove(p: Path) -> bool:
    """Usuwa wpis odpornie (read-only .git, nazwy zarezerwowane). True = nie ma go juz na dysku."""
    if p.is_file():
        try:
            os.chmod(p, stat.S_IWRITE)
            p.unlink()
        except OSError:
            pass
        return not p.exists()
    _free_write(p)
    shutil.rmtree(p, ignore_errors=True)
    if not p.exists():
        return True
    subprocess.run(["cmd", "/c", "rmdir", "/S", "/Q", "\\\\?\\" + str(p)], capture_output=True)
    if not p.exists():
        return True
    subprocess.run(["cmd", "/c", "rmdir", "/S", "/Q", str(p)], capture_output=True)
    return not p.exists()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="faktycznie usun (domyslnie tylko proba)")
    ap.add_argument("--days", type=int, default=MAX_AGE_DAYS)
    ap.add_argument("--keep", type=int, default=NEWEST_KEEP)
    a = ap.parse_args()

    if not BACKUPS.is_dir():
        print(f"[retencja] brak katalogu {BACKUPS}")
        return 0

    entries = [p for p in BACKUPS.iterdir() if p.name not in PROTECTED]
    entries.sort(key=entry_date, reverse=True)
    cutoff = time.time() - a.days * 86400
    keep = {p.name for p in entries[: max(0, a.keep)]}

    victims, planned, planned_files = [], 0, 0
    for p in entries:
        if p.name in keep or entry_date(p) >= cutoff:
            continue
        try:
            p.resolve().relative_to(BACKUPS.resolve())  # tylko wnetrze katalogu backupow
        except ValueError:
            continue
        size, files = entry_size(p)
        victims.append((p, size, files))
        planned += size
        planned_files += files

    if not victims:
        return 0  # pusto = nic nie leci na Telegram

    freed = removed = failed = 0
    for p, size, files in victims:
        if a.apply:
            if remove(p):
                freed += size
                removed += 1
                print(f"[retencja] usunieto {p.name} — {size/1024/1024:.1f} MB, {files} plikow")
            else:
                failed += 1
                print(f"[retencja] NIE udalo sie usunac {p.name} — zostaje na dysku")
        else:
            print(f"[retencja] DO USUNIECIA {p.name} — {size/1024/1024:.1f} MB, {files} plikow")
    if a.apply:
        print(f"[retencja] zwolniono {freed/1024/1024:.0f} MB w {removed} wpisach"
              f"{f'; NIE udalo sie: {failed}' if failed else ''}; "
              f"zostawiono {min(len(entries), a.keep)} najnowszych + wpisy mlodsze niz {a.days} dni")
    else:
        print(f"[retencja] do zwolnienia: {planned/1024/1024:.0f} MB w {len(victims)} wpisach "
              f"({planned_files} plikow); zostawiono {min(len(entries), a.keep)} najnowszych + "
              f"wpisy mlodsze niz {a.days} dni")
    return 0


if __name__ == "__main__":
    sys.exit(main())
