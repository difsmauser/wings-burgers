'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  supabaseClient,
  REALTIME_CHANNELS,
} from '@/adapters/driven/persistence/supabase/SupabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ========== Types ==========

type EstadoPedidoActivo =
  | 'recibido'
  | 'en_preparacion'
  | 'empacado'
  | 'en_camino';

interface PedidoPanel {
  id: string;
  numero: string;
  clienteNombre: string;
  modalidad: 'local' | 'domicilio';
  estado: EstadoPedidoActivo;
  items: { nombre: string; cantidad: number }[];
  total: number;
  creadoEn: string;
}

interface AlertaNuevoPedido {
  id: string;
  pedidoNumero: string;
  timestamp: number;
}

// ========== Constants ==========

/** Configuración de estados con etiqueta y color para el panel */
const ESTADOS_CONFIG: Record<
  EstadoPedidoActivo,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  recibido: {
    label: 'Recibido',
    color: 'text-fire-800',
    bgColor: 'bg-fire-50',
    borderColor: 'border-fire-300',
  },
  en_preparacion: {
    label: 'En Preparación',
    color: 'text-golden-800',
    bgColor: 'bg-golden-50',
    borderColor: 'border-golden-300',
  },
  empacado: {
    label: 'Empacado',
    color: 'text-brand-800',
    bgColor: 'bg-brand-50',
    borderColor: 'border-brand-300',
  },
  en_camino: {
    label: 'En Camino',
    color: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
  },
};

/** Máximo tiempo que persiste la alerta de nuevo pedido (5 min) */
const ALERTA_TIMEOUT_MS = 5 * 60 * 1000;

// ========== Component ==========

