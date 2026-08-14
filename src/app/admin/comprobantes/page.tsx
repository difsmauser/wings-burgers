'use client';

import { useState, useEffect, useCallback } from 'react';

interface Comprobante {
  id: string;
  pedido_id: string;
  mesa_zona: string;
  total: number;
  metodo_pago: string;
  comprobante_url: string | null;
  estado: string;
  created_at: string;
}

type FiltroEstado = 'todos' | 'pendiente' | 'validado' | 'rechazado';

export default function ComprobantesPage() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [filtroMesa, setFiltroMesa] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const fetchComprobantes = useCallback(async () => {
    try {
      // Fetch all comprobantes (pendiente, validado, rechazado)
      const estados = ['pendiente', 'validado', 'rechazado'];
      const all: Comprobante[] = [];
      for (const estado of estados) {
        const res = await fetch(`/api/pagos/comprobante-upload?estado=${estado}`);
        if (res.ok) {
          const json = await res.json();
          all.push(...(json.data || []));
        }
      }
      // Sort by date desc
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setComprobantes(all);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchComprobantes(); }, [fetchComprobantes]);

  // Filters
  const filtered = comprobantes.filter(c => {
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false;
    if (filtroMesa && !c.mesa_zona.toLowerCase().includes(filtroMesa.toLowerCase())) return false;
    if (filtroFecha) {
      const cDate = new Date(c.created_at).toISOString().slice(0, 10);
      if (cDate !== filtroFecha) return false;
    }
    return true;
  });

  // Stats
  const totalPendientes = comprobantes.filter(c => c.estado === 'pendiente').length;
  const totalValidados = comprobantes.filter(c => c.estado === 'validado').length;
  const montoValidado = comprobantes.filter(c => c.estado === 'validado').reduce((s, c) => s + c.total, 0);
  const montoPendiente = comprobantes.filter(c => c.estado === 'pendiente').reduce((s, c) => s + c.total, 0);

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  const handleValidar = async (comp: Comprobante) => {
    await fetch('/api/pagos/validar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comprobanteId: comp.id, pedidoId: comp.pedido_id, mesaZona: comp.mesa_zona }),
    });
    fetchComprobantes();
  };

  const handleRechazar = async (comp: Comprobante) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    // Use the API to reject
    await fetch('/api/pagos/comprobante-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', comprobanteId: comp.id }),
    }).catch(() => {});
    // Direct update via pedidos API
    await fetch(`/api/pedidos/${comp.pedido_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estadoPago: 'rechazado' }),
    }).catch(() => {});
    fetchComprobantes();
  };

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
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🧾</span> Comprobantes de Pago
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Historial de transferencias y vouchers adjuntos</p>
        </div>
        <button onClick={fetchComprobantes} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-white/5 border border-white/10 hover:text-white transition-all">
          🔄 Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#16161f] border border-amber-500/20 p-4">
          <p className="text-[10px] text-gray-500">Pendientes</p>
          <p className="text-xl font-bold text-amber-400">{totalPendientes}</p>
          <p className="text-[9px] text-gray-600">{fmt(montoPendiente)}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-green-500/20 p-4">
          <p className="text-[10px] text-gray-500">Validados</p>
          <p className="text-xl font-bold text-green-400">{totalValidados}</p>
          <p className="text-[9px] text-gray-600">{fmt(montoValidado)}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-[10px] text-gray-500">Total Registros</p>
          <p className="text-xl font-bold text-white">{comprobantes.length}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-[10px] text-gray-500">Monto Total</p>
          <p className="text-xl font-bold text-brand-400">{fmt(montoValidado + montoPendiente)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {(['todos', 'pendiente', 'validado', 'rechazado'] as FiltroEstado[]).map(e => (
              <button key={e} onClick={() => setFiltroEstado(e)} className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${filtroEstado === e ? 'bg-brand-500 text-black' : 'text-gray-400 bg-white/5 hover:text-white'}`}>
                {e === 'todos' ? 'Todos' : e === 'pendiente' ? '⏳ Pendiente' : e === 'validado' ? '✅ Validado' : '❌ Rechazado'}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={filtroMesa}
            onChange={e => setFiltroMesa(e.target.value)}
            placeholder="Filtrar por mesa..."
            className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/50 w-40"
          />
          <input
            type="date"
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-400/50"
          />
          {(filtroMesa || filtroFecha) && (
            <button onClick={() => { setFiltroMesa(''); setFiltroFecha(''); }} className="text-[10px] text-gray-400 hover:text-white">Limpiar filtros</button>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-12 text-center">
          <span className="text-5xl block mb-3">🧾</span>
          <p className="text-gray-400 text-sm">No hay comprobantes con estos filtros</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#16161f] border border-white/5 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Fecha / Hora</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Mesa</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Método</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Monto</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Estado</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Voucher</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(comp => (
                <tr key={comp.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{new Date(comp.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p className="text-gray-500 text-[9px]">{new Date(comp.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{comp.mesa_zona?.split(' - ')[0] || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-medium ${comp.metodo_pago === 'transferencia' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                      {comp.metodo_pago === 'transferencia' ? '📱 Transfer' : '💵 Efectivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-brand-400">{fmt(comp.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      comp.estado === 'validado' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      comp.estado === 'rechazado' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {comp.estado === 'validado' ? '✅ Validado' : comp.estado === 'rechazado' ? '❌ Rechazado' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {comp.comprobante_url ? (
                      <button onClick={() => setSelectedImg(comp.comprobante_url)} className="text-blue-400 hover:text-blue-300 underline text-[10px]">
                        📷 Ver
                      </button>
                    ) : (
                      <span className="text-gray-600 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {comp.estado === 'pendiente' && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleValidar(comp)} className="px-2 py-1 rounded text-[9px] font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-all">✓ Validar</button>
                        <button onClick={() => handleRechazar(comp)} className="px-2 py-1 rounded text-[9px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all">✕ Rechazar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Image viewer modal */}
      {selectedImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedImg(null)}>
          <div className="max-w-lg max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#16161f] px-4 py-3 flex items-center justify-between border-b border-white/5">
              <span className="text-xs font-bold text-white">Comprobante de Pago</span>
              <button onClick={() => setSelectedImg(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <img src={selectedImg} alt="Comprobante" className="w-full h-auto max-h-[70vh] object-contain bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}
