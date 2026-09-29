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
import json
import os
import secrets
import sys
import time
import uuid
from pathlib import Path
from typing import Literal, Optional

import uvicorn
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse

APP_IDS = Literal["chat", "notes", "market", "schedule", "monitor", "terminal", "weather", "calc", "timer", "settings", "library"]
DEFAULT_ORIGINS = ["http://localhost:4000", "http://127.0.0.1:4000", "https://majkel2403.github.io"]
CALL_TIMEOUT = float(os.environ.get("JARVIS_BRIDGE_CALL_TIMEOUT", "20"))


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


CLIENTS: dict[str, Browser] = {}
PENDING: dict[str, tuple[asyncio.Future, str]] = {}
HERMES_SEEN: dict[str, float] = {}   # nazwa profilu Hermesa (nagłówek X-Jarvis-Profile) -> ostatnie żądanie /mcp


def newest() -> Optional[Browser]:
    return max(CLIENTS.values(), key=lambda c: c.since) if CLIENTS else None


async def relay(name: str, args: dict) -> str:
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
        raise ToolError(f"Przeglądarka nie odpowiedziała w {CALL_TIMEOUT:.0f} s (karta uśpiona lub zablokowana).")
    finally:
        PENDING.pop(cid, None)
    if not res.get("ok"):
        raise ToolError(str(res.get("text") or "Nieznany błąd po stronie pulpitu"))
    return str(res.get("text") or "OK")


INSTRUCTIONS = (
    "Narzędzia sterują działającym pulpitem Jarvis OS w przeglądarce użytkownika. "
    "Przed edycją lub usunięciem czegokolwiek wywołaj get_desktop_state, żeby poznać id okien, widgetów, notatek i zadań. "
    "Wynik każdego narzędzia to prawda o stanie pulpitu — nie zakładaj powodzenia bez niego."
)
mcp = MCPServer("jarvis-desktop", instructions=INSTRUCTIONS, version="1.0.0")


@mcp.tool()
async def get_desktop_state() -> str:
    """Pełny stan pulpitu jako JSON: okna (id, stan), widgety (id + zawartość), notatki (id), zadania (id), minutnik, skróty, motyw, dostępne aplikacje. Wywołaj przed edycją/usuwaniem, by poznać id."""
    return await relay("get_desktop_state", {})


@mcp.tool()
async def open_app(app: APP_IDS) -> str:
    """Otwiera lub przenosi na wierzch aplikację (okno). calc=interaktywny kalkulator, notes=notatnik, market=kursy krypto, schedule=harmonogram, monitor, terminal, weather, timer=minutnik/stoper, settings, library, chat."""
    return await relay("open_app", {"app": app})


@mcp.tool()
async def close_app(app: str) -> str:
    """Zamyka okno aplikacji (id z get_desktop_state) albo wszystkie okna, gdy app="all". "all" tylko na wyraźną prośbę."""
    return await relay("close_app", {"app": app})


@mcp.tool()
async def window_control(app: str, action: Literal["focus", "minimize", "maximize", "restore", "close"]) -> str:
    """Steruje jednym oknem: focus (na wierzch), minimize, maximize, restore (przywróć rozmiar), close. app to id okna z get_desktop_state (aplikacja, np. notes, albo widget w:xxxx)."""
    return await relay("window_control", {"app": app, "action": action})


@mcp.tool()
async def arrange_windows(layout: Literal["tile", "cascade", "minimize_all"]) -> str:
    """Układa otwarte okna: tile (kafelki), cascade (kaskada), minimize_all (pokaż pulpit)."""
    return await relay("arrange_windows", {"layout": layout})


@mcp.tool()
async def create_widget(type: Literal["note", "list", "result", "calc"], title: str, content: Optional[str] = None, items: Optional[list[str]] = None) -> str:
    """Tworzy widget na pulpicie. note=edytowalna notatka (content), list=lista z checkboxami (items), result=karta z wynikiem/podsumowaniem (content), calc=mini kalkulator. Do interaktywnego kalkulatora użyj open_app calc."""
    return await relay("create_widget", {"type": type, "title": title, "content": content, "items": items})


@mcp.tool()
async def update_widget(id: str, title: Optional[str] = None, content: Optional[str] = None, items: Optional[list[str]] = None,
                        add_items: Optional[list[str]] = None, toggle: Optional[str] = None, remove_item: Optional[str] = None) -> str:
    """Edytuje istniejący widget (id z get_desktop_state). note/result: content. list: items (zastąp całość), add_items (dopisz), toggle (odhacz/odznacz po tekście lub numerze 1..n), remove_item (usuń pozycję). title zmienia tytuł."""
    return await relay("update_widget", {"id": id, "title": title, "content": content, "items": items, "add_items": add_items, "toggle": toggle, "remove_item": remove_item})


