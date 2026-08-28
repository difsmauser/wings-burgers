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
  metodoPago?: string | null;
  estadoPago?: string;
  observaciones?: string;
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
      // Obtener nombre del repartidor logueado para filtrar solo sus entregas
      const miNombre = typeof window !== 'undefined' ? localStorage.getItem('alaburguer-repartidor-nombre') || '' : '';
      const url = miNombre ? `/api/entregas?nombre=${encodeURIComponent(miNombre)}` : '/api/entregas';
      const res = await fetch(url);
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
            {activas.map(e => {
              // Info de pago del pedido
              const esEfectivo = e.metodoPago === 'efectivo';
              const esTransferencia = e.metodoPago === 'transferencia';
              const billeteMatch = e.observaciones?.match(/Paga con \$(\d+)/);
              const billeteCliente = billeteMatch ? parseInt(billeteMatch[1], 10) : null;

              return (
                <div key={e.id} className="rounded-2xl bg-[#16161f] border border-brand-500/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">#{e.numeroPedido}</span>
                    <span className="text-[10px] text-brand-400">{e.aceptadaEn ? `Hace ${Math.floor((Date.now() - new Date(e.aceptadaEn).getTime()) / 60000)} min` : ''}</span>
                  </div>

                  {/* Cliente + dirección */}
                  <div className="rounded-xl bg-black/20 p-3 space-y-1.5">
                    <p className="text-sm text-white font-medium">👤 {e.clienteNombre}</p>
                    <p className="text-xs text-gray-400">📍 {e.direccion}</p>
                    <p className="text-xs text-gray-500">📞 <a href={`tel:${e.telefono}`} className="text-brand-400 hover:underline">{e.telefono}</a></p>
                  </div>

                  {/* Info de pago */}
                  <div className={`rounded-xl p-3 border ${esEfectivo ? 'bg-green-500/5 border-green-500/10' : esTransferencia ? 'bg-purple-500/5 border-purple-500/10' : 'bg-white/[0.02] border-white/5'}`}>
                    {esEfectivo && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-green-400">💵 Cobrar en efectivo</p>
                        <p className="text-sm font-black text-white">Total: ${e.total}</p>
                        {billeteCliente && (
                          <p className="text-xs text-brand-400">Cliente paga con: ${billeteCliente} → Cambio: ${billeteCliente - (e.total || 0)}</p>
                        )}
                        {!billeteCliente && (
                          <p className="text-xs text-gray-500">Monto exacto o preguntar al cliente</p>
                        )}
                      </div>
                    )}
                    {esTransferencia && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-purple-400">🏦 Transferencia — ya pagado</p>
                        <p className="text-xs text-gray-400">Solo entregar pedido, no cobrar</p>
                      </div>
                    )}
                    {!esEfectivo && !esTransferencia && (
                      <p className="text-xs text-gray-500">💰 Total: ${e.total}</p>
                    )}
                  </div>

                  {/* Botón de completar */}
                  {esEfectivo ? (
                    <EntregaCobroEfectivo
                      entregaId={e.id}
                      pedidoId={e.pedidoId}
                      total={e.total || 0}
                      billeteCliente={billeteCliente}
                      onComplete={fetchEntregas}
                    />
                  ) : (
                    <button
                      onClick={() => completarEntrega(e.id)}
                      disabled={actionLoading === e.id}
                      className="w-full py-3 rounded-xl text-sm font-bold text-black bg-green-500 hover:bg-green-400 disabled:opacity-50 transition-all active:scale-[0.97]"
                    >
                      {actionLoading === e.id ? '⏳ Procesando...' : '✓ Pedido Entregado'}
                    </button>
                  )}
                </div>
              );
            })}
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


// ============================================================
// Componente: Cobro efectivo del repartidor
// ============================================================

function EntregaCobroEfectivo({ entregaId, pedidoId, total, billeteCliente, onComplete }: {
  entregaId: string;
  pedidoId: string;
  total: number;
  billeteCliente: number | null;
  onComplete: () => void;
}) {
  const [paso, setPaso] = useState<'entregar' | 'cobrar' | 'procesando'>('entregar');
  const [billete, setBillete] = useState<number | null>(billeteCliente);
  const [montoCustom, setMontoCustom] = useState('');

  const montoReal = billete === 0 ? total : (billete ?? 0);
  const cambio = montoReal > total ? montoReal - total : 0;

  const confirmarCobro = async () => {
    setPaso('procesando');
    try {
      // Confirmar cobro con caja
      await fetch('/api/pagos/confirmar-cobro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoIds: [pedidoId],
          metodoPago: 'efectivo',
          billete: montoReal,
          cambio,
        }),
      });
      // Completar entrega
      await fetch(`/api/entregas/${entregaId}/completar`, { method: 'POST' });
      onComplete();
    } catch {
      setPaso('cobrar');
    }
  };

  if (paso === 'entregar') {
    return (
      <button
        onClick={() => setPaso('cobrar')}
        className="w-full py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-green-400 to-green-500 shadow-lg shadow-green-500/20 transition-all active:scale-[0.97]"
      >
        💵 Llegué — Cobrar ${total}
      </button>
    );
  }

  if (paso === 'procesando') {
    return (
      <div className="py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
        <span className="text-xs text-green-400 font-bold">⏳ Confirmando cobro...</span>
      </div>
    );
  }

  // paso === 'cobrar'
  return (
    <div className="space-y-3 rounded-xl bg-[#0d0d14] border border-green-500/10 p-4">
      <p className="text-xs font-bold text-white text-center">¿Con cuánto pagó el cliente?</p>

      {/* Selector de billete */}
      <div className="grid grid-cols-3 gap-2">
        {[0, 50, 100, 200, 500, 1000].map(monto => (
          <button
            key={monto}
            onClick={() => { setBillete(monto); setMontoCustom(''); }}
            className={`py-2 rounded-lg text-xs font-bold border transition-all ${
              billete === monto
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-white/[0.02] text-gray-400 border-white/[0.06]'
            }`}
          >
            {monto === 0 ? 'Exacto' : `$${monto}`}
          </button>
        ))}
      </div>

      {/* Custom */}
      <input
        type="number"
        placeholder="Otro monto..."
        value={montoCustom}
        onChange={(e) => { setMontoCustom(e.target.value); setBillete(Number(e.target.value) || null); }}
        className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-400/30"
      />

      {/* Cambio */}
      {billete !== null && billete !== 0 && montoReal >= total && (
        <div className="py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
          <p className="text-xs text-amber-400 font-bold">Cambio: ${cambio}</p>
        </div>
      )}

      {billete === 0 && (
        <div className="py-2 rounded-lg bg-green-500/5 border border-green-500/10 text-center">
          <p className="text-xs text-green-400 font-bold">Pago exacto ✓</p>
        </div>
      )}

      {/* Confirmar */}
      <button
        onClick={confirmarCobro}
        disabled={billete === null || (billete !== 0 && montoReal < total)}
        className="w-full py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-green-400 to-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
      >
        ✓ Confirmar Cobro — ${total}
      </button>
    </div>
  );
}
