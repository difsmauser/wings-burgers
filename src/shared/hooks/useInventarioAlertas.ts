'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useRealtimeChannel, EstadoCanal } from './useRealtimeChannel';

/**
 * Payload de una alerta de inventario bajo.
 */
export interface InventarioBajoPayload {
  articuloId: string;
  nombre: string;
  cantidadActual: number;
  nivelMinimo: number;
  fecha: string;
}

/**
 * Opciones para el hook useInventarioAlertas.
 */
export interface UseInventarioAlertasOptions {
  /** Callback al recibir una alerta de inventario bajo */
  onAlerta?: (alerta: InventarioBajoPayload) => void;
  /** Si el hook está activo */
  enabled?: boolean;
}

/**
 * Resultado del hook useInventarioAlertas.
 */
export interface UseInventarioAlertasResult {
  /** Estado de conexión al canal */
  estado: EstadoCanal;
  /** Lista de alertas activas (buffer últimas 20) */
  alertas: InventarioBajoPayload[];
  /** Limpiar alertas */
  limpiarAlertas: () => void;
  /** Número de alertas no reconocidas */
  conteoAlertas: number;
}

/**
 * Hook para escuchar alertas de inventario bajo.
 * Canal: `inventario:alertas`
 *
 * Usado por el módulo admin para recibir notificaciones
 * cuando un artículo de inventario cae por debajo de su nivel mínimo.
 *
 * @example
 * ```tsx
 * const { alertas, conteoAlertas } = useInventarioAlertas({
 *   onAlerta: (alerta) => toast.warn(`${alerta.nombre} bajo: ${alerta.cantidadActual}`),
 * });
 * ```
 *
 * Requirement: 19.4
 */
export function useInventarioAlertas(
  options: UseInventarioAlertasOptions = {}
): UseInventarioAlertasResult {
  const { onAlerta, enabled = true } = options;

  const [alertas, setAlertas] = useState<InventarioBajoPayload[]>([]);
  const onAlertaRef = useRef(onAlerta);

  useEffect(() => {
    onAlertaRef.current = onAlerta;
  }, [onAlerta]);

  const handleAlerta = useCallback((payload: unknown) => {
    const data = (payload as { payload?: InventarioBajoPayload })?.payload as InventarioBajoPayload | undefined;
    if (!data) return;

    setAlertas((prev) => [data, ...prev].slice(0, 20));
    onAlertaRef.current?.(data);
  }, []);

  const { estado } = useRealtimeChannel({
    canal: 'inventario:alertas',
    evento: 'inventario_bajo',
    onMensaje: handleAlerta,
    enabled,
  });

  const limpiarAlertas = useCallback(() => {
    setAlertas([]);
  }, []);

  return {
    estado,
    alertas,
    limpiarAlertas,
    conteoAlertas: alertas.length,
  };
}
