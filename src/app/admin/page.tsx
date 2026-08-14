'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface PedidoResumen {
  id: string;
  numero: string;
  total: number;
  estado: string;
  estadoPago: string;
  mesaZona: string;
  modalidad: string;
  creadoEn: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
}

export default function AdminDashboardPage() {
  const [pedidosHoy, setPedidosHoy] = useState<PedidoResumen[]>([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [totalMeseros, setTotalMeseros] = useState(0);
  const [gastosHoy, setGastosHoy] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Products count
      const prodRes = await fetch('/api/productos');
      if (prodRes.ok) { const j = await prodRes.json(); setTotalProductos(j.data?.length || 0); }

      // Meseros count
      const mesRes = await fetch('/api/meseros');
      if (mesRes.ok) { const j = await mesRes.json(); setTotalMeseros(j.data?.length || 0); }

      // Today's orders (all states)
      const estados = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido', 'entregado'];
      const allPedidos: PedidoResumen[] = [];
      for (const estado of estados) {
        const res = await fetch(`/api/pedidos?estado=${estado}`);
        if (res.ok) {
          const j = await res.json();
          (j.data || []).forEach((p: Record<string, unknown>) => {
            allPedidos.push({
              id: p.id as string,
              numero: p.numero as string,
              total: p.total as number || 0,
              estado: p.estado as string,
              estadoPago: p.estadoPago as string || 'pendiente',
              mesaZona: p.mesaZona as string || '',
              modalidad: p.modalidad as string || 'local',
              creadoEn: p.creadoEn as string || '',
              items: (p.items as Array<{ nombre: string; cantidad: number; precioUnitario: number }>) || [],
            });
          });
        }
      }
      // Filter only today
      const today = new Date().toDateString();
      const hoy = allPedidos.filter(p => new Date(p.creadoEn).toDateString() === today);
      setPedidosHoy(hoy);

      // Gastos
      try {
        const gastosRes = await fetch('/api/gastos');
        if (gastosRes.ok) {
          const j = await gastosRes.json();
          const gastosHoyArr = (j.data || []).filter((g: { fecha: string }) => new Date(g.fecha).toDateString() === today);
          setGastosHoy(gastosHoyArr.reduce((s: number, g: { monto: number }) => s + g.monto, 0));
        }
      } catch { /* */ }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calculations
  const ventasHoy = pedidosHoy.filter(p => p.estadoPago === 'pagado').reduce((s, p) => s + p.total, 0);
  const pedidosPagados = pedidosHoy.filter(p => p.estadoPago === 'pagado').length;
  const pedidosActivos = pedidosHoy.filter(p => p.estadoPago !== 'pagado').length;
  const ticketPromedio = pedidosPagados > 0 ? ventasHoy / pedidosPagados : 0;
  const utilidadNeta = ventasHoy - gastosHoy;

  // Top products
  const productCount: Record<string, { nombre: string; cantidad: number; total: number }> = {};
  pedidosHoy.forEach(p => {
    p.items.forEach(item => {
      if (!productCount[item.nombre]) productCount[item.nombre] = { nombre: item.nombre, cantidad: 0, total: 0 };
      productCount[item.nombre].cantidad += item.cantidad;
      productCount[item.nombre].total += item.cantidad * item.precioUnitario;
    });
  });
  const topProductos = Object.values(productCount).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

  // Ventas por hora (chart data)
  const ventasPorHora: number[] = Array(24).fill(0);
  pedidosHoy.filter(p => p.estadoPago === 'pagado').forEach(p => {
    const h = new Date(p.creadoEn).getHours();
    ventasPorHora[h] += p.total;
  });
  const maxVentaHora = Math.max(...ventasPorHora, 1);

  // Recent activity
  const recientes = [...pedidosHoy].sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()).slice(0, 8);

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
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={fetchData} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-white/5 border border-white/10 hover:text-white transition-all">
          🔄 Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI label="Ventas Hoy" value={fmt(ventasHoy)} color="green" icon="💰" />
        <KPI label="Pedidos Hoy" value={String(pedidosHoy.length)} color="blue" icon="📋" sub={`${pedidosActivos} activos`} />
        <KPI label="Ticket Promedio" value={fmt(ticketPromedio)} color="brand" icon="🎫" />
        <KPI label="Gastos Hoy" value={fmt(gastosHoy)} color="red" icon="📉" />
        <KPI label="Utilidad Neta" value={fmt(utilidadNeta)} color={utilidadNeta >= 0 ? 'green' : 'red'} icon="📊" highlight />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ventas por hora */}
        <div className="lg:col-span-2 rounded-xl bg-[#16161f] border border-white/5 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ventas por Hora</h3>
          <div className="flex items-end gap-1 h-32">
            {ventasPorHora.slice(8, 23).map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-brand-500 to-brand-400 transition-all duration-500 min-h-[2px]"
                  style={{ height: `${(v / maxVentaHora) * 100}%` }}
                  title={`${i + 8}:00 — ${fmt(v)}`}
                />
                <span className="text-[8px] text-gray-600">{i + 8}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Productos */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Top Productos</h3>
          {topProductos.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-6">Sin ventas hoy</p>
          ) : (
            <div className="space-y-3">
              {topProductos.map((p, i) => (
                <div key={p.nombre} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{p.nombre}</p>
                    <p className="text-[10px] text-gray-500">{p.cantidad} vendidos</p>
                  </div>
                  <span className="text-xs font-bold text-brand-400">{fmt(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actividad Reciente</h3>
            <Link href="/admin/cortes" className="text-[10px] text-brand-400 hover:text-brand-300">Ver todo →</Link>
          </div>
          {recientes.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-6">Sin actividad hoy</p>
          ) : (
            <div className="space-y-2">
              {recientes.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${p.estadoPago === 'pagado' ? 'bg-green-400' : 'bg-amber-400'}`} />
                    <span className="text-xs text-white font-medium">#{p.numero.split('-').pop()}</span>
                    <span className="text-[10px] text-gray-500">{p.mesaZona?.split(' - ')[0] || p.modalidad}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-brand-400">{fmt(p.total)}</span>
                    <span className="text-[9px] text-gray-600">{new Date(p.creadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Resumen Operativo</h3>
          <div className="grid grid-cols-2 gap-4">
            <MiniStat label="Productos" value={String(totalProductos)} icon="🍗" />
            <MiniStat label="Meseros" value={String(totalMeseros)} icon="🧑‍🍳" />
            <MiniStat label="Pagados" value={String(pedidosPagados)} icon="✅" />
            <MiniStat label="En proceso" value={String(pedidosActivos)} icon="⏳" />
          </div>

          {/* Quick actions */}
          <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 gap-2">
            <Link href="/admin/cortes" className="py-2 px-3 rounded-lg text-[10px] font-medium text-center text-gray-400 bg-white/5 hover:text-white hover:bg-white/10 transition-all">📊 Generar Corte</Link>
            <Link href="/admin/gastos" className="py-2 px-3 rounded-lg text-[10px] font-medium text-center text-gray-400 bg-white/5 hover:text-white hover:bg-white/10 transition-all">💸 Registrar Gasto</Link>
            <Link href="/admin/productos" className="py-2 px-3 rounded-lg text-[10px] font-medium text-center text-gray-400 bg-white/5 hover:text-white hover:bg-white/10 transition-all">🍗 Productos</Link>
            <Link href="/admin/cuentas-bancarias" className="py-2 px-3 rounded-lg text-[10px] font-medium text-center text-gray-400 bg-white/5 hover:text-white hover:bg-white/10 transition-all">🏦 Cuentas</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color, icon, sub, highlight }: { label: string; value: string; color: string; icon: string; sub?: string; highlight?: boolean }) {
  const colorMap: Record<string, string> = {
    green: 'border-green-500/20 text-green-400',
    blue: 'border-blue-500/20 text-blue-400',
    brand: 'border-brand-500/20 text-brand-400',
    red: 'border-red-500/20 text-red-400',
  };
  return (
    <div className={`rounded-xl bg-[#16161f] border ${highlight ? 'border-brand-500/30 shadow-lg shadow-brand-500/5' : 'border-white/5'} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        {highlight && <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />}
      </div>
      <p className={`text-xl font-bold ${colorMap[color] || 'text-white'}`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-sm font-bold text-white">{value}</p>
        <p className="text-[10px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}
