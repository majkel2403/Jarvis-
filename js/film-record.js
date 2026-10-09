/* =========================================================
   JARVIS OS — Nagrywanie i produkcja video (js/film-record.js)
   Film (js/workflow-cinema.js) pokazuje pracę jako scenę; ten moduł pozwala ją ZAPISAĆ do pliku wideo.
   Silnik przeglądarki (getDisplayMedia + MediaRecorder) nagrywa widok karty, więc to, co widać w filmie,
   ląduje w pliku .webm (Chrome/Edge/Comet). Bez bibliotek zewnętrznych i bez sieci.
   Domyślnie CAŁKOWICIE WYŁĄCZONE (ustawienie „filmRecord”, migracja stanu v4): przycisk ⏺ jest ukryty,
   a komenda odmawia — chyba że użytkownik włączy to w Ustawieniach → Wygląd → „Nagrywanie i produkcja video”.
   Start wymaga kliknięcia (reguła przeglądarki) — z mostu/Telegrama przychodzi więc podpowiedź, nie cicha odmowa.
   ========================================================= */
'use strict';
(() => {
const R = J.registry, { ok, fail } = R;
const S = () => J.state?.settings || {};
const PL = { '720p': 720, '1080p': 1080, '1440p': 1440 };
const MIMES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

const hasApi = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== 'undefined';
const enabled = () => S().filmRecord === true;
const height = () => PL[S().filmRecQuality] || 1080;
const pickMime = () => MIMES.find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); };
const clock = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

let rec = null, stream = null, chunks = [], t0 = 0, timer = null, badge = null, btn = null, last = null, saving = false;

/* ---------- wskaźnik na pasku filmu ---------- */
const paint = () => {
  const on = !!rec;
  const t = on ? (Date.now() - t0) / 1000 : 0;
  if (badge) { badge.textContent = on ? '● NAGRYWAM ' + clock(t) : ''; badge.classList.toggle('on', on); badge.title = on ? 'Nagrywanie do pliku — kliknij ⏺ albo naciśnij R, żeby zakończyć' : ''; }
  if (btn) { btn.classList.toggle('rec', on); btn.textContent = on ? '⏹' : '⏺'; btn.title = on ? 'Zakończ nagrywanie i zapisz plik (R)' : 'Nagraj film do pliku (R)'; btn.setAttribute('aria-label', on ? 'Zakończ nagrywanie' : 'Nagraj film'); }
};
const ensureBadge = bar => {
  if (!bar || badge) return;
  badge = document.createElement('span'); badge.className = 'cin-rec-badge';
  const lamp = bar.querySelector('.cin-rec');
  (lamp ? lamp.parentNode.insertBefore(badge, lamp.nextSibling) : bar.appendChild(badge));
};

/* ---------- start / stop ---------- */
const finishFile = () => {
  if (!chunks.length || saving) return;
  saving = true;
  const type = rec?.mimeType || pickMime() || 'video/webm';
  const blob = new Blob(chunks, { type }); chunks = [];
  const ext = /mp4/.test(type) ? 'mp4' : 'webm';
  const name = 'jarvis-film-' + stamp() + '.' + ext;
  try {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  } catch (e) { /* brak DOM → zostaje sam blob */ }
  last = { name, bytes: blob.size, seconds: (Date.now() - t0) / 1000, type, ts: Date.now() };
  try { J.store?.set?.('film.last', last); } catch (e) { /* zapis pomocniczy */ }
  J.toast?.('🎬 Zapisano ' + name + ' (' + Math.round(blob.size / 1048576 * 10) / 10 + ' MB) — pobrania przeglądarki.', 7000);
  J.notice?.({ title: 'Nagranie filmu gotowe', body: name + ' · ' + Math.round(blob.size / 1048576 * 10) / 10 + ' MB', kind: 'agent' });
  saving = false;
};

function stop(reason) {
  if (!rec) return fail('NOT_FOUND', 'Nic nie nagrywam.');
  const secs = (Date.now() - t0) / 1000;
  try { rec.stop(); } catch (e) { /* już zatrzymany */ }
  clearInterval(timer); timer = null;
  stream?.getTracks().forEach(tr => { try { tr.stop(); } catch (e) { } });
  stream = null; const r = rec; rec = null;
  paint();
  setTimeout(finishFile, 260);
  return ok({ recording: false, seconds: Math.round(secs), reason: reason || 'na życzenie' },
    'Nagrywanie zakończone po ' + clock(secs) + ' — plik zapisuje się jako pobranie.');
}

