'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface EntregaPendiente {
  id: string;
  pedidoId: string;
  numeroPedido: string;
  clienteNombre: string;
  direccion: string;
  telefono: string;
}

interface EntregaActiva {
  id: string;
  pedidoId: string;
  numeroPedido: string;
  clienteNombre: string;
  direccion: string;
  telefono: string;
  aceptadaEn: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_ENTREGAS_ACTIVAS = 3;
const GPS_SEND_INTERVAL_MS = 10_000; // 10 seconds (Req 14.3)
const GPS_SIGNAL_LOSS_THRESHOLD_MS = 60_000; // 60 seconds (Req 14.4)

// ============================================================================
// Main Page Component
// ============================================================================

/**
 * Delivery management page for the repartidor module.
 *
 * Features:
 * - List pending deliveries: client name, address, phone (Req 14.1)
 * - "Aceptar entrega" button with 3 active delivery limit (Req 14.2, 14.7)
 * - GPS tracking: watchPosition sends every 10s (Req 14.3)
 * - GPS signal loss alert after 60s (Req 14.4)
 * - "Completar entrega" button (Req 14.5)
 * - "No se pudo entregar" with motivo field (Req 14.6)
 */
export default function EntregasPage() {
  // State
  const [pendientes, setPendientes] = useState<EntregaPendiente[]>([]);
  const [activas, setActivas] = useState<EntregaActiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [gpsSignalLost, setGpsSignalLost] = useState(false);
  const [motivoEntregaFallida, setMotivoEntregaFallida] = useState<Record<string, string>>({});
  const [showMotivoForm, setShowMotivoForm] = useState<string | null>(null);

  // Refs for GPS tracking
  const watchIdRef = useRef<number | null>(null);
  const gpsSendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastGpsPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastGpsTimestampRef = useRef<number>(Date.now());
  const gpsCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Fetch entregas
  // ============================================================================

  const fetchEntregas = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/entregas');
      if (!response.ok) {
        throw new Error('Error al cargar entregas');
      }
      const data = await response.json();
      setPendientes(data.pendientes || []);
      setActivas(data.activas || []);
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
  // GPS Tracking (Req 14.3)
  // ============================================================================

  const sendGpsPosition = useCallback(async (lat: number, lng: number) => {
    try {
      await fetch('/api/entregas/ubicacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, timestamp: Date.now() }),
      });
    } catch {
      // Silent failure for GPS updates - they're best-effort
    }
  }, []);

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsSignalLost(true);
      return;
    }

    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        lastGpsPositionRef.current = { lat: latitude, lng: longitude };
        lastGpsTimestampRef.current = Date.now();
        setGpsSignalLost(false);
      },
      () => {
        // GPS error - will be detected by signal loss check
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
    watchIdRef.current = watchId;

    // Send position every 10 seconds (Req 14.3)
    gpsSendIntervalRef.current = setInterval(() => {
      if (lastGpsPositionRef.current) {
        sendGpsPosition(
          lastGpsPositionRef.current.lat,
          lastGpsPositionRef.current.lng
        );
      }
    }, GPS_SEND_INTERVAL_MS);

    // Check for GPS signal loss every 5 seconds (Req 14.4)
    gpsCheckIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastGpsTimestampRef.current;
      if (elapsed > GPS_SIGNAL_LOSS_THRESHOLD_MS) {
        setGpsSignalLost(true);
      }
    }, 5000);
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
    setGpsSignalLost(false);
  }, []);

  // Start GPS tracking if there are active deliveries
  useEffect(() => {
    if (activas.length > 0) {
      startGpsTracking();
    } else {
      stopGpsTracking();
    }

    return () => {
      stopGpsTracking();
    };
  }, [activas.length, startGpsTracking, stopGpsTracking]);

  // ============================================================================
  // Actions
  // ============================================================================

  const handleAceptarEntrega = async (entregaId: string) => {
    // Validate limit (Req 14.7)
    if (activas.length >= MAX_ENTREGAS_ACTIVAS) {
      setActionError(
        `No puedes aceptar más entregas. Límite máximo: ${MAX_ENTREGAS_ACTIVAS} entregas activas.`
      );
      return;
    }

    setActionLoading(entregaId);
    setActionError(null);

    try {
      const response = await fetch(`/api/entregas/${entregaId}/aceptar`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Error al aceptar entrega');
      }

      // Refresh the list
      await fetchEntregas();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al aceptar entrega');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompletarEntrega = async (entregaId: string) => {
    setActionLoading(entregaId);
    setActionError(null);

    try {
      const response = await fetch(`/api/entregas/${entregaId}/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'entregado' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Error al completar entrega');
      }

      // Refresh the list
      await fetchEntregas();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al completar entrega');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEntregaFallida = async (entregaId: string) => {
    const motivo = motivoEntregaFallida[entregaId]?.trim();
    if (!motivo) {
      setActionError('Debes indicar el motivo por el cual no se pudo entregar.');
      return;
    }

    setActionLoading(entregaId);
    setActionError(null);

    try {
      const response = await fetch(`/api/entregas/${entregaId}/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'fallido', motivo }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Error al reportar entrega fallida');
      }

      // Clean up form state
      setShowMotivoForm(null);
      setMotivoEntregaFallida((prev) => {
        const next = { ...prev };
        delete next[entregaId];
        return next;
      });

      // Refresh the list
      await fetchEntregas();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al reportar entrega fallida');
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-wood-100 rounded w-1/3" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="h-5 bg-wood-100 rounded w-1/2 mb-3" />
              <div className="h-4 bg-wood-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-wood-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-wood-800">
          Mis Entregas
        </h2>
        <p className="text-sm text-wood-500 mt-1">
          Activas: {activas.length}/{MAX_ENTREGAS_ACTIVAS}
        </p>
      </div>

      {/* GPS Signal Loss Alert (Req 14.4) */}
      {gpsSignalLost && activas.length > 0 && (
        <div
          className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3"
          role="alert"
          aria-live="assertive"
        >
          <span className="relative flex h-4 w-4 mt-0.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Señal GPS perdida
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              No se ha podido obtener tu ubicación en los últimos 60 segundos.
              Se registró tu última posición conocida.
            </p>
          </div>
        </div>
      )}

      {/* Action Error */}
      {actionError && (
        <div
          className="bg-fire-50 border border-fire-200 rounded-xl p-4 flex items-start gap-3"
          role="alert"
        >
          <span className="text-lg flex-shrink-0" aria-hidden="true">⚠️</span>
          <div className="flex-1">
            <p className="text-sm text-fire-700">{actionError}</p>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-fire-400 hover:text-fire-600 text-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Cerrar alerta"
          >
            ✕
          </button>
        </div>
      )}

      {/* Global Error */}
      {error && (
        <div
          className="bg-fire-50 border border-fire-200 rounded-xl p-6 text-center"
          role="alert"
        >
          <span className="text-4xl block mb-3" aria-hidden="true">😕</span>
          <p className="text-sm text-fire-700 font-medium">{error}</p>
          <button
            onClick={fetchEntregas}
            className="mt-4 min-h-[44px] min-w-[44px] px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Active Deliveries Section */}
      {activas.length > 0 && (
        <section aria-labelledby="seccion-activas">
          <h3 id="seccion-activas" className="text-lg font-semibold text-wood-700 mb-3">
            Entregas Activas ({activas.length})
          </h3>
          <div className="space-y-3">
            {activas.map((entrega) => (
              <div
                key={entrega.id}
                className="bg-white border-l-4 border-brand-500 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-wood-800">
                      {entrega.clienteNombre}
                    </p>
                    <p className="text-sm text-wood-500 mt-0.5">
                      Pedido #{entrega.numeroPedido}
                    </p>
                  </div>
                  <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full font-medium">
                    En camino
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-wood-600 mb-4">
                  <p className="flex items-start gap-2">
                    <span aria-hidden="true">📍</span>
                    <span>{entrega.direccion}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span aria-hidden="true">📞</span>
                    <a
                      href={`tel:${entrega.telefono}`}
                      className="text-brand-600 hover:underline"
                    >
                      {entrega.telefono}
                    </a>
                  </p>
                  <p className="flex items-center gap-2 text-xs text-wood-400">
                    <span aria-hidden="true">🕐</span>
                    <span>
                      Aceptada: {new Date(entrega.aceptadaEn).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleCompletarEntrega(entrega.id)}
                    disabled={actionLoading === entrega.id}
                    className="flex-1 min-h-[44px] px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    {actionLoading === entrega.id ? 'Procesando...' : '✓ Completar entrega'}
                  </button>
                  <button
                    onClick={() =>
                      setShowMotivoForm(
                        showMotivoForm === entrega.id ? null : entrega.id
                      )
                    }
                    disabled={actionLoading === entrega.id}
                    className="flex-1 min-h-[44px] px-4 py-2.5 bg-fire-100 hover:bg-fire-200 disabled:bg-fire-50 text-fire-700 rounded-lg text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-fire-400 focus:ring-offset-2"
                  >
                    ✕ No se pudo entregar
                  </button>
                </div>

                {/* Motivo Form (Req 14.6) */}
                {showMotivoForm === entrega.id && (
                  <div className="mt-3 space-y-2">
                    <label
                      htmlFor={`motivo-${entrega.id}`}
                      className="block text-sm font-medium text-wood-700"
                    >
                      Motivo de no entrega:
                    </label>
                    <textarea
                      id={`motivo-${entrega.id}`}
                      value={motivoEntregaFallida[entrega.id] || ''}
                      onChange={(e) =>
                        setMotivoEntregaFallida((prev) => ({
                          ...prev,
                          [entrega.id]: e.target.value,
                        }))
                      }
                      placeholder="Ej: No había nadie en el domicilio, dirección incorrecta..."
                      rows={2}
                      maxLength={250}
                      className="w-full px-3 py-2 border border-wood-300 rounded-lg text-sm text-wood-800 placeholder:text-wood-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                    />
                    <button
                      onClick={() => handleEntregaFallida(entrega.id)}
                      disabled={actionLoading === entrega.id || !motivoEntregaFallida[entrega.id]?.trim()}
                      className="min-h-[44px] px-4 py-2 bg-fire-600 hover:bg-fire-700 disabled:bg-fire-300 text-white rounded-lg text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-fire-500 focus:ring-offset-2"
                    >
                      {actionLoading === entrega.id ? 'Enviando...' : 'Confirmar no entrega'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending Deliveries Section */}
      <section aria-labelledby="seccion-pendientes">
        <h3 id="seccion-pendientes" className="text-lg font-semibold text-wood-700 mb-3">
          Entregas Pendientes ({pendientes.length})
        </h3>

        {pendientes.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <span className="text-4xl block mb-3" aria-hidden="true">📭</span>
            <p className="text-sm text-wood-500">
              No hay entregas pendientes en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendientes.map((entrega) => (
              <div
                key={entrega.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-wood-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-wood-800">
                      {entrega.clienteNombre}
                    </p>
                    <p className="text-sm text-wood-500 mt-0.5">
                      Pedido #{entrega.numeroPedido}
                    </p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                    Pendiente
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-wood-600 mb-4">
                  <p className="flex items-start gap-2">
                    <span aria-hidden="true">📍</span>
                    <span>{entrega.direccion}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span aria-hidden="true">📞</span>
                    <a
                      href={`tel:${entrega.telefono}`}
                      className="text-brand-600 hover:underline"
                    >
                      {entrega.telefono}
                    </a>
                  </p>
                </div>

                <button
                  onClick={() => handleAceptarEntrega(entrega.id)}
                  disabled={
                    actionLoading === entrega.id ||
                    activas.length >= MAX_ENTREGAS_ACTIVAS
                  }
                  className="w-full min-h-[44px] px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-wood-300 disabled:text-wood-500 text-white rounded-lg text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  {actionLoading === entrega.id
                    ? 'Aceptando...'
                    : activas.length >= MAX_ENTREGAS_ACTIVAS
                    ? `Límite alcanzado (${MAX_ENTREGAS_ACTIVAS} activas)`
                    : '🛵 Aceptar entrega'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
