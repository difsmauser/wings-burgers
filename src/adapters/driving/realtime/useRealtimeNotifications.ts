'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabaseClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';
import { NotificationManager, TipoNotificacion, EstadoConexion } from './NotificationManager';

/**
 * Opciones de configuración para el hook de notificaciones.
 */
interface UseRealtimeNotificationsOptions {
  /** ID del usuario actual */
  userId?: string;
  /** Rol del usuario (determina canales a suscribir) */
  rol?: 'admin' | 'vendedor' | 'cliente' | 'repartidor';
  /** ID del pedido a rastrear (para cliente) */
  pedidoId?: string;
  /** Callback cuando llega una notificación */
  onNotificacion?: (tipo: TipoNotificacion, payload: unknown) => void;
  /** Callback cuando cambia el estado de conexión */
  onEstadoCambia?: (estado: EstadoConexion) => void;
  /** Si se debe suscribir automáticamente */
  enabled?: boolean;
}

/**
 * Resultado del hook de notificaciones en tiempo real.
 */
interface UseRealtimeNotificationsResult {
  /** Estado actual de la conexión */
  estadoConexion: EstadoConexion;
  /** Lista de canales activos */
  canalesActivos: string[];
  /** Desconectar manualmente */
  desconectar: () => void;
  /** Reconectar manualmente */
  reconectar: () => void;
}

/**
 * Hook de React para gestionar notificaciones en tiempo real.
 *
 * Suscribe automáticamente a los canales apropiados según el rol del usuario:
 * - Vendedor: pedidos:vendedor (nuevos pedidos con sonido)
 * - Cliente: pedido:estado:{id}, ubicacion:{id}
 * - Admin: inventario:alertas, notificaciones:{userId}
 * - Repartidor: repartidor (entregas disponibles), notificaciones:{userId}
 *
 * Incluye reconexión automática (max 5 reintentos, 10s intervalo).
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 12.4
 */
export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions
): UseRealtimeNotificationsResult {
  const {
    userId,
    rol,
    pedidoId,
    onNotificacion,
    onEstadoCambia,
    enabled = true,
  } = options;

  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>('desconectado');
  const [canalesActivos, setCanalesActivos] = useState<string[]>([]);
  const managerRef = useRef<NotificationManager | null>(null);

  // Inicializar el NotificationManager
  const getManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = new NotificationManager(supabaseClient, {
        maxReintentos: 5,
        intervaloMs: 10_000,
      });
    }
    return managerRef.current;
  }, []);

  // Suscribirse a los canales según el rol
  useEffect(() => {
    if (!enabled || !rol) return;

    const manager = getManager();

    // Registrar callback de notificación
    let unsubNotificacion: (() => void) | undefined;
    if (onNotificacion) {
      unsubNotificacion = manager.onNotificacion(onNotificacion);
    }

    // Registrar callback de estado
    manager.onEstadoConexion((estado) => {
      setEstadoConexion(estado);
      onEstadoCambia?.(estado);
    });

    // Suscribir según rol
    switch (rol) {
      case 'vendedor':
        manager.suscribirPedidosVendedor();
        if (userId) {
          manager.suscribirNotificacionesUsuario(userId);
        }
        break;

      case 'cliente':
        if (pedidoId) {
          manager.suscribirEstadoPedido(pedidoId);
          manager.suscribirUbicacionRepartidor(pedidoId);
        }
        if (userId) {
          manager.suscribirNotificacionesUsuario(userId);
        }
        break;

      case 'admin':
        manager.suscribirInventarioAlertas();
        if (userId) {
          manager.suscribirNotificacionesUsuario(userId);
        }
        break;

      case 'repartidor':
        manager.suscribirEntregasDisponibles();
        if (userId) {
          manager.suscribirNotificacionesUsuario(userId);
        }
        break;
    }

    setEstadoConexion('conectado');
    setCanalesActivos(manager.getCanalesActivos());

    // Cleanup al desmontar
    return () => {
      unsubNotificacion?.();
      manager.desconectar();
      setEstadoConexion('desconectado');
      setCanalesActivos([]);
      managerRef.current = null;
    };
  }, [enabled, rol, userId, pedidoId, getManager, onNotificacion, onEstadoCambia]);

  const desconectar = useCallback(() => {
    managerRef.current?.desconectar();
    setEstadoConexion('desconectado');
    setCanalesActivos([]);
  }, []);

  const reconectar = useCallback(() => {
    // Desconectar y reconectar creando un nuevo manager
    managerRef.current?.desconectar();
    managerRef.current = null;
    // El useEffect se volverá a ejecutar con las dependencias
  }, []);

  return {
    estadoConexion,
    canalesActivos,
    desconectar,
    reconectar,
  };
}
