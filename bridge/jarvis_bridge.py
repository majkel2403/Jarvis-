"""Jarvis OS <-> Hermes: most MCP (streamable HTTP) i kanał SSE do przeglądarki.

Hermes (Agent) wywołuje narzędzia `mcp__jarvis_desktop__*` -> most przekazuje polecenie
do otwartej karty Jarvis OS (SSE /bridge/events) -> przeglądarka wykonuje je i odsyła
wynik (POST /bridge/result) -> wynik wraca do Hermesa jako wynik narzędzia.

Uruchamiaj środowiskiem Hermesa (ma mcp, starlette, uvicorn):
  %USERPROFILE%\\.hermes\\hermes-agent\\venv\\Scripts\\python.exe bridge\\jarvis_bridge.py
"""
from __future__ import annotations

import argparse
import asyncio
import atexit
import json
import os
import re
import secrets
import sys
import time
import uuid
from pathlib import Path
from typing import Optional

import agents as agents_mod   # bridge/agents.py: agent WWW i sterowanie komputerem
import writer_proxy           # bridge/writer_proxy.py: model pomocniczy (darmowe modele → Hermes)
import uvicorn
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import CallToolResult, TextContent, Tool
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse

DEFAULT_ORIGINS = ["http://localhost:4000", "http://127.0.0.1:4000", "https://majkel2403.github.io"]
CALL_TIMEOUT = float(os.environ.get("JARVIS_BRIDGE_CALL_TIMEOUT", "90"))   # zapas na potwierdzenie użytkownika (Tak / Nie)


def token_path() -> Path:
    return Path(os.environ.get("JARVIS_BRIDGE_TOKEN_FILE") or Path.home() / ".jarvis-os" / "bridge-token")


def load_token() -> str:
    env = os.environ.get("JARVIS_BRIDGE_TOKEN", "").strip()
    if env:
        return env
    p = token_path()
    if p.exists() and p.read_text(encoding="utf-8").strip():
        return p.read_text(encoding="utf-8").strip()
    p.parent.mkdir(parents=True, exist_ok=True)
    t = secrets.token_urlsafe(24)
    p.write_text(t, encoding="utf-8")
    try:
        os.chmod(p, 0o600)
    except OSError:
        pass
    return t


TOKEN = ""
ORIGINS: list[str] = []


class Browser:
    """Jedna otwarta karta Jarvis OS podłączona przez SSE."""

    def __init__(self) -> None:
        self.id = uuid.uuid4().hex[:8]
        self.queue: asyncio.Queue = asyncio.Queue()
        self.since = time.time()
        self.visible = False      # karta zgłasza, czy jest widoczna/aktywna
        self.focus_ts = 0.0


CLIENTS: dict[str, Browser] = {}
PENDING: dict[str, tuple[asyncio.Future, str]] = {}
HERMES_SEEN: dict[str, float] = {}   # nazwa profilu Hermesa (nagłówek X-Jarvis-Profile) -> ostatnie żądanie /mcp


def newest() -> Optional[Browser]:
    """Karta docelowa: widoczna > ostatnio aktywna > najnowsza (kilka kart nie miesza poleceń)."""
    return max(CLIENTS.values(), key=lambda c: (c.visible, c.focus_ts, c.since)) if CLIENTS else None


async def relay(name: str, args: dict) -> dict:
    """Wyślij polecenie do przeglądarki i poczekaj na wynik."""
    client = newest()
    if client is None:
        raise ToolError("Jarvis OS nie jest połączony z mostem — użytkownik musi mieć otwartą kartę Jarvis OS (np. http://localhost:4000) z włączonym mostem w Ustawieniach.")
    cid = uuid.uuid4().hex[:12]
    fut: asyncio.Future = asyncio.get_running_loop().create_future()
    PENDING[cid] = (fut, client.id)
    await client.queue.put({"id": cid, "name": name, "args": {k: v for k, v in args.items() if v is not None}})
    try:
        res = await asyncio.wait_for(fut, CALL_TIMEOUT)
    except asyncio.TimeoutError:
        raise ToolError(f"Przeglądarka nie odpowiedziała w {CALL_TIMEOUT:.0f} s (karta uśpiona, zablokowana albo brak zgody użytkownika).")
    finally:
        PENDING.pop(cid, None)
    return res


