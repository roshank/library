// Offline-first app shell. Bump VERSION whenever any shipped file changes.
const VERSION = 'ww-v1';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest', './icons/icon.svg',
  './src/main.js', './src/renderer.js', './src/mat.js', './src/primitives.js', './src/builders.js',
  './src/library.js', './src/library-dinos.js', './src/library-animals.js', './src/library-world.js',
  './src/search.js', './src/mystery.js', './src/speech.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    })),
  );
});
