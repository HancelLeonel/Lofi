// Cachea solo el shell de la app; YouTube (iframe, oEmbed, miniaturas) siempre va a la red.
const CACHE = "lofi-cafe-v1";
const SHELL = ["./", "index.html", "style.css", "app.js", "streams.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Red primero (para recibir actualizaciones), caché como respaldo sin conexión
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
});
