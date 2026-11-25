// The workshop page's service worker (25 Nov 2026): registered from /workshop/ with scope './', so it controls the workshop page
// only (never the main simulator at /). It keeps a copy of the page and every file it loads, so a session keeps working on
// 20+ iPads if the venue Wi-Fi drops. Network first for everything (a deploy shows on the next load when online), the cached
// copy when the network fails or takes over 4 s. SHELL is written by tools/gen-workshop.py from the page's own links.
const VERSION = 'workshop-1';
const SHELL = [
  './',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  // shell:start
  '../page.css',
  '../adv.css',
  '../demo.css?v=20261017-fit',
  '../workshop.css',
  '../ws-page.css',
  '../mt-screen.js',
  '../adv-screen.js',
  '../adv-draw.js',
  '../adv-live.js',
  '../adv-menu.js',
  '../adv-seed.js',
  '../sed-screen.js',
  '../sed-draw.js',
  '../sed-menu.js',
  '../pv-screen.js',
  '../app.js',
  '../teaching.js',
  '../timeline.js',
  '../demo.js?v=20261017-fit',
  '../pump.js',
  '../cases.js',
  '../workshop.js',
  '../quiz.js',
  '../ws-page.js',
  '../fonts/OpenSans-latin-var.woff2',
  '../fonts/Selawik-Light-latin.woff2',
  '../fonts/Selawik-Regular-latin.woff2',
  '../fonts/Selawik-Semibold-latin.woff2',
  '../fonts/jetbrains-mono.woff2',
  '../assets/ana-ntf-logo.svg?v=clean',
  // shell:end
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('workshop-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const timeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const nav = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const net = fetch(req).then(res => { if (res.ok && res.type === 'basic') cache.put(nav ? new URL('./', self.registration.scope).href : req, res.clone()); return res; });
    try { return await timeout(net, 4000); }
    catch (err) {
      // the page with any query (?case=, ?bi=1) is the same file
      const hit = nav ? await cache.match(new URL('./', self.registration.scope).href) : (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }));
      if (hit) return hit;
      return net.catch(() => new Response('Offline, and this file was not saved yet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    }
  })());
});
