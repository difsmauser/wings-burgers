'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ItemEntrega {
  nombre: string;
  cantidad: number;
  precioTotal: number;
  comentario?: string;
}

interface Entrega {
  id: string;
  pedidoId: string;
  repartidorId?: string;
  numeroPedido: string;
  clienteNombre: string;
  direccion: string;
  telefono: string;
  estado: string;
  metodoPago?: string | null;
  estadoPago?: string;
  observaciones?: string;
  notas?: string;
  billeteCliente?: number | null;
  aceptadaEn?: string;
  total?: number;
  items?: ItemEntrega[];
}

// ============================================================================
// Main Page
// ============================================================================

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
        const miId = typeof window !== 'undefined' ? localStorage.getItem('alaburguer-repartidor-id') || '' : '';
        const misEntregas = miId
          ? data.filter((e: Entrega) => e.repartidorId === miId)
          : data;
        setPendientes(misEntregas.filter((e: Entrega) => e.estado === 'pendiente'));
        setActivas(misEntregas.filter((e: Entrega) => e.estado === 'en_camino'));
        setCompletadas(misEntregas.filter((e: Entrega) => e.estado === 'entregado' || e.estado === 'fallido'));
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchEntregas();
    const interval = setInterval(fetchEntregas, 10000);
    return () => clearInterval(interval);
  }, [fetchEntregas]);

  // GPS tracking cuando hay entregas activas
  useEffect(() => {
    if (activas.length > 0 && !watchRef.current) {
      if (navigator.geolocation) {
        watchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            setGpsActive(true);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis Entregas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activas.length} activa{activas.length !== 1 ? 's' : ''} &bull; {pendientes.length} disponible{pendientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {gpsActive && (
            <span className="flex items-center gap-1.5 text-[10px] text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> GPS
            </span>
          )}
          <button onClick={fetchEntregas} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-white/5 border border-white/10 hover:text-white transition-all active:scale-95">
            🔄
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* ENTREGAS ACTIVAS (En Camino) */}
      {/* ================================================================ */}
      {activas.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3">🚀 En Camino ({activas.length})</h2>
          <div className="space-y-4">
            {activas.map(e => (
              <EntregaActivaCard
                key={e.id}
                entrega={e}
                actionLoading={actionLoading}
                onComplete={completarEntrega}
                onRefresh={fetchEntregas}
              />
            ))}
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* ENTREGAS DISPONIBLES (Pendientes) */}
      {/* ================================================================ */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          📦 Entregas Disponibles
        </h2>
        {pendientes.length === 0 ? (
          <div className="rounded-2xl bg-[#16161f] border border-white/5 p-8 text-center">
            <span className="text-4xl block mb-2">☕</span>
            <p className="text-gray-400 text-sm">No hay entregas pendientes</p>
            <p className="text-gray-600 text-[10px] mt-1">Se actualiza cada 10 segundos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendientes.map(e => (
              <EntregaPendienteCard
                key={e.id}
                entrega={e}
                actionLoading={actionLoading}
                activasCount={activas.length}
                onAceptar={aceptarEntrega}
              />
            ))}
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* COMPLETADAS HOY */}
      {/* ================================================================ */}
      {completadas.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            ✅ Completadas Hoy ({completadas.length})
          </h2>
          <div className="rounded-2xl bg-[#16161f] border border-white/5 divide-y divide-white/5">
            {completadas.slice(0, 10).map(e => (
              <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${e.estado === 'fallido' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {e.estado === 'fallido' ? '✗' : '✓'}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white">#{e.numeroPedido}</span>
                    <span className="text-xs text-gray-500 ml-2">{e.clienteNombre}</span>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-500">${e.total || 0}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================================
// Componente: Card de entrega activa (en camino) — SUPER DESCRIPTIVA
// ============================================================================

function EntregaActivaCard({ entrega: e, actionLoading, onComplete, onRefresh }: {
  entrega: Entrega;
  actionLoading: string | null;
  onComplete: (id: string) => void;
  onRefresh: () => void;
}) {
  const esEfectivo = e.metodoPago === 'efectivo';
  const esTransferencia = e.metodoPago === 'transferencia';
  const tiempoMin = e.aceptadaEn ? Math.floor((Date.now() - new Date(e.aceptadaEn).getTime()) / 60000) : 0;

  return (
    <div className="rounded-2xl bg-[#16161f] border border-green-500/20 overflow-hidden shadow-lg shadow-green-500/5">
      {/* Header con número + timer */}
      <div className="bg-green-500/5 border-b border-green-500/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
            <span className="text-[10px]">🛵</span>
          </span>
          <span className="text-sm font-bold text-white">#{e.numeroPedido}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            esEfectivo ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : esTransferencia ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {esEfectivo ? '💵 Efectivo' : esTransferencia ? '📱 Transfer' : '💳 Pagado'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-green-400">${e.total || 0}</span>
          <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">
            ⏱ {tiempoMin} min
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* === DIRECCIÓN (PROMINENTE) === */}
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
          <div className="flex items-start gap-2.5">
            <span className="text-lg mt-0.5">📍</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Dirección de entrega</p>
              <p className="text-sm font-semibold text-white leading-snug">
                {e.direccion}
              </p>
              {e.notas && (
                <p className="text-[11px] text-gray-400 mt-1 italic">📝 {e.notas}</p>
              )}
            </div>
          </div>
        </div>

        {/* === CLIENTE === */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            <span className="text-sm">👤</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{e.clienteNombre}</p>
            {e.telefono && (
              <a href={`tel:${e.telefono}`} className="text-xs text-brand-400 hover:underline">
                📞 {e.telefono}
              </a>
            )}
          </div>
          {e.telefono && (
            <a
              href={`tel:${e.telefono}`}
              className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center hover:bg-green-500/20 transition-all active:scale-90"
              aria-label="Llamar al cliente"
            >
              <span className="text-lg">📞</span>
            </a>
          )}
        </div>

        {/* === QUÉ LLEVA (Items del pedido) === */}
        {e.items && e.items.length > 0 && (
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">🛒 Qué lleva</p>
            <div className="space-y-1.5">
              {e.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-brand-400 font-bold w-5 text-center">{item.cantidad}x</span>
                    <span className="text-xs text-white truncate">{item.nombre}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 flex-shrink-0">${item.precioTotal}</span>
                </div>
              ))}
            </div>
            {e.items.some(i => i.comentario) && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                {e.items.filter(i => i.comentario).map((item, idx) => (
                  <p key={idx} className="text-[10px] text-gray-500 italic">
                    💬 {item.nombre}: {item.comentario}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === INFO DE PAGO === */}
        <div className={`rounded-xl p-3 border ${
          esEfectivo ? 'bg-green-500/5 border-green-500/10'
          : esTransferencia ? 'bg-purple-500/5 border-purple-500/10'
          : 'bg-white/[0.02] border-white/5'
        }`}>
          {esEfectivo && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-green-400">💵 Cobrar al entregar</p>
              <p className="text-lg font-black text-white">${e.total}</p>
              {e.billeteCliente ? (
                <p className="text-xs text-amber-400">
                  ⚠️ Paga con ${e.billeteCliente} → Llevar cambio: ${e.billeteCliente - (e.total || 0)}
                </p>
              ) : (
                <p className="text-xs text-gray-500">Preguntar con cuánto paga</p>
              )}
            </div>
          )}
          {esTransferencia && (
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <div>
                <p className="text-xs font-bold text-purple-400">Ya pagó por transferencia</p>
                <p className="text-[10px] text-gray-500">Solo entregar, no cobrar nada</p>
              </div>
            </div>
          )}
          {!esEfectivo && !esTransferencia && (
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <div>
                <p className="text-xs font-bold text-blue-400">Pago procesado</p>
                <p className="text-[10px] text-gray-500">Solo entregar el pedido</p>
              </div>
            </div>
          )}
        </div>

        {/* === ACCIÓN === */}
        {esEfectivo ? (
          <EntregaCobroEfectivo
            entregaId={e.id}
            pedidoId={e.pedidoId}
            total={e.total || 0}
            billeteCliente={e.billeteCliente || null}
            onComplete={onRefresh}
          />
        ) : (
          <button
            onClick={() => onComplete(e.id)}
            disabled={actionLoading === e.id}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-green-400 to-green-500 shadow-lg shadow-green-500/20 disabled:opacity-50 transition-all active:scale-[0.97]"
          >
            {actionLoading === e.id ? '⏳ Procesando...' : '✓ Pedido Entregado'}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Componente: Card de entrega pendiente — DESCRIPTIVA
// ============================================================================

function EntregaPendienteCard({ entrega: e, actionLoading, activasCount, onAceptar }: {
  entrega: Entrega;
  actionLoading: string | null;
  activasCount: number;
  onAceptar: (id: string) => void;
}) {
  const esEfectivo = e.metodoPago === 'efectivo';

  return (
    <div className="rounded-2xl bg-[#16161f] border border-white/5 hover:border-brand-500/20 transition-all overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">#{e.numeroPedido}</span>
          {esEfectivo && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              💵 Efectivo
            </span>
          )}
        </div>
        <span className="text-sm font-bold text-brand-400">${e.total || 0}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Dirección PROMINENTE */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 border border-red-500/20 mt-0.5">
            <span className="text-sm">📍</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider">Entregar en</p>
            <p className="text-sm font-medium text-white leading-snug">{e.direccion}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="flex items-center gap-2.5 px-0.5">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
            <span className="text-xs">👤</span>
          </div>
          <div>
            <p className="text-xs font-medium text-white">{e.clienteNombre}</p>
            {e.telefono && <p className="text-[10px] text-gray-500">{e.telefono}</p>}
          </div>
        </div>

        {/* Items resumen */}
        {e.items && e.items.length > 0 && (
          <div className="bg-white/[0.02] rounded-lg px-3 py-2 border border-white/5">
            <p className="text-[10px] text-gray-500 mb-1">
              {e.items.length} producto{e.items.length !== 1 ? 's' : ''}:
            </p>
            <p className="text-xs text-gray-300 truncate">
              {e.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
            </p>
          </div>
        )}

        {/* Info pago si efectivo */}
        {esEfectivo && e.billeteCliente && (
          <div className="bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10">
            <p className="text-[10px] text-amber-400 font-medium">
              ⚠️ Cobrar ${e.total} — cliente paga con ${e.billeteCliente} (cambio: ${e.billeteCliente - (e.total || 0)})
            </p>
          </div>
        )}

        {/* Notas */}
        {e.notas && (
          <p className="text-[10px] text-gray-500 italic px-1">📝 {e.notas}</p>
        )}

        {/* Botón aceptar */}
        <button
          onClick={() => onAceptar(e.id)}
          disabled={actionLoading === e.id || activasCount >= 3}
          className="w-full py-3 rounded-xl text-sm font-bold text-white bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
        >
          {actionLoading === e.id ? '⏳ Aceptando...' : activasCount >= 3 ? '🚫 Máximo 3 activas' : '🛵 Aceptar Entrega'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Componente: Cobro efectivo del repartidor
// ============================================================================

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
        className="w-full py-3.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-green-400 to-green-500 shadow-lg shadow-green-500/20 transition-all active:scale-[0.97]"
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

  return (
    <div className="space-y-3 rounded-xl bg-[#0d0d14] border border-green-500/10 p-4">
      <p className="text-xs font-bold text-white text-center">¿Con cuánto pagó el cliente?</p>

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

      <input
        type="number"
        placeholder="Otro monto..."
        value={montoCustom}
        onChange={(e) => { setMontoCustom(e.target.value); setBillete(Number(e.target.value) || null); }}
        className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-400/30"
      />

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
