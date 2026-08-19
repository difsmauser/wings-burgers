'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ItemEstacion {
  id: string;
  productoId: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  comentario: string | null;
  personalizaciones: string[] | null;
  itemEstado: string;
}

interface PedidoEstacion {
  id: string;
  numero: string;
  estado: string;
  modalidad: string;
  mesaZona: string;
  meseroNombre: string;
  observaciones: string;
  creadoEn: string;
  items: ItemEstacion[];
  stationEstado: string;
}

function getCanal(pedido: PedidoEstacion): { label: string; color: string } {
  const obs = pedido.observaciones || '';
  if (pedido.modalidad === 'domicilio') return { label: '🛵 Domicilio', color: 'bg-green-500/10 text-green-400 border-green-500/20' };
  if (obs.includes('[PARA_LLEVAR]')) return { label: '🛍️ Para Llevar', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
  if (obs.includes('[MESERO]')) return { label: '🧑‍🍳 Mesero', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  if (obs.includes('[QR]')) return { label: '📱 QR Mesa', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
  return { label: '📋 Local', color: 'bg-white/5 text-gray-400 border-white/10' };
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function BarPage() {
  const [pedidos, setPedidos] = useState<PedidoEstacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const prevCount = useRef(0);

  const fetchPedidos = useCallback(async () => {
    try {
      const res = await fetch('/api/pedidos/estacion?tipo=bar');
      if (res.ok) {
        const json = await res.json();
        const data = (json.data || []) as PedidoEstacion[];

        // Sound on new orders
        const newPendientes = data.filter(p => p.stationEstado === 'pendiente').length;
        if (newPendientes > prevCount.current && prevCount.current > 0) playSound();
        prevCount.current = newPendientes;

        setPedidos(data);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 8000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  const playSound = () => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch { /* */ }
  };

  const advanceItem = async (itemId: string, nuevoEstado: string) => {
    setUpdatingId(itemId);
    try {
      await fetch('/api/pedidos/estacion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemEstado: nuevoEstado }),
      });
      await fetchPedidos();
    } catch { /* */ }
    finally { setUpdatingId(null); }
  };

  const advanceAllItems = async (pedido: PedidoEstacion, nuevoEstado: string) => {
    setUpdatingId(pedido.id);
    try {
      for (const item of pedido.items) {
        if (item.itemEstado !== nuevoEstado && item.itemEstado !== 'listo') {
          await fetch('/api/pedidos/estacion', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: item.id, itemEstado: nuevoEstado }),
          });
        }
      }
      await fetchPedidos();
    } catch { /* */ }
    finally { setUpdatingId(null); }
  };

  // Categorize by station status
  const pendientes = pedidos.filter(p => p.stationEstado === 'pendiente');
  const preparando = pedidos.filter(p => p.stationEstado === 'preparando');
  const listos = pedidos.filter(p => p.stationEstado === 'listo');

  // Only show today
  const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();
  const listosHoy = listos.filter(p => isToday(p.creadoEn));

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-56px)]">
      <div className="animate-spin h-8 w-8 border-2 border-purple-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden p-4 sm:p-6">
      {/* Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs text-gray-400">Nuevas: <span className="text-white font-bold">{pendientes.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-400" />
            <span className="text-xs text-gray-400">Preparando: <span className="text-white font-bold">{preparando.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400">Listas: <span className="text-white font-bold">{listosHoy.length}</span></span>
          </div>
        </div>
        <button onClick={fetchPedidos} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all">
          🔄 Actualizar
        </button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 md:h-[calc(100%-48px)] overflow-auto md:overflow-hidden">
        {/* Nuevas */}
        <BarColumn title="🔴 Nuevas" color="border-red-500/30" headerColor="text-red-400" pedidos={pendientes}
          buttonLabel="→ Preparar" buttonColor="bg-purple-500 hover:bg-purple-400"
          onAdvance={(p) => advanceAllItems(p, 'preparando')} updatingId={updatingId} />

        {/* Preparando */}
        <BarColumn title="🟣 Preparando" color="border-purple-500/30" headerColor="text-purple-400" pedidos={preparando}
          buttonLabel="✓ Listo" buttonColor="bg-green-500 hover:bg-green-400"
          onAdvance={(p) => advanceAllItems(p, 'listo')} updatingId={updatingId} />

        {/* Listas */}
        <BarColumn title="🟢 Listas (esperando mesero)" color="border-green-500/30" headerColor="text-green-400" pedidos={listosHoy}
          buttonLabel="" buttonColor="" onAdvance={() => {}} updatingId={null} readonly />
      </div>
    </div>
  );
}

function BarColumn({ title, color, headerColor, pedidos, buttonLabel, buttonColor, onAdvance, updatingId, readonly = false }: {
  title: string; color: string; headerColor: string; pedidos: PedidoEstacion[];
  buttonLabel: string; buttonColor: string; onAdvance: (p: PedidoEstacion) => void;
  updatingId: string | null; readonly?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-2xl bg-[#0a0a12]/80 backdrop-blur-sm border ${color} overflow-hidden shadow-[0_4px_30px_-10px_rgba(0,0,0,0.5)]`}>
      <div className="px-4 py-3.5 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
        <h2 className={`text-[11px] font-black uppercase tracking-[0.15em] ${headerColor}`}>{title}</h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color} ${headerColor}`}>{pedidos.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {pedidos.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-3xl block mb-2 opacity-20">🍸</span>
            <p className="text-gray-700 text-[10px] uppercase tracking-wider">Sin pedidos</p>
          </div>
        ) : (
          pedidos.map((pedido, i) => (
            <div key={pedido.id} className="animate-card-enter" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="rounded-xl bg-[#0d0d16] border border-white/[0.05] p-3.5 hover:border-purple-400/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.05)] transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-white">#{pedido.numero.split('-').pop()}</span>
                    {pedido.mesaZona && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">
                        📍 {pedido.mesaZona.split(' - ')[0]}
                      </span>
                    )}
                    {(() => { const canal = getCanal(pedido); return (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${canal.color}`}>{canal.label}</span>
                    ); })()}
                  </div>
                  <span className="text-[9px] text-gray-600 font-mono">{getTimeSince(pedido.creadoEn)}</span>
                </div>

                <div className="space-y-1 mb-3">
                  {pedido.items.map(item => (
                    <div key={item.id}>
                      <p className="text-[11px] text-gray-300">
                        <span className="text-purple-400 font-black">{item.cantidad}x</span> {item.nombre}
                      </p>
                      {item.personalizaciones && item.personalizaciones.length > 0 && (
                        <p className="text-[9px] text-amber-400/80 ml-4 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-amber-400" />
                          {Array.isArray(item.personalizaciones) ? item.personalizaciones.join(', ') : ''}
                        </p>
                      )}
                      {item.comentario && (
                        <p className="text-[9px] text-cyan-400/80 ml-4 italic flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-cyan-400" />
                          {item.comentario}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {!readonly && buttonLabel && (
                  <button onClick={() => onAdvance(pedido)} disabled={updatingId === pedido.id}
                    className={`relative w-full py-2.5 rounded-xl text-xs font-black text-black ${buttonColor} disabled:opacity-50 transition-all duration-300 active:scale-[0.95] overflow-hidden group`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative">{updatingId === pedido.id ? '⏳' : buttonLabel}</span>
                  </button>
                )}

                {readonly && (
                  <div className="py-2 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                    <span className="text-[10px] text-green-400 font-bold">
                      {pedido.meseroNombre ? `✓ ${pedido.meseroNombre}` : '⏳ Esperando mesero'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
