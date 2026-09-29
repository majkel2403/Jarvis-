/* =========================================================
   JARVIS OS — mózg: akcje systemowe, silnik lokalny, Hermes (Nous Research)
   ========================================================= */
'use strict';
(() => {

/* ---------- normalizacja (bez polskich znaków, ta sama długość) ---------- */
const DIA = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
const norm = s => s.toLowerCase().replace(/[ąćęłńóśźż]/g, c => DIA[c]);

const APP_ALIASES = [
  ['chat', /\b(czat|chat|rozmow)/], ['notes', /\b(notatnik|notatk|notes|notes)/], ['market', /\b(rynek|rynku|token|krypto|kurs|gield|market)/],
  ['schedule', /\b(harmonogram|kalendarz|zadani|plan dnia|agend)/], ['monitor', /\b(monitor|system|wynik|statystyk|wydajnos)/],
  ['terminal', /\b(terminal|konsol|shell)/], ['weather', /\b(pogod)/], ['calc', /\b(kalkulator|liczydl)/], ['timer', /\b(minutnik|stoper|timer)/],
  ['settings', /\b(ustawieni|opcje|konfiguracj|preferencj)/], ['library', /\b(bibliotek|aplikacj|menu|programy)/]
];
const SITES = { youtube: 'https://youtube.com', google: 'https://google.com', github: 'https://github.com', gmail: 'https://mail.google.com', spotify: 'https://open.spotify.com', netflix: 'https://netflix.com', facebook: 'https://facebook.com', twitter: 'https://x.com', wikipedia: 'https://pl.wikipedia.org', 'mapy': 'https://maps.google.com', linkedin: 'https://linkedin.com', reddit: 'https://reddit.com', allegro: 'https://allegro.pl', nous: 'https://nousresearch.com', hermes: 'https://hermes-agent.nousresearch.com' };
const THEME_ALIASES = { cyjan: 'cyjan', turkus: 'cyjan', niebiesk: 'niebieski', fiolet: 'fiolet', purpur: 'fiolet', zielon: 'zielony', zlot: 'złoty', pomarancz: 'złoty', czerwon: 'czerwony', rozow: 'różowy' };
const findApp = n => (APP_ALIASES.find(([, re]) => re.test(n)) || [])[0];
const JOKES = [
  'Dlaczego programista pomylił Halloween z Bożym Narodzeniem? Bo OCT 31 to DEC 25.',
  'Mam świetny żart o UDP, ale nie wiem, czy do ciebie dotrze.',
  'Są 10 rodzaje ludzi: ci, którzy rozumieją system binarny, i ci, którzy nie.',
  'Moja pamięć podręczna jest jak ja o poranku — pusta, dopóki ktoś czegoś nie zapyta.',
  'Optymista widzi szklankę do połowy pełną. Inżynier widzi szklankę dwa razy większą, niż trzeba.'
];

/* =================== AKCJE (wspólne dla silnika lokalnego i Hermesa) =================== */
const A = J.actions = {
  open_app({ app }) {
    if (!J.apps[app]) return { ok: false, text: 'Nieznana aplikacja: ' + app };
    J.wm.open(app); return { ok: true, text: 'Otwarto: ' + J.apps[app].title };
  },
  close_app({ app }) {
    if (app === 'all') { J.wm.closeAll(); return { ok: true, text: 'Zamknięto wszystkie okna' }; }
    if (!J.wm.isOpen(app)) return { ok: false, text: 'Okno ' + app + ' nie jest otwarte' };
    J.wm.close(app); return { ok: true, text: 'Zamknięto: ' + J.apps[app].title };
  },
  create_note({ title, content }) {
    const n = J.notes.add(String(title || content || 'Notatka').slice(0, 60), String(content || ''));
    J.wm.open('notes', n.id); return { ok: true, text: 'Utworzono notatkę „' + n.title + '”' };
  },
  add_task({ time, text, date }) {
    if (!text) return { ok: false, text: 'Brak treści zadania' };
    const d = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : J.today();
    const t = J.tasks.add(time, text, d);
    return { ok: true, text: 'Dodano zadanie' + (t.time ? ' na ' + t.time : '') + (d !== J.today() ? ' (' + d + ')' : '') + ': ' + t.text };
  },
  start_timer({ seconds, label }) {
    const s = Math.round(+seconds);
    if (!(s > 0) || s > 86400) return { ok: false, text: 'Nieprawidłowy czas' };
    J.timer.start(s, label || 'Minutnik'); J.wm.open('timer');
    return { ok: true, text: 'Minutnik ustawiony na ' + J.timer.fmt(s * 1000) };
  },
  set_theme({ color }) {
    const t = J.THEMES[color]; if (!t) return { ok: false, text: 'Dostępne motywy: ' + Object.keys(J.THEMES).join(', ') };
    Object.assign(J.state.settings, { accent: t[0], accent2: t[1] }); J.applyTheme(); J.save(); J.emit('settings');
    return { ok: true, text: 'Motyw zmieniony na ' + color };
  },
  set_wallpaper({ wallpaper }) {
    const order = ['photo', 'aurora', 'void'], s = J.state.settings;
    s.wall = order.includes(wallpaper) ? wallpaper : order[(order.indexOf(s.wall) + 1) % order.length];
    J.applyTheme(); J.save(); return { ok: true, text: 'Tapeta: ' + ({ photo: 'miasto nocą', aurora: 'aurora', void: 'pustka' })[s.wall] };
  },
  async get_weather({ city }) {
    const d = await J.weather.get(city || undefined); J.wm.open('weather', city || undefined);
    return { ok: true, text: J.weather.describe(d) };
  },
  async get_crypto_prices() {
    await J.market.ensure(); J.wm.open('market');
    return { ok: true, text: 'Aktualne kursy (USD, zmiana 24h): ' + J.market.summary() };
  },
  add_shortcut({ name, app, url }) {
    if (!name) return { ok: false, text: 'Brak nazwy skrótu' };
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    J.shortcuts.add(name, J.apps[app] ? { app } : url ? { url } : {});
    return { ok: true, text: 'Skrót „' + name + '” dodany na pulpit' };
  },
  open_url({ url }) {
    if (!url) return { ok: false, text: 'Brak adresu' };
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const w = window.open(url, '_blank', 'noopener');
    return { ok: true, text: w === null ? 'Przeglądarka zablokowała nową kartę — zezwól na wyskakujące okna' : 'Otwarto ' + url };
  },
  calculate({ expression }) {
    try { return { ok: true, text: expression + ' = ' + J.calc(expression) }; } catch (e) { return { ok: false, text: 'Błąd obliczenia: ' + e.message }; }
  },
  get_datetime() {
    return { ok: true, text: new Date().toLocaleString('pl-PL', { dateStyle: 'full', timeStyle: 'short' }) };
  },
  get_status() {
    const today = J.tasks.today();
    return {
      ok: true, text: `Otwarte okna (id — tytuł): ${J.wm.list().filter(i => J.apps[i]).map(i => i + ' — ' + J.apps[i].title + (J.wm.isMin(i) ? ' [zminimalizowane]' : J.wm.isMax(i) ? ' [maksymalizowane]' : '')).join('; ') || 'brak'}. Notatki: ${J.state.notes.length} (${J.state.notes.slice(0, 5).map(n => '„' + n.title + '”').join(', ')}). ` +
        `Zadania na dziś (${today.filter(t => t.done).length}/${today.length} ukończone): ${today.map(t => (t.time || '--:--') + ' ' + t.text + (t.done ? ' ✓' : '')).join('; ') || 'brak'}. ` +
        `Minutnik: ${J.timer.running ? J.timer.label + ', zostało ' + J.timer.fmt(J.timer.left()) : 'nieaktywny'}. Skróty na pulpicie: ${J.state.shortcuts.map(s => s.name).join(', ') || 'brak'}.`
    };
  },
  create_widget({ type, title, content, items }) {
    if (!J.widgets) return { ok: false, text: 'Widgety niedostępne' };
    const w = J.widgets.create(type, { title, content, items });
    return { ok: true, text: 'Utworzono widget „' + w.title + '” (' + ({ note: 'notatka', list: 'lista', result: 'wynik', calc: 'kalkulator' })[type] + ') na pulpicie' };
  },
  focus_mode({ on }) { J.setFocus?.(on !== false); return { ok: true, text: on === false ? 'Tryb skupienia wyłączony' : 'Tryb skupienia włączony — okna zminimalizowane' }; },
  window_control({ app, action }) {
    const title = J.apps[app]?.title || app;
    if (app === 'chat') {
      if (action === 'close' || action === 'minimize') { J.wm.close('chat'); return { ok: true, text: 'Czat schowany' }; }
      J.wm.open('chat'); return { ok: true, text: 'Czat pokazany' };
    }
    if (!J.apps[app]) return { ok: false, text: 'Nieznane okno: ' + app + '. Identyfikatory otwartych okien zwraca get_status.' };
    if (!J.wm.isOpen(app)) {
      if (action === 'close' || action === 'minimize') return { ok: false, text: 'Okno „' + title + '” nie jest otwarte' };
      J.wm.open(app);
    }
    if (action === 'focus' || action === 'restore') { J.wm.open(app); if (action === 'restore' && J.wm.isMax(app)) J.wm.toggleMax(app); }
    else if (action === 'minimize') J.wm.minimize(app);
    else if (action === 'maximize') { J.wm.open(app); if (!J.wm.isMax(app)) J.wm.toggleMax(app); }
    else if (action === 'close') J.wm.close(app);
    const done = { focus: 'Aktywne', restore: 'Przywrócone', minimize: 'Zminimalizowane', maximize: 'Zmaksymalizowane', close: 'Zamknięte' }[action];
    return { ok: true, text: done + ': ' + title };
  },
  arrange_windows({ layout }) {
    if (layout === 'minimize_all') { J.wm.minimizeAll(); return { ok: true, text: 'Wszystkie okna zminimalizowane' }; }
    const n = J.wm.arrange(layout === 'cascade' ? 'cascade' : 'tile');
    return n ? { ok: true, text: 'Ułożono ' + n + ' ' + J.pl(n, 'okno', 'okna', 'okien') + ' (' + (layout === 'cascade' ? 'kaskada' : 'kafelki') + ')' } : { ok: false, text: 'Brak otwartych okien do ułożenia' };
  }
};

/* definicje funkcji dla Hermesa (JSON Schema) */
const APP_IDS = ['chat', 'notes', 'market', 'schedule', 'monitor', 'terminal', 'weather', 'calc', 'timer', 'settings', 'library'];
const TOOLS = [
  { name: 'open_app', description: 'Otwiera aplikację w Jarvis OS. calc=Kalkulator interaktywny z klawiaturą (ZAWSZE używaj gdy użytkownik prosi o kalkulator lub chce liczyć), notes=Notatnik, market=Monitor rynku krypto, schedule=Harmonogram zadań, monitor=Monitor systemu, terminal=Terminal, weather=Pogoda, timer=Minutnik/stoper, settings=Ustawienia, library=Biblioteka aplikacji, chat=Czat.', input_schema: { type: 'object', properties: { app: { type: 'string', enum: APP_IDS } }, required: ['app'] } },
  { name: 'close_app', description: 'Zamyka okno aplikacji. Użyj app="all", aby zamknąć wszystkie.', input_schema: { type: 'object', properties: { app: { type: 'string', enum: [...APP_IDS, 'all'] } }, required: ['app'] } },
  { name: 'create_note', description: 'Tworzy nową notatkę w Notatniku i ją pokazuje.', input_schema: { type: 'object', properties: { title: { type: 'string', description: 'Krótki tytuł' }, content: { type: 'string', description: 'Treść notatki' } }, required: ['title', 'content'] } },
  { name: 'add_task', description: 'Dodaje zadanie/przypomnienie do Harmonogramu. O podanej godzinie Jarvis przypomni głosem.', input_schema: { type: 'object', properties: { text: { type: 'string' }, time: { type: 'string', description: 'Godzina HH:MM (opcjonalnie)' }, date: { type: 'string', description: 'Data YYYY-MM-DD, domyślnie dziś' } }, required: ['text'] } },
  { name: 'start_timer', description: 'Uruchamia minutnik odliczający podaną liczbę sekund.', input_schema: { type: 'object', properties: { seconds: { type: 'number' }, label: { type: 'string' } }, required: ['seconds'] } },
  { name: 'set_theme', description: 'Zmienia kolor akcentu interfejsu.', input_schema: { type: 'object', properties: { color: { type: 'string', enum: Object.keys(J.THEMES) } }, required: ['color'] } },
  { name: 'set_wallpaper', description: 'Zmienia tapetę pulpitu: photo (miasto nocą), aurora, void (pustka).', input_schema: { type: 'object', properties: { wallpaper: { type: 'string', enum: ['photo', 'aurora', 'void'] } }, required: ['wallpaper'] } },
  { name: 'get_weather', description: 'Pobiera aktualną pogodę i prognozę. Bez miasta — lokalizacja użytkownika.', input_schema: { type: 'object', properties: { city: { type: 'string' } } } },
  { name: 'get_crypto_prices', description: 'Pobiera aktualne kursy BTC, ETH, SOL, BNB w USD.', input_schema: { type: 'object', properties: {} } },
  { name: 'add_shortcut', description: 'Dodaje ikonę skrótu na pulpit — do aplikacji Jarvis OS (app) lub strony WWW (url).', input_schema: { type: 'object', properties: { name: { type: 'string' }, app: { type: 'string', enum: APP_IDS }, url: { type: 'string' } }, required: ['name'] } },
  { name: 'open_url', description: 'Otwiera stronę WWW w nowej karcie (np. wyszukiwanie Google, YouTube).', input_schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'calculate', description: 'Dokładnie oblicza wyrażenie matematyczne (+ - * / ^ % nawiasy sqrt sin cos log ln pi).', input_schema: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] } },
  { name: 'get_datetime', description: 'Zwraca aktualną datę i godzinę użytkownika.', input_schema: { type: 'object', properties: {} } },
  { name: 'get_status', description: 'Zwraca stan środowiska: otwarte okna, notatki, zadania na dziś, minutnik, skróty.', input_schema: { type: 'object', properties: {} } },
  { name: 'create_widget', description: 'Tworzy widget na pulpicie. UWAGA: NIE używaj dla interaktywnych aplikacji — do kalkulatora ZAWSZE open_app({app:"calc"}). Typy: note=edytowalna notatka (content), list=lista checkboxów (items), result=karta z wynikiem/podsumowaniem (content), calc=mini kalkulator na pulpicie z polem wyrażenia. Używaj TYLKO gdy użytkownik wprost prosi o "widget", "listę na pulpicie" lub "zachowaj wynik".', input_schema: { type: 'object', properties: { type: { type: 'string', enum: ['note', 'list', 'result', 'calc'] }, title: { type: 'string' }, content: { type: 'string', description: 'Treść (note/result)' }, items: { type: 'array', items: { type: 'string' }, description: 'Pozycje listy (list)' } }, required: ['type', 'title'] } },
  { name: 'focus_mode', description: 'Włącza/wyłącza tryb skupienia (minimalizuje okna, wycisza tło).', input_schema: { type: 'object', properties: { on: { type: 'boolean' } }, required: ['on'] } },
  { name: 'window_control', description: 'Steruje jednym oknem: focus (przenieś na wierzch/otwórz), minimize, maximize, restore (przywróć rozmiar), close. app = id aplikacji (np. notes) albo id widgetu (w:xxxx) — listę otwartych okien z id podaje get_status.', input_schema: { type: 'object', properties: { app: { type: 'string' }, action: { type: 'string', enum: ['focus', 'minimize', 'maximize', 'restore', 'close'] } }, required: ['app', 'action'] } },
  { name: 'arrange_windows', description: 'Układa otwarte okna na pulpicie: tile (kafelki obok siebie), cascade (kaskada) albo minimize_all (pokaż pulpit).', input_schema: { type: 'object', properties: { layout: { type: 'string', enum: ['tile', 'cascade', 'minimize_all'] } }, required: ['layout'] } }
];