INSTRUCTIONS = (
    "Narzędzia sterują działającym pulpitem Jarvis OS w przeglądarce użytkownika (Command Registry Jarvis OS). "
    "Każdy wynik to JSON {ok, code, data, text}; kody: OK, NOT_FOUND, AMBIGUOUS, INVALID_ARGS, DENIED, DUPLICATE, OFFLINE, TIMEOUT. "
    "Zanim zmienisz lub usuniesz obiekt, którego id nie znasz, użyj *_list / *_read / *_search. "
    "Wynik narzędzia to prawda o stanie pulpitu — nie zakładaj powodzenia bez ok=true."
)
TOOLS_FILE = Path(os.environ.get("JARVIS_BRIDGE_TOOLS_FILE") or Path(__file__).resolve().parent / "tools.json")
# nazwa -> {name, description, parameters}; źródło: migawka tools.json, nadpisywana schematami z przeglądarki
TOOLS: dict[str, dict] = {}


def load_tools() -> None:
    try:
        data = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))
        TOOLS.clear()
        TOOLS.update({t["name"]: t for t in data if isinstance(t, dict) and t.get("name")})
    except (OSError, ValueError) as e:
        print(f"[jarvis-bridge] brak migawki narzędzi {TOOLS_FILE}: {e}", file=sys.stderr)


