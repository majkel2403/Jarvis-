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
  result: { label: 'Wynik zadania', icon: 'bolt', w: 340, h: 260 },
  calc:   { label: 'Kalkulator', icon: 'calc', w: 290, h: 200 }
};
const fmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');

const mounts = {
  note(body, w) {
    body.innerHTML = '<textarea class="w-note" placeholder="Zacznij pisać…" spellcheck="false"></textarea>';
    const ta = $('textarea', body); ta.value = w.data.text || '';
    ta.oninput = () => { w.data.text = ta.value; J.save(); };
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
        $('input', r).onchange = e => { it.done = e.target.checked; J.save(); draw(); };
        $('.x', r).onclick = () => { items.splice(i, 1); J.save(); draw(); };
        box.appendChild(r);
      });
    };
    $('form', body).onsubmit = e => { e.preventDefault(); const inp = $('input', e.target), v = inp.value.trim(); if (!v) return; items.push({ text: v, done: false }); inp.value = ''; J.save(); draw(); box.scrollTop = box.scrollHeight; };
    draw();
  },
  result(body, w) {
    body.innerHTML = '<div class="w-result"><div class="w-text"></div><div class="w-foot"><small></small><span class="sp"></span><button class="btn sm ghost" data-a="copy">Kopiuj</button><button class="btn sm ghost" data-a="log">Log</button></div></div>';
    $('.w-text', body).innerHTML = fmt(w.data.text || '').replace(/\n/g, '<br>');
    $('small', body).textContent = w.data.meta || '';
    $('[data-a=copy]', body).onclick = () => { navigator.clipboard?.writeText(w.data.text || '').then(() => J.toast('Skopiowano wynik'), () => J.toast('Nie udało się skopiować')); };
    $('[data-a=log]', body).onclick = () => J.proc.toggle();
  },
  calc(body) {
    body.innerHTML = '<div class="w-calc"><input class="w-calc-in input" placeholder="np. 2+2, sin(90), pi*2" autocomplete="off" spellcheck="false"><div class="w-calc-res">—</div><div class="w-foot"><small>sin/cos/sqrt/pi/e · ^ dla potęgi</small><span class="sp"></span><button class="btn sm ghost" data-a="copy">Kopiuj</button></div></div>';
    const inp = $('.w-calc-in', body), res = $('.w-calc-res', body);
    let lastVal = '';
    const compute = () => {
      const v = inp.value.trim();
      if (!v) { res.textContent = '—'; res.className = 'w-calc-res'; lastVal = ''; return; }
      try {
        const r = J.calc(v);
        const display = Number.isInteger(r) ? String(r) : parseFloat(r.toFixed(10)).toString();
        res.textContent = '= ' + display; res.className = 'w-calc-res ok'; lastVal = display;
      } catch (e) { res.textContent = e.message.slice(0, 50); res.className = 'w-calc-res err'; lastVal = ''; }
    };
    inp.oninput = compute;
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); compute(); inp.select(); } };
    $('[data-a=copy]', body).onclick = () => {
      if (!lastVal) return;
      navigator.clipboard?.writeText(lastVal).then(() => J.toast('Skopiowano: ' + lastVal), () => J.toast('Nie udało się skopiować'));
    };
    setTimeout(() => inp.focus(), 60);
  }
};

J.widgets = {
  TYPES,
  list: [],
  /* rejestruje aplikację-okno dla widgetu; zapis stanu: J.state.widgets (treść) + winPos (pozycja) */
  register(w) {
    const t = TYPES[w.type], key = 'w:' + w.id;
    J.apps[key] = {
      title: w.title, icon: t.icon, w: t.w, h: t.h, widget: true, flush: true,
      mount(body, ctx) {
        ctx.onClose(() => { delete J.apps[key]; J.widgets.list = J.widgets.list.filter(x => x.id !== w.id); J.state.widgets = J.state.widgets.filter(x => x.id !== w.id); delete J.state.winPos[key]; J.save(); });
        mounts[w.type](body, w);
      }
    };
    J.widgets.list.push(w);
    return key;
  },
  create(type, opts = {}) {
    const t = TYPES[type]; if (!t) throw new Error('Nieznany typ widgetu: ' + type);
    const title = String(opts.title || t.label).slice(0, 60);
    const data = type === 'list'
      ? { items: (Array.isArray(opts.items) ? opts.items : String(opts.content || '').split('\n')).map(x => String(x).replace(/^[-•*\s]+/, '').trim()).filter(Boolean).map(text => ({ text, done: false })) }
      : { text: String(opts.content || ''), meta: opts.meta || '' };
    const w = { id: J.uid(), type, title, data };
    J.state.widgets.push(w); J.save();
    const key = J.widgets.register(w); J.wm.open(key); J.wm.remember(key);
    return w;
  },
  /* edycja istniejącego widgetu: title / content / items (zastąp), add_items, toggle (tekst lub numer 1..n), remove_item */
  update(id, patch = {}) {
    const w = J.state.widgets.find(x => x.id === id); if (!w) throw new Error('Nie ma widgetu o id ' + id);
    if (patch.title != null) w.title = String(patch.title).slice(0, 60);
    if (w.type === 'list') {
      const mk = a => (Array.isArray(a) ? a : String(a).split('\n')).map(x => String(x).replace(/^[-•*\s]+/, '').trim()).filter(Boolean).map(text => ({ text, done: false }));
      const find = k => typeof k === 'number' || /^\d+$/.test(String(k)) ? w.data.items[+k - 1] : w.data.items.find(i => i.text.toLowerCase() === String(k).toLowerCase());
      if (patch.items != null) w.data.items = mk(patch.items);
      if (patch.add_items != null) w.data.items.push(...mk(patch.add_items));
      if (patch.toggle != null) { const it = find(patch.toggle); if (!it) throw new Error('Nie ma pozycji: ' + patch.toggle); it.done = !it.done; }
      if (patch.remove_item != null) { const it = find(patch.remove_item); if (!it) throw new Error('Nie ma pozycji: ' + patch.remove_item); w.data.items.splice(w.data.items.indexOf(it), 1); }
    } else if (patch.content != null) w.data.text = String(patch.content);
    J.save();
    const ctx = J.wm.ctx('w:' + id);
    if (ctx) { ctx.setTitle(w.title); if (J.apps['w:' + id]) J.apps['w:' + id].title = w.title; mounts[w.type](ctx.body, w); }
    return w;
  },
  /* po starcie: odtwórz widgety z poprzedniej sesji w ich pozycjach */
  restore() {
    J.state.widgets = J.state.widgets.filter(w => TYPES[w.type] && w.data);
    J.state.widgets.forEach(w => { if (!J.apps['w:' + w.id]) J.wm.open(J.widgets.register(w)); });
  },
  menu(x, y) { return J.widgets._menu?.(x, y); }
};
})();
