'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useRealtimeChannel, EstadoCanal } from './useRealtimeChannel';

/**
 * Payload de una notificación de usuario.
 */
export interface NotificacionUsuarioPayload {
  titulo: string;
  cuerpo: string;
  fecha: string;
  tipo?: string;
  data?: Record<string, unknown>;
}

/**
 * Opciones para el hook useNotificacionesUsuario.
 */
export interface UseNotificacionesUsuarioOptions {
  /** ID del usuario */
  userId: string;
  /** Callback al recibir una notificación */
  onNotificacion?: (notificacion: NotificacionUsuarioPayload) => void;
  /** Si el hook está activo */
  enabled?: boolean;
}

/**
 * Resultado del hook useNotificacionesUsuario.
 */
export interface UseNotificacionesUsuarioResult {
  /** Estado de conexión al canal */
  estado: EstadoCanal;
  /** Notificaciones recibidas en esta sesión (buffer últimas 50) */
  notificaciones: NotificacionUsuarioPayload[];
  /** Número de notificaciones no leídas */
  sinLeer: number;
  /** Marcar todas como leídas (localmente) */
  marcarTodasLeidas: () => void;
}

/**
 * Hook para escuchar notificaciones personales del usuario.
 * Canal: `notificaciones:{userId}`
 *
 * Escucha las notificaciones in-app enviadas como fallback
 * cuando push notifications no están disponibles.
 * También recibe notificaciones push que se envían simultáneamente
 * al canal del usuario.
 *
 * @example
 * ```tsx
 * const { notificaciones, sinLeer } = useNotificacionesUsuario({
 *   userId: 'user-abc123',
 *   onNotificacion: (n) => showToast(n.titulo, n.cuerpo),
 * });
 * ```
 *
 * Requirement: 19.5
 */
export function useNotificacionesUsuario(
  options: UseNotificacionesUsuarioOptions
): UseNotificacionesUsuarioResult {
  const { userId, onNotificacion, enabled = true } = options;

  const [notificaciones, setNotificaciones] = useState<NotificacionUsuarioPayload[]>([]);
  const [sinLeer, setSinLeer] = useState(0);
  const onNotificacionRef = useRef(onNotificacion);

  useEffect(() => {
    onNotificacionRef.current = onNotificacion;
  }, [onNotificacion]);

  const handleNotificacion = useCallback((payload: unknown) => {
    const data = (payload as { payload?: NotificacionUsuarioPayload })?.payload as NotificacionUsuarioPayload | undefined;
    if (!data) return;

    setNotificaciones((prev) => [data, ...prev].slice(0, 50));
    setSinLeer((prev) => prev + 1);
    onNotificacionRef.current?.(data);
  }, []);

  const { estado } = useRealtimeChannel({
    canal: `notificaciones:${userId}`,
    evento: 'push',
    onMensaje: handleNotificacion,
    enabled: enabled && !!userId,
  });

  const marcarTodasLeidas = useCallback(() => {
    setSinLeer(0);
  }, []);

  return {
    estado,
    notificaciones,
    sinLeer,
    marcarTodasLeidas,
  };
}
