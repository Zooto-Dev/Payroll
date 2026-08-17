/* ============================================================
   NEXUS Attendance — Service Worker (offline resilience)
   Caches the app shell + all CDN libraries + face models the
   first time online, so a reload works even with NO internet.
   ============================================================ */
const CACHE = 'nexus-attend-v5';

// core files the app needs to boot (cached on install)
const CORE = [
  './',
  './index.html',
  './attendance.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // never cache POST/PUT (Supabase writes)

  const url = new URL(req.url);
  // Supabase API + GAS config = always live (never cache dynamic data)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('script.google.com')) {
    return; // let it hit the network normally
  }

  // face model shards + CDN libs + app files = cache-first (so offline reload works)
  const isModel = url.href.includes('/models') || url.href.includes('face-api') ||
                  url.href.includes('.onnx') || url.href.includes('-weights_manifest') ||
                  url.href.includes('-shard');
  const isCdn = url.hostname.includes('jsdelivr') || url.hostname.includes('cdnjs') ||
                url.hostname.includes('cdn.tailwindcss') || url.hostname.includes('justadudewhohacks') ||
                url.hostname.includes('githubusercontent');

  const isHTML = url.origin === location.origin && (url.pathname.endsWith('.html') || url.pathname.endsWith('/'));

  if (isHTML) {
    // NETWORK-FIRST for pages: always try to get the latest; use cache only if offline.
    e.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (isModel || isCdn || url.origin === location.origin) {
    // CACHE-FIRST for models/libraries/assets (they don't change).
    e.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(resp => {
          if (resp && (resp.ok || resp.type === 'opaque')) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return resp;
        }).catch(() => hit);
      })
    );
  }
});
