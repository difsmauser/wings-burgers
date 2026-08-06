'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useRealtimeChannel, EstadoCanal } from './useRealtimeChannel';

/**
 * Payload de un nuevo pedido recibido por el vendedor.
 */
export interface NuevoPedidoPayload {
  pedidoId: string;
  numero: string;
  clienteId: string;
  items: unknown[];
  modalidad: string;
  total: number;
  mesaZona: string | null;
  origenQr: boolean;
  creadoEn: string;
  sonido: boolean;
  persistente: boolean;
}

/**
 * Opciones para el hook useVendedorNotifications.
 */
export interface UseVendedorNotificationsOptions {
  /** Callback al recibir un nuevo pedido */
  onNuevoPedido?: (pedido: NuevoPedidoPayload) => void;
  /** Si se debe reproducir sonido al recibir pedido (default: true) */
  sonidoHabilitado?: boolean;
  /** URL del archivo de sonido (default: '/sounds/new-order.mp3') */
  sonidoUrl?: string;
  /** Si el hook está activo */
  enabled?: boolean;
}

/**
 * Resultado del hook useVendedorNotifications.
 */
export interface UseVendedorNotificationsResult {
  /** Estado de conexión al canal */
  estado: EstadoCanal;
  /** Últimos pedidos recibidos (buffer de los últimos 10) */
  pedidosRecientes: NuevoPedidoPayload[];
  /** Limpiar la lista de pedidos recientes */
  limpiarPedidos: () => void;
  /** Silenciar/activar sonido */
  toggleSonido: () => void;
  /** Si el sonido está activo */
  sonidoActivo: boolean;
}

/**
 * Hook para notificaciones del vendedor.
 * Escucha el canal `pedidos:vendedor` para nuevos pedidos.
 *
 * Features:
 * - Alerta sonora al recibir un nuevo pedido (Req 19.1)
 * - Buffer de pedidos recientes (últimos 10)
 * - Reconexión automática (max 5 reintentos, 10s intervalo)
 * - Toggle de sonido
 *
 * @example
 * ```tsx
 * const { estado, pedidosRecientes } = useVendedorNotifications({
 *   onNuevoPedido: (pedido) => toast(`Nuevo pedido #${pedido.numero}`),
 * });
 * ```
 *
 * Requirement: 19.1
 */
export function useVendedorNotifications(
  options: UseVendedorNotificationsOptions = {}
): UseVendedorNotificationsResult {
  const {
    onNuevoPedido,
    sonidoHabilitado = true,
    sonidoUrl = '/sounds/new-order.mp3',
    enabled = true,
  } = options;

  const [pedidosRecientes, setPedidosRecientes] = useState<NuevoPedidoPayload[]>([]);
  const [sonidoActivo, setSonidoActivo] = useState(sonidoHabilitado);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onNuevoPedidoRef = useRef(onNuevoPedido);

  useEffect(() => {
    onNuevoPedidoRef.current = onNuevoPedido;
  }, [onNuevoPedido]);

  // Initialize audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;
    audioRef.current = new Audio(sonidoUrl);
    audioRef.current.preload = 'auto';

    return () => {
      audioRef.current = null;
    };
  }, [sonidoUrl]);

  const handleNuevoPedido = useCallback(
    (payload: unknown) => {
      const data = (payload as { payload?: NuevoPedidoPayload })?.payload as NuevoPedidoPayload | undefined;
      if (!data) return;

      // Play notification sound
      if (sonidoActivo && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // Autoplay may be blocked; ignore
        });
      }

      // Add to recent orders buffer (max 10)
      setPedidosRecientes((prev) => [data, ...prev].slice(0, 10));

      // Call user callback
      onNuevoPedidoRef.current?.(data);
    },
    [sonidoActivo]
  );

  const { estado } = useRealtimeChannel({
    canal: 'pedidos:vendedor',
    evento: 'nuevo_pedido',
    onMensaje: handleNuevoPedido,
    enabled,
  });

  const limpiarPedidos = useCallback(() => {
    setPedidosRecientes([]);
  }, []);

  const toggleSonido = useCallback(() => {
    setSonidoActivo((prev) => !prev);
  }, []);

  return {
    estado,
    pedidosRecientes,
    limpiarPedidos,
    toggleSonido,
    sonidoActivo,
  };
}
