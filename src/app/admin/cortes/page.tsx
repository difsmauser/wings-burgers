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

interface GastoCorte {
  monto: number;
  concepto: string;
  categoria: string;
  fecha: string;
}

type Periodo = 'hoy' | 'semana' | 'mes';

export default function CortesPage() {
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [pedidos, setPedidos] = useState<PedidoCorte[]>([]);
  const [pedidosPrev, setPedidosPrev] = useState<PedidoCorte[]>([]);
  const [gastos, setGastos] = useState<GastoCorte[]>([]);
  const [gastosPrev, setGastosPrev] = useState<GastoCorte[]>([]);
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

      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA');

      // Current period filter
      const filterByPeriod = (items: PedidoCorte[], period: Periodo, offset = 0) => {
        return items.filter(p => {
          const d = new Date(p.creadoEn);
          const adjusted = new Date(now.getTime() - offset);
          if (period === 'hoy') return d.toDateString() === adjusted.toDateString();
          if (period === 'semana') {
            const start = new Date(adjusted.getTime() - 7 * 86400000);
            const end = adjusted;
            return d >= start && d <= end;
          }
          if (period === 'mes') {
            return d.getMonth() === adjusted.getMonth() && d.getFullYear() === adjusted.getFullYear();
          }
          return true;
        });
      };

      setPedidos(filterByPeriod(all, periodo, 0));

      // Previous period for comparison
      const prevOffset = periodo === 'hoy' ? 86400000 : periodo === 'semana' ? 7 * 86400000 : 30 * 86400000;
      setPedidosPrev(filterByPeriod(all, periodo, prevOffset));

      // Gastos
      try {
        const gRes = await fetch('/api/gastos');
        if (gRes.ok) {
          const gj = await gRes.json();
          const gastosData: GastoCorte[] = (gj.data || []).map((g: Record<string, unknown>) => ({
            monto: typeof g.monto === 'number' ? g.monto : (g.monto as { valor?: number })?.valor || 0,
            concepto: g.concepto as string || '',
            categoria: g.categoria as string || '',
            fecha: g.fecha as string || '',
          }));

          const filterGastos = (items: GastoCorte[], offset = 0) => {
            return items.filter(g => {
              const gDate = typeof g.fecha === 'string' ? g.fecha.split('T')[0] : '';
              const adjusted = new Date(now.getTime() - offset);
              const adjStr = adjusted.toLocaleDateString('en-CA');
              if (periodo === 'hoy') return gDate === adjStr;
              if (periodo === 'semana') {
                const weekAgo = new Date(adjusted.getTime() - 7 * 86400000).toLocaleDateString('en-CA');
                return gDate >= weekAgo && gDate <= adjStr;
              }
              if (periodo === 'mes') {
                const monthStr = adjStr.substring(0, 7);
                return gDate.startsWith(monthStr);
              }
              return true;
            });
          };

          setGastos(filterGastos(gastosData, 0));
          setGastosPrev(filterGastos(gastosData, prevOffset));
        }
      } catch { /* */ }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // === Calculations ===
  const pagados = pedidos.filter(p => p.estadoPago === 'pagado');
  const pagadosPrev = pedidosPrev.filter(p => p.estadoPago === 'pagado');
  const totalVentas = pagados.reduce((s, p) => s + p.total, 0);
  const totalVentasPrev = pagadosPrev.reduce((s, p) => s + p.total, 0);
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const totalGastosPrev = gastosPrev.reduce((s, g) => s + g.monto, 0);
  const utilidadNeta = totalVentas - totalGastos;
  const utilidadPrev = totalVentasPrev - totalGastosPrev;
  const ticketPromedio = pagados.length > 0 ? totalVentas / pagados.length : 0;
  const ticketPrev = pagadosPrev.length > 0 ? totalVentasPrev / pagadosPrev.length : 0;
  const margen = totalVentas > 0 ? ((utilidadNeta / totalVentas) * 100).toFixed(0) : '0';

  // Trend calc
  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // === By payment method (donut data) ===
  const efectivo = pagados.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0);
  const transferencia = pagados.filter(p => p.metodoPago === 'transferencia').reduce((s, p) => s + p.total, 0);
  const otroMetodo = totalVentas - efectivo - transferencia;
  const metodoData = [
    { label: 'Efectivo', value: efectivo, color: '#22c55e' },
    { label: 'Transferencia', value: transferencia, color: '#8b5cf6' },
    { label: 'Otro', value: otroMetodo, color: '#6b7280' },
  ].filter(d => d.value > 0);

  // === By canal (donut data) ===
  const ventasDomicilio = pagados.filter(p => p.modalidad === 'domicilio').reduce((s, p) => s + p.total, 0);
  const ventasQR = pagados.filter(p => p.modalidad === 'local' && p.observaciones.includes('[QR]')).reduce((s, p) => s + p.total, 0);
  const ventasMesero = pagados.filter(p => p.modalidad === 'local' && !p.observaciones.includes('[QR]')).reduce((s, p) => s + p.total, 0);
  const canalData = [
    { label: 'QR Mesa', value: ventasQR, color: '#eab308' },
    { label: 'Mesero', value: ventasMesero, color: '#3b82f6' },
    { label: 'Domicilio', value: ventasDomicilio, color: '#22c55e' },
  ].filter(d => d.value > 0);

  // === Ventas por día (bar chart) ===
  const ventasPorDia: Record<string, number> = {};
  pagados.forEach(p => {
    const key = new Date(p.creadoEn).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    ventasPorDia[key] = (ventasPorDia[key] || 0) + p.total;
  });
  const diasArr = Object.entries(ventasPorDia).slice(-14);
  const maxDia = Math.max(...diasArr.map(d => d[1]), 1);

  // === Canal classification for table ===
  const getCanal = (p: PedidoCorte): { label: string; color: string } => {
    if (p.modalidad === 'domicilio') return { label: 'Domicilio', color: 'bg-green-500/10 text-green-400 border-green-500/20' };
    if (p.observaciones.includes('[QR]')) return { label: 'QR Mesa', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    return { label: 'Mesero', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  };

  // === Cocina vs Bar breakdown ===
  const categoriasBar = ['bar'];
  const ventasBar = pagados.reduce((s, p) => {
    const barTotal = p.items.filter(i => {
      const nombre = i.nombre.toLowerCase();
      return nombre.includes('cerveza') || nombre.includes('michelada') || nombre.includes('margarita') || nombre.includes('tequila') || nombre.includes('vino');
    }).reduce((sum, i) => sum + i.cantidad * i.precioUnitario, 0);
    return s + barTotal;
  }, 0);
  const ventasCocina = totalVentas - ventasBar;
  const pedidosConBar = pagados.filter(p => p.items.some(i => {
    const n = i.nombre.toLowerCase();
    return n.includes('cerveza') || n.includes('michelada') || n.includes('margarita') || n.includes('tequila') || n.includes('vino');
  })).length;
  const pedidosCocina = pagados.length - pedidosConBar + pedidosConBar; // All orders go through cocina, some also have bar items

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
        </div>
        <p className="text-xs text-gray-500 animate-pulse">Generando corte...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Corte de Caja</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Reporte financiero — {periodo === 'hoy' ? 'Hoy' : periodo === 'semana' ? 'Últimos 7 días' : 'Este mes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#12121a] rounded-xl p-1 border border-white/[0.06]">
            {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${periodo === p ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/20' : 'text-gray-400 hover:text-white'}`}>
                {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards with Variation */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger-children">
        <KPIVariation
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Total Ventas"
          value={fmt(totalVentas)}
          trend={calcTrend(totalVentas, totalVentasPrev)}
          color="emerald"
          sub={`${pagados.length} pedidos`}
        />
        <KPIVariation
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>}
          label="Gastos"
          value={fmt(totalGastos)}
          trend={calcTrend(totalGastos, totalGastosPrev)}
          color="rose"
          invertTrend
          sub={`${gastos.length} registros`}
        />
        <KPIVariation
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          label="Utilidad Neta"
          value={fmt(utilidadNeta)}
          trend={calcTrend(utilidadNeta, utilidadPrev)}
          color={utilidadNeta >= 0 ? 'emerald' : 'rose'}
          sub={`Margen ${margen}%`}
          highlight
        />
        <KPIVariation
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
          label="Ticket Promedio"
          value={fmt(ticketPromedio)}
          trend={calcTrend(ticketPromedio, ticketPrev)}
          color="violet"
        />
        <KPIVariation
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          label="Pedidos"
          value={String(pagados.length)}
          trend={calcTrend(pagados.length, pagadosPrev.length)}
          color="blue"
        />
      </div>

      {/* Charts Row: Donut + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Donut: Método de Pago */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Método de Pago</h3>
          <p className="text-[11px] text-gray-500 mb-5">Distribución por tipo</p>
          <DonutChart data={metodoData} total={totalVentas} />
        </div>

        {/* Donut: Canal de Venta */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Canal de Venta</h3>
          <p className="text-[11px] text-gray-500 mb-5">Distribución por canal</p>
          <DonutChart data={canalData} total={totalVentas} />
        </div>

        {/* Bar: Ventas por Día */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Ventas por Día</h3>
          <p className="text-[11px] text-gray-500 mb-5">Tendencia del período</p>
          {diasArr.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs text-gray-600">Sin datos</div>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {diasArr.map(([dia, val], i) => {
                const h = Math.max((val / maxDia) * 100, 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-sm border border-white/10">
                        <span className="text-[9px] font-medium text-white whitespace-nowrap">{fmt(val)}</span>
                      </div>
                    </div>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-brand-500/80 to-brand-400/60 group-hover:from-brand-400 group-hover:to-brand-300 transition-all duration-300"
                      style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
                    />
                    <span className="text-[8px] text-gray-600 whitespace-nowrap">{dia.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cocina vs Bar Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cocina */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Cocina</h3>
              <p className="text-[10px] text-gray-500">Alitas, hamburguesas, platillos, complementos</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ventas Cocina</p>
              <p className="text-lg font-bold text-orange-400 mt-1">{fmt(ventasCocina)}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pedidos</p>
              <p className="text-lg font-bold text-white mt-1">{pagados.length}</p>
              <p className="text-[9px] text-gray-600">todos pasan por cocina</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[10px] text-gray-500 mb-2">Incluye:</p>
            <div className="flex flex-wrap gap-1.5">
              {['Alitas', 'Hamburguesas', 'Boneless', 'Combos', 'Platillos', 'Complementos'].map(cat => (
                <span key={cat} className="px-2 py-0.5 rounded text-[9px] font-medium bg-orange-500/5 text-orange-400/80 border border-orange-500/10">{cat}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Bar */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Bar</h3>
              <p className="text-[10px] text-gray-500">Cervezas, micheladas, cocteles, vinos</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ventas Bar</p>
              <p className="text-lg font-bold text-purple-400 mt-1">{fmt(ventasBar)}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pedidos c/ Bar</p>
              <p className="text-lg font-bold text-white mt-1">{pedidosConBar}</p>
              <p className="text-[9px] text-gray-600">incluyen bebidas bar</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[10px] text-gray-500 mb-2">Incluye:</p>
            <div className="flex flex-wrap gap-1.5">
              {['Cerveza', 'Michelada', 'Margarita', 'Tequila', 'Vino'].map(cat => (
                <span key={cat} className="px-2 py-0.5 rounded text-[9px] font-medium bg-purple-500/5 text-purple-400/80 border border-purple-500/10">{cat}</span>
              ))}
            </div>
          </div>
          {ventasBar === 0 && (
            <p className="text-[10px] text-gray-600 mt-3 text-center italic">Sin ventas de bar en este período</p>
          )}
        </div>
      </div>

      {/* Pedidos Table with colored badges */}
      <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Pedidos del Período</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">{pagados.length} pedidos pagados</p>
          </div>
        </div>

        {pagados.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl opacity-40">📋</span>
            </div>
            <p className="text-xs text-gray-500">Sin pedidos en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pedido</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Canal</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Mesa</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Mesero</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Método</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Hora</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pagados.sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()).slice(0, 50).map(p => {
                  const canal = getCanal(p);
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-white">#{p.numero.split('-').pop()}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${canal.color}`}>
                          {canal.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400">{p.mesaZona?.split(' - ')[0] || '—'}</td>
                      <td className="py-3 px-3 text-gray-400">{p.meseroNombre || '—'}</td>
                      <td className="py-3 px-3">
                        <span className="text-gray-300 capitalize">{p.metodoPago || '—'}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {new Date(p.creadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-bold text-white">{fmt(p.total)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gastos Section */}
      {gastos.length > 0 && (
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Gastos del Período</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">{gastos.length} registros — {fmt(totalGastos)} total</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {gastos.map((g, idx) => {
                  const catColors: Record<string, string> = {
                    insumos: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                    servicios: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    nomina: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                    mantenimiento: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    repartidor: 'bg-green-500/10 text-green-400 border-green-500/20',
                    marketing: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                    otros: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                  };
                  const catIcons: Record<string, string> = {
                    insumos: '🥩', servicios: '💡', nomina: '👥', mantenimiento: '🔧',
                    repartidor: '🛵', marketing: '📢', otros: '📎',
                  };
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 text-gray-400">
                        {new Date(g.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="py-3 px-3 text-white font-medium">{g.concepto}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${catColors[g.categoria] || catColors.otros}`}>
                          <span>{catIcons[g.categoria] || '📎'}</span>
                          <span className="capitalize">{g.categoria}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-400">-{fmt(g.monto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumen para Socios */}
      <div className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a24] border border-brand-500/10 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Resumen para Socios
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ingresos</p>
            <p className="text-xl font-bold text-green-400 mt-1">{fmt(totalVentas)}</p>
          </div>
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Egresos</p>
            <p className="text-xl font-bold text-rose-400 mt-1">-{fmt(totalGastos)}</p>
          </div>
          <div className={`p-4 rounded-xl border ${utilidadNeta >= 0 ? 'bg-brand-500/5 border-brand-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Utilidad Neta</p>
            <p className={`text-xl font-bold mt-1 ${utilidadNeta >= 0 ? 'text-brand-400' : 'text-rose-400'}`}>{fmt(utilidadNeta)}</p>
            <p className="text-[9px] text-gray-600 mt-0.5">Margen: {margen}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// === Donut Chart Component (Pure CSS/SVG) ===
function DonutChart({ data, total }: { data: Array<{ label: string; value: number; color: string }>; total: number }) {
  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-gray-600">Sin datos</div>
    );
  }

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG Donut */}
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 150 150">
          {data.map((item, i) => {
            const pct = item.value / total;
            const strokeLen = pct * circumference;
            const offset = cumulativeOffset;
            cumulativeOffset += strokeLen;
            return (
              <circle
                key={i}
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="18"
                strokeDasharray={`${strokeLen} ${circumference - strokeLen}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700 ease-out"
                style={{ opacity: 0.85 }}
              />
            );
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-white">{fmt(total)}</span>
          <span className="text-[9px] text-gray-500">Total</span>
        </div>
      </div>
      {/* Legend */}
      <div className="w-full space-y-2">
        {data.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
          return (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-gray-400">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-white">{fmt(item.value)}</span>
                <span className="text-[9px] text-gray-600">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === KPI Card with Variation ===
function KPIVariation({ icon, label, value, trend, color, sub, highlight, invertTrend }: {
  icon: React.ReactNode; label: string; value: string; trend: number; color: string;
  sub?: string; highlight?: boolean; invertTrend?: boolean;
}) {
  const isPositive = invertTrend ? trend <= 0 : trend >= 0;
  const colorStyles: Record<string, { border: string; iconBg: string; iconText: string }> = {
    emerald: { border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400' },
    blue: { border: 'border-blue-500/20', iconBg: 'bg-blue-500/10', iconText: 'text-blue-400' },
    violet: { border: 'border-violet-500/20', iconBg: 'bg-violet-500/10', iconText: 'text-violet-400' },
    rose: { border: 'border-rose-500/20', iconBg: 'bg-rose-500/10', iconText: 'text-rose-400' },
  };
  const s = colorStyles[color] || colorStyles.emerald;

  return (
    <div className={`rounded-2xl bg-[#12121a] border ${s.border} p-4 relative overflow-hidden group hover:border-white/10 transition-all duration-300 ${highlight ? 'ring-1 ring-brand-500/10' : ''}`}>
      {highlight && <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] to-transparent" />}
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center ${s.iconText}`}>
            {icon}
          </div>
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            <svg className={`w-3 h-3 ${!isPositive ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {Math.abs(trend)}%
          </div>
        </div>
        <p className="text-lg font-bold text-white tracking-tight">{value}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
