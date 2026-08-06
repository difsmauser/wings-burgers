'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Tipo de notificación toast para estilos visuales.
 */
export type ToastTipo = 'info' | 'success' | 'warning' | 'error' | 'pedido';

/**
 * Datos de un toast individual.
 */
export interface ToastData {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: ToastTipo;
  duracion?: number; // ms, default 5000
  persistente?: boolean; // no auto-dismiss
  timestamp: Date;
}

/**
 * Props del componente NotificationToast.
 */
interface NotificationToastProps {
  /** Lista de toasts a mostrar */
  toasts: ToastData[];
  /** Callback al cerrar un toast */
  onClose: (id: string) => void;
  /** Posición del toast (default: 'top-right') */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  /** Máximo de toasts visibles simultáneamente (default: 5) */
  maxVisible?: number;
}

/**
 * Componente de notificaciones toast/banner para notificaciones in-app.
 *
 * Muestra notificaciones apiladas con animación de entrada/salida.
 * Los toasts no persistentes se auto-descartan después de su duración.
 *
 * Tipos soportados:
 * - `info`: Información general (azul)
 * - `success`: Éxito (verde)
 * - `warning`: Advertencia (amarillo/naranja)
 * - `error`: Error (rojo)
 * - `pedido`: Nuevo pedido (naranja vibrante, con icono de campana)
 *
 * Requirements: 19.1, 19.2, 19.4, 19.5
 */
export function NotificationToast({
  toasts,
  onClose,
  position = 'top-right',
  maxVisible = 5,
}: NotificationToastProps) {
  const visibleToasts = toasts.slice(0, maxVisible);

  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 ${positionClasses[position]}`}
      aria-live="polite"
      aria-label="Notificaciones"
    >
      {visibleToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

/**
 * Componente individual de toast con auto-dismiss y animación.
 */
function ToastItem({ toast, onClose }: { toast: ToastData; onClose: (id: string) => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (toast.persistente) return;

    const duracion = toast.duracion ?? 5000;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, duracion);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose(toast.id), 300);
  }, [toast.id, onClose]);

  const tipoClasses: Record<ToastTipo, string> = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-green-200 bg-green-50 text-green-900',
    warning: 'border-orange-200 bg-orange-50 text-orange-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    pedido: 'border-orange-300 bg-orange-100 text-orange-900',
  };

  const iconos: Record<ToastTipo, string> = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '✕',
    pedido: '🔔',
  };

  return (
    <div
      role="alert"
      className={`w-80 max-w-sm rounded-lg border p-3 shadow-lg transition-all duration-300 ${
        tipoClasses[toast.tipo]
      } ${visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
    >
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 text-lg" aria-hidden="true">
          {iconos[toast.tipo]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{toast.titulo}</p>
          {toast.mensaje && (
            <p className="mt-0.5 text-xs opacity-80 line-clamp-2">{toast.mensaje}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 rounded p-0.5 text-current opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-current"
          aria-label="Cerrar notificación"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>
      {toast.persistente && (
        <p className="mt-1 text-xs opacity-60 italic">
          Toca para descartar
        </p>
      )}
    </div>
  );
}

// === Hook helper para gestionar toasts ===

/**
 * Hook para gestionar una cola de toasts.
 * Provee métodos para agregar y eliminar toasts programáticamente.
 *
 * @example
 * ```tsx
 * const { toasts, agregarToast, cerrarToast } = useNotificationToasts();
 *
 * agregarToast({ titulo: 'Nuevo pedido', mensaje: 'Pedido #123', tipo: 'pedido' });
 *
 * return <NotificationToast toasts={toasts} onClose={cerrarToast} />;
 * ```
 */
export function useNotificationToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const agregarToast = useCallback(
    (data: Omit<ToastData, 'id' | 'timestamp'>) => {
      const newToast: ToastData = {
        ...data,
        id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date(),
      };
      setToasts((prev) => [newToast, ...prev]);
      return newToast.id;
    },
    []
  );

  const cerrarToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const limpiarToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    agregarToast,
    cerrarToast,
    limpiarToasts,
  };
}
