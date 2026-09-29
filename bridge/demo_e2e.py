"""Demo/test end-to-end: klient MCP (jak Hermes) steruje PRAWDZIWYM pulpitem Jarvis OS otwartym w przeglądarce.

Wymaga uruchomionego mostu i otwartej karty Jarvis OS:
  %USERPROFILE%\\.hermes\\hermes-agent\\venv\\Scripts\\python.exe bridge\\demo_e2e.py
"""
import asyncio
import json
import os
import sys
from pathlib import Path

import httpx2
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

URL = os.environ.get("JARVIS_BRIDGE_URL", "http://127.0.0.1:8651")
TOKEN = os.environ.get("JARVIS_BRIDGE_TOKEN") or (Path.home() / ".jarvis-os" / "bridge-token").read_text().strip()


async def main():
    async with httpx2.AsyncClient(headers={"Authorization": f"Bearer {TOKEN}"}, timeout=60) as hc:
        async with streamable_http_client(f"{URL}/mcp", http_client=hc) as streams:
            async with ClientSession(streams[0], streams[1]) as s:
                await s.initialize()

                async def call(name, args=None):
                    r = await s.call_tool(name, args or {})
                    txt = r.content[0].text if r.content else ""
                    print(f"{'ERR' if r.is_error else 'ok '} {name:18} {txt[:150]}")
                    return r.is_error, txt

                _, st = await call("get_desktop_state")
                await call("create_widget", {"type": "list", "title": "E2E zakupy", "items": ["mleko", "chleb", "masło"]})
                await call("create_widget", {"type": "note", "title": "E2E notatka", "content": "Utworzone przez MCP"})
                state = json.loads((await call("get_desktop_state"))[1])
                lst = next(w for w in state["widgets"] if w["title"] == "E2E zakupy")
                note = next(w for w in state["widgets"] if w["title"] == "E2E notatka")
                await call("update_widget", {"id": lst["id"], "toggle": "chleb"})
                await call("update_widget", {"id": lst["id"], "add_items": ["ser"]})
                await call("update_widget", {"id": note["id"], "content": "Zmienione przez MCP"})
                await call("arrange_windows", {"layout": "tile"})
                await call("window_control", {"app": note["window_id"], "action": "minimize"})
                await call("window_control", {"app": note["window_id"], "action": "focus"})
                await call("create_note", {"title": "E2E notatka MCP", "content": "linia 1"})
                state = json.loads((await call("get_desktop_state"))[1])
                nid = next(n["id"] for n in state["notes"] if n["title"] == "E2E notatka MCP")
                await call("update_note", {"id": nid, "body": "linia 2", "append": True})
                await call("read_note", {"id": nid})
                await call("delete_note", {"id": nid})
                await call("add_task", {"text": "E2E zadanie", "time": "23:59"})
                state = json.loads((await call("get_desktop_state"))[1])
                tid = next(t["id"] for t in state["tasks_today"] if t["text"] == "E2E zadanie")
                await call("update_task", {"id": tid, "done": True})
                await call("update_task", {"id": tid, "delete": True})
                err, _ = await call("window_control", {"app": "w:nie-ma", "action": "close"})
                assert err, "nieistniejące okno powinno dać błąd"
                await call("update_widget", {"id": "nie-ma", "content": "x"})
                print("\n>>> widgety zostawione do wizualnej weryfikacji: E2E zakupy, E2E notatka")


asyncio.run(main())
