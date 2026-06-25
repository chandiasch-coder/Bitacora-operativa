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
  if (event.request.method !== "GET") return;

  // Peticiones de NAVEGACIÓN (abrir la app desde el ícono, recargar, etc.):
  // responder INMEDIATO desde caché si existe, sin esperar nunca a la red.
  // Esto es lo que evita la pantalla de error nativa de iOS sin conexión.
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then(function (cached) {
        if (cached) return cached;
        // Sin nada cacheado todavía: como último recurso, intentar la red.
        return fetch(event.request).catch(function () {
          return new Response(
            "<h1>Sin conexión y sin caché disponible todavía.</h1><p>Abre la app una vez con internet para guardarla.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        });
      })
    );
    return;
  }

  // Resto de peticiones (CSS/JS/manifest/etc.): cache-first con actualización en segundo plano.
  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
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
          return cachedResponse || caches.match("./index.html");
        });

      return cachedResponse || networkFetch;
    })
  );
});