def update_tools(tools: list) -> bool:
    """Przeglądarka zgłasza aktualny rejestr. Zmiana trafia do pliku — Hermes zobaczy ją po restarcie gatewaya."""
    fresh = {t["name"]: {"name": t["name"], "description": str(t.get("description") or ""), "parameters": t.get("parameters") or {"type": "object", "properties": {}}}
             for t in tools if isinstance(t, dict) and isinstance(t.get("name"), str) and re.fullmatch(r"[a-z][a-z0-9_]{0,63}", t["name"])}
    if not fresh or fresh == TOOLS:
        return False
    TOOLS.clear()
    TOOLS.update(fresh)
    try:
        TOOLS_FILE.write_text(json.dumps(list(fresh.values()), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    except OSError:
        pass
    return True


class DesktopMCP(MCPServer):
    """Narzędzia nie są zakodowane w Pythonie: lista pochodzi z rejestru Jarvis OS, wywołanie idzie do karty przeglądarki."""

    async def list_tools(self) -> list[Tool]:
        return [Tool(name=t["name"], description=t["description"], input_schema=t["parameters"]) for t in TOOLS.values()]

    async def _handle_call_tool(self, ctx, params):  # noqa: ANN001 — sygnatura z MCPServer
        name, args = params.name, params.arguments or {}
        if name not in TOOLS:
            return CallToolResult(content=[TextContent(type="text", text=f"Nieznane narzędzie: {name}")], is_error=True)
        try:
            res = await relay(name, args)
        except ToolError as e:
            return CallToolResult(content=[TextContent(type="text", text=str(e))], is_error=True)
        payload = {k: res.get(k) for k in ("ok", "code", "data", "text")}
        return CallToolResult(content=[TextContent(type="text", text=json.dumps(payload, ensure_ascii=False, default=str))], is_error=not res.get("ok"))


mcp = DesktopMCP("jarvis-desktop", instructions=INSTRUCTIONS, version="2.0.0")


# ---------------------------------------------------------------- kanał przeglądarki

def cors(request: Request, resp: Response) -> Response:
    origin = request.headers.get("origin", "")
    if origin in ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Bridge-Token"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        if request.headers.get("access-control-request-private-network"):
            resp.headers["Access-Control-Allow-Private-Network"] = "true"
    return resp


def authorized(request: Request) -> bool:
    tok = request.headers.get("x-bridge-token") or request.query_params.get("token") or ""
    return secrets.compare_digest(tok, TOKEN)


@mcp.custom_route("/bridge/status", methods=["GET", "OPTIONS"])
async def status(request: Request) -> Response:
    if request.method == "OPTIONS":
        return cors(request, Response(status_code=204))
    if not authorized(request):
        return cors(request, JSONResponse({"error": "unauthorized"}, status_code=401))
    now = time.time()
    target = newest()
    try:
        agents_info = await get_agents().status()
    except Exception:  # noqa: BLE001 — status mostu nie może zależeć od agentów
        agents_info = None
    return cors(request, JSONResponse({"ok": True, "clients": len(CLIENTS), "tools": sorted(TOOLS),
                                       "browsers": [{"id": c.id, "visible": c.visible, "target": c is target} for c in CLIENTS.values()],
                                       "hermes": {k: round(now - v) for k, v in HERMES_SEEN.items()}, "agents": agents_info}))


@mcp.custom_route("/bridge/pair", methods=["GET", "OPTIONS"])
async def pair(request: Request) -> Response:
    """Zero-konfiguracji: token dostaje wyłącznie strona z dozwolonego Origin (przeglądarka nie pozwala go podrobić)."""
    if request.method == "OPTIONS":
        return cors(request, Response(status_code=204))
    if request.headers.get("origin", "") not in ORIGINS:
        return JSONResponse({"error": "origin not allowed"}, status_code=403)
    return cors(request, JSONResponse({"token": TOKEN}))


@mcp.custom_route("/bridge/events", methods=["GET", "OPTIONS"])
async def events(request: Request) -> Response:
    if request.method == "OPTIONS":
        return cors(request, Response(status_code=204))
    if not authorized(request):
        return cors(request, JSONResponse({"error": "unauthorized"}, status_code=401))
    client = Browser()
    CLIENTS[client.id] = client

    async def stream():
        try:
            yield f"retry: 3000\nevent: hello\ndata: {json.dumps({'client': client.id, 'tools': sorted(TOOLS)})}\n\n"
            while True:
                try:
                    cmd = await asyncio.wait_for(client.queue.get(), 15)
                    yield f"event: cmd\ndata: {json.dumps(cmd, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            CLIENTS.pop(client.id, None)
            for cid, (fut, owner) in list(PENDING.items()):
                if owner == client.id and not fut.done():
                    fut.set_result({"ok": False, "text": "Połączenie z kartą Jarvis OS zostało utracone w trakcie polecenia."})

    return cors(request, StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}))


@mcp.custom_route("/bridge/focus", methods=["POST", "OPTIONS"])
async def focus(request: Request) -> Response:
    if request.method == "OPTIONS":
        return cors(request, Response(status_code=204))
    if not authorized(request):
        return cors(request, JSONResponse({"error": "unauthorized"}, status_code=401))
    try:
        body = await request.json()
    except Exception:
        return cors(request, JSONResponse({"error": "bad json"}, status_code=400))
    c = CLIENTS.get(str(body.get("client", "")))
    if c:
        c.visible = bool(body.get("visible"))
        if c.visible:
            c.focus_ts = time.time()
    return cors(request, JSONResponse({"ok": bool(c)}))


@mcp.custom_route("/bridge/result", methods=["POST", "OPTIONS"])
async def result(request: Request) -> Response:
    if request.method == "OPTIONS":
        return cors(request, Response(status_code=204))
    if not authorized(request):
        return cors(request, JSONResponse({"error": "unauthorized"}, status_code=401))
    try:
        body = await request.json()
    except Exception:
        return cors(request, JSONResponse({"error": "bad json"}, status_code=400))
    entry = PENDING.get(str(body.get("id", "")))
    if entry and not entry[0].done():
        entry[0].set_result({"ok": bool(body.get("ok")), "code": body.get("code") or ("OK" if body.get("ok") else "INTERNAL"), "data": body.get("data"), "text": body.get("text")})
    return cors(request, JSONResponse({"ok": True}))