async function start() {
  if (rec) return fail('DUPLICATE', 'Nagrywanie już trwa.');
  if (!hasApi()) return fail('UNSUPPORTED', 'Ta przeglądarka nie umie nagrywać wideo (brak getDisplayMedia/MediaRecorder).');
  if (!enabled()) return fail('DENIED', 'Nagrywanie jest wyłączone. Włącz je w Ustawieniach → Wygląd → „Nagrywanie i produkcja video”.');
  const audio = S().filmRecAudio === true;
  let st;
  try {
    st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30, height: height() }, audio, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude', systemAudio: 'exclude' });
  } catch (e) {
    const n = e?.name || '';
    if (n === 'NotAllowedError' || n === 'SecurityError') return fail('DENIED', 'Przeglądarka wymaga kliknięcia: naciśnij ⏺ na pasku filmu (albo „Udostępnij” w oknie wyboru) — startu nie da się zrobić z rozmowy.');
    return fail('INTERNAL', 'Nie udało się zacząć nagrywania: ' + (e?.message || n || e));
  }
  const mime = pickMime();
  try { rec = new MediaRecorder(st, mime ? { mimeType: mime, videoBitsPerSecond: height() >= 1440 ? 12000000 : height() >= 1080 ? 8000000 : 5000000 } : undefined); }
  catch (e) { st.getTracks().forEach(t => t.stop()); return fail('INTERNAL', 'Nie mogę nagrać tego strumienia: ' + (e?.message || e)); }
  chunks = []; stream = st; t0 = Date.now(); saving = false;
  rec.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
  rec.onstop = () => { setTimeout(finishFile, 120); };
  /* gdy użytkownik sam zakończy udostępnianie („Zatrzymaj udostępnianie”) — nagranie i tak się zapisze */
  st.getVideoTracks().forEach(tr => { tr.onended = () => { if (rec) stop('udostępnianie zakończone'); } });
  rec.start(1000);
  timer = setInterval(paint, 500); paint();
  J.toast?.('⏺ Nagrywam film (' + height() + 'p' + (audio ? ' + dźwięk' : '') + '). ⏹ / R kończy i zapisuje plik.', 6000);
  return ok({ recording: true, quality: S().filmRecQuality || '1080p', audio, mime: rec.mimeType || '', seconds: 0 }, 'Nagrywam — ⏹ albo R kończy i zapisuje plik.');
}

const status = () => ({ supported: hasApi(), enabled: enabled(), recording: !!rec, seconds: rec ? Math.round((Date.now() - t0) / 1000) : 0, quality: S().filmRecQuality || '1080p', audio: S().filmRecAudio === true, last });

/* przycisk na pasku filmu: widoczny tylko przy włączonym nagrywaniu */
const bind = (button, bar) => {
  btn = button; ensureBadge(bar);
  if (!btn) return;
  if (!hasApi()) { btn.hidden = true; return; }
  btn.hidden = !enabled();
  btn.onclick = () => { rec ? stop() : start(); };
  paint();
};
const unbind = () => { btn = null; badge = null; };

J.filmRec = { supported: hasApi, enabled, start, stop, status, bind, unbind, attach: (b, bar) => bind(b, bar) };

R.add({
  id: 'film_record', group: 'Workflow', label: 'Nagraj film', risk: 'safe', reads: [], writes: [],
  description: 'Nagrywa film (widok karty Jarvis OS) do pliku wideo .webm tym, co ma przeglądarka: getDisplayMedia + MediaRecorder. Wymaga włączonego „Nagrywanie i produkcja video” w Ustawieniach → Wygląd; start wymaga kliknięcia użytkownika (naciśnij ⏺ na pasku filmu albo „Udostępnij” w oknie zgody).',
  args: { type: 'object', properties: { action: { type: 'string', enum: ['start', 'stop', 'status'], description: 'start = zacznij nagrywać, stop = zakończ i zapisz plik, status = co się dzieje' } } },
  examples: ['nagraj film', 'zacznij nagrywac film', 'przestan nagrywac', 'koniec nagrywania', 'czy nagrywasz'],
  parse(raw, n) {
    if (/^(nagraj|zacznij nagrywac|nagrywaj)\b/.test(n)) return { args: { action: 'start' } };
    if (/^(przestan nagrywac|zakoncz nagrywanie|stop nagrywanie|koniec nagrywania|zatrzymaj nagrywanie)\b/.test(n)) return { args: { action: 'stop' } };
    if (/^(czy nagrywasz|status nagrywania)$/.test(n)) return { args: { action: 'status' } };
    return null;
  },
  async run({ action = 'status' } = {}) {
    if (action === 'status') { const s = status(); return ok(s, s.recording ? 'Nagrywam od ' + clock(s.seconds) + ' (' + s.quality + ').' : (!s.supported ? 'Ta przeglądarka nie umie nagrywać.' : s.enabled ? 'Nagrywanie gotowe — ⏺ na pasku filmu (albo „nagraj film”).' : 'Nagrywanie wyłączone w Ustawieniach → Wygląd → „Nagrywanie i produkcja video”.')); }
    if (action === 'start') return start();
    return stop();
  }
});
})();
