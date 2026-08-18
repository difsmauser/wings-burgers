'use client';

import { useState, useEffect, useCallback } from 'react';

interface Gasto {
  id: string;
  monto: number;
  concepto: string;
  categoria: string;
  fecha: string;
  creadoEn?: string;
}

const CATEGORIAS = [
  { value: 'insumos', label: 'Insumos', icon: '🥩', color: '#f97316' },
  { value: 'servicios', label: 'Servicios', icon: '💡', color: '#3b82f6' },
  { value: 'nomina', label: 'Nómina', icon: '👥', color: '#8b5cf6' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧', color: '#eab308' },
  { value: 'repartidor', label: 'Repartidor', icon: '🛵', color: '#22c55e' },
  { value: 'marketing', label: 'Marketing', icon: '📢', color: '#ec4899' },
  { value: 'otros', label: 'Otros', icon: '📎', color: '#6b7280' },
];

type FiltroCategoria = string | 'todas';

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroCategoria>('todas');

  // Form
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('insumos');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  const fetchGastos = useCallback(async () => {
    try {
      const res = await fetch('/api/gastos');
      if (res.ok) { const j = await res.json(); setGastos(j.data || []); }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGastos(); }, [fetchGastos]);

  const handleGuardar = async () => {
    if (!monto || !concepto.trim()) { setError('Monto y concepto requeridos'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: parseFloat(monto), concepto, categoria, fecha }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setShowModal(false); setMonto(''); setConcepto(''); setCategoria('insumos');
      setFecha(new Date().toISOString().slice(0, 10)); fetchGastos();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleEliminar = async (id: string) => {
    await fetch(`/api/gastos?id=${id}`, { method: 'DELETE' });
    fetchGastos();
  };

  // === Calculations ===
  const now = new Date();
  const gastosFiltrados = filtro === 'todas' ? gastos : gastos.filter(g => g.categoria === filtro);

  // Current month
  const gastosMes = gastos.filter(g => {
    const d = new Date(g.fecha);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalMes = gastosMes.reduce((s, g) => s + g.monto, 0);

  // Previous month
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const gastosMesAnterior = gastos.filter(g => {
    const d = new Date(g.fecha);
    return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
  });
  const totalMesAnterior = gastosMesAnterior.reduce((s, g) => s + g.monto, 0);

  // Daily average (current month)
  const diasTranscurridos = now.getDate();
  const promedioDiario = diasTranscurridos > 0 ? totalMes / diasTranscurridos : 0;

  // Top category
  const porCategoria: Record<string, number> = {};
  gastosMes.forEach(g => { porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto; });
  const categoriaTop = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];
  const totalDonut = Object.values(porCategoria).reduce((s, v) => s + v, 0);

  // Trend calc
  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Monthly trend (last 6 months)
  const monthlyTrend: Array<{ month: string; total: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthGastos = gastos.filter(g => {
      const d = new Date(g.fecha);
      return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
    });
    monthlyTrend.push({
      month: m.toLocaleDateString('es-MX', { month: 'short' }),
      total: monthGastos.reduce((s, g) => s + g.monto, 0),
    });
  }
  const maxMonthly = Math.max(...monthlyTrend.map(m => m.total), 1);

  // Donut data
  const donutData = CATEGORIAS
    .filter(c => porCategoria[c.value] > 0)
    .map(c => ({ label: c.label, value: porCategoria[c.value], color: c.color, icon: c.icon }));

  const getCatInfo = (cat: string) => CATEGORIAS.find(c => c.value === cat) || { icon: '📎', label: cat, color: '#6b7280', value: 'otros' };
  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
        <p className="text-xs text-gray-500 animate-pulse">Cargando gastos...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
            </div>
            Gastos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Control de egresos del negocio</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all active:scale-[0.97]">
          + Registrar Gasto
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        <KPICard
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Total del Mes"
          value={fmt(totalMes)}
          trend={calcTrend(totalMes, totalMesAnterior)}
          color="rose"
          invertTrend
        />
        <KPICard
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          label="Promedio Diario"
          value={fmt(promedioDiario)}
          color="amber"
          sub={`${diasTranscurridos} días`}
        />
        <KPICard
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          label="Categoría Top"
          value={categoriaTop ? getCatInfo(categoriaTop[0]).label : '—'}
          color="violet"
          sub={categoriaTop ? fmt(categoriaTop[1]) : ''}
        />
        <KPICard
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          label="Registros Mes"
          value={String(gastosMes.length)}
          color="blue"
          sub={`${gastos.length} total`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut: Gastos por Categoría */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Gastos por Categoría</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Distribución del mes actual</p>
            </div>
          </div>
          {donutData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-xs text-gray-600">Sin gastos este mes</div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              {/* SVG Donut */}
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 150 150">
                  {(() => {
                    const radius = 60;
                    const circumference = 2 * Math.PI * radius;
                    let cumulativeOffset = 0;
                    return donutData.map((item, i) => {
                      const pct = item.value / totalDonut;
                      const strokeLen = pct * circumference;
                      const offset = cumulativeOffset;
                      cumulativeOffset += strokeLen;
                      return (
                        <circle
                          key={i}
                          cx="75" cy="75" r={radius}
                          fill="none" stroke={item.color} strokeWidth="20"
                          strokeDasharray={`${strokeLen} ${circumference - strokeLen}`}
                          strokeDashoffset={-offset}
                          className="transition-all duration-700 ease-out"
                          style={{ opacity: 0.85 }}
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-bold text-white">{fmt(totalDonut)}</span>
                  <span className="text-[9px] text-gray-500">Este mes</span>
                </div>
              </div>
              {/* Legend */}
              <div className="w-full space-y-2">
                {donutData.map((item, i) => {
                  const pct = totalDonut > 0 ? ((item.value / totalDonut) * 100).toFixed(0) : '0';
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] text-gray-400">{item.icon} {item.label}</span>
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
          )}
        </div>

        {/* Line Chart: Tendencia Mensual */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Tendencia Mensual</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">Últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
              <span className="w-3 h-0.5 rounded bg-rose-400" />
              <span className="text-[9px] text-gray-500">Gastos</span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative h-48">
            <svg className="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 1, 2, 3].map(i => (
                <line key={i} x1="0" y1={i * 30 + 10} x2="300" y2={i * 30 + 10} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              ))}

              {/* Area fill */}
              <path
                d={(() => {
                  const points = monthlyTrend.map((m, i) => ({
                    x: (i / (monthlyTrend.length - 1)) * 280 + 10,
                    y: 110 - (m.total / maxMonthly) * 90,
                  }));
                  if (points.length < 2) return '';
                  let path = `M ${points[0].x} ${points[0].y}`;
                  for (let i = 1; i < points.length; i++) {
                    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
                    const cp1y = points[i - 1].y;
                    const cp2x = points[i].x - (points[i].x - points[i - 1].x) / 3;
                    const cp2y = points[i].y;
                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
                  }
                  path += ` L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`;
                  return path;
                })()}
                fill="url(#areaGradient)"
                className="transition-all duration-700"
              />

              {/* Line */}
              <path
                d={(() => {
                  const points = monthlyTrend.map((m, i) => ({
                    x: (i / (monthlyTrend.length - 1)) * 280 + 10,
                    y: 110 - (m.total / maxMonthly) * 90,
                  }));
                  if (points.length < 2) return '';
                  let path = `M ${points[0].x} ${points[0].y}`;
                  for (let i = 1; i < points.length; i++) {
                    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
                    const cp1y = points[i - 1].y;
                    const cp2x = points[i].x - (points[i].x - points[i - 1].x) / 3;
                    const cp2y = points[i].y;
                    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
                  }
                  return path;
                })()}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-all duration-700"
              />

              {/* Points */}
              {monthlyTrend.map((m, i) => {
                const x = (i / (monthlyTrend.length - 1)) * 280 + 10;
                const y = 110 - (m.total / maxMonthly) * 90;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="#12121a" stroke="#f43f5e" strokeWidth="2" className="transition-all duration-500" />
                    {i === monthlyTrend.length - 1 && (
                      <circle cx={x} cy={y} r="6" fill="none" stroke="#f43f5e" strokeWidth="1" opacity="0.4" className="animate-pulse" />
                    )}
                  </g>
                );
              })}

              {/* Gradient definition */}
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
              {monthlyTrend.map((m, i) => (
                <span key={i} className="text-[9px] text-gray-600 capitalize">{m.month}</span>
              ))}
            </div>
          </div>

          {/* Monthly values below chart */}
          <div className="flex justify-between mt-4 pt-3 border-t border-white/5 px-1">
            {monthlyTrend.map((m, i) => (
              <div key={i} className="text-center">
                <p className={`text-[10px] font-medium ${i === monthlyTrend.length - 1 ? 'text-rose-400' : 'text-gray-500'}`}>
                  {m.total > 0 ? fmt(m.total) : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table with filter */}
      <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Registros de Gastos</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">{gastosFiltrados.length} registros{filtro !== 'todas' ? ` en ${getCatInfo(filtro).label}` : ''}</p>
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setFiltro('todas')} className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${filtro === 'todas' ? 'bg-brand-500 text-black' : 'text-gray-400 hover:text-white bg-white/5 border border-white/5'}`}>
              Todas
            </button>
            {CATEGORIAS.map(c => (
              <button
                key={c.value}
                onClick={() => setFiltro(c.value)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 ${filtro === c.value ? 'bg-brand-500 text-black' : 'text-gray-400 hover:text-white bg-white/5 border border-white/5'}`}
                title={c.label}
              >
                <span>{c.icon}</span>
                <span className="hidden sm:inline">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {gastosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl opacity-40">💰</span>
            </div>
            <p className="text-xs text-gray-500">Sin gastos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="text-right py-3 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {gastosFiltrados.slice(0, 40).map(g => {
                  const catInfo = getCatInfo(g.categoria);
                  const catColorMap: Record<string, string> = {
                    insumos: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                    servicios: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    nomina: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                    mantenimiento: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    repartidor: 'bg-green-500/10 text-green-400 border-green-500/20',
                    marketing: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                    otros: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                  };
                  return (
                    <tr key={g.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 px-3 text-gray-400">
                        {new Date(g.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-white font-medium">{g.concepto}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border ${catColorMap[g.categoria] || catColorMap.otros}`}>
                          <span>{catInfo.icon}</span>
                          {catInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-400">{fmt(g.monto)}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleEliminar(g.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 rounded"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-white">Registrar Gasto</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Monto *</label>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" step="0.01" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Concepto *</label>
                <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Descripción del gasto" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Categoría</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIAS.map(c => (
                    <button key={c.value} onClick={() => setCategoria(c.value)} className={`py-2.5 rounded-xl text-[10px] font-medium border transition-all ${categoria === c.value ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'text-gray-400 border-white/5 hover:border-white/10'}`}>
                      <span className="block text-base mb-0.5">{c.icon}</span>{c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all" />
              </div>
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg disabled:opacity-50 transition-all active:scale-[0.97]">
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === KPI Card ===
function KPICard({ icon, label, value, trend, color, sub, invertTrend }: {
  icon: React.ReactNode; label: string; value: string; trend?: number; color: string;
  sub?: string; invertTrend?: boolean;
}) {
  const isPositive = trend !== undefined ? (invertTrend ? trend <= 0 : trend >= 0) : true;
  const colorStyles: Record<string, { border: string; iconBg: string; iconText: string }> = {
    rose: { border: 'border-rose-500/20', iconBg: 'bg-rose-500/10', iconText: 'text-rose-400' },
    amber: { border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconText: 'text-amber-400' },
    violet: { border: 'border-violet-500/20', iconBg: 'bg-violet-500/10', iconText: 'text-violet-400' },
    blue: { border: 'border-blue-500/20', iconBg: 'bg-blue-500/10', iconText: 'text-blue-400' },
  };
  const s = colorStyles[color] || colorStyles.rose;

  return (
    <div className={`rounded-2xl bg-[#12121a] border ${s.border} p-4 relative overflow-hidden hover:border-white/10 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center ${s.iconText}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            <svg className={`w-3 h-3 ${!isPositive ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-lg font-bold text-white tracking-tight">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}
