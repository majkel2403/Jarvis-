/* Uniwersalna sonda headless: laduje lokalne strony w headless Edge (CDP), czeka na sygnal gotowosci,
   zbiera metryki i zapisuje zrzuty 2x. Dziala dla kazdej lokalnej strony (graf, dashboard, galeria).

   Uzycie:
     node probe-headless.cjs --out shots --wait 4500 -- http://127.0.0.1:8930/a.html http://127.0.0.1:8930/b.html
   Opcje:
     --out <katalog>   katalog na PNG (domyslnie shots)
     --wait <ms>       ile czekac po gotowosci (domyslnie 4000)
     --port <n>        port CDP, MUSI byc < 65536 (domyslnie 9344)
     --ready <wyr>     warunek gotowosci (domyslnie "!!(window.__LAB && window.__LAB.ready)")
     --skip             nie czekaj na gotowosc, tylko odczekaj --wait
   Wypisuje jedna linie JSON na strone: {url, ready, errors, fps, nodes, canvases, png}
   Wymaga: node >= 18 (globalny WebSocket), Edge pod EDGE albo domyslna sciezka. */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const EDGE = process.env.EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const urls = sep > -1 ? argv.slice(sep + 1) : argv.filter(a => /^https?:/.test(a));
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i > -1 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = opt('out', 'shots'), WAIT = +opt('wait', 4000), PORT = +opt('port', 9344);
const READY = opt('ready', '!!(window.__LAB && window.__LAB.ready)');
const SKIP = argv.includes('--skip');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const METRICS = `(()=>{const L=window.__LAB||{};return JSON.stringify({ready:!!L.ready,`
  + `errors:(L.errors||[]).slice(0,5),fps:L.fps||null,nodes:L.nodes||null,`
  + `canvases:document.querySelectorAll('canvas').length})})()`;

(async () => {
  if (!urls.length) { console.log('brak URL-i (uzyj: ... -- <url> [url])'); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  const profile = path.join(os.tmpdir(), 'edge-probe-' + Date.now());
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-first-run',
    '--hide-scrollbars', '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });

  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); up = true; } catch (e) { await sleep(400); }
  }
  if (!up) { console.log('FAIL: Edge nie wystartowal (CDP)'); edge.kill(); process.exit(1); }

  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');

  for (const url of urls) {
    let line = { url, ready: null, errors: [], fps: null, nodes: null, canvases: null, png: null };
    try {
      await send('Page.navigate', { url });
      if (!SKIP) {
        for (let i = 0; i < 90; i++) {
          const r = await send('Runtime.evaluate', { expression: READY, returnByValue: true });
          if (r.result && r.result.value === true) { line.ready = true; break; }
          await sleep(500);
        }
      }
      await sleep(WAIT);
      const m = await send('Runtime.evaluate', { expression: METRICS, returnByValue: true });
      if (m.result && typeof m.result.value === 'string') Object.assign(line, JSON.parse(m.result.value));
      if (line.errors && line.errors.length) {
        const j = await send('Runtime.evaluate', { expression: 'JSON.stringify((window.__LAB&&window.__LAB.errors)||[])', returnByValue: true });
        if (j.result && j.result.value) line.errors = JSON.parse(j.result.value).slice(0, 5);
      }
      const name = (url.split('/').pop() || 'page').replace(/\.html?$/i, '') + '.png';
      const png = path.join(OUT, name);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, captures: undefined });
      fs.writeFileSync(png, Buffer.from(shot.data, 'base64'));
      line.png = png;
    } catch (e) { line.error = String(e.message || e); }
    console.log(JSON.stringify(line));
  }
  ws.close(); edge.kill(); await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})().catch(e => { console.log('FAIL ' + e.stack); process.exit(1); });
