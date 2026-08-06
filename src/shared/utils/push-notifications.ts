/**
 * Utilidades para notificaciones push y permisos del navegador.
 * Maneja solicitud de permisos, registro de suscripción push,
 * y envío de notificaciones locales a través del Service Worker.
 */

export type NotificationPermissionResult = 'granted' | 'denied' | 'default';

export interface PushSubscriptionResult {
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}

export interface LocalNotificationOptions {
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
}

/**
 * Solicita permiso de notificaciones al navegador.
 * Retorna el estado del permiso tras la solicitud.
 * Si el navegador no soporta notificaciones, retorna 'denied'.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionResult> {
  if (typeof window === 'undefined') {
    return 'denied';
  }

  if (!('Notification' in window)) {
    console.warn('[Push] El navegador no soporta notificaciones.');
    return 'denied';
  }

  // Si ya se otorgó el permiso, retornar directamente
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  // Si fue denegado previamente, no podemos volver a preguntar
  if (Notification.permission === 'denied') {
    console.warn('[Push] El usuario denegó los permisos de notificación previamente.');
    return 'denied';
  }

  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionResult;
  } catch (error) {
    console.error('[Push] Error al solicitar permiso de notificaciones:', error);
    return 'denied';
  }
}

/**
 * Registra una suscripción push con el service worker activo.
 * Envía la suscripción al endpoint del servidor para almacenarla.
 * Requiere que el permiso de notificaciones ya esté otorgado.
 */
export async function registerPushSubscription(): Promise<PushSubscriptionResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { success: false, error: 'Service Worker no disponible' };
  }

  if (!('PushManager' in window)) {
    return { success: false, error: 'Push API no soportada en este navegador' };
  }

  // Verificar que el permiso esté otorgado
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Permiso de notificaciones no otorgado' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Verificar si ya existe una suscripción
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Crear nueva suscripción
      // En producción, la VAPID public key se obtendría del servidor
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.warn('[Push] VAPID public key no configurada. Usando placeholder.');
        return { success: false, error: 'VAPID public key no configurada' };
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }

    // Enviar suscripción al servidor
    const response = await fetch('/api/notificaciones/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        subscription,
        error: errorData.message || `Error del servidor: ${response.status}`,
      };
    }

    return { success: true, subscription };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[Push] Error al registrar suscripción push:', error);
    return { success: false, error: message };
  }
}

/**
 * Muestra una notificación local usando el Service Worker o la Notification API.
 * Requiere que el permiso ya esté otorgado.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  options?: LocalNotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!('Notification' in window)) {
    console.warn('[Push] Notificaciones no soportadas.');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Push] No se tienen permisos para mostrar notificaciones.');
    return false;
  }

  try {
    // Intentar usar el Service Worker para mostrar la notificación
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: options?.icon || '/icons/icon-192x192.png',
        badge: options?.badge || '/icons/icon-96x96.png',
        tag: options?.tag,
        data: options?.data,
        requireInteraction: options?.requireInteraction ?? false,
        ...(options?.actions ? { actions: options.actions } : {}),
      } as NotificationOptions);
      return true;
    }

    // Fallback: usar Notification API directamente
    new Notification(title, {
      body,
      icon: options?.icon || '/icons/icon-192x192.png',
      tag: options?.tag,
      data: options?.data,
    });
    return true;
  } catch (error) {
    console.error('[Push] Error al mostrar notificación:', error);
    return false;
  }
}

// === Utilidades internas ===

/**
 * Convierte una clave VAPID en formato URL-safe Base64 a un Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convierte un ArrayBuffer a una cadena Base64.
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
