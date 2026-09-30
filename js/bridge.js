/* =========================================================
   JARVIS OS — most do Hermesa (MCP)
   Hermes wywołuje natywne narzędzia mcp__jarvis_desktop__* → most (bridge/jarvis_bridge.py)
   → SSE do tej karty → wykonanie z Command Registry (walidacja, uprawnienia, Process Log)
   → koperta {ok, code, data, text} wraca do Hermesa jako wynik narzędzia.
   Po połączeniu karta wysyła mostowi schematy z rejestru, więc Hermes widzi te same narzędzia co silnik lokalny.
   ========================================================= */
'use strict';
(() => {
const S = () => J.state.settings;
const base = () => String(S().bridgeUrl || 'http://127.0.0.1:8651').replace(/\/+$/, '');
const auth = () => ({ 'Content-Type': 'application/json', 'X-Bridge-Token': S().bridgeToken });
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
    const r = await fetch(base() + '/bridge/status', { headers: auth(), signal: AbortSignal.timeout(5000) });
    if (r.ok) { const j = await r.json(); J.bridge.hermes = j.hermes || {}; J.bridge.agents = j.agents || null; J.bridge.tools = j.tools || J.bridge.tools; J.bridge.checked = Date.now(); J.emit('bridge'); }
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

/* schematy z rejestru → most (zapisuje je do bridge/tools.json; Hermes zobaczy zmiany po restarcie gatewaya) */
async function publishTools() {
  try {
    const tools = J.registry.tools().map(t => t.function);
    const r = await fetch(base() + '/bridge/tools', { method: 'POST', headers: auth(), body: JSON.stringify({ tools }) });
    const j = await r.json();
    /* most ma nowszą wersję Jarvisa niż ta karta (np. po wdrożeniu) — odśwież raz, gdy Jarvis nic nie robi; inaczej Hermes wołałby
       narzędzia, których ta karta nie zna */
    if (j.stale) {
      let done = false; try { done = sessionStorage.getItem('jarvis-stale-reload') === String(j.tools); } catch (e) { }
      if (!done) {
        try { sessionStorage.setItem('jarvis-stale-reload', String(j.tools)); } catch (e) { }
        J.toast?.('Jest nowsza wersja Jarvisa — odświeżam kartę', 4000);
        const go = () => (J.brain?.queue || busyNow()) ? setTimeout(go, 3000) : location.reload();
        setTimeout(go, 2500);
      } else J.log('Most: ta karta ma starszą wersję Jarvisa', 'Brakuje: ' + (j.missing || []).slice(0, 5).join(', ') + ' — odśwież stronę (Ctrl+F5)', 'warn');
    }
    if (j.changed) J.log('Most: zmieniona lista narzędzi', 'Zrestartuj gateway Hermesa (hermes\\start-desktop-gateway.bat), by zobaczył ' + j.tools + ' narzędzi', 'warn');
  } catch (e) { /* most starszej wersji albo chwilowo niedostępny */ }
}

/* Hermes jarvis-desktop bez ręcznej konfiguracji. Karta z ustawieniem domyślnym (:8642 bez klucza — to inny profil) albo z
   niedziałającym Hermesem sama bierze adres, model i klucz od mostu. Własnego wyboru (chmura, własny serwer) nie ruszamy. */
let hermesTried = 0;
async function ensureHermes(why) {
  const s = S();
  if (s.offlineMode || !S().bridgeToken || Date.now() - hermesTried < 60000) return false;
  if (!['agent', 'desktop', '', undefined].includes(s.hermesProvider)) return false;
  const unset = !s.hermesKey || /:8642\b/.test(s.hermesUrl || '') || !s.hermesUrl;
  if (!unset && J.hermes.status !== 'down') return false;
  hermesTried = Date.now();
  try {
    const r = await fetch(base() + '/bridge/hermes', { headers: auth(), signal: AbortSignal.timeout(5000) });
    if (!r.ok) return false;
    const j = await r.json(); if (!j.url || !j.key) return false;
    if (s.hermesUrl === j.url && s.hermesKey === j.key && s.hermesModel === j.model && s.hermesOn) return false;
    Object.assign(s, { hermesProvider: j.preset || 'desktop', hermesUrl: j.url, hermesModel: j.model, hermesKey: j.key, hermesOn: true });
    J.save(); J.emit('settings'); J.brain?.reset?.();
    J.log('Hermes połączony automatycznie', 'Profil ' + j.model + ' (' + j.url + ') — ustawienie wzięte z mostu (' + why + ')', 'info');
    J.toast?.('Połączono z Hermesem (' + j.model + ')', 4000);
    J.hermesPing?.();
    return true;
  } catch (e) { return false; }
}
J.bridge.ensureHermes = ensureHermes;
J.on('hermes', () => { if (J.hermes.status === 'down' && J.bridge.connected) ensureHermes('Hermes nie odpowiadał'); });

const busyNow = () => !!document.querySelector('.orb.thinking, #orb.thinking') || J.orb?.state === 'thinking';

const safe = v => { try { return JSON.parse(JSON.stringify(v ?? null)); } catch (e) { return null; } };
async function handle(cmd) {
  let r;
  try { r = await J.brain.run(cmd.name, cmd.args || {}, { source: 'hermes' }); }
  catch (e) { r = { ok: false, code: 'INTERNAL', text: 'Błąd pulpitu: ' + e.message, data: null }; }
  if (!J.brain.busy) J.chat?.add('action', (r.ok ? '⚙ ' : '⚠ ') + 'Hermes (most): ' + cmd.name + ' → ' + r.text);
  try {
    await fetch(base() + '/bridge/result', { method: 'POST', headers: auth(), body: JSON.stringify({ id: cmd.id, ok: !!r.ok, code: r.code, data: safe(r.data), text: String(r.text ?? '') }) });
  } catch (e) { /* most zniknął — Hermes dostanie timeout */ }
}

/* zgłaszamy mostowi, czy ta karta jest widoczna — polecenia trafiają do aktywnej karty, nie do „najnowszej” */
const reportFocus = () => {
  if (!myId || !S().bridgeToken) return;
  fetch(base() + '/bridge/focus', { method: 'POST', headers: auth(), body: JSON.stringify({ client: myId, visible: document.visibilityState === 'visible' && document.hasFocus() }) }).catch(() => { });
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
  if (!S().bridgeToken && !(await autoPair())) { set('down'); retryTimer = setTimeout(connect, Math.min(30000, 1500 * 2 ** Math.min(retry++, 5))); return; }
  set('connecting');
  es = new EventSource(base() + '/bridge/events?token=' + encodeURIComponent(S().bridgeToken));
  es.addEventListener('hello', e => {
    retry = 0; try { const h = JSON.parse(e.data); J.bridge.tools = h.tools || []; myId = h.client || ''; } catch (er) { }
    reportFocus(); publishTools(); ensureHermes('start');
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
