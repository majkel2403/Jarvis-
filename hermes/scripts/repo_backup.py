"""Kopia repo Jarvis OS (budzet 0, bez modelu).

Robi to samo, co Documents/jarvis-backup-desktop.ps1: git bundle (cala historia) + drzewo
robocze bez node_modules, do Documents/JarvisDesktop-Backup-<stamp>. Trzyma 3 najnowsze kopie.
Milczy, gdy OK (pusty stdout = nic nie leci na Telegram); wypisuje alert, gdy kopia sie nie udala.
Stare kopie kasuje odpornie: zdejmuje atrybut read-only (obiekty .git) i ma fallback
`cmd /c rmdir /S /Q` z prefiksem \\?\ — bez tego Windows zwraca WinError 5.
AUTO/STOP wstrzymuje prace.
"""
import os
import shutil
import stat
import subprocess
import sys
from pathlib import Path

HOME = Path.home()
AUTO = HOME / "JarvisWorkspace" / "AUTO"
SKRYPT = HOME / "Documents" / "jarvis-backup-desktop.ps1"
KOPIE = HOME / "Documents"
ZOSTAW = 3


def _free_write(p: Path) -> None:
    for root, dirs, files in os.walk(p):
        for name in files + dirs:
            try:
                os.chmod(os.path.join(root, name), stat.S_IWRITE)
            except OSError:
                pass


def remove(p: Path) -> bool:
    """Usuwa kopie odpornie (read-only .git, nazwy zarezerwowane). True = nie ma jej juz na dysku."""
    _free_write(p)
    shutil.rmtree(p, ignore_errors=True)
    if not p.exists():
        return True
    subprocess.run(["cmd", "/c", "rmdir", "/S", "/Q", "\\\\?\\" + str(p)], capture_output=True)
    if not p.exists():
        return True
    subprocess.run(["cmd", "/c", "rmdir", "/S", "/Q", str(p)], capture_output=True)
    return not p.exists()


def main():
    if (AUTO / "STOP").exists():
        return 0
    if not SKRYPT.exists():
        print(f"ALERT kopia Jarvis OS: brak skryptu {SKRYPT} — sprawdz recznie")
        return 0
    try:
        p = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(SKRYPT)],
            capture_output=True, text=True, errors="replace", timeout=1800,
        )
        out = (p.stdout or "") + (p.stderr or "")
    except Exception as e:
        print(f"ALERT kopia Jarvis OS nie uruchomila sie ({e}) — sprawdz recznie")
        return 0
    if p.returncode != 0 or "BACKUP_COMPLETE=YES" not in out:
        tail = "\n".join("   " + ln for ln in out.strip().splitlines()[-6:])
        print(f"ALERT kopia Jarvis OS nie udala sie (rc={p.returncode}):\n{tail}")
        return 0
    stare = sorted((d for d in KOPIE.glob("JarvisDesktop-Backup-*") if d.is_dir()), reverse=True)[ZOSTAW:]
    for d in stare:
        if not remove(d):
            print(f"ALERT kopia Jarvis OS: nie usunalem starej kopii {d.name} — sprawdz recznie")
    return 0


if __name__ == "__main__":
    sys.exit(main())
