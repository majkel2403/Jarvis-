/* =========================================================
   JARVIS OS — Pulpit HUD: 20 komponentów na prawdziwych danych
   Źródła: most (/bridge/system), J.engine (stan agenta), J.hermes
   (opóźnienie), J.timer (minutnik), J.proc (krok po kroku), J.judge (Jev).
   Odświeżanie co 2 s, tylko gdy okno jest otwarte.
   ========================================================= */
'use strict';
(() => {
const H = window.J.hud;
const HIST = 60;
const hist = { cpu: [], act: [], ekg: [] };
let snap = null;
const r0 = v => (v == null ? null : Math.round(v));

async function poll() {
  try { const r = await J.bridgeGet('/bridge/system?processes=0', { timeout: 8000 }); snap = r?.data ?? r ?? null; }
  catch { snap = null; }
}

function facts() {
  const sysv = H.fromSystemSnapshot(snap);
  const eng = J.engine || {};
  const act = eng.activity != null ? Math.round(eng.activity * 100) : null;
  const hl = J.hermes || {};
  const hermesUp = ['ok', 'up', 'online'].includes(hl.status);
  const hermesDown = hl.status && !hermesUp && hl.status !== 'unknown';
  const lat = hermesUp ? (hl.latency ?? null) : null;
  const steps = (J.proc?.current?.steps) || [];
  const errs = steps.filter(s => s.status === 'err');
  const tools = steps.filter(s => s.type === 'tool');
  const t = J.timer;
  const timerLeft = t && t.running ? t.left() / 1000 : null;
  const timerTotal = t && t.running && t.total ? t.total / 1000 : null;
  const timerPct = timerLeft != null && timerTotal ? Math.round(100 * (1 - timerLeft / timerTotal)) : null;
  const judge = J.judge?.status;
  const jevState = J.judge?.enabled?.() ? (judge?.state === 'up' ? 'up' : judge?.state === 'down' ? 'down' : 'unknown') : 'unknown';
  return { sysv, act, lat, hermesDown, tools, errs, timerLeft, timerPct, jevState, eng, hl };
}

function critItems(errs) {
  const m = new Map();
  errs.forEach(s => { const k = String(s.title || 'Błąd'); m.set(k, (m.get(k) || 0) + 1); });
  return [...m].map(([title, count]) => ({ title, count }));
}

function render(root) {
  const f = facts();
  const { sysv, act, lat } = f;
  if (sysv.cpu != null) hist.cpu = H.pushSample(hist.cpu, sysv.cpu, HIST);
  hist.act = H.pushSample(hist.act, act, HIST);
  hist.ekg = H.pushSample(hist.ekg, f.hermesDown ? null : lat, HIST);
  const level = (f.eng.hold === 'APPROVAL_REQUIRED' ? 2 : 0) + Math.min(1, f.errs.length);
  const loader = (v, label) => H.ring({ value: v, label, tone: 'teal' });
  const up = f.jevState === 'up' ? 'up' : f.jevState === 'down' ? 'down' : 'unknown';
  const hermesState = f.hermesDown ? 'down' : (['ok', 'up', 'online'].includes(f.hl.status) ? 'up' : 'unknown');
  const latScore = lat == null ? null : Math.max(0, 100 - lat / 20);
  const cpuLast = hist.cpu.slice(-6).map(v => v);
  const cards = [
    ['Procesor', H.ring({ value: sysv.cpu, label: 'CPU' })],
    ['Radar · zdarzenia', H.radar(f.tools.slice(-12).map((s, i) => ({ a: (i * 97) % 360, r: 0.35 + ((i * 37) % 60) / 100 })))],
    ['Zegar', H.clock(new Date())],
    ['Minutnik', H.countdown(f.timerLeft)],
    ['Aktywność agenta', H.line(hist.act, { max: 100 })],
    ['Opóźnienie Hermesa', H.ekg(hist.ekg, { maxMs: 2000 })],
    ['Zagrożenia', H.danger({ level })],
    ['Wskaźniki', `<div class="hb-row">${loader(sysv.cpu, 'CPU')}${loader(sysv.ram, 'RAM')}${loader(act, 'Akcja')}${loader(latScore, 'Sieć')}${loader(null, 'Bateria')}${loader(f.timerPct, 'Minutnik')}</div>`],
    ['Parametry', H.params([
      { k: 'CPU %', v: r0(sysv.cpu) }, { k: 'RAM %', v: r0(sysv.ram) },
      { k: 'Agent', v: f.eng.mode || null }, { k: 'Hermes ms', v: lat }, { k: 'Kroki', v: f.tools.length || null },
      { k: 'Minutnik s', v: f.timerLeft == null ? null : Math.round(f.timerLeft) }])],
    ['Sygnał', H.line(hist.act, { max: 100 })],
    ['Oscyloskop · CPU', H.line(hist.cpu, { max: 100 })],
    ['Krytyczne', H.critical(critItems(f.errs))],
    ['Użycie narzędzi', H.tiles(f.tools.slice(-40).map(() => 1))],
    ['Węzły', H.nodes([{ name: 'Hermes', state: hermesState }, { name: 'Jev', state: up }, { name: 'Most', state: snap ? 'up' : 'unknown' }])],
    ['Mierniki', `<div class="hb-row">${loader(sysv.ram, 'RAM')}${loader(null, 'Dysk')}${loader(null, 'Bateria')}</div>`],
    ['Profil', H.pentagon([sysv.cpu != null ? sysv.cpu / 100 : null, sysv.ram != null ? sysv.ram / 100 : null, act != null ? act / 100 : null, latScore != null ? latScore / 100 : null, f.timerPct != null ? f.timerPct / 100 : null], ['CPU', 'RAM', 'AKT', 'SIEĆ', 'MIN'])],
    ['Próbki CPU', H.bars(cpuLast, cpuLast.map((_, i) => `-${(cpuLast.length - i) * 2}s`))],
    ['Mapa', H.dotmap()],
    ['Globus', H.globe()],
    ['Kompas', H.compass()],
  ];
  root.innerHTML = cards.map(([t, body]) => `<section class="hb-card"><h4>${t}</h4><div class="hb-body">${body}</div></section>`).join('');
}

J.apps.hud = {
  title: 'Pulpit HUD', icon: 'monitor', minW: 420, minH: 360, w: 760, h: 640,
  mount(body, ctx) {
    body.innerHTML = '<div class="hb-board" role="region" aria-label="Pulpit HUD"></div>';
    const root = body.querySelector('.hb-board');
    let stopped = false, timer = null;
    const tick = async () => { if (stopped) return; await poll(); if (!stopped) render(root); timer = setTimeout(tick, 2000); };
    tick();
    ctx.onClose(() => { stopped = true; clearTimeout(timer); });
  }
};
})();
