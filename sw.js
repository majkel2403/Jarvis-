/* Jarvis OS — service worker: działanie offline (powłoka aplikacji) */
const CACHE = 'jarvis-os-v19';
/* UWAGA: caches.addAll() odrzuca cały install, jeśli KTÓRYKOLWIEK wpis zwróci 404.
   Dlatego lista zawiera wyłącznie pliki, które naprawdę istnieją w repo —
   każdy nowy moduł warstwy efektów trafia tutaj razem z plikiem, nie wcześniej. */
const SHELL = ['./', 'index.html', 'css/jarvis.css', 'css/fx.css', 'js/core.js', 'js/events.js', 'js/store.js', 'js/registry.js', 'js/mcp-tool-schema.js', 'js/undo.js', 'js/jev-policy.js', 'js/process.js', 'js/apps.js', 'js/widgets.js', 'js/chart.js', 'js/widget-spec.js', 'js/commands.js', 'js/search.js', 'js/commands-ext.js', 'js/commands-data.js', 'js/commands-w4.js', 'js/agents.js', 'js/context.js', 'js/judge.js', 'js/jev-flow.js', 'js/ai.js', 'js/bridge.js', 'js/hud.js', 'js/dash.js', 'js/main.js', 'js/fx/draw.js', 'js/fx/palettes.js', 'js/fx/runtime.js', 'js/fx/quality.js', 'js/fx/targets.js', 'js/fx/clock.js', 'js/fx/effects/orb.js', 'js/fx/effects/screen.js', 'js/fx/effects/particles.js', 'js/fx/effects/hud.js', 'js/fx/effects/text.js', 'js/fx/effects/data.js', 'js/fx/effects/glitch.js', 'js/fx/effects/success.js', 'js/fx/effects/transition.js', 'js/fx/effects/pointer.js', 'js/fx/effects/ambient.js', 'js/fx/index.js', 'js/fx/bindings.js', 'js/fx/engine-tokens.js', 'js/fx/engine-dom.js', 'js/fx/effects-engine/actions.js', 'js/fx/effects-engine/graph.js', 'js/fx/effects-engine/links.js', 'js/fx/effects-engine/orb.js', 'js/fx/effects-engine/particles.js', 'js/fx/effects-engine/screen.js', 'js/fx/engine-core.js', 'js/fx/engine.js', 'js/fx/webgl-orb.js', 'js/fx/audio.js', 'js/fx/browser.js', 'assets/wallpaper.jpg', 'assets/icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// własne pliki: najpierw sieć (świeże wdrożenia), w razie braku sieci — cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())))   // strona zastępcza tylko dla nawigacji, nie dla skryptów
  );
});
