#!/usr/bin/env python3
"""Wrapper dla cronu Hermesa — pole `--script` nie przekazuje argumentow, wiec wolamy
backup_retention.py z `--apply` przez subprocess. Puste wyjscie = nic nie wysylamy na Telegram."""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, "backup_retention.py")


def main() -> int:
    r = subprocess.run([sys.executable, TARGET, "--apply"],
                       capture_output=True, text=True, timeout=900)
    sys.stdout.write(r.stdout or "")
    if r.returncode:
        sys.stderr.write(r.stderr or "")
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
