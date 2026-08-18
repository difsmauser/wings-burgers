'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
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

  const fetchData = useCallback(async () => {
    try {
      const [prodRes, mesasRes] = await Promise.all([
        fetch('/api/productos'),
        fetch('/api/mesas'),
      ]);
      if (prodRes.ok) { const d = await prodRes.json(); setProductos(d?.data ?? []); }
      if (mesasRes.ok) { const d = await mesasRes.json(); setMesas((d?.data ?? []).filter((m: Mesa) => m.estado !== 'fuera_de_servicio')); }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    // Pre-fill mesa from localStorage (mesero's last used mesa)
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

  const handleEnviar = async () => {
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    setEnviando(true); setError(null);

    try {
      const meseroNombreStored = typeof window !== 'undefined' ? localStorage.getItem('alaburguer-mesero-nombre') : null;

      // Remember mesa for next order
      if (mesaZona.trim()) localStorage.setItem(MESA_STORAGE_KEY, mesaZona.trim());

      const payload = {
        nombre: nombreCliente.trim() || 'Cliente en sucursal',
        telefono: '0000000000',
        modalidad,
        canal: 'MESERO',
        mesaZona: mesaZona.trim() || undefined,
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
      // Keep mesaZona for next order (same table)

      setTimeout(() => setExito(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setEnviando(false);
    }
  };

  const categorias = ['todas', ...new Set(productos.map(p => p.categoria))];
  const productosFiltrados = categoriaFiltro === 'todas' ? productos : productos.filter(p => p.categoria === categoriaFiltro);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📝</span> Captura de Pedido
            </h1>
            <p className="text-sm text-gray-500 mt-1">Toma de orden por mesero</p>
          </div>
          <button onClick={() => router.push('/mesero')} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all">
            ← Volver al panel
          </button>
        </div>

        {/* Success */}
        {exito && (
          <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3 animate-scale-in">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-bold text-green-400">¡Pedido enviado a cocina!</p>
              {mesaZona && <p className="text-xs text-green-400/70">Mesa guardada: {mesaZona}</p>}
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
                  className={`px-3 py-2 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${categoriaFiltro === cat ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold' : 'bg-[#16161f] text-gray-400 border border-white/5 hover:text-brand-400'}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {productosFiltrados.map(producto => {
                const cant = getCantidad(producto.id);
                return (
                  <div key={producto.id} className={`rounded-xl bg-[#16161f] border p-3 transition-all ${cant > 0 ? 'border-brand-400/30 shadow-sm shadow-brand-500/10' : 'border-white/5 hover:border-white/10'}`}>
                    <p className="text-sm font-medium text-white line-clamp-2 mb-1">{producto.nombre}</p>
                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">{producto.descripcion}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-400">${producto.precio}</span>
                      <div className="flex items-center gap-2">
                        {cant > 0 && (
                          <>
                            <button onClick={() => quitarItem(producto.id)} className="w-7 h-7 rounded-full bg-red-500/10 text-red-400 text-sm font-bold flex items-center justify-center hover:bg-red-500/20 transition-colors">−</button>
                            <span className="text-sm font-bold text-white min-w-[20px] text-center">{cant}</span>
                          </>
                        )}
                        <button onClick={() => agregarItem(producto)} className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-400 text-sm font-bold flex items-center justify-center hover:bg-brand-500/20 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order summary */}
          <div className="space-y-4">
            <div className="rounded-xl bg-[#16161f] border border-white/5 p-4 sticky top-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                Resumen del Pedido
                {items.length > 0 && <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs">{items.reduce((s, i) => s + i.cantidad, 0)} items</span>}
              </h3>

              {/* Modalidad */}
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">Modalidad</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setModalidad('local')} className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${modalidad === 'local' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'text-gray-400 border-white/5 hover:bg-white/5'}`}>
                    🍽️ Comer aquí
                  </button>
                  <button onClick={() => setModalidad('retiro')} className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${modalidad === 'retiro' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 'text-gray-400 border-white/5 hover:bg-white/5'}`}>
                    🛍️ Para llevar
                  </button>
                </div>
              </div>

              {/* Mesa — dropdown with registered tables */}
              {modalidad === 'local' && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Mesa</label>
                  <select
                    value={mesaZona}
                    onChange={e => setMesaZona(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all"
                  >
                    <option value="">— Selecciona mesa —</option>
                    {mesas.map(m => (
                      <option key={m.id} value={`${m.nombre} - ${m.zona}`}>{m.nombre} ({m.zona}) — {m.estado}</option>
                    ))}
                    <option value="custom">Otra (escribir)</option>
                  </select>
                  {mesaZona === 'custom' && (
                    <input type="text" placeholder="Ej: Terraza 2" onChange={e => setMesaZona(e.target.value)}
                      className="mt-2 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50" />
                  )}
                  {mesaZona && mesaZona !== 'custom' && (
                    <p className="text-[10px] text-brand-400 mt-1">📍 Mesa guardada para esta sesión</p>
                  )}
                </div>
              )}

              {/* Nombre */}
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Nombre (opcional)</label>
                <input type="text" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)}
                  placeholder="Para llamar cuando esté listo"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-all" />
              </div>

              {/* Items with inline comments */}
              {items.length > 0 && (
                <div className="mb-4 space-y-2">
                  <label className="block text-xs text-gray-400">Pedido + Instrucciones para cocina</label>
                  {items.map(item => (
                    <div key={item.productoId} className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-medium">{item.cantidad}x {item.nombre}</span>
                        <span className="text-xs text-brand-400 font-bold">${item.precio * item.cantidad}</span>
                      </div>
                      <input
                        type="text"
                        value={item.comentario}
                        onChange={e => actualizarComentario(item.productoId, e.target.value)}
                        placeholder="¿Cómo lo quiere? Sin cebolla, extra picante..."
                        className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-400/30"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              {items.length > 0 && (
                <div className="flex justify-between items-center py-3 border-t border-white/5 mb-4">
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="text-lg font-black text-brand-400">${total.toFixed(0)}</span>
                </div>
              )}

              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

              <button onClick={handleEnviar} disabled={enviando || items.length === 0}
                className="w-full py-3 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97]">
                {enviando ? 'Enviando...' : `Enviar a Cocina — $${total.toFixed(0)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
