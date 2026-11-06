/* Alerts for the RAK showroom pages and the UAE Retail dashboard — shown by the system like an app's own alerts,
   with "Got it" and "Open" buttons. Upload next to the pages (same folder as each page).
   Registered with scope ./push/, so the existing sw.js keeps working. */
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');
const DB = 'https://rakretail-default-rtdb.firebaseio.com';
firebase.initializeApp({
  apiKey: "AIzaSyDfjbpGfUEzYCbKYyQi6XVt7zZ4Tp54phU", authDomain: "rakretail.firebaseapp.com",
  databaseURL: DB, projectId: "rakretail",
  storageBucket: "rakretail.firebasestorage.app", messagingSenderId: "507453199562",
  appId: "1:507453199562:web:520cf23c6baf435e5f1033"
});
firebase.messaging().onBackgroundMessage(p => {
  const d = p.data || {}, urgent = d.urgent === '1', msg = d.kind === 'msg';
  return self.registration.showNotification(d.title || 'RAK Ceramics', {
    body: d.body || '',
    tag: d.tag || undefined, renotify: true,
    requireInteraction: urgent,                       // urgent ones stay until handled
    silent: false,
    timestamp: +d.ts || Date.now(),
    icon: d.icon || 'rakwalkin.png',
    badge: 'notif-badge.png',                         // small white icon in the status bar
    vibrate: urgent ? [160, 70, 160, 70, 160] : [60, 40, 60],   // the phone's own notification sound plays as well
    actions: msg ? [{ action: 'ack', title: '✓ Got it' }, { action: 'open', title: 'Open app' }] : [{ action: 'open', title: 'Open app' }],
    data: { url: d.url || './', store: d.store || '', id: d.id || '', who: d.who || '' }
  });
});
self.addEventListener('notificationclick', e => {
  const n = e.notification, d = n.data || {};
  n.close();
  if (e.action === 'ack' && d.store && d.id) {              // same acknowledgement as "Got it" inside the page
    const who = String(d.who || 'Screen').replace(/[.#$\[\]\/]/g, '_').slice(0, 60) || 'Screen';
    e.waitUntil(fetch(`${DB}/stores/${encodeURIComponent(d.store)}/broadcasts/${encodeURIComponent(d.id)}/seen/${encodeURIComponent(who)}.json`,
      { method: 'PUT', body: JSON.stringify(Date.now()) }).catch(() => {}));
    return;
  }
  const url = new URL(d.url || './', self.location.href).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (w.url.split(/[?#]/)[0] === url.split(/[?#]/)[0]) return w.focus();
    return clients.openWindow(url);
  }));
});
