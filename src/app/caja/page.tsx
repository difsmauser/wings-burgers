'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Mesa {
  id: string;
  nombre: string;
  zona: string;
  estado: string;
  pos_x: number;
  pos_y: number;
  capacidad: number;
}

interface PedidoCaja {
  id: string;
  numero: string;
  estado: string;
  modalidad: string;
  canal: string;
  observaciones: string;
  clienteNombre: string;
  total: number;
  estadoPago: string;
  metodoPago?: string;
  mesaZona?: string;
  meseroNombre?: string;
  creadoEn: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
}

function getCanal(p: PedidoCaja): { label: string; icon: string; color: string } {
  switch (p.canal) {
    case 'MESA_LOCAL': return { label: 'En Sucursal', icon: '🍽️', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
    case 'MESA_LLEVAR': return { label: 'Mesa → Llevar', icon: '🛍️', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    case 'MOSTRADOR': return { label: 'Mostrador', icon: '📱', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    case 'DOMICILIO': return { label: 'A Domicilio', icon: '🛵', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    case 'MESERO': return { label: 'Mesero', icon: '🧑‍🍳', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    default: {
      // Fallback for old orders without canal field — infer from observaciones
      const obs = p.observaciones || '';
      if (p.modalidad === 'domicilio') return { label: 'A Domicilio', icon: '🛵', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
      if (obs.includes('[PARA_LLEVAR]') || p.modalidad === 'retiro') return { label: 'Para Llevar', icon: '🛍️', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      if (obs.includes('[MESERO]')) return { label: 'Mesero', icon: '🧑‍🍳', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      return { label: 'En Sucursal', icon: '🍽️', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
    }
  }
}

function getEstadoLabel(estado: string): { label: string; color: string } {
  switch (estado) {
    case 'recibido': return { label: 'Recibido', color: 'text-brand-400 bg-brand-500/10 border-brand-500/20' };
    case 'en_preparacion': return { label: 'Preparando', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    case 'empacado': return { label: 'Listo', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
    case 'listo_para_servir': return { label: 'Mesero', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
    case 'servido': return { label: 'Servido', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    case 'en_camino': return { label: 'En camino', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    case 'entregado': return { label: 'Entregado', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    default: return { label: estado, color: 'text-gray-400 bg-white/5 border-white/10' };
  }
}

export default function CajaPage() {
  const router = useRouter();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [selectedMesa, setSelectedMesa] = useState<string | null>(null);
  const [selectedPedido, setSelectedPedido] = useState<PedidoCaja | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const mesasRes = await fetch('/api/mesas');
      if (mesasRes.ok) { const d = await mesasRes.json(); setMesas(d.data ?? []); }

      // Fetch ALL active pedidos (all states except cancelado)
      const estados = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido', 'en_camino', 'entregado'];
      const allPedidos: PedidoCaja[] = [];
      for (const estado of estados) {
        const res = await fetch(`/api/pedidos?estado=${estado}`);
        if (res.ok) {
          const data = await res.json();
          (data.data || []).forEach((p: Record<string, unknown>) => {
            allPedidos.push({
              id: p.id as string,
              numero: p.numero as string,
              estado: p.estado as string || estado,
              modalidad: p.modalidad as string || 'local',
              canal: p.canal as string || '',
              observaciones: p.observaciones as string || '',
              clienteNombre: (p.clienteNombre as string) || '',
              total: p.total as number || 0,
              estadoPago: (p.estadoPago as string) || 'pendiente',
              metodoPago: p.metodoPago as string || undefined,
              mesaZona: p.mesaZona as string || '',
              meseroNombre: p.meseroNombre as string || '',
              creadoEn: p.creadoEn as string || '',
              items: (p.items as PedidoCaja['items']) || [],
            });
          });
        }
      }
      setPedidos(allPedidos);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 6000);
    return () => clearInterval(i);
  }, [fetchData]);

  const marcarPagado = async (pedidoId: string, metodo: 'efectivo' | 'transferencia') => {
    setProcesandoId(pedidoId);
    await fetch(`/api/pedidos/${pedidoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estadoPago: 'pagado', metodoPago: metodo }),
    });
    setProcesandoId(null);
    fetchData();
  };

  // Filter: today's orders only
  const today = new Date().toDateString();
  const pedidosHoy = pedidos.filter(p => new Date(p.creadoEn).toDateString() === today);

  // Active (not paid)
  const activos = pedidosHoy.filter(p => p.estadoPago !== 'pagado');
  const pagados = pedidosHoy.filter(p => p.estadoPago === 'pagado');

  // By channel — 5 canales de venta (from DB field)
  const enSucursalOrders = activos.filter(p => p.canal === 'MESA_LOCAL');
  const mesaLlevarOrders = activos.filter(p => p.canal === 'MESA_LLEVAR');
  const mostradorOrders = activos.filter(p => p.canal === 'MOSTRADOR');
  const domicilioOrders = activos.filter(p => p.canal === 'DOMICILIO');
  const meseroOrders = activos.filter(p => p.canal === 'MESERO');
  // Fallback for orders without canal field (legacy)
  const sinCanal = activos.filter(p => !p.canal || !['MESA_LOCAL', 'MESA_LLEVAR', 'MOSTRADOR', 'DOMICILIO', 'MESERO'].includes(p.canal));
  if (sinCanal.length > 0) enSucursalOrders.push(...sinCanal);

  // KPIs
  const totalEfectivo = pagados.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0);
  const totalTransfer = pagados.filter(p => p.metodoPago === 'transferencia').reduce((s, p) => s + p.total, 0);

  // Mesa orders grouped (En Sucursal)
  const mesaGroups: Record<string, PedidoCaja[]> = {};
  enSucursalOrders.forEach(p => {
    const key = p.mesaZona || 'Sin mesa';
    if (!mesaGroups[key]) mesaGroups[key] = [];
    mesaGroups[key].push(p);
  });

  // Selected mesa orders
  const selectedMesaOrders = selectedMesa ? (mesaGroups[selectedMesa] || []) : [];

  const formatMXN = (n: number) => `$${n.toFixed(0)}`;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-[#111118] border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="A-la Burguer" className="h-8 w-8 rounded-full" />
          <div>
            <h1 className="text-sm font-bold text-white">A-la Burguer</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Módulo de Caja</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Tiempo real
          </div>
          <button onClick={() => { fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); }} className="text-xs text-gray-400 hover:text-red-400 transition-colors">Salir</button>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KPI icon="🔥" label="Activos" value={String(activos.length)} color="text-red-400" border="border-red-500/20" />
          <KPI icon="💵" label="Efectivo" value={formatMXN(totalEfectivo)} color="text-green-400" border="border-green-500/20" />
          <KPI icon="🏦" label="Transferencia" value={formatMXN(totalTransfer)} color="text-purple-400" border="border-purple-500/20" />
          <KPI icon="✅" label="Cobrados" value={String(pagados.length)} color="text-green-400" border="border-green-500/20" />
          <KPI icon="💰" label="Total Día" value={formatMXN(totalEfectivo + totalTransfer)} color="text-brand-400" border="border-brand-500/20" />
        </div>

        {/* Mesas Map + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Mesa Map */}
          <div className="lg:col-span-1 rounded-2xl bg-[#12121a] border border-white/5 p-4">
            <h2 className="text-sm font-bold text-white mb-3">🍽️ En Sucursal</h2>
            <div className="grid grid-cols-3 gap-2">
              {mesas.map(mesa => {
                const hasOrders = mesaGroups[`${mesa.nombre} - ${mesa.zona}`]?.length > 0;
                const isSelected = selectedMesa === `${mesa.nombre} - ${mesa.zona}`;
                return (
                  <button
                    key={mesa.id}
                    onClick={() => setSelectedMesa(hasOrders ? `${mesa.nombre} - ${mesa.zona}` : null)}
                    className={`p-3 rounded-xl text-center transition-all duration-200 border ${
                      isSelected ? 'bg-brand-500/20 border-brand-400/40 scale-105 ring-1 ring-brand-400/30'
                      : hasOrders ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 cursor-pointer'
                      : 'bg-green-500/5 border-green-500/20 opacity-60'
                    }`}
                  >
                    <span className="text-xs font-bold block">{mesa.nombre.replace('Mesa ', 'M')}</span>
                    <span className="text-[9px] text-gray-500 block">{mesa.zona}</span>
                    {hasOrders && (
                      <span className="text-[9px] text-red-400 font-bold mt-0.5 block">
                        {mesaGroups[`${mesa.nombre} - ${mesa.zona}`].length} pedido(s)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mesa Detail */}
          <div className="lg:col-span-2 rounded-2xl bg-[#12121a] border border-white/5 p-4">
            {selectedMesa && selectedMesaOrders.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white">📍 {selectedMesa}</h2>
                  <span className="text-sm font-bold text-brand-400">Total: {formatMXN(selectedMesaOrders.reduce((s, p) => s + p.total, 0))}</span>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedMesaOrders.map(p => (
                    <OrderCard key={p.id} pedido={p} onPay={marcarPagado} procesandoId={procesandoId} onDetail={setSelectedPedido} />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                <span className="text-4xl mb-3">🪑</span>
                <p className="text-sm text-gray-500">Selecciona una mesa ocupada para ver sus pedidos</p>
              </div>
            )}
          </div>
        </div>

        {/* Orders by Channel — 5 canales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <ChannelSection
            icon="🍽️" title="En Sucursal" count={enSucursalOrders.length}
            color="yellow" pedidos={enSucursalOrders}
            onPay={marcarPagado} procesandoId={procesandoId} onDetail={setSelectedPedido}
          />
          <ChannelSection
            icon="🛍️" title="Mesa → Llevar" count={mesaLlevarOrders.length}
            color="amber" pedidos={mesaLlevarOrders}
            onPay={marcarPagado} procesandoId={procesandoId} onDetail={setSelectedPedido}
          />
          <ChannelSection
            icon="📱" title="Mostrador" count={mostradorOrders.length}
            color="amber" pedidos={mostradorOrders}
            onPay={marcarPagado} procesandoId={procesandoId} onDetail={setSelectedPedido}
          />
          <ChannelSection
            icon="🛵" title="A Domicilio" count={domicilioOrders.length}
            color="green" pedidos={domicilioOrders}
            onPay={marcarPagado} procesandoId={procesandoId} onDetail={setSelectedPedido}
          />
          <ChannelSection
            icon="🧑‍🍳" title="Mesero" count={meseroOrders.length}
            color="blue" pedidos={meseroOrders}
            onPay={marcarPagado} procesandoId={procesandoId} onDetail={setSelectedPedido}
          />
        </div>

        {/* Pagados Hoy */}
        {pagados.length > 0 && (
          <div className="rounded-2xl bg-[#12121a] border border-white/5 p-4">
            <h2 className="text-sm font-bold text-white mb-3">✅ Cobrados Hoy ({pagados.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
              {pagados.map(p => {
                const canal = getCanal(p);
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${p.metodoPago === 'efectivo' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                        {p.metodoPago === 'efectivo' ? '💵' : '🏦'}
                      </span>
                      <div>
                        <span className="text-[10px] font-bold text-white">#{p.numero.split('-').pop()}</span>
                        <span className={`text-[9px] ml-1.5 ${canal.color.split(' ')[0]}`}>{canal.icon}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-brand-400">{formatMXN(p.total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedPedido(null)}>
          <div className="w-full max-w-md bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">#{selectedPedido.numero}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${getCanal(selectedPedido).color}`}>{getCanal(selectedPedido).icon} {getCanal(selectedPedido).label}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${getEstadoLabel(selectedPedido.estado).color}`}>{getEstadoLabel(selectedPedido.estado).label}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedPedido(null)} className="text-gray-400 hover:text-white text-lg">✕</button>
              </div>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedPedido.mesaZona && <p className="text-xs text-gray-400">📍 {selectedPedido.mesaZona}</p>}
              {selectedPedido.meseroNombre && <p className="text-xs text-cyan-400">🧑‍🍳 Mesero: {selectedPedido.meseroNombre}</p>}
              <div className="space-y-2">
                {selectedPedido.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-xs text-brand-400 font-bold mr-1.5">{item.cantidad}x</span>
                      <span className="text-xs text-white">{item.nombre}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatMXN(item.precioUnitario * item.cantidad)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-white/5 flex justify-between">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-sm font-bold text-brand-400">{formatMXN(selectedPedido.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ pedido, onPay, procesandoId, onDetail }: {
  pedido: PedidoCaja;
  onPay: (id: string, metodo: 'efectivo' | 'transferencia') => void;
  procesandoId: string | null;
  onDetail: (p: PedidoCaja) => void;
}) {
  const canal = getCanal(pedido);
  const estado = getEstadoLabel(pedido.estado);
  // Payment is only allowed AFTER the order has been served/delivered
  const canPay = ['servido', 'entregado'].includes(pedido.estado);
  const isWaiting = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir'].includes(pedido.estado);

  return (
    <div className="rounded-xl bg-[#0d0d14] border border-white/[0.06] p-3 hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => onDetail(pedido)} className="text-xs font-bold text-white hover:text-brand-400 transition-colors">
            #{pedido.numero.split('-').pop()}
          </button>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${canal.color}`}>{canal.icon} {canal.label}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${estado.color}`}>{estado.label}</span>
        </div>
        <span className="text-sm font-bold text-brand-400">{`$${pedido.total.toFixed(0)}`}</span>
      </div>
      {pedido.meseroNombre && (
        <p className="text-[10px] text-cyan-400 mb-2">🧑‍🍳 {pedido.meseroNombre}</p>
      )}
      {/* Items preview */}
      <div className="text-[10px] text-gray-500 mb-2 line-clamp-2">
        {pedido.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
      </div>

      {/* Status: waiting for delivery */}
      {isWaiting && pedido.estadoPago !== 'pagado' && (
        <div className="py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
          <span className="text-[10px] text-amber-400 font-medium">
            ⏳ Esperando entrega del mesero
          </span>
        </div>
      )}

      {/* Status: ready for payment (mesero delivered) */}
      {canPay && pedido.estadoPago !== 'pagado' && pedido.estadoPago !== 'validando' && (
        <div className="space-y-2">
          <div className="py-1.5 rounded-lg bg-green-500/5 border border-green-500/10 text-center mb-2">
            <span className="text-[10px] text-green-400 font-bold">✓ Entregado — Listo para cobrar</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onPay(pedido.id, 'efectivo')} disabled={procesandoId === pedido.id}
              className="flex-1 py-2 rounded-lg text-[10px] font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-all active:scale-95">
              💵 Efectivo (mesero)
            </button>
            <button onClick={() => onPay(pedido.id, 'transferencia')} disabled={procesandoId === pedido.id}
              className="flex-1 py-2 rounded-lg text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all active:scale-95">
              🏦 Transfer (voucher)
            </button>
          </div>
        </div>
      )}

      {/* Waiting for transfer validation */}
      {pedido.estadoPago === 'validando' && (
        <div className="py-2 rounded-lg bg-purple-500/5 border border-purple-500/10 text-center">
          <span className="text-[10px] text-purple-400 font-bold animate-pulse">
            📎 Voucher pendiente de validación
          </span>
        </div>
      )}

      {pedido.estadoPago === 'pagado' && (
        <div className="text-center py-1.5 rounded-lg bg-green-500/5 border border-green-500/10">
          <span className="text-[10px] text-green-400 font-bold">✓ Pagado — {pedido.metodoPago}</span>
        </div>
      )}
    </div>
  );
}

function KPI({ icon, label, value, color, border }: { icon: string; label: string; value: string; color: string; border: string }) {
  return (
    <div className={`rounded-xl bg-[#12121a] border p-3 ${border}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function ChannelSection({ icon, title, count, color, pedidos, onPay, procesandoId, onDetail }: {
  icon: string; title: string; count: number; color: string;
  pedidos: PedidoCaja[];
  onPay: (id: string, metodo: 'efectivo' | 'transferencia') => void;
  procesandoId: string | null;
  onDetail: (p: PedidoCaja) => void;
}) {
  const borderColor = color === 'green' ? 'border-green-500/10' : color === 'amber' ? 'border-amber-500/10' : color === 'blue' ? 'border-blue-500/10' : 'border-yellow-500/10';
  const badgeColor = color === 'green' ? 'bg-green-500/10 text-green-400' : color === 'amber' ? 'bg-amber-500/10 text-amber-400' : color === 'blue' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400';

  return (
    <div className={`rounded-2xl bg-[#12121a] border border-white/5 ${borderColor} p-4`}>
      <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        {icon} {title}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>{count}</span>
      </h2>
      {pedidos.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-6">Sin pedidos</p>
      ) : (
        <div className="space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin">
          {pedidos.map(p => <OrderCard key={p.id} pedido={p} onPay={onPay} procesandoId={procesandoId} onDetail={onDetail} />)}
        </div>
      )}
    </div>
  );
}
