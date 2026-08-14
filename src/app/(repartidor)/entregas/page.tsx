'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Entrega {
  id: string;
  pedidoId: string;
  numeroPedido: string;
  clienteNombre: string;
  direccion: string;
  telefono: string;
  estado: string;
  aceptadaEn?: string;
  total?: number;
}

export default function EntregasPage() {
  const [pendientes, setPendientes] = useState<Entrega[]>([]);
  const [activas, setActivas] = useState<Entrega[]>([]);
  const [completadas, setCompletadas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const watchRef = useRef<number | null>(null);

  const fetchEntregas = useCallback(async () => {
    try {
      const res = await fetch('/api/entregas');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setPendientes(data.filter((e: Entrega) => e.estado === 'pendiente'));
        setActivas(data.filter((e: Entrega) => e.estado === 'en_camino'));
        setCompletadas(data.filter((e: Entrega) => e.estado === 'entregado' || e.estado === 'fallido'));
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchEntregas();
    const interval = setInterval(fetchEntregas, 10000);
    return () => clearInterval(interval);
  }, [fetchEntregas]);

  // GPS tracking
  useEffect(() => {
    if (activas.length > 0 && !watchRef.current) {
      if (navigator.geolocation) {
        watchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            setGpsActive(true);
            // Send position to server
            fetch('/api/entregas/ubicacion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            }).catch(() => {});
          },
          () => setGpsActive(false),
          { enableHighAccuracy: true, maximumAge: 10000 }
        );
      }
    } else if (activas.length === 0 && watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setGpsActive(false);
    }
  }, [activas.length]);

  const aceptarEntrega = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/entregas/${id}/aceptar`, { method: 'POST' });
      await fetchEntregas();
    } catch { /* */ }
    finally { setActionLoading(null); }
  };

  const completarEntrega = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/entregas/${id}/completar`, { method: 'POST' });
      await fetchEntregas();
    } catch { /* */ }
    finally { setActionLoading(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-56px)]">
      <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis Entregas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activas.length} activas &bull; {pendientes.length} disponibles</p>
        </div>
        <div className="flex items-center gap-3">
          {gpsActive && (
            <span className="flex items-center gap-1.5 text-[10px] text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> GPS activo
            </span>
          )}
          <button onClick={fetchEntregas} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-white/5 border border-white/10 hover:text-white transition-all">🔄</button>
        </div>
      </div>

      {/* Active deliveries */}
      {activas.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-3">🚀 En Camino</h2>
          <div className="space-y-3">
            {activas.map(e => (
              <div key={e.id} className="rounded-xl bg-[#16161f] border border-brand-500/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">#{e.numeroPedido}</span>
                  <span className="text-[10px] text-brand-400">{e.aceptadaEn ? `Hace ${Math.floor((Date.now() - new Date(e.aceptadaEn).getTime()) / 60000)} min` : ''}</span>
                </div>
                <p className="text-sm text-white mb-1">👤 {e.clienteNombre}</p>
                <p className="text-xs text-gray-400 mb-1">📍 {e.direccion}</p>
                <p className="text-xs text-gray-500 mb-3">📞 <a href={`tel:${e.telefono}`} className="text-brand-400 hover:underline">{e.telefono}</a></p>
                <button
                  onClick={() => completarEntrega(e.id)}
                  disabled={actionLoading === e.id}
                  className="w-full py-2.5 rounded-lg text-xs font-bold text-black bg-green-500 hover:bg-green-400 disabled:opacity-50 transition-all active:scale-[0.97]"
                >
                  {actionLoading === e.id ? 'Procesando...' : '✓ Entrega Completada'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending deliveries */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📦 Entregas Disponibles</h2>
        {pendientes.length === 0 ? (
          <div className="rounded-xl bg-[#16161f] border border-white/5 p-8 text-center">
            <span className="text-4xl block mb-2">☕</span>
            <p className="text-gray-400 text-sm">No hay entregas pendientes</p>
            <p className="text-gray-600 text-[10px] mt-1">Se actualiza cada 10 segundos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendientes.map(e => (
              <div key={e.id} className="rounded-xl bg-[#16161f] border border-white/5 p-4 hover:border-green-500/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">#{e.numeroPedido}</span>
                  {e.total && <span className="text-xs font-bold text-brand-400">${e.total}</span>}
                </div>
                <p className="text-xs text-gray-400 mb-1">👤 {e.clienteNombre}</p>
                <p className="text-xs text-gray-500 mb-3">📍 {e.direccion}</p>
                <button
                  onClick={() => aceptarEntrega(e.id)}
                  disabled={actionLoading === e.id || activas.length >= 3}
                  className="w-full py-2 rounded-lg text-xs font-bold text-white bg-brand-500 hover:bg-brand-400 disabled:opacity-50 transition-all active:scale-[0.97]"
                >
                  {actionLoading === e.id ? 'Aceptando...' : activas.length >= 3 ? 'Máximo 3 activas' : '✋ Aceptar Entrega'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completed today */}
      {completadas.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">✅ Completadas Hoy ({completadas.length})</h2>
          <div className="rounded-xl bg-[#16161f] border border-white/5 divide-y divide-white/5">
            {completadas.slice(0, 10).map(e => (
              <div key={e.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-white font-medium">#{e.numeroPedido}</span>
                  <span className="text-gray-500">{e.clienteNombre}</span>
                </div>
                <span className="text-gray-600">{e.estado === 'fallido' ? '❌ Fallida' : '✅'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
