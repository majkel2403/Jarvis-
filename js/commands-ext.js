/* =========================================================
   JARVIS OS — polecenia rozszerzone (specyfikacja docs/spec, fale W1–W5).
   Te same zasady co w commands.js: jeden wpis = narzędzie modelu + wzorce parsera + pozycja palety;
   każda zmiana danych zwraca funkcję cofającą (undo), a poziom autonomii wynika z js/jev-policy.js.
   ========================================================= */
'use strict';
(() => {
const R = J.registry, { ok, fail } = R, norm = J.norm;
const K = J.cmdKit, APP_IDS = J.APP_IDS, APP_NAMES = J.APP_NAMES;
const { findNote, resolveWin, winName, notOpen, cut } = K;

/* =================== W1 · NAWIGACJA =================== */
/* widoki w aplikacjach (docs/spec/03-nawigacja.md §3) */
const VIEWS = {
  notes: { note: 'notatka (tytuł albo id)', search: 'wyszukiwanie w notatkach' },
  schedule: { day: 'dzień (data, jutro, piątek)' },
  timer: { timer: 'minutnik', stopwatch: 'stoper' },
  market: { coin: 'waluta (BTC, ETH, SOL, BNB)' },
  weather: { city: 'miasto' },
  settings: { section: 'sekcja ustawień' },
  terminal: { run: 'wpisz polecenie (bez wykonania)' },
  calc: { expr: 'wpisz wyrażenie' },
  library: { apps: 'aplikacje', shortcuts: 'nowy skrót' },
  monitor: { section: 'fps, pamięć, sieć, dane, bateria, okna' },
  chat: {}
};
const COIN = { bitcoin: 'BTC', btc: 'BTC', ethereum: 'ETH', eth: 'ETH', eter: 'ETH', solana: 'SOL', solane: 'SOL', solany: 'SOL', sol: 'SOL', bnb: 'BNB', binance: 'BNB' };
const coinOf = t => { const n = norm(t); return COIN[n] || Object.entries(COIN).find(([k]) => new RegExp('\\b' + k).test(n))?.[1] || (/^[a-z]{2,6}$/.test(n) ? n.toUpperCase() : null); };
const DEFAULT_VIEW = { notes: 'note', schedule: 'day', timer: 'timer', market: 'coin', weather: 'city', settings: 'section', terminal: 'run', calc: 'expr', library: 'apps', monitor: 'section' };
R.add({ id: 'app_view', group: 'Nawigacja', label: 'Przejdź do widoku w aplikacji', description: 'Otwiera aplikację na konkretnym widoku: notes note|search, schedule day, timer timer|stopwatch, market coin, weather city, settings section, terminal run (tylko wpisuje), calc expr, library apps|shortcuts, monitor section. Nawigacja — niczego nie zmienia.', idempotent: true, writes: ['windows'],
  args: { type: 'object', properties: { app: { type: 'string', enum: APP_IDS }, view: { type: 'string' }, target: { type: 'string' } }, required: ['app'] },
  examples: ['pokaz stoper', 'pokaz zakladke stoper [w minutniku]', 'otworz minutnik na stoperze', 'pokaz {target} w rynku', 'otworz terminal z {target}', 'otworz kalkulator z {target}', 'pokaz skroty w bibliotece'],
  parse(raw, n) {
    let m;
    if (/^(pokaz|otworz|wlacz|przejdz do)\s+(zakladke\s+)?stoper(a)?(\s+w\s+minutniku)?$/.test(n) || /^otworz minutnik na stoperze$/.test(n)) return { args: { app: 'timer', view: 'stopwatch' }, score: 40 };
    if ((m = /^(?:pokaz|przejdz do|otworz)\s+(.+?)\s+w\s+(?:monitorze rynku|rynku|monitorze)$/.exec(n)) && coinOf(m[1])) return { args: { app: 'market', view: 'coin', target: coinOf(m[1]) }, score: 40 };
    if ((m = /^(?:otworz|pokaz|przejdz do)\s+ustawienia\s+(?:na\s+sekcji|w\s+sekcji|sekcja|na\s+sekcje)\s+(.+)$/.exec(n))) { const sec = R.aliases.section?.find(([, re]) => re.test(m[1]))?.[0]; if (sec) return { args: { app: 'settings', view: 'section', target: sec }, score: 35 }; }
    if ((m = /^otworz terminal z\s+(.+)$/.exec(n))) return { args: { app: 'terminal', view: 'run', target: raw.slice(n.indexOf(m[1])) }, score: 40 };
    if ((m = /^otworz kalkulator z\s+(.+)$/.exec(n))) return { args: { app: 'calc', view: 'expr', target: raw.slice(n.indexOf(m[1])) }, score: 40 };
    if (/^pokaz skroty( w bibliotece)?$/.test(n)) return { args: { app: 'library', view: 'shortcuts' }, score: 30 };
    return null;
  },
  async run({ app, view, target }) {
    const views = VIEWS[app] || {}; view = view || DEFAULT_VIEW[app];
    if (view && !views[view]) return fail('INVALID_ARGS', winName(app) + ' nie ma widoku „' + view + '”.' + (Object.keys(views).length ? ' Są: ' + Object.entries(views).map(([k, v]) => k + ' (' + v + ')').join(', ') + '.' : ''));
    let t = target, label = target;
    if (app === 'notes' && view === 'note' && target) { const f = await findNote(target); if (f.err) return f.err; t = f.note.id; label = f.note.title; }
    if (app === 'schedule' && target) { t = J.nlp.date(target) || J.nlp.date('w ' + target) || J.nlp.date('za ' + target); if (!t) return fail('INVALID_ARGS', 'Nie rozumiem dnia „' + target + '”.'); label = new Date(t + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }); }
    if (app === 'market' && target) { t = coinOf(target); if (!t || !J.market.COINS.some(c => c.sym === t)) return fail('NOT_FOUND', 'Monitor rynku nie ma waluty „' + target + '”. Są: ' + J.market.COINS.map(c => c.sym).join(', ') + '.'); }
    if (app === 'settings' && target) { const sec = R.aliases.section?.find(([id, re]) => id === norm(target) || re.test(norm(target)))?.[0]; if (!sec) return fail('NOT_FOUND', 'Nie ma sekcji ustawień „' + target + '”.'); t = sec; }
    J.wm.open(app, view ? { view, target: t } : undefined); J.emit('app-view');
    return ok({ app, view, target: t }, winName(app) + (view && view !== DEFAULT_VIEW[app] || t ? ': ' + (views[view] ? (label || views[view]) : view) : '') + '.', { highlight: app });
  } });
R.get('app_view').slotOptions = { view: a => Object.keys(VIEWS[a?.app] || {}) };

R.add({ id: 'nav_forward', group: 'Nawigacja', label: 'Dalej (po „wróć”)', description: 'Idzie do przodu w historii okien i widoków — odwrotność nav_back.', idempotent: false, writes: ['windows'],
  examples: ['dalej', 'naprzod', 'idz dalej', 'wroc do przodu', 'do przodu'],
  parse(raw, n) { return /^(dalej|naprzod|idz dalej|wroc do przodu|do przodu|nastepny widok)$/.test(n) ? { args: {}, score: 30 } : null; },
  run() { const r = J.nav.forward(); return r.ok ? ok({ app: r.app, view: r.view }, r.text, { highlight: r.app }) : fail('NOT_FOUND', r.text); } });

/* =================== W1 · OKNA =================== */
R.add({ id: 'wm_pin', group: 'Aplikacje i okna', label: 'Zawsze na wierzchu', description: 'Przypina okno lub widget nad innymi (on=false odpina). Maks. 3 przypięte.', writes: ['windows'],
  args: { type: 'object', properties: { app: { type: 'string', description: 'id aplikacji, w:<id> widgetu albo "current"' }, on: { type: 'boolean' } }, required: ['app'] },
  examples: ['przypnij {app} [na wierzchu]', 'odepnij {app}', '{app} zawsze na wierzchu'],
  parse(raw, n) { let m; if ((m = /^(przypnij|odepnij)\s+(.+?)(\s+na wierzchu)?$/.exec(n)) && !/notatk/.test(m[2])) { const app = resolveWin(raw.slice(n.indexOf(m[2]), n.indexOf(m[2]) + m[2].length)); if (app) return { args: { app, on: m[1] === 'przypnij' }, score: 25 }; } if ((m = /^(.+?)\s+(ma byc\s+)?zawsze (na wierzchu|widoczny|widoczna)$/.exec(n))) { const app = resolveWin(raw.slice(0, m[1].length)); if (app) return { args: { app, on: true }, score: 25 }; } return null; },
  run({ app, on = true }) { const id = resolveWin(app); if (!id || !J.wm.isOpen(id)) return fail('NOT_FOUND', id ? notOpen(id) : 'Nie ma okna „' + app + '”.'); const was = J.wm.isPinned(id); J.wm.pin(id, on); return ok({ app: id, pinned: on }, winName(id) + (on ? ' zawsze na wierzchu.' : ' odpięte.'), { highlight: id }, () => { if (J.wm.isOpen(id)) J.wm.pin(id, was, true); }); } });
R.add({ id: 'wm_reopen', group: 'Aplikacje i okna', label: 'Otwórz ponownie zamknięte', description: 'Otwiera ostatnio zamknięte okno (albo wskazane) w tej samej pozycji i widoku. Pamięta 10 ostatnich.', writes: ['windows'],
  args: { type: 'object', properties: { app: { type: 'string', enum: APP_IDS } } },
  examples: ['otworz ponownie zamkniete [okno]', 'przywroc zamkniete okno', 'przywroc ostatnio zamkniete okno', 'otworz to co zamknalem'],
  parse(raw, n) { return /^(otworz ponownie|przywroc)( ostatnio)? zamkniet\w*( okno)?$|^otworz (to|z powrotem) co (zamknalem|zamknelam|zamknales)$/.test(n) ? { args: {}, score: 35 } : null; },
  run({ app }) { const id = J.wm.reopen(app); if (!id) return fail('NOT_FOUND', app ? 'Nie zamykałeś ostatnio: ' + winName(app) + '.' : 'Nie ma ostatnio zamkniętych okien.'); return ok({ app: id }, 'Otworzyłem ponownie: ' + winName(id) + '.', { highlight: id }, () => J.wm.close(id)); } });
R.add({ id: 'wm_restore', group: 'Aplikacje i okna', label: 'Przywróć okna', description: 'Przywraca zminimalizowane okno albo wszystkie (app="all") — odwrotność „pokaż pulpit”.', writes: ['windows'],
  args: { type: 'object', properties: { app: { type: 'string', description: 'id aplikacji, w:<id> albo "all"' } }, required: ['app'] },
  examples: ['przywroc okna', 'przywroc wszystkie okna', 'pokaz z powrotem [wszystkie] okna', 'przywroc {app}'],
  parse(raw, n) { if (/^(przywroc|pokaz z powrotem|pokaz znowu)( wszystkie| moje)? okna$/.test(n)) return { args: { app: 'all' }, score: 30 }; const m = /^przywroc\s+(.+)$/.exec(n); if (m && !/zamkniet|notatk|wersj|ustawien|z kosza/.test(m[1])) { const app = resolveWin(raw.slice(n.indexOf(m[1]))); if (app) return { args: { app }, score: 15 }; } return null; },
  run({ app }) { const target = app === 'all' ? 'all' : resolveWin(app); if (!target) return fail('NOT_FOUND', 'Nie ma okna „' + app + '”.'); const mins = (target === 'all' ? J.wm.list() : [target]).filter(k => J.wm.isMin(k)); const n = J.wm.restore(target); return n ? ok({ restored: n }, 'Przywróciłem ' + n + ' ' + J.pl(n, 'okno', 'okna', 'okien') + '.', null, () => mins.forEach(k => J.wm.minimize(k))) : ok({ restored: 0 }, 'Żadne okno nie było zminimalizowane.'); } });
R.add({ id: 'wm_close_others', group: 'Aplikacje i okna', label: 'Zamknij pozostałe', description: 'Zamyka wszystkie okna poza wskazanym (widgety zostają). Da się cofnąć.', writes: ['windows'],
  args: { type: 'object', properties: { app: { type: 'string', description: 'okno, które zostaje (domyślnie aktywne)' } }, required: ['app'] },
  examples: ['zostaw tylko {app}', 'zamknij pozostale [okna]', 'zamknij wszystko (poza|oprocz) {app}'],
  parse(raw, n) { let m; if ((m = /^(?:zostaw tylko|zamknij wszystko (?:poza|oprocz)|zamknij wszystkie okna (?:poza|oprocz))\s+(.+)$/.exec(n))) { const app = resolveWin(raw.slice(n.indexOf(m[1]))); if (app) return { args: { app }, score: 40 }; } if (/^zamknij pozostale( okna)?$/.test(n)) return { args: { app: 'current' }, score: 40 }; return null; },
  run({ app }) { const keep = resolveWin(app); if (!keep) return fail('NOT_FOUND', 'Nie ma okna „' + app + '”.'); if (!J.wm.isOpen(keep)) J.wm.open(keep); const closed = J.wm.closeOthers(keep); return ok({ kept: keep, closed }, closed.length ? 'Zostawiłem ' + winName(keep) + ', zamknąłem ' + closed.length + ' ' + J.pl(closed.length, 'okno', 'okna', 'okien') + '.' : 'Nie było innych okien.', null, closed.length ? () => closed.slice().reverse().forEach(id => J.wm.reopen(id)) : null); } });

/* =================== W1 · COFANIE =================== */
const NUM = { jedna: 1, jeden: 1, dwie: 2, dwa: 2, trzy: 3, cztery: 4, piec: 5, szesc: 6, siedem: 7, osiem: 8, dziewiec: 9, dziesiec: 10 };
R.add({ id: 'undo', group: 'Agent', label: 'Cofnij', description: 'Cofa ostatnią akcję (count = ile ostatnich, minutes = wszystko z ostatnich N minut). force=true cofa mimo późniejszej zmiany obiektu.', idempotent: false,
  args: { type: 'object', properties: { count: { type: 'integer', minimum: 1, maximum: 10 }, minutes: { type: 'integer', minimum: 1, maximum: 10 }, force: { type: 'boolean' } } },
  examples: ['cofnij', 'cofnij (dwie|trzy) ostatnie [rzeczy]', 'cofnij wszystko z ostatnich {minutes} minut', 'cofnij mimo to', 'odkrec to'],
  parse(raw, n) {
    let m;
    if (/^(cofnij|wycofaj)( to)? mimo( to| wszystko)?$/.test(n)) return { args: { force: true }, score: 40 };
    if ((m = /^cofnij\s+(?:(\d+|jedna|jeden|dwie|dwa|trzy|cztery|piec|szesc|siedem|osiem|dziewiec|dziesiec)\s+)?ostatni\w*(?:\s+(\d+|dwie|dwa|trzy|cztery|piec))?(?:\s+(?:rzeczy|akcje|zmiany|kroki))?$/.exec(n))) { const k = m[1] || m[2]; const c = k ? (+k || NUM[k]) : 1; return { args: { count: c }, score: 40 }; }
    if ((m = /^cofnij wszystko z ostatnich (\d+|dwoch|trzech|pieciu|dziesieciu) minut$/.exec(n))) return { args: { minutes: +m[1] || { dwoch: 2, trzech: 3, pieciu: 5, dziesieciu: 10 }[m[1]] }, score: 40 };
    if (/^(odkrec|odwroc) to( co zrobiles)?$/.test(n)) return { args: {}, score: 30 };
    return null;
  },
  async run({ count, minutes, force }) { const r = (count > 1 || minutes) ? await J.undo.runMany({ count, minutes, force }) : await J.undo.run(undefined, { force }); return r.ok ? ok({ done: r.done || 1 }, r.text) : fail(r.conflict ? 'CONFLICT' : 'NOT_FOUND', r.text); } });
R.add({ id: 'undo_list', group: 'Agent', label: 'Historia do cofnięcia', description: 'Lista ostatnich akcji, które da się cofnąć (10 minut).', idempotent: true,
  examples: ['co moge cofnac', 'historia do cofniecia', 'historia zmian', 'co ostatnio (zrobiles|zmieniles|pozmieniales)'],
  run() { const l = J.undo.list(); return ok({ items: l }, l.length ? 'Mogę cofnąć: ' + l.map(e => e.text.replace(/\.$/, '') + ' (' + (e.ago_s < 60 ? e.ago_s + ' s' : Math.round(e.ago_s / 60) + ' min') + ' temu)').join('; ') + '.' : 'Nie ma nic do cofnięcia.'); } });

/* =================== W1/W3 · SKRÓTY (UI przez rejestr) =================== */
const findShortcut = q => { const n = norm(q); return J.state.shortcuts.find(x => x.id === q) || J.state.shortcuts.find(x => norm(x.name) === n) || J.state.shortcuts.find(x => norm(x.name).includes(n)); };
R.add({ id: 'shortcut_edit', group: 'Pulpit i widgety', label: 'Edytuj skrót', description: 'Zmienia nazwę, adres (url), aplikację albo ikonę skrótu na pulpicie.', writes: ['shortcuts'],
  args: { type: 'object', properties: { shortcut: { type: 'string', description: 'id albo nazwa skrótu' }, name: { type: 'string', maxLength: 40 }, url: { type: 'string' }, app: { type: 'string', enum: APP_IDS }, icon: { type: 'string' } }, required: ['shortcut'] },
  examples: ['zmien nazwe skrotu {shortcut} na {name}', 'skrot {shortcut} ma sie nazywac {name}', 'zmien adres skrotu {shortcut} na {url}'],
  parse(raw, n) { let m; if ((m = /^(?:zmien nazwe skrotu|przemianuj skrot)\s+(.+?)\s+na\s+(.+)$/.exec(n)) || (m = /^skrot\s+(.+?)\s+ma sie nazywac\s+(.+)$/.exec(n))) return { args: { shortcut: raw.slice(n.indexOf(m[1]), n.indexOf(m[1]) + m[1].length), name: raw.slice(n.lastIndexOf(m[2])) }, score: 30 }; if ((m = /^(?:zmien adres skrotu|skrot)\s+(.+?)\s+(?:na|niech otwiera)\s+([a-z0-9.-]+\.[a-z]{2,}\S*)$/.exec(n))) return { args: { shortcut: raw.slice(n.indexOf(m[1]), n.indexOf(m[1]) + m[1].length), url: m[2] }, score: 30 }; return null; },
  run({ shortcut, name, url, app, icon }) {
    const s = findShortcut(shortcut); if (!s) return fail('NOT_FOUND', 'Nie ma skrótu „' + shortcut + '”.' + (J.state.shortcuts.length ? ' Są: ' + J.state.shortcuts.map(x => '„' + x.name + '”').join(', ') + '.' : ''));
    const prev = { ...s };
    if (name) s.name = String(name).trim().slice(0, 40);
    if (url) { s.url = /^https?:\/\//i.test(url) ? url : 'https://' + url; s.app = null; s.icon = icon || 'link'; }
    if (app) { s.app = app; s.url = null; s.icon = icon || J.apps[app]?.icon || 'star'; }
    if (icon && !url && !app) s.icon = icon;
    J.save(); J.emit('shortcuts');
    return ok({ id: s.id, name: s.name, url: s.url, app: s.app }, 'Skrót „' + s.name + '” zmieniony.', { highlight: 'sc:' + s.id }, () => { Object.assign(s, prev); J.save(); J.emit('shortcuts'); });
  } });
R.get('shortcut_edit').undoable = true;
['wm_pin', 'wm_reopen', 'wm_restore', 'wm_close_others'].forEach(id => { R.get(id).undoable = true; });

J.cmdKit.VIEWS = VIEWS; J.cmdKit.coinOf = coinOf; J.cmdKit.findShortcut = findShortcut;
})();
