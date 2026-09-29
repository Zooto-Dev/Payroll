/* ============================================================
   NEXUS Attendance — Service Worker  v7
   - HTML: ALWAYS network-first (HTTP cache bhi bypass) -> naye
     deploy turant har device par lagenge, purana build kabhi
     atkega nahi. Offline par cache fallback.
   - CDN libs + face models: cache-first (offline reload chalta rahe)
   - Baaki sab cross-origin (Supabase, Google Apps Script, uske
     redirect host, QR/IP services): SW bilkul haath nahi lagata.
     Pehle sirf script.google.com chhoda ja raha tha, par GAS /exec
     script.googleusercontent.com par redirect hota hai — wo request
     SW ke andar aa jaati thi aur redirect ki wajah se fail ho jaati
     thi. Isi se installed PWA me "config load nahi hui" aata tha
     jabki incognito (jahan SW hota hi nahi) me sab chalta tha.
   - IndexedDB / localStorage ko SW touch nahi karta (punch queue SAFE)
   ============================================================ */
const CACHE = 'nexus-attend-v7';

// Sirf inhi cross-origin hosts ko cache karte hain. Baaki kuch bhi ho — SW usme
// dakhal nahi deta, browser khud handle karta hai (redirect bhi theek se chalta hai).
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'justadudewhohacks.github.io'   // face-api ke models
];

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

// respondWith() ko aisa response dena mana hai jo redirect ho kar aaya ho — browser use
// network error bana deta hai. Body wahi rakh kar naya Response bana dete hain, taaki
// redirect ka nishaan hat jaye aur page normal chale.
function unredirect(res) {
  if (!res || !res.redirected) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST/PUT kabhi cache nahi

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // Cross-origin me sirf CDN/models hi SW se hokar jaate hain. Supabase, Apps Script
  // (script.google.com + script.googleusercontent.com), account pages, QR/IP services —
  // sab seedha browser ke paas, bina kisi dakhal ke.
  if (!sameOrigin && CDN_HOSTS.indexOf(url.hostname) === -1) return;

  const isHTML = sameOrigin &&
                 (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || req.mode === 'navigate');

  if (isHTML) {
    // NETWORK-FIRST + HTTP-cache bypass -> hamesha fresh build
    e.respondWith(
      fetch(new Request(req.url, { cache: 'reload' }))
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return unredirect(res);
        })
        .catch(() => caches.match(req).then(m => m || caches.match('./attendance.html')))
    );
    return;
  }

  // baaki (same-origin assets + upar wale CDN): cache-first, miss par network + cache
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return unredirect(res);
    }).catch(() => hit))
  );
});
