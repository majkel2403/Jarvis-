/* =========================================================
   JARVIS OS — widgety pulpitu (MVP): Notatka, Lista, Wynik zadania
   Każdy widget to osobne, przesuwalne okno; można mieć wiele naraz.
   Układ pulpitu nie jest jeszcze zapisywany (kolejna wersja).
   ========================================================= */
'use strict';
(() => {
const { $, h, esc, icon } = J;

const TYPES = {
  note:   { label: 'Notatka', icon: 'notes', w: 300, h: 260 },
  list:   { label: 'Lista', icon: 'list', w: 290, h: 300 },
  result: { label: 'Wynik zadania', icon: 'bolt', w: 340, h: 260 }
};
const fmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');

const mounts = {
  note(body, w) {
    body.innerHTML = '<textarea class="w-note" placeholder="Zacznij pisać…" spellcheck="false"></textarea>';
    const ta = $('textarea', body); ta.value = w.data.text || '';
    ta.oninput = () => { w.data.text = ta.value; };
    setTimeout(() => { if (!ta.value) ta.focus(); }, 60);
  },
  list(body, w) {
    body.innerHTML = '<div class="w-list"><div class="w-items"></div><form class="w-add"><input class="input" placeholder="Nowa pozycja…" autocomplete="off"><button class="btn" title="Dodaj">' + icon('plus', 'width="14" height="14"') + '</button></form></div>';
    const box = $('.w-items', body), items = w.data.items;
    const draw = () => {
      box.innerHTML = items.length ? '' : '<div class="empty">Pusta lista</div>';
      items.forEach((it, i) => {
        const r = h('label', { class: 'w-item' + (it.done ? ' done' : '') }, '<input type="checkbox"><span></span><button type="button" class="x" title="Usuń">' + icon('close', 'width="11" height="11"') + '</button>');
        $('input', r).checked = !!it.done; $('span', r).textContent = it.text;
        $('input', r).onchange = e => { it.done = e.target.checked; draw(); };
        $('.x', r).onclick = () => { items.splice(i, 1); draw(); };
        box.appendChild(r);
      });
    };
    $('form', body).onsubmit = e => { e.preventDefault(); const inp = $('input', e.target), v = inp.value.trim(); if (!v) return; items.push({ text: v, done: false }); inp.value = ''; draw(); box.scrollTop = box.scrollHeight; };
    draw();
  },
  result(body, w) {
    body.innerHTML = '<div class="w-result"><div class="w-text"></div><div class="w-foot"><small></small><span class="sp"></span><button class="btn sm ghost" data-a="copy">Kopiuj</button><button class="btn sm ghost" data-a="log">Log</button></div></div>';
    $('.w-text', body).innerHTML = fmt(w.data.text || '').replace(/\n/g, '<br>');
    $('small', body).textContent = w.data.meta || '';
    $('[data-a=copy]', body).onclick = () => { navigator.clipboard?.writeText(w.data.text || '').then(() => J.toast('Skopiowano wynik'), () => J.toast('Nie udało się skopiować')); };
    $('[data-a=log]', body).onclick = () => J.proc.toggle();
  }
};

J.widgets = {
  TYPES,
  list: [],
  create(type, opts = {}) {
    const t = TYPES[type]; if (!t) throw new Error('Nieznany typ widgetu: ' + type);
    const title = String(opts.title || t.label).slice(0, 60);
    const data = type === 'list'
      ? { items: (Array.isArray(opts.items) ? opts.items : String(opts.content || '').split('\n')).map(x => String(x).replace(/^[-•*\s]+/, '').trim()).filter(Boolean).map(text => ({ text, done: false })) }
      : { text: String(opts.content || ''), meta: opts.meta || '' };
    const w = { id: J.uid(), type, title, data };
    const key = 'w:' + w.id;
    J.apps[key] = {
      title, icon: t.icon, w: t.w, h: t.h, widget: true, flush: true,
      mount(body, ctx) { ctx.onClose(() => { delete J.apps[key]; J.widgets.list = J.widgets.list.filter(x => x.id !== w.id); }); mounts[type](body, w); }
    };
    J.widgets.list.push(w);
    // kaskadowe ułożenie: każdy nowy widget trochę niżej i w prawo
    J.wm.open(key);
    return w;
  },
  menu(x, y) { return J.widgets._menu?.(x, y); }
};
})();