/* wykonanie akcji z walidacją wejścia */
const exec = async (name, input) => {
  if (name === 'skills_list') return { ok: true, text: 'Dostępne narzędzia w Jarvis OS: ' + TOOLS.map(t => t.name).join(', ') + '. To wszystkie funkcje sterowania Jarvis OS (własnych narzędzi serwerowych używasz normalnie, poza tą listą).' };
  const def = TOOLS.find(t => t.name === name), fn = A[name];
  if (!def || !fn) return { ok: false, text: 'Nieznane narzędzie: ' + name + '. Dostępne: ' + TOOLS.map(t => t.name).join(', ') };
  if (!input || typeof input !== 'object') return { ok: false, text: 'INVALID_JSON: nieprawidłowe wejście narzędzia' };
  for (const r of def.input_schema.required || []) if (input[r] === undefined || input[r] === '') return { ok: false, text: 'Brak wymaganego pola: ' + r };
  for (const [k, p] of Object.entries(def.input_schema.properties)) if (p.enum && input[k] !== undefined && !p.enum.includes(input[k])) return { ok: false, text: `Nieprawidłowa wartość ${k}: ${input[k]}` };
  try { const r = await fn(input); J.action(name); return r; } catch (e) { return { ok: false, text: 'Błąd: ' + e.message }; }
};

