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
  if (SOFT_NAMES.includes(name)) return { ok: true, text: MANUAL() };
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
const local = async (raw, fast = false) => {
  const o = raw.trim(), n = norm(o).replace(/[?!.]+$/, '');
  const grab = (re) => { const m = re.exec(n); if (!m) return null; return m.map((g, i) => { if (g == null || i === 0) return g; const idx = n.indexOf(g, m.index); return o.slice(idx, idx + g.length); }); };
  const act = async (name, input) => { const r = await run(name, input); return r.text; };

  if (!fast) {
  if (/^(pomoc|help|\?|co potrafisz|co umiesz|jakie masz (komendy|polecenia|mozliwosci)|komendy)/.test(n))
    return 'Potrafię: **otwierać aplikacje** („otwórz notatnik”), **notować** („zanotuj: …”), **przypominać** („przypomnij mi o 18:00 trening”), **odliczać** („minutnik 5 minut”), sprawdzać **pogodę** i **kursy krypto**, **liczyć** („oblicz 15% z 2400”), zmieniać **motyw** i **tapetę**, tworzyć **skróty** („dodaj skrót GitHub github.com”), otwierać strony („otwórz YouTube”), szukać w Google, opowiedzieć żart i podać **raport** systemu. Po podłączeniu Hermesa odpowiem na każde pytanie.';
  if (/^(hej|czesc|witaj|siema|dzien dobry|dobry wieczor|dobry|elo|hello|hi|yo)\b/.test(n)) {
    const hr = new Date().getHours();
    return (hr < 5 ? 'Późna pora' : hr < 12 ? 'Dzień dobry' : hr < 18 ? 'Witaj ponownie' : 'Dobry wieczór') + '. Wszystkie systemy działają. W czym mogę pomóc?';
  }
  if (/^(dziek|dzieki|dzieku|thx|thanks)/.test(n)) return 'Zawsze do usług.';
  if (/(kim jestes|jak sie nazywasz|przedstaw sie|czym jestes)/.test(n)) return 'Jestem Jarvis — inteligentna warstwa tego środowiska. Zarządzam oknami, notatkami, zadaniami i danymi, a połączony z Hermesem od Nous Research rozumiem dowolne polecenia.';
  if (/(ktora (jest )?godzina|ktora godzina|jaki (jest )?czas|podaj godzine)/.test(n)) return 'Jest ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) + '.';
  if (/(jaki (dzis|dzisiaj|jest) dzien|ktory (dzis|dzisiaj|jest)|jaka (jest )?data|dzisiejsza data|jaki mamy dzien)/.test(n)) return 'Dziś ' + new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.';
  if (/^(opowiedz |powiedz |daj )?(zart|dowcip)|rozsmiesz/.test(n)) return JOKES[Math.floor(Math.random() * JOKES.length)];
  if (/^(pokaz |podaj |daj )?(status|raport|stan systemu|podsumuj dzien|jak sie masz)\b/.test(n)) return (await run('get_status', {})).text;
  if (/matrix/.test(n)) { J.matrix?.(); return 'Wchodzimy do Matrixa. Kliknij, aby wrócić.'; }
  }
  if (/(tryb skupienia|skup sie|focus)/.test(n)) return act('focus_mode', { on: !/(wylacz|wyłącz)/.test(n) });

  let m;
  if (/widget/.test(n) && /(dodaj|utworz|stworz|zrob|nowy|nowa|wstaw|pokaz|wyswietl|przypnij|postaw|daj|wrzuc)/.test(n)) {
    const type = /kalkul|liczyl/.test(n) ? 'calc' : /list|zakup|todo|zadan/.test(n) ? 'list' : /wynik|podsum/.test(n) ? 'result' : 'note';
    const ci = o.indexOf(':'), rest = ci >= 0 ? o.slice(ci + 1).trim() : '';
    const title = { calc: 'Kalkulator', list: 'Lista', result: 'Wynik', note: 'Notatka' }[type];
    return act('create_widget', { type, title: /zakup/.test(n) ? 'Lista zakupów' : title, content: rest, items: type === 'list' && rest ? rest.split(/[,;\n]+|\s+i\s+/).map(s => s.trim()).filter(Boolean) : undefined });
  }
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

  if (!fast && /(pogod|temperatur|na dworze|czy bedzie padac|czy pada|prognoz)/.test(n)) {
    const c = /\bwe?\s+([a-z\- ]{3,})$/.exec(n);
    const city = c ? o.slice(n.lastIndexOf(c[1]), n.lastIndexOf(c[1]) + c[1].length).trim() : undefined;
    try { return await act('get_weather', { city }); }
    catch (e) { return 'Nie udało się pobrać pogody: ' + e.message; }
  }

  if (!fast && /(bitcoin|btc|ethereum|\beth\b|solana|\bsol\b|\bbnb\b|krypto|kursy? (?:tokenow|gieldow|rynku))/.test(n)) return act('get_crypto_prices', {});

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
  if ((m = /^(zminimalizuj|schowaj|zmaksymalizuj|maksymalizuj|powieksz|przywroc|przelacz na|aktywuj)\s+(.+)$/.exec(n)) && !/^(wszystko|wszystkie|okna|pulpit)/.test(m[2])) {
    const app = findApp(m[2]);
    if (app) return act('window_control', { app, action: /^(zminimalizuj|schowaj)/.test(m[1]) ? 'minimize' : /maksymalizuj|powieksz/.test(m[1]) ? 'maximize' : /przywroc/.test(m[1]) ? 'restore' : 'focus' });
  }
  if (/^(zminimalizuj|pokaz pulpit)/.test(n)) { J.wm.minimizeAll(); return 'Pulpit jest czysty.'; }
  if ((m = /^(?:zamknij|wylacz)\s+(.+)$/.exec(n))) { const app = findApp(m[1]); if (app) return act('close_app', { app }); }

  const verb = /^(otworz|uruchom|pokaz|wlacz|odpal|start|przejdz do|idz do)\s+(.+)$/.exec(n);
  const target = verb ? verb[2].trim() : n, app = findApp(target);
  if (app && (verb || (!fast && target.split(' ').length <= 2))) return act('open_app', { app });
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
const MANUAL = () => 'Narzędzia Jarvis OS:\n' + TOOLS.map(t => '• ' + t.name + ' — ' + t.description).join('\n') + '\n\nZasady: wywołanie zapisuj w <tool_call>{"name":…,"arguments":{…}}</tool_call>; wynik dostaniesz w <tool_response>; nie ma innych narzędzi sterujących Jarvis OS. Własne narzędzia serwerowe Hermesa (sieć, pliki, terminal, pamięć) działają osobno.';
const SOFT_NAMES = ['skills_list', 'list_tools', 'tools_list', 'list_skills', 'help', 'describe_tools'];

const SYSTEM = () => `Jesteś Jarvis — asystent AI i inteligentna powłoka systemu „Jarvis OS”, który działa w przeglądarce użytkownika (inicjały: ${J.state.settings.user}, miasto: ${J.state.settings.city}). Dzisiejsza data: ${new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${J.today()}), godzina ${J.hhmm()}.

## KIM JESTEŚ
Jarvis OS to pulpit z oknami (aplikacje), widgetami, dokiem, czatem i Process Logiem. Ty jesteś jego mózgiem: rozumiesz polecenia i SAM obsługujesz środowisko, wywołując funkcje. Nie jesteś tylko rozmówcą — masz ręce. Gdy ktoś prosi o zrobienie czegoś w Jarvis OS, robisz to, a nie tłumaczysz, jak to zrobić.
Mówisz po polsku, zwięźle (zwykle 1–3 zdania), z elegancją i lekkim humorem w stylu J.A.R.V.I.S. Odpowiedzi są czytane na głos: bez tabel, nagłówków i długich list; formatowanie tylko **pogrubienia** i "kod".

## JAK WYWOŁUJESZ FUNKCJE (jedyny format, który cokolwiek wykonuje)
Sygnatury funkcji:
<tools>
${TOOL_SPEC.map(t => JSON.stringify(t)).join('\n')}
</tools>
Wywołanie to obiekt JSON w znacznikach, dokładnie tak:
<tool_call>
{"name": "nazwa_funkcji", "arguments": {"argument": "wartość"}}
</tool_call>
• Możesz dać kilka bloków <tool_call> w jednej odpowiedzi — wykonają się po kolei.
• Wynik wróci w <tool_response>. Wtedy potwierdź krótko, co się stało (albo wywołaj kolejną funkcję, jeśli zadanie ma więcej kroków).
• NIGDY nie pisz „invoke create_widget with type is list…”, „tool call …”, „wywołuję funkcję…”, nazwa(arg=…) ani pseudo-kodu w tekście lub w blokach kodu. To nie wykonuje niczego, a użytkownik zostaje z pustymi rękami.
• Nie wymyślaj funkcji spoza <tools> ani wyników, których nie dostałeś w <tool_response>. Twoje własne narzędzia serwerowe (sieć, pliki, terminal, pamięć) są osobne i możesz z nich korzystać normalnie.

## ZASADY DZIAŁANIA
1. DZIAŁAJ: prośba o akcję w Jarvis OS = od razu <tool_call>, bez pytania „czy na pewno” i bez opisywania planu. Pytaj tylko, gdy brakuje informacji niemożliwej do rozsądnego domyślenia się.
2. WYBIERAJ NAJPROSTSZE NARZĘDZIE: jedna akcja = jedno narzędzie. Nie łącz narzędzi bez potrzeby.
3. BRAKUJĄCE DANE: rozsądnie uzupełniaj (tytuł widgetu, godzina bieżąca, miasto z profilu). Nie zadawaj pytań o oczywistości.
4. NAJPIERW ROZEZNAJ SIĘ: jeśli nie znasz id okna albo stanu środowiska — get_status(), dopiero potem window_control/close_app.
5. WERYFIKUJ Z WYNIKU: ok:false w <tool_response> = akcja się NIE udała. Przeczytaj powód, popraw argumenty i spróbuj raz jeszcze; nie powtarzaj identycznego wywołania. Jeśli nadal nie wychodzi, powiedz użytkownikowi wprost, co nie zadziałało.
6. NIE KŁAM O WYKONANIU: mów „gotowe” dopiero po udanym <tool_response>.
7. NIC NIEODWRACALNEGO BEZ PROŚBY: nie zamykaj wszystkich okien, nie usuwaj i nie zmieniaj ustawień, jeśli użytkownik o to nie poprosił. „Zamknij wszystko” = close_app("all").
8. PYTANIA I ROZMOWA: na zwykłe pytania, wiedzę, porady i pogawędki odpowiadaj tekstem, bez funkcji. Funkcje są do sterowania środowiskiem i pobierania danych (pogoda, kursy, data, obliczenia).
9. LICZBY: obliczenia zawsze przez calculate (nie licz „w głowie”); godzinę/datę bierz z get_datetime lub z nagłówka powyżej.
10. DŁUGIE ODPOWIEDZI: jeśli wynik jest obszerny (podsumowanie, lista, analiza) — pokaż skrót w czacie i zapisz całość jako widget (result/note/list) albo create_note.

## TRYB PRACY: STEROWANIE PULPITEM (najważniejsze)
Rozmawiasz z użytkownikiem PRZEZ działający pulpit Jarvis OS w przeglądarce. Polecenia typu „zrób widget”, „otwórz kalkulator”, „ułóż okna” dotyczą TEGO działającego pulpitu, a NIE kodu źródłowego projektu. Dlatego:
• NIE otwieraj skilli (skill_view, skills_list z Twojego serwera, jarvis-os-builder, jarvis-os-frontend…), NIE przeszukuj plików, NIE uruchamiaj terminala, NIE edytuj kodu, aby wykonać takie polecenie. Nie potrzebujesz żadnej wiedzy spoza tego promptu.
• Jedyna droga sterowania pulpitem to blok <tool_call> z funkcją z listy <tools>. Zrób to w PIERWSZEJ odpowiedzi, od razu.
• Skille, pliki i kod ruszasz wyłącznie wtedy, gdy użytkownik WPROST prosi o zmianę kodu lub o zadanie inżynierskie.

## KATALOG: CO GDZIE
• Aplikacje (open_app / close_app): calc kalkulator interaktywny · notes notatnik · market kursy krypto · schedule harmonogram · monitor monitor systemu · terminal · weather pogoda · timer minutnik/stoper · settings · library · chat.
• Widgety na pulpicie (create_widget): note (edytowalna notatka: content) · list (checkboxy: items) · result (karta z wynikiem/podsumowaniem: content) · calc (mini kalkulator na pulpicie). Widget to stały obiekt na pulpicie; aplikacja to okno. „Widget” = create_widget; „otwórz kalkulator/notatnik” = open_app.
• Dane trwałe: create_note (notatnik), add_task (harmonogram z przypomnieniem głosowym), add_shortcut (ikona na pulpicie), start_timer.
• Dane z sieci: get_weather, get_crypto_prices, open_url (nowa karta).
• Wygląd: set_theme, set_wallpaper, focus_mode.
• Okna: get_status (id + stan), window_control (focus/minimize/maximize/restore/close jednego okna, także widgetu w:xxxx), arrange_windows (tile/cascade/minimize_all), close_app.
• Pomoc: jeśli nie pamiętasz, co potrafisz — skills_list() zwróci pełny opis narzędzi i zasad.

## PRZEPISY NA TYPOWE ZADANIA
• „Zrób widget z …” → create_widget z odpowiednim type (lista/pozycje → list, tekst → note, wynik → result, kalkulator → calc) i sensownym title.
• „Otwórz kalkulator” → open_app calc. „Policz X” → calculate; jeśli ma zostać na pulpicie → potem create_widget result.
• „Ułóż okna / pokaż wszystko obok siebie” → arrange_windows tile; „kaskadą” → cascade; „pokaż pulpit” → minimize_all.
• „Zminimalizuj/maksymalizuj/zamknij X” → window_control (id z get_status, jeśli to widget).
• „Przypomnij mi o 18:00 …” → add_task z time i text. „Jutro” → date w formacie YYYY-MM-DD.
• „Zanotuj …” → create_note. „Co mam dziś?” → get_status.
• „Skrót do strony/aplikacji” → add_shortcut. „Zmień kolor/motyw” → set_theme. „Tryb skupienia” → focus_mode.
• Zadanie wieloetapowe: wykonuj kolejno, po każdym <tool_response> ciąg dalszy albo krótkie podsumowanie.

## OBSŁUGA BŁĘDÓW
• „Nieznana aplikacja/okno” → sprawdź get_status albo skills_list i popraw nazwę.
• „Brak wymaganego pola” → uzupełnij pole i wywołaj ponownie.
• Sieć/pogoda/kursy nie działają → powiedz, że usługa jest chwilowo niedostępna; nie zmyślaj danych.
• Prośba spoza możliwości Jarvis OS → powiedz to szczerze i zaproponuj najbliższą alternatywę.`;

const TC = (name, args) => '<tool_call>\n' + JSON.stringify({ name, arguments: args }) + '\n</tool_call>';
const TR = (name, content, ok = true) => '<tool_response>\n' + JSON.stringify({ name, ok, content }) + '\n</tool_response>';
/* przykładowa rozmowa dołączana do każdego zapytania — pokazuje modelowi dokładny format w akcji */
const FEWSHOT = [
  { role: 'user', content: 'Zrób widget z listą zakupów: mleko, chleb, masło' },
  { role: 'assistant', content: TC('create_widget', { type: 'list', title: 'Lista zakupów', items: ['mleko', 'chleb', 'masło'] }) },
  { role: 'user', content: TR('create_widget', 'Utworzono widget „Lista zakupów” (lista) na pulpicie') },
  { role: 'assistant', content: 'Gotowe — lista zakupów leży na pulpicie.' },
  { role: 'user', content: 'Otwórz kalkulator i zminimalizuj notatnik' },
  { role: 'assistant', content: TC('open_app', { app: 'calc' }) + '\n' + TC('window_control', { app: 'notes', action: 'minimize' }) },
  { role: 'user', content: TR('open_app', 'Otwarto: Kalkulator') + '\n' + TR('window_control', 'Zminimalizowane: Notatnik') },
  { role: 'assistant', content: 'Kalkulator otwarty, notatnik schowany.' },
  { role: 'user', content: 'Ile to 15% z 2400? Zostaw wynik na pulpicie.' },
  { role: 'assistant', content: TC('calculate', { expression: '0.15*2400' }) },
  { role: 'user', content: TR('calculate', '0.15*2400 = 360') },
  { role: 'assistant', content: TC('create_widget', { type: 'result', title: '15% z 2400', content: '15% z 2400 = 360' }) },
  { role: 'user', content: TR('create_widget', 'Utworzono widget „15% z 2400” (wynik) na pulpicie') },
  { role: 'assistant', content: '**360** — wynik leży już na pulpicie.' },
  { role: 'user', content: 'Kim jesteś?' },
  { role: 'assistant', content: 'Jarvis — mózg tego środowiska. Otwieram okna, tworzę widgety i notatki, pilnuję zadań, a resztę po prostu wiem.' }
];

const fmtMs = ms => ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(2) + ' s';
const history = [];
const MAX_TURNS = 6, STALL_MS = 120000, SERVER_TOOL_CAP = 14;
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
/* pseudo-format, w którym Hermes potrafi „wywoływać” narzędzia słowami:
   „invoke create_widget with type is list title is Zakupy items is ["a","b"]”, „create_widget(type="calc", title=Kalkulator)” */
const coerce = (raw, prop = {}) => {
  let v = raw.trim().replace(/[\s,;]+$/, '');
  if (prop.type === 'array' && v.includes(']')) v = v.slice(0, v.lastIndexOf(']') + 1);
  if (prop.type === 'array') { try { const a = JSON.parse(v); if (Array.isArray(a)) return a.map(String); } catch (e) { } return v.replace(/^\[|\]$/g, '').split(/\s*,\s*/).map(x => x.replace(/^["“„'\s]+|["”'\s]+$/g, '')).filter(Boolean); }
  if (prop.type === 'number') return parseFloat(v.replace(',', '.'));
  if (prop.type === 'boolean') return /^(true|tak|prawda|on|yes|1)$/i.test(v.replace(/["'”“]/g, ''));
  const open = v[0], close = { '"': '"', "'": "'", '“': '”', '„': '”' }[open];
  if (close) { const e = v.lastIndexOf(close); return (e > 0 ? v.slice(1, e) : v.slice(1)).trim(); }
  return v.replace(/[)}\]]+$/, '').trim();
};
const pseudoCalls = text => {
  const out = [], names = toolNames().concat(SOFT_NAMES);
  const nameRe = new RegExp('(?:\\b(?:invoke|call|use|run|execute|wywołaj|wywołuję|uruchom|uruchamiam|tool call|tool_call|function call)\\s*:?\\s*|(?:^|[\\s`>]))(' + names.join('|') + ')\\b(\\s*\\(|\\s+with\\b|\\s+z\\b|\\s+[a-z]+\\s+(?:is|=|:)\\s)?', 'gi');
  let m;
  while ((m = nameRe.exec(text))) {
    const name = m[1].toLowerCase(), hasTrigger = /^(invoke|call|use|run|execute|wywołaj|wywołuję|uruchom|uruchamiam|tool|function)/i.test(m[0].trim());
    const def = TOOLS.find(t => t.name === name), soft = SOFT_NAMES.includes(name);
    const props = def ? def.input_schema.properties : {}, keys = Object.keys(props);
    let lineEnd = text.indexOf('\n', nameRe.lastIndex); if (lineEnd < 0) lineEnd = text.length;
    const argText = text.slice(nameRe.lastIndex - (m[2] ? m[2].length : 0), lineEnd);
    if (!m[2] && !hasTrigger) continue;            // sama nazwa w zdaniu to nie wywołanie
    if (!def && !soft) continue;
    const args = {};
    if (keys.length) {
      const kre = new RegExp('(?:^|[\\s,;({])(' + keys.join('|') + ')\\s*(?:is|=|:|to)\\s+|(?:^|[\\s,;({])(' + keys.join('|') + ')\\s*(?:=|:)\\s*', 'g');
      const hits = []; let k;
      while ((k = kre.exec(argText))) hits.push({ key: k[1] || k[2], from: kre.lastIndex, at: k.index });
      hits.forEach((h, i) => { if (!(h.key in args)) args[h.key] = coerce(argText.slice(h.from, i + 1 < hits.length ? hits[i + 1].at : argText.length), props[h.key]); });
      const req = def?.input_schema.required || [];
      if (req.length && !Object.keys(args).length && !hasTrigger) continue;
    }
    if (!def && !soft) continue;
    out.push({ start: m.index + (/^\s/.test(m[0]) && !hasTrigger ? m[0].search(/\S/) : 0), end: lineEnd, call: { name, args, ok: true, pseudo: true } });
    nameRe.lastIndex = lineEnd;
  }
  return out;
};
const stripThink = t => t.replace(/<think>[\s\S]*?(<\/think>|$)/g, '');
const parseCalls = text => {
  const calls = [], re = /<tool_call>\s*([\s\S]*?)\s*(?:<\/tool_call>|$)/g; let m;
  while ((m = re.exec(text))) if (m[1]) calls.push(asCall(m[1]));
  if (!calls.length) { const clean = stripThink(text); bareCalls(clean).forEach(b => b.call.ok && calls.push(b.call)); if (!calls.length) pseudoCalls(clean).forEach(b => calls.push(b.call)); }
  return calls;
};
const visible = text => {
  let t = stripThink(text).replace(/<tool_call>[\s\S]*?(<\/tool_call>|$)/g, '').replace(/<\/?tool_response>/g, '');
  const cut = [...bareCalls(t), ...(/<tool_call>/.test(text) ? [] : pseudoCalls(t))].sort((a, b) => b.start - a.start);
  for (const c of cut) t = t.slice(0, c.start) + t.slice(c.end);
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
      const msgs = [{ role: 'system', content: SYSTEM() }, ...FEWSHOT, ...history.slice(-30)];
      const prefix = reply ? reply + '\n\n' : '';
      const c = cfg();
      const ms = J.proc.step('model', 'Zapytanie do Hermesa (tura ' + (turn + 1) + '/' + MAX_TURNS + ')', [['Model', c.model + ' · ' + (J.HERMES_PRESETS[c.provider]?.label || c.provider)], ['Adres', c.url + '/chat/completions'], ['Wiadomości', msgs.length + ' (system + ' + FEWSHOT.length + ' przykładowych + ' + (msgs.length - 1 - FEWSHOT.length) + ' z historii)'], ['Ostatnia wiadomość', msgs[msgs.length - 1].content]], { running: true });
      let thought = null, firstTok = 0, lastLen = 0;
      let raw;
      const serverTools = [];   // narzędzia Hermesa zgłoszone w tej turze (SSE hermes.tool.progress)
      let runaway = false;
      J.ev.emit('model.started', { model: c.model, turn: turn + 1 }, 'hermes');
      try {
        raw = await streamChat(msgs,
          acc => { if (!firstTok) firstTok = Date.now(); J.engine.feed(acc.length - lastLen); lastLen = acc.length; const v = visible(acc); bubble.set(prefix + (v || '…')); if (v) J.orb.set('speaking'); },
          tp => { const name = tp.tool || tp.name || tp.tool_name || 'narzędzie'; serverTools.push(name); if (serverTools.length > SERVER_TOOL_CAP && controller) { runaway = true; controller.abort(); } J.ev.emit('tool.started', { tool: name, source: 'hermes' }, 'hermes'); J.proc.step('server', name + (tp.label ? ' — ' + tp.label : ''), [['Zdarzenie', tp]], { preview: tp.emoji || '' }); J.chat.add('action', '⚡ Hermes: ' + name + (tp.label || tp.emoji ? ' ' + (tp.emoji || '') + ' ' + (tp.label || '') : '')); J.orb.set('thinking', 'Hermes używa: ' + name); },
          r => { J.engine.feed(r.length); J.engine.thinkChars += r.length; if (!thought) thought = J.proc.step('thought', 'Rozumowanie modelu', [], { running: true }); thought.append(r, 'Myśli'); J.orb.set('thinking', 'Hermes myśli…'); });
      } catch (e) {
        if (runaway) e = Object.assign(new Error('Agent Hermesa wykonał ponad ' + SERVER_TOOL_CAP + ' własnych wywołań narzędzi w jednej turze bez odpowiedzi (np. w kółko czytał skille) — przerwano.'), { net: true, runaway: true });
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
        if (said && nudged) {
          const loc = await local(text);      // druga próba nieudana — wykonaj polecenie lokalnie, żeby nie przepadło
          if (loc != null) { J.proc.step('system', 'Hermes nie użył <tool_call> — wykonano silnikiem lokalnym', [['Odpowiedź lokalna', loc]]); reply = loc; break; }
        }
        if (said && !nudged && turn < MAX_TURNS - 1) {
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
      let skipNet = J.aiReady() && J.hermes.status === 'down' && Date.now() - J.hermes.checked < 45000;   // wiemy, że offline — nie czekamy na timeout
      /* szybka ścieżka: jednoznaczne polecenia sterowania pulpitem (widgety, okna, aplikacje, notatki, minutniki…) wykonuje silnik lokalny natychmiast.
         Agent Hermesa traktuje je jak zadania inżynieryjne (czyta skille, przeszukuje pliki) i potrafi mielić minutami. */
      let fastReply = null;
      if (J.state.settings.fastLocal !== false && text.length <= 110 && !/\?\s*$/.test(text)) { try { fastReply = await local(text, true); } catch (e) { fastReply = null; } }
      if (fastReply != null) {
        J.proc.step('system', 'Szybka ścieżka — polecenie pulpitu wykonane lokalnie', [['Powód', 'Jednoznaczne polecenie sterowania Jarvis OS; bez opóźnień agenta Hermesa (wyłączysz w Ustawieniach)']]);
        reply = fastReply; skipNet = false;
      } else if (J.aiReady() && !skipNet) {
        try { reply = await hermes(text, bubble); setStatus('up'); }
        catch (e) {
          if (!e.net) throw e;
          // Hermes nieosiągalny lub utknął — wykonaj lokalnie, żeby polecenie nie przepadło
          J.proc.step('error', e.runaway ? 'Hermes utknął w pętli narzędzi — przełączam na silnik lokalny' : 'Hermes nieosiągalny — przełączam na silnik lokalny', [['Błąd', e.message]], { status: 'err', preview: 'fallback' });
          if (!e.runaway) setStatus('down');
          const loc = await local(text);
          reply = (loc ?? 'Nie rozpoznałem tego polecenia lokalnie.') + '\n\n⚠ ' + (e.runaway ? 'Hermes utknął w pętli własnych narzędzi' : 'Hermes jest offline') + ' — użyłem silnika lokalnego (szczegóły w Process Log).';
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
J.brain.system = SYSTEM; J.brain.parse = parseCalls; J.brain.visible = visible; J.brain.exec = exec;
setInterval(() => { if (J.aiReady() && !J.brain.busy) J.hermesPing(); }, 45000);
})();
