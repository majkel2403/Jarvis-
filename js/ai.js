/* =========================================================
   JARVIS OS — mózg: akcje systemowe, silnik lokalny, Claude AI
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
const SITES = { youtube: 'https://youtube.com', google: 'https://google.com', github: 'https://github.com', gmail: 'https://mail.google.com', spotify: 'https://open.spotify.com', netflix: 'https://netflix.com', facebook: 'https://facebook.com', twitter: 'https://x.com', wikipedia: 'https://pl.wikipedia.org', 'mapy': 'https://maps.google.com', linkedin: 'https://linkedin.com', reddit: 'https://reddit.com', allegro: 'https://allegro.pl', claude: 'https://claude.ai' };
const THEME_ALIASES = { cyjan: 'cyjan', turkus: 'cyjan', niebiesk: 'niebieski', fiolet: 'fiolet', purpur: 'fiolet', zielon: 'zielony', zlot: 'złoty', pomarancz: 'złoty', czerwon: 'czerwony', rozow: 'różowy' };
const findApp = n => (APP_ALIASES.find(([, re]) => re.test(n)) || [])[0];
const JOKES = [
  'Dlaczego programista pomylił Halloween z Bożym Narodzeniem? Bo OCT 31 to DEC 25.',
  'Mam świetny żart o UDP, ale nie wiem, czy do ciebie dotrze.',
  'Są 10 rodzaje ludzi: ci, którzy rozumieją system binarny, i ci, którzy nie.',
  'Moja pamięć podręczna jest jak ja o poranku — pusta, dopóki ktoś czegoś nie zapyta.',
  'Optymista widzi szklankę do połowy pełną. Inżynier widzi szklankę dwa razy większą, niż trzeba.'
];

/* =================== AKCJE (wspólne dla silnika lokalnego i Claude) =================== */
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
      ok: true, text: `Otwarte okna: ${J.wm.list().map(i => J.apps[i].title).join(', ') || 'brak'}. Notatki: ${J.state.notes.length} (${J.state.notes.slice(0, 5).map(n => '„' + n.title + '”').join(', ')}). ` +
        `Zadania na dziś (${today.filter(t => t.done).length}/${today.length} ukończone): ${today.map(t => (t.time || '--:--') + ' ' + t.text + (t.done ? ' ✓' : '')).join('; ') || 'brak'}. ` +
        `Minutnik: ${J.timer.running ? J.timer.label + ', zostało ' + J.timer.fmt(J.timer.left()) : 'nieaktywny'}. Skróty na pulpicie: ${J.state.shortcuts.map(s => s.name).join(', ') || 'brak'}.`
    };
  },
  focus_mode({ on }) { J.setFocus?.(on !== false); return { ok: true, text: on === false ? 'Tryb skupienia wyłączony' : 'Tryb skupienia włączony — okna zminimalizowane' }; }
};

/* definicje narzędzi dla Claude (JSON Schema) */
const APP_IDS = ['chat', 'notes', 'market', 'schedule', 'monitor', 'terminal', 'weather', 'calc', 'timer', 'settings', 'library'];
const TOOLS = [
  { name: 'open_app', description: 'Otwiera aplikację w Jarvis OS. notes=Notatnik, market=Monitor rynku krypto, schedule=Harmonogram zadań, monitor=Monitor systemu, terminal=Terminal, weather=Pogoda, calc=Kalkulator, timer=Minutnik/stoper, settings=Ustawienia, library=Biblioteka aplikacji, chat=Czat.', input_schema: { type: 'object', properties: { app: { type: 'string', enum: APP_IDS } }, required: ['app'] } },
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
  { name: 'focus_mode', description: 'Włącza/wyłącza tryb skupienia (minimalizuje okna, wycisza tło).', input_schema: { type: 'object', properties: { on: { type: 'boolean' } }, required: ['on'] } }
].map(t => ({ ...t, eager_input_streaming: true }));

