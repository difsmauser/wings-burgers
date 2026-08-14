'use client';

import { useState, useEffect, useCallback } from 'react';

interface PedidoCorte {
  id: string;
  numero: string;
  total: number;
  estadoPago: string;
  metodoPago: string;
  observaciones: string;
  modalidad: string;
  mesaZona: string;
  meseroNombre: string;
  creadoEn: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
}

type Periodo = 'hoy' | 'semana' | 'mes';

export default function CortesPage() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [pedidos, setPedidos] = useState<PedidoCorte[]>([]);
  const [gastos, setGastos] = useState<Array<{ monto: number; concepto: string; categoria: string; fecha: string }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const estados = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido', 'entregado'];
      const all: PedidoCorte[] = [];
      for (const estado of estados) {
        const res = await fetch(`/api/pedidos?estado=${estado}`);
        if (res.ok) {
          const j = await res.json();
          (j.data || []).forEach((p: Record<string, unknown>) => {
            all.push({
              id: p.id as string, numero: p.numero as string, total: p.total as number || 0,
              estadoPago: p.estadoPago as string || 'pendiente', metodoPago: p.metodoPago as string || '',
              observaciones: p.observaciones as string || '', modalidad: p.modalidad as string || 'local',
              mesaZona: p.mesaZona as string || '', meseroNombre: p.meseroNombre as string || '',
              creadoEn: p.creadoEn as string || '', items: (p.items as PedidoCorte['items']) || [],
            });
          });
        }
      }

      // Filter by period
      const now = new Date();
      const filtered = all.filter(p => {
        const d = new Date(p.creadoEn);
        if (periodo === 'hoy') return d.toDateString() === now.toDateString();
        if (periodo === 'semana') { const weekAgo = new Date(now.getTime() - 7 * 86400000); return d >= weekAgo; }
        if (periodo === 'mes') { return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
        return true;
      });
      setPedidos(filtered);

      // Gastos
      try {
        const gRes = await fetch('/api/gastos');
        if (gRes.ok) {
          const gj = await gRes.json();
          const gFiltered = (gj.data || []).filter((g: { fecha: string }) => {
            const d = new Date(g.fecha);
            if (periodo === 'hoy') return d.toDateString() === now.toDateString();
            if (periodo === 'semana') { const weekAgo = new Date(now.getTime() - 7 * 86400000); return d >= weekAgo; }
            if (periodo === 'mes') { return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
            return true;
          });
          setGastos(gFiltered);
        }
      } catch { /* */ }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calculations
  const pagados = pedidos.filter(p => p.estadoPago === 'pagado');
  const totalVentas = pagados.reduce((s, p) => s + p.total, 0);
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const utilidadNeta = totalVentas - totalGastos;
  const ticketPromedio = pagados.length > 0 ? totalVentas / pagados.length : 0;

  // By payment method
  const efectivo = pagados.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0);
  const transferencia = pagados.filter(p => p.metodoPago === 'transferencia').reduce((s, p) => s + p.total, 0);

  // By canal
  const ventasQR = pagados.filter(p => p.observaciones.includes('[QR]')).reduce((s, p) => s + p.total, 0);
  const ventasMesero = pagados.filter(p => p.observaciones.includes('[MESERO]')).reduce((s, p) => s + p.total, 0);
  const ventasDomicilio = pagados.filter(p => p.observaciones.includes('[QR_REDES]')).reduce((s, p) => s + p.total, 0);

  // By mesero
  const meseroCounts: Record<string, { pedidos: number; total: number }> = {};
  pagados.filter(p => p.meseroNombre).forEach(p => {
    if (!meseroCounts[p.meseroNombre]) meseroCounts[p.meseroNombre] = { pedidos: 0, total: 0 };
    meseroCounts[p.meseroNombre].pedidos++;
    meseroCounts[p.meseroNombre].total += p.total;
  });

  // Ventas por día (for week/month view)
  const ventasPorDia: Record<string, number> = {};
  pagados.forEach(p => {
    const key = new Date(p.creadoEn).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    ventasPorDia[key] = (ventasPorDia[key] || 0) + p.total;
  });
  const diasArr = Object.entries(ventasPorDia).slice(-14);
  const maxDia = Math.max(...diasArr.map(d => d[1]), 1);

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Corte de Caja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reporte financiero — {periodo === 'hoy' ? 'Hoy' : periodo === 'semana' ? 'Últimos 7 días' : 'Este mes'}</p>
        </div>
        <div className="flex gap-1 bg-[#16161f] rounded-lg p-1 border border-white/5">
          {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${periodo === p ? 'bg-brand-500 text-black' : 'text-gray-400 hover:text-white'}`}>
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl bg-[#16161f] border border-green-500/20 p-4">
          <p className="text-[10px] text-gray-500">Total Ventas</p>
          <p className="text-xl font-bold text-green-400">{fmt(totalVentas)}</p>
          <p className="text-[9px] text-gray-600">{pagados.length} pedidos</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-red-500/20 p-4">
          <p className="text-[10px] text-gray-500">Total Gastos</p>
          <p className="text-xl font-bold text-red-400">-{fmt(totalGastos)}</p>
          <p className="text-[9px] text-gray-600">{gastos.length} registros</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-brand-500/20 p-4">
          <p className="text-[10px] text-gray-500">Utilidad Neta</p>
          <p className={`text-xl font-bold ${utilidadNeta >= 0 ? 'text-brand-400' : 'text-red-400'}`}>{fmt(utilidadNeta)}</p>
          <p className="text-[9px] text-gray-600">Margen: {totalVentas > 0 ? ((utilidadNeta / totalVentas) * 100).toFixed(0) : 0}%</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-[10px] text-gray-500">Ticket Promedio</p>
          <p className="text-xl font-bold text-white">{fmt(ticketPromedio)}</p>
          <p className="text-[9px] text-gray-600">por pedido</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-[10px] text-gray-500">Pedidos Totales</p>
          <p className="text-xl font-bold text-white">{pedidos.length}</p>
          <p className="text-[9px] text-gray-600">{pedidos.length - pagados.length} pendientes</p>
        </div>
      </div>

      {/* Chart */}
      {diasArr.length > 1 && (
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ventas por Día</h3>
          <div className="flex items-end gap-2 h-32">
            {diasArr.map(([label, val]) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-gradient-to-t from-brand-500 to-brand-400 min-h-[2px] transition-all" style={{ height: `${(val / maxDia) * 100}%` }} />
                <span className="text-[8px] text-gray-600 truncate w-full text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By method */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Por Método de Pago</h3>
          <div className="space-y-3">
            <Row label="💵 Efectivo" value={fmt(efectivo)} pct={totalVentas > 0 ? (efectivo/totalVentas*100) : 0} color="green" />
            <Row label="📱 Transferencia" value={fmt(transferencia)} pct={totalVentas > 0 ? (transferencia/totalVentas*100) : 0} color="blue" />
          </div>
        </div>

        {/* By canal */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Por Canal</h3>
          <div className="space-y-3">
            <Row label="🟡 QR Mesa" value={fmt(ventasQR)} pct={totalVentas > 0 ? (ventasQR/totalVentas*100) : 0} color="yellow" />
            <Row label="🔵 Mesero" value={fmt(ventasMesero)} pct={totalVentas > 0 ? (ventasMesero/totalVentas*100) : 0} color="blue" />
            <Row label="🟢 Domicilio" value={fmt(ventasDomicilio)} pct={totalVentas > 0 ? (ventasDomicilio/totalVentas*100) : 0} color="green" />
          </div>
        </div>

        {/* By mesero */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Por Mesero</h3>
          {Object.keys(meseroCounts).length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(meseroCounts).map(([nombre, data]) => (
                <div key={nombre} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white font-medium">{nombre}</p>
                    <p className="text-[9px] text-gray-500">{data.pedidos} pedidos</p>
                  </div>
                  <span className="text-xs font-bold text-brand-400">{fmt(data.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pedidos detalle */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Detalle de Pedidos ({pagados.length} pagados)</h3>
        {pagados.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-6">Sin pedidos pagados en este período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-500">Pedido</th>
                  <th className="text-left py-2 text-gray-500">Mesa</th>
                  <th className="text-left py-2 text-gray-500">Mesero</th>
                  <th className="text-left py-2 text-gray-500">Método</th>
                  <th className="text-left py-2 text-gray-500">Hora</th>
                  <th className="text-right py-2 text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pagados.slice(0, 20).map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 text-white font-medium">#{p.numero.split('-').pop()}</td>
                    <td className="py-2 text-gray-400">{p.mesaZona?.split(' - ')[0] || '—'}</td>
                    <td className="py-2 text-gray-400">{p.meseroNombre || '—'}</td>
                    <td className="py-2"><span className={`px-1.5 py-0.5 rounded text-[9px] ${p.metodoPago === 'efectivo' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>{p.metodoPago || '—'}</span></td>
                    <td className="py-2 text-gray-500">{new Date(p.creadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-2 text-right font-bold text-brand-400">{fmt(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen socios */}
      <div className="rounded-xl bg-gradient-to-r from-[#16161f] to-[#1a1525] border border-brand-500/10 p-5">
        <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-4">Resumen para Socios</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Ingresos totales:</span><span className="text-green-400 font-bold">{fmt(totalVentas)}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Gastos operativos:</span><span className="text-red-400 font-bold">-{fmt(totalGastos)}</span></div>
          <div className="flex justify-between border-t border-white/5 pt-2 mt-2"><span className="text-white font-bold">Utilidad neta:</span><span className={`font-bold text-lg ${utilidadNeta >= 0 ? 'text-brand-400' : 'text-red-400'}`}>{fmt(utilidadNeta)}</span></div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  const colorMap: Record<string, string> = { green: 'bg-green-400', blue: 'bg-blue-400', yellow: 'bg-yellow-400', red: 'bg-red-400', brand: 'bg-brand-400' };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorMap[color] || 'bg-brand-400'} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
