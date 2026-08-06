'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

// ============================================================================
// Types
// ============================================================================

interface EntregaActiva {
  id: string;
  pedidoId: string;
  numeroPedido: string;
  clienteNombre: string;
  direccion: string;
  telefono: string;
  aceptadaEn: string;
  lat?: number;
  lng?: number;
}

// ============================================================================
// Constants
// ============================================================================

const GPS_UPDATE_INTERVAL_MS = 10_000; // 10 seconds (Req 14.3)
const GPS_SIGNAL_LOSS_THRESHOLD_MS = 60_000; // 60 seconds (Req 14.4)

// ============================================================================
// Dynamic Leaflet Map (no SSR to avoid window reference errors)
// ============================================================================

const MapaRepartidor = dynamic(() => import('./_components/MapaRepartidor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-brand-50 rounded-xl flex items-center justify-center animate-pulse">
      <span className="text-wood-400 text-sm">Cargando mapa...</span>
    </div>
  ),
});

// ============================================================================
// Main Page Component
// ============================================================================

/**
 * Map page for the repartidor module.
 *
 * Features:
 * - Full-screen Leaflet + OpenStreetMap map showing current position
 * - Active delivery destinations shown as markers
 * - Route lines from repartidor to each active delivery
 * - GPS tracking via navigator.geolocation.watchPosition() every 10s (Req 14.3)
 * - GPS signal loss alert after 60s without position (Req 14.4)
 * - List of active deliveries as info overlay
 *
 * Requirements: 14.1, 14.3, 14.4
 */
