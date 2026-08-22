/* ============================================================
   NEXUS Attendance — Service Worker  v6
   - HTML: ALWAYS network-first (HTTP cache bhi bypass) -> naye
     deploy turant har device par lagenge, purana build kabhi
     atkega nahi. Offline par cache fallback.
   - CDN libs + face models: cache-first (offline reload chalta rahe)
   - Supabase / GAS: kabhi cache nahi (hamesha live)
   - IndexedDB / localStorage ko SW touch nahi karta (punch queue SAFE)
   ============================================================ */
const CACHE = 'nexus-attend-v6';

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
  if (req.method !== 'GET') return;                       // POST/PUT kabhi cache nahi

  const url = new URL(req.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('script.google.com')) {
    return;                                               // data hamesha live
  }

  const isHTML = url.origin === location.origin &&
                 (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || req.mode === 'navigate');

  if (isHTML) {
    // NETWORK-FIRST + HTTP-cache bypass -> hamesha fresh build
    e.respondWith(
      fetch(new Request(req.url, { cache: 'reload' }))
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(m => m || caches.match('./attendance.html')))
    );
    return;
  }

  // baaki sab (CDN, models, images): cache-first, miss par network + cache
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit))
  );
});
