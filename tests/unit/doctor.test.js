'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { parseEnv, patchEnv, diagnose } = require('../../tools/hermes-doctor');
const mock = require('../mock-hermes');

test('parseEnv: komentarze, cudzysłowy, export, CRLF', () => {
  const e = parseEnv('# x\r\nexport A=1\r\nB="dwa"\r\n  C = trzy \r\n#D=4\r\n');
  assert.deepEqual(e, { A: '1', B: 'dwa', C: 'trzy' });
});
test('patchEnv: pusty plik dostaje ENABLED i origin', () => {
  const r = patchEnv('', 'http://localhost:4000');
  assert.deepEqual(r.changes, ['API_SERVER_ENABLED=true', 'API_SERVER_CORS_ORIGINS=http://localhost:4000']);
  assert.match(r.text, /API_SERVER_CORS_ORIGINS=http:\/\/localhost:4000\n$/);
});
test('patchEnv: dopisuje origin do istniejącej listy, nie duplikuje, zachowuje CRLF i klucz', () => {
  const src = 'API_SERVER_KEY=k\r\nAPI_SERVER_ENABLED=true\r\nAPI_SERVER_CORS_ORIGINS=https://a.pl\r\n';
  const r = patchEnv(src, 'http://localhost:4000');
  assert.equal(r.text, 'API_SERVER_KEY=k\r\nAPI_SERVER_ENABLED=true\r\nAPI_SERVER_CORS_ORIGINS=https://a.pl,http://localhost:4000\r\n');
  assert.deepEqual(patchEnv(r.text, 'http://localhost:4000').changes, []);
});
test('patchEnv: gwiazdka lub już obecny origin = brak zmian', () => {
  assert.deepEqual(patchEnv('API_SERVER_ENABLED=1\nAPI_SERVER_CORS_ORIGINS=*\n', 'http://localhost:4000').changes, []);
});
test('diagnose: wykrywa brak CORS, zły klucz i poprawną konfigurację (atrapa gateway)', async () => {
  const jarvis = await new Promise(res => { const s = require('http').createServer((q, r) => { r.end('ok'); }); s.listen(0, '127.0.0.1', () => res(s)); });
  const J = 'http://127.0.0.1:' + jarvis.address().port;
  const gw = await mock.start({ port: 0, key: 'k', cors: [] });
  try {
    const url = gw.url;
    let r = await diagnose({ jarvis: J, url, key: 'k' });
    assert.equal(r.ok, false); assert.ok(r.checks.find(c => /^CORS/.test(c.name) && !c.ok));
    r = await diagnose({ jarvis: J, url, key: 'zly' });
    assert.ok(r.checks.find(c => c.name === 'Klucz API' && !c.ok));
    const gw2 = await mock.start({ port: 0, key: 'k', cors: [J] });
    r = await diagnose({ jarvis: J, url: gw2.url, key: 'k' });
    assert.equal(r.ok, true, JSON.stringify(r.checks.filter(c => !c.ok)));
    await gw2.close();
  } finally { await gw.close(); jarvis.close(); }
});
