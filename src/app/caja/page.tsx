'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// Types
// ============================================================

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
  comprobanteUrl?: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
}

/** Cuenta consolidada por mesa — agrupa todos los pedidos de una mesa */
interface CuentaMesa {
  mesaZona: string;
  pedidos: PedidoCaja[];
  total: number;
  metodoPago: string | null; // null = cliente no ha elegido aún
  estadoPago: string;
  meseroEntrego: boolean; // mesero ya llevó el dinero a caja
}

// ============================================================
// Helpers
// ============================================================

function getCanal(p: PedidoCaja): { label: string; icon: string; color: string } {
  switch (p.canal) {
    case 'MESA_LOCAL': return { label: 'En Sucursal', icon: '🍽️', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
    case 'MESA_LLEVAR': return { label: 'Mesa → Llevar', icon: '🛍️', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    case 'MOSTRADOR': return { label: 'Mostrador', icon: '📱', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    case 'DOMICILIO': return { label: 'A Domicilio', icon: '🛵', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    case 'MESERO': return { label: 'Mesero', icon: '🧑‍🍳', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    default: {
      if (p.modalidad === 'domicilio') return { label: 'A Domicilio', icon: '🛵', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
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

const formatMXN = (n: number) => `$${n.toFixed(0)}`;

// ============================================================
// Main Page
// ============================================================

export default function CajaPage() {
  const router = useRouter();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCaja[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedMesa, setSelectedMesa] = useState<string | null>(null);
  const [modalEfectivo, setModalEfectivo] = useState<CuentaMesa | null>(null);
  const [modalTransferencia, setModalTransferencia] = useState<CuentaMesa | null>(null);
  const [selectedPedido, setSelectedPedido] = useState<PedidoCaja | null>(null);

  // ============================================================
  // Data Fetching
  // ============================================================

  const fetchData = useCallback(async () => {
    try {
      const mesasRes = await fetch('/api/mesas');
      if (mesasRes.ok) { const d = await mesasRes.json(); setMesas(d.data ?? []); }

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
              estado: (p.estado as string) || estado,
              modalidad: (p.modalidad as string) || 'local',
              canal: (p.canal as string) || '',
              observaciones: (p.observaciones as string) || '',
              clienteNombre: (p.clienteNombre as string) || '',
              total: (p.total as number) || 0,
              estadoPago: (p.estadoPago as string) || 'pendiente',
              metodoPago: (p.metodoPago as string) || undefined,
              mesaZona: (p.mesaZona as string) || '',
              meseroNombre: (p.meseroNombre as string) || '',
              creadoEn: (p.creadoEn as string) || '',
              comprobanteUrl: (p.comprobanteUrl as string) || undefined,
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

  // ============================================================
  // Derived Data
  // ============================================================

  const today = new Date().toDateString();
  const pedidosHoy = pedidos.filter(p => new Date(p.creadoEn).toDateString() === today);
  const activos = pedidosHoy.filter(p => p.estadoPago !== 'pagado');
  const pagados = pedidosHoy.filter(p => p.estadoPago === 'pagado');

  // Consolidar por mesa — TODOS los pedidos de una mesa = 1 cuenta
  const cuentasMesa: Record<string, CuentaMesa> = {};
  activos.forEach(p => {
    if (!p.mesaZona) return;
    if (!cuentasMesa[p.mesaZona]) {
      cuentasMesa[p.mesaZona] = {
        mesaZona: p.mesaZona,
        pedidos: [],
        total: 0,
        metodoPago: null,
        estadoPago: 'pendiente',
        meseroEntrego: false,
      };
    }
    const cuenta = cuentasMesa[p.mesaZona];
    cuenta.pedidos.push(p);
    cuenta.total += p.total;
    // Si ALGÚN pedido tiene método de pago, esa es la elección del cliente
    if (p.metodoPago) cuenta.metodoPago = p.metodoPago;
    // Si alguno está "validando" (voucher subido)
    if (p.estadoPago === 'validando') cuenta.estadoPago = 'validando';
    // Mesero entregó = todos los pedidos están servidos/entregados
  });
  // Determinar si mesero ya entregó todo
  Object.values(cuentasMesa).forEach(cuenta => {
    cuenta.meseroEntrego = cuenta.pedidos.every(p =>
      ['servido', 'entregado'].includes(p.estado)
    );
  });

  // Pedidos sin mesa (mostrador, domicilio)
  const pedidosSinMesa = activos.filter(p => !p.mesaZona);

  // KPIs
  const totalEfectivo = pagados.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0);
  const totalTransfer = pagados.filter(p => p.metodoPago === 'transferencia').reduce((s, p) => s + p.total, 0);

  // ============================================================
  // Render
  // ============================================================

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

        {/* ═══════════ MESAS — CUENTAS CONSOLIDADAS ═══════════ */}
        <div className="rounded-2xl bg-[#12121a] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              🪑 Mesas — Cuentas
              <span className="text-[10px] text-gray-500 font-normal">Una cuenta por mesa (todos los pedidos juntos)</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {mesas.map(mesa => {
              const mesaKey = `${mesa.nombre} - ${mesa.zona}`;
              const cuenta = cuentasMesa[mesaKey];
              const hasOrders = !!cuenta;
              return (
                <button
                  key={mesa.id}
                  onClick={() => hasOrders && setSelectedMesa(mesaKey)}
                  disabled={!hasOrders}
                  className={`relative p-4 rounded-2xl text-center transition-all duration-300 border group ${
                    hasOrders
                      ? 'bg-gradient-to-br from-red-500/10 to-red-900/10 border-red-500/30 hover:border-red-400/60 hover:scale-[1.03] cursor-pointer'
                      : 'bg-[#0d0d14] border-white/[0.06] opacity-50'
                  }`}
                >
                  <span className={`text-lg font-black block ${hasOrders ? 'text-white' : 'text-gray-600'}`}>
                    {mesa.nombre.replace('Mesa ', 'M')}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">{mesa.zona}</span>
                  {cuenta && (
                    <>
                      <span className="text-[10px] text-red-400 font-bold mt-1 block">
                        {cuenta.pedidos.length} pedido{cuenta.pedidos.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm text-brand-400 font-black block">
                        {formatMXN(cuenta.total)}
                      </span>
                      {/* Status indicator */}
                      {cuenta.metodoPago === 'efectivo' && cuenta.meseroEntrego && (
                        <span className="text-[9px] text-green-400 mt-1 block">💵 Listo para cobrar</span>
                      )}
                      {cuenta.estadoPago === 'validando' && (
                        <span className="text-[9px] text-purple-400 mt-1 block">📎 Voucher subido</span>
                      )}
                      {!cuenta.metodoPago && (
                        <span className="text-[9px] text-gray-500 mt-1 block">⏳ Esperando pago</span>
                      )}
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    </>
                  )}
                  {!hasOrders && (
                    <span className="text-[10px] text-green-600 mt-1 block">Libre</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════ PEDIDOS SIN MESA (Mostrador, Domicilio) ═══════════ */}
        {pedidosSinMesa.length > 0 && (
          <div className="rounded-2xl bg-[#12121a] border border-white/5 p-5">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              📱 Pedidos sin Mesa
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400">{pedidosSinMesa.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[350px] overflow-y-auto">
              {pedidosSinMesa.map(p => (
                <PedidoSinMesaCard key={p.id} pedido={p} onDetail={setSelectedPedido} />
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ COBRADOS HOY ═══════════ */}
        {pagados.length > 0 && (
          <div className="rounded-2xl bg-[#12121a] border border-white/5 p-4">
            <h2 className="text-sm font-bold text-white mb-3">✅ Cobrados Hoy ({pagados.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
              {pagados.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${p.metodoPago === 'efectivo' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                      {p.metodoPago === 'efectivo' ? '💵' : '🏦'}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-white">#{p.numero.split('-').pop()}</span>
                      {p.mesaZona && <span className="text-[9px] text-gray-500 ml-1">{p.mesaZona.split(' - ')[0]}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand-400">{formatMXN(p.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ MODAL: CUENTA DE MESA ═══════════ */}
      {selectedMesa && cuentasMesa[selectedMesa] && (
        <ModalCuentaMesa
          cuenta={cuentasMesa[selectedMesa]}
          onClose={() => setSelectedMesa(null)}
          onCobrarEfectivo={(cuenta) => { setSelectedMesa(null); setModalEfectivo(cuenta); }}
          onValidarTransferencia={(cuenta) => { setSelectedMesa(null); setModalTransferencia(cuenta); }}
          onDetailPedido={setSelectedPedido}
        />
      )}

      {/* ═══════════ MODAL: COBRO EFECTIVO ═══════════ */}
      {modalEfectivo && (
        <ModalCobrarEfectivo
          cuenta={modalEfectivo}
          onClose={() => setModalEfectivo(null)}
          onConfirm={async (billete, cambio) => {
            // Marcar todos los pedidos de la cuenta como pagados
            for (const p of modalEfectivo.pedidos) {
              await fetch(`/api/pedidos/${p.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  estadoPago: 'pagado',
                  metodoPago: 'efectivo',
                }),
              });
            }
            // Registrar billete y cambio
            if (billete >= 0) {
              await fetch(`/api/pagos/efectivo/confirmar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  pedidoIds: modalEfectivo.pedidos.map(p => p.id),
                  billete,
                  cambio,
                  total: modalEfectivo.total,
                }),
              });
            }
            // Liberar la mesa
            if (modalEfectivo.mesaZona) {
              await fetch('/api/mesas/liberar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mesaZona: modalEfectivo.mesaZona }),
              });
            }
            setModalEfectivo(null);
            fetchData();
          }}
        />
      )}

      {/* ═══════════ MODAL: VALIDAR TRANSFERENCIA ═══════════ */}
      {modalTransferencia && (
        <ModalValidarTransferencia
          cuenta={modalTransferencia}
          onClose={() => setModalTransferencia(null)}
          onConfirm={async () => {
            for (const p of modalTransferencia.pedidos) {
              await fetch(`/api/pedidos/${p.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  estadoPago: 'pagado',
                  metodoPago: 'transferencia',
                }),
              });
            }
            // Liberar la mesa
            if (modalTransferencia.mesaZona) {
              await fetch('/api/mesas/liberar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mesaZona: modalTransferencia.mesaZona }),
              });
            }
            setModalTransferencia(null);
            fetchData();
          }}
          onReject={async () => {
            for (const p of modalTransferencia.pedidos) {
              await fetch(`/api/pedidos/${p.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estadoPago: 'pendiente' }),
              });
            }
            setModalTransferencia(null);
            fetchData();
          }}
        />
      )}

      {/* ═══════════ MODAL: DETALLE PEDIDO ═══════════ */}
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
              <EnviarTicketWhatsApp pedidoId={selectedPedido.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODAL: Cuenta de Mesa (consolidada)
// ============================================================

function ModalCuentaMesa({ cuenta, onClose, onCobrarEfectivo, onValidarTransferencia, onDetailPedido }: {
  cuenta: CuentaMesa;
  onClose: () => void;
  onCobrarEfectivo: (cuenta: CuentaMesa) => void;
  onValidarTransferencia: (cuenta: CuentaMesa) => void;
  onDetailPedido: (p: PedidoCaja) => void;
}) {
  // Determinar qué botón mostrar según el método elegido por el cliente
  const metodoPago = cuenta.metodoPago;
  const meseroEntrego = cuenta.meseroEntrego;
  const esValidando = cuenta.estadoPago === 'validando';

  // Todos los items de todos los pedidos consolidados
  const todosItems = cuenta.pedidos.flatMap(p => p.items);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden animate-scale-in shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-gradient-to-r from-[#12121a] to-[#16161f]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                📍 {cuenta.mesaZona}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Cuenta consolidada — {cuenta.pedidos.length} pedido{cuenta.pedidos.length > 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white">✕</button>
          </div>
        </div>

        {/* Body — items consolidados */}
        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-3">
          {/* Items de la cuenta */}
          <div className="space-y-1.5">
            {todosItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div>
                  <span className="text-xs text-brand-400 font-bold mr-1.5">{item.cantidad}x</span>
                  <span className="text-xs text-white">{item.nombre}</span>
                </div>
                <span className="text-xs text-gray-400">{formatMXN(item.precioUnitario * item.cantidad)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-white/5 flex justify-between items-center">
            <span className="text-base font-black text-white">TOTAL</span>
            <span className="text-xl font-black text-brand-400">{formatMXN(cuenta.total)}</span>
          </div>

          {/* Pedidos individuales (colapsados) */}
          <details className="group">
            <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
              Ver pedidos individuales ({cuenta.pedidos.length})
            </summary>
            <div className="mt-2 space-y-1.5">
              {cuenta.pedidos.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <button onClick={() => onDetailPedido(p)} className="text-[10px] font-bold text-white hover:text-brand-400">
                    #{p.numero.split('-').pop()}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getEstadoLabel(p.estado).color}`}>{getEstadoLabel(p.estado).label}</span>
                    <span className="text-[10px] text-brand-400 font-bold">{formatMXN(p.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>

        {/* Footer — Acciones de cobro */}
        <div className="p-5 border-t border-white/5 space-y-3">
          {/* Estado: cliente NO ha elegido método aún */}
          {!metodoPago && !esValidando && (
            <div className="py-3 rounded-xl bg-gray-500/5 border border-gray-500/10 text-center">
              <span className="text-xs text-gray-400">⏳ El cliente aún no ha elegido método de pago</span>
              <p className="text-[10px] text-gray-600 mt-1">Se activará cuando el cliente elija efectivo o transferencia</p>
            </div>
          )}

          {/* Estado: cliente eligió EFECTIVO pero mesero no ha entregado aún */}
          {metodoPago === 'efectivo' && !meseroEntrego && (
            <div className="py-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
              <span className="text-xs text-amber-400">🧑‍🍳 Esperando que mesero lleve el dinero a caja</span>
              <p className="text-[10px] text-gray-500 mt-1">El mesero debe marcar la entrega como completada</p>
            </div>
          )}

          {/* Estado: cliente eligió EFECTIVO y mesero ya entregó → COBRAR */}
          {metodoPago === 'efectivo' && meseroEntrego && (
            <button
              onClick={() => onCobrarEfectivo(cuenta)}
              className="w-full py-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/20 hover:shadow-xl transition-all active:scale-[0.97]"
            >
              💵 Cobrar Efectivo — {formatMXN(cuenta.total)}
            </button>
          )}

          {/* Estado: cliente subió voucher de transferencia → VALIDAR */}
          {(esValidando || metodoPago === 'transferencia') && cuenta.estadoPago !== 'pagado' && (
            <button
              onClick={() => onValidarTransferencia(cuenta)}
              className="w-full py-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-purple-600 to-purple-500 shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all active:scale-[0.97]"
            >
              🏦 Validar Transferencia — {formatMXN(cuenta.total)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Cobrar Efectivo (billete + cambio)
// ============================================================

function ModalCobrarEfectivo({ cuenta, onClose, onConfirm }: {
  cuenta: CuentaMesa;
  onClose: () => void;
  onConfirm: (billete: number, cambio: number) => void;
}) {
  const [billete, setBillete] = useState<number | null>(null);
  const [montoCustom, setMontoCustom] = useState('');
  const [procesando, setProcesando] = useState(false);

  const billetes = [0, 50, 100, 200, 500, 1000]; // 0 = exacto
  const montoReal = billete === 0 ? cuenta.total : (billete ?? 0);
  const cambio = montoReal > cuenta.total ? montoReal - cuenta.total : 0;

  const handleConfirm = async () => {
    setProcesando(true);
    await onConfirm(montoReal, cambio);
    setProcesando(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#12121a] rounded-2xl border border-green-500/20 overflow-hidden animate-scale-in shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-gradient-to-r from-green-900/20 to-[#12121a]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">💵 Cobro en Efectivo</h3>
              <p className="text-xs text-gray-500 mt-0.5">{cuenta.mesaZona}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Total a cobrar */}
          <div className="text-center py-4 rounded-xl bg-green-500/5 border border-green-500/10">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total a cobrar</p>
            <p className="text-3xl font-black text-green-400 mt-1">{formatMXN(cuenta.total)}</p>
          </div>

          {/* Selector de billete */}
          <div>
            <p className="text-xs font-semibold text-white mb-3">¿Con cuánto paga el cliente?</p>
            <div className="grid grid-cols-3 gap-2">
              {billetes.map(monto => (
                <button
                  key={monto}
                  onClick={() => { setBillete(monto); setMontoCustom(''); }}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                    billete === monto
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-white/[0.02] text-gray-400 border-white/[0.06] hover:border-green-500/20'
                  }`}
                >
                  {monto === 0 ? '💰 Exacto' : `$${monto}`}
                </button>
              ))}
            </div>
            {/* Custom amount */}
            <div className="mt-3">
              <input
                type="number"
                placeholder="Otro monto..."
                value={montoCustom}
                onChange={(e) => { setMontoCustom(e.target.value); setBillete(Number(e.target.value) || null); }}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
          </div>

          {/* Cambio */}
          {billete !== null && billete !== 0 && (
            <div className={`text-center py-3 rounded-xl border ${cambio > 0 ? 'bg-amber-500/5 border-amber-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
              {cambio > 0 ? (
                <>
                  <p className="text-[10px] text-gray-500">Cambio a entregar</p>
                  <p className="text-2xl font-black text-amber-400">{formatMXN(cambio)}</p>
                </>
              ) : montoReal < cuenta.total ? (
                <p className="text-xs text-red-400">⚠️ Monto insuficiente — faltan {formatMXN(cuenta.total - montoReal)}</p>
              ) : (
                <>
                  <p className="text-[10px] text-gray-500">Sin cambio</p>
                  <p className="text-lg font-bold text-green-400">Monto exacto ✓</p>
                </>
              )}
            </div>
          )}

          {billete === 0 && (
            <div className="text-center py-3 rounded-xl bg-green-500/5 border border-green-500/10">
              <p className="text-sm font-bold text-green-400">✓ Pago exacto — sin cambio</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5">
          <button
            onClick={handleConfirm}
            disabled={billete === null || (billete !== 0 && montoReal < cuenta.total) || procesando}
            className="w-full py-4 rounded-xl text-sm font-black text-black bg-gradient-to-r from-green-400 to-green-500 shadow-lg shadow-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
          >
            {procesando ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Procesando...
              </span>
            ) : (
              `✓ Confirmar Cobro — ${formatMXN(cuenta.total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Validar Transferencia (imagen del voucher)
// ============================================================

function ModalValidarTransferencia({ cuenta, onClose, onConfirm, onReject }: {
  cuenta: CuentaMesa;
  onClose: () => void;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const [procesando, setProcesando] = useState(false);
  const [accion, setAccion] = useState<'aceptar' | 'rechazar' | null>(null);

  // Buscar el URL del comprobante en los pedidos
  const comprobanteUrl = cuenta.pedidos.find(p => p.comprobanteUrl)?.comprobanteUrl || null;

  const handleAccept = async () => {
    setProcesando(true);
    setAccion('aceptar');
    await onConfirm();
    setProcesando(false);
  };

  const handleReject = async () => {
    setProcesando(true);
    setAccion('rechazar');
    await onReject();
    setProcesando(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#12121a] rounded-2xl border border-purple-500/20 overflow-hidden animate-scale-in shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-gradient-to-r from-purple-900/20 to-[#12121a]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">🏦 Validar Transferencia</h3>
              <p className="text-xs text-gray-500 mt-0.5">{cuenta.mesaZona}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Total */}
          <div className="text-center py-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Monto esperado</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{formatMXN(cuenta.total)}</p>
          </div>

          {/* Comprobante */}
          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <p className="text-xs font-semibold text-white px-4 py-2 bg-white/[0.02]">📎 Comprobante del cliente</p>
            {comprobanteUrl ? (
              <div className="relative aspect-[4/3] bg-[#0d0d14]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={comprobanteUrl}
                  alt="Comprobante de transferencia"
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="aspect-[4/3] bg-[#0d0d14] flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl block mb-2">📄</span>
                  <p className="text-xs text-gray-500">Comprobante pendiente de subir</p>
                  <p className="text-[10px] text-gray-600 mt-1">Verifica en Supabase Storage</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-500 text-center">
            Verifica que el monto y datos de la transferencia coincidan con el pedido
          </p>
        </div>

        {/* Footer — Aceptar / Rechazar */}
        <div className="p-5 border-t border-white/5 flex gap-3">
          <button
            onClick={handleReject}
            disabled={procesando}
            className="flex-1 py-3.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all active:scale-[0.97]"
          >
            {procesando && accion === 'rechazar' ? 'Procesando...' : '✕ Rechazar'}
          </button>
          <button
            onClick={handleAccept}
            disabled={procesando}
            className="flex-[2] py-3.5 rounded-xl text-sm font-black text-black bg-gradient-to-r from-purple-400 to-purple-500 shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all active:scale-[0.97]"
          >
            {procesando && accion === 'aceptar' ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Procesando...
              </span>
            ) : (
              '✓ Pago Completado'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Card: Pedido sin mesa
// ============================================================

function PedidoSinMesaCard({ pedido, onDetail }: { pedido: PedidoCaja; onDetail: (p: PedidoCaja) => void }) {
  const canal = getCanal(pedido);
  const estado = getEstadoLabel(pedido.estado);

  return (
    <div className="rounded-xl bg-[#0d0d14] border border-white/[0.06] p-3 hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => onDetail(pedido)} className="text-xs font-bold text-white hover:text-brand-400">
            #{pedido.numero.split('-').pop()}
          </button>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${canal.color}`}>{canal.icon}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${estado.color}`}>{estado.label}</span>
        </div>
        <span className="text-sm font-bold text-brand-400">{formatMXN(pedido.total)}</span>
      </div>
      <div className="text-[10px] text-gray-500 line-clamp-1">
        {pedido.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
      </div>
      {pedido.metodoPago && (
        <div className="mt-1.5">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${pedido.metodoPago === 'efectivo' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
            {pedido.metodoPago === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// KPI Component
// ============================================================

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

// ============================================================
// EnviarTicketWhatsApp
// ============================================================

function EnviarTicketWhatsApp({ pedidoId }: { pedidoId: string }) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado' | 'error'>('idle');
  const [mensajeError, setMensajeError] = useState('');

  const enviarTicket = async () => {
    setEstado('enviando');
    setMensajeError('');
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Error al enviar ticket');
      }
      setEstado('enviado');
    } catch (err) {
      setEstado('error');
      setMensajeError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  if (estado === 'enviado') {
    return (
      <div className="mt-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
        <span className="text-[10px] text-green-400 font-bold">✅ Ticket enviado por WhatsApp</span>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={enviarTicket}
        disabled={estado === 'enviando'}
        className="w-full py-2.5 rounded-lg text-xs font-bold text-white bg-[#25D366] hover:bg-[#20BD5A] disabled:opacity-50 transition-all active:scale-[0.97] flex items-center justify-center gap-2"
      >
        {estado === 'enviando' ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Enviando...
          </>
        ) : (
          <>📲 Enviar Ticket por WhatsApp</>
        )}
      </button>
      {estado === 'error' && (
        <p className="text-[10px] text-fire-400 mt-1 text-center">{mensajeError}</p>
      )}
    </div>
  );
}
