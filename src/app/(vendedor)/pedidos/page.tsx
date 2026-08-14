'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Pedido {
  id: string;
  numero: string;
  estado: string;
  modalidad: string;
  clienteNombre?: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
  total: number;
  creadoEn: string;
  mesaZona?: string;
  meseroNombre?: string;
  observaciones?: string;
}

function parseCanal(obs?: string): string {
  if (!obs) return 'QR';
  const m = obs.match(/\[(QR|QR_REDES|MESERO)\]/);
  return m ? m[1] : 'QR';
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const prevNewCount = useRef(0);

  const fetchPedidos = useCallback(async () => {
    try {
      const supabaseUrl = '/api/pedidos';
      const estados = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido'];
      const results = await Promise.all(
        estados.map(async (estado) => {
          const res = await fetch(`${supabaseUrl}?estado=${estado}`);
          if (!res.ok) return [];
          const json = await res.json();
          return (json.data || []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            numero: p.numero as string,
            estado: p.estado as string || estado,
            modalidad: p.modalidad as string || 'local',
            clienteNombre: p.clienteNombre as string || '',
            items: (p.items as Array<{ nombre: string; cantidad: number; precioUnitario: number }>) || [],
            total: p.total as number || 0,
            creadoEn: p.creadoEn as string || new Date().toISOString(),
            mesaZona: p.mesaZona as string || '',
            meseroNombre: p.meseroNombre as string || '',
            observaciones: p.observaciones as string || '',
          }));
        })
      );

      const todos = results.flat() as Pedido[];

      // Sound on new recibido orders
      const newCount = todos.filter(p => p.estado === 'recibido').length;
      if (newCount > prevNewCount.current && prevNewCount.current > 0) {
        playSound();
      }
      prevNewCount.current = newCount;

      setPedidos(todos);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 8000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  // Only show today's completed orders (disappear next day)
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const playSound = () => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* */ }
  };

  const advanceStatus = async (pedido: Pedido) => {
    const nextMap: Record<string, string> = {
      recibido: 'en_preparacion',
      en_preparacion: 'empacado',
      empacado: 'listo',
    };
    const next = nextMap[pedido.estado];
    if (!next) return;

    setUpdatingId(pedido.id);
    try {
      await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: next }),
      });

      await fetchPedidos();
    } catch { /* */ }
    finally { setUpdatingId(null); }
  };

  // Categorize
  const nuevas = pedidos.filter(p => p.estado === 'recibido');
  const cocinando = pedidos.filter(p => p.estado === 'en_preparacion');
  const empacado = pedidos.filter(p => p.estado === 'empacado');
  const listas = pedidos.filter(p =>
    (p.estado === 'listo_para_servir' || p.estado === 'servido') && isToday(p.creadoEn)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden p-4 sm:p-6">
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs text-gray-400">Nuevas: <span className="text-white font-bold">{nuevas.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-400">Cocinando: <span className="text-white font-bold">{cocinando.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-400" />
            <span className="text-xs text-gray-400">Empacando: <span className="text-white font-bold">{empacado.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400">Listas: <span className="text-white font-bold">{listas.length}</span></span>
          </div>
        </div>
        <button
          onClick={fetchPedidos}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100%-48px)] overflow-hidden">
        {/* Column: Nuevas Órdenes */}
        <Column
          title="🔴 Nuevas Órdenes"
          color="border-red-500/30"
          headerColor="text-red-400"
          pedidos={nuevas}
          buttonLabel="→ Preparar"
          buttonColor="bg-amber-500 hover:bg-amber-400"
          onAdvance={advanceStatus}
          updatingId={updatingId}
        />

        {/* Column: Cocinando */}
        <Column
          title="🟡 Cocinando"
          color="border-amber-500/30"
          headerColor="text-amber-400"
          pedidos={cocinando}
          buttonLabel="→ Empacar"
          buttonColor="bg-purple-500 hover:bg-purple-400"
          onAdvance={advanceStatus}
          updatingId={updatingId}
        />

        {/* Column: Empacando */}
        <Column
          title="🟣 Empacando"
          color="border-purple-500/30"
          headerColor="text-purple-400"
          pedidos={empacado}
          buttonLabel="✓ Listo para mesero"
          buttonColor="bg-green-500 hover:bg-green-400"
          onAdvance={advanceStatus}
          updatingId={updatingId}
        />

        {/* Column: Listas (auto-dismiss after 1 min) */}
        <Column
          title="🟢 Entregadas a Mesero"
          color="border-green-500/30"
          headerColor="text-green-400"
          pedidos={listas}
          buttonLabel=""
          buttonColor=""
          onAdvance={() => {}}
          updatingId={null}
          readonly
        />
      </div>
    </div>
  );
}

