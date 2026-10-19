/* RAK Walk-in Tracker · service worker (v3)
   - Network-first for pages, so a new upload is picked up straight away; the cached copy is only used offline.
   - Opens / focuses the app when someone taps a notification (head-office messages, inactivity alerts).
   Put this file next to the showroom pages and retail.html (same folder as today's sw.js). */
const CACHE = "rak-walkin-v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
})()));

self.addEventListener("fetch", e => {
    const req = e.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== location.origin) return;                 // Firebase, fonts and CDNs go straight to the network
    e.respondWith((async () => {
        try {
            const res = await fetch(req, { cache: "no-store" });
            if (res && res.ok && (req.mode === "navigate" || /\.(html|png|json|webmanifest)$/.test(url.pathname))) {
                const c = await caches.open(CACHE); c.put(req, res.clone()).catch(() => {});
            }
            return res;
        } catch (err) {
            const hit = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
            if (hit) return hit;
            throw err;
        }
    })());
});

// Tapping a notification brings the tracker forward (or opens it if it was closed).
self.addEventListener("notificationclick", e => {
    e.notification.close();
    const target = (e.notification.data && e.notification.data.url) || self.registration.scope;
    e.waitUntil((async () => {
        const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const path = new URL(target).pathname;
        for (const w of wins) if (new URL(w.url).pathname === path && "focus" in w) return w.focus();
        if (wins[0] && "focus" in wins[0]) { try { await wins[0].navigate(target); } catch (x) {} return wins[0].focus(); }
        return self.clients.openWindow(target);
    })());
});

// Ready for real push later (e.g. Firebase Cloud Messaging) — shows whatever the server sends.
self.addEventListener("push", e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
    e.waitUntil(self.registration.showNotification(d.title || "Message from head office", {
        body: d.body || "", icon: d.icon || "rakwalkin.png", badge: "rakwalkin.png", tag: d.tag || "push", renotify: true,
        requireInteraction: !!d.urgent, data: { url: d.url || self.registration.scope }
    }));
});
