'use client';

import { useState, useEffect, useCallback } from 'react';

interface PedidoPago {
  id: string;
  numero: string;
  total: number;
  estadoPago: string;
  metodoPago: string;
  canal: string;
  modalidad: string;
  observaciones: string;
  mesaZona: string;
  meseroNombre: string;
  creadoEn: string;
}

type Periodo = 'hoy' | 'semana' | 'mes';

function getCanal(p: PedidoPago): string {
  switch (p.canal) {
    case 'MESA_LOCAL': return 'En Sucursal';
    case 'MESA_LLEVAR': return 'Mesa → Llevar';
    case 'MOSTRADOR': return 'Mostrador';
    case 'DOMICILIO': return 'A Domicilio';
    case 'MESERO': return 'Mesero';
    default: return 'En Sucursal';
  }
}

export default function PagosPage() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [pedidos, setPedidos] = useState<PedidoPago[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const estados = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido', 'entregado'];
      const all: PedidoPago[] = [];
      for (const estado of estados) {
        const res = await fetch(`/api/pedidos?estado=${estado}`);
        if (res.ok) {
          const j = await res.json();
          (j.data || []).forEach((p: Record<string, unknown>) => {
            all.push({
              id: p.id as string, numero: p.numero as string, total: p.total as number || 0,
              estadoPago: p.estadoPago as string || 'pendiente', metodoPago: p.metodoPago as string || '',
              canal: p.canal as string || '', modalidad: p.modalidad as string || 'local', observaciones: p.observaciones as string || '',
              mesaZona: p.mesaZona as string || '', meseroNombre: p.meseroNombre as string || '',
              creadoEn: p.creadoEn as string || '',
            });
          });
        }
      }

      const now = new Date();
      const filtered = all.filter(p => {
        const d = new Date(p.creadoEn);
        if (periodo === 'hoy') return d.toDateString() === now.toDateString();
        if (periodo === 'semana') return d >= new Date(now.getTime() - 7 * 86400000) && d <= now;
        if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
      });

      setPedidos(filtered);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pagados = pedidos.filter(p => p.estadoPago === 'pagado');
  const pendientes = pedidos.filter(p => p.estadoPago === 'pendiente');
  const validando = pedidos.filter(p => p.estadoPago === 'validando');

  const totalPagado = pagados.reduce((s, p) => s + p.total, 0);
  const totalPendiente = pendientes.reduce((s, p) => s + p.total, 0);

  // By payment method
  const efectivo = pagados.filter(p => p.metodoPago === 'efectivo');
  const transferencia = pagados.filter(p => p.metodoPago === 'transferencia');
  const otroMetodo = pagados.filter(p => p.metodoPago !== 'efectivo' && p.metodoPago !== 'transferencia');

  const totalEfectivo = efectivo.reduce((s, p) => s + p.total, 0);
  const totalTransferencia = transferencia.reduce((s, p) => s + p.total, 0);
  const totalOtro = otroMetodo.reduce((s, p) => s + p.total, 0);

  // By channel
  const byChannel: Record<string, { count: number; total: number }> = {};
  pagados.forEach(p => {
    const canal = getCanal(p);
    if (!byChannel[canal]) byChannel[canal] = { count: 0, total: 0 };
    byChannel[canal].count++;
    byChannel[canal].total += p.total;
  });

  // Daily breakdown (transfers)
  const transferByDay: Record<string, { count: number; total: number }> = {};
  transferencia.forEach(p => {
    const day = new Date(p.creadoEn).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    if (!transferByDay[day]) transferByDay[day] = { count: 0, total: 0 };
    transferByDay[day].count++;
    transferByDay[day].total += p.total;
  });

  const formatMXN = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">💳 Pagos y Cobros</h1>
          <p className="text-sm text-gray-500 mt-1">Análisis de pagos por método, canal y día</p>
        </div>
        <div className="flex items-center gap-2">
          {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${periodo === p ? 'bg-brand-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'}`}>
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPI label="Total Cobrado" value={formatMXN(totalPagado)} icon="✅" color="green" />
        <KPI label="Efectivo" value={formatMXN(totalEfectivo)} icon="💵" />
        <KPI label="Transferencia" value={formatMXN(totalTransferencia)} icon="🏦" color="purple" />
        <KPI label="Pendientes" value={formatMXN(totalPendiente)} icon="⏳" color="amber" />
        <KPI label="Validando" value={String(validando.length)} icon="🔍" />
      </div>

      {/* By Channel */}
      <div className="bg-[#12121a] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-white">Cobros por Canal</h2>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(byChannel).sort((a, b) => b[1].total - a[1].total).map(([canal, data]) => (
            <div key={canal} className="bg-white/[0.02] rounded-lg border border-white/5 p-3">
              <p className="text-xs text-gray-400 mb-1">{canal}</p>
              <p className="text-lg font-black text-white">{formatMXN(data.total)}</p>
              <p className="text-[10px] text-gray-500">{data.count} pedidos</p>
            </div>
          ))}
          {Object.keys(byChannel).length === 0 && (
            <p className="col-span-4 text-center text-sm text-gray-500 py-4">No hay cobros en este período</p>
          )}
        </div>
      </div>

      {/* Transfers by Day */}
      <div className="bg-[#12121a] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-white">🏦 Transferencias por Día</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">Total del período: {formatMXN(totalTransferencia)} ({transferencia.length} transferencias)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Día</th>
                <th className="text-center px-4 py-3">Transferencias</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {Object.entries(transferByDay).map(([day, data]) => (
                <tr key={day} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium">{day}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{data.count}</td>
                  <td className="px-4 py-3 text-right text-purple-400 font-bold">{formatMXN(data.total)}</td>
                </tr>
              ))}
              {Object.keys(transferByDay).length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No hay transferencias en este período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-[#12121a] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-white">Últimos Cobros</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Pedido</th>
                <th className="text-left px-4 py-3">Canal</th>
                <th className="text-left px-4 py-3">Método</th>
                <th className="text-left px-4 py-3">Mesero</th>
                <th className="text-left px-4 py-3">Hora</th>
                <th className="text-right px-4 py-3">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {pagados.slice(0, 20).map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white font-medium">#{p.numero}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 text-[10px] font-medium">{getCanal(p)}</span></td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.metodoPago === 'efectivo' ? 'bg-green-500/10 text-green-400' : p.metodoPago === 'transferencia' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {p.metodoPago || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.meseroNombre || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.creadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3 text-right text-white font-bold">{formatMXN(p.total)}</td>
                </tr>
              ))}
              {pagados.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay cobros en este período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  const borderColor = color === 'green' ? 'border-green-500/20' : color === 'purple' ? 'border-purple-500/20' : color === 'amber' ? 'border-amber-500/20' : 'border-white/5';
  const textColor = color === 'green' ? 'text-green-400' : color === 'purple' ? 'text-purple-400' : color === 'amber' ? 'text-amber-400' : 'text-white';
  return (
    <div className={`bg-[#12121a] rounded-xl border p-4 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-lg font-black ${textColor}`}>{value}</p>
    </div>
  );
}
