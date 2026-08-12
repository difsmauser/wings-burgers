'use client';

import { useState, useEffect, useCallback } from 'react';

interface Gasto {
  id: string;
  monto: number;
  concepto: string;
  categoria: string;
  fecha: string;
  creadoEn: string;
}

const CATEGORIAS_GASTO = ['insumos', 'servicios', 'nomina', 'mantenimiento', 'repartidor', 'marketing', 'otros'];

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  
  // Form
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('insumos');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  const fetchGastos = useCallback(async () => {
    try {
      const res = await fetch('/api/gastos');
      if (res.ok) {
        const data = await res.json();
        setGastos(data?.data ?? []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGastos(); }, [fetchGastos]);

  const handleCrear = async () => {
    if (!monto.trim() || !concepto.trim()) { setError('Monto y concepto son requeridos'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: parseFloat(monto), concepto: concepto.trim(), categoria, fecha }),
      });
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error?.message || 'Error'); }
      setShowModal(false); setMonto(''); setConcepto(''); setCategoria('insumos'); setFecha(new Date().toISOString().split('T')[0]);
      fetchGastos();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  // Filtered gastos
  const gastosFiltrados = filtroCategoria === 'todas' ? gastos : gastos.filter(g => g.categoria === filtroCategoria);

  // Totals
  const totalGeneral = gastos.reduce((sum, g) => sum + g.monto, 0);
  const totalHoy = gastos.filter(g => g.fecha === new Date().toISOString().split('T')[0]).reduce((sum, g) => sum + g.monto, 0);
  const totalMes = gastos.filter(g => g.fecha?.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, g) => sum + g.monto, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gastos</h1>
          <p className="text-sm text-gray-500 mt-1">Registro y control de gastos operativos</p>
        </div>
        <button onClick={() => { setError(null); setShowModal(true); }} className="px-4 py-2.5 rounded-lg text-sm font-medium text-black gradient-brand shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all duration-200">
          + Registrar Gasto
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-xs text-gray-500">Gastos Hoy</p>
          <p className="text-2xl font-bold text-red-400 mt-1">${totalHoy.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-xs text-gray-500">Gastos este Mes</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">${totalMes.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-xs text-gray-500">Total Registrado</p>
          <p className="text-2xl font-bold text-white mt-1">${totalGeneral.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['todas', ...CATEGORIAS_GASTO].map(cat => (
          <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filtroCategoria === cat ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-gray-400 bg-[#16161f] border border-white/5 hover:text-white'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Gastos List */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 overflow-hidden">
        {gastosFiltrados.length === 0 ? (
          <div className="p-12 text-center"><span className="text-4xl block mb-3">💸</span><p className="text-gray-400 text-sm">No hay gastos registrados</p></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {gastosFiltrados.map(g => (
                <tr key={g.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-sm text-white">{g.concepto}</td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-300 capitalize">{g.categoria}</span></td>
                  <td className="px-5 py-3 text-sm text-gray-400">{g.fecha}</td>
                  <td className="px-5 py-3 text-sm font-bold text-red-400 text-right">-${g.monto.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[#16161f] border border-white/10 rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-white mb-5">Registrar Gasto</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Concepto *</label>
                <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Compra de pollo, gas LP, etc." className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Monto *</label>
                  <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="500.00" min="0.01" step="0.01" className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Categoría</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all">
                    {CATEGORIAS_GASTO.map(c => <option key={c} value={c} className="bg-[#16161f] capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all" />
              </div>
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all">Cancelar</button>
              <button onClick={handleCrear} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-medium text-black gradient-brand shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all">{saving ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