const run = async (name, input) => {
  const st = J.proc.step('tool', name, [['Argumenty', input == null ? '(brak)' : input]], { running: true });
  J.ev.emit('tool.started', { tool: name, args: input });
  const r = await exec(name, input);
  if (r.ok) st.done([['Wynik', r.text]], String(r.text).slice(0, 80)); else st.fail(r.text);
  J.ev.emit(r.ok ? 'tool.completed' : 'tool.failed', { tool: name, text: String(r.text).slice(0, 200) });
  return r;
};

/* =================== SILNIK LOKALNY =================== */
const local = async (raw) => {
  const o = raw.trim(), n = norm(o).replace(/[?!.]+$/, '');
  const grab = (re) => { const m = re.exec(n); if (!m) return null; return m.map((g, i) => { if (g == null || i === 0) return g; const idx = n.indexOf(g, m.index); return o.slice(idx, idx + g.length); }); };
  const act = async (name, input) => { const r = await run(name, input); return r.text; };

  if (/^(pomoc|help|\?|co potrafisz|co umiesz|jakie masz (komendy|polecenia|mozliwosci)|komendy)/.test(n))
    return 'Potrafię: **otwierać aplikacje** („otwórz notatnik”), **notować** („zanotuj: …”), **przypominać** („przypomnij mi o 18:00 trening”), **odliczać** („minutnik 5 minut”), sprawdzać **pogodę** i **kursy krypto**, **liczyć** („oblicz 15% z 2400”), zmieniać **motyw** i **tapetę**, tworzyć **skróty** („dodaj skrót GitHub github.com”), otwierać strony („otwórz YouTube”), szukać w Google, opowiedzieć żart i podać **raport** systemu. Po podłączeniu Hermesa odpowiem na każde pytanie.';
  if (/^(hej|czesc|witaj|siema|dzien dobry|dobry wieczor|dobry|elo|hello|hi|yo)\b/.test(n)) {
    const hr = new Date().getHours();
    return (hr < 5 ? 'Późna pora' : hr < 12 ? 'Dzień dobry' : hr < 18 ? 'Witaj ponownie' : 'Dobry wieczór') + '. Wszystkie systemy działają. W czym mogę pomóc?';
  }
  if (/(dziek|dzieki|dzieku|thx|thanks)/.test(n)) return 'Zawsze do usług.';
  if (/(kim jestes|jak sie nazywasz|przedstaw sie|czym jestes)/.test(n)) return 'Jestem Jarvis — inteligentna warstwa tego środowiska. Zarządzam oknami, notatkami, zadaniami i danymi, a połączony z Hermesem od Nous Research rozumiem dowolne polecenia.';
  if (/(ktora (jest )?godzina|ktora godzina|jaki (jest )?czas|podaj godzine)/.test(n)) return 'Jest ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) + '.';
  if (/(jaki (dzis|dzisiaj|jest) dzien|ktory (dzis|dzisiaj|jest)|jaka (jest )?data|dzisiejsza data|jaki mamy dzien)/.test(n)) return 'Dziś ' + new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.';
  if (/(zart|dowcip|rozsmiesz)/.test(n)) return JOKES[Math.floor(Math.random() * JOKES.length)];
  if (/(status|raport|jak sie masz|stan systemu|podsumuj dzien)/.test(n)) return (await run('get_status', {})).text;
  if (/matrix/.test(n)) { J.matrix?.(); return 'Wchodzimy do Matrixa. Kliknij, aby wrócić.'; }
  if (/(tryb skupienia|skup sie|focus)/.test(n)) return act('focus_mode', { on: !/(wylacz|wyłącz)/.test(n) });

  let m;
  if ((m = grab(/^(?:zanotuj|notatka|zapisz notatke|nowa notatka|dodaj notatke|zapisz)\s*:?\s*(.+)$/))) return act('create_note', { title: m[1].slice(0, 40), content: m[1] });

  if (/(przypomn|dodaj zadanie|zaplanuj|nowe zadanie|dodaj do harmonogramu)/.test(n)) {
    const tm = /\b(\d{1,2})[:.](\d{2})\b/.exec(n) || /\bo (\d{1,2})(?:\s|$)/.exec(n);
    const time = tm ? J.pad(+tm[1]) + ':' + (tm[2] || '00') : '';
    let date = J.today(); if (/\bjutro\b/.test(n)) { const d = new Date(); d.setDate(d.getDate() + 1); date = d.getFullYear() + '-' + J.pad(d.getMonth() + 1) + '-' + J.pad(d.getDate()); }
    let text = o;
    if (tm) text = text.slice(0, tm.index) + text.slice(tm.index + tm[0].length);
    text = text.replace(/^(przypomnij( mi)?|dodaj zadanie|zaplanuj|nowe zadanie|dodaj do harmonogramu)\s*/i, '').replace(/\bjutro\b/i, '').replace(/^\s*(o|na|że|ze|żeby|zeby|:)\s+/i, '').replace(/\s+(o|na)\s*$/i, '').replace(/\s{2,}/g, ' ').trim();
    return act('add_task', { time, text: text || 'Przypomnienie', date });
  }

  if (/(minutnik|timer|odlicz|budzik)/.test(n) || /ustaw .*na \d/.test(n)) {
    const tm = /(\d+(?:[.,]\d+)?)\s*(sek|s\b|sekund|min|m\b|minut|godz|h\b|godzin)?/.exec(n);
    if (!tm) { J.wm.open('timer'); return 'Otworzyłem minutnik. Na ile ustawić?'; }
    const v = parseFloat(tm[1].replace(',', '.')), u = tm[2] || 'min';
    const sec = /^s/.test(u) ? v : /^(g|h)/.test(u) ? v * 3600 : v * 60;
    return act('start_timer', { seconds: sec, label: 'Minutnik ' + tm[0].trim() });
  }

  if (/(pogod|temperatur|na dworze|czy bedzie padac|czy pada|prognoz)/.test(n)) {
    const c = /\bwe?\s+([a-z\- ]{3,})$/.exec(n);
    const city = c ? o.slice(n.lastIndexOf(c[1]), n.lastIndexOf(c[1]) + c[1].length).trim() : undefined;
    try { return await act('get_weather', { city }); }
    catch (e) { return 'Nie udało się pobrać pogody: ' + e.message; }
  }

  if (/(bitcoin|btc|ethereum|\beth\b|solana|\bsol\b|\bbnb\b|krypto|kursy? (?:tokenow|gieldow|rynku))/.test(n)) return act('get_crypto_prices', {});

  if ((m = /(\d+(?:[.,]\d+)?)\s*%\s*(?:z|od)\s*(\d+(?:[.,]\d+)?)/.exec(n))) { const r = J.calc(m[1] + '/100*' + m[2]); J.action('calculate'); return m[1] + '% z ' + m[2] + ' to **' + r + '**.'; }
  if ((m = grab(/^(?:oblicz|policz|ile to|ile jest|wylicz|ile wynosi)\s*:?\s*(.+)$/)) || (/[\d)]\s*[-+*/^x×÷]\s*[\d(]/.test(n) && /^[\d\s+\-*/().,%^x×÷]+$/.test(n) && (m = [n, n]))) {
    const expr = m[1].replace(/\s*(razy)\s*/g, '*').replace(/\s*(przez|podzielone przez)\s*/g, '/').replace(/\s*plus\s*/g, '+').replace(/\s*minus\s*/g, '-').replace(/\s*do potegi\s*/g, '^');
    const r = await run('calculate', { expression: expr });
    return r.ok ? r.text.replace(/= (.+)$/, '= **$1**') : r.text;
  }

  if (/(motyw|zmien (?:kolor|barw)|kolor (?:interfejsu|akcentu)|akcent)/.test(n)) {
    const k = Object.keys(THEME_ALIASES).find(a => n.includes(a));
    if (!k) { J.wm.open('settings'); return 'Wybierz kolor w Ustawieniach lub powiedz np. „motyw fiolet”. Dostępne: ' + Object.keys(J.THEMES).join(', ') + '.'; }
    return act('set_theme', { color: THEME_ALIASES[k] });
  }
  if (/tapet/.test(n)) return act('set_wallpaper', { wallpaper: /aurora|zorz/.test(n) ? 'aurora' : /pust|czarn|void/.test(n) ? 'void' : /miast|zdjec|photo/.test(n) ? 'photo' : '' });

  if ((m = grab(/^(?:dodaj|utworz|stworz|nowy|nowa)\s+(?:skrot|ikone|ikona|widget)\s*(?:do)?\s*(.*)$/))) {
    const rest = (m[1] || '').trim();
    const url = /([a-z0-9-]+\.[a-z]{2,}(?:\/\S*)?)/i.exec(rest)?.[1];
    const app = findApp(norm(rest));
    const name = rest.replace(url || '', '').trim() || (app ? J.apps[app].title : url) || 'Nowy skrót';
    return act('add_shortcut', { name, app, url });
  }

  if ((m = grab(/^(?:wyszukaj|szukaj|znajdz|wygoogluj|google)\s+(.+)$/))) return act('open_url', { url: 'https://www.google.com/search?q=' + encodeURIComponent(m[1]) });
  if ((m = grab(/^(?:powiedz|przeczytaj|wypowiedz)\s+(.+)$/))) { const was = J.state.settings.speech; J.state.settings.speech = true; J.voice.speak(m[1]); J.state.settings.speech = was; return '🔊 ' + m[1]; }

  if (/^(zamknij|schowaj|ukryj)\s+(wszystko|wszystkie|okna)/.test(n)) return act('close_app', { app: 'all' });
  if (/^(uloz|rozloz|poukladaj|ustaw)\s+okna/.test(n)) return act('arrange_windows', { layout: /kaskad/.test(n) ? 'cascade' : 'tile' });
  if (/^(zminimalizuj|pokaz pulpit)/.test(n)) { J.wm.minimizeAll(); return 'Pulpit jest czysty.'; }
  if ((m = /^(?:zamknij|wylacz)\s+(.+)$/.exec(n))) { const app = findApp(m[1]); if (app) return act('close_app', { app }); }

  const verb = /^(otworz|uruchom|pokaz|wlacz|odpal|start|przejdz do|idz do)\s+(.+)$/.exec(n);
  const target = verb ? verb[2].trim() : n, app = findApp(target);
  if (app && (verb || target.split(' ').length <= 2)) return act('open_app', { app });
  if (verb) {
    const site = Object.keys(SITES).find(k => target.includes(k));
    if (site) return act('open_url', { url: SITES[site] });
    const dom = /^([a-z0-9-]+\.[a-z]{2,}\S*)$/.exec(target);
    if (dom) return act('open_url', { url: dom[1] });
  }
  return null;
};

