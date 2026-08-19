'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ItemEstacion {
  id: string;
  productoId: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  comentario: string | null;
  personalizaciones: Array<{ nombre?: string; opcion?: string; precioExtra?: number }> | string[] | null;
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

function getCanal(pedido: PedidoEstacion): { label: string; icon: string; color: string; bg: string } {
  const obs = pedido.observaciones || '';
  if (pedido.modalidad === 'domicilio') return { label: 'Domicilio', icon: '🛵', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
  if (obs.includes('[PARA_LLEVAR]')) return { label: 'Para Llevar', icon: '🛍️', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  if (obs.includes('[MESERO]')) return { label: 'Mesero', icon: '🧑‍🍳', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
  if (obs.includes('[QR]')) return { label: 'QR Mesa', icon: '📱', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
  return { label: 'Local', icon: '📋', color: 'text-gray-400', bg: 'bg-white/5 border-white/10' };
}

function getTimeSince(dateStr: string): { text: string; urgent: boolean; critical: boolean } {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return { text: '< 1 min', urgent: false, critical: false };
  if (mins < 5) return { text: `${mins} min`, urgent: false, critical: false };
  if (mins < 10) return { text: `${mins} min`, urgent: true, critical: false };
  if (mins < 60) return { text: `${mins} min`, urgent: true, critical: true };
  return { text: `${Math.floor(mins / 60)}h ${mins % 60}m`, urgent: true, critical: true };
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
    const interval = setInterval(fetchPedidos, 6000);
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

  const advanceAllItems = async (pedido: PedidoEstacion, nuevoEstado: string) => {
    setUpdatingId(pedido.id);
    try {
      for (const item of pedido.items) {
        if (item.itemEstado !== 'listo') {
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

  const pendientes = pedidos.filter(p => p.stationEstado === 'pendiente');
  const preparando = pedidos.filter(p => p.stationEstado === 'preparando');
  const listos = pedidos.filter(p => p.stationEstado === 'listo');

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#08080d]">
      <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin" />
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-[#08080d] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#0c0c14] border-b border-purple-500/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <span className="text-lg">🍸</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Bar</h1>
            <p className="text-[9px] text-purple-400 uppercase tracking-wider font-medium">Bebidas / Drinks Station</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Stat label="Nuevas" value={pendientes.length} color="text-red-400" dot="bg-red-400" pulse />
          <Stat label="Preparando" value={preparando.length} color="text-purple-400" dot="bg-purple-400" />
          <Stat label="Listas" value={listos.length} color="text-green-400" dot="bg-green-400" />
          <button onClick={fetchPedidos} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <button onClick={() => { fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }} className="px-3 py-1.5 rounded-lg text-[10px] font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all">
            Salir
          </button>
        </div>
      </header>

      {/* Kanban Grid */}
      <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
        <BarColumn
          title="Nuevas" icon="🔴" color="red"
          pedidos={pendientes}
          buttonLabel="Preparar"
          onAction={(p) => advanceAllItems(p, 'preparando')}
          updatingId={updatingId}
        />
        <BarColumn
          title="Preparando" icon="🟣" color="purple"
          pedidos={preparando}
          buttonLabel="✓ Listo"
          onAction={(p) => advanceAllItems(p, 'listo')}
          updatingId={updatingId}
        />
        <BarColumn
          title="Listas" icon="🟢" color="green"
          pedidos={listos}
          buttonLabel=""
          onAction={() => {}}
          updatingId={null}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, color, dot, pulse }: { label: string; value: number; color: string; dot: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${dot} ${pulse && value > 0 ? 'animate-pulse' : ''}`} />
      <span className="text-[11px] text-gray-500">{label}: <span className={`font-bold ${color}`}>{value}</span></span>
    </div>
  );
}

function BarColumn({ title, icon, color, pedidos, buttonLabel, onAction, updatingId }: {
  title: string; icon: string; color: string; pedidos: PedidoEstacion[];
  buttonLabel: string; onAction: (p: PedidoEstacion) => void; updatingId: string | null;
}) {
  const borderMap: Record<string, string> = { red: 'border-red-500/20', purple: 'border-purple-500/20', green: 'border-green-500/20' };
  const headerMap: Record<string, string> = { red: 'text-red-400', purple: 'text-purple-400', green: 'text-green-400' };
  const btnMap: Record<string, string> = { red: 'bg-purple-500 hover:bg-purple-400', purple: 'bg-green-500 hover:bg-green-400', green: '' };

  return (
    <div className="flex flex-col border-r border-white/[0.04] last:border-r-0 bg-[#0a0a11]">
      <div className={`px-4 py-3 border-b ${borderMap[color]} flex items-center justify-between`}>
        <h2 className={`text-[11px] font-black uppercase tracking-wider ${headerMap[color]}`}>{icon} {title}</h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${borderMap[color]} ${headerMap[color]}`}>{pedidos.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30">
            <span className="text-4xl mb-2">🍸</span>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Sin pedidos</p>
          </div>
        ) : pedidos.map((pedido) => (
          <BarCard key={pedido.id} pedido={pedido} buttonLabel={buttonLabel} buttonColor={btnMap[color]} onAction={() => onAction(pedido)} updating={updatingId === pedido.id} />
        ))}
      </div>
    </div>
  );
}

function BarCard({ pedido, buttonLabel, buttonColor, onAction, updating }: {
  pedido: PedidoEstacion; buttonLabel: string; buttonColor: string; onAction: () => void; updating: boolean;
}) {
  const canal = getCanal(pedido);
  const timer = getTimeSince(pedido.creadoEn);

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-300 ${
      timer.critical ? 'bg-red-500/[0.03] border-red-500/30' :
      timer.urgent ? 'bg-purple-500/[0.02] border-purple-500/20' :
      'bg-[#0d0d16] border-white/[0.06] hover:border-purple-400/20'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-white">#{pedido.numero.split('-').pop()}</span>
          <span className={`text-[9px] px-2 py-0.5 rounded-lg border font-semibold ${canal.bg} ${canal.color}`}>
            {canal.icon} {canal.label}
          </span>
          {pedido.mesaZona && (
            <span className="text-[9px] px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
              📍 {pedido.mesaZona.split(' - ')[0]}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${
          timer.critical ? 'bg-red-500/20 text-red-400' :
          timer.urgent ? 'bg-purple-500/10 text-purple-400' :
          'text-gray-500'
        }`}>
          {timer.text}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1.5 mb-3">
        {pedido.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="text-xs font-black text-purple-400 w-6">{item.cantidad}×</span>
            <div className="flex-1">
              <p className="text-xs text-white font-medium">{item.nombre}</p>
              {item.personalizaciones && item.personalizaciones.length > 0 && (
                <p className="text-[9px] text-purple-400/80 mt-0.5">⚡ {Array.isArray(item.personalizaciones) ? item.personalizaciones.map((p) => typeof p === 'string' ? p : `${(p as { opcion?: string; nombre?: string }).opcion || (p as { opcion?: string; nombre?: string }).nombre || ''}`).filter(Boolean).join(', ') : ''}</p>
              )}
              {item.comentario && (
                <p className="text-[9px] text-cyan-400/80 mt-0.5 italic">💬 {item.comentario}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action */}
      {buttonLabel && (
        <button onClick={onAction} disabled={updating}
          className={`w-full py-3 rounded-xl text-xs font-black text-white ${buttonColor} disabled:opacity-50 transition-all active:scale-[0.96] shadow-lg`}>
          {updating ? '⏳ Procesando...' : buttonLabel}
        </button>
      )}

      {!buttonLabel && (
        <div className="py-2 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
          <span className="text-[10px] text-green-400 font-bold">
            ✓ {pedido.meseroNombre ? `Para ${pedido.meseroNombre}` : 'Lista para entregar'}
          </span>
        </div>
      )}
    </div>
  );
}
