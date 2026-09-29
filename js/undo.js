/* =========================================================
   JARVIS OS — cofanie („Cofnij”) i historia nawigacji („wróć”)
   Cofanie: polecenia odwracalne zwracają funkcję undo() w kopercie wyniku (registry.run zapisuje ją tutaj).
   Autonomia A2 (Jev wykonuje zapis sam) działa tylko dlatego, że każdy taki zapis da się cofnąć w ~8 s przyciskiem
   albo w ciągu 10 minut poleceniem „cofnij”.
   Nawigacja: stos ostatnich stanów okien; „wróć” przywraca poprzednie aktywne okno.
   ========================================================= */
'use strict';
(() => {
const KEEP = 20, WINDOW_MS = 10 * 60e3, OFFER_MS = 8000;

J.undo = {
  stack: [],
  /* wpis: { id (polecenie), label, text, undo(), ts, logId?, intent?, viaJev? } */
  push(entry) {
    const e = { ts: Date.now(), ...entry }; J.undo.stack.push(e);
    if (J.undo.stack.length > KEEP) J.undo.stack.shift();
    return e;
  },
  last(maxAge = WINDOW_MS) { const e = J.undo.stack[J.undo.stack.length - 1]; return e && Date.now() - e.ts <= maxAge ? e : null; },
  /* cofa ostatnią akcję; zwraca { ok, text } */
  async run(maxAge = WINDOW_MS) {
    const e = J.undo.last(maxAge); if (!e) return { ok: false, text: 'Nie mam nic do cofnięcia.' };
    J.undo.stack.pop();
    try { await e.undo(); } catch (err) { return { ok: false, text: 'Nie udało się cofnąć: ' + (err?.message || err) }; }
    J.emit('undo-done', e);
    if (e.logId) J.judge?.log.update(e.logId, { outcome: 'undone' });
    if (e.viaJev && e.intent) J.policy?.reject(e.intent);   // odrzucona decyzja Jeva podnosi próg tego polecenia
    J.ev?.emit('action.undone', { tool: e.id });
    return { ok: true, text: 'Cofnięto: ' + (e.text || e.label || e.id) };
  },
  /* pokazuje przycisk „Cofnij” (UI podpina się pod zdarzenie 'undo-offer') */
  offer(entry) { if (entry) J.emit('undo-offer', { entry, ms: OFFER_MS }); },
  clear() { J.undo.stack.length = 0; },
  OFFER_MS
};

/* ---------- historia nawigacji ---------- */
const nav = J.nav = {
  stack: [], applying: false,
  snapshot() { return { focused: J.wm.focused(), open: J.wm.info().map(w => ({ id: w.id, min: w.min })) }; },
  same(a, b) { return a && b && a.focused === b.focused && a.open.length === b.open.length && a.open.every((w, i) => w.id === b.open[i].id && w.min === b.open[i].min); },
  record() {
    if (nav.applying) return;
    const s = nav.snapshot(); if (nav.same(s, nav.stack[nav.stack.length - 1])) return;
    nav.stack.push(s); if (nav.stack.length > 10) nav.stack.shift();
  },
  /* przywraca poprzednie aktywne okno (otwiera je, jeśli zamknięte) */
  back() {
    const cur = J.wm.focused();
    let i = nav.stack.length - 1; while (i >= 0 && nav.stack[i].focused === cur) i--;
    while (i >= 0 && (!nav.stack[i].focused || !J.apps[nav.stack[i].focused])) i--;
    if (i < 0) return { ok: false, text: 'Nie ma poprzedniego okna, do którego można wrócić.' };
    const target = nav.stack[i].focused;
    nav.applying = true; try { J.wm.open(target); } finally { setTimeout(() => { nav.applying = false; nav.record(); }, 50); }
    nav.stack.length = i + 1;
    return { ok: true, app: target, text: 'Wróciłem do: ' + (J.apps[target]?.title || target) + '.' };
  }
};
J.on('wm', J.debounce(() => { try { nav.record(); } catch (e) { } }, 250));
})();
