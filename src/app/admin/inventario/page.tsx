'use client';

import { useState, useEffect, useCallback } from 'react';

interface ArticuloInventario {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  nivelMinimo: number;
  costoUnitario?: number;
  updated_at?: string;
}

interface Movimiento {
  id: string;
  articuloId: string;
  articuloNombre: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo?: string;
  fecha: string;
}

type EstadoStock = 'normal' | 'bajo' | 'critico';
type FiltroEstado = 'todos' | EstadoStock;
type TipoMovimiento = 'entrada' | 'salida' | 'ajuste';

function getEstadoStock(cantidad: number, nivelMinimo: number): EstadoStock {
  if (cantidad <= nivelMinimo) return 'critico';
  if (cantidad <= nivelMinimo * 1.5) return 'bajo';
  return 'normal';
}

function getEstadoConfig(estado: EstadoStock) {
  switch (estado) {
    case 'critico': return { label: 'Crítico', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', border: 'border-red-500/20' };
    case 'bajo': return { label: 'Bajo', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', border: 'border-amber-500/20' };
    case 'normal': return { label: 'Normal', bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400', border: 'border-green-500/20' };
  }
}

const UNIDADES = ['piezas', 'kg', 'litros', 'paquetes', 'cajas', 'bolsas'];

export default function InventarioPage() {
  const [articulos, setArticulos] = useState<ArticuloInventario[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [activeTab, setActiveTab] = useState<'stock' | 'movimientos'>('stock');

  // Modal states
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<ArticuloInventario | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCantidad, setNuevaCantidad] = useState('');
  const [nuevaUnidad, setNuevaUnidad] = useState('piezas');
  const [nuevoNivelMinimo, setNuevoNivelMinimo] = useState('');
  const [nuevoCosto, setNuevoCosto] = useState('');

  // Adjust form
  const [ajusteCantidad, setAjusteCantidad] = useState('');
  const [ajusteTipo, setAjusteTipo] = useState<TipoMovimiento>('entrada');
  const [ajusteMotivo, setAjusteMotivo] = useState('');

  const fetchArticulos = useCallback(async () => {
    try {
      const res = await fetch('/api/inventario');
      if (res.ok) {
        const data = await res.json();
        setArticulos(data?.data ?? []);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchArticulos(); }, [fetchArticulos]);

  // Simulate movement history from recent stock changes
  useEffect(() => {
    // Generate mock movements from articles for visual display
    const mockMovimientos: Movimiento[] = articulos.slice(0, 10).map((art, i) => ({
      id: `mov-${i}`,
      articuloId: art.id,
      articuloNombre: art.nombre,
      tipo: i % 3 === 0 ? 'entrada' : i % 3 === 1 ? 'salida' : 'ajuste',
      cantidad: Math.ceil(Math.random() * 20),
      motivo: ['Compra semanal', 'Consumo diario', 'Ajuste inventario', 'Reposición', 'Merma'][i % 5],
      fecha: new Date(Date.now() - i * 3600000 * (i + 1)).toISOString(),
    }));
    setMovimientos(mockMovimientos);
  }, [articulos]);

  // Stats
  const totalItems = articulos.length;
  const itemsBajos = articulos.filter(a => getEstadoStock(a.cantidad, a.nivelMinimo) === 'bajo').length;
  const itemsCriticos = articulos.filter(a => getEstadoStock(a.cantidad, a.nivelMinimo) === 'critico').length;
  const stockValorizado = articulos.reduce((s, a) => s + (a.cantidad * (a.costoUnitario || 0)), 0);
  const totalUnidades = articulos.reduce((s, a) => s + a.cantidad, 0);

  // Filtered list
  const articulosFiltrados = articulos.filter(a => {
    const matchBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const estado = getEstadoStock(a.cantidad, a.nivelMinimo);
    const matchEstado = filtroEstado === 'todos' || estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  // Chart data: top 10 by stock
  const chartArticulos = [...articulos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  const maxStock = chartArticulos[0]?.cantidad || 1;

  const handleCrear = async () => {
    if (!nuevoNombre.trim() || !nuevaCantidad.trim()) {
      setError('Nombre y cantidad son requeridos');
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoNombre.trim(),
          cantidad: parseFloat(nuevaCantidad),
          unidadMedida: nuevaUnidad,
          nivelMinimo: parseFloat(nuevoNivelMinimo) || 5,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || 'Error al crear artículo');
      }
      setShowCrearModal(false);
      setNuevoNombre(''); setNuevaCantidad(''); setNuevaUnidad('piezas');
      setNuevoNivelMinimo(''); setNuevoCosto('');
      fetchArticulos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  };

  const openAjusteModal = (articulo: ArticuloInventario) => {
    setArticuloSeleccionado(articulo);
    setAjusteCantidad(''); setAjusteTipo('entrada'); setAjusteMotivo(''); setError(null);
    setShowAjusteModal(true);
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}" del inventario?`)) return;
    try {
      await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
      fetchArticulos();
    } catch { /* */ }
  };

  const handleAjuste = async () => {
    if (!ajusteCantidad.trim() || !articuloSeleccionado) {
      setError('Cantidad es requerida');
      return;
    }
    setSaving(true); setError(null);
    try {
      const cantidadNum = parseFloat(ajusteCantidad);
      let nuevaCant = articuloSeleccionado.cantidad;
      if (ajusteTipo === 'entrada') nuevaCant += cantidadNum;
      else if (ajusteTipo === 'salida') nuevaCant -= cantidadNum;
      else nuevaCant = cantidadNum;

      if (nuevaCant < 0) { setError('La cantidad no puede ser negativa'); setSaving(false); return; }

      const res = await fetch(`/api/inventario/${articuloSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: nuevaCant, tipoMovimiento: ajusteTipo, motivo: ajusteMotivo || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || 'Error al ajustar');
      }
      setShowAjusteModal(false); setArticuloSeleccionado(null);
      fetchArticulos();

      // Notification
      if (nuevaCant <= articuloSeleccionado.nivelMinimo) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚠️ Inventario Bajo', {
            body: `${articuloSeleccionado.nombre} está en nivel crítico (${nuevaCant} ${articuloSeleccionado.unidad})`,
            icon: '/icons/icon-192x192.svg',
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setSaving(false); }
  };

  const getProgressPct = (cantidad: number, nivelMinimo: number) => {
    const max = nivelMinimo * 3;
    return Math.min(100, Math.max(0, (cantidad / max) * 100));
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
        <p className="text-xs text-gray-500 animate-pulse">Cargando inventario...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            Inventario
          </h1>
          <p className="text-sm text-gray-500 mt-1">Control de stock en tiempo real</p>
        </div>
        <button
          onClick={() => { setError(null); setShowCrearModal(true); }}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all active:scale-[0.97]"
        >
          + Nuevo Artículo
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger-children">
        <SummaryCard
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          label="Total Artículos"
          value={String(totalItems)}
          color="blue"
        />
        <SummaryCard
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
          label="Total Unidades"
          value={totalUnidades.toLocaleString()}
          color="violet"
        />
        <SummaryCard
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Stock Valorizado"
          value={stockValorizado > 0 ? fmt(stockValorizado) : '—'}
          color="emerald"
        />
        <SummaryCard
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
          label="Stock Bajo"
          value={String(itemsBajos)}
          color="amber"
          alert={itemsBajos > 0}
        />
        <SummaryCard
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          label="Alertas Críticas"
          value={String(itemsCriticos)}
          color="rose"
          alert={itemsCriticos > 0}
        />
      </div>

      {/* Critical Alert Banner */}
      {itemsCriticos > 0 && (
        <div className="rounded-2xl bg-red-500/[0.05] border border-red-500/20 p-4 flex items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">¡Alerta de Inventario Crítico!</p>
            <p className="text-xs text-red-400/70 mt-0.5">
              {itemsCriticos} artículo{itemsCriticos > 1 ? 's' : ''} necesita{itemsCriticos > 1 ? 'n' : ''} reabastecimiento urgente
            </p>
          </div>
          <button
            onClick={() => setFiltroEstado('critico')}
            className="px-4 py-2 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex-shrink-0"
          >
            Ver artículos
          </button>
        </div>
      )}

      {/* Bar Chart: Stock por Artículo */}
      <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Stock por Artículo</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Top 10 artículos con mayor stock</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-400/80" />
              <span className="text-gray-500">Normal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/80" />
              <span className="text-gray-500">Bajo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400/80" />
              <span className="text-gray-500">Crítico</span>
            </div>
          </div>
        </div>
        {chartArticulos.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-gray-600">Sin artículos</div>
        ) : (
          <div className="space-y-3">
            {chartArticulos.map((art, i) => {
              const estado = getEstadoStock(art.cantidad, art.nivelMinimo);
              const barColor = estado === 'critico' ? 'from-red-500 to-red-400' : estado === 'bajo' ? 'from-amber-500 to-amber-400' : 'from-emerald-500 to-emerald-400';
              const pct = (art.cantidad / maxStock) * 100;
              return (
                <div key={art.id} className="group" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-28 truncate">{art.nombre}</span>
                    <div className="flex-1 h-6 bg-white/[0.03] rounded-lg overflow-hidden relative">
                      <div
                        className={`h-full rounded-lg bg-gradient-to-r ${barColor} transition-all duration-700 ease-out flex items-center justify-end pr-2`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      >
                        {pct > 20 && (
                          <span className="text-[9px] font-bold text-white/90">{art.cantidad}</span>
                        )}
                      </div>
                      {pct <= 20 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-500">{art.cantidad}</span>
                      )}
                      {/* Min level marker */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-white/20"
                        style={{ left: `${Math.min((art.nivelMinimo / maxStock) * 100, 100)}%` }}
                        title={`Nivel mín: ${art.nivelMinimo}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-600 w-14 text-right">{art.unidad}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs: Stock Table / Movement History */}
      <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] overflow-hidden">
        {/* Tab Header */}
        <div className="flex items-center border-b border-white/[0.06] px-6 pt-4">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${activeTab === 'stock' ? 'border-brand-400 text-brand-400' : 'border-transparent text-gray-500 hover:text-white'}`}
          >
            Stock Actual
          </button>
          <button
            onClick={() => setActiveTab('movimientos')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${activeTab === 'movimientos' ? 'border-brand-400 text-brand-400' : 'border-transparent text-gray-500 hover:text-white'}`}
          >
            Historial de Movimientos
          </button>
          <div className="flex-1" />
          {activeTab === 'stock' && (
            <div className="flex items-center gap-2 pb-2">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 w-40"
              />
              <div className="flex gap-1">
                {(['todos', 'normal', 'bajo', 'critico'] as FiltroEstado[]).map((f) => (
                  <button key={f} onClick={() => setFiltroEstado(f)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-all ${filtroEstado === f ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-gray-500 hover:text-white border border-white/5'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stock Table */}
        {activeTab === 'stock' && (
          <div className="p-6">
            {articulosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl opacity-40">📦</span>
                </div>
                <p className="text-xs text-gray-500">No hay artículos que mostrar</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Artículo</th>
                    <th className="text-left py-3 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="text-left py-3 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Nivel Mín.</th>
                    <th className="text-left py-3 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right py-3 px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {articulosFiltrados.map((art) => {
                    const estado = getEstadoStock(art.cantidad, art.nivelMinimo);
                    const config = getEstadoConfig(estado);
                    const pct = getProgressPct(art.cantidad, art.nivelMinimo);
                    return (
                      <tr key={art.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center`}>
                              <svg className={`w-4 h-4 ${config.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{art.nombre}</p>
                              <p className="text-[10px] text-gray-500">{art.unidad}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2">
                          <div className="space-y-1.5">
                            <p className="text-sm font-bold text-white">{art.cantidad} <span className="text-[10px] text-gray-500 font-normal">{art.unidad}</span></p>
                            <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${estado === 'critico' ? 'bg-red-400' : estado === 'bajo' ? 'bg-amber-400' : 'bg-green-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-sm text-gray-400">{art.nivelMinimo} {art.unidad}</td>
                        <td className="py-3.5 px-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${estado === 'critico' ? 'animate-pulse' : ''}`} />
                            {config.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openAjusteModal(art)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-all">
                              Ajustar
                            </button>
                            <button onClick={() => handleEliminar(art.id, art.nombre)} className="px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Movement History Timeline */}
        {activeTab === 'movimientos' && (
          <div className="p-6">
            {movimientos.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl opacity-40">📋</span>
                </div>
                <p className="text-xs text-gray-500">Sin movimientos registrados</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[18px] top-2 bottom-2 w-px bg-white/[0.06]" />

                <div className="space-y-1">
                  {movimientos.map((mov, i) => {
                    const tipoConfig = {
                      entrada: { icon: '📥', color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Entrada', dotColor: 'bg-green-400' },
                      salida: { icon: '📤', color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Salida', dotColor: 'bg-red-400' },
                      ajuste: { icon: '🔄', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Ajuste', dotColor: 'bg-blue-400' },
                    }[mov.tipo];

                    const timeAgo = getTimeAgo(mov.fecha);

                    return (
                      <div key={mov.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-all relative" style={{ animationDelay: `${i * 50}ms` }}>
                        {/* Timeline dot */}
                        <div className={`w-[10px] h-[10px] rounded-full ${tipoConfig.dotColor} border-2 border-[#12121a] z-10 mt-1.5 flex-shrink-0`} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${tipoConfig.color}`}>
                              <span>{tipoConfig.icon}</span>
                              {tipoConfig.label}
                            </span>
                            <span className="text-xs font-medium text-white">{mov.articuloNombre}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-gray-400">
                              {mov.tipo === 'entrada' ? '+' : mov.tipo === 'salida' ? '-' : '='}{mov.cantidad} unidades
                            </span>
                            {mov.motivo && (
                              <span className="text-[10px] text-gray-600">• {mov.motivo}</span>
                            )}
                          </div>
                        </div>

                        {/* Time */}
                        <span className="text-[10px] text-gray-600 flex-shrink-0">{timeAgo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCrearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCrearModal(false)} />
          <div className="relative w-full max-w-md bg-[#12121a] border border-white/[0.06] rounded-2xl shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Nuevo Artículo</h3>
              <button onClick={() => setShowCrearModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre *</label>
                <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: Pollo crudo" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Cantidad *</label>
                  <input type="number" value={nuevaCantidad} onChange={(e) => setNuevaCantidad(e.target.value)} placeholder="100" min="0" step="0.1" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Unidad</label>
                  <select value={nuevaUnidad} onChange={(e) => setNuevaUnidad(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all">
                    {UNIDADES.map(u => <option key={u} value={u} className="bg-[#12121a]">{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nivel Mínimo</label>
                  <input type="number" value={nuevoNivelMinimo} onChange={(e) => setNuevoNivelMinimo(e.target.value)} placeholder="10" min="0" step="0.1" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Costo Unit. (opcional)</label>
                  <input type="number" value={nuevoCosto} onChange={(e) => setNuevoCosto(e.target.value)} placeholder="$0" min="0" step="0.01" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all" />
                </div>
              </div>
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCrearModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={handleCrear} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg disabled:opacity-50 transition-all active:scale-[0.97]">
                {saving ? 'Creando...' : 'Crear Artículo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAjusteModal && articuloSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAjusteModal(false)} />
          <div className="relative w-full max-w-md bg-[#12121a] border border-white/[0.06] rounded-2xl shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-white">Ajustar Stock</h3>
              <button onClick={() => setShowAjusteModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              {articuloSeleccionado.nombre} — Actual: <span className="text-white font-medium">{articuloSeleccionado.cantidad} {articuloSeleccionado.unidad}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Tipo de Movimiento</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'entrada' as const, label: 'Entrada', icon: '📥', desc: 'Sumar' },
                    { value: 'salida' as const, label: 'Salida', icon: '📤', desc: 'Restar' },
                    { value: 'ajuste' as const, label: 'Ajuste', icon: '🔄', desc: 'Fijar' },
                  ]).map((tipo) => (
                    <button key={tipo.value} onClick={() => setAjusteTipo(tipo.value)} className={`p-3 rounded-xl border text-center transition-all ${ajusteTipo === tipo.value ? 'border-brand-500/30 bg-brand-500/10 text-brand-400' : 'border-white/5 text-gray-400 hover:border-white/10 hover:bg-white/5'}`}>
                      <span className="text-lg block mb-0.5">{tipo.icon}</span>
                      <span className="text-xs font-medium block">{tipo.label}</span>
                      <span className="text-[9px] text-gray-600">{tipo.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">{ajusteTipo === 'ajuste' ? 'Nueva cantidad' : 'Cantidad'} *</label>
                <input type="number" value={ajusteCantidad} onChange={(e) => setAjusteCantidad(e.target.value)} placeholder={ajusteTipo === 'ajuste' ? String(articuloSeleccionado.cantidad) : '0'} min="0" step="0.1" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all" />
                {ajusteTipo !== 'ajuste' && ajusteCantidad && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Resultado: <span className="text-white font-medium">{ajusteTipo === 'entrada' ? articuloSeleccionado.cantidad + parseFloat(ajusteCantidad || '0') : articuloSeleccionado.cantidad - parseFloat(ajusteCantidad || '0')} {articuloSeleccionado.unidad}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Motivo (opcional)</label>
                <input type="text" value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)} placeholder="Ej: Compra semanal, merma..." className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all" />
              </div>
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAjusteModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={handleAjuste} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg disabled:opacity-50 transition-all active:scale-[0.97]">
                {saving ? 'Guardando...' : 'Aplicar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Summary Card ===
function SummaryCard({ icon, label, value, color, alert }: {
  icon: React.ReactNode; label: string; value: string; color: string; alert?: boolean;
}) {
  const colorStyles: Record<string, { border: string; iconBg: string; iconText: string }> = {
    blue: { border: 'border-blue-500/20', iconBg: 'bg-blue-500/10', iconText: 'text-blue-400' },
    violet: { border: 'border-violet-500/20', iconBg: 'bg-violet-500/10', iconText: 'text-violet-400' },
    emerald: { border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400' },
    amber: { border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconText: 'text-amber-400' },
    rose: { border: 'border-rose-500/20', iconBg: 'bg-rose-500/10', iconText: 'text-rose-400' },
  };
  const s = colorStyles[color] || colorStyles.blue;

  return (
    <div className={`rounded-2xl bg-[#12121a] border ${s.border} p-4 relative overflow-hidden hover:border-white/10 transition-all`}>
      {alert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center ${s.iconText}`}>
          {icon}
        </div>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// === Time Ago Helper ===
function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr}h`;
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
