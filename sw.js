/* ============================================================
   sw.js — Service worker
   Plantilla de reservas de canchas

   Recibe notificaciones push (Web Push) y maneja el click.
   Sin caché offline a propósito: las reservas se pagan online y
   encolarlas sin conexión crearía riesgo de dobles reservas.
   ============================================================ */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (e) {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { /* payload no JSON */ }
  const titulo = d.title || 'Club Deportivo';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.body || '',
    icon: 'img/icon-192.png',
    badge: 'img/icon-192.png',
    data: { url: d.url || '/' },
    tag: d.tag || undefined
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (const c of list) {
      if (c.url.indexOf(url.split('?')[0]) !== -1 && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(url);
  }));
});
