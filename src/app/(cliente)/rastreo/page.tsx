'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  supabaseClient,
  REALTIME_CHANNELS,
  unsubscribeFromChannel,
} from '@/adapters/driven/persistence/supabase/SupabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

type EstadoPedido =
  | 'RECIBIDO'
  | 'EN_PREPARACION'
  | 'EMPACADO'
  | 'SERVIDO'
  | 'EN_CAMINO'
  | 'ENTREGADO';

type Modalidad = 'LOCAL' | 'DOMICILIO';

interface PedidoInfo {
  id: string;
  numero: string;
  estado: EstadoPedido;
  modalidad: Modalidad;
  repartidorNombre?: string;
  tiempoEntrega?: string; // ISO timestamp
  tiempoEstimado?: number; // minutes
}

interface UbicacionRepartidor {
  lat: number;
  lng: number;
  timestamp: number;
}

interface ConnectionState {
  connected: boolean;
  retryCount: number;
  lastKnownState: EstadoPedido | null;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 10_000; // 10 seconds
const GPS_TIMEOUT_MS = 30_000; // 30 seconds for GPS signal loss detection

/**
 * Steps for LOCAL orders: recibido → en_preparación → empacado → servido → entregado
 * Steps for DOMICILIO orders: recibido → en_preparación → empacado → en_camino → entregado
 */
const ESTADOS_LOCAL: EstadoPedido[] = [
  'RECIBIDO',
  'EN_PREPARACION',
  'EMPACADO',
  'SERVIDO',
  'ENTREGADO',
];

const ESTADOS_DOMICILIO: EstadoPedido[] = [
  'RECIBIDO',
  'EN_PREPARACION',
  'EMPACADO',
  'EN_CAMINO',
  'ENTREGADO',
];

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  RECIBIDO: 'Recibido',
  EN_PREPARACION: 'En preparación',
  EMPACADO: 'Empacado',
  SERVIDO: 'Servido',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
};

const ESTADO_ICONS: Record<EstadoPedido, string> = {
  RECIBIDO: '📋',
  EN_PREPARACION: '👨‍🍳',
  EMPACADO: '📦',
  SERVIDO: '🍽️',
  EN_CAMINO: '🛵',
  ENTREGADO: '✅',
};

// ============================================================================
// Dynamic Leaflet Map Component (no SSR)
// ============================================================================

const MapaRastreo = dynamic(() => import('./_components/MapaRastreo'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-80 bg-brand-50 rounded-xl flex items-center justify-center animate-pulse">
      <span className="text-wood-400 text-sm">Cargando mapa...</span>
    </div>
  ),
});

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Step/progress indicator showing sequential order states.
 * Current state highlighted, completed states checked (Req 12.1).
 */
