/* =========================================================
   JARVIS OS — przeglądarka efektów (FX Browser)

   Odpowiednik FX Studio z biblioteki `jarvis-efekty`, ale w aplikacji,
   która nie ma bundlera: lista 64 efektów, filtr po rodzinie,
   odtwarzanie pojedyncze, „Pokaz" (wszystko po kolei), suwak intensywności
   i wybór palety.

   Zasada z §9 docs/spec/09-wyglad-stany.md: nic tu nie jest losowe —
   przeglądarka tylko odtwarza to, co i tak jest wpięte w zdarzenia.
   Preferencje (ulubione, wyłączone) leżą w J.store, nie w localStorage,
   żeby nie rozjeżdżały się z resztą ustawień.

   Wywołanie: J.wm.open('fx') albo komenda `fx_browse`.
   ========================================================= */
'use strict';
(() => {

const FAMILIES = ['orb', 'screen', 'particles', 'hud', 'text', 'data', 'glitch', 'success', 'transition', 'pointer', 'ambient'];
const PALETTES = ['arc', 'violet', 'solar', 'alert', 'emerald'];
const FAMILY_LABELS = { orb: 'Kula', screen: 'Scena', particles: 'Cząsteczki', hud: 'HUD', text: 'Typografia', data: 'Dane', glitch: 'Glitch', success: 'Sukces', transition: 'Przejścia', pointer: 'Kursor', ambient: 'Ambient' };

/* Preferencje: ulubione i wyłączone — sterowane ręcznie, nie zdarzeniami. */
let prefs = { off: [], fav: [] };
let ready = false;
async function loadPrefs() {
  if (ready) return prefs;
  ready = true;
  try {
    const v = await J.store.get('fx.prefs', null);
    if (v && Array.isArray(v.off) && Array.isArray(v.fav)) prefs = { off: v.off, fav: v.fav };
  } catch { /* brak magazynu — zostają domyślne */ }
  return prefs;
}
const savePrefs = () => J.store.set('fx.prefs', prefs).catch(() => { });

/* Stan sterowania — modułowy, żeby `play()` nie musiał sięgać po DOM
   (jest też wołany z testów i z audytu). */
const ui = { palette: PALETTES[0] };

/** Odtwarza z aktualnymi suwakami; wyłączony efekt nie startuje. */
function play(id, intensity) {
  if (prefs.off.includes(id)) return false;
  if (!J.fxLayer?.list().some(f => f.id === id)) return false;
  return J.fxLayer.play(id, { intensity: intensity ?? 1, palette: ui.palette });
}

J.apps = J.apps || {};
J.apps.fx = {
  title: 'Przeglądarka efektów', icon: 'star', minW: 420, minH: 380, w: 560, h: 620,
  state: ctx => ctx?.state?.() || null,
  mount(body, ctx) {
    let family = 'all', intensity = 1, showTimer = null;
    const $ = s => body.querySelector(s);
    const $$ = sel => Array.from(body.querySelectorAll(sel));

    body.innerHTML = `
      <div class="row" style="gap:6px;align-items:center">
        <input class="input" id="fxbSearch" placeholder="Szukaj efektu…" style="flex:1;min-width:120px">
        <select class="input" id="fxbPal" style="width:96px" title="Paleta">${PALETTES.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
      </div>
      <div class="row" style="gap:4px;margin:6px 0;align-items:center">
        <span class="dim" style="font-size:10.5px;flex:0 0 auto">siła</span>
        <input type="range" id="fxbInt" min="20" max="160" value="100" style="flex:1">
        <b id="fxbIntV" style="font-size:10.5px;min-width:34px;text-align:right">100%</b>
      </div>
      <div class="seg" id="fxbFam" style="flex-wrap:wrap">
        <button data-f="all" class="on">wszystkie</button>
        ${FAMILIES.map(f => `<button data-f="${f}">${FAMILY_LABELS[f]}</button>`).join('')}
      </div>
      <div class="row" style="gap:6px;margin:6px 0">
        <button class="btn sm primary" id="fxbShow">▶ Pokaz wszystkich</button>
        <button class="btn sm ghost" id="fxbStop">Stop</button>
        <span class="dim" id="fxbCount" style="font-size:10.5px;margin-left:auto"></span>
      </div>
      <div id="fxbList" class="fxb-list"></div>`;

    const list = $('#fxbList', body);
    const count = $('#fxbCount', body);

    const render = () => {
      const q = ($('#fxbSearch', body)?.value || '').toLowerCase().trim();
      const all = J.fxLayer?.list() || [];
      const rows = all.filter(f =>
        (family === 'all' || f.family === family) &&
        (!q || f.id.includes(q) || (f.title || '').toLowerCase().includes(q)));
      count.textContent = rows.length + ' / ' + all.length;
      if (!rows.length) { list.innerHTML = `<div class="dim" style="padding:16px;text-align:center">Brak efektów dla tego filtra.</div>`; return; }
      list.innerHTML = rows.map(f => {
        const off = prefs.off.includes(f.id);
        const fav = prefs.fav.includes(f.id);
        return `<div class="fxb-row${off ? ' off' : ''}" data-id="${f.id}">
          <button class="fxb-play" data-play="${f.id}" title="Odtwórz">▶</button>
          <div class="fxb-meta"><b>${f.title || f.id}</b><small>${f.id} · ${(f.durationMs / 1000).toFixed(2)} s · ${f.weight || '—'}</small></div>
          <button class="fxb-btn${fav ? ' on' : ''}" data-fav="${f.id}" title="Ulubione">★</button>
          <button class="fxb-btn${off ? ' on' : ''}" data-off="${f.id}" title="Wyłącz">${off ? '⊘' : '○'}</button>
        </div>`;
      }).join('');
    };

    const all = J.fxLayer?.list() || [];
    if (all.length) render(); else setTimeout(render, 60);
    $('#fxbSearch', body).oninput = render;
    $('#fxbInt', body).oninput = e => { intensity = +e.target.value / 100; $('#fxbIntV', body).textContent = e.target.value + '%'; };
    $('#fxbPal', body).onchange = e => { ui.palette = e.target.value; };
    $$('#fxbFam button').forEach(b => b.onclick = () => {
      $$('#fxbFam button').forEach(x => x.classList.toggle('on', x === b));
      family = b.dataset.f;
      render();
    });

    /* klikanie w listę — delegacja, bo lista przerysowuje się przy każdym
       przełączeniu ulubionego lub wyłączonego efektu */
    list.onclick = ev => {
      const t = ev.target.closest('[data-play],[data-fav],[data-off]');
      if (!t) return;
      if (t.dataset.play) { play(t.dataset.play, intensity); return; }
      if (t.dataset.fav) {
        const id = t.dataset.fav;
        prefs.fav = prefs.fav.includes(id) ? prefs.fav.filter(x => x !== id) : [...prefs.fav, id];
        savePrefs(); render(); return;
      }
      const id = t.dataset.off;
      prefs.off = prefs.off.includes(id) ? prefs.off.filter(x => x !== id) : [...prefs.off, id];
      savePrefs();
      if (prefs.off.includes(id)) J.fxLayer?.stopAll();
      render();
    };

    $('#fxbShow', body).onclick = () => {
      if (showTimer) return;
      $('#fxbShow', body).disabled = true;
      const queue = (J.fxLayer?.list() || []).filter(f => !prefs.off.includes(f.id));
      let i = 0;
      const step = () => {
        if (i >= queue.length) { showTimer = null; $('#fxbShow', body).disabled = false; return; }
        const f = queue[i++];
        play(f.id, intensity);
        showTimer = setTimeout(step, Math.max(700, f.durationMs + 350));
      };
      step();
    };
    $('#fxbStop', body).onclick = () => {
      clearTimeout(showTimer); showTimer = null;
      $('#fxbShow', body).disabled = false;
      J.fxLayer?.stopAll();
    };

    loadPrefs().then(render);
    return { state: () => ({ family, intensity }), destroy: () => { clearTimeout(showTimer); J.fxLayer?.stopAll(); } };
  },
};

J.fxBrowser = { play, loadPrefs, get prefs() { return prefs; } };

})();
