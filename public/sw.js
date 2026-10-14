const CACHE = `spelling-spells-public-v2`;
const CORE = [
  `/`,
  `/favicon.svg`,
  `/manifest.webmanifest`,
  `/brand/logo-mark.svg`,
  `/icons/icon-192.png`,
  `/icons/icon-512.png`,
  `/visuals/hero-night-background.png`,
];
const publicPages = new Set([
  `/`, `/spells`, `/worlds`, `/pronunciation`, `/about`, `/about-us`,
  `/contact`, `/contact-us`, `/terms`, `/terms-of-service`, `/privacy`, `/privacy-policy`,
]);
const publicAsset = (path) => /^\/(?:_expo\/static|assets|brand|icons|visuals)\//.test(path)
  || [`/favicon.svg`, `/manifest.webmanifest`].includes(path);
const publicNavigation = (url) => !url.search && (publicPages.has(url.pathname)
  || /^\/spell\/[a-z0-9-]+\/?$/.test(url.pathname));
const cacheable = (response) => response.ok && response.type === `basic`
  && !/(?:private|no-store)/i.test(response.headers.get(`cache-control`) ?? ``);

self.addEventListener(`install`, (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});

self.addEventListener(`activate`, (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(`spelling-spells-`) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener(`fetch`, (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== `GET` || url.origin !== self.location.origin || request.headers.has(`authorization`)) return;
  // Account pages, drafts, reports and every API route bypass offline caching.
  if (request.mode === `navigate`) {
    if (!publicNavigation(url)) return;
    event.respondWith(fetch(request).then((response) => {
      if (cacheable(response)) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => await caches.match(request) ?? await caches.match(`/`) ?? Response.error()));
    return;
  }
  if (!publicAsset(url.pathname) || url.search) return;
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
    if (cacheable(response)) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
    }
    return response;
  })));
});
