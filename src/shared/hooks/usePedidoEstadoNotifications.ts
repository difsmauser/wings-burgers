'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useRealtimeChannel, EstadoCanal } from './useRealtimeChannel';

/**
 * Payload de un cambio de estado de pedido.
 */
export interface CambioEstadoPayload {
  pedidoId: string;
  nuevoEstado: string;
  fecha: string;
}

/**
 * Opciones para el hook usePedidoEstadoNotifications.
 */
export interface UsePedidoEstadoNotificationsOptions {
  /** ID del pedido a rastrear */
  pedidoId: string;
  /** Callback al recibir un cambio de estado */
  onCambioEstado?: (cambio: CambioEstadoPayload) => void;
  /** Si el hook está activo */
  enabled?: boolean;
}

/**
 * Resultado del hook usePedidoEstadoNotifications.
 */
export interface UsePedidoEstadoNotificationsResult {
  /** Estado de conexión al canal */
  estado: EstadoCanal;
  /** Último estado recibido del pedido */
  ultimoEstado: string | null;
  /** Historial de cambios de estado recibidos */
  historialEstados: CambioEstadoPayload[];
}

/**
 * Hook para escuchar cambios de estado de un pedido específico.
 * Canal: `pedido:estado:{pedidoId}`
 *
 * Usado por el módulo cliente para actualizar la UI de rastreo
 * en tiempo real cuando cambia el estado del pedido.
 *
 * @example
 * ```tsx
 * const { ultimoEstado } = usePedidoEstadoNotifications({
 *   pedidoId: 'abc123',
 *   onCambioEstado: (cambio) => {
 *     toast(`Tu pedido ahora está: ${cambio.nuevoEstado}`);
 *   },
 * });
 * ```
 *
 * Requirement: 19.2
 */
export function usePedidoEstadoNotifications(
  options: UsePedidoEstadoNotificationsOptions
): UsePedidoEstadoNotificationsResult {
  const { pedidoId, onCambioEstado, enabled = true } = options;

  const [ultimoEstado, setUltimoEstado] = useState<string | null>(null);
  const [historialEstados, setHistorialEstados] = useState<CambioEstadoPayload[]>([]);
  const onCambioEstadoRef = useRef(onCambioEstado);

  useEffect(() => {
    onCambioEstadoRef.current = onCambioEstado;
  }, [onCambioEstado]);

  const handleCambioEstado = useCallback((payload: unknown) => {
    const data = (payload as { payload?: CambioEstadoPayload })?.payload as CambioEstadoPayload | undefined;
    if (!data) return;

    setUltimoEstado(data.nuevoEstado);
    setHistorialEstados((prev) => [...prev, data]);

    onCambioEstadoRef.current?.(data);
  }, []);

  const { estado } = useRealtimeChannel({
    canal: `pedido:estado:${pedidoId}`,
    evento: 'cambio_estado',
    onMensaje: handleCambioEstado,
    enabled: enabled && !!pedidoId,
  });

  return {
    estado,
    ultimoEstado,
    historialEstados,
  };
}