function Column({
  title,
  color,
  headerColor,
  pedidos,
  buttonLabel,
  buttonColor,
  onAdvance,
  updatingId,
  readonly = false,
}: {
  title: string;
  color: string;
  headerColor: string;
  pedidos: Pedido[];
  buttonLabel: string;
  buttonColor: string;
  onAdvance: (p: Pedido) => void;
  updatingId: string | null;
  readonly?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-xl bg-[#111118] border ${color} overflow-hidden`}>
      {/* Column header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <h2 className={`text-xs font-bold uppercase tracking-wider ${headerColor}`}>{title}</h2>
        <span className="text-xs text-gray-500 font-mono">{pedidos.length}</span>
      </div>

      {/* Column body — scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {pedidos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs">Sin pedidos</p>
          </div>
        ) : (
          pedidos.map(pedido => (
            <OrderCard
              key={pedido.id}
              pedido={pedido}
              buttonLabel={buttonLabel}
              buttonColor={buttonColor}
              onAdvance={() => onAdvance(pedido)}
              updating={updatingId === pedido.id}
              readonly={readonly}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrderCard({
  pedido,
  buttonLabel,
  buttonColor,
  onAdvance,
  updating,
  readonly,
}: {
  pedido: Pedido;
  buttonLabel: string;
  buttonColor: string;
  onAdvance: () => void;
  updating: boolean;
  readonly: boolean;
}) {
  const canal = parseCanal(pedido.observaciones);

  return (
    <div className="rounded-lg bg-[#0d0d14] border border-white/5 p-3 hover:border-white/10 transition-all">
      {/* Header: number + mesa + time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-white">#{pedido.numero.split('-').pop()}</span>
          {pedido.mesaZona && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
              📍 {pedido.mesaZona.split(' - ')[0]}
            </span>
          )}
        </div>
        <span className="text-[9px] text-gray-500">{getTimeSince(pedido.creadoEn)}</span>
      </div>

      {/* Modalidad + Canal */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] text-gray-500">
          {pedido.modalidad === 'domicilio' ? '🛵 Domicilio' : pedido.modalidad === 'retiro' ? '🛍️ Llevar' : '🍽️ Local'}
        </span>
        <span className="text-[9px] text-gray-600">
          {canal === 'QR' ? 'vía QR' : canal === 'MESERO' ? 'vía Mesero' : 'vía Redes'}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-0.5 mb-2">
        {pedido.items.map((item, i) => (
          <p key={i} className="text-[11px] text-gray-300">
            <span className="text-brand-400 font-bold">{item.cantidad}x</span> {item.nombre}
          </p>
        ))}
      </div>

      {/* Action button */}
      {!readonly && buttonLabel && (
        <button
          onClick={onAdvance}
          disabled={updating}
          className={`w-full mt-2 py-2 rounded-lg text-xs font-bold text-black ${buttonColor} disabled:opacity-50 transition-all active:scale-[0.97]`}
        >
          {updating ? '...' : buttonLabel}
        </button>
      )}

      {/* Readonly status — show mesero name */}
      {readonly && (
        <div className="mt-2 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
          <span className="text-[10px] text-green-400 font-medium">
            {pedido.meseroNombre ? `✓ ${pedido.meseroNombre}` : '✓ Esperando mesero'}
          </span>
        </div>
      )}
    </div>
  );
}