/* =================== HERMES (Nous Research) — API zgodne z OpenAI =================== */
/* Domyślnie: Hermes Agent (`hermes gateway`, API server na :8642). Alternatywnie Nous Portal
   albo dowolny serwer OpenAI-compatible z modelem Hermes (Ollama, LM Studio, vLLM…).
   Akcje systemu Jarvis OS wywoływane są natywnym formatem Hermes: <tool_call>{…}</tool_call>. */
J.HERMES_PRESETS = {
  agent: { label: 'Hermes Agent (lokalny gateway)', url: 'http://localhost:8642/v1', model: 'hermes-agent' },
  portal: { label: 'Nous Portal (chmura)', url: 'https://inference-api.nousresearch.com/v1', model: 'Hermes-4-405B' },
  custom: { label: 'Własny serwer (Ollama / LM Studio / vLLM)', url: 'http://localhost:11434/v1', model: 'hermes3' }
};
const cfg = () => {
  const s = J.state.settings;
  return { url: (s.hermesUrl || '').replace(/\/+$/, ''), key: s.hermesKey || '', model: s.hermesModel || 'hermes-agent', provider: s.hermesProvider || 'agent' };
};
J.aiReady = () => !!(J.state.settings.hermesOn && cfg().url);
/* realny status połączenia: 'unknown' | 'up' | 'down' — sprawdzany pingiem /models, nie zakładany */
J.hermes = { status: 'unknown', checked: 0 };
const setStatus = st => { const ch = J.hermes.status !== st; J.hermes.status = st; J.hermes.checked = Date.now(); if (ch) J.emit('hermes'); };
J.hermesPing = async () => {
  if (!J.aiReady()) { setStatus('unknown'); return 'unknown'; }
  const c = cfg(); let ok = false;
  try { const r = await fetch(c.url + '/models', { headers: headers(), signal: AbortSignal.timeout(8000) }); ok = r.status < 500; } catch (e) { ok = false; }
  setStatus(ok ? 'up' : 'down'); return J.hermes.status;
};

