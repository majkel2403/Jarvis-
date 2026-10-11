"""Backup bazy stanu Hermesa (state.db) — wywoływany przez cron no-agent.

Bezpieczna kopia SQLite: VACUUM INTO (zamiast kopii pliku) — nie łamie -wal/-shm,
nie wymaga zatrzymywania gatewaya, wynik to spójna kawałek bazy.

Pusty stdout = OK. Inaczej wypisuje przyczynę (idzie na Telegram przez strażnika).
"""
import sys
import time
from pathlib import Path

HOME = Path.home()
PROFILE = HOME / ".hermes" / "profiles" / "jarvis-desktop"
STATE_DB = PROFILE / "state.db"
BACKUP_ROOT = PROFILE / "backups" / "state-db"
KEEP_DAYS = 5  # trzymaj ~5 kopii (codzienne sprzatanie i tak ucina do 5 najnowszych)

problems: list[str] = []


def main() -> int:
    if not STATE_DB.exists():
        problems.append(f"brak {STATE_DB}")
        return 1

    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    today = time.strftime("%Y-%m-%d")
    dest = BACKUP_ROOT / f"state-{today}.db"

    # VACUUM INTO odmawia, gdy plik docelowy istnieje (drugi bieg tego samego dnia) — piszemy do .tmp i podmieniamy.
    # Zapas: API backup() SQLite (też spójne przy WAL); surowa kopia pliku żywej bazy nie jest spójna (2026-10-11).
    import sqlite3
    tmp = dest.with_suffix(".db.tmp")
    tmp.unlink(missing_ok=True)
    try:
        src = sqlite3.connect(str(STATE_DB))
        try:
            src.execute("VACUUM INTO ?", (str(tmp),))
        finally:
            src.close()
    except Exception as e:  # noqa: BLE001
        try:
            tmp.unlink(missing_ok=True)
            src, dst = sqlite3.connect(str(STATE_DB)), sqlite3.connect(str(tmp))
            try:
                src.backup(dst)
            finally:
                dst.close()
                src.close()
        except Exception as e2:  # noqa: BLE001
            tmp.unlink(missing_ok=True)
            problems.append(f"backup nieudany: VACUUM={e}; backup()={e2}")
            return 1
    tmp.replace(dest)

    # Retencja: kasuj kopie starsze niż KEEP_DAYS dni
    cutoff = time.time() - KEEP_DAYS * 86400
    for old in BACKUP_ROOT.glob("state-*.db*"):
        if old.stat().st_mtime < cutoff:
            old.unlink()
    return 0


if __name__ == "__main__":
    code = main()
    if problems:
        for p in problems:
            print(p)
    sys.exit(code if problems else 0)
