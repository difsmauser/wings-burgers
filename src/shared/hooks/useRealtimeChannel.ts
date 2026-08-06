'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabaseClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';
import { RealtimeChannelManager, ReconexionConfig } from '@/adapters/driven/notification/RealtimeChannelManager';

/**
 * Estado de conexión del canal Realtime.
 */
export type EstadoCanal = 'conectado' | 'reconectando' | 'desconectado' | 'error';

/**
 * Opciones para el hook useRealtimeChannel.
 */
export interface UseRealtimeChannelOptions {
  /** Nombre del canal (ej: 'pedidos:vendedor', 'pedido:estado:abc123') */
  canal: string;
  /** Evento a escuchar (ej: 'nuevo_pedido', 'cambio_estado') */
  evento: string;
  /** Callback cuando llega un mensaje en el canal */
  onMensaje: (payload: unknown) => void;
  /** Si el hook debe estar activo (default: true) */
  enabled?: boolean;
  /** Configuración personalizada de reconexión */
  reconexionConfig?: Partial<ReconexionConfig>;
}

/**
 * Resultado del hook useRealtimeChannel.
 */
export interface UseRealtimeChannelResult {
  /** Estado actual del canal */
  estado: EstadoCanal;
  /** Número de reintentos de reconexión realizados */
  reintentos: number;
  /** Desconectar manualmente del canal */
  desconectar: () => void;
  /** Reconectar manualmente al canal */
  reconectar: () => void;
}

/**
 * Hook genérico para suscribirse a un canal de Supabase Realtime.
 *
 * Features:
 * - Suscripción a canales broadcast de Supabase Realtime
 * - Reconexión automática (max 5 reintentos, 10s intervalo)
 * - Manejo de errores de canal
 * - Cleanup automático al desmontar
 *
 * @example
 * ```tsx
 * const { estado } = useRealtimeChannel({
 *   canal: 'pedidos:vendedor',
 *   evento: 'nuevo_pedido',
 *   onMensaje: (payload) => console.log('Nuevo pedido:', payload),
 * });
 * ```
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 12.4
 */
export function useRealtimeChannel(options: UseRealtimeChannelOptions): UseRealtimeChannelResult {
  const { canal, evento, onMensaje, enabled = true, reconexionConfig } = options;

  const [estado, setEstado] = useState<EstadoCanal>('desconectado');
  const [reintentos, setReintentos] = useState(0);
  const managerRef = useRef<RealtimeChannelManager | null>(null);
  const onMensajeRef = useRef(onMensaje);

  // Keep callback ref updated without re-subscribing
  useEffect(() => {
    onMensajeRef.current = onMensaje;
  }, [onMensaje]);

  // Subscribe/unsubscribe based on enabled and canal/evento
  useEffect(() => {
    if (!enabled || !canal || !evento) {
      setEstado('desconectado');
      return;
    }

    const config: Partial<ReconexionConfig> = {
      maxReintentos: 5,
      intervaloMs: 10_000,
      ...reconexionConfig,
      onReconectado: (nombreCanal) => {
        setEstado('conectado');
        setReintentos(0);
        reconexionConfig?.onReconectado?.(nombreCanal);
      },
      onDesconectado: (nombreCanal) => {
        setEstado('reconectando');
        setReintentos((prev) => prev + 1);
        reconexionConfig?.onDesconectado?.(nombreCanal);
      },
      onFalloDefinitivo: (nombreCanal) => {
        setEstado('error');
        reconexionConfig?.onFalloDefinitivo?.(nombreCanal);
      },
    };

    const manager = new RealtimeChannelManager(supabaseClient, config);
    managerRef.current = manager;

    manager.suscribir(canal, evento, (payload) => {
      onMensajeRef.current(payload);
    });

    setEstado('conectado');
    setReintentos(0);

    return () => {
      manager.desuscribirTodos();
      managerRef.current = null;
      setEstado('desconectado');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, canal, evento]);

  const desconectar = useCallback(() => {
    managerRef.current?.desuscribirTodos();
    setEstado('desconectado');
  }, []);

  const reconectar = useCallback(() => {
    // Destroy and let useEffect re-create
    if (managerRef.current) {
      managerRef.current.desuscribirTodos();
      managerRef.current = null;
    }
    setReintentos(0);
    // Force re-subscribe by toggling state - the effect will handle it
    setEstado('desconectado');
  }, []);

  return {
    estado,
    reintentos,
    desconectar,
    reconectar,
  };
}