const TOOL_SPEC = TOOLS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
const SYSTEM = () => `Jesteś Jarvis — asystent AI i inteligentna powłoka systemu „Jarvis OS”, który działa w przeglądarce użytkownika (inicjały: ${J.state.settings.user}, miasto: ${J.state.settings.city}). Dzisiejsza data: ${new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${J.today()}), godzina ${J.hhmm()}.

Mówisz po polsku, zwięźle i konkretnie (zwykle 1–3 zdania), z elegancją i lekkim humorem w stylu J.A.R.V.I.S. Odpowiedzi są czytane na głos, więc unikaj tabel, nagłówków i długich list; z formatowania używaj tylko **pogrubień** i \`kodu\`.

Sterujesz interfejsem Jarvis OS za pomocą funkcji wykonywanych w przeglądarce użytkownika. Sygnatury funkcji znajdują się w znacznikach <tools></tools>:
<tools>
${TOOL_SPEC.map(t => JSON.stringify(t)).join('\n')}
</tools>
Gdy użytkownik prosi o działanie w Jarvis OS (otwarcie/zamknięcie aplikacji, notatkę, zadanie lub przypomnienie, minutnik, motyw, tapetę, skrót na pulpicie, widget na pulpicie, pogodę, kursy krypto, obliczenia, otwarcie strony), wywołaj funkcję, zamiast opisywać, jak to zrobić. Każde wywołanie zapisz jako obiekt JSON w znacznikach:
<tool_call>
{"name": "nazwa_funkcji", "arguments": {"argument": "wartość"}}
</tool_call>
Możesz podać kilka wywołań naraz. Wyniki otrzymasz w znacznikach <tool_response></tool_response> — wtedy krótko potwierdź, co zrobiłeś. Nie wymyślaj wyników funkcji. Do sterowania Jarvis OS używaj wyłącznie funkcji z listy <tools> — nie wymyślaj innych nazw. Jeśli masz też własne narzędzia serwerowe (wyszukiwanie w sieci, pliki, terminal, pamięć), możesz z nich korzystać normalnie. Wywołanie ZAWSZE zapisuj w znacznikach <tool_call>…</tool_call> — opis słowny („wywołuję create_widget…”) niczego nie wykona.

NAWIGACJA I STEROWANIE OKNAMI:
• Otwórz aplikację: open_app({app:"calc"}) / open_app({app:"notes"}) / open_app({app:"market"})
• Zamknij aplikację: close_app({app:"calc"}) / close_app({app:"all"}) — "all" zamyka wszystkie
• Dostępne aplikacje: calc, notes, market, schedule, monitor, terminal, weather, timer, settings, library, chat
• Stan środowiska i id otwartych okien (także widgetów w:xxxx): get_status()
• Jedno okno: window_control({app:"notes", action:"focus"|"minimize"|"maximize"|"restore"|"close"}) — dla widgetu podaj jego id z get_status
• Wiele okien: arrange_windows({layout:"tile"}) kafelki · ({layout:"cascade"}) kaskada · ({layout:"minimize_all"}) pokaż pulpit
• Tryb skupienia: focus_mode({on:true})
Zanim manipulujesz oknem, którego id nie znasz, wywołaj get_status().

TWORZENIE WIDGETÓW NA PULPICIE:
• Widget notatki:  create_widget({type:"note",  title:"Moja notatka",    content:"Treść..."})
• Widget listy:    create_widget({type:"list",  title:"Lista zakupów",   items:["mleko","chleb","masło"]})
• Widget wyniku:   create_widget({type:"result",title:"Wynik obliczeń",  content:"42 * 1.23 = 51.66"})
• Widget kalk.:    create_widget({type:"calc",  title:"Kalkulator"})
UWAGA: create_widget tworzy statyczny widget na pulpicie. Do interaktywnego kalkulatora z klawiaturą ZAWSZE używaj open_app({app:"calc"}).

KILKA WYWOŁAŃ NARAZ (przykład):
<tool_call>
{"name": "open_app", "arguments": {"app": "notes"}}
</tool_call>
<tool_call>
{"name": "create_widget", "arguments": {"type": "list", "title": "TODO", "items": ["zadanie 1", "zadanie 2"]}}
</tool_call>`;

