'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { geocodificarCompleto } from './_lib/geocoding';
import { calcularRuta, distanciaLinealMetros, estaCercaDelDestino } from './_lib/routing';
import type { EntregaConRuta } from './_components/MapaRepartidor';

// ============================================================================
// Types
// ============================================================================

interface EntregaRaw {
  id: string;
  pedidoId: string;
  numeroPedido: string;
  clienteNombre: string;
  direccion: string;
  telefono: string;
  estado: string;
  repartidorId?: string;
  metodoPago?: string | null;
  estadoPago?: string;
  observaciones?: string;
  aceptadaEn?: string;
  total?: number;
}

// ============================================================================
// Constants
// ============================================================================

const GPS_UPDATE_INTERVAL_MS = 10_000;
const ROUTE_RECALC_INTERVAL_MS = 30_000;
const ENTREGAS_POLL_MS = 15_000;
const UMBRAL_LLEGADA_METROS = 100;

// ============================================================================
// Dynamic Map (no SSR)
// ============================================================================

const MapaRepartidor = dynamic(() => import('./_components/MapaRepartidor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-400">Cargando mapa...</p>
      </div>
    </div>
  ),
});

// ============================================================================
// Main Page
// ============================================================================

export default function MapaPage() {
  // State
  const [posicionActual, setPosicionActual] = useState<{ lat: number; lng: number } | null>(null);
  const [entregaActiva, setEntregaActiva] = useState<EntregaConRuta | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsActivo, setGpsActivo] = useState(false);
  const [cercaDelDestino, setCercaDelDestino] = useState(false);
  const [llegueLoading, setLlegueLoading] = useState(false);
  const [sinEntregas, setSinEntregas] = useState(false);
  const [geocodePrecision, setGeocodePrecision] = useState<string | null>(null);

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const routeRecalcRef = useRef<NodeJS.Timeout | null>(null);
  const gpsSendRef = useRef<NodeJS.Timeout | null>(null);
  const entregasPollRef = useRef<NodeJS.Timeout | null>(null);
  const posicionRef = useRef<{ lat: number; lng: number } | null>(null);

  // ============================================================================
  // Fetch entregas activas del repartidor
  // ============================================================================

  const fetchEntregaActiva = useCallback(async () => {
    try {
      const res = await fetch('/api/entregas');
      if (!res.ok) return;

      const json = await res.json();
      const data = json.data || [];
      const miId = localStorage.getItem('alaburguer-repartidor-id') || '';

      // Filtrar entregas activas (en_camino) del repartidor actual
      const activas = data.filter(
        (e: EntregaRaw) => e.repartidorId === miId && e.estado === 'en_camino'
      );

      if (activas.length === 0) {
        setSinEntregas(true);
        setEntregaActiva(null);
        setLoading(false);
        return;
      }

      setSinEntregas(false);

      // Tomar la primera entrega activa (la más reciente)
      const entrega: EntregaRaw = activas[0];

      // Geocodificar dirección — lookup local + Nominatim 15km
      const geoResult = await geocodificarCompleto(entrega.direccion);
      const destino = geoResult.coordenadas;
      setGeocodePrecision(geoResult.precision);

      // Calcular ruta si tenemos posición y destino
      let ruta = null;
      if (posicionRef.current && destino) {
        ruta = await calcularRuta(posicionRef.current, destino, false);
      }

      const entregaConRuta: EntregaConRuta = {
        id: entrega.id,
        pedidoId: entrega.pedidoId,
        numeroPedido: entrega.numeroPedido,
        clienteNombre: entrega.clienteNombre,
        direccion: entrega.direccion,
        telefono: entrega.telefono,
        total: entrega.total,
        metodoPago: entrega.metodoPago,
        aceptadaEn: entrega.aceptadaEn,
        destino,
        ruta,
      };

      setEntregaActiva(entregaConRuta);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // GPS Tracking
  // ============================================================================

  const startGps = useCallback(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosicionActual(coords);
        posicionRef.current = coords;
        setGpsActivo(true);
      },
      () => {
        setGpsActivo(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    watchIdRef.current = watchId;

    // Enviar GPS al servidor cada 10s
    gpsSendRef.current = setInterval(() => {
      if (posicionRef.current) {
        fetch('/api/entregas/ubicacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: posicionRef.current.lat,
            lng: posicionRef.current.lng,
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
    }, GPS_UPDATE_INTERVAL_MS);
  }, []);

  const stopGps = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (gpsSendRef.current) {
      clearInterval(gpsSendRef.current);
      gpsSendRef.current = null;
    }
  }, []);

  // ============================================================================
  // Recalcular ruta periódicamente
  // ============================================================================

  const recalcularRuta = useCallback(async () => {
    if (!posicionRef.current || !entregaActiva?.destino) return;

    const nuevaRuta = await calcularRuta(
      posicionRef.current,
      entregaActiva.destino,
      false
    );

    if (nuevaRuta) {
      setEntregaActiva((prev) =>
        prev ? { ...prev, ruta: nuevaRuta } : null
      );
    }

    // Verificar cercanía
    const distancia = distanciaLinealMetros(
      posicionRef.current,
      entregaActiva.destino
    );
    setCercaDelDestino(estaCercaDelDestino(distancia, UMBRAL_LLEGADA_METROS));
  }, [entregaActiva?.destino]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Inicializar todo
  useEffect(() => {
    startGps();
    fetchEntregaActiva();

    // Polling entregas
    entregasPollRef.current = setInterval(fetchEntregaActiva, ENTREGAS_POLL_MS);

    return () => {
      stopGps();
      if (routeRecalcRef.current) clearInterval(routeRecalcRef.current);
      if (entregasPollRef.current) clearInterval(entregasPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalcular ruta cada 30s cuando hay entrega activa
  useEffect(() => {
    if (routeRecalcRef.current) {
      clearInterval(routeRecalcRef.current);
      routeRecalcRef.current = null;
    }

    if (entregaActiva?.destino) {
      // Calcular ruta inmediatamente si no existe
      if (!entregaActiva.ruta && posicionRef.current) {
        recalcularRuta();
      }
      routeRecalcRef.current = setInterval(recalcularRuta, ROUTE_RECALC_INTERVAL_MS);
    }

    return () => {
      if (routeRecalcRef.current) clearInterval(routeRecalcRef.current);
    };
  }, [entregaActiva?.destino, entregaActiva?.ruta, recalcularRuta]);

  // Verificar cercanía al destino con cada actualización de posición
  useEffect(() => {
    if (!posicionActual || !entregaActiva?.destino) {
      setCercaDelDestino(false);
      return;
    }
    const distancia = distanciaLinealMetros(posicionActual, entregaActiva.destino);
    setCercaDelDestino(estaCercaDelDestino(distancia, UMBRAL_LLEGADA_METROS));
  }, [posicionActual, entregaActiva?.destino]);

  // ============================================================================
  // Acción: "Llegué"
  // ============================================================================

  const handleLlegue = async () => {
    if (!entregaActiva) return;
    setLlegueLoading(true);
    try {
      await fetch(`/api/entregas/${entregaActiva.id}/completar`, { method: 'POST' });
      setEntregaActiva(null);
      setSinEntregas(true);
      setCercaDelDestino(false);
    } catch {
      // silencioso
    } finally {
      setLlegueLoading(false);
    }
  };

  // ============================================================================
  // Render: Loading
  // ============================================================================

  if (loading) {
    return (
      <div className="h-[calc(100vh-56px)] bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Sin entregas activas
  // ============================================================================

  if (sinEntregas) {
    return (
      <div className="h-[calc(100vh-56px)] bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-4 animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-800/50 flex items-center justify-center border border-gray-700/30">
            <span className="text-4xl">🗺️</span>
          </div>
          <h2 className="text-xl font-bold text-white">Sin entregas activas</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Acepta una entrega desde la pestaña de Entregas para ver la ruta de navegación aquí.
          </p>
          <a
            href="/entregas"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium border border-green-500/20 hover:bg-green-500/20 transition-all"
          >
            📦 Ir a Entregas
          </a>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Mapa con entrega activa
  // ============================================================================

  const tiempoTranscurrido = entregaActiva?.aceptadaEn
    ? Math.floor((Date.now() - new Date(entregaActiva.aceptadaEn).getTime()) / 60000)
    : 0;

  return (
    <div className="h-[calc(100vh-56px)] bg-[#0a0a0f] relative overflow-hidden">
      {/* Mapa fullscreen */}
      <div className="absolute inset-0">
        <MapaRepartidor
          posicionActual={posicionActual}
          entregaActiva={entregaActiva}
        />
      </div>

      {/* Header overlay - Info GPS + ETA */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-start justify-between pointer-events-none">
        {/* Badge GPS */}
        <div className="pointer-events-auto">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium backdrop-blur-md ${
            gpsActivo
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${gpsActivo ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {gpsActivo ? 'GPS activo' : 'Sin señal GPS'}
          </div>
        </div>

        {/* ETA Badge */}
        {entregaActiva?.ruta && (
          <div className="pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">ETA</p>
                <p className="text-sm font-bold text-white">{entregaActiva.ruta.etaTexto}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Distancia</p>
                <p className="text-sm font-bold text-blue-400">{entregaActiva.ruta.distanciaTexto}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón re-centrar */}
      {posicionActual && (
        <div className="absolute bottom-[220px] right-4 z-[1000]">
          <button
            onClick={() => {
              // Disparar re-fit del mapa
              if (posicionActual && entregaActiva?.destino) {
                window.dispatchEvent(new CustomEvent('refit-map'));
              }
            }}
            className="w-10 h-10 rounded-full bg-[#1e1e2e] border border-white/10 flex items-center justify-center text-white shadow-lg hover:bg-[#2e2e4e] transition-all active:scale-90"
            aria-label="Centrar mapa"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
            </svg>
          </button>
        </div>
      )}

      {/* Card flotante inferior - Info del pedido */}
      {entregaActiva && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4">
          <div className="rounded-2xl bg-[#16161f]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
            {/* Indicador de cercanía */}
            {cercaDelDestino && (
              <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-medium text-green-400">Estás cerca del destino</span>
              </div>
            )}

            {/* Info principal */}
            <div className="p-4 space-y-3">
              {/* Header: pedido + tiempo */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                    #{entregaActiva.numeroPedido}
                  </span>
                  {entregaActiva.metodoPago && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      entregaActiva.metodoPago === 'efectivo'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : entregaActiva.metodoPago === 'transferencia'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {entregaActiva.metodoPago === 'efectivo' ? '💵 Efectivo' :
                       entregaActiva.metodoPago === 'transferencia' ? '📱 Transfer' : '💳 Tarjeta'}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500">
                  {tiempoTranscurrido > 0 ? `hace ${tiempoTranscurrido} min` : 'ahora'}
                </span>
              </div>

              {/* Cliente + dirección */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                  <span className="text-sm">👤</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {entregaActiva.clienteNombre}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    📍 {entregaActiva.direccion}
                  </p>
                </div>
                {entregaActiva.total && (
                  <span className="text-sm font-bold text-green-400 flex-shrink-0">
                    ${entregaActiva.total}
                  </span>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 pt-1">
                {/* Botón llamar */}
                {entregaActiva.telefono && (
                  <a
                    href={`tel:${entregaActiva.telefono}`}
                    className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                    aria-label="Llamar al cliente"
                  >
                    <span className="text-lg">📞</span>
                  </a>
                )}

                {/* Botón navegar en app externa */}
                {entregaActiva.destino && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${entregaActiva.destino.lat},${entregaActiva.destino.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                    aria-label="Abrir en Google Maps"
                  >
                    <span className="text-lg">🧭</span>
                  </a>
                )}

                {/* Botón Llegué */}
                <button
                  onClick={handleLlegue}
                  disabled={llegueLoading}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${
                    cercaDelDestino
                      ? 'bg-gradient-to-r from-green-500 to-green-400 text-black shadow-lg shadow-green-500/25'
                      : 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
                  } disabled:opacity-50`}
                >
                  {llegueLoading
                    ? '⏳ Procesando...'
                    : cercaDelDestino
                    ? '✓ Llegué al destino'
                    : '✓ Marcar como entregado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de precisión de geocoding */}
      {entregaActiva && geocodePrecision && geocodePrecision !== 'exacto' && (
        <div className="absolute top-20 left-4 right-4 z-[1000]">
          <div className={`rounded-xl backdrop-blur-md px-4 py-3 flex items-center gap-3 ${
            geocodePrecision === 'aproximado'
              ? 'bg-amber-500/10 border border-amber-500/20'
              : 'bg-blue-500/10 border border-blue-500/20'
          }`}>
            <span className="text-lg">{geocodePrecision === 'aproximado' ? '📍' : '📌'}</span>
            <div>
              <p className={`text-xs font-medium ${geocodePrecision === 'aproximado' ? 'text-amber-400' : 'text-blue-400'}`}>
                {geocodePrecision === 'aproximado'
                  ? 'Ubicación aproximada — usa Google Maps para navegar'
                  : geocodePrecision === 'cp'
                  ? 'Ubicación por código postal (zona general)'
                  : 'Ubicación por nombre de calle'}
              </p>
              <p className={`text-[10px] mt-0.5 ${geocodePrecision === 'aproximado' ? 'text-amber-400/60' : 'text-blue-400/60'}`}>
                {entregaActiva.direccion}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
