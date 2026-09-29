/* Jarvis OS — service worker: działanie offline (powłoka aplikacji) */
const CACHE = 'jarvis-os-v11';
const SHELL = ['./', 'index.html', 'css/jarvis.css', 'js/core.js', 'js/events.js', 'js/store.js', 'js/registry.js', 'js/process.js', 'js/apps.js', 'js/widgets.js', 'js/commands.js', 'js/context.js', 'js/judge.js', 'js/ai.js', 'js/hud.js', 'js/dash.js', 'js/main.js', 'assets/wallpaper.jpg', 'assets/icon.svg', 'manifest.webmanifest'];

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
