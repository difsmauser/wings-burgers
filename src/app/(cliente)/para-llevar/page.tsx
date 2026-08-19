'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCarrito } from '../_context/CarritoContext';
import { useQrMesa } from '../_context/QrMesaContext';

/**
 * /para-llevar — Menú QR para pedidos "Para Llevar" sin mesero.
 * 
 * Canal independiente: el cliente escanea un QR genérico en el mostrador,
 * agrega productos, pone su nombre y WhatsApp, y el pedido va a cocina.
 * Cuando está listo, se le llama y paga (efectivo o transferencia).
 * El ticket se envía por WhatsApp.
 * 
 * NO usa mesas. NO requiere mesero. Completamente autónomo.
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

function PlaceholderImage() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#1a1520] to-[#16161f] flex items-center justify-center">
      <svg className="w-12 h-12 text-brand-400 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
      </svg>
    </div>
  );
}

function ProductoCard({ producto }: { producto: ProductoMenu }) {
  const { agregarItem } = useCarrito();
  const [imgError, setImgError] = useState(false);

  const precioFormateado = new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2,
  }).format(producto.precio);

  return (
    <article className={`bg-[#12121a] rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 group hover:border-amber-400/30 hover:shadow-[0_8px_40px_-8px_rgba(245,166,35,0.15)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] ${!producto.disponible ? 'opacity-60' : ''}`}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1a1a24]">
        {producto.imagenUrl && !imgError ? (
          <Image src={producto.imagenUrl} alt={producto.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" unoptimized={!producto.imagenUrl.includes('supabase.co')} onError={() => setImgError(true)} />
        ) : (
          <PlaceholderImage />
        )}
        {producto.disponible && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Disponible
          </span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-1">{producto.nombre}</h3>
        {producto.descripcion && (
          <p className="mt-1 text-xs sm:text-sm text-gray-400 line-clamp-2">{producto.descripcion}</p>
        )}
        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          <span className="text-lg sm:text-xl font-extrabold text-amber-400">{precioFormateado}</span>
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
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-brand-500 text-white text-lg font-bold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:scale-110 active:scale-90 transition-all duration-300 relative"
              aria-label={`Agregar ${producto.nombre}`}
            >
              +
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ParaLlevarPage() {
  const { setModalidad, cantidadTotal, confirmado, limpiarParaNuevoPedido } = useCarrito();
  const { setQrMesa } = useQrMesa();
  const [todosProductos, setTodosProductos] = useState<ProductoMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

  // Siempre RETIRO (para llevar) — limpiar QR/mesa data
  useEffect(() => {
    setModalidad('RETIRO');
    setQrMesa(null);
    if (confirmado) {
      limpiarParaNuevoPedido();
    }
  }, [setModalidad, setQrMesa, confirmado, limpiarParaNuevoPedido]);

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
      setTodosProductos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const categoriasDinamicas = [
    { value: 'todas', label: 'Todas' },
    ...Array.from(new Set(todosProductos.map(p => p.categoria)))
      .sort()
      .map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))
  ];

  const productosFiltrados = categoriaActiva === 'todas'
    ? todosProductos
    : todosProductos.filter(p => p.categoria === categoriaActiva);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
          <p className="text-xs text-gray-500">Cargando menú...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchProductos} className="mt-3 px-4 py-2 rounded-lg text-xs text-white bg-white/10 hover:bg-white/20 transition-all">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Nuestro Menú</h2>
          <p className="text-sm text-amber-400 mt-1 font-medium">🛍️ Para Llevar</p>
          <div className="mt-3 w-16 h-0.5 bg-gradient-to-r from-amber-400 to-brand-500 rounded-full" />
        </div>
        {cantidadTotal > 0 && (
          <Link
            href="/pedido"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-brand-500 text-black text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all"
          >
            🛒 Ver pedido ({cantidadTotal})
          </Link>
        )}
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <span className="text-xl">🛍️</span>
          <div>
            <p className="text-sm font-medium text-amber-400">Pedido Para Llevar</p>
            <p className="text-xs text-gray-400 mt-0.5">Agrega tus productos, confirma tu pedido y te avisamos cuando esté listo para recoger.</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-wrap gap-2">
          {categoriasDinamicas.map((cat) => {
            const isActive = categoriaActiva === cat.value;
            const count = cat.value === 'todas' ? todosProductos.length : todosProductos.filter(p => p.categoria === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setCategoriaActiva(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${isActive ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20' : 'bg-[#12121a] text-gray-400 border border-white/[0.06] hover:text-white hover:border-white/10'}`}
              >
                {cat.label}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-black' : 'bg-white/5 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {productosFiltrados.map((producto) => (
          <ProductoCard key={producto.id} producto={producto} />
        ))}
      </div>

      {productosFiltrados.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No hay productos en esta categoría</p>
        </div>
      )}
    </div>
  );
}
