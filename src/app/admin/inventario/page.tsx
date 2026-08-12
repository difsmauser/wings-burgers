'use client';

import { useState, useEffect, useCallback } from 'react';

interface ArticuloInventario {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  nivelMinimo: number;
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
    case 'critico':
      return { label: 'Crítico', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' };
    case 'bajo':
      return { label: 'Bajo', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' };
    case 'normal':
      return { label: 'Normal', bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' };
  }
}

const UNIDADES = ['piezas', 'kg', 'litros', 'paquetes', 'cajas', 'bolsas'];

export default function InventarioPage() {
  const [articulos, setArticulos] = useState<ArticuloInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

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
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticulos();
  }, [fetchArticulos]);

  // Stats
  const totalItems = articulos.length;
  const itemsBajos = articulos.filter(a => getEstadoStock(a.cantidad, a.nivelMinimo) === 'bajo').length;
  const itemsCriticos = articulos.filter(a => getEstadoStock(a.cantidad, a.nivelMinimo) === 'critico').length;

  // Filtered list
  const articulosFiltrados = articulos.filter(a => {
    const matchBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const estado = getEstadoStock(a.cantidad, a.nivelMinimo);
    const matchEstado = filtroEstado === 'todos' || estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const handleCrear = async () => {
    if (!nuevoNombre.trim() || !nuevaCantidad.trim()) {
      setError('Nombre y cantidad son requeridos');
      return;
    }
    setSaving(true);
    setError(null);
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
      setNuevoNombre('');
      setNuevaCantidad('');
      setNuevaUnidad('piezas');
      setNuevoNivelMinimo('');
      fetchArticulos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const openAjusteModal = (articulo: ArticuloInventario) => {
    setArticuloSeleccionado(articulo);
    setAjusteCantidad('');
    setAjusteTipo('entrada');
    setAjusteMotivo('');
    setError(null);
    setShowAjusteModal(true);
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}" del inventario?`)) return;
    try {
      await fetch(`/api/inventario/${id}`, { method: 'DELETE' });
      fetchArticulos();
    } catch {
      // silent
    }
  };

  const handleAjuste = async () => {
    if (!ajusteCantidad.trim() || !articuloSeleccionado) {
      setError('Cantidad es requerida');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const cantidadNum = parseFloat(ajusteCantidad);
      let nuevaCant = articuloSeleccionado.cantidad;
      if (ajusteTipo === 'entrada') nuevaCant += cantidadNum;
      else if (ajusteTipo === 'salida') nuevaCant -= cantidadNum;
      else nuevaCant = cantidadNum; // ajuste directo

      if (nuevaCant < 0) {
        setError('La cantidad no puede ser negativa');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/inventario/${articuloSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: nuevaCant,
          tipoMovimiento: ajusteTipo,
          motivo: ajusteMotivo || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || 'Error al ajustar');
      }
      setShowAjusteModal(false);
      setArticuloSeleccionado(null);
      fetchArticulos();

      // Check if stock is now critical and send browser notification
      const nuevaCantFinal = ajusteTipo === 'ajuste' ? parseFloat(ajusteCantidad) :
        ajusteTipo === 'entrada' ? articuloSeleccionado.cantidad + parseFloat(ajusteCantidad) :
        articuloSeleccionado.cantidad - parseFloat(ajusteCantidad);

      if (nuevaCantFinal <= articuloSeleccionado.nivelMinimo) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚠️ Inventario Bajo', {
            body: `${articuloSeleccionado.nombre} está en nivel crítico (${nuevaCantFinal} ${articuloSeleccionado.unidad})`,
            icon: '/icons/icon-192x192.svg',
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Progress bar percentage
  const getProgressPct = (cantidad: number, nivelMinimo: number) => {
    const max = nivelMinimo * 3;
    return Math.min(100, Math.max(0, (cantidad / max) * 100));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Control de stock en tiempo real</p>
        </div>
        <button
          onClick={() => { setError(null); setShowCrearModal(true); }}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-white gradient-brand shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 transition-all duration-200"
        >
          + Nuevo Artículo
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <span className="text-lg">📦</span>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{totalItems}</p>
            <p className="text-xs text-gray-500">Total Artículos</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <span className="text-lg">⚠️</span>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-400">{itemsBajos}</p>
            <p className="text-xs text-gray-500">Stock Bajo</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <span className="text-lg">🚨</span>
          </div>
          <div>
            <p className="text-xl font-bold text-red-400">{itemsCriticos}</p>
            <p className="text-xs text-gray-500">Stock Crítico</p>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {itemsCriticos > 0 && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🚨</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">¡Alerta de Inventario Bajo!</p>
            <p className="text-xs text-red-400/70 mt-0.5">
              {itemsCriticos} artículo{itemsCriticos > 1 ? 's' : ''} en nivel crítico. Revisa y reabastece pronto.
            </p>
          </div>
          <button
            onClick={() => setFiltroEstado('critico')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all duration-150 flex-shrink-0"
          >
            Ver artículos
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar artículo..."
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
          />
        </div>
        <div className="flex gap-2">
          {(['todos', 'normal', 'bajo', 'critico'] as FiltroEstado[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all duration-200 ${
                filtroEstado === f
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : articulosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-3">📦</span>
            <p className="text-gray-400 text-sm">No hay artículos que mostrar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nivel Mín.</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {articulosFiltrados.map((art) => {
                const estado = getEstadoStock(art.cantidad, art.nivelMinimo);
                const config = getEstadoConfig(estado);
                const pct = getProgressPct(art.cantidad, art.nivelMinimo);
                return (
                  <tr key={art.id} className="hover:bg-white/[0.02] transition-colors duration-150">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center`}>
                          <span className="text-sm">📦</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{art.nombre}</p>
                          <p className="text-xs text-gray-500">{art.unidad}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-bold text-white">{art.cantidad} <span className="text-xs text-gray-500 font-normal">{art.unidad}</span></p>
                        <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              estado === 'critico' ? 'bg-red-400' : estado === 'bajo' ? 'bg-amber-400' : 'bg-green-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {art.nivelMinimo} {art.unidad}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openAjusteModal(art)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-all duration-150"
                        >
                          Ajustar
                        </button>
                        <button
                          onClick={() => handleEliminar(art.id, art.nombre)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all duration-150"
                        >
                          Eliminar
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

      {/* Create Modal */}
      {showCrearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCrearModal(false)} />
          <div className="relative w-full max-w-md bg-[#16161f] border border-white/10 rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-white mb-5">Nuevo Artículo de Inventario</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Pollo crudo"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Cantidad *</label>
                  <input
                    type="number"
                    value={nuevaCantidad}
                    onChange={(e) => setNuevaCantidad(e.target.value)}
                    placeholder="100"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Unidad</label>
                  <select
                    value={nuevaUnidad}
                    onChange={(e) => setNuevaUnidad(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
                  >
                    {UNIDADES.map(u => <option key={u} value={u} className="bg-[#16161f]">{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nivel Mínimo (alerta)</label>
                <input
                  type="number"
                  value={nuevoNivelMinimo}
                  onChange={(e) => setNuevoNivelMinimo(e.target.value)}
                  placeholder="10"
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
                />
                <p className="text-[10px] text-gray-600 mt-1">Se mostrará alerta cuando el stock llegue a este nivel</p>
              </div>
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
              <button
                onClick={() => setShowCrearModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrear}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white gradient-brand shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all duration-200"
              >
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
          <div className="relative w-full max-w-md bg-[#16161f] border border-white/10 rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-white mb-1">Ajustar Stock</h3>
            <p className="text-sm text-gray-500 mb-5">
              {articuloSeleccionado.nombre} — Actual: <span className="text-white font-medium">{articuloSeleccionado.cantidad} {articuloSeleccionado.unidad}</span>
            </p>

            <div className="space-y-4">
              {/* Tipo de movimiento */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Tipo de Movimiento</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'entrada' as const, label: 'Entrada', icon: '📥', desc: 'Sumar' },
                    { value: 'salida' as const, label: 'Salida', icon: '📤', desc: 'Restar' },
                    { value: 'ajuste' as const, label: 'Ajuste', icon: '🔄', desc: 'Fijar' },
                  ]).map((tipo) => (
                    <button
                      key={tipo.value}
                      onClick={() => setAjusteTipo(tipo.value)}
                      className={`p-3 rounded-lg border text-center transition-all duration-200 ${
                        ajusteTipo === tipo.value
                          ? 'border-brand-500/30 bg-brand-500/10 text-brand-400'
                          : 'border-white/5 text-gray-400 hover:border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{tipo.icon}</span>
                      <span className="text-xs font-medium block">{tipo.label}</span>
                      <span className="text-[10px] text-gray-600">{tipo.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  {ajusteTipo === 'ajuste' ? 'Nueva cantidad' : 'Cantidad'} *
                </label>
                <input
                  type="number"
                  value={ajusteCantidad}
                  onChange={(e) => setAjusteCantidad(e.target.value)}
                  placeholder={ajusteTipo === 'ajuste' ? String(articuloSeleccionado.cantidad) : '0'}
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
                />
                {ajusteTipo !== 'ajuste' && ajusteCantidad && (
                  <p className="text-xs text-gray-500 mt-1">
                    Resultado: {ajusteTipo === 'entrada'
                      ? articuloSeleccionado.cantidad + parseFloat(ajusteCantidad || '0')
                      : articuloSeleccionado.cantidad - parseFloat(ajusteCantidad || '0')
                    } {articuloSeleccionado.unidad}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Motivo (opcional)</label>
                <input
                  type="text"
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  placeholder="Ej: Compra semanal, venta, merma..."
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all duration-200"
                />
              </div>

              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
              <button
                onClick={() => setShowAjusteModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleAjuste}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white gradient-brand shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all duration-200"
              >
                {saving ? 'Guardando...' : 'Aplicar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
