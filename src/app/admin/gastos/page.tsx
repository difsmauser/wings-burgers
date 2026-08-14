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
  { value: 'insumos', label: 'Insumos', icon: '🥩' },
  { value: 'servicios', label: 'Servicios', icon: '💡' },
  { value: 'nomina', label: 'Nómina', icon: '👥' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧' },
  { value: 'repartidor', label: 'Repartidor', icon: '🛵' },
  { value: 'marketing', label: 'Marketing', icon: '📢' },
  { value: 'otros', label: 'Otros', icon: '📎' },
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

  // Filter & calculations
  const gastosFiltrados = filtro === 'todas' ? gastos : gastos.filter(g => g.categoria === filtro);
  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + g.monto, 0);
  const totalMes = gastos.filter(g => {
    const d = new Date(g.fecha);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, g) => s + g.monto, 0);

  // By category totals
  const porCategoria: Record<string, number> = {};
  gastos.forEach(g => { porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto; });
  const maxCategoria = Math.max(...Object.values(porCategoria), 1);

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
  const getCatInfo = (cat: string) => CATEGORIAS.find(c => c.value === cat) || { icon: '📎', label: cat };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gastos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de egresos del negocio</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all active:scale-[0.97]">
          + Registrar Gasto
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#16161f] border border-red-500/20 p-4">
          <p className="text-[10px] text-gray-500">Total del Mes</p>
          <p className="text-xl font-bold text-red-400">{fmt(totalMes)}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-[10px] text-gray-500">Registros</p>
          <p className="text-xl font-bold text-white">{gastos.length}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-[10px] text-gray-500">Categorías</p>
          <p className="text-xl font-bold text-white">{Object.keys(porCategoria).length}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-[10px] text-gray-500">Filtrado</p>
          <p className="text-xl font-bold text-brand-400">{fmt(totalFiltrado)}</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Gastos por Categoría</h3>
        <div className="space-y-3">
          {CATEGORIAS.filter(c => porCategoria[c.value]).map(cat => (
            <div key={cat.value}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{cat.icon} {cat.label}</span>
                <span className="text-white font-medium">{fmt(porCategoria[cat.value] || 0)}</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-red-400/80 transition-all duration-500" style={{ width: `${((porCategoria[cat.value] || 0) / maxCategoria) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + Table */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Registros</h3>
          <div className="flex gap-1">
            <button onClick={() => setFiltro('todas')} className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-all ${filtro === 'todas' ? 'bg-brand-500 text-black' : 'text-gray-400 hover:text-white bg-white/5'}`}>Todas</button>
            {CATEGORIAS.map(c => (
              <button key={c.value} onClick={() => setFiltro(c.value)} className={`px-2 py-1 rounded-lg text-[10px] transition-all ${filtro === c.value ? 'bg-brand-500 text-black' : 'text-gray-400 hover:text-white bg-white/5'}`} title={c.label}>{c.icon}</button>
            ))}
          </div>
        </div>

        {gastosFiltrados.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">Sin gastos registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-500">Fecha</th>
                  <th className="text-left py-2 text-gray-500">Concepto</th>
                  <th className="text-left py-2 text-gray-500">Categoría</th>
                  <th className="text-right py-2 text-gray-500">Monto</th>
                  <th className="text-right py-2 text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {gastosFiltrados.slice(0, 30).map(g => {
                  const catInfo = getCatInfo(g.categoria);
                  return (
                    <tr key={g.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 text-gray-400">{new Date(g.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</td>
                      <td className="py-2.5 text-white font-medium">{g.concepto}</td>
                      <td className="py-2.5"><span className="px-2 py-0.5 rounded text-[9px] bg-white/5 text-gray-400">{catInfo.icon} {catInfo.label}</span></td>
                      <td className="py-2.5 text-right font-bold text-red-400">{fmt(g.monto)}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => handleEliminar(g.id)} className="text-gray-600 hover:text-red-400 transition-colors">✕</button>
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
          <div className="w-full max-w-md rounded-2xl bg-[#16161f] border border-white/10 p-6 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Registrar Gasto</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Monto *</label>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" step="0.01" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Concepto *</label>
                <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Descripción del gasto" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Categoría</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIAS.map(c => (
                    <button key={c.value} onClick={() => setCategoria(c.value)} className={`py-2 rounded-lg text-[10px] font-medium border transition-all ${categoria === c.value ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'text-gray-400 border-white/5 hover:border-white/10'}`}>
                      <span className="block text-base mb-0.5">{c.icon}</span>{c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-400/50" />
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
