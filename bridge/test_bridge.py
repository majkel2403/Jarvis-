"""Test integracyjny mostu: symulowana przeglądarka (SSE) + prawdziwy klient MCP.

  %USERPROFILE%\\.hermes\\hermes-agent\\venv\\Scripts\\python.exe bridge\\test_bridge.py
"""
import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import aiohttp
import httpx2
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

HERE = Path(__file__).parent
PORT = int(os.environ.get("TEST_PORT", "18651"))
TOKEN = "test-token-123"
BASE = f"http://127.0.0.1:{PORT}"
fails = []


def check(name, cond, extra=""):
    print(("  ok   " if cond else "  FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))
    if not cond:
        fails.append(name)


async def fake_browser(seen, stop):
    """Udaje kartę Jarvis OS: odbiera polecenia i odsyła wyniki."""
    async with aiohttp.ClientSession() as s:
        async with s.get(f"{BASE}/bridge/events?token={TOKEN}", headers={"Origin": "http://localhost:4000"}) as r:
            seen["cors"] = r.headers.get("Access-Control-Allow-Origin")
            event = None
            async for raw in r.content:
                line = raw.decode().rstrip("\n")
                if line.startswith("event:"):
                    event = line[6:].strip()
                elif line.startswith("data:") and event == "cmd":
                    cmd = json.loads(line[5:])
                    seen.setdefault("cmds", []).append(cmd)
                    if cmd["name"] == "boom":
                        res = {"id": cmd["id"], "ok": False, "text": "Nie ma takiego okna"}
                    elif cmd["name"] == "slow":
                        continue
                    else:
                        res = {"id": cmd["id"], "ok": True, "text": f"wykonano {cmd['name']} {json.dumps(cmd['args'], ensure_ascii=False)}"}
                    await s.post(f"{BASE}/bridge/result", json=res, headers={"X-Bridge-Token": TOKEN})
                elif line.startswith("event: hello") or (event == "hello" and line.startswith("data:")):
                    seen["hello"] = json.loads(line[5:]) if line.startswith("data:") else None
                    seen["ready"] = True
                if stop.is_set():
                    return


async def sse_client(respond, info):
    """Druga/trzecia „karta”: zapisuje swoje id z hello; opcjonalnie odpowiada na polecenia."""
    async with aiohttp.ClientSession() as s:
        async with s.get(f"{BASE}/bridge/events?token={TOKEN}", headers={"Origin": "http://localhost:4000"}) as r:
            event = None
            async for raw in r.content:
                line = raw.decode().strip()
                if line.startswith("event:"):
                    event = line[6:].strip()
                elif line.startswith("data:"):
                    data = json.loads(line[5:])
                    if event == "hello":
                        info["id"] = data["client"]
                    elif event == "cmd":
                        info["got"] = info.get("got", 0) + 1
                        if respond:
                            await s.post(f"{BASE}/bridge/result", json={"id": data["id"], "ok": True, "text": "odp z widocznej"}, headers={"X-Bridge-Token": TOKEN})


async def main():
    tools_copy = Path(tempfile.mkdtemp()) / "tools.json"
    tools_copy.write_text((HERE / "tools.json").read_text(encoding="utf-8"), encoding="utf-8")
    expected = json.loads(tools_copy.read_text(encoding="utf-8"))
    env = dict(os.environ, JARVIS_BRIDGE_TOKEN=TOKEN, JARVIS_BRIDGE_PORT=str(PORT), JARVIS_BRIDGE_CALL_TIMEOUT="3", JARVIS_BRIDGE_TOOLS_FILE=str(tools_copy))
    proc = subprocess.Popen([sys.executable, str(HERE / "jarvis_bridge.py")], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        async with httpx2.AsyncClient() as hc:
            for _ in range(360):   # import mcp bywa wolny (antywirus): do 90 s
                try:
                    if (await hc.get(f"{BASE}/bridge/status")).status_code in (200, 401):
                        break
                except Exception:
                    await asyncio.sleep(0.25)
            else:
                proc.kill(); raise RuntimeError("most nie wystartował: " + proc.stderr.read().decode()[:400])

            print("Autoryzacja i CORS")
            check("status bez tokenu = 401", (await hc.get(f"{BASE}/bridge/status")).status_code == 401)
            check("status z tokenem = 200", (await hc.get(f"{BASE}/bridge/status", headers={"X-Bridge-Token": TOKEN})).status_code == 200)
            check("/mcp bez Bearer = 401", (await hc.post(f"{BASE}/mcp", json={})).status_code == 401)
            pre = await hc.options(f"{BASE}/bridge/result", headers={"Origin": "http://localhost:4000", "Access-Control-Request-Private-Network": "true"})
            check("preflight + PNA", pre.headers.get("access-control-allow-origin") == "http://localhost:4000" and pre.headers.get("access-control-allow-private-network") == "true", str(dict(pre.headers)))
            pair_ok = await hc.get(f"{BASE}/bridge/pair", headers={"Origin": "http://localhost:4000"})
            check("pair: dozwolony Origin dostaje token", pair_ok.status_code == 200 and pair_ok.json().get("token") == TOKEN)
            check("pair: brak Origin = 403", (await hc.get(f"{BASE}/bridge/pair")).status_code == 403)
            check("pair: obcy Origin = 403", (await hc.get(f"{BASE}/bridge/pair", headers={"Origin": "http://evil.example"})).status_code == 403)
            evil = await hc.options(f"{BASE}/bridge/result", headers={"Origin": "http://evil.example"})
            check("obcy Origin bez CORS", "access-control-allow-origin" not in evil.headers)

        headers = {"Authorization": f"Bearer {TOKEN}", "X-Jarvis-Profile": "jarvis-desktop"}
        async with httpx2.AsyncClient(headers=headers) as http_client:
            async with streamable_http_client(f"{BASE}/mcp", http_client=http_client) as streams:
                async with ClientSession(streams[0], streams[1]) as session:
                    await session.initialize()
                    tools = await session.list_tools()
                    names = sorted(t.name for t in tools.tools)
                    print("\nMCP: narzędzia")
                    check(f"narzędzia z rejestru ({len(expected)})", names == sorted(t["name"] for t in expected), str(len(names)) + " " + str(names))
                    oa = next(t for t in tools.tools if t.name == "open_app")
                    check("schema open_app: enum aplikacji z rejestru", "notes" in oa.input_schema["properties"]["app"].get("enum", []), json.dumps(oa.input_schema)[:300])

                    print("\nBrak przeglądarki")
                    r = await session.call_tool("wm_list", {})
                    check("błąd gdy karta niepodłączona", r.is_error and "nie jest połączony" in r.content[0].text, str(r))

                    seen, stop = {}, asyncio.Event()
                    task = asyncio.create_task(fake_browser(seen, stop))
                    for _ in range(40):
                        if seen.get("ready"):
                            break
                        await asyncio.sleep(0.1)
                    check("przeglądarka podłączona (hello)", bool(seen.get("ready")))
                    check("CORS dla SSE", seen.get("cors") == "http://localhost:4000", str(seen.get("cors")))

                    print("\nPrzekazywanie poleceń")
                    r = await session.call_tool("create_widget", {"type": "list", "title": "Zakupy", "items": ["mleko", "chleb"]})
                    txt = r.content[0].text
                    check("create_widget dotarł do przeglądarki", not r.is_error and "create_widget" in txt and "mleko" in txt, txt)
                    cmd = seen["cmds"][-1]
                    check("argumenty nienull (content pominięty)", cmd["args"] == {"type": "list", "title": "Zakupy", "items": ["mleko", "chleb"]}, json.dumps(cmd))
                    env_ = json.loads(txt)
                    check("koperta wyniku {ok, code, data, text}", env_.get("ok") is True and env_.get("code") == "OK" and "text" in env_, txt)
                    r = await session.call_tool("wm_minimize", {"app": "notes"})
                    check("wm_minimize", not r.is_error and "wm_minimize" in r.content[0].text, str(r))
                    r = await session.call_tool("focus_mode", {"on": False})
                    check("bool false nie jest gubiony", seen["cmds"][-1]["args"] == {"on": False}, json.dumps(seen["cmds"][-1]))

                    print("\nBłędy")
                    r = await session.call_tool("boom", {})
                    check("nieznane narzędzie = błąd", r.is_error and "Nieznane" in r.content[0].text, str(r))

                    print("\nRejestr z przeglądarki")
                    async with httpx2.AsyncClient() as hc4:
                        extra = expected + [{"name": "boom", "description": "test", "parameters": {"type": "object", "properties": {}}}]
                        rr = (await hc4.post(f"{BASE}/bridge/tools", json={"tools": extra}, headers={"X-Bridge-Token": TOKEN})).json()
                        check("POST /bridge/tools aktualizuje listę", rr.get("changed") is True and rr.get("tools") == len(extra), json.dumps(rr))
                        check("POST /bridge/tools bez tokenu = 401", (await hc4.post(f"{BASE}/bridge/tools", json={"tools": extra})).status_code == 401)
                    check("migawka zapisana na dysk", any(t["name"] == "boom" for t in json.loads(tools_copy.read_text(encoding="utf-8"))))
                    r = await session.call_tool("boom", {})
                    check("błąd z pulpitu -> is_error z kodem", r.is_error and json.loads(r.content[0].text).get("ok") is False, str(r))

                    print("\nWykrywanie profilu Hermesa")
                    async with httpx2.AsyncClient() as hc2:
                        st = (await hc2.get(f"{BASE}/bridge/status", headers={"X-Bridge-Token": TOKEN})).json()
                    check("most widzi profil z nagłówka X-Jarvis-Profile", "jarvis-desktop" in st.get("hermes", {}) and st["hermes"]["jarvis-desktop"] < 30, json.dumps(st.get("hermes")))

                    stop.set()
                    task.cancel()
                    await asyncio.sleep(0.3)
                    r = await session.call_tool("wm_list", {})
                    check("po rozłączeniu karty znów błąd", r.is_error and "nie jest połączony" in r.content[0].text, str(r))
                    print("\nRouting do aktywnej karty")
                    a, b = {}, {}
                    ta = asyncio.create_task(sse_client(True, a)); await asyncio.sleep(0.4)
                    tb = asyncio.create_task(sse_client(False, b)); await asyncio.sleep(0.6)   # b jest NOWSZA
                    async with httpx2.AsyncClient() as hc3:
                        hd = {"X-Bridge-Token": TOKEN}
                        await hc3.post(f"{BASE}/bridge/focus", json={"client": a["id"], "visible": True}, headers=hd)
                        await hc3.post(f"{BASE}/bridge/focus", json={"client": b["id"], "visible": False}, headers=hd)
                        st = (await hc3.get(f"{BASE}/bridge/status", headers=hd)).json()
                    check("status wskazuje kartę docelową", any(x["target"] and x["id"] == a["id"] for x in st["browsers"]), json.dumps(st.get("browsers")))
                    r = await session.call_tool("wm_list", {})
                    check("polecenie trafia do widocznej (starszej) karty", not r.is_error and "widocznej" in r.content[0].text and not b.get("got"), str(r)[:200])
                    async with httpx2.AsyncClient() as hc3:
                        await hc3.post(f"{BASE}/bridge/focus", json={"client": a["id"], "visible": False}, headers=hd)
                        await hc3.post(f"{BASE}/bridge/focus", json={"client": b["id"], "visible": True}, headers=hd)
                    r = await session.call_tool("wm_list", {})
                    check("po zmianie aktywnej karty polecenie idzie do niej (b głucha -> timeout)", r.is_error and b.get("got") == 1, str(r)[:200])
                    ta.cancel(); tb.cancel()

    finally:
        proc.terminate()
        try:
            proc.wait(5)
        except subprocess.TimeoutExpired:
            proc.kill()
    print("\n" + ("WSZYSTKO OK" if not fails else f"BŁĘDY ({len(fails)}): " + ", ".join(fails)))
    sys.exit(1 if fails else 0)


asyncio.run(main())
