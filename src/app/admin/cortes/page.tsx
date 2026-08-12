'use client';

import { useState, useEffect, useCallback } from 'react';

interface CorteData {
  totalVentas: number;
  totalGastos: number;
  gananciaNeta: number;
  numeroPedidos: number;
  ticketPromedio: number;
  ventasPorCanal: Record<string, number>;
  ventasPorModalidad: Record<string, number>;
}

type PeriodoCorte = 'hoy' | 'semana' | 'mes';

export default function CortesPage() {
  const [periodo, setPeriodo] = useState<PeriodoCorte>('hoy');
  const [corte, setCorte] = useState<CorteData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCorte = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all orders
      const estados = ['recibido', 'en_preparacion', 'empacado', 'listo', 'en_camino', 'entregado', 'servido'];
      const allPedidos: Array<{ total: number; estadoPago: string; observaciones: string; modalidad: string; creadoEn: string }> = [];
      
      for (const estado of estados) {
        const res = await fetch(`/api/pedidos?estado=${estado}`);
        if (res.ok) {
          const data = await res.json();
          (data.data || []).forEach((p: Record<string, unknown>) => {
            allPedidos.push({
              total: p.total as number || 0,
              estadoPago: p.estadoPago as string || 'pendiente',
              observaciones: p.observaciones as string || '',
              modalidad: p.modalidad as string || 'local',
              creadoEn: p.creadoEn as string || '',
            });
          });
        }
      }

      // Fetch gastos
      const gastosRes = await fetch('/api/gastos');
      const gastosData = gastosRes.ok ? await gastosRes.json() : { data: [] };
      const gastos: Array<{ monto: number; fecha: string }> = (gastosData.data || []);

      // Date filtering
      const now = new Date();
      const hoy = now.toISOString().split('T')[0];
      const inicioSemana = new Date(now); inicioSemana.setDate(now.getDate() - now.getDay());
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

      const filtrarFecha = (dateStr: string) => {
        if (!dateStr) return false;
        const d = dateStr.split('T')[0];
        if (periodo === 'hoy') return d === hoy;
        if (periodo === 'semana') return d >= inicioSemana.toISOString().split('T')[0];
        return d >= inicioMes.toISOString().split('T')[0];
      };

      // Filter by period
      const pedidosPeriodo = allPedidos.filter(p => filtrarFecha(p.creadoEn));
      const gastosPeriodo = gastos.filter(g => filtrarFecha(g.fecha));

      // Calculate
      const pedidosPagados = pedidosPeriodo.filter(p => p.estadoPago === 'pagado');
      const totalVentas = pedidosPagados.reduce((sum, p) => sum + p.total, 0);
      const totalGastos = gastosPeriodo.reduce((sum, g) => sum + g.monto, 0);

      // Ventas por canal
      const ventasPorCanal: Record<string, number> = { QR: 0, MESERO: 0, QR_REDES: 0 };
      pedidosPagados.forEach(p => {
        const match = p.observaciones.match(/\[(QR|QR_REDES|MESERO)\]/);
        const canal = match ? match[1] : 'QR';
        ventasPorCanal[canal] = (ventasPorCanal[canal] || 0) + p.total;
      });

      // Ventas por modalidad
      const ventasPorModalidad: Record<string, number> = {};
      pedidosPagados.forEach(p => {
        ventasPorModalidad[p.modalidad] = (ventasPorModalidad[p.modalidad] || 0) + p.total;
      });

      setCorte({
        totalVentas,
        totalGastos,
        gananciaNeta: totalVentas - totalGastos,
        numeroPedidos: pedidosPagados.length,
        ticketPromedio: pedidosPagados.length > 0 ? totalVentas / pedidosPagados.length : 0,
        ventasPorCanal,
        ventasPorModalidad,
      });
    } catch {} finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => { fetchCorte(); }, [fetchCorte]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Corte de Caja</h1>
          <p className="text-sm text-gray-500 mt-1">Reporte financiero global</p>
        </div>
        {/* Period selector */}
        <div className="flex gap-2">
          {(['hoy', 'semana', 'mes'] as PeriodoCorte[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all ${periodo === p ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-gray-400 bg-[#16161f] border border-white/5 hover:text-white'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center"><div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full mx-auto" /></div>
      ) : corte && (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-[#16161f] border border-green-500/20 p-5">
              <p className="text-xs text-gray-500">Total Ventas</p>
              <p className="text-3xl font-bold text-green-400 mt-1">${corte.totalVentas.toFixed(2)}</p>
              <p className="text-[10px] text-gray-600 mt-1">{corte.numeroPedidos} pedidos pagados</p>
            </div>
            <div className="rounded-xl bg-[#16161f] border border-red-500/20 p-5">
              <p className="text-xs text-gray-500">Total Gastos</p>
              <p className="text-3xl font-bold text-red-400 mt-1">-${corte.totalGastos.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-[#16161f] border border-brand-500/20 p-5">
              <p className="text-xs text-gray-500">Ganancia Neta</p>
              <p className={`text-3xl font-bold mt-1 ${corte.gananciaNeta >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                ${corte.gananciaNeta.toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">Ticket promedio: ${corte.ticketPromedio.toFixed(2)}</p>
            </div>
          </div>

          {/* Ventas por Canal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Ventas por Canal</h3>
              <div className="space-y-3">
                {Object.entries(corte.ventasPorCanal).map(([canal, monto]) => (
                  <div key={canal} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      {canal === 'QR' ? '🟡 QR Mesa' : canal === 'MESERO' ? '🔵 Mesero' : '🟢 Domicilio'}
                    </span>
                    <span className="text-sm font-bold text-white">${monto.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Ventas por Modalidad</h3>
              <div className="space-y-3">
                {Object.entries(corte.ventasPorModalidad).map(([mod, monto]) => (
                  <div key={mod} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 capitalize">
                      {mod === 'domicilio' ? '🛵 Domicilio' : mod === 'retiro' ? '🏪 Retiro' : '🍽️ Local'}
                    </span>
                    <span className="text-sm font-bold text-white">${monto.toFixed(2)}</span>
                  </div>
                ))}
                {Object.keys(corte.ventasPorModalidad).length === 0 && (
                  <p className="text-xs text-gray-600">Sin ventas en este período</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary for partners */}
          <div className="rounded-xl bg-[#16161f] border border-brand-500/10 p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Resumen para Socios</h3>
            <div className="bg-[#0d0d14] rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-400">Ingresos totales:</span><span className="text-green-400 font-bold">${corte.totalVentas.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Gastos operativos:</span><span className="text-red-400 font-bold">-${corte.totalGastos.toFixed(2)}</span></div>
              <div className="border-t border-white/5 my-2" />
              <div className="flex justify-between"><span className="text-white font-medium">Utilidad neta:</span><span className={`font-bold text-lg ${corte.gananciaNeta >= 0 ? 'text-brand-400' : 'text-red-400'}`}>${corte.gananciaNeta.toFixed(2)}</span></div>
              <p className="text-[10px] text-gray-600 pt-2 border-t border-white/5 mt-2">
                Este monto es la utilidad global del negocio. La distribución entre socios se realiza externamente.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
