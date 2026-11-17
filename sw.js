// CHIRAG ENTERPRISES ERP — offline app shell (screens only).
// Business records are never cached here; they live in the device database (IndexedDB).
// Google sign-in and Drive calls go to other origins and are never touched by this worker.
// Network first, so a newer ERP version is picked up as soon as the launcher serves it.
const CACHE = 'chirag-erp-local-1.3.0';
const SHELL = ['./', './index.html', './head.js', './local.js', './sync.js', './move.js', './boot.js', './erp/app.css', './erp/core.js', './erp/exports.js', './erp/store.js', './erp/app.js', './erp/sync-ui.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('/lan.json')) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match('./index.html'))));
});
