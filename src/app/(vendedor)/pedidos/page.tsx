'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ========== Types ==========

interface Pedido {
  id: string;
  numero: string;
  estado: string;
  modalidad: string;
  canal?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
  total: number;
  creadoEn: string;
  mesaZona?: string;
  observaciones?: string;
}

// ========== Constants ==========

const ESTADOS_FLOW = ['recibido', 'en_preparacion', 'empacado', 'listo', 'en_ruta', 'entregado'];

const ESTADO_LABELS: Record<string, string> = {
  recibido: 'Recibido',
  en_preparacion: 'En Preparación',
  empacado: 'Empaquetado',
  listo: 'Listo',
  en_ruta: 'En Ruta',
  entregado: 'Entregado',
  en_camino: 'En Camino',
  servido: 'Servido',
};

const ESTADO_COLORS: Record<string, string> = {
  recibido: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  en_preparacion: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  empacado: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  listo: 'bg-green-500/10 text-green-400 border-green-500/20',
  en_ruta: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  en_camino: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  entregado: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  servido: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const CANAL_BADGES: Record<string, { label: string; color: string }> = {
  QR: { label: '🟡 QR Mesa', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  QR_REDES: { label: '🟢 Domicilio', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  MESERO: { label: '🔵 Mesero', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
};

// ========== Helper Functions ==========

function getNextStatus(current: string, modalidad: string): string | null {
  // For LOCAL/RETIRO: recibido → en_preparacion → empacado → listo (stop)
  if (modalidad === 'local' || modalidad === 'retiro') {
    if (current === 'recibido') return 'en_preparacion';
    if (current === 'en_preparacion') return 'empacado';
    if (current === 'empacado') return 'listo';
    return null; // 'listo' is the end for local/retiro
  }

  // For DOMICILIO: recibido → en_preparacion → empacado → en_camino → entregado
  if (current === 'recibido') return 'en_preparacion';
  if (current === 'en_preparacion') return 'empacado';
  if (current === 'empacado') return 'en_camino';
  if (current === 'en_camino') return 'entregado';
  return null;
}

function parseCanal(observaciones?: string): string {
  if (!observaciones) return 'QR';
  const match = observaciones.match(/\[(QR|QR_REDES|MESERO)\]/);
  return match ? match[1] : 'QR';
}

// ========== Component ==========

export default function PedidosCocinaPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [prevCount, setPrevCount] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const fetchPedidos = useCallback(async () => {
    try {
      const estados = ['recibido', 'en_preparacion', 'empacado', 'en_camino', 'listo', 'entregado', 'servido'];
      const results = await Promise.all(
        estados.map(async (estado) => {
          const res = await fetch(`/api/pedidos?estado=${estado}`);
          if (!res.ok) return [];
          const json = await res.json();
          return (json.data || []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            numero: p.numero as string,
            estado: p.estado as string || estado,
            modalidad: p.modalidad as string || 'local',
            canal: parseCanal(p.observaciones as string | undefined),
            clienteNombre: p.clienteNombre as string || '',
            clienteTelefono: p.clienteTelefono as string || '',
            items: (p.items as Array<{ nombre: string; cantidad: number; precioUnitario: number }>) || [],
            total: p.total as number || 0,
            creadoEn: p.creadoEn as string || new Date().toISOString(),
            mesaZona: p.mesaZona as string || '',
            observaciones: p.observaciones as string || '',
          }));
        })
      );

      const todosPedidos = results.flat() as Pedido[];
      
      // Sound notification on new orders
      if (prevCount > 0 && todosPedidos.filter(p => p.estado === 'recibido').length > pedidos.filter(p => p.estado === 'recibido').length) {
        reproducirSonido();
      }
      setPrevCount(todosPedidos.filter(p => p.estado === 'recibido').length);
      setPedidos(todosPedidos);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [prevCount, pedidos]);

  const reproducirSonido = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.15);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } catch {
      // Audio not available
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdvanceStatus = async (pedido: Pedido) => {
    const next = getNextStatus(pedido.estado, pedido.modalidad);
    if (!next) return;

    setUpdatingId(pedido.id);
    try {
      await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: next }),
      });
      await fetchPedidos();
    } catch {
      // silent
    } finally {
      setUpdatingId(null);
    }
  };

  // Active orders (not entregado/servido, and not listo-for-local/retiro)
  const pedidosActivos = pedidos.filter(p =>
    !['entregado', 'servido', 'cancelado'].includes(p.estado) &&
    !(p.estado === 'listo' && (p.modalidad === 'local' || p.modalidad === 'retiro'))
  );

  const pedidosCompletados = pedidos.filter(p =>
    p.estado === 'entregado' ||
    p.estado === 'servido' ||
    (p.estado === 'listo' && (p.modalidad === 'local' || p.modalidad === 'retiro'))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">👨‍🍳</span>
              Cocina / Pedidos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {pedidosActivos.length} pedidos activos &bull; Auto-refresco cada 10s
            </p>
          </div>
          <button
            onClick={fetchPedidos}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            🔄 Actualizar
          </button>
        </div>

        {/* Active Orders */}
        {pedidosActivos.length === 0 ? (
          <div className="rounded-xl bg-[#16161f] border border-white/5 p-12 text-center">
            <span className="text-5xl block mb-3">🎉</span>
            <p className="text-gray-400">No hay pedidos pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pedidosActivos.map((pedido) => {
              const nextStatus = getNextStatus(pedido.estado, pedido.modalidad);
              const canal = CANAL_BADGES[pedido.canal || 'QR'] || CANAL_BADGES.QR;

              return (
                <div
                  key={pedido.id}
                  className="rounded-xl bg-[#16161f] border border-white/5 overflow-hidden hover:border-brand-400/20 transition-all duration-200"
                >
                  {/* Card header */}
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ESTADO_COLORS[pedido.estado] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                      {ESTADO_LABELS[pedido.estado] || pedido.estado}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${canal.color}`}>
                      {pedido.canal === 'QR' && pedido.mesaZona ? `🟡 ${pedido.mesaZona.split(' - ')[0]}` : canal.label}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white">#{pedido.numero}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(pedido.creadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Client info */}
                    {pedido.clienteNombre && (
                      <p className="text-xs text-gray-400">
                        👤 {pedido.clienteNombre}
                        {pedido.mesaZona && <span className="ml-2 text-brand-400">📍 {pedido.mesaZona}</span>}
                      </p>
                    )}

                    {/* Modalidad */}
                    <p className="text-xs text-gray-500 capitalize">
                      {pedido.modalidad === 'domicilio' ? '🛵 A domicilio' :
                       pedido.modalidad === 'retiro' ? '🏪 Retiro en sucursal' :
                       '🏠 Comer aquí'}
                    </p>

                    {/* Items */}
                    <div className="space-y-1 pt-2 border-t border-white/5">
                      {pedido.items?.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-300">{item.cantidad}x {item.nombre}</span>
                          <span className="text-gray-500">${(item.cantidad * item.precioUnitario).toFixed(0)}</span>
                        </div>
                      ))}
                      {(pedido.items?.length || 0) > 4 && (
                        <p className="text-[10px] text-gray-600">+{(pedido.items?.length || 0) - 4} más...</p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-xs text-gray-500">Total</span>
                      <span className="text-sm font-bold text-brand-400">${pedido.total?.toFixed(2)}</span>
                    </div>

                    {/* Next status button */}
                    {nextStatus && (
                      <button
                        onClick={() => handleAdvanceStatus(pedido)}
                        disabled={updatingId === pedido.id}
                        className="w-full mt-2 px-4 py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 shadow-lg shadow-brand-500/20 hover:shadow-xl disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
                      >
                        {updatingId === pedido.id ? 'Actualizando...' : `→ ${ESTADO_LABELS[nextStatus] || nextStatus}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed Today */}
        {pedidosCompletados.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Completados ({pedidosCompletados.length})
            </h2>
            <div className="rounded-xl bg-[#16161f] border border-white/5 divide-y divide-white/5">
              {pedidosCompletados.slice(0, 10).map((p) => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-green-400">✓</span>
                    <span className="text-white font-medium">#{p.numero}</span>
                    <span className="text-xs text-gray-500 capitalize">{p.modalidad}</span>
                  </div>
                  <span className="text-brand-400 font-medium">${p.total?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
