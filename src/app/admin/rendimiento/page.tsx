'use client';

import { useState, useEffect, useCallback } from 'react';

interface Mesero {
  id: string;
  nombre: string;
  telefono: string | null;
  activo: boolean;
}

interface PedidoRendimiento {
  id: string;
  numero: string;
  total: number;
  estado: string;
  estadoPago: string;
  meseroId: string | null;
  meseroNombre: string | null;
  creadoEn: string;
  modalidad: string;
}

type Periodo = 'hoy' | 'semana' | 'mes';

export default function RendimientoMeserosPage() {
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [meseros, setMeseros] = useState<Mesero[]>([]);
  const [pedidos, setPedidos] = useState<PedidoRendimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tarifaPorEntrega, setTarifaPorEntrega] = useState(15); // MXN por entrega

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch meseros
      const meserosRes = await fetch('/api/meseros');
      if (meserosRes.ok) {
        const mj = await meserosRes.json();
        setMeseros(mj.data || []);
      }

      // Fetch all pedidos
      const estados = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido', 'entregado'];
      const all: PedidoRendimiento[] = [];
      for (const estado of estados) {
        const res = await fetch(`/api/pedidos?estado=${estado}`);
        if (res.ok) {
          const j = await res.json();
          (j.data || []).forEach((p: Record<string, unknown>) => {
            all.push({
              id: p.id as string,
              numero: p.numero as string,
              total: p.total as number || 0,
              estado: p.estado as string,
              estadoPago: p.estadoPago as string || 'pendiente',
              meseroId: p.meseroId as string | null,
              meseroNombre: p.meseroNombre as string | null,
              creadoEn: p.creadoEn as string || '',
              modalidad: p.modalidad as string || 'local',
            });
          });
        }
      }

      // Filter by period
      const now = new Date();
      const filtered = all.filter(p => {
        const d = new Date(p.creadoEn);
        if (periodo === 'hoy') return d.toDateString() === now.toDateString();
        if (periodo === 'semana') {
          const weekAgo = new Date(now.getTime() - 7 * 86400000);
          return d >= weekAgo && d <= now;
        }
        if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
      });

      setPedidos(filtered);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Compute per-mesero stats
  const meseroStats = meseros.map(m => {
    const asignados = pedidos.filter(p => p.meseroId === m.id || p.meseroNombre === m.nombre);
    const entregados = asignados.filter(p => ['servido', 'entregado'].includes(p.estado));
    const totalVentas = entregados.reduce((s, p) => s + p.total, 0);
    const nomina = entregados.length * tarifaPorEntrega;
    return { ...m, asignados: asignados.length, entregados: entregados.length, totalVentas, nomina };
  }).sort((a, b) => b.entregados - a.entregados);

  const totalEntregas = meseroStats.reduce((s, m) => s + m.entregados, 0);
  const totalNomina = meseroStats.reduce((s, m) => s + m.nomina, 0);
  const sinAsignar = pedidos.filter(p => !p.meseroId && !p.meseroNombre);

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
          <h1 className="text-2xl font-black text-white">🏆 Rendimiento Meseros</h1>
          <p className="text-sm text-gray-500 mt-1">Entregas, ranking y nómina por período</p>
        </div>
        <div className="flex items-center gap-2">
          {(['hoy', 'semana', 'mes'] as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                periodo === p
                  ? 'bg-brand-500 text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Total Entregas" value={String(totalEntregas)} icon="🚀" />
        <KPI label="Meseros Activos" value={String(meseros.length)} icon="👥" />
        <KPI label="Nómina Total" value={formatMXN(totalNomina)} icon="💵" />
        <KPI label="Sin Asignar" value={String(sinAsignar.length)} icon="⚠️" accent={sinAsignar.length > 0 ? 'red' : undefined} />
      </div>

      {/* Tarifa config */}
      <div className="bg-[#12121a] rounded-xl border border-white/5 p-4 flex items-center gap-4">
        <span className="text-xs text-gray-400">Tarifa por entrega:</span>
        <input
          type="number"
          value={tarifaPorEntrega}
          onChange={(e) => setTarifaPorEntrega(Number(e.target.value) || 0)}
          className="w-20 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <span className="text-xs text-gray-500">MXN</span>
      </div>

      {/* Ranking Table */}
      <div className="bg-[#12121a] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-bold text-white">Ranking de Meseros</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Mesero</th>
                <th className="text-center px-4 py-3">Asignados</th>
                <th className="text-center px-4 py-3">Entregados</th>
                <th className="text-right px-4 py-3">Ventas</th>
                <th className="text-right px-4 py-3">Nómina</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {meseroStats.map((m, idx) => (
                <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-500/10 flex items-center justify-center text-xs font-bold text-brand-400">
                        {m.nombre.charAt(0)}
                      </div>
                      <span className="text-white font-medium">{m.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">{m.asignados}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-bold">
                      {m.entregados}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white font-medium">{formatMXN(m.totalVentas)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-brand-400 font-bold">{formatMXN(m.nomina)}</span>
                  </td>
                </tr>
              ))}
              {meseroStats.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">No hay meseros registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: string }) {
  return (
    <div className={`bg-[#12121a] rounded-xl border p-4 ${accent === 'red' ? 'border-red-500/20' : 'border-white/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-xl font-black ${accent === 'red' ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