@mcp.tool()
async def create_note(title: str, content: str) -> str:
    """Tworzy nową notatkę w Notatniku i otwiera ją."""
    return await relay("create_note", {"title": title, "content": content})


@mcp.tool()
async def read_note(id: str) -> str:
    """Czyta pełną treść notatki po id (id z get_desktop_state)."""
    return await relay("read_note", {"id": id})


@mcp.tool()
async def update_note(id: str, title: Optional[str] = None, body: Optional[str] = None, append: bool = False) -> str:
    """Zmienia tytuł i/lub treść notatki. append=true dopisuje body na końcu zamiast zastępować."""
    return await relay("update_note", {"id": id, "title": title, "body": body, "append": append})


@mcp.tool()
async def delete_note(id: str) -> str:
    """Usuwa notatkę po id. Tylko na wyraźną prośbę użytkownika."""
    return await relay("delete_note", {"id": id})


@mcp.tool()
async def add_task(text: str, time: Optional[str] = None, date: Optional[str] = None) -> str:
    """Dodaje zadanie/przypomnienie do Harmonogramu. time=HH:MM (opcjonalnie; o tej godzinie Jarvis przypomni głosem), date=YYYY-MM-DD (domyślnie dziś)."""
    return await relay("add_task", {"text": text, "time": time, "date": date})


@mcp.tool()
async def update_task(id: str, done: Optional[bool] = None, text: Optional[str] = None, time: Optional[str] = None, delete: Optional[bool] = None) -> str:
    """Zmienia zadanie z harmonogramu po id: done (ukończ/odznacz), text, time (HH:MM) albo delete=true (usuń)."""
    return await relay("update_task", {"id": id, "done": done, "text": text, "time": time, "delete": delete})


@mcp.tool()
async def start_timer(seconds: float, label: Optional[str] = None) -> str:
    """Uruchamia minutnik na podaną liczbę sekund (max 86400) i otwiera go."""
    return await relay("start_timer", {"seconds": seconds, "label": label})


@mcp.tool()
async def set_theme(color: Literal["jarvis", "cyjan", "niebieski", "fiolet", "zielony", "złoty", "czerwony", "różowy"]) -> str:
    """Zmienia kolor akcentu interfejsu."""
    return await relay("set_theme", {"color": color})


@mcp.tool()
async def set_wallpaper(wallpaper: Literal["photo", "aurora", "void"]) -> str:
    """Zmienia tapetę pulpitu: photo (miasto nocą), aurora, void (pustka)."""
    return await relay("set_wallpaper", {"wallpaper": wallpaper})


@mcp.tool()
async def add_shortcut(name: str, app: Optional[APP_IDS] = None, url: Optional[str] = None) -> str:
    """Dodaje ikonę skrótu na pulpit — do aplikacji Jarvis OS (app) albo strony WWW (url)."""
    return await relay("add_shortcut", {"name": name, "app": app, "url": url})


@mcp.tool()
async def open_url(url: str) -> str:
    """Otwiera stronę WWW w nowej karcie przeglądarki użytkownika."""
    return await relay("open_url", {"url": url})


@mcp.tool()
async def focus_mode(on: bool) -> str:
    """Włącza/wyłącza tryb skupienia (minimalizuje okna, wycisza tło)."""
    return await relay("focus_mode", {"on": on})


TOOL_NAMES = sorted(t.name for t in mcp._tool_manager.list_tools())  # noqa: SLF001


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
    return cors(request, JSONResponse({"ok": True, "clients": len(CLIENTS), "tools": TOOL_NAMES,
                                       "hermes": {k: round(now - v) for k, v in HERMES_SEEN.items()}}))


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
            yield f"retry: 3000\nevent: hello\ndata: {json.dumps({'client': client.id, 'tools': TOOL_NAMES})}\n\n"
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
        entry[0].set_result({"ok": bool(body.get("ok")), "text": body.get("text")})
    return cors(request, JSONResponse({"ok": True}))


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
    ORIGINS = DEFAULT_ORIGINS + [o.strip() for o in os.environ.get("JARVIS_BRIDGE_ORIGINS", "").split(",") if o.strip()]
    if args.show_token:
        print(TOKEN)
        return
    print(f"[jarvis-bridge] MCP: http://{args.host}:{args.port}/mcp  |  przeglądarka: /bridge/events  |  token: {token_path()}", file=sys.stderr)
    uvicorn.run(build_app(args.host), host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
