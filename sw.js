/* ==================================================================
   RAK Retail — service worker (showroom trackers and the management dashboard)
   ------------------------------------------------------------------
   Pages (index.html, manifest) are ALWAYS fetched fresh from the
   server. The saved copy is used only when the device is offline.
   That is what lets a newly uploaded index.html reach every device
   on its own — no cache clearing, no reinstalling the app.

   Icons, fonts and the chart/Excel/Firebase libraries are cached
   for speed and offline use. Live Firebase data is never touched.

   You do NOT need to edit this file when you publish a new version
   of the page. Upload it once, next to index.html.
   ================================================================== */
const SW_VERSION = "2026.10.15-2";
const CACHE = "showroom-" + SW_VERSION;

// Third-party files that are safe to cache (they use fixed, versioned URLs).
const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];

self.addEventListener("install", () => self.skipWaiting());          // take over straight away

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));   // drop old caches
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", event => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);

    // Live data and auth: never intercept.
    if (/(^|\.)firebaseio\.com$|(^|\.)firebasedatabase\.app$|(^|\.)googleapis\.com$/.test(url.hostname) && url.hostname !== "fonts.googleapis.com") return;

    if (url.origin === self.location.origin) {
        if (url.searchParams.has("_vc") || url.searchParams.has("_")) return;   // the pages' own update checks go straight to the server
        const accept = req.headers.get("accept") || "";
        const isPage = req.mode === "navigate" || accept.includes("text/html") || /\.(html?|json|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith("/");
        if (url.pathname.endsWith("/sw.js")) return;
        event.respondWith(isPage ? networkFirst(req, url) : staleWhileRevalidate(req));
        return;
    }

    const cdn = CDN_HOSTS.includes(url.hostname) || (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/"));
    if (cdn) event.respondWith(cacheFirst(req));
});

// Fresh from the server every time; saved copy only when offline.
async function networkFirst(req, url) {
    const cache = await caches.open(CACHE);
    const key = url.origin + url.pathname;                            // ?v=… variants share one saved copy
    try {
        const fresh = await fetch(url.href, { cache: "no-store", credentials: "same-origin" });
        if (fresh.ok && fresh.type === "basic") cache.put(key, fresh.clone()).catch(() => {});
        // A followed redirect can't be handed to a page navigation directly, so re-wrap it.
        if (fresh.redirected && req.mode === "navigate") {
            return new Response(await fresh.blob(), { status: fresh.status, statusText: fresh.statusText, headers: fresh.headers });
        }
        return fresh;
    } catch (err) {
        const saved = (await cache.match(key)) || (await cache.match(req, { ignoreSearch: true }));
        if (saved) return saved;
        return new Response(
            '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>' +
            '<body style="font-family:system-ui;padding:40px;text-align:center;color:#0f2727"><h2>You’re offline</h2>' +
            '<p>Reconnect to the internet and the tracker will load.</p></body>',
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
    }
}

// Same-origin icons and images: instant from the cache, refreshed in the background.
async function staleWhileRevalidate(req) {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(req);
    const network = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
    }).catch(() => saved);
    return saved || network;
}

// Versioned libraries and fonts never change at the same URL, so the cache wins.
async function cacheFirst(req) {
    const cache = await caches.open(CACHE);
    const saved = await cache.match(req);
    if (saved) return saved;
    const res = await fetch(req);
    if (res.ok || res.type === "opaque") cache.put(req, res.clone()).catch(() => {});
    return res;
}
