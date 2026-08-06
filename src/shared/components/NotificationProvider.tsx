'use client';

import { createContext, useContext, useCallback, useMemo } from 'react';
import {
  NotificationToast,
  useNotificationToasts,
  ToastTipo,
  ToastData,
} from './NotificationToast';
import { useNotificacionesUsuario, NotificacionUsuarioPayload } from '@/shared/hooks/useNotificacionesUsuario';
import { EstadoCanal } from '@/shared/hooks/useRealtimeChannel';

/**
 * Contexto de notificaciones disponible en toda la app.
 */
interface NotificationContextValue {
  /** Mostrar un toast de notificación */
  mostrarNotificacion: (opts: {
    titulo: string;
    mensaje: string;
    tipo?: ToastTipo;
    duracion?: number;
    persistente?: boolean;
  }) => string;
  /** Cerrar un toast por ID */
  cerrarNotificacion: (id: string) => void;
  /** Limpiar todos los toasts */
  limpiarTodas: () => void;
  /** Estado de conexión al canal de notificaciones del usuario */
  estadoConexion: EstadoCanal;
  /** Notificaciones recibidas en esta sesión */
  notificaciones: NotificacionUsuarioPayload[];
  /** Número de notificaciones sin leer */
  sinLeer: number;
  /** Marcar todas como leídas */
  marcarTodasLeidas: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Props del NotificationProvider.
 */
interface NotificationProviderProps {
  children: React.ReactNode;
  /** ID del usuario actual (necesario para canal de notificaciones personales) */
  userId?: string;
  /** Si las notificaciones en tiempo real están habilitadas */
  enabled?: boolean;
}

/**
 * Provider que integra el sistema de notificaciones in-app.
 *
 * Funcionalidades:
 * - Suscripción al canal `notificaciones:{userId}` para push/in-app fallback
 * - Gestión de toasts de notificación (agregar, cerrar, limpiar)
 * - Muestra automáticamente toasts para notificaciones in-app recibidas
 * - Contador de notificaciones sin leer
 *
 * Integra:
 * - Push notifications con fallback a notificación in-app (Req 19.5)
 * - Toast/banner para feedback visual inmediato
 *
 * Requirements: 19.2, 19.5
 *
 * @example
 * ```tsx
 * // En el layout raíz:
 * <NotificationProvider userId={user.id}>
 *   {children}
 * </NotificationProvider>
 *
 * // En cualquier componente hijo:
 * const { mostrarNotificacion } = useNotificaciones();
 * mostrarNotificacion({ titulo: 'Éxito', mensaje: 'Pedido creado', tipo: 'success' });
 * ```
 */
export function NotificationProvider({ children, userId, enabled = true }: NotificationProviderProps) {
  const { toasts, agregarToast, cerrarToast, limpiarToasts } = useNotificationToasts();

  // Cuando llega una notificación in-app del canal del usuario, mostrar toast
  const handleNotificacion = useCallback(
    (notificacion: NotificacionUsuarioPayload) => {
      agregarToast({
        titulo: notificacion.titulo,
        mensaje: notificacion.cuerpo,
        tipo: 'info',
        duracion: 6000,
      });
    },
    [agregarToast]
  );

  const { estado, notificaciones, sinLeer, marcarTodasLeidas } = useNotificacionesUsuario({
    userId: userId ?? '',
    onNotificacion: handleNotificacion,
    enabled: enabled && !!userId,
  });

  const mostrarNotificacion = useCallback(
    (opts: {
      titulo: string;
      mensaje: string;
      tipo?: ToastTipo;
      duracion?: number;
      persistente?: boolean;
    }) => {
      return agregarToast({
        titulo: opts.titulo,
        mensaje: opts.mensaje,
        tipo: opts.tipo ?? 'info',
        duracion: opts.duracion,
        persistente: opts.persistente,
      });
    },
    [agregarToast]
  );

  const value: NotificationContextValue = useMemo(
    () => ({
      mostrarNotificacion,
      cerrarNotificacion: cerrarToast,
      limpiarTodas: limpiarToasts,
      estadoConexion: estado,
      notificaciones,
      sinLeer,
      marcarTodasLeidas,
    }),
    [mostrarNotificacion, cerrarToast, limpiarToasts, estado, notificaciones, sinLeer, marcarTodasLeidas]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToast toasts={toasts} onClose={cerrarToast} position="top-right" maxVisible={5} />
    </NotificationContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de notificaciones.
 * Debe usarse dentro de un `NotificationProvider`.
 *
 * @throws Error si se usa fuera del provider
 */
export function useNotificaciones(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificaciones debe usarse dentro de un NotificationProvider');
  }
  return context;
}
