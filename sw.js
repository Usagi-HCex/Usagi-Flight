const CACHE_NAME = "flight-log-pwa-v11";
const SHELL_URLS = [
  "./",
  "./index.html",
  "./show_flights.html",
  "./flight_map.html",
  "./flight_view.html",
  "./mobile/index.html",
  "./mobile/add.html",
  "./mobile/flights.html",
  "./mobile/map.html",
  "./mobile/flight.html",
  "./mobile/edit.html",
  "./add_flight.html",
  "./flight_edit.html",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./assets/favicon.svg",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/css/dashboard.css",
  "./assets/css/mobile.css",
  "./assets/css/flight-form.css",
  "./assets/css/flight-list.css",
  "./assets/css/flight-detail.css",
  "./assets/css/flight-map.css",
  "./assets/js/pwa.js",
  "./assets/js/localize.js",
  "./assets/js/dashboard.js",
  "./assets/js/show-flights-page.js",
  "./assets/js/flight-view-page.js",
  "./assets/js/flight-map-page.js",
  "./assets/js/mobile-home.js",
  "./assets/js/mobile-form.js",
  "./assets/js/mobile-flights.js",
  "./assets/js/mobile-map.js",
  "./assets/js/mobile-flight.js",
  "./assets/js/mobile-tabbar.js",
  "./assets/js/flight-map-renderer.js",
  "./assets/vendor/zxing-browser.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchAndCache = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch((error) => {
      if (cached) return cached;
      throw error;
    });
  return cached || fetchAndCache;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes("/api/")) return;
  if (request.mode === "navigate" || /\.html$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (/\.(?:css|js|webmanifest|svg)$/i.test(url.pathname) || url.pathname.includes("/assets/data/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});
