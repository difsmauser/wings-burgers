'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCarrito } from '../_context/CarritoContext';

/**
 * /menu-domicilio — Menú digital para pedidos a domicilio.
 * 
 * Página 100% independiente del flujo de mesas/QR.
 * Se comparte en redes sociales para que clientes pidan delivery.
 * Siempre modalidad DOMICILIO, sin selector de modalidad, sin QR.
 */

interface ProductoMenu {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  imagenUrl: string | null;
  disponible: boolean;
}

function formatPrecio(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function MenuDomicilioPage() {
  const { agregarItem, setModalidad, cantidadTotal } = useCarrito();
  const [productos, setProductos] = useState<ProductoMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

  // Siempre setear modalidad DOMICILIO al entrar
  useEffect(() => {
    setModalidad('DOMICILIO');
  }, [setModalidad]);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/productos');
      if (!res.ok) throw new Error('Error al cargar el menú');
      const json = await res.json();
      const data: ProductoMenu[] = (json.data || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        nombre: p.nombre as string,
        descripcion: (p.descripcion as string) || '',
        categoria: p.categoria as string,
        precio: typeof p.precio === 'object' && p.precio !== null
          ? (p.precio as { valor: number }).valor
          : (p.precio as number),
        imagenUrl: (p.imagen as string) || (p.imagenUrl as string) || (p.imagen_url as string) || null,
        disponible: p.disponible !== false && p.activo !== false,
      }));
      setProductos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const categorias = ['todas', ...Array.from(new Set(productos.map(p => p.categoria))).sort()];
  const productosFiltrados = categoriaActiva === 'todas'
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="A-la Burguer" className="h-8 w-8 rounded-full" />
            <div>
              <h1 className="text-sm font-bold text-white">A-la Burguer</h1>
              <p className="text-[10px] text-brand-400">Servicio a domicilio</p>
            </div>
          </div>
          {cantidadTotal > 0 && (
            <Link
              href="/pedido"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-black text-xs font-bold shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all"
            >
              <span>🛒</span>
              <span>{cantidadTotal} items</span>
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Title */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Nuestro Menú</h2>
          <p className="text-sm text-gray-500 mt-1">🛵 Entrega a domicilio</p>
          <div className="mt-3 w-16 h-0.5 bg-gradient-to-r from-brand-400 to-fire-500 rounded-full" />
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categorias.map(cat => {
            const isActive = categoriaActiva === cat;
            const count = cat === 'todas' ? productos.length : productos.filter(p => p.categoria === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-500 text-black shadow-md shadow-brand-500/30'
                    : 'bg-[#1a1a24] text-gray-400 border border-white/5 hover:border-brand-400/30'
                }`}
              >
                <span className="capitalize">{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20' : 'bg-white/5 text-gray-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <p className="font-medium">{error}</p>
            <button onClick={fetchProductos} className="mt-2 text-xs underline hover:text-red-300">Reintentar</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#16161f] rounded-2xl border border-white/5 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-[#1a1a24]" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-5 bg-brand-400/20 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {productosFiltrados.map(producto => (
              <article
                key={producto.id}
                className={`bg-[#12121a] rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 group hover:border-brand-400/30 hover:shadow-[0_8px_40px_-8px_rgba(245,166,35,0.15)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] ${!producto.disponible ? 'opacity-60' : ''}`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1a1a24]">
                  {producto.imagenUrl ? (
                    <Image
                      src={producto.imagenUrl}
                      alt={producto.nombre}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl opacity-30">🍔</span>
                    </div>
                  )}
                  {producto.disponible ? (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                      Disponible
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                      Agotado
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-bold text-white line-clamp-1">{producto.nombre}</h3>
                  {producto.descripcion && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{producto.descripcion}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-extrabold text-brand-400">{formatPrecio(producto.precio)}</span>
                    {producto.disponible && (
                      <button
                        onClick={() => agregarItem({
                          productoId: producto.id,
                          nombre: producto.nombre,
                          precioUnitario: producto.precio,
                          cantidad: 1,
                          imagenUrl: producto.imagenUrl,
                          opcionesDisponibles: [],
                        })}
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-fire-500 to-brand-500 text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-fire-500/30 hover:scale-110 active:scale-90 transition-all"
                        aria-label={`Agregar ${producto.nombre}`}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && productosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <span className="text-5xl block mb-3">🍽️</span>
            <p className="text-gray-400">No hay productos en esta categoría</p>
          </div>
        )}
      </div>

      {/* Footer info */}
      <footer className="border-t border-white/5 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>📍</span>
            <span>San Pablo Autopan, sobre calle Felipe Villanueva</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-brand-400">
            <span>📞</span>
            <a href="tel:7226802734" className="hover:text-brand-300 transition-colors">722 680 2734</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
