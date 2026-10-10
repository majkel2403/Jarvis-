"""Sprzatanie na biezaco — kopie i cache, zeby dysk sie nie zapychal.

Uruchamiane codziennie przez cron (no_agent, 0 USD). Milczy, gdy nie ma czego usunac;
wypisuje jedna linie z podsumowaniem, gdy cos zwolnilo miejsce.

Reguly (stale, na gorze pliku):
  - kopie bazy stanu (backups/state-db): 5 najnowszych i nie starsze niz 14 dni,
  - kopie repo Jarvis OS (Documents/JarvisDesktop-Backup-*): 3 najnowsze,
  - cache/audio: 14 dni, cache/terminal-output: 3 dni, cache/scratch: 7 dni,
  - logi profilu: 14 dni, wyniki cronow (cron/output): 30 dni,
  - kosz sejfu (*.trash / .obsidian/trash) nie ruszany,
  - AUTO/STOP wstrzymuje prace.
"""
import shutil
import sys
import time
from pathlib import Path

H = Path.home()
PROFILE = H / ".hermes" / "profiles" / "jarvis-desktop"
AUTO = H / "JarvisWorkspace" / "AUTO"
DZIEN = 86400.0

AUDIO_DNI = 14
TERMINAL_DNI = 3
SCRATCH_DNI = 7
LOGI_DNI = 14
CRON_OUTPUT_DNI = 30
STATE_DB_SZTUK = 5
STATE_DB_DNI = 14
REPO_KOPII = 3


def rozmiar(p):
    return p.stat().st_size if p.is_file() else 0


def starsze_niz(d, dni, wyjatki=()):
    """Usuwa pliki starsze niz `dni` w katalogu d. Zwraca (bajty, liczba)."""
    if not d.exists():
        return 0, 0
    prog = time.time() - dni * DZIEN
    bajty = liczba = 0
    for f in sorted(d.rglob("*")):
        if not f.is_file() or f.name in wyjatki:
            continue
        try:
            st = f.stat()
            if st.st_mtime < prog:
                bajty += st.st_size
                f.unlink()
                liczba += 1
        except OSError:
            pass
    for kat in sorted((x for x in d.rglob("*") if x.is_dir()), reverse=True):
        try:
            kat.rmdir()
        except OSError:
            pass
    return bajty, liczba


def zostaw_najnowsze(d, ile, wzorzec="*"):
    """Zostawia `ile` najnowszych plikow pasujacych do wzorca, reszte kasuje."""
    if not d.exists():
        return 0, 0
    pliki = sorted((f for f in d.glob(wzorzec) if f.is_file()), key=lambda f: f.stat().st_mtime, reverse=True)
    bajty = liczba = 0
    for f in pliki[ile:]:
        try:
            bajty += rozmiar(f)
            f.unlink()
            liczba += 1
        except OSError:
            pass
    return bajty, liczba


def zostaw_katalogi(d, ile, wzorzec="*"):
    if not d.exists():
        return 0, 0
    kat = sorted((x for x in d.glob(wzorzec) if x.is_dir()), key=lambda x: x.stat().st_mtime, reverse=True)
    bajty = liczba = 0
    for x in kat[ile:]:
        try:
            for r, _ds, fs in x.walk():
                for f in fs:
                    bajty += rozmiar(f)
            shutil.rmtree(x)
            liczba += 1
        except OSError:
            pass
    return bajty, liczba


def main():
    if (AUTO / "STOP").exists():
        return 0
    kroki = []
    # 1. kopie bazy stanu: najpierw limit wieku, potem liczba sztuk
    b, n = starsze_niz(PROFILE / "backups" / "state-db", STATE_DB_DNI)
    kroki.append(("kopie bazy (wiek)", b, n))
    b, n = zostaw_najnowsze(PROFILE / "backups" / "state-db", STATE_DB_SZTUK)
    kroki.append(("kopie bazy (sztuki)", b, n))
    # 2. kopie repo
    b, n = zostaw_katalogi(H / "Documents", REPO_KOPII, "JarvisDesktop-Backup-*")
    kroki.append(("kopie repo", b, n))
    # 3. cache
    b, n = starsze_niz(PROFILE / "cache" / "audio", AUDIO_DNI)
    kroki.append(("audio", b, n))
    b, n = starsze_niz(PROFILE / "cache" / "terminal-output", TERMINAL_DNI)
    kroki.append(("wyniki terminala", b, n))
    b, n = starsze_niz(PROFILE / "cache" / "scratch", SCRATCH_DNI, wyjatki={".last_prune"})
    kroki.append(("scratch", b, n))
    # 4. logi i wyniki cronow
    b, n = starsze_niz(PROFILE / "logs", LOGI_DNI)
    kroki.append(("logi", b, n))
    b, n = starsze_niz(PROFILE / "cron" / "output", CRON_OUTPUT_DNI)
    kroki.append(("wyniki cronow", b, n))

    razem = sum(b for _, b, _ in kroki)
    if razem > 0:
        opis = ", ".join(f"{nm} -{b/2**20:.1f} MB" for nm, b, _ in kroki if b > 0)
        linia = f"Sprzatanie: zwolnione {razem/2**20:.1f} MB ({opis})"
        log = PROFILE / "logs" / "sprzatanie.log"
        try:
            with log.open("a", encoding="utf-8") as fh:
                fh.write(f"{time.strftime('%Y-%m-%d %H:%M')}  {linia}\n")
        except OSError:
            pass
        print(linia)
    return 0


if __name__ == "__main__":
    sys.exit(main())
