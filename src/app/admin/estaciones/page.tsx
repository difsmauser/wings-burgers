'use client';

import { useState, useEffect, useCallback } from 'react';

interface ItemEstacion {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  comentario: string | null;
  personalizaciones: unknown[];
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
  if (pedido.modalidad === 'domicilio') return { label: 'Domicilio', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
  if (obs.includes('[PARA_LLEVAR]')) return { label: 'Para Llevar', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  if (obs.includes('[QR]')) return { label: 'QR Mesa', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
  return { label: 'Local', color: 'text-gray-400 bg-white/5 border-white/10' };
}

function timeSince(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return '< 1m';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function EstacionesPage() {
  const [cocinaPedidos, setCocinaPedidos] = useState<PedidoEstacion[]>([]);
  const [barPedidos, setBarPedidos] = useState<PedidoEstacion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [cocinaRes, barRes] = await Promise.all([
        fetch('/api/pedidos/estacion?tipo=cocina'),
        fetch('/api/pedidos/estacion?tipo=bar'),
      ]);

      if (cocinaRes.ok) {
        const cj = await cocinaRes.json();
        setCocinaPedidos(cj.data || []);
      }
      if (barRes.ok) {
        const bj = await barRes.json();
        setBarPedidos(bj.data || []);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const cocinaStats = {
    pendientes: cocinaPedidos.filter(p => p.stationEstado === 'pendiente').length,
    preparando: cocinaPedidos.filter(p => p.stationEstado === 'preparando').length,
    listos: cocinaPedidos.filter(p => p.stationEstado === 'listo').length,
  };

  const barStats = {
    pendientes: barPedidos.filter(p => p.stationEstado === 'pendiente').length,
    preparando: barPedidos.filter(p => p.stationEstado === 'preparando').length,
    listos: barPedidos.filter(p => p.stationEstado === 'listo').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-2 border-brand-400/30 border-t-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">🔥 Estaciones: Cocina & Bar</h1>
          <p className="text-sm text-gray-500 mt-1">Vista en tiempo real de pedidos por estación</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5 text-xs font-medium transition-all">
          ↻ Actualizar
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cocina Stats */}
        <div className="bg-[#12121a] rounded-xl border border-fire-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔥</span>
            <h3 className="text-sm font-bold text-white">Cocina</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-lg font-black text-red-400">{cocinaStats.pendientes}</p>
              <p className="text-[9px] text-gray-500 uppercase">Nuevas</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <p className="text-lg font-black text-amber-400">{cocinaStats.preparando}</p>
              <p className="text-[9px] text-gray-500 uppercase">Preparando</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-500/5 border border-green-500/10">
              <p className="text-lg font-black text-green-400">{cocinaStats.listos}</p>
              <p className="text-[9px] text-gray-500 uppercase">Listos</p>
            </div>
          </div>
        </div>

        {/* Bar Stats */}
        <div className="bg-[#12121a] rounded-xl border border-purple-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🍸</span>
            <h3 className="text-sm font-bold text-white">Bar</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-lg font-black text-red-400">{barStats.pendientes}</p>
              <p className="text-[9px] text-gray-500 uppercase">Nuevas</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
              <p className="text-lg font-black text-purple-400">{barStats.preparando}</p>
              <p className="text-[9px] text-gray-500 uppercase">Preparando</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-500/5 border border-green-500/10">
              <p className="text-lg font-black text-green-400">{barStats.listos}</p>
              <p className="text-[9px] text-gray-500 uppercase">Listos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Pedidos Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cocina Column */}
        <div className="bg-[#12121a] rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-fire-500/10 bg-fire-500/[0.02]">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              🔥 Pedidos Cocina
              <span className="px-2 py-0.5 rounded-full bg-fire-500/10 text-fire-400 text-[10px] font-bold">{cocinaPedidos.length}</span>
            </h2>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
            {cocinaPedidos.map(p => (
              <StationOrderRow key={p.id} pedido={p} stationColor="fire" />
            ))}
            {cocinaPedidos.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No hay pedidos en cocina</div>
            )}
          </div>
        </div>

        {/* Bar Column */}
        <div className="bg-[#12121a] rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-purple-500/10 bg-purple-500/[0.02]">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              🍸 Pedidos Bar
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold">{barPedidos.length}</span>
            </h2>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
            {barPedidos.map(p => (
              <StationOrderRow key={p.id} pedido={p} stationColor="purple" />
            ))}
            {barPedidos.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No hay pedidos en bar</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StationOrderRow({ pedido, stationColor }: { pedido: PedidoEstacion; stationColor: string }) {
  const canal = getCanal(pedido);
  const time = timeSince(pedido.creadoEn);
  const statusColor = pedido.stationEstado === 'listo' ? 'bg-green-500/10 text-green-400 border-green-500/20'
    : pedido.stationEstado === 'preparando' ? (stationColor === 'purple' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')
    : 'bg-red-500/10 text-red-400 border-red-500/20';
  const statusLabel = pedido.stationEstado === 'listo' ? '✓ Listo' : pedido.stationEstado === 'preparando' ? '⏳ Preparando' : '● Nuevo';

  return (
    <div className="p-3 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">#{pedido.numero}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${canal.color} font-medium`}>{canal.label}</span>
          {pedido.mesaZona && <span className="text-[9px] text-gray-500">{pedido.mesaZona}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{time}</span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${statusColor}`}>{statusLabel}</span>
        </div>
      </div>
      {/* Items */}
      <div className="space-y-0.5">
        {pedido.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-gray-300">
              <span className="text-brand-400 font-bold mr-1">{item.cantidad}x</span>
              {item.nombre}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
              item.itemEstado === 'listo' ? 'bg-green-500/10 text-green-400'
              : item.itemEstado === 'preparando' ? 'bg-amber-500/10 text-amber-400'
              : 'bg-white/5 text-gray-500'
            }`}>
              {item.itemEstado}
            </span>
          </div>
        ))}
      </div>
      {/* Mesero assigned */}
      {pedido.meseroNombre && pedido.stationEstado === 'listo' && (
        <p className="mt-1.5 text-[10px] text-green-400 font-medium">🧑‍🍳 Mesero: {pedido.meseroNombre}</p>
      )}
    </div>
  );
}
