'use client';

import { useEffect, useState } from 'react';
import { usePWA } from '@/shared/hooks/usePWA';

/**
 * PWA Provider component that handles service worker lifecycle
 * and optionally shows a push notification permission prompt.
 *
 * Place this in the root layout to initialize PWA features globally.
 *
 * Features:
 * - Detects app updates and shows a reload prompt
 * - Shows an install banner for eligible devices
 * - Provides push notification permission prompt (non-intrusive)
 *
 * Requirements: 19.2, 19.5, 12.4
 */
export function PWAProvider({ children }: { children: React.ReactNode }) {
  const {
    isSupported,
    isReady,
    notificationPermission,
    isPushSubscribed,
    requestPushPermission,
  } = usePWA();

  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Show push permission prompt after a delay (non-intrusive UX)
  useEffect(() => {
    if (!isSupported || !isReady) return;
    if (notificationPermission !== 'default') return;
    if (isPushSubscribed) return;

    // Wait 30 seconds after first interaction before showing prompt
    const timer = setTimeout(() => {
      setShowPushPrompt(true);
    }, 30_000);

    return () => clearTimeout(timer);
  }, [isSupported, isReady, notificationPermission, isPushSubscribed]);

  // Listen for service worker updates
  useEffect(() => {
    if (!isSupported) return;

    const handleControllerChange = () => {
      setUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [isSupported]);

  const handleAcceptPush = async () => {
    setShowPushPrompt(false);
    await requestPushPermission();
  };

  const handleDismissPush = () => {
    setShowPushPrompt(false);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <>
      {children}

      {/* Push notification permission prompt */}
      {showPushPrompt && (
        <div
          role="dialog"
          aria-label="Activar notificaciones"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg border border-orange-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl" aria-hidden="true">
              🔔
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Activar notificaciones
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Recibe alertas sobre el estado de tu pedido en tiempo real.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAcceptPush}
                  className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Activar
                </button>
                <button
                  onClick={handleDismissPush}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Ahora no
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App update available banner */}
      {updateAvailable && (
        <div
          role="alert"
          className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Nueva versión disponible
              </p>
            </div>
            <button
              onClick={handleReload}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Actualizar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