/* wykonanie akcji z walidacją wejścia */
const run = async (name, input) => {
  const def = TOOLS.find(t => t.name === name), fn = A[name];
  if (!def || !fn) return { ok: false, text: 'Nieznane narzędzie: ' + name };
  if (!input || typeof input !== 'object') return { ok: false, text: 'INVALID_JSON: nieprawidłowe wejście narzędzia' };
  for (const r of def.input_schema.required || []) if (input[r] === undefined || input[r] === '') return { ok: false, text: 'Brak wymaganego pola: ' + r };
  for (const [k, p] of Object.entries(def.input_schema.properties)) if (p.enum && input[k] !== undefined && !p.enum.includes(input[k])) return { ok: false, text: `Nieprawidłowa wartość ${k}: ${input[k]}` };
  try { const r = await fn(input); J.action(name); return r; } catch (e) { return { ok: false, text: 'Błąd: ' + e.message }; }
};

/* =================== SILNIK LOKALNY =================== */
const local = async (raw) => {
  const o = raw.trim(), n = norm(o).replace(/[?!.]+$/, '');
  const grab = (re) => { const m = re.exec(n); if (!m) return null; return m.map((g, i) => { if (g == null || i === 0) return g; const idx = n.indexOf(g, m.index); return o.slice(idx, idx + g.length); }); };
  const act = async (name, input) => { const r = await run(name, input); return r.text; };

  if (/^(pomoc|help|\?|co potrafisz|co umiesz|jakie masz (komendy|polecenia|mozliwosci)|komendy)/.test(n))
    return 'Potrafię: **otwierać aplikacje** („otwórz notatnik”), **notować** („zanotuj: …”), **przypominać** („przypomnij mi o 18:00 trening”), **odliczać** („minutnik 5 minut”), sprawdzać **pogodę** i **kursy krypto**, **liczyć** („oblicz 15% z 2400”), zmieniać **motyw** i **tapetę**, tworzyć **skróty** („dodaj skrót GitHub github.com”), otwierać strony („otwórz YouTube”), szukać w Google, opowiedzieć żart i podać **raport** systemu. Z kluczem Claude API odpowiem na każde pytanie.';
  if (/^(hej|czesc|witaj|siema|dzien dobry|dobry wieczor|dobry|elo|hello|hi|yo)\b/.test(n)) {
    const hr = new Date().getHours();
    return (hr < 5 ? 'Późna pora' : hr < 12 ? 'Dzień dobry' : hr < 18 ? 'Witaj ponownie' : 'Dobry wieczór') + '. Wszystkie systemy działają. W czym mogę pomóc?';
  }
  if (/(dziek|dzieki|dzieku|thx|thanks)/.test(n)) return 'Zawsze do usług.';
  if (/(kim jestes|jak sie nazywasz|przedstaw sie|czym jestes)/.test(n)) return 'Jestem Jarvis — inteligentna warstwa tego środowiska. Zarządzam oknami, notatkami, zadaniami i danymi, a z modelem Claude rozumiem dowolne polecenia.';
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

  if (/(minutnik|timer|odlicz|budzik|zegar)/.test(n) || /ustaw .*na \d/.test(n)) {
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

  if (/(bitcoin|btc|ethereum|\beth\b|solana|\bsol\b|\bbnb\b|krypto|kurs)/.test(n)) return act('get_crypto_prices', {});

  if ((m = /(\d+(?:[.,]\d+)?)\s*%\s*(?:z|od)\s*(\d+(?:[.,]\d+)?)/.exec(n))) { const r = J.calc(m[1] + '/100*' + m[2]); J.action('calculate'); return m[1] + '% z ' + m[2] + ' to **' + r + '**.'; }
  if ((m = grab(/^(?:oblicz|policz|ile to|ile jest|wylicz|ile wynosi)\s*:?\s*(.+)$/)) || (/[\d)]\s*[-+*/^x×÷]\s*[\d(]/.test(n) && /^[\d\s+\-*/().,%^x×÷]+$/.test(n) && (m = [n, n]))) {
    const expr = m[1].replace(/\s*(razy)\s*/g, '*').replace(/\s*(przez|podzielone przez)\s*/g, '/').replace(/\s*plus\s*/g, '+').replace(/\s*minus\s*/g, '-').replace(/\s*do potegi\s*/g, '^');
    const r = await run('calculate', { expression: expr });
    return r.ok ? r.text.replace(/= (.+)$/, '= **$1**') : r.text;
  }

  if (/(motyw|kolor|akcent|barw)/.test(n)) {
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

/* =================== CLAUDE (Anthropic SDK w przeglądarce) =================== */
let SDK = null, noFallback = false;
const loadSDK = async () => {
  if (SDK) return SDK;
  const urls = ['https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk/+esm', 'https://esm.sh/@anthropic-ai/sdk'];
  let err;
  for (const u of urls) { try { SDK = await import(u); return SDK; } catch (e) { err = e; } }
  throw new Error('Nie udało się wczytać Anthropic SDK (' + (err?.message || 'sieć') + ')');
};
const client = async () => {
  const mod = await loadSDK(); const Anthropic = mod.default || mod.Anthropic;
  return { mod, c: new Anthropic({ apiKey: J.state.settings.apiKey, dangerouslyAllowBrowser: true }) };
};
const SYSTEM = () => `Jesteś Jarvis — asystent AI i inteligentna powłoka systemu „Jarvis OS”, który działa w przeglądarce użytkownika (inicjały: ${J.state.settings.user}, miasto: ${J.state.settings.city}). Dzisiejsza data: ${new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${J.today()}).

Mówisz po polsku, zwięźle i konkretnie (zwykle 1–3 zdania), z elegancją i lekkim humorem w stylu J.A.R.V.I.S. z filmów Marvela. Twoje odpowiedzi mogą być czytane na głos, więc unikaj tabel, nagłówków i długich list; z formatowania używaj tylko **pogrubień** i \`kodu\`.

Masz narzędzia do sterowania środowiskiem. Gdy użytkownik prosi o działanie w systemie — otwarcie/zamknięcie aplikacji, notatkę, zadanie lub przypomnienie, minutnik, zmianę motywu lub tapety, skrót na pulpicie, pogodę, kursy kryptowalut, obliczenia, otwarcie strony — wykonaj je narzędziem, zamiast opisywać, jak to zrobić. Możesz wywołać kilka narzędzi naraz. Po akcji potwierdź krótko, co zrobiłeś. Godzinę sprawdzaj narzędziem get_datetime, a stan środowiska narzędziem get_status. Na pytania ogólne odpowiadaj z własnej wiedzy.`;

const history = [];
const MAX_TURNS = 8;

const claude = async (text, bubble) => {
  const { mod, c } = await client();
  const model = J.state.settings.model || 'claude-opus-5-5';
  history.push({ role: 'user', content: text });
  const startLen = history.length - 1;
  let reply = '';
  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const params = { model, max_tokens: 16000, system: SYSTEM(), tools: TOOLS, messages: history };
      if (model !== 'claude-haiku-4-5') params.output_config = { effort: 'low' };
      const useFallback = !noFallback && (model === 'claude-opus-5-5' || model === 'claude-sonnet-5-5');
      if (useFallback) { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
      let msg;
      try {
        const stream = (useFallback ? c.beta.messages : c.messages).stream(params);
        let acc = '';
        stream.on('text', d => { acc += d; bubble.set((reply ? reply + '\n\n' : '') + acc); J.orb.set('speaking'); });
        msg = await stream.finalMessage();
      } catch (e) {
        const Bad = mod.BadRequestError || mod.default?.BadRequestError;
        if (useFallback && typeof Bad === 'function' && e instanceof Bad && /fallback|beta/i.test(e.message)) { noFallback = true; turn--; continue; }
        throw e;
      }
      if (msg.stop_reason === 'refusal') {
        history.length = startLen;
        return 'Przykro mi, w tej sprawie nie mogę pomóc.';
      }
      history.push({ role: 'assistant', content: msg.content });
      const txt = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
      if (txt) reply = (reply ? reply + '\n\n' : '') + txt;
      if (msg.stop_reason === 'max_tokens') { reply += ' …'; break; }
      if (msg.stop_reason !== 'tool_use') break;
      const uses = msg.content.filter(b => b.type === 'tool_use');
      J.orb.set('thinking', 'wykonuję: ' + uses.map(u => u.name).join(', '));
      const results = await Promise.all(uses.map(async u => {
        const r = await run(u.name, u.input);
        J.chat.add('action', (r.ok ? '⚙ ' : '⚠ ') + u.name + ' → ' + r.text);
        return { type: 'tool_result', tool_use_id: u.id, content: r.text, ...(r.ok ? {} : { is_error: true }) };
      }));
      history.push({ role: 'user', content: results });
      bubble.set(reply || '…');
    }
    return reply || 'Gotowe.';
  } catch (e) {
    history.length = startLen;
    const is = name => { const C = mod[name] || mod.default?.[name]; return typeof C === 'function' && e instanceof C; };
    if (is('AuthenticationError')) throw new Error('Nieprawidłowy klucz API — sprawdź go w Ustawieniach.');
    if (is('PermissionDeniedError')) throw new Error('Klucz nie ma dostępu do modelu ' + model + '.');
    if (is('RateLimitError')) throw new Error('Przekroczono limit zapytań — spróbuj za chwilę.');
    if (is('NotFoundError')) throw new Error('Model ' + model + ' jest niedostępny — wybierz inny w Ustawieniach.');
    if (is('APIConnectionError')) throw new Error('Brak połączenia z API Anthropic.');
    if (is('APIError')) throw new Error('Błąd API (' + (e.status || '?') + '): ' + e.message);
    throw e;
  }
};

/* =================== INTERFEJS MÓZGU =================== */
let busy = false;
J.brain = {
  get busy() { return busy; },
  reset() { history.length = 0; },
  async test() {
    const { c } = await client();
    const model = J.state.settings.model || 'claude-opus-5-5';
    const params = { model, max_tokens: 1024, messages: [{ role: 'user', content: 'Odpowiedz tylko słowem: OK' }] };
    if (model !== 'claude-haiku-4-5') params.output_config = { effort: 'low' };
    try { const r = await c.messages.create(params); return r.model; }
    catch (e) { throw new Error(e.status === 401 ? 'nieprawidłowy klucz' : e.message); }
  },
  async handle(text, opts = {}) {
    text = String(text || '').trim(); if (!text) return;
    if (busy) { J.toast('Jarvis jeszcze pracuje nad poprzednim poleceniem…'); return; }
    busy = true;
    if (!J.wm.isOpen('chat') || J.wm.isMin('chat')) { if (!opts.silentWindow) J.wm.open('chat'); }
    J.chat.add('user', text);
    const bubble = J.chat.add('jarvis', '');
    J.orb.set('thinking', 'analizuję: „' + text.slice(0, 60) + '”');
    J.log('Polecenie', text, 'info');
    let reply;
    try {
      if (J.state.settings.apiKey) reply = await claude(text, bubble);
      else {
        await new Promise(r => setTimeout(r, 350 + Math.random() * 300));
        reply = await local(text);
        if (reply == null) reply = 'Nie rozpoznałem tego polecenia. Wpisz „pomoc”, aby zobaczyć, co potrafię offline — albo dodaj klucz Claude API w Ustawieniach, a odpowiem na wszystko.';
      }
      bubble.set(reply);
      J.orb.set('idle', 'zadanie zakończone');
      if (opts.voice || J.state.settings.speech) J.voice.speak(reply);
    } catch (e) {
      bubble.set('⚠ ' + e.message); J.sfx.error(); J.orb.set('alert', e.message);
      J.log('Błąd asystenta', e.message, 'err');
      setTimeout(() => J.orb.state === 'alert' && J.orb.set('idle'), 3000);
    } finally { busy = false; }
  }
};
J.brain.local = local;
})();
