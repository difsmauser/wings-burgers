'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  imagenUrl?: string | null;
}

interface ItemSeleccionado {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  comentario: string;
}

interface Mesa {
  id: string;
  nombre: string;
  zona: string;
  estado: string;
}

type Modalidad = 'local' | 'retiro';

const MESA_STORAGE_KEY = 'alaburguer-mesero-mesa';

export default function CapturaPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemSeleccionado[]>([]);
  const [modalidad, setModalidad] = useState<Modalidad>('local');
  const [nombreCliente, setNombreCliente] = useState('');
  const [mesaZona, setMesaZona] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [showMesaSelector, setShowMesaSelector] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [prodRes, mesasRes] = await Promise.all([
        fetch('/api/productos'),
        fetch('/api/mesas'),
      ]);
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProductos((d?.data ?? []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          nombre: p.nombre as string,
          descripcion: (p.descripcion as string) || '',
          categoria: p.categoria as string,
          precio: typeof p.precio === 'object' ? (p.precio as { valor: number }).valor : (p.precio as number),
          imagenUrl: (p.imagen_url as string) || (p.imagenUrl as string) || null,
        })));
      }
      if (mesasRes.ok) { const d = await mesasRes.json(); setMesas(d?.data ?? []); }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const lastMesa = localStorage.getItem(MESA_STORAGE_KEY);
    if (lastMesa) setMesaZona(lastMesa);
  }, [fetchData]);

  const agregarItem = (producto: Producto) => {
    setItems(prev => {
      const existing = prev.find(i => i.productoId === producto.id);
      if (existing) return prev.map(i => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { productoId: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, comentario: '' }];
    });
  };

  const quitarItem = (productoId: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.productoId === productoId);
      if (!existing) return prev;
      if (existing.cantidad <= 1) return prev.filter(i => i.productoId !== productoId);
      return prev.map(i => i.productoId === productoId ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
  };

  const actualizarComentario = (productoId: string, comentario: string) => {
    setItems(prev => prev.map(i => i.productoId === productoId ? { ...i, comentario } : i));
  };

  const getCantidad = (productoId: string) => items.find(i => i.productoId === productoId)?.cantidad || 0;
  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  const mesasDisponibles = mesas.filter(m => m.estado === 'disponible');
  const mesasOcupadas = mesas.filter(m => m.estado !== 'disponible');

  const handleSelectMesa = (mesa: Mesa | null) => {
    if (mesa) {
      setMesaZona(`${mesa.nombre} - ${mesa.zona}`);
    } else {
      setMesaZona('Parados / En espera');
    }
    setShowMesaSelector(false);
  };

  const handleEnviar = async () => {
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    if (modalidad === 'local' && !mesaZona) { setError('Selecciona una mesa o "En espera"'); return; }
    setEnviando(true); setError(null);

    try {
      const meseroNombreStored = typeof window !== 'undefined' ? localStorage.getItem('alaburguer-mesero-nombre') : null;
      if (mesaZona.trim() && mesaZona !== 'Parados / En espera') localStorage.setItem(MESA_STORAGE_KEY, mesaZona.trim());

      const payload = {
        nombre: nombreCliente.trim() || 'Cliente en sucursal',
        telefono: '0000000000',
        modalidad,
        canal: 'MESERO',
        mesaZona: mesaZona === 'Parados / En espera' ? 'En espera' : (mesaZona.trim() || undefined),
        meseroNombre: meseroNombreStored || undefined,
        items: items.map(i => ({
          productoId: i.productoId,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precio,
          comentario: i.comentario.trim() || undefined,
        })),
      };

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || 'Error al crear pedido');
      }

      setExito(true);
      setItems([]);
      setNombreCliente('');
      setTimeout(() => setExito(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setEnviando(false);
    }
  };

  const categorias = ['todas', ...Array.from(new Set(productos.map(p => p.categoria)))];
  const productosFiltrados = categoriaFiltro === 'todas' ? productos : productos.filter(p => p.categoria === categoriaFiltro);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Captura de Pedido</h1>
              <p className="text-xs text-gray-500">Toma de orden presencial</p>
            </div>
          </div>
          <button onClick={() => router.push('/mesero')} className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 bg-white/5 border border-white/[0.08] hover:text-white hover:bg-white/10 transition-all">
            ← Panel mesero
          </button>
        </div>

        {/* Success toast */}
        {exito && (
          <div className="mb-6 rounded-2xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3 animate-scale-in">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-green-400">¡Pedido enviado a cocina!</p>
              <p className="text-xs text-green-400/60">El pedido ya está en preparación</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {categorias.map(cat => (
                <button key={cat} onClick={() => setCategoriaFiltro(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium capitalize whitespace-nowrap transition-all ${categoriaFiltro === cat ? 'bg-brand-500 text-black font-bold shadow-lg shadow-brand-500/20' : 'bg-[#12121a] text-gray-400 border border-white/[0.06] hover:text-white hover:border-white/10'}`}>
                  {cat === 'todas' ? `Todas (${productos.length})` : cat}
                </button>
              ))}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {productosFiltrados.map(producto => {
                const cant = getCantidad(producto.id);
                return (
                  <div key={producto.id} className={`rounded-2xl bg-[#12121a] border p-4 transition-all duration-200 ${cant > 0 ? 'border-brand-400/30 bg-brand-500/[0.03]' : 'border-white/[0.06] hover:border-white/10'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight">{producto.nombre}</p>
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{producto.descripcion}</p>
                      </div>
                      {cant > 0 && (
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 text-black text-xs font-bold flex items-center justify-center">{cant}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <span className="text-sm font-bold text-brand-400">${producto.precio}</span>
                      <div className="flex items-center gap-1.5">
                        {cant > 0 && (
                          <button onClick={() => quitarItem(producto.id)} className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all">−</button>
                        )}
                        <button onClick={() => agregarItem(producto)} className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 text-sm font-bold flex items-center justify-center hover:bg-brand-500/20 active:scale-95 transition-all">+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-5 sticky top-4">
              <h3 className="text-sm font-bold text-white mb-5 flex items-center justify-between">
                <span>Resumen del Pedido</span>
                {items.length > 0 && <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-400 text-[10px] font-bold">{items.reduce((s, i) => s + i.cantidad, 0)} items</span>}
              </h3>

              {/* Modalidad */}
              <div className="mb-5">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Modalidad</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setModalidad('local')} className={`px-3 py-3 rounded-xl text-xs font-medium border transition-all ${modalidad === 'local' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'text-gray-400 border-white/[0.06] hover:bg-white/5'}`}>
                    🍽️ Comer aquí
                  </button>
                  <button onClick={() => setModalidad('retiro')} className={`px-3 py-3 rounded-xl text-xs font-medium border transition-all ${modalidad === 'retiro' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'text-gray-400 border-white/[0.06] hover:bg-white/5'}`}>
                    🛍️ Para llevar
                  </button>
                </div>
              </div>

              {/* Mesa Selector — Custom (not native select) */}
              {modalidad === 'local' && (
                <div className="mb-5">
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Mesa</label>
                  <button
                    onClick={() => setShowMesaSelector(true)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-left text-sm transition-all hover:border-brand-400/30 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  >
                    {mesaZona ? (
                      <span className="text-white font-medium">{mesaZona}</span>
                    ) : (
                      <span className="text-gray-500">Toca para seleccionar mesa</span>
                    )}
                  </button>
                </div>
              )}

              {/* Nombre */}
              <div className="mb-5">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Cliente (opcional)</label>
                <input type="text" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)}
                  placeholder="Nombre para el pedido"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/30 transition-all" />
              </div>

              {/* Items list */}
              {items.length > 0 && (
                <div className="mb-5 space-y-2">
                  <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Pedido</label>
                  {items.map(item => (
                    <div key={item.productoId} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white font-medium">{item.cantidad}× {item.nombre}</span>
                        <span className="text-xs text-brand-400 font-bold">${item.precio * item.cantidad}</span>
                      </div>
                      <input
                        type="text"
                        value={item.comentario}
                        onChange={e => actualizarComentario(item.productoId, e.target.value)}
                        placeholder="Instrucciones para cocina..."
                        className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-400/30"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              {items.length > 0 && (
                <div className="flex justify-between items-center py-4 border-t border-white/[0.06] mb-4">
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="text-xl font-black text-brand-400">${total.toFixed(0)}</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 mb-4">{error}</div>
              )}

              <button onClick={handleEnviar} disabled={enviando || items.length === 0}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]">
                {enviando ? 'Enviando...' : items.length === 0 ? 'Agrega productos' : `🔥 Enviar a Cocina — $${total.toFixed(0)}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mesa Selector Modal */}
      {showMesaSelector && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#12121a] border border-white/[0.06] p-5 animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Seleccionar Mesa</h3>
              <button onClick={() => setShowMesaSelector(false)} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Available mesas */}
            {mesasDisponibles.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-medium text-green-400 uppercase tracking-wider mb-2">Disponibles</p>
                <div className="grid grid-cols-2 gap-2">
                  {mesasDisponibles.map(m => (
                    <button key={m.id} onClick={() => handleSelectMesa(m)}
                      className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-all text-left active:scale-[0.97]">
                      <p className="text-sm font-semibold text-white">{m.nombre}</p>
                      <p className="text-[10px] text-gray-500">{m.zona}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Occupied mesas (grayed out) */}
            {mesasOcupadas.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">Ocupadas</p>
                <div className="grid grid-cols-2 gap-2">
                  {mesasOcupadas.map(m => (
                    <div key={m.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 opacity-50 cursor-not-allowed">
                      <p className="text-sm font-medium text-gray-400">{m.nombre}</p>
                      <p className="text-[10px] text-red-400/70">{m.zona} — ocupada</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No mesa / standing option */}
            <div className="pt-3 border-t border-white/[0.06]">
              <button onClick={() => handleSelectMesa(null)}
                className="w-full p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-all text-left active:scale-[0.97]">
                <p className="text-sm font-semibold text-amber-400">🧍 Parados / En espera</p>
                <p className="text-[10px] text-gray-500">Cliente sin mesa asignada por el momento</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
