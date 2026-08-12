/**
 * Custom Service Worker extension for push notification handling.
 * This file is merged by next-pwa's customWorkerDir into the generated SW.
 *
 * Handles:
 * - push events (display notifications from server)
 * - notificationclick events (handle user interaction with notifications)
 * - notificationclose events (track dismissed notifications)
 *
 * Requirements: 19.2, 19.5, 12.4
 */

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    // Fallback for plain text push
    data = {
      title: 'A-la Burguer',
      body: event.data.text(),
    };
  }

  const title = data.title || 'A-la Burguer';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-96x96.png',
    tag: data.tag || `wb-${Date.now()}`,
    data: {
      url: data.url || '/',
      pedidoId: data.pedidoId,
      tipo: data.tipo, // 'nuevo_pedido', 'estado_pedido', 'inventario_bajo'
      ...data.data,
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click - navigate to relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = data.url || '/';

  // Route based on notification type
  if (data.tipo === 'nuevo_pedido') {
    targetUrl = '/pedidos';
  } else if (data.tipo === 'estado_pedido' && data.pedidoId) {
    targetUrl = `/rastreo?pedido=${data.pedidoId}`;
  } else if (data.tipo === 'inventario_bajo') {
    targetUrl = '/inventario';
  } else if (data.tipo === 'entrega_pendiente') {
    targetUrl = '/entregas';
  }

  // Handle action button clicks
  if (event.action === 'ver_pedido' && data.pedidoId) {
    targetUrl = `/pedidos?id=${data.pedidoId}`;
  } else if (event.action === 'ver_rastreo' && data.pedidoId) {
    targetUrl = `/rastreo?pedido=${data.pedidoId}`;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // If a window is already open, focus it and navigate
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle notification close (dismissed without clicking)
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};

  // Optionally track dismissed notifications for analytics
  // This can be sent to the server when the app is next active
  if (data.pedidoId) {
    // Store dismissed notification info in IndexedDB or cache for later sync
    console.log('[SW] Notification dismissed:', data.tipo, data.pedidoId);
  }
});
