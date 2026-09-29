'use strict';
/* Most MCP (Jarvis OS ⇄ Hermes): migawka narzędzi, wybór trybu MCP, kształt zapytania i wykonanie polecenia z mostu. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { load } = require('../harness.js');

const FILES = ['core.js', 'events.js', 'store.js', 'registry.js', 'undo.js', 'jev-policy.js', 'process.js', 'apps.js', 'widgets.js', 'chart.js', 'widget-spec.js', 'commands.js', 'search.js', 'commands-ext.js', 'commands-data.js', 'commands-w4.js', 'context.js', 'judge.js', 'jev-flow.js', 'ai.js', 'bridge.js'];   // jak domyślnie w harness.js + klient mostu
const DESKTOP = { hermesOn: true, hermesProvider: 'desktop', hermesUrl: 'http://localhost:8643/v1', hermesModel: 'jarvis-desktop', hermesKey: 'k', bridgeOn: false };

test('bridge/tools.json odpowiada Command Registry (node bridge/export-tools.js)', () => {
  const J = load();
  const want = J.registry.tools().map(t => t.function);
  const have = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'bridge', 'tools.json'), 'utf8'));
  assert.equal(JSON.stringify(have.map(t => t.name)), JSON.stringify(want.map(t => t.name)));
  assert.equal(JSON.stringify(have), JSON.stringify(want));
});

test('tryb MCP: tylko gdy most połączony i profil Hermesa z niego korzysta', () => {
  const J = load({ files: FILES, state: { settings: { ...DESKTOP } } });
  assert.equal(J.brain.mcp, false, 'most niepołączony');
  J.bridge.connected = true; J.bridge.hermes = { 'jarvis-desktop': 12 };
  assert.equal(J.brain.mcp, true);
  J.bridge.hermes = { 'jarvis-desktop': 5000 };
  assert.equal(J.brain.mcp, false, 'profil dawno się nie zgłaszał');
  J.state.settings.hermesMode = 'mcp';
  assert.equal(J.brain.mcp, true, 'wymuszony MCP');
  J.state.settings.hermesMode = 'prompt';
  assert.equal(J.brain.mcp, false, 'wymuszony prompt');
  J.state.settings.hermesMode = 'mcp'; J.state.settings.hermesProvider = 'openrouter';
  assert.equal(J.brain.mcp, false, 'chmura nie ma mostu');
});

test('zapytanie w trybie MCP: bez definicji narzędzi, krótki prompt, bez nagłówka X-Hermes-Session-Key', async () => {
  const reqs = [];
  const fetch = async (url, o = {}) => {
    reqs.push({ url, headers: o.headers || {}, body: o.body ? JSON.parse(o.body) : null });
    return { ok: true, status: 200, body: null, headers: { get: () => 'application/json' }, json: async () => ({ choices: [{ message: { content: 'Otworzyłem notatnik.' } }] }) };
  };
  const J = load({ files: FILES, fetch, state: { settings: { ...DESKTOP, hermesMode: 'mcp' } } });
  // bez DOM: czat, okna, orb i głos jako atrapy — testujemy tylko to, co idzie do Hermesa
  J.chat = { add: () => ({ set() { } }) }; J.wm.open = () => { }; J.wm.isOpen = () => true; J.wm.isMin = () => false;
  J.orb = { set() { }, state: 'idle' }; J.voice = { speak() { } }; J.state.settings.speech = false;
  const st = () => ({ done() { }, fail() { }, set() { }, append() { }, step: { ts: Date.now() } });
  J.proc = { start() { }, end() { }, step: st, plan() { }, planStep() { }, active: false }; J.sfx = new Proxy({}, { get: () => () => { } });
  await J.brain.handle('opowiedz mi coś ciekawego o teorii względności');
  const chat = reqs.find(r => /chat\/completions$/.test(r.url));
  assert.ok(chat, 'wysłano zapytanie do Hermesa');
  assert.equal(chat.body.tools, undefined);
  assert.match(chat.body.messages[0].content, /mcp__jarvis_desktop__/);
  assert.doesNotMatch(chat.body.messages[0].content, /<tools>/);
  assert.match(chat.body.messages.at(-1).content, /<environment>/);
  assert.equal(chat.headers['X-Hermes-Session-Key'], undefined);
  assert.equal(chat.headers.Authorization, 'Bearer k');
  assert.equal(reqs.filter(r => /chat\/completions$/.test(r.url)).length, 1, 'pętlę narzędzi prowadzi Hermes — jedna tura');
});

test('polecenie z mostu idzie przez rejestr i zwraca kopertę', async () => {
  const J = load({ files: FILES, state: { settings: { ...DESKTOP } } });
  const ok = await J.brain.run('create_note', { title: 'Z mostu', content: 'treść', show: false }, { source: 'hermes' });
  assert.equal(ok.ok, true); assert.equal(ok.code, 'OK');
  assert.ok(J.state.notes.some(n => n.title === 'Z mostu'));
  const bad = await J.brain.run('open_app', { app: 'nie-ma-takiej' }, { source: 'hermes' });
  assert.equal(bad.ok, false); assert.equal(bad.code, 'INVALID_ARGS');
});
