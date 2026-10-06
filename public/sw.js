const CACHE = `spelling-spells-v1`;
const CORE = [
  `/`,
  `/favicon.svg`,
  `/manifest.webmanifest`,
  `/brand/logo-mark.svg`,
  `/icons/icon-192.png`,
  `/icons/icon-512.png`,
  `/visuals/hero-night-background.png`,
];

self.addEventListener(`install`, (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});

self.addEventListener(`activate`, (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(`spelling-spells-`) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener(`fetch`, (event) => {
  const request = event.request;
  if (request.method !== `GET` || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === `navigate`) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => await caches.match(request, { ignoreSearch: true }) ?? await caches.match(`/`) ?? Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
    if (response.ok && response.type === `basic`) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
    }
    return response;
  })));
});
