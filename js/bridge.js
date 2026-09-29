/* =========================================================
   JARVIS OS — most do Hermesa (MCP)
   Hermes wywołuje natywne narzędzia mcp__jarvis_desktop__* → most (bridge/jarvis_bridge.py)
   → SSE do tej karty → wykonujemy akcję tak samo jak polecenie użytkownika → wynik wraca do Hermesa.
   ========================================================= */
'use strict';
(() => {
const S = () => J.state.settings;
const base = () => String(S().bridgeUrl || 'http://127.0.0.1:8651').replace(/\/+$/, '');
let es = null, retry = 0, retryTimer = null, pollTimer = null, sig = '', myId = '';

J.bridge = { status: 'off', connected: false, tools: [], hermes: {}, checked: 0, connect, disconnect, refresh };
const set = st => { const ch = J.bridge.status !== st; J.bridge.status = st; J.bridge.connected = st === 'up'; if (ch) J.emit('bridge'); };

/* czy Hermes, z którym rozmawiamy, rzeczywiście używa mostu (profil = nazwa modelu) — wtedy tryb „auto” = MCP */
J.bridge.hermesUses = model => {
  const s = J.bridge.hermes[model]; return J.bridge.connected && s != null && s < 900;
};

async function refresh() {
  if (!J.bridge.connected || !S().bridgeToken) return;
  try {
    const r = await fetch(base() + '/bridge/status', { headers: { 'X-Bridge-Token': S().bridgeToken }, signal: AbortSignal.timeout(5000) });
    if (r.ok) { const j = await r.json(); J.bridge.hermes = j.hermes || {}; J.bridge.checked = Date.now(); J.emit('bridge'); }
  } catch (e) { /* most chwilowo niedostępny */ }
}

async function autoPair() {
  try {
    const r = await fetch(base() + '/bridge/pair', { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return false;
    const j = await r.json(); if (!j.token) return false;
    S().bridgeToken = j.token; J.save(); return true;
  } catch (e) { return false; }
}

async function handle(cmd) {
  let r;
  try { r = await J.brain.run(cmd.name, cmd.args || {}); }
  catch (e) { r = { ok: false, text: 'Błąd pulpitu: ' + e.message }; }
  try {
    await fetch(base() + '/bridge/result', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Bridge-Token': S().bridgeToken }, body: JSON.stringify({ id: cmd.id, ok: !!r.ok, text: String(r.text ?? '') }) });
  } catch (e) { /* most zniknął — Hermes dostanie timeout */ }
}

/* zgłaszamy mostowi, czy ta karta jest widoczna — polecenia trafiają do aktywnej karty, nie do „najnowszej” */
const reportFocus = () => {
  if (!myId || !S().bridgeToken) return;
  fetch(base() + '/bridge/focus', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Bridge-Token': S().bridgeToken }, body: JSON.stringify({ client: myId, visible: document.visibilityState === 'visible' && document.hasFocus() }) }).catch(() => { });
};
document.addEventListener('visibilitychange', reportFocus); addEventListener('focus', reportFocus); addEventListener('blur', reportFocus);

function disconnect(quiet) {
  clearTimeout(retryTimer); clearInterval(pollTimer);
  if (es) { es.close(); es = null; }
  if (!quiet) set('off');
}

async function connect() {
  disconnect(true);
  if (!S().bridgeOn) return set('off');
  if (!S().bridgeToken && !(await autoPair())) return set('down');
  set('connecting');
  es = new EventSource(base() + '/bridge/events?token=' + encodeURIComponent(S().bridgeToken));
  es.addEventListener('hello', e => {
    retry = 0; try { const h = JSON.parse(e.data); J.bridge.tools = h.tools || []; myId = h.client || ''; } catch (er) { }
    reportFocus();
    set('up'); refresh(); clearInterval(pollTimer); pollTimer = setInterval(refresh, 20000);
    J.log('Most Hermes połączony', J.bridge.tools.length + ' narzędzi MCP dostępnych dla Hermesa', 'info');
  });
  es.addEventListener('cmd', e => { try { handle(JSON.parse(e.data)); } catch (er) { console.error(er); } });
  es.onerror = async () => {
    if (es) { es.close(); es = null; }
    clearInterval(pollTimer); set('down');
    if (retry === 0 && S().bridgeToken) { const old = S().bridgeToken; S().bridgeToken = ''; if (await autoPair() && S().bridgeToken !== old) { retry = 0; return connect(); } S().bridgeToken = old; J.save(); }
    retryTimer = setTimeout(connect, Math.min(30000, 1500 * 2 ** Math.min(retry++, 5)));
  };
}

/* przełączenie ustawień → reconnect tylko gdy zmieniła się konfiguracja mostu */
J.on('settings', () => { const n = [S().bridgeOn, S().bridgeUrl, S().bridgeToken].join('|'); if (n !== sig) { sig = n; connect(); } });
sig = [S().bridgeOn, S().bridgeUrl, S().bridgeToken].join('|');
setTimeout(connect, 600);
})();