@mcp.custom_route("/bridge/tools", methods=["POST", "OPTIONS"])
async def tools_route(request: Request) -> Response:
    if request.method == "OPTIONS":
        return cors(request, Response(status_code=204))
    if not authorized(request):
        return cors(request, JSONResponse({"error": "unauthorized"}, status_code=401))
    try:
        body = await request.json()
    except Exception:
        return cors(request, JSONResponse({"error": "bad json"}, status_code=400))
    changed = update_tools(body.get("tools") or [])
    if changed:
        print(f"[jarvis-bridge] rejestr narzędzi zmieniony ({len(TOOLS)}) — zrestartuj gateway Hermesa, by je zobaczył", file=sys.stderr)
    return cors(request, JSONResponse({"ok": True, "tools": len(TOOLS), "changed": changed}))


# ---------------------------------------------------------------- agenci lokalni: WWW (Jev + Playwright) i komputer (Jev + Windows)

AGENTS: agents_mod.Agents | None = None


def get_agents() -> agents_mod.Agents:
    global AGENTS
    if AGENTS is None:
        AGENTS = agents_mod.Agents(TOKEN)
        atexit.register(AGENTS.shutdown)   # koniec mostu = koniec agenta WWW i ewentualnego zadania na komputerze
    return AGENTS


async def agents_guard(request: Request) -> Response | None:
    """OPTIONS i uwierzytelnienie; None = można przetwarzać."""
    if request.method == "OPTIONS":
        return cors(request, Response(status_code=204))
    if not authorized(request):
        return cors(request, JSONResponse({"error": "unauthorized"}, status_code=401))
    return None


async def read_json(request: Request) -> dict:
    if int(request.headers.get("content-length") or 0) > 65536:
        raise agents_mod.AgentError("za duże żądanie", 413)
    try:
        body = await request.json()
    except Exception:
        raise agents_mod.AgentError("bad json", 400)
    return body if isinstance(body, dict) else {}


def agent_error(request: Request, e: Exception) -> Response:
    if isinstance(e, agents_mod.AgentError):
        return cors(request, JSONResponse({"error": str(e)}, status_code=e.status))
    return cors(request, JSONResponse({"error": f"błąd agenta: {e}"}, status_code=500))


@mcp.custom_route("/agents/status", methods=["GET", "OPTIONS"])
async def agents_status(request: Request) -> Response:
    if (g := await agents_guard(request)) is not None:
        return g
    return cors(request, JSONResponse(await get_agents().status()))


WEB_ACTIONS = {"command": "POST", "confirm": "POST", "pick": "POST", "goto": "POST", "read": "GET", "state": "GET"}


@mcp.custom_route("/agents/web/{action}", methods=["GET", "POST", "OPTIONS"])
async def agents_web(request: Request) -> Response:
    if (g := await agents_guard(request)) is not None:
        return g
    action = request.path_params["action"]
    if WEB_ACTIONS.get(action) != request.method:
        return cors(request, JSONResponse({"error": "nie ma takiej akcji"}, status_code=404))
    try:
        path, body = f"/agent/{action}", None
        if request.method == "POST":
            body = await read_json(request)
        elif action == "read" and request.query_params.get("max", "").isdigit():
            path += "?max=" + request.query_params["max"]
        return cors(request, JSONResponse(await get_agents().web.call(request.method, path, body)))
    except Exception as e:  # noqa: BLE001 — każdy błąd agenta wraca do strony jako JSON
        return agent_error(request, e)


