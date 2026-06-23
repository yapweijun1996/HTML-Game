const CACHE_NAME = "sanseh-match3-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/config.js",
  "./js/i18n.js",
  "./styles/base.css",
  "./styles/board.css",
  "./styles/ui.css",
  "./js/modules/game-store.js",
  "./js/modules/game-logic.js",
  "./js/modules/game-animations.js",
  "./js/modules/game-flow.js",
  "./js/modules/game-input.js",
  "./js/modules/game-ui.js",
  "./app.js",
  "./sw-register.js",
  "./manifest.webmanifest",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(ASSETS);
      } catch (error) {
        console.warn("Service Worker: some assets failed to cache", error);
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    }).catch(() => {
      if (event.request.mode === "navigate") {
        return caches.match("./index.html");
      }
      return new Response("Offline: unable to load this resource.", {
        status: 503,
        statusText: "Service Unavailable",
      });
    })
  );
});