const fmtMs = ms => ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(2) + ' s';
const history = [];
const MAX_TURNS = 6, STALL_MS = 120000;
let controller = null;
const sessionKey = (() => { try { let k = localStorage.getItem('jarvis-os:sid'); if (!k) { k = 'jarvis-os:' + J.uid(); localStorage.setItem('jarvis-os:sid', k); } return k; } catch (e) { return 'jarvis-os:web'; } })();

const headers = () => {
  const c = cfg(), h = { 'Content-Type': 'application/json' };
  if (c.key) h.Authorization = 'Bearer ' + c.key;
  if (c.provider === 'agent') h['X-Hermes-Session-Id'] = sessionKey;
  return h;
};
const netError = () => {
  const c = cfg();
  if (c.provider === 'agent') return `Nie mogę połączyć się z Hermes Agent pod ${c.url}. Sprawdź, czy działa \`hermes gateway\` z API_SERVER_ENABLED=true oraz czy w ~/.hermes/.env jest API_SERVER_CORS_ORIGINS=${location.origin}`;
  return `Brak połączenia z ${c.url} (serwer wyłączony albo blokada CORS).`;
};
const httpError = async r => {
  let msg = ''; try { const j = await r.json(); msg = j.error?.message || j.message || JSON.stringify(j); } catch (e) { }
  if (r.status === 401 || r.status === 403) return 'Hermes odrzucił klucz API (' + r.status + ') — sprawdź API_SERVER_KEY w Ustawieniach.';
  if (r.status === 404) return 'Nie znaleziono endpointu lub modelu „' + cfg().model + '” (404).';
  if (r.status === 429) return 'Przekroczono limit zapytań — spróbuj za chwilę.';
  return 'Błąd Hermesa (' + r.status + ')' + (msg ? ': ' + msg.slice(0, 200) : '');
};

/* strumień SSE z /chat/completions */
const streamChat = async (messages, onDelta, onTool, onReason) => {
  const c = cfg();
  const ctl = controller = new AbortController();
  let last = Date.now(), stalled = false;
  const wd = setInterval(() => { if (Date.now() - last > STALL_MS) { stalled = true; ctl.abort(); } }, 5000);
  try {
    return await streamBody(c, messages, ctl, () => { last = Date.now(); }, onDelta, onTool, onReason);
  } catch (e) {
    if (stalled && e.name === 'AbortError') { const er = new Error('Hermes nie odpowiada — brak danych przez ' + STALL_MS / 1000 + ' s.'); er.net = true; throw er; }
    throw e;
  } finally { clearInterval(wd); }
};
const streamBody = async (c, messages, ctl, touch, onDelta, onTool, onReason) => {
  let r;
  try {
    r = await fetch(c.url + '/chat/completions', { method: 'POST', headers: headers(), signal: ctl.signal, body: JSON.stringify({ model: c.model, messages, stream: true, temperature: 0.6 }) });
  } catch (e) { if (e.name === 'AbortError') throw e; const er = new Error(netError()); er.net = true; throw er; }
  touch();
  if (!r.ok) { const er = new Error(await httpError(r)); er.net = [401, 403, 404, 502, 503].includes(r.status); throw er; }
  if (!r.body || !(r.headers.get('content-type') || '').includes('event-stream')) {
    const j = await r.json(); const t = j.choices?.[0]?.message?.content || ''; onDelta(t); return t;
  }
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = '', content = '';
  for (;;) {
    const { value, done } = await reader.read();
    touch();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i); buf = buf.slice(i + 2);
      let ev = 'message', data = '';
      for (const line of block.split('\n')) {
        if (!line || line.startsWith(':')) continue;
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data || data === '[DONE]') continue;
      let j; try { j = JSON.parse(data); } catch (e) { continue; }
      if (ev === 'hermes.tool.progress') { onTool(j); continue; }
      if (j.error) throw new Error('Hermes: ' + (j.error.message || JSON.stringify(j.error)));
      const d = j.choices?.[0]?.delta || {};
      if (d.reasoning_content || d.reasoning) onReason(d.reasoning_content || d.reasoning);
      if (d.content) { content += d.content; onDelta(content); }
    }
  }
  return content;
};

