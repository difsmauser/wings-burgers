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
}

type Modalidad = 'local' | 'retiro';

export default function CapturaPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemSeleccionado[]>([]);
  const [modalidad, setModalidad] = useState<Modalidad>('local');
  const [nombreCliente, setNombreCliente] = useState('');
  const [mesaZona, setMesaZona] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');

  const fetchProductos = useCallback(async () => {
    try {
      const res = await fetch('/api/productos');
      if (res.ok) {
        const data = await res.json();
        setProductos(data?.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const agregarItem = (producto: Producto) => {
    setItems(prev => {
      const existing = prev.find(i => i.productoId === producto.id);
      if (existing) {
        return prev.map(i => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { productoId: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }];
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

  const getCantidad = (productoId: string) => items.find(i => i.productoId === productoId)?.cantidad || 0;

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0);

  const handleEnviar = async () => {
    if (items.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }
    setEnviando(true);
    setError(null);

    try {
      // Get mesero name from localStorage if available
      const meseroNombreStored = typeof window !== 'undefined' ? localStorage.getItem('alaburguer-mesero-nombre') : null;

      const payload = {
        nombre: nombreCliente.trim() || 'Cliente en sucursal',
        telefono: '0000000000', // Mesero orders don't need real phone
        modalidad,
        canal: 'MESERO',
        mesaZona: mesaZona.trim() || undefined,
        meseroNombre: meseroNombreStored || undefined,
        items: items.map(i => ({
          productoId: i.productoId,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precio,
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
      setMesaZona('');

      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setExito(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setEnviando(false);
    }
  };

  const categorias = ['todas', ...new Set(productos.map(p => p.categoria))];
  const productosFiltrados = categoriaFiltro === 'todas' ? productos : productos.filter(p => p.categoria === categoriaFiltro);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📝</span>
              Captura de Pedido
            </h1>
            <p className="text-sm text-gray-500 mt-1">Toma de orden por mesero</p>
          </div>
          <button
            onClick={() => router.push('/mesero')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            &larr; Volver al panel
          </button>
        </div>

        {/* Success message */}
        {exito && (
          <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3 animate-scale-in">
            <span className="text-2xl">&#10004;&#65039;</span>
            <div>
              <p className="text-sm font-bold text-green-400">&#161;Pedido enviado a cocina!</p>
              <p className="text-xs text-green-400/70">El pedido fue registrado exitosamente</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {categorias.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaFiltro(cat)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all duration-200 ${
                    categoriaFiltro === cat
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold shadow-lg shadow-brand-400/30'
                      : 'bg-[#16161f] text-gray-400 border border-white/5 hover:text-brand-400 hover:border-brand-400/30'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {productosFiltrados.map(producto => {
                const cant = getCantidad(producto.id);
                return (
                  <div
                    key={producto.id}
                    className={`rounded-xl bg-[#16161f] border p-3 transition-all duration-200 ${
                      cant > 0 ? 'border-brand-400/30 shadow-sm shadow-brand-500/10' : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <p className="text-sm font-medium text-white line-clamp-2 mb-1">{producto.nombre}</p>
                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">{producto.descripcion}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-400">${producto.precio}</span>
                      <div className="flex items-center gap-2">
                        {cant > 0 && (
                          <>
                            <button
                              onClick={() => quitarItem(producto.id)}
                              className="w-7 h-7 rounded-full bg-fire-500/10 text-fire-400 text-sm font-bold flex items-center justify-center hover:bg-fire-500/20 transition-colors"
                            >
                              &minus;
                            </button>
                            <span className="text-sm font-bold text-white min-w-[20px] text-center">{cant}</span>
                          </>
                        )}
                        <button
                          onClick={() => agregarItem(producto)}
                          className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-400 text-sm font-bold flex items-center justify-center hover:bg-brand-500/20 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="space-y-4">
            <div className="rounded-xl bg-[#16161f] border border-white/5 p-4 sticky top-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                Resumen del Pedido
                {totalItems > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs">
                    {totalItems} items
                  </span>
                )}
              </h3>

              {/* Modalidad */}
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">Modalidad</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setModalidad('local')}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                      modalidad === 'local'
                        ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                        : 'text-gray-400 border-white/5 hover:bg-white/5'
                    }`}
                  >
                    &#127968; Comer aqu&iacute;
                  </button>
                  <button
                    onClick={() => setModalidad('retiro')}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                      modalidad === 'retiro'
                        ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                        : 'text-gray-400 border-white/5 hover:bg-white/5'
                    }`}
                  >
                    &#127978; Para llevar
                  </button>
                </div>
              </div>

              {/* Cliente nombre (optional) */}
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Nombre (opcional)</label>
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Para llamar cuando est&eacute; listo"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-all duration-200"
                />
              </div>

              {/* Mesa/Zona (optional) */}
              {modalidad === 'local' && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Mesa (opcional)</label>
                  <input
                    type="text"
                    value={mesaZona}
                    onChange={(e) => setMesaZona(e.target.value)}
                    placeholder="Ej: Mesa 3, Terraza 1"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-all duration-200"
                  />
                </div>
              )}

              {/* Items list */}
              {items.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="text-3xl block mb-2">&#128722;</span>
                  <p className="text-xs text-gray-500">Selecciona productos del men&uacute;</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin mb-4">
                  {items.map(item => (
                    <div key={item.productoId} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs truncate">{item.nombre}</p>
                        <p className="text-[10px] text-gray-500">{item.cantidad} &times; ${item.precio}</p>
                      </div>
                      <span className="text-xs font-medium text-brand-400 ml-2">${(item.cantidad * item.precio).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              {items.length > 0 && (
                <div className="pt-3 border-t border-white/5 flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-400">Total</span>
                  <span className="text-xl font-bold text-brand-400">${total.toFixed(2)}</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleEnviar}
                disabled={enviando || items.length === 0}
                className="w-full px-4 py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 shadow-lg shadow-brand-500/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
              >
                {enviando ? 'Enviando...' : `Enviar a Cocina — $${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
