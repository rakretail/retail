/* Alerts on phones and computers for the RAK showroom pages and the UAE Retail dashboard.
   Upload next to the pages. It is registered with scope ./push/, so your existing sw.js keeps working. */
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyDfjbpGfUEzYCbKYyQi6XVt7zZ4Tp54phU", authDomain: "rakretail.firebaseapp.com",
  databaseURL: "https://rakretail-default-rtdb.firebaseio.com", projectId: "rakretail",
  storageBucket: "rakretail.firebasestorage.app", messagingSenderId: "507453199562",
  appId: "1:507453199562:web:520cf23c6baf435e5f1033"
});
firebase.messaging().onBackgroundMessage(p => {
  const d = p.data || {};
  return self.registration.showNotification(d.title || 'RAK Ceramics', {
    body: d.body || '', tag: d.tag || undefined, renotify: true, requireInteraction: d.urgent === '1',
    icon: 'rakwalkin.png', badge: 'rakwalkin.png', vibrate: d.urgent === '1' ? [120, 60, 120, 60, 120] : [80, 50, 80],
    data: { url: d.url || './' }
  });
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.location.href).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (w.url.split(/[?#]/)[0] === url.split(/[?#]/)[0]) return w.focus();
    return clients.openWindow(url);
  }));
});
