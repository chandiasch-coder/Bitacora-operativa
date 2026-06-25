// Service Worker — Bitácora Operativa
// Cachea el "app shell" (este mismo HTML) la primera vez que carga con conexión,
// y lo sirve desde caché en todas las cargas posteriores, con o sin internet.

const SW_VERSION = "v1";
const CACHE_NAME = "bitacora-operativa-" + SW_VERSION;

// Rutas relativas al scope del Service Worker (la carpeta del repositorio en GitHub Pages).
const APP_SHELL = [
  "./",
  "./index.html",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  // Solo nos interesa cachear/responder peticiones GET de navegación y del propio documento.
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      // Estrategia "cache first, network update in background": responde rápido
      // desde caché si existe, y de paso intenta refrescar la caché si hay red.
      const networkFetch = fetch(event.request)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(function () {
          // Sin red: si no hay nada en caché para esta request exacta,
          // como último recurso devolvemos el index.html cacheado
          // (útil para la navegación inicial sin conexión).
          return caches.match("./index.html");
        });

      return cachedResponse || networkFetch;
    })
  );
});