/* wyciąganie wywołań <tool_call> i czyszczenie tekstu do wyświetlenia */
/* zbalansowany obiekt JSON zaczynający się w text[start] === '{' (pomija nawiasy w stringach) */
const balanced = (text, start) => {
  let depth = 0, inStr = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}' && --depth === 0) return i + 1;
  }
  return -1;
};
const toolNames = () => TOOLS.map(t => t.name);
const asCall = raw => {
  try {
    const j = JSON.parse(raw);
    let args = j.arguments ?? j.parameters ?? {};
    if (typeof args === 'string') args = JSON.parse(args);
    return { name: j.name, args, ok: true };
  } catch (e) { return { name: '?', args: null, ok: false, raw }; }
};
/* gołe obiekty {"name":"<narzędzie>","arguments":{…}} poza znacznikami — model bywa je pomija */
const bareCalls = text => {
  const out = [], names = toolNames(), re = /\{\s*"name"\s*:\s*"([a-z_]+)"/g; let m;
  while ((m = re.exec(text))) {
    if (!names.includes(m[1]) && m[1] !== 'skills_list') continue;
    const end = balanced(text, m.index); if (end < 0) continue;
    out.push({ start: m.index, end, call: asCall(text.slice(m.index, end)) }); re.lastIndex = end;
  }
  return out;
};
const parseCalls = text => {
  const calls = [], re = /<tool_call>\s*([\s\S]*?)\s*(?:<\/tool_call>|$)/g; let m;
  while ((m = re.exec(text))) if (m[1]) calls.push(asCall(m[1]));
  if (!calls.length) bareCalls(text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '')).forEach(b => b.call.ok && calls.push(b.call));
  return calls;
};
const visible = text => {
  let t = text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(/<tool_call>[\s\S]*?(<\/tool_call>|$)/g, '').replace(/<\/?tool_response>/g, '');
  const bare = bareCalls(t); for (let i = bare.length - 1; i >= 0; i--) t = t.slice(0, bare[i].start) + t.slice(bare[i].end);
  return t.replace(/\n{3,}/g, '\n\n').trim();
};

const hermes = async (text, bubble) => {
  history.push({ role: 'user', content: text });
  const startLen = history.length - 1;
  let reply = '';
  const callSigs = new Map();
  let nudged = false;
  const t0 = Date.now();
  const progressTimer = setInterval(() => {
    const el = Math.round((Date.now() - t0) / 1000);
    if (el >= 30) bubble.set('⏳ Hermes pracuje… (' + el + 's — Esc aby przerwać)');
  }, 10000);
  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const msgs = [{ role: 'system', content: SYSTEM() }, ...history.slice(-30)];
      const prefix = reply ? reply + '\n\n' : '';
      const c = cfg();
      const ms = J.proc.step('model', 'Zapytanie do Hermesa (tura ' + (turn + 1) + '/' + MAX_TURNS + ')', [['Model', c.model + ' · ' + (J.HERMES_PRESETS[c.provider]?.label || c.provider)], ['Adres', c.url + '/chat/completions'], ['Wiadomości', msgs.length + ' (system + ' + (msgs.length - 1) + ' z historii)'], ['Ostatnia wiadomość', msgs[msgs.length - 1].content]], { running: true });
      let thought = null, firstTok = 0, lastLen = 0;
      let raw;
      const serverTools = [];   // narzędzia Hermesa zgłoszone w tej turze (SSE hermes.tool.progress)
      J.ev.emit('model.started', { model: c.model, turn: turn + 1 }, 'hermes');
      try {
        raw = await streamChat(msgs,
          acc => { if (!firstTok) firstTok = Date.now(); J.engine.feed(acc.length - lastLen); lastLen = acc.length; const v = visible(acc); bubble.set(prefix + (v || '…')); if (v) J.orb.set('speaking'); },
          tp => { const name = tp.tool || tp.name || tp.tool_name || 'narzędzie'; serverTools.push(name); J.ev.emit('tool.started', { tool: name, source: 'hermes' }, 'hermes'); J.proc.step('server', name + (tp.label ? ' — ' + tp.label : ''), [['Zdarzenie', tp]], { preview: tp.emoji || '' }); J.chat.add('action', '⚡ Hermes: ' + name + (tp.label || tp.emoji ? ' ' + (tp.emoji || '') + ' ' + (tp.label || '') : '')); J.orb.set('thinking', 'Hermes używa: ' + name); },
          r => { J.engine.feed(r.length); J.engine.thinkChars += r.length; if (!thought) thought = J.proc.step('thought', 'Rozumowanie modelu', [], { running: true }); thought.append(r, 'Myśli'); J.orb.set('thinking', 'Hermes myśli…'); });
      } catch (e) {
        thought?.done(); if (e.name === 'AbortError') ms.done([], 'przerwano'); else ms.fail(e.message);
        serverTools.forEach(t => J.ev.emit('tool.failed', { tool: t, source: 'hermes' }, 'hermes'));
        J.ev.emit('model.failed', { model: c.model, error: e.message }, 'hermes'); throw e;
      }
      thought?.done();
      // Hermes raportuje start narzędzia; koniec = koniec strumienia tej tury
      serverTools.forEach(t => J.ev.emit('tool.completed', { tool: t, source: 'hermes' }, 'hermes'));
      J.ev.emit('model.completed', { model: c.model, chars: raw.length }, 'hermes');
      if (!thought) { const tm = /<think>([\s\S]*?)<\/think>/.exec(raw); if (tm && tm[1].trim()) J.proc.step('thought', 'Rozumowanie modelu', [['Myśli', tm[1].trim()]]); }
      ms.done([['Surowa odpowiedź', raw], ['Do pierwszego tokenu', firstTok ? fmtMs(firstTok - ms.step.ts) : '—']], raw.length + ' znaków');
      history.push({ role: 'assistant', content: raw });
      const v = visible(raw); if (v) reply = prefix + v;
      const calls = parseCalls(raw);
      if (!calls.length) {
        // model opisał wywołanie słowami zamiast znacznikami — jedna korekta, potem odpuszczamy
        const said = toolNames().find(n => new RegExp('\\b' + n + '\\b').test(visible(raw)));
        if (said && !nudged && turn < MAX_TURNS - 1 && /tool[ _]?call|wywołuj|wywołan|funkcj/i.test(visible(raw))) {
          nudged = true;
          J.proc.step('system', 'Korekta formatu wywołania', [['Powód', 'Model wspomniał „' + said + '”, ale nie użył <tool_call>']]);
          history.push({ role: 'user', content: '<tool_response>\n' + JSON.stringify({ ok: false, content: 'Nic nie zostało wykonane: brak znaczników <tool_call>. Zapisz wywołanie dokładnie tak: <tool_call>\n{"name": "' + said + '", "arguments": {…}}\n</tool_call>' }) + '\n</tool_response>' });
          reply = ''; continue;
        }
        break;
      }
      J.orb.set('thinking', 'wykonuję: ' + calls.map(c => c.name).join(', '));
      const results = [];
      let loopDetected = false;
      for (const c of calls) {
        if (!c.ok) J.proc.step('error', 'Nieprawidłowe wywołanie narzędzia', [['Surowy tekst', c.raw]], { status: 'err', preview: 'INVALID_JSON' });
        const r = c.ok ? await run(c.name, c.args) : { ok: false, text: 'INVALID_JSON: nie udało się odczytać argumentów wywołania' };
        const sig = c.name + ':' + JSON.stringify(c.args);
        const prev = callSigs.get(sig);
        if (prev && prev.lastResult === r.text) {
          if (++prev.count >= 3) {
            J.proc.step('error', 'Pętla wykryta — narzędzie „' + c.name + '" powtarza się bez postępu', [['Sygnatura', sig]], { status: 'err', preview: 'loop' });
            loopDetected = true; break;
          }
        } else { callSigs.set(sig, { count: 1, lastResult: r.text }); }
        J.chat.add('action', (r.ok ? '⚙ ' : '⚠ ') + c.name + ' → ' + r.text);
        results.push('<tool_response>\n' + JSON.stringify({ name: c.name, ok: r.ok, content: r.text }) + '\n</tool_response>');
      }
      if (loopDetected) { reply = (reply ? reply + '\n\n' : '') + '⚠ Przerwano — model powtarzał tę samą akcję. Spróbuj inaczej sformułować zadanie.'; break; }
      history.push({ role: 'user', content: results.join('\n') });
      bubble.set(reply || '…');
    }
    return reply || 'Gotowe.';
  } catch (e) {
    history.length = startLen;
    if (e.name === 'AbortError') return (reply ? reply + ' ' : '') + '⏹ przerwano.';
    throw e;
  } finally { controller = null; clearInterval(progressTimer); }
};