export default function MapaPage() {
  // State
  const [posicionActual, setPosicionActual] = useState<{ lat: number; lng: number } | null>(null);
  const [entregasActivas, setEntregasActivas] = useState<EntregaActiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsSignalLost, setGpsSignalLost] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const gpsSendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gpsCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastGpsTimestampRef = useRef<number>(Date.now());

  // ============================================================================
  // Fetch active entregas
  // ============================================================================

  const fetchEntregas = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/entregas');
      if (!response.ok) {
        throw new Error('Error al cargar entregas');
      }
      const data = await response.json();
      setEntregasActivas(data.activas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntregas();
  }, [fetchEntregas]);

  // ============================================================================
  // Send GPS position to API (Req 14.3)
  // ============================================================================

  const sendGpsPosition = useCallback(async (lat: number, lng: number) => {
    try {
      await fetch('/api/entregas/ubicacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, timestamp: Date.now() }),
      });
    } catch {
      // Silent failure - GPS updates are best-effort
    }
  }, []);

  // ============================================================================
  // GPS Tracking (Req 14.3, 14.4)
  // ============================================================================

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsSignalLost(true);
      return;
    }

    // Watch position continuously
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setPosicionActual({ lat: latitude, lng: longitude });
        lastGpsTimestampRef.current = Date.now();
        setGpsSignalLost(false);
        setGpsPermissionDenied(false);
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setGpsPermissionDenied(true);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
    watchIdRef.current = watchId;

    // Send position to server every 10 seconds (Req 14.3)
    gpsSendIntervalRef.current = setInterval(() => {
      if (posicionActual) {
        sendGpsPosition(posicionActual.lat, posicionActual.lng);
      }
    }, GPS_UPDATE_INTERVAL_MS);

    // Check GPS signal loss every 5 seconds (Req 14.4)
    gpsCheckIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastGpsTimestampRef.current;
      if (elapsed > GPS_SIGNAL_LOSS_THRESHOLD_MS) {
        setGpsSignalLost(true);
      }
    }, 5000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendGpsPosition]);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (gpsSendIntervalRef.current) {
      clearInterval(gpsSendIntervalRef.current);
      gpsSendIntervalRef.current = null;
    }
    if (gpsCheckIntervalRef.current) {
      clearInterval(gpsCheckIntervalRef.current);
      gpsCheckIntervalRef.current = null;
    }
  }, []);

  // Start GPS tracking on mount (only if there are active deliveries)
  useEffect(() => {
    if (entregasActivas.length > 0) {
      startGpsTracking();
    }

    return () => {
      stopGpsTracking();
    };
  }, [entregasActivas.length, startGpsTracking, stopGpsTracking]);

  // Keep the interval's closure up to date with current position
  useEffect(() => {
    // Re-create the send interval with the latest position reference
    if (gpsSendIntervalRef.current && posicionActual) {
      clearInterval(gpsSendIntervalRef.current);
      gpsSendIntervalRef.current = setInterval(() => {
        if (posicionActual) {
          sendGpsPosition(posicionActual.lat, posicionActual.lng);
        }
      }, GPS_UPDATE_INTERVAL_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicionActual]);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] animate-pulse">
        <div className="h-8 bg-wood-100 rounded w-1/4 mb-4" />
        <div className="flex-1 bg-wood-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-wood-800">
            Mapa de Ruta
          </h2>
          <p className="text-sm text-wood-500 mt-0.5">
            {entregasActivas.length > 0
              ? `${entregasActivas.length} entrega${entregasActivas.length > 1 ? 's' : ''} activa${entregasActivas.length > 1 ? 's' : ''}`
              : 'Sin entregas activas'}
          </p>
        </div>
        <button
          onClick={fetchEntregas}
          className="min-h-[44px] min-w-[44px] px-3 py-2 bg-wood-100 hover:bg-wood-200 text-wood-600 rounded-lg text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          aria-label="Actualizar entregas"
        >
          🔄
        </button>
      </div>

      {/* GPS Alerts */}
      {gpsPermissionDenied && (
        <div
          className="bg-fire-50 border border-fire-200 rounded-xl p-4 flex items-start gap-3 flex-shrink-0"
          role="alert"
        >
          <span className="text-lg flex-shrink-0" aria-hidden="true">🚫</span>
          <div>
            <p className="text-sm font-semibold text-fire-800">
              Permiso de ubicacion denegado
            </p>
            <p className="text-xs text-fire-600 mt-0.5">
              Habilita el acceso a la ubicacion en la configuracion de tu navegador para poder rastrear tus entregas.
            </p>
          </div>
        </div>
      )}

      {gpsSignalLost && !gpsPermissionDenied && entregasActivas.length > 0 && (
        <div
          className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center gap-3 flex-shrink-0"
          role="alert"
          aria-live="assertive"
        >
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
          <p className="text-xs text-amber-700 font-medium">
            Senal GPS perdida hace mas de 60 segundos. Mostrando ultima posicion conocida.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="bg-fire-50 border border-fire-200 rounded-xl p-4 text-center flex-shrink-0"
          role="alert"
        >
          <p className="text-sm text-fire-700">{error}</p>
          <button
            onClick={fetchEntregas}
            className="mt-2 min-h-[44px] px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors duration-150 motion-reduce:transition-none"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Map Area */}
      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-wood-100 relative">
        {entregasActivas.length === 0 && !posicionActual ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-brand-50 p-6 text-center">
            <span className="text-5xl mb-4" aria-hidden="true">🗺️</span>
            <p className="text-wood-600 font-medium mb-1">
              Sin entregas activas
            </p>
            <p className="text-sm text-wood-400">
              Acepta una entrega desde la seccion de Entregas para ver la ruta en el mapa.
            </p>
          </div>
        ) : (
          <MapaRepartidor
            posicionActual={posicionActual}
            entregasActivas={entregasActivas}
          />
        )}
      </div>

      {/* Active Deliveries Info Overlay */}
      {entregasActivas.length > 0 && (
        <div className="flex-shrink-0 bg-white rounded-xl shadow-sm border border-wood-100 p-3 max-h-48 overflow-y-auto">
          <h3 className="text-xs font-semibold text-wood-500 uppercase tracking-wide mb-2">
            Entregas en ruta
          </h3>
          <div className="space-y-2">
            {entregasActivas.map((entrega) => (
              <div
                key={entrega.id}
                className="flex items-center gap-3 py-1.5 border-b border-wood-50 last:border-0"
              >
                <span
                  className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm flex-shrink-0"
                  aria-hidden="true"
                >
                  📍
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wood-800 truncate">
                    {entrega.clienteNombre}
                  </p>
                  <p className="text-xs text-wood-500 truncate">
                    {entrega.direccion}
                  </p>
                </div>
                <a
                  href={`tel:${entrega.telefono}`}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors duration-150 motion-reduce:transition-none"
                  aria-label={`Llamar a ${entrega.clienteNombre}`}
                >
                  <span className="text-lg" aria-hidden="true">📞</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
