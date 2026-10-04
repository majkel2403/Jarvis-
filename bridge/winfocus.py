# -*- coding: utf-8 -*-
"""Okno przeglądarki z Jarvis OS na wierzch (Windows, bez zależności — ctypes).

Używane przez narzędzie desktop_open: karta mogła stać za innymi oknami, na drugim monitorze albo zminimalizowana —
wtedy okno zgody i cały pulpit są dla użytkownika niewidoczne. Dopasowujemy WYŁĄCZNIE okna znanych przeglądarek,
których tytuł zaczyna się od tytułu strony („Jarvis OS”), żeby nie ruszyć cudzego okna (np. edytora z plikiem „jarvis”).
"""
from __future__ import annotations

import os
import time

BROWSERS = {"comet", "chrome", "msedge", "firefox", "brave", "opera", "vivaldi", "arc", "chromium", "yandex"}
TITLE = "Jarvis OS"


def _exe_of(hwnd) -> str:
    import ctypes
    from ctypes import wintypes as wt
    user32, kernel32 = ctypes.windll.user32, ctypes.windll.kernel32
    pid = wt.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    h = kernel32.OpenProcess(0x1000, False, pid.value)   # PROCESS_QUERY_LIMITED_INFORMATION
    if not h:
        return ""
    try:
        buf, n = ctypes.create_unicode_buffer(1024), wt.DWORD(1024)
        if kernel32.QueryFullProcessImageNameW(h, 0, buf, ctypes.byref(n)):
            return os.path.splitext(os.path.basename(buf.value))[0].lower()
        return ""
    finally:
        kernel32.CloseHandle(h)


def find(title: str = TITLE) -> list[tuple[int, str, str]]:
    """[(hwnd, tytuł, exe)] widocznych okien przeglądarek z tytułem zaczynającym się od `title`."""
    if os.name != "nt":
        return []
    import ctypes
    from ctypes import wintypes as wt
    user32 = ctypes.windll.user32
    out: list[tuple[int, str, str]] = []

    @ctypes.WINFUNCTYPE(wt.BOOL, wt.HWND, wt.LPARAM)
    def cb(hwnd, _lp):
        n = user32.GetWindowTextLengthW(hwnd)
        if n and user32.IsWindowVisible(hwnd):
            buf = ctypes.create_unicode_buffer(n + 1)
            user32.GetWindowTextW(hwnd, buf, n + 1)
            if buf.value.startswith(title):
                exe = _exe_of(hwnd)
                if exe in BROWSERS:
                    out.append((hwnd, buf.value, exe))
        return True

    user32.EnumWindows(cb, 0)
    return out


def bring_to_front(title: str = TITLE) -> dict:
    """Przywraca (gdy zminimalizowane) i aktywuje okno. Zwraca {found, title, browser, foreground}."""
    wins = find(title)
    if not wins:
        return {"found": False}
    import ctypes
    user32, kernel32 = ctypes.windll.user32, ctypes.windll.kernel32
    hwnd, wtitle, exe = wins[0]
    if user32.IsIconic(hwnd):
        user32.ShowWindow(hwnd, 9)   # SW_RESTORE
    # Windows nie pozwala procesowi w tle zabrać fokusu; dołączenie do wątku okna z fokusem to standardowe obejście
    fg = user32.GetForegroundWindow()
    fg_tid = user32.GetWindowThreadProcessId(fg, None)
    me = kernel32.GetCurrentThreadId()
    attached = bool(fg_tid and fg_tid != me and user32.AttachThreadInput(me, fg_tid, True))
    try:
        user32.BringWindowToTop(hwnd)
        user32.SetForegroundWindow(hwnd)
    finally:
        if attached:
            user32.AttachThreadInput(me, fg_tid, False)
    time.sleep(0.15)
    if user32.GetForegroundWindow() != hwnd:   # ostatnia deska: puste naciśnięcie Alt odblokowuje SetForegroundWindow
        user32.keybd_event(0x12, 0, 0, 0)
        user32.keybd_event(0x12, 0, 2, 0)
        user32.SetForegroundWindow(hwnd)
        time.sleep(0.15)
    return {"found": True, "title": wtitle, "browser": exe, "foreground": user32.GetForegroundWindow() == hwnd}