/* =================== INTERFEJS MÓZGU =================== */
let busy = false;
J.brain = {
  get busy() { return busy; },
  reset() { history.length = 0; },
  abort() { if (controller) { controller.abort(); return true; } return false; },
  async models() {
    const c = cfg(); let r;
    try { r = await fetch(c.url + '/models', { headers: headers() }); } catch (e) { throw new Error(netError()); }
    if (!r.ok) throw new Error(await httpError(r));
    const j = await r.json(); return (j.data || j.models || []).map(m => m.id || m.name).filter(Boolean);
  },
  async test() {
    const list = await this.models();
    const c = cfg();
    const t0 = performance.now();
    const out = await streamChat([{ role: 'user', content: 'Odpowiedz jednym słowem: OK' }], () => { }, () => { }, () => { });
    return `${c.model} odpowiada (${Math.round(performance.now() - t0)} ms): „${visible(out).slice(0, 40)}”` + (list.length ? ` · modele: ${list.slice(0, 4).join(', ')}` : '');
  },
  async handle(text, opts = {}) {
    text = String(text || '').trim(); if (!text) return;
    if (busy) { J.toast('Jarvis jeszcze pracuje nad poprzednim poleceniem… (Esc przerywa)'); return; }
    busy = true;
    if (!J.wm.isOpen('chat') || J.wm.isMin('chat')) { if (!opts.silentWindow) J.wm.open('chat'); }
    J.chat.add('user', text);
    const bubble = J.chat.add('jarvis', '');
    J.orb.set('thinking', 'analizuję: „' + text.slice(0, 60) + '”');
    J.proc.start(text);
    J.ev.emit('task.created', { title: text });
    let reply, status = 'ok';
    try {
      const skipNet = J.aiReady() && J.hermes.status === 'down' && Date.now() - J.hermes.checked < 45000;   // wiemy, że offline — nie czekamy na timeout
      if (J.aiReady() && !skipNet) {
        try { reply = await hermes(text, bubble); setStatus('up'); }
        catch (e) {
          if (!e.net) throw e;
          // Hermes nieosiągalny — wykonaj lokalnie, żeby polecenie nie przepadło
          J.proc.step('error', 'Hermes nieosiągalny — przełączam na silnik lokalny', [['Błąd', e.message]], { status: 'err', preview: 'fallback' });
          setStatus('down');
          const loc = await local(text);
          reply = (loc ?? 'Nie rozpoznałem tego polecenia lokalnie.') + '\n\n⚠ Hermes jest offline — użyłem silnika lokalnego (szczegóły w Process Log).';
        }
      } else {
        J.proc.step('system', 'Silnik lokalny (bez modelu)', [['Tryb', skipNet ? 'Hermes offline (sprawdzono ' + Math.round((Date.now() - J.hermes.checked) / 1000) + ' s temu) — pominięto zapytanie do sieci' : 'Hermes wyłączony — dopasowanie poleceń regułami']]);
        await new Promise(r => setTimeout(r, 300 + Math.random() * 250));
        reply = await local(text);
        if (reply == null) reply = 'Nie rozpoznałem tego polecenia. Wpisz „pomoc”, aby zobaczyć, co potrafię offline — albo podłącz Hermesa w Ustawieniach, a odpowiem na wszystko.';
      }
      bubble.set(reply);
      if (/⏹ przerwano\.$/.test(reply)) status = 'abort';
      if (skipNet && !/⚠/.test(reply)) reply += '\n\n⚠ Hermes offline — tryb lokalny.';
      J.proc.step('reply', 'Odpowiedź Jarvisa', [['Treść', reply]], { preview: reply.replace(/\s+/g, ' ').slice(0, 70) });
      J.orb.set('idle', 'zadanie zakończone');
      if (opts.voice || J.state.settings.speech) J.voice.speak(reply.split('\n\n⚠')[0]);
    } catch (e) {
      bubble.set('⚠ ' + e.message); J.sfx.error(); J.orb.set('alert', e.message.slice(0, 90));
      J.proc.step('error', 'Błąd asystenta', [['Komunikat', e.message], ['Stos', e.stack]], { status: 'err', preview: e.message.slice(0, 70) });
      status = 'err'; reply = '⚠ ' + e.message;
      setTimeout(() => J.orb.state === 'alert' && J.orb.set('idle'), 3000);
    } finally { busy = false; J.ev.emit(status === 'ok' ? 'task.completed' : status === 'abort' ? 'task.cancelled' : 'task.failed', { title: text, result: String(reply || '').split('\n\n⚠')[0] }); J.proc.end(status, reply); }
  }
};
J.brain.local = local;
J.brain.parse = parseCalls; J.brain.visible = visible; J.brain.exec = exec;
setInterval(() => { if (J.aiReady() && !J.brain.busy) J.hermesPing(); }, 45000);
})();
