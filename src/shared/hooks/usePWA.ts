'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  requestNotificationPermission,
  registerPushSubscription,
  type NotificationPermissionResult,
  type PushSubscriptionResult,
} from '@/shared/utils/push-notifications';

/**
 * Estado del PWA y notificaciones push.
 */
export interface PWAState {
  /** Si el dispositivo soporta PWA (Service Worker) */
  isSupported: boolean;
  /** Si la app está instalada como PWA */
  isInstalled: boolean;
  /** Si hay un Service Worker activo */
  isReady: boolean;
  /** Estado del permiso de notificaciones */
  notificationPermission: NotificationPermissionResult;
  /** Si la suscripción push está activa */
  isPushSubscribed: boolean;
  /** Si se está cargando alguna operación */
  isLoading: boolean;
  /** Error si ocurrió uno */
  error: string | null;
}

export interface PWAActions {
  /** Solicita permiso de notificaciones y registra suscripción push */
  requestPushPermission: () => Promise<PushSubscriptionResult>;
  /** Reintentar registro de push si falló */
  retryPushRegistration: () => Promise<PushSubscriptionResult>;
}

/**
 * Hook para inicializar y gestionar el PWA y las notificaciones push.
 *
 * Funcionalidades:
 * - Detecta si el dispositivo soporta Service Workers
 * - Detecta si la app está instalada como PWA standalone
 * - Registra el Service Worker al montar
 * - Proporciona métodos para solicitar permisos de push
 * - Registra la suscripción push con el servidor
 *
 * Requirements: 19.2, 19.5, 12.4
 */
export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isSupported: false,
    isInstalled: false,
    isReady: false,
    notificationPermission: 'default',
    isPushSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Initialize PWA state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'serviceWorker' in navigator;
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    const notificationPermission: NotificationPermissionResult =
      'Notification' in window
        ? (Notification.permission as NotificationPermissionResult)
        : 'denied';

    setState((prev) => ({
      ...prev,
      isSupported,
      isInstalled,
      notificationPermission,
      isLoading: false,
    }));

    // Check if service worker is ready
    if (isSupported) {
      navigator.serviceWorker.ready.then((registration) => {
        setState((prev) => ({ ...prev, isReady: true }));

        // Check if already subscribed to push
        registration.pushManager
          .getSubscription()
          .then((subscription) => {
            if (subscription) {
              setState((prev) => ({ ...prev, isPushSubscribed: true }));
            }
          })
          .catch(() => {
            // PushManager not available (e.g., insecure context)
          });
      });
    }
  }, []);

  const requestPushPermission = useCallback(async (): Promise<PushSubscriptionResult> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Request notification permission
      const permission = await requestNotificationPermission();
      setState((prev) => ({ ...prev, notificationPermission: permission }));

      if (permission !== 'granted') {
        const result: PushSubscriptionResult = {
          success: false,
          error: 'Permiso de notificaciones no otorgado',
        };
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error || null,
        }));
        return result;
      }

      // 2. Register push subscription
      const result = await registerPushSubscription();

      setState((prev) => ({
        ...prev,
        isPushSubscribed: result.success,
        isLoading: false,
        error: result.success ? null : (result.error || null),
      }));

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Error desconocido';
      setState((prev) => ({ ...prev, isLoading: false, error }));
      return { success: false, error };
    }
  }, []);

  const retryPushRegistration = useCallback(async (): Promise<PushSubscriptionResult> => {
    return requestPushPermission();
  }, [requestPushPermission]);

  return {
    ...state,
    requestPushPermission,
    retryPushRegistration,
  };
}