function IndicadorEstado({
  estados,
  estadoActual,
}: {
  estados: EstadoPedido[];
  estadoActual: EstadoPedido;
}) {
  const indexActual = estados.indexOf(estadoActual);

  return (
    <div className="w-full" role="progressbar" aria-valuenow={indexActual + 1} aria-valuemin={1} aria-valuemax={estados.length} aria-label={`Estado del pedido: ${ESTADO_LABELS[estadoActual]}`}>
      <div className="flex items-center justify-between relative">
        {/* Progress line behind steps */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-wood-200 rounded-full mx-6 sm:mx-8" aria-hidden="true" />
        <div
          className="absolute top-5 left-0 h-1 bg-brand-500 rounded-full mx-6 sm:mx-8 transition-all duration-500 motion-reduce:transition-none"
          style={{
            width: indexActual >= estados.length - 1
              ? 'calc(100% - 3rem)'
              : `calc(${(indexActual / (estados.length - 1)) * 100}% - ${indexActual === 0 ? 0 : 0}px)`,
          }}
          aria-hidden="true"
        />

        {estados.map((estado, idx) => {
          const isCompleted = idx < indexActual;
          const isCurrent = idx === indexActual;
          const isFuture = idx > indexActual;

          return (
            <div
              key={estado}
              className="flex flex-col items-center relative z-10"
            >
              {/* Step circle */}
              <div
                className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
                  text-lg sm:text-xl
                  transition-all duration-300 motion-reduce:transition-none
                  ${isCompleted ? 'bg-brand-500 text-white shadow-md shadow-brand-200' : ''}
                  ${isCurrent ? 'bg-brand-500 text-white shadow-lg shadow-brand-300 ring-4 ring-brand-100 scale-110' : ''}
                  ${isFuture ? 'bg-wood-100 text-wood-400 border-2 border-wood-200' : ''}
                `}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span aria-hidden="true">{ESTADO_ICONS[estado]}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  mt-2 text-[10px] sm:text-xs font-medium text-center max-w-[60px] sm:max-w-[80px] leading-tight
                  ${isCurrent ? 'text-brand-700 font-bold' : ''}
                  ${isCompleted ? 'text-brand-600' : ''}
                  ${isFuture ? 'text-wood-400' : ''}
                `}
              >
                {ESTADO_LABELS[estado]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Connection lost banner with retry info (Req 12.4).
 */
function BannerConexionPerdida({
  retryCount,
  maxRetries,
}: {
  retryCount: number;
  maxRetries: number;
}) {
  return (
    <div
      className="bg-fire-50 border border-fire-200 rounded-xl p-4 flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <span className="text-xl flex-shrink-0" aria-hidden="true">⚠️</span>
      <div>
        <p className="text-sm font-semibold text-fire-800">
          Conexión perdida
        </p>
        <p className="text-xs text-fire-600 mt-1">
          Reintentando automáticamente cada 10 segundos ({retryCount}/{maxRetries})
        </p>
        <p className="text-xs text-fire-500 mt-0.5">
          Mostrando el último estado conocido
        </p>
      </div>
    </div>
  );
}

/**
 * GPS signal lost indicator (Req 12.5, 15.3).
 */
function IndicadorGPSPerdido() {
  return (
    <div
      className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
      </span>
      <span className="text-xs text-amber-700 font-medium">
        Señal GPS no disponible — mostrando última posición conocida
      </span>
    </div>
  );
}

/**
 * Delivery confirmation view (Req 15.4).
 * Shown when status changes to "entregado" — hides map and shows confirmation.
 */
function ConfirmacionEntrega({
  repartidorNombre,
  tiempoEntrega,
}: {
  repartidorNombre?: string;
  tiempoEntrega?: string;
}) {
  const tiempoFormateado = tiempoEntrega
    ? new Date(tiempoEntrega).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 sm:p-8 text-center animate-fade-in motion-reduce:animate-none">
      <span className="text-5xl sm:text-6xl block mb-4" aria-hidden="true">🎉</span>
      <h3 className="text-xl sm:text-2xl font-bold text-green-800 mb-2">
        ¡Pedido entregado!
      </h3>
      <p className="text-sm sm:text-base text-green-700 mb-4">
        Tu pedido ha sido entregado exitosamente.
      </p>

      <div className="space-y-2 text-sm text-green-600">
        {repartidorNombre && (
          <p>
            <span className="font-medium">Repartidor:</span> {repartidorNombre}
          </p>
        )}
        {tiempoFormateado && (
          <p>
            <span className="font-medium">Hora de entrega:</span> {tiempoFormateado}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the rastreo page.
 */
function RastreoSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="h-5 bg-wood-100 rounded w-1/3 mb-4" />
        <div className="flex justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-wood-100" />
              <div className="w-12 h-3 bg-wood-100 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-64 bg-wood-100 rounded-xl" />
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

/**
 * Real-time order tracking page for the cliente module.
 *
 * Features:
 * - Visual step indicator for order states (Req 12.1)
 * - Real-time state updates via Supabase Realtime within 5s (Req 12.2)
 * - Leaflet + OpenStreetMap map for delivery orders "en_camino" (Req 12.3, 15.1)
 * - Delivery person location updated every 10-15 seconds (Req 15.2)
 * - Connection loss handling with retries (Req 12.4)
 * - GPS signal loss indicator with last known position (Req 12.5, 15.3)
 * - Delivery confirmation with time and driver name (Req 15.4)
 * - Responsive design, warm colors, 44px touch targets
 *
 * Uses pedidoId from URL search params (?pedidoId=...) or localStorage.
 */
export default function RastreoPage() {
  const searchParams = useSearchParams();

  // State
  const [pedido, setPedido] = useState<PedidoInfo | null>(null);
  const [ubicacion, setUbicacion] = useState<UbicacionRepartidor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsSignalLost, setGpsSignalLost] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    connected: true,
    retryCount: 0,
    lastKnownState: null,
  });

  // Refs
  const estadoChannelRef = useRef<RealtimeChannel | null>(null);
  const ubicacionChannelRef = useRef<RealtimeChannel | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gpsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastGpsUpdateRef = useRef<number>(Date.now());

  // ============================================================================
  // Get pedidoId from URL params or localStorage
  // ============================================================================

  const getPedidoId = useCallback((): string | null => {
    const fromUrl = searchParams.get('pedidoId');
    if (fromUrl) {
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('rastreo_pedidoId', fromUrl);
      }
      return fromUrl;
    }
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rastreo_pedidoId');
    }
    return null;
  }, [searchParams]);

  // ============================================================================
  // Fetch initial pedido info
  // ============================================================================

  const fetchPedidoInfo = useCallback(async (pedidoId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/pedidos/${pedidoId}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar la información del pedido');
      }

      const json = await response.json();
      const data = json.data || json;

      const pedidoInfo: PedidoInfo = {
        id: data.id,
        numero: data.numero,
        estado: data.estado as EstadoPedido,
        modalidad: data.modalidad as Modalidad,
        repartidorNombre: data.repartidorNombre || data.entrega?.repartidorNombre,
        tiempoEntrega: data.tiempoEntrega || data.entrega?.completadaEn,
        tiempoEstimado: data.tiempoEstimado,
      };

      setPedido(pedidoInfo);
      setConnection((prev) => ({ ...prev, lastKnownState: pedidoInfo.estado }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar el pedido'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // Subscribe to real-time state updates (Req 12.2)
  // ============================================================================

  const subscribeToEstado = useCallback(
    (pedidoId: string) => {
      // Clean up existing channel
      if (estadoChannelRef.current) {
        unsubscribeFromChannel(estadoChannelRef.current);
      }

      const channelName = REALTIME_CHANNELS.ESTADO_PEDIDO(pedidoId);

      const channel = supabaseClient
        .channel(channelName)
        .on('broadcast', { event: 'estado_cambio' }, (payload) => {
          const nuevoEstado = (payload.payload as { estado: EstadoPedido })?.estado;
          if (nuevoEstado) {
            setPedido((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                estado: nuevoEstado,
                repartidorNombre:
                  (payload.payload as { repartidorNombre?: string })?.repartidorNombre ||
                  prev.repartidorNombre,
                tiempoEntrega:
                  (payload.payload as { tiempoEntrega?: string })?.tiempoEntrega ||
                  prev.tiempoEntrega,
                tiempoEstimado:
                  (payload.payload as { tiempoEstimado?: number })?.tiempoEstimado ??
                  prev.tiempoEstimado,
              };
            });
            setConnection((prev) => ({
              ...prev,
              connected: true,
              retryCount: 0,
              lastKnownState: nuevoEstado,
            }));
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnection((prev) => ({ ...prev, connected: true, retryCount: 0 }));
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            handleConnectionLost();
          }
        });

      estadoChannelRef.current = channel;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ============================================================================
  // Subscribe to delivery location updates (Req 15.2)
  // ============================================================================

  const subscribeToUbicacion = useCallback(
    (pedidoId: string) => {
      // Clean up existing channel
      if (ubicacionChannelRef.current) {
        unsubscribeFromChannel(ubicacionChannelRef.current);
      }

      const channelName = REALTIME_CHANNELS.UBICACION_REPARTIDOR(pedidoId);

      const channel = supabaseClient
        .channel(channelName)
        .on('broadcast', { event: 'ubicacion_update' }, (payload) => {
          const data = payload.payload as { lat: number; lng: number; timestamp?: number };
          if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
            const nuevaUbicacion: UbicacionRepartidor = {
              lat: data.lat,
              lng: data.lng,
              timestamp: data.timestamp || Date.now(),
            };
            setUbicacion(nuevaUbicacion);
            lastGpsUpdateRef.current = Date.now();
            setGpsSignalLost(false);
          }
        })
        .subscribe();

      ubicacionChannelRef.current = channel;
    },
    []
  );

  // ============================================================================
  // Connection loss handling (Req 12.4)
  // ============================================================================

  const handleConnectionLost = useCallback(() => {
    setConnection((prev) => {
      if (prev.retryCount >= MAX_RETRIES) {
        return { ...prev, connected: false };
      }
      return { ...prev, connected: false, retryCount: prev.retryCount + 1 };
    });
  }, []);

  // Auto-retry connection every 10 seconds (Req 12.4)
  useEffect(() => {
    if (!connection.connected && connection.retryCount < MAX_RETRIES) {
      retryTimerRef.current = setTimeout(() => {
        const pedidoId = getPedidoId();
        if (pedidoId) {
          subscribeToEstado(pedidoId);
          if (pedido?.estado === 'EN_CAMINO' && pedido.modalidad === 'DOMICILIO') {
            subscribeToUbicacion(pedidoId);
          }
        }
      }, RETRY_INTERVAL_MS);
    }

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [connection.connected, connection.retryCount, getPedidoId, subscribeToEstado, subscribeToUbicacion, pedido]);

  // ============================================================================
  // GPS signal loss detection (Req 12.5, 15.3)
  // ============================================================================

  useEffect(() => {
    if (pedido?.estado === 'EN_CAMINO' && pedido.modalidad === 'DOMICILIO') {
      gpsTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - lastGpsUpdateRef.current;
        if (elapsed > GPS_TIMEOUT_MS) {
          setGpsSignalLost(true);
        }
      }, 5000);
    } else {
      setGpsSignalLost(false);
    }

    return () => {
      if (gpsTimerRef.current) {
        clearInterval(gpsTimerRef.current);
      }
    };
  }, [pedido?.estado, pedido?.modalidad]);

  // ============================================================================
  // Initialize: fetch pedido and subscribe to channels
  // ============================================================================

  useEffect(() => {
    const pedidoId = getPedidoId();
    if (!pedidoId) {
      setLoading(false);
      setError('No se encontró un pedido para rastrear. Verifica el enlace o realiza un pedido primero.');
      return;
    }

    fetchPedidoInfo(pedidoId);
    subscribeToEstado(pedidoId);

    return () => {
      if (estadoChannelRef.current) {
        unsubscribeFromChannel(estadoChannelRef.current);
      }
      if (ubicacionChannelRef.current) {
        unsubscribeFromChannel(ubicacionChannelRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      if (gpsTimerRef.current) {
        clearInterval(gpsTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to location when order is en_camino and modalidad is domicilio
  useEffect(() => {
    if (pedido?.estado === 'EN_CAMINO' && pedido.modalidad === 'DOMICILIO') {
      const pedidoId = getPedidoId();
      if (pedidoId) {
        subscribeToUbicacion(pedidoId);
        lastGpsUpdateRef.current = Date.now();
      }
    } else if (pedido?.estado === 'ENTREGADO') {
      // Unsubscribe from location when delivered
      if (ubicacionChannelRef.current) {
        unsubscribeFromChannel(ubicacionChannelRef.current);
        ubicacionChannelRef.current = null;
      }
    }
  }, [pedido?.estado, pedido?.modalidad, getPedidoId, subscribeToUbicacion]);

  // ============================================================================
  // Render
  // ============================================================================

  const estados =
    pedido?.modalidad === 'DOMICILIO' ? ESTADOS_DOMICILIO : ESTADOS_LOCAL;

  const showMap =
    pedido?.estado === 'EN_CAMINO' &&
    pedido.modalidad === 'DOMICILIO';

  const isEntregado = pedido?.estado === 'ENTREGADO';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-wood-800">
          Rastreo de Pedido
        </h2>
        {pedido && (
          <p className="text-sm text-wood-500 mt-0.5">
            Pedido #{pedido.numero} • {pedido.modalidad === 'DOMICILIO' ? '🛵 Domicilio' : '🏠 Local'}
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && <RastreoSkeleton />}

      {/* Error State */}
      {!loading && error && (
        <div
          className="bg-fire-50 border border-fire-200 rounded-xl p-6 text-center"
          role="alert"
        >
          <span className="text-4xl block mb-3" aria-hidden="true">😕</span>
          <p className="text-sm text-fire-700 font-medium">{error}</p>
          <button
            onClick={() => {
              const pedidoId = getPedidoId();
              if (pedidoId) fetchPedidoInfo(pedidoId);
            }}
            className="
              mt-4 min-h-[44px] min-w-[44px] px-5 py-2.5
              bg-brand-500 hover:bg-brand-600 text-white
              rounded-lg text-sm font-medium
              transition-colors duration-150 motion-reduce:transition-none
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
            "
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && pedido && (
        <>
          {/* Connection lost banner (Req 12.4) */}
          {!connection.connected && (
            <BannerConexionPerdida
              retryCount={connection.retryCount}
              maxRetries={MAX_RETRIES}
            />
          )}

          {/* Delivery confirmation (Req 15.4) */}
          {isEntregado ? (
            <ConfirmacionEntrega
              repartidorNombre={pedido.repartidorNombre}
              tiempoEntrega={pedido.tiempoEntrega}
            />
          ) : null}

          {/* Status indicator card (Req 12.1) */}
          <div className="bg-white rounded-2xl shadow-sm border border-wood-100 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-wood-700 mb-4 sm:mb-6">
              Estado del pedido
            </h3>
            <IndicadorEstado
              estados={estados}
              estadoActual={pedido.estado}
            />
          </div>

          {/* Estimated time (if available) */}
          {pedido.tiempoEstimado && pedido.estado !== 'ENTREGADO' && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">⏱️</span>
              <div>
                <p className="text-sm font-semibold text-brand-800">
                  Tiempo estimado
                </p>
                <p className="text-xs text-brand-600">
                  Aproximadamente {pedido.tiempoEstimado} minutos
                </p>
              </div>
            </div>
          )}

          {/* Map section for delivery orders en_camino (Req 12.3, 15.1) */}
          {showMap && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-wood-700">
                Ubicación del repartidor
              </h3>

              {/* GPS signal lost indicator (Req 12.5, 15.3) */}
              {gpsSignalLost && <IndicadorGPSPerdido />}

              {/* Map */}
              <div className="rounded-xl overflow-hidden shadow-sm border border-wood-100">
                <MapaRastreo ubicacion={ubicacion} />
              </div>

              {ubicacion && (
                <p className="text-xs text-wood-400 text-center">
                  Última actualización:{' '}
                  {new Date(ubicacion.timestamp).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              )}
            </div>
          )}

          {/* Info when en_camino but no location yet */}
          {pedido.estado === 'EN_CAMINO' && pedido.modalidad === 'DOMICILIO' && !ubicacion && !showMap && (
            <div className="bg-brand-50 rounded-xl p-4 text-center">
              <span className="text-3xl block mb-2" aria-hidden="true">🛵</span>
              <p className="text-sm text-brand-700">
                Tu pedido va en camino. La ubicación del repartidor se actualizará en un momento.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
