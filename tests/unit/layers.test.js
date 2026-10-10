/* Warstwy: dekoracja pulpitu (tło, scena, orb, karty HUD) NIGDY nie leży nad oknami.
   Tokeny --z-desk / --z-hud / --z-win w :root są jedynym źródłem tych liczb — okna startują od --z-win w górę
   (licznik w js/core.js), więc każdy skok z-indexu na warstwie dekoracyjnej zasłoniłby treść. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load, refShort } = require('../harness.js');
const ROOT = path.join(__dirname, '..', '..');
const css = fs.readFileSync(path.join(ROOT, 'css', 'jarvis.css'), 'utf8');
const core = fs.readFileSync(path.join(ROOT, 'js', 'core.js'), 'utf8');

const token = name => { const m = new RegExp('--' + name + ':\\s*(\\d+)').exec(css); assert.ok(m, 'brak tokenu --' + name + ' w :root'); return +m[1]; };
const reguly = [];
css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^{}]+)\{([^{}]*)\}/g, (_, sel, body) => { reguly.push([sel.trim(), body]); return ''; });
const zIndex = sel => { for (const [s, body] of reguly) if (s.split(',').map(x => x.trim()).includes(sel)) { const m = /z-index\s*:\s*([^;}]+)/.exec(body); if (m) return m[1].trim(); } return null; };
const liczba = v => { const t = /var\(\s*--([a-z-]+)\s*\)/.exec(v); if (t) return token(t[1]); const n = parseFloat(v); return isNaN(n) ? null : n; };

test('tokeny warstw są uporządkowane: tło < HUD < okna', () => {
  const desk = token('z-desk'), hud = token('z-hud'), win = token('z-win');
  assert.ok(desk < hud && hud < win, `--z-desk ${desk} < --z-hud ${hud} < --z-win ${win}`);
});

test('każda warstwa dekoracyjna stoi na tokenie i leży pod oknami', () => {
  const win = token('z-win');
  const dekor = ['#fx', '.hud-frame', '#flowCanvas', '#flowCanvas.over', '.hud', '.hud.busy', '.deck', '.sysicons'];
  dekor.forEach(sel => {
    const surowa = zIndex(sel);
    assert.ok(surowa, sel + ' nie ma z-index w css/jarvis.css');
    assert.match(surowa, /^var\(--z-(desk|hud)\)$/, sel + ' musi używać tokenu --z-desk/--z-hud (a ma: ' + surowa + ')');
    const z = liczba(surowa);
    assert.ok(z < win, sel + ' (z-index ' + z + ') zasłoniłby okna (--z-win ' + win + ')');
  });
});

test('okna startują od --z-win i są nad kartami HUD (realne okna pulpitu)', () => {
  const win = token('z-win'), hud = token('z-hud');
  const m = /let z = (\d+)/.exec(core);
  assert.ok(m, 'nie znalazłem licznika okien w js/core.js');
  assert.ok(+m[1] >= win, `licznik okien ${m[1]} musi startować od --z-win ${win}`);
  const J = load({ dom: true, state: { settings: { sound: false, speech: false } } }); J.__ctx.setTimeout = refShort;
  J.wm.open('notes'); J.wm.open('calc');
  const z1 = +J.wm.ctx('notes').el.style.zIndex, z2 = +J.wm.ctx('calc').el.style.zIndex;
  assert.ok(z1 > hud && z2 > hud, `okna (${z1}, ${z2}) muszą być nad HUD (${hud})`);
  assert.ok(z1 >= win && z2 >= win, `okna (${z1}, ${z2}) muszą startować od --z-win (${win})`);
});
