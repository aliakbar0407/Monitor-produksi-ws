// Service worker untuk Monitor Produksi WS (MD Palletindo)
// Strategi: cache "app shell" (index.html, ikon) supaya app bisa
// tetap terbuka saat offline / sinyal jelek, tapi data produksi
// (Supabase) selalu diambil langsung dari network karena harus real-time.

const CACHE_NAME = 'monitor-produksi-ws-v1';

// Naikkan angka versi di CACHE_NAME setiap kali index.html di-deploy ulang
// dengan perubahan besar, supaya klien lama tidak "nyangkut" di cache basi.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya urus request GET yang sama origin (file app sendiri).
  // Request ke Supabase / CDN eksternal dibiarkan lewat apa adanya
  // (network langsung), supaya data produksi selalu yang terbaru.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
  );
});
