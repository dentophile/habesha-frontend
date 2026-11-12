const CACHE_NAME = "habesha-date-pwa-v17";
const STATIC_ASSETS = [
    "https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
    "https://unpkg.com/@phosphor-icons/web"
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    // Never serve stale cached HTML or JS files in the Android APK — always fetch fresh network first!
    if (
        req.method !== "GET" ||
        req.url.includes("/api/") ||
        req.url.includes("/ws/") ||
        req.url.endsWith(".js") ||
        req.url.includes(".js?") ||
        req.mode === "navigate"
    ) {
        return;
    }
    event.respondWith(
        fetch(req)
            .then((networkRes) => {
                if (networkRes && networkRes.status === 200 && req.url.startsWith("http")) {
                    const clone = networkRes.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
                }
                return networkRes;
            })
            .catch(() => caches.match(req))
    );
});
