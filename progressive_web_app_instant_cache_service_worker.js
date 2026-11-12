/**
 * Habesha Date (ሀበሻ ቀጠሮ ❤️) — Progressive Web App Instant Cache Service Worker
 * Save as `sw.js` in the root of your `habesha-frontend` GitHub Pages repository.
 * Strategy:
 * - Network-First for HTML & JS (so updates and Android APK scroll fixes apply immediately)
 * - Cache-First for fonts/icons (for fast 3G/4G loading)
 * - Bypass for live API & WebSocket calls
 */

const CACHE_NAME = "habesha-date-pwa-v19";

const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./phase6_features.js?v=19",
    "./phase7_features.js?v=19",
    "./phase9_features.js?v=19",
    "./phase10_features.js?v=19",
    "https://unpkg.com/@phosphor-icons/web"
];

// 1. Install & Pre-Cache Core Shell
self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
});

// 2. Activate & Purge Old Caches Immediately (Fixes Android APK Stale Cache)
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        ).then(() => self.clients.claim())
    );
});

// 3. Smart Fetch Handler
self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Never cache live backend API requests, Supabase calls, or WebSockets
    if (
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/ws/") ||
        url.hostname.includes("onrender.com") ||
        url.hostname.includes("supabase.co")
    ) {
        return;
    }

    // Network-First for HTML & JS files so updates always load right away when online
    const isHtmlOrJs =
        req.mode === "navigate" ||
        url.pathname.endsWith(".html") ||
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith("/");

    if (isHtmlOrJs) {
        event.respondWith(
            fetch(req)
                .then((networkResp) => {
                    if (networkResp && networkResp.status === 200) {
                        const clone = networkResp.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
                    }
                    return networkResp;
                })
                .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
        );
        return;
    }

    // Stale-While-Revalidate for fonts, icons, and static assets
    event.respondWith(
        caches.match(req).then((cachedResp) => {
            const fetchPromise = fetch(req)
                .then((networkResp) => {
                    if (networkResp && networkResp.status === 200) {
                        const clone = networkResp.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
                    }
                    return networkResp;
                })
                .catch(() => cachedResp);

            return cachedResp || fetchPromise;
        })
    );
});
