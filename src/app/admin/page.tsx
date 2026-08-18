'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface PedidoResumen {
  id: string;
  numero: string;
  total: number;
  estado: string;
  estadoPago: string;
  mesaZona: string;
  modalidad: string;
  meseroNombre: string;
  observaciones: string;
  creadoEn: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
}

export default function AdminDashboardPage() {
  const [pedidosHoy, setPedidosHoy] = useState<PedidoResumen[]>([]);
  const [pedidosAyer, setPedidosAyer] = useState<PedidoResumen[]>([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [totalMeseros, setTotalMeseros] = useState(0);
  const [gastosHoy, setGastosHoy] = useState(0);
  const [gastosAyer, setGastosAyer] = useState(0);
  const [loading, setLoading] = useState(true);
  const actividadRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const prodRes = await fetch('/api/productos');
      if (prodRes.ok) { const j = await prodRes.json(); setTotalProductos(j.data?.length || 0); }

      const mesRes = await fetch('/api/meseros');
      if (mesRes.ok) { const j = await mesRes.json(); setTotalMeseros(j.data?.length || 0); }

      const estados = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido', 'entregado'];
      const allPedidos: PedidoResumen[] = [];
      for (const estado of estados) {
        const res = await fetch(`/api/pedidos?estado=${estado}`);
        if (res.ok) {
          const j = await res.json();
          (j.data || []).forEach((p: Record<string, unknown>) => {
            allPedidos.push({
              id: p.id as string, numero: p.numero as string, total: p.total as number || 0,
              estado: p.estado as string, estadoPago: p.estadoPago as string || 'pendiente',
              mesaZona: p.mesaZona as string || '', modalidad: p.modalidad as string || 'local',
              meseroNombre: p.meseroNombre as string || '', observaciones: p.observaciones as string || '',
              creadoEn: p.creadoEn as string || '',
              items: (p.items as PedidoResumen['items']) || [],
            });
          });
        }
      }

      const today = new Date();
      const todayStr = today.toDateString();
      const yesterday = new Date(today.getTime() - 86400000);
      const yesterdayStr = yesterday.toDateString();

      setPedidosHoy(allPedidos.filter(p => new Date(p.creadoEn).toDateString() === todayStr));
      setPedidosAyer(allPedidos.filter(p => new Date(p.creadoEn).toDateString() === yesterdayStr));

      try {
        const gastosRes = await fetch('/api/gastos');
        if (gastosRes.ok) {
          const j = await gastosRes.json();
          const all = j.data || [];
          setGastosHoy(all.filter((g: { fecha: string }) => new Date(g.fecha).toDateString() === todayStr).reduce((s: number, g: { monto: number }) => s + g.monto, 0));
          setGastosAyer(all.filter((g: { fecha: string }) => new Date(g.fecha).toDateString() === yesterdayStr).reduce((s: number, g: { monto: number }) => s + g.monto, 0));
        }
      } catch { /* */ }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculations
  const pagadosHoy = pedidosHoy.filter(p => p.estadoPago === 'pagado');
  const pagadosAyer = pedidosAyer.filter(p => p.estadoPago === 'pagado');
  const ventasHoy = pagadosHoy.reduce((s, p) => s + p.total, 0);
  const ventasAyer = pagadosAyer.reduce((s, p) => s + p.total, 0);
  const pedidosActivos = pedidosHoy.filter(p => !['entregado', 'servido'].includes(p.estado)).length;
  const ticketPromedio = pagadosHoy.length > 0 ? ventasHoy / pagadosHoy.length : 0;
  const ticketPromedioAyer = pagadosAyer.length > 0 ? ventasAyer / pagadosAyer.length : 0;
  const utilidadNeta = ventasHoy - gastosHoy;
  const utilidadAyer = ventasAyer - gastosAyer;

  // Trend calculation
  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Ventas por hora (animated chart data)
  const ventasPorHora: number[] = Array(24).fill(0);
  pagadosHoy.forEach(p => {
    const h = new Date(p.creadoEn).getHours();
    ventasPorHora[h] += p.total;
  });
  const horaActual = new Date().getHours();
  const horasVisibles = ventasPorHora.slice(8, Math.max(horaActual + 1, 15));
  const maxVentaHora = Math.max(...horasVisibles, 1);

  // Top products with progress bars
  const productCount: Record<string, { nombre: string; cantidad: number; total: number }> = {};
  pedidosHoy.forEach(p => {
    p.items.forEach(item => {
      if (!productCount[item.nombre]) productCount[item.nombre] = { nombre: item.nombre, cantidad: 0, total: 0 };
      productCount[item.nombre].cantidad += item.cantidad;
      productCount[item.nombre].total += item.cantidad * item.precioUnitario;
    });
  });
  const topProductos = Object.values(productCount).sort((a, b) => b.cantidad - a.cantidad).slice(0, 6);
  const maxProducto = topProductos[0]?.cantidad || 1;

  // Recent activity (sorted by time, latest first)
  const recientes = [...pedidosHoy].sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()).slice(0, 15);

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-brand-500/10" />
          </div>
        </div>
        <p className="text-xs text-gray-500 animate-pulse">Cargando dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-medium text-green-400">En vivo</span>
          </div>
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all" title="Actualizar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {/* KPI Cards - Enterprise style */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger-children">
        <KPICard
          icon={<DollarIcon />}
          label="Ventas Hoy"
          value={fmt(ventasHoy)}
          trend={calcTrend(ventasHoy, ventasAyer)}
          color="emerald"
        />
        <KPICard
          icon={<OrderIcon />}
          label="Pedidos"
          value={String(pedidosHoy.length)}
          trend={calcTrend(pedidosHoy.length, pedidosAyer.length)}
          color="blue"
          sub={`${pedidosActivos} activos`}
        />
        <KPICard
          icon={<TicketIcon />}
          label="Ticket Promedio"
          value={fmt(ticketPromedio)}
          trend={calcTrend(ticketPromedio, ticketPromedioAyer)}
          color="violet"
        />
        <KPICard
          icon={<ExpenseIcon />}
          label="Gastos"
          value={fmt(gastosHoy)}
          trend={calcTrend(gastosHoy, gastosAyer)}
          color="rose"
          invertTrend
        />
        <KPICard
          icon={<ProfitIcon />}
          label="Utilidad Neta"
          value={fmt(utilidadNeta)}
          trend={calcTrend(utilidadNeta, utilidadAyer)}
          color={utilidadNeta >= 0 ? 'emerald' : 'rose'}
          highlight
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ventas por Hora - Animated Bar Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Ventas por Hora</h3>
              <p className="text-xs text-gray-500 mt-0.5">Distribución de ingresos hoy</p>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5">
              <span className="w-2 h-2 rounded-sm bg-brand-400" />
              <span className="text-[10px] text-gray-400">Ventas</span>
            </div>
          </div>
          <div className="flex items-end gap-[3px] h-44">
            {horasVisibles.map((v, i) => {
              const height = v > 0 ? Math.max((v / maxVentaHora) * 100, 4) : 2;
              const isCurrentHour = (i + 8) === horaActual;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full">
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="px-2 py-1 rounded-md bg-white/10 backdrop-blur-sm border border-white/10 whitespace-nowrap">
                      <span className="text-[10px] font-medium text-white">{fmt(v)}</span>
                    </div>
                  </div>
                  {/* Bar container */}
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-all duration-700 ease-out relative overflow-hidden ${
                        isCurrentHour
                          ? 'bg-gradient-to-t from-brand-500 to-brand-300 shadow-[0_0_12px_rgba(245,166,35,0.3)]'
                          : v > 0
                            ? 'bg-gradient-to-t from-brand-500/80 to-brand-400/60 group-hover:from-brand-400 group-hover:to-brand-300'
                            : 'bg-white/[0.04]'
                      }`}
                      style={{
                        height: `${height}%`,
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      {isCurrentHour && (
                        <div className="absolute inset-0 animate-shimmer" />
                      )}
                    </div>
                  </div>
                  {/* Label */}
                  <span className={`text-[9px] ${isCurrentHour ? 'text-brand-400 font-bold' : 'text-gray-600'}`}>
                    {i + 8}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Summary under chart */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/5">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Hora pico</p>
              <p className="text-sm font-bold text-white">
                {ventasPorHora.indexOf(Math.max(...ventasPorHora))}:00
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Máximo</p>
              <p className="text-sm font-bold text-brand-400">{fmt(maxVentaHora)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Promedio/hr</p>
              <p className="text-sm font-bold text-white">
                {fmt(ventasHoy / Math.max(horasVisibles.filter(v => v > 0).length, 1))}
              </p>
            </div>
          </div>
        </div>

        {/* Top Productos with Progress Bars */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Top Productos</h3>
              <p className="text-xs text-gray-500 mt-0.5">Los más vendidos hoy</p>
            </div>
            <Link href="/admin/productos" className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors">
              Ver todos →
            </Link>
          </div>
          {topProductos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                <span className="text-xl opacity-40">🍗</span>
              </div>
              <p className="text-xs text-gray-500">Sin ventas aún hoy</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProductos.map((p, i) => (
                <div key={p.nombre} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? 'bg-brand-500/20 text-brand-400' :
                        i === 1 ? 'bg-gray-500/20 text-gray-300' :
                        'bg-white/5 text-gray-500'
                      }`}>{i + 1}</span>
                      <span className="text-xs text-white font-medium truncate max-w-[120px]">{p.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-brand-400">{fmt(p.total)}</span>
                      <span className="text-[9px] text-gray-600 ml-1.5">×{p.cantidad}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        i === 0 ? 'bg-gradient-to-r from-brand-500 to-brand-300' :
                        i === 1 ? 'bg-gradient-to-r from-brand-500/70 to-brand-400/50' :
                        'bg-brand-500/40'
                      }`}
                      style={{ width: `${(p.cantidad / maxProducto) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Real-time Activity Feed */}
        <div className="lg:col-span-3 rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-white">Actividad en Tiempo Real</h3>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <Link href="/admin/cortes" className="text-[10px] text-gray-400 hover:text-white transition-colors flex items-center gap-1">
              Historial completo
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          {recientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                <span className="text-xl opacity-40">📋</span>
              </div>
              <p className="text-xs text-gray-500">Sin actividad hoy</p>
            </div>
          ) : (
            <div ref={actividadRef} className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
              {recientes.map((p, idx) => {
                const isQR = p.observaciones.includes('[QR]');
                const isDomicilio = p.modalidad === 'domicilio';
                const canalColor = isDomicilio ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  isQR ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20';
                const canalLabel = isDomicilio ? 'Domicilio' : isQR ? 'QR Mesa' : 'Mesero';
                const timeAgo = getTimeAgo(p.creadoEn);

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-all group"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      p.estadoPago === 'pagado' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
                    }`} />
                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">#{p.numero.split('-').pop()}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${canalColor}`}>
                          {canalLabel}
                        </span>
                        {p.mesaZona && (
                          <span className="text-[10px] text-gray-500 truncate">{p.mesaZona.split(' - ')[0]}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                        {p.items.slice(0, 2).map(i => `${i.cantidad}× ${i.nombre}`).join(', ')}
                        {p.items.length > 2 && ` +${p.items.length - 2} más`}
                      </p>
                    </div>
                    {/* Amount & time */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-white">{fmt(p.total)}</p>
                      <p className="text-[9px] text-gray-600">{timeAgo}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats & Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Operational Summary */}
          <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Resumen Operativo</h3>
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric icon="🍗" label="Productos" value={String(totalProductos)} />
              <MiniMetric icon="🧑‍🍳" label="Meseros" value={String(totalMeseros)} />
              <MiniMetric icon="✅" label="Completados" value={String(pagadosHoy.length)} />
              <MiniMetric icon="⏳" label="En proceso" value={String(pedidosActivos)} pulse={pedidosActivos > 0} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/admin/cortes" icon="📊" label="Corte de Caja" />
              <QuickAction href="/admin/gastos" icon="💸" label="Nuevo Gasto" />
              <QuickAction href="/admin/inventario" icon="📦" label="Inventario" />
              <QuickAction href="/admin/productos" icon="🍗" label="Productos" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// === Enterprise KPI Card Component ===
function KPICard({ icon, label, value, trend, color, sub, highlight, invertTrend }: {
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
          {/* Trend badge */}
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

// === Mini Metric Card ===
function MiniMetric({ icon, label, value, pulse }: { icon: string; label: string; value: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
        {icon}
      </div>
      <div>
        <p className={`text-sm font-bold text-white ${pulse ? 'animate-pulse' : ''}`}>{value}</p>
        <p className="text-[10px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// === Quick Action Button ===
function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 group">
      <span className="text-base group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[11px] font-medium text-gray-400 group-hover:text-white transition-colors">{label}</span>
    </Link>
  );
}

// === Time Ago Helper ===
function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// === SVG Icons ===
function DollarIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function OrderIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
}
function TicketIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
}
function ExpenseIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;
}
function ProfitIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
