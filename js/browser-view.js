/* =========================================================
   JARVIS OS — podgląd przeglądarki na żywo (CDP screencast)
   Okno J.apps.browser: klatki JPEG z Chrome'a sterowanego
   przez agenta WWW, odświeżane 2–10× na sekundę.
   ========================================================= */
'use strict';
(() => {
const { $, h, icon } = J;
const S = () => J.state.settings;
const base = () => String(S().bridgeUrl || 'http://127.0.0.1:8651').replace(/\/+$/, '');

const api = async (path, opts = {}) => {
  const r = await fetch(base() + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Bridge-Token': S().bridgeToken },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(opts.timeout || 10000)
  });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'HTTP ' + r.status); }
  return r;
};

J.apps.browser = {
  title: 'Podgląd przeglądarki', icon: 'web', minW: 400, minH: 320, w: 680, h: 520,
  mount(body, ctx) {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%">
        <div class="row" style="padding:6px 10px;gap:8px;flex-shrink:0;align-items:center">
          <button class="btn sm" id="bvToggle">Start</button>
          <span class="muted" id="bvStatus" style="font-size:12px">wyłączony</span>
          <select id="bvFps" class="input sm" style="width:70px" title="FPS">
            <option value="2">2 FPS</option>
            <option value="3">3 FPS</option>
            <option value="5" selected>5 FPS</option>
            <option value="10">10 FPS</option>
          </select>
          <select id="bvQuality" class="input sm" style="width:90px" title="Jakość JPEG">
            <option value="25">niska</option>
            <option value="40" selected>średnia</option>
            <option value="60">wysoka</option>
          </select>
        </div>
        <div style="flex:1;overflow:hidden;background:#111;display:flex;align-items:center;justify-content:center;position:relative">
          <img id="bvImg" style="max-width:100%;max-height:100%;object-fit:contain" alt="Podgląd przeglądarki">
          <span id="bvPlaceholder" class="muted" style="position:absolute;font-size:13px">Kliknij Start, aby włączyć podgląd</span>
        </div>
      </div>`;

    const img = $('#bvImg', body);
    const btn = $('#bvToggle', body);
    const status = $('#bvStatus', body);
    const placeholder = $('#bvPlaceholder', body);
    let running = false, timer = null, prevUrl = null;

    const poll = async () => {
      try {
        const r = await fetch(base() + '/agents/web/screen?token=' + encodeURIComponent(S().bridgeToken), {
          signal: AbortSignal.timeout(3000)
        });
        if (!r.ok) return;
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        img.src = url;
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        prevUrl = url;
        placeholder.style.display = 'none';
      } catch { /* sieć / timeout — pomijamy klatkę */ }
    };

    const start = async () => {
      const fps = +$('#bvFps', body).value;
      const quality = +$('#bvQuality', body).value;
      try {
        await api('/agents/web/screen/start', { method: 'POST', body: { quality, fps } });
        running = true;
        btn.textContent = 'Stop';
        status.textContent = 'transmisja ' + fps + ' FPS';
        timer = setInterval(poll, Math.round(1000 / fps));
        poll();
      } catch (e) { status.textContent = 'błąd: ' + e.message; }
    };

    const stop = async () => {
      clearInterval(timer); timer = null;
      try { await api('/agents/web/screen/stop', { method: 'POST' }); } catch {}
      running = false;
      btn.textContent = 'Start';
      status.textContent = 'wyłączony';
    };

    btn.onclick = () => running ? stop() : start();
    ctx.onClose(() => { if (running) stop(); });

    api('/agents/web/screen/status').then(r => r.json()).then(j => {
      if (j.on) { running = true; btn.textContent = 'Stop'; status.textContent = 'transmisja'; const fps = +$('#bvFps', body).value || 5; timer = setInterval(poll, Math.round(1000 / fps)); poll(); }
    }).catch(() => {});
  }
};
})();