export default function PedidosPanel() {
  const [pedidos, setPedidos] = useState<PedidoPanel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertas, setAlertas] = useState<AlertaNuevoPedido[]>([]);
  const [conexionActiva, setConexionActiva] = useState(true);

  // Audio ref for notification sound
  const audioContextRef = useRef<AudioContext | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const alertaTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ========== Cargar pedidos activos ==========
  const cargarPedidos = useCallback(async () => {
    try {
      const estados: EstadoPedidoActivo[] = [
        'recibido',
        'en_preparacion',
        'empacado',
        'en_camino',
      ];

      const results = await Promise.all(
        estados.map(async (estado) => {
          const res = await fetch(`/api/pedidos?estado=${estado}`);
          if (!res.ok) return [];
          const json = await res.json();
          return (json.data || []).map((p: Record<string, unknown>) => ({
            ...p,
            estado,
          }));
        })
      );

      const todosPedidos = results.flat() as PedidoPanel[];
      setPedidos(todosPedidos);
      setError(null);
    } catch {
      setError('Error al cargar pedidos activos');
    } finally {
      setCargando(false);
    }
  }, []);

  // ========== Sound notification using Web Audio API ==========
  const reproducirSonidoNotificacion = useCallback(() => {
    try {
      // Create AudioContext on first use (browser requirement)
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Generate a pleasant notification tone (two-tone chime)
      const now = ctx.currentTime;

      // First tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Second tone (higher pitch, slight delay)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.15); // D6
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } catch {
      // Audio not available - fail silently
    }
  }, []);

  // ========== Manage alert persistence (max 5 min) ==========
  const agregarAlerta = useCallback(
    (pedidoId: string, pedidoNumero: string) => {
      const alerta: AlertaNuevoPedido = {
        id: pedidoId,
        pedidoNumero,
        timestamp: Date.now(),
      };

      setAlertas((prev) => {
        // Don't add duplicate alerts
        if (prev.find((a) => a.id === pedidoId)) return prev;
        return [...prev, alerta];
      });

      // Auto-dismiss after 5 minutes
      const timer = setTimeout(() => {
        setAlertas((prev) => prev.filter((a) => a.id !== pedidoId));
        alertaTimersRef.current.delete(pedidoId);
      }, ALERTA_TIMEOUT_MS);

      alertaTimersRef.current.set(pedidoId, timer);
    },
    []
  );

  const reconocerAlerta = useCallback((pedidoId: string) => {
    setAlertas((prev) => prev.filter((a) => a.id !== pedidoId));
    const timer = alertaTimersRef.current.get(pedidoId);
    if (timer) {
      clearTimeout(timer);
      alertaTimersRef.current.delete(pedidoId);
    }
  }, []);

  const reconocerTodasAlertas = useCallback(() => {
    setAlertas([]);
    alertaTimersRef.current.forEach((timer) => clearTimeout(timer));
    alertaTimersRef.current.clear();
  }, []);

  // ========== Subscribe to Supabase Realtime ==========
  useEffect(() => {
    cargarPedidos();

    // Subscribe to the vendedor orders channel
    const channel = supabaseClient
      .channel(REALTIME_CHANNELS.PEDIDOS_VENDEDOR)
      .on('broadcast', { event: 'nuevo_pedido' }, (payload) => {
        const data = payload.payload as {
          pedidoId?: string;
          numero?: string;
          clienteId?: string;
          modalidad?: 'local' | 'domicilio';
          items?: { nombre: string; cantidad: number }[];
          total?: number;
          creadoEn?: string;
        };

        if (data.pedidoId && data.numero) {
          // Add new order to the list
          const nuevoPedido: PedidoPanel = {
            id: data.pedidoId,
            numero: data.numero,
            clienteNombre: 'Cliente',
            modalidad: data.modalidad || 'local',
            estado: 'recibido',
            items: data.items || [],
            total: data.total || 0,
            creadoEn: data.creadoEn || new Date().toISOString(),
          };

          setPedidos((prev) => {
            // Avoid duplicates
            if (prev.find((p) => p.id === nuevoPedido.id)) return prev;
            return [nuevoPedido, ...prev];
          });

          // Trigger sound and visual alert
          reproducirSonidoNotificacion();
          agregarAlerta(data.pedidoId, data.numero);
        }
      })
      .on('broadcast', { event: 'cambio_estado' }, (payload) => {
        const data = payload.payload as {
          pedidoId?: string;
          nuevoEstado?: string;
        };

        if (data.pedidoId && data.nuevoEstado) {
          const estadosActivos: string[] = [
            'recibido',
            'en_preparacion',
            'empacado',
            'en_camino',
          ];

          if (estadosActivos.includes(data.nuevoEstado)) {
            // Update order state
            setPedidos((prev) =>
              prev.map((p) =>
                p.id === data.pedidoId
                  ? { ...p, estado: data.nuevoEstado as EstadoPedidoActivo }
                  : p
              )
            );
          } else {
            // Order is no longer active (entregado, servido, etc.) - remove it
            setPedidos((prev) => prev.filter((p) => p.id !== data.pedidoId));
          }
        }
      })
      .subscribe((status) => {
        setConexionActiva(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
      }
      alertaTimersRef.current.forEach((timer) => clearTimeout(timer));
      alertaTimersRef.current.clear();
    };
  }, [cargarPedidos, reproducirSonidoNotificacion, agregarAlerta]);

  // ========== Group orders by state ==========
  const pedidosPorEstado = (
    Object.keys(ESTADOS_CONFIG) as EstadoPedidoActivo[]
  ).reduce(
    (acc, estado) => {
      acc[estado] = pedidos.filter((p) => p.estado === estado);
      return acc;
    },
    {} as Record<EstadoPedidoActivo, PedidoPanel[]>
  );

  // ========== Format time ==========
  const formatTiempo = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  // ========== Render ==========
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-wood-800">Panel de Pedidos</h2>
          {/* Connection status indicator */}
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              conexionActiva
                ? 'bg-green-100 text-green-800'
                : 'bg-fire-100 text-fire-800'
            }`}
            aria-label={conexionActiva ? 'Conectado en tiempo real' : 'Desconectado'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                conexionActiva ? 'bg-green-500 animate-pulse' : 'bg-fire-500'
              }`}
            />
            {conexionActiva ? 'En vivo' : 'Desconectado'}
          </span>
        </div>
        <Link
          href="/pedidos/nuevo"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Nuevo Pedido
        </Link>
      </div>

      {/* New Order Alert Banner */}
      {alertas.length > 0 && (
        <div
          className="mb-6 p-4 rounded-xl bg-fire-100 border-2 border-fire-400 shadow-lg animate-pulse"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-fire-500 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <div>
                <p className="font-bold text-fire-900">
                  {alertas.length === 1
                    ? `Nuevo pedido #${alertas[0].pedidoNumero}`
                    : `${alertas.length} nuevos pedidos`}
                </p>
                <p className="text-sm text-fire-700">
                  {alertas.length === 1
                    ? 'Toca para reconocer'
                    : alertas.map((a) => `#${a.pedidoNumero}`).join(', ')}
                </p>
              </div>
            </div>
            <button
              onClick={reconocerTodasAlertas}
              className="px-4 py-2 bg-fire-600 text-white rounded-lg text-sm font-medium hover:bg-fire-700 transition-colors"
              aria-label="Reconocer todas las alertas de nuevos pedidos"
            >
              Reconocer
            </button>
          </div>

          {/* Individual alerts if multiple */}
          {alertas.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {alertas.map((alerta) => (
                <button
                  key={alerta.id}
                  onClick={() => reconocerAlerta(alerta.id)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs font-medium text-fire-800 border border-fire-300 hover:bg-fire-50 transition-colors"
                  aria-label={`Reconocer pedido #${alerta.pedidoNumero}`}
                >
                  #{alerta.pedidoNumero}
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="mb-6 p-3 rounded-lg bg-fire-50 border border-fire-300 text-fire-800 text-sm flex items-center gap-2"
          role="alert"
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span>{error}</span>
          <button
            onClick={() => {
              setError(null);
              cargarPedidos();
            }}
            className="ml-auto px-3 py-1 bg-fire-100 text-fire-800 rounded text-xs font-medium hover:bg-fire-200 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading state */}
      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <svg
              className="animate-spin h-8 w-8 text-brand-600 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-wood-500 text-sm">Cargando pedidos...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Orders summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {(Object.keys(ESTADOS_CONFIG) as EstadoPedidoActivo[]).map(
              (estado) => {
                const config = ESTADOS_CONFIG[estado];
                const count = pedidosPorEstado[estado].length;
                return (
                  <div
                    key={estado}
                    className={`p-3 rounded-xl border ${config.borderColor} ${config.bgColor}`}
                  >
                    <p className={`text-xs font-medium ${config.color} opacity-75`}>
                      {config.label}
                    </p>
                    <p className={`text-2xl font-bold ${config.color}`}>
                      {count}
                    </p>
                  </div>
                );
              }
            )}
          </div>

          {/* Orders grouped by state */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {(Object.keys(ESTADOS_CONFIG) as EstadoPedidoActivo[]).map(
              (estado) => {
                const config = ESTADOS_CONFIG[estado];
                const pedidosEnEstado = pedidosPorEstado[estado];

                return (
                  <div key={estado} className="flex flex-col">
                    {/* Column header */}
                    <div
                      className={`px-4 py-2 rounded-t-xl border ${config.borderColor} ${config.bgColor}`}
                    >
                      <div className="flex items-center justify-between">
                        <h3
                          className={`text-sm font-bold ${config.color}`}
                        >
                          {config.label}
                        </h3>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}
                        >
                          {pedidosEnEstado.length}
                        </span>
                      </div>
                    </div>

                    {/* Column content */}
                    <div className="flex-1 bg-white rounded-b-xl border border-t-0 border-wood-200 p-2 space-y-2 min-h-[200px]">
                      {pedidosEnEstado.length === 0 ? (
                        <div className="flex items-center justify-center h-full min-h-[180px]">
                          <p className="text-xs text-wood-400">
                            Sin pedidos
                          </p>
                        </div>
                      ) : (
                        pedidosEnEstado.map((pedido) => (
                          <PedidoCard
                            key={pedido.id}
                            pedido={pedido}
                            formatTiempo={formatTiempo}
                            esNuevo={alertas.some(
                              (a) => a.id === pedido.id
                            )}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Empty state */}
          {pedidos.length === 0 && !error && (
            <div className="mt-8 bg-white rounded-xl border border-wood-200 p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <p className="text-wood-600 text-sm mb-4">
                No hay pedidos activos en este momento
              </p>
              <Link
                href="/pedidos/nuevo"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Crear nuevo pedido
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ========== Pedido Card Component ==========

function PedidoCard({
  pedido,
  formatTiempo,
  esNuevo,
}: {
  pedido: PedidoPanel;
  formatTiempo: (iso: string) => string;
  esNuevo: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        esNuevo
          ? 'border-fire-400 bg-fire-50 shadow-md ring-2 ring-fire-200'
          : 'border-wood-200 bg-white hover:shadow-sm'
      }`}
    >
      {/* Order header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-wood-800">
          #{pedido.numero}
        </span>
        <span className="text-xs text-wood-500">
          {formatTiempo(pedido.creadoEn)}
        </span>
      </div>

      {/* Client and modality */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-wood-600 truncate">
          {pedido.clienteNombre}
        </span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            pedido.modalidad === 'domicilio'
              ? 'bg-brand-100 text-brand-800'
              : 'bg-wood-100 text-wood-700'
          }`}
        >
          {pedido.modalidad === 'domicilio' ? 'Domicilio' : 'Local'}
        </span>
      </div>

      {/* Items summary */}
      <div className="mb-2">
        {pedido.items.slice(0, 3).map((item, idx) => (
          <p key={idx} className="text-xs text-wood-600 truncate">
            {item.cantidad}x {item.nombre}
          </p>
        ))}
        {pedido.items.length > 3 && (
          <p className="text-xs text-wood-400">
            +{pedido.items.length - 3} más
          </p>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-2 border-t border-wood-100">
        <span className="text-xs text-wood-500">Total</span>
        <span className="text-sm font-bold text-brand-700">
          ${pedido.total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