@mcp.custom_route("/agents/computer/{action}", methods=["GET", "POST", "OPTIONS"])
async def agents_computer(request: Request) -> Response:
    if (g := await agents_guard(request)) is not None:
        return g
    action, comp = request.path_params["action"], get_agents().computer
    try:
        if action == "run" and request.method == "POST":
            b = await read_json(request)
            return cors(request, JSONResponse(await comp.start(b.get("goal"), b.get("steps", 25), b.get("delay", 1.5))))
        if action == "status" and request.method == "GET":
            tail = request.query_params.get("tail", "25")
            return cors(request, JSONResponse(comp.snapshot(int(tail) if tail.isdigit() else 25)))
        if action == "stop" and request.method == "POST":
            return cors(request, JSONResponse(await comp.stop()))
    except Exception as e:  # noqa: BLE001
        return agent_error(request, e)
    return cors(request, JSONResponse({"error": "nie ma takiej akcji"}, status_code=404))


@mcp.custom_route("/writer/v1/chat/completions", methods=["POST"])
async def writer_completions(request: Request) -> Response:
    """Model pomocniczy clickera (OpenAI-compatible): darmowe modele OpenRouter z łańcuchem awaryjnym, na końcu Hermes. Tylko z tokenem mostu."""
    auth = request.headers.get("authorization", "")
    if not (auth.startswith("Bearer ") and secrets.compare_digest(auth[7:], TOKEN)) and not authorized(request):
        return JSONResponse({"error": {"message": "unauthorized"}}, status_code=401)
    try:
        body = await request.json()
        if not isinstance(body, dict) or not isinstance(body.get("messages"), list):
            raise ValueError("brak messages")
    except Exception:  # noqa: BLE001
        return JSONResponse({"error": {"message": "bad json"}}, status_code=400)
    try:
        reply, used = await writer_proxy.complete(body, agents_mod.openrouter_key(), log=lambda *a: print("[jarvis-bridge]", *a, file=sys.stderr))
    except RuntimeError as e:
        return JSONResponse({"error": {"message": str(e)}}, status_code=502)
    reply["x_jarvis_model"] = used
    return JSONResponse(reply)


class BearerGate:
    """Ścieżka /mcp wymaga nagłówka Authorization: Bearer <token>."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope["path"].startswith("/mcp"):
            auth = dict(scope["headers"]).get(b"authorization", b"").decode()
            if not (auth.startswith("Bearer ") and secrets.compare_digest(auth[7:], TOKEN)):
                await JSONResponse({"error": "unauthorized"}, status_code=401)(scope, receive, send)
                return
            prof = dict(scope["headers"]).get(b"x-jarvis-profile", b"").decode()[:64]
            if prof:
                HERMES_SEEN[prof] = time.time()
        await self.app(scope, receive, send)


def build_app(host: str = "127.0.0.1"):
    app = mcp.streamable_http_app(host=host, stateless_http=True, json_response=True)
    return BearerGate(app)


def main() -> None:
    global TOKEN, ORIGINS
    ap = argparse.ArgumentParser(description="Jarvis OS <-> Hermes MCP bridge")
    ap.add_argument("--host", default=os.environ.get("JARVIS_BRIDGE_HOST", "127.0.0.1"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("JARVIS_BRIDGE_PORT", "8651")))
    ap.add_argument("--show-token", action="store_true", help="wypisz token i zakończ")
    args = ap.parse_args()
    TOKEN = load_token()
    load_tools()
    ORIGINS = DEFAULT_ORIGINS + [o.strip() for o in os.environ.get("JARVIS_BRIDGE_ORIGINS", "").split(",") if o.strip()]
    if args.show_token:
        print(TOKEN)
        return
    print(f"[jarvis-bridge] {len(TOOLS)} narzędzi | MCP: http://{args.host}:{args.port}/mcp  |  przeglądarka: /bridge/events  |  token: {token_path()}", file=sys.stderr)
    uvicorn.run(build_app(args.host), host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
