'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCarrito } from '../_context/CarritoContext';
import { useQrMesa } from '../_context/QrMesaContext';

/**
 * /menu-domicilio — Menú digital para pedidos a domicilio.
 * 
 * Página 100% independiente del flujo de mesas/QR.
 * Se comparte en redes sociales para que clientes pidan delivery.
 * Mismos estilos que /menu pero sin dependencia de QR ni mesas.
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

// ========== Shared Components (same styles as /menu) ==========

function PlaceholderImage() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#1a1520] to-[#16161f] flex items-center justify-center">
      <svg
        className="w-12 h-12 sm:w-16 sm:h-16 text-brand-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z"
        />
      </svg>
    </div>
  );
}

function ProductoCard({ producto }: { producto: ProductoMenu }) {
  const { agregarItem } = useCarrito();

  const precioFormateado = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(producto.precio);

  return (
    <article
      className={`
        bg-[#12121a] rounded-2xl border border-white/[0.06] overflow-hidden
        transition-all duration-300 motion-reduce:transition-none
        group hover:border-brand-400/30 hover:shadow-[0_8px_40px_-8px_rgba(245,166,35,0.15)]
        shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]
        ${!producto.disponible ? 'opacity-60' : ''}
      `}
      aria-label={`${producto.nombre} - ${precioFormateado}${!producto.disponible ? ' - No disponible' : ''}`}
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
          <PlaceholderImage />
        )}
        <div className="absolute top-2 right-2">
          {producto.disponible ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 shadow-sm shadow-green-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
              Disponible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm shadow-red-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
              No disponible
            </span>
          )}
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-1">
          {producto.nombre}
        </h3>
        {producto.descripcion && (
          <p className="mt-1 text-xs sm:text-sm text-gray-400 line-clamp-4">
            {producto.descripcion}
          </p>
        )}
        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          <span className="text-lg sm:text-xl font-extrabold text-brand-400 drop-shadow-[0_0_8px_rgba(245,166,35,0.3)]">
            {precioFormateado}
          </span>
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
              className="
                min-w-[44px] min-h-[44px] flex items-center justify-center
                rounded-full bg-gradient-to-br from-fire-500 to-brand-500 text-white text-lg font-bold
                shadow-lg shadow-fire-500/30
                hover:shadow-xl hover:shadow-brand-500/30 hover:scale-110
                active:scale-90
                transition-all duration-300 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-[#12121a]
                relative
              "
              aria-label={`Agregar ${producto.nombre} al pedido`}
            >
              <span className="absolute inset-0 rounded-full border border-brand-400/30 animate-ping opacity-20" />
              +
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductoSkeleton() {
  return (
    <div className="bg-[#16161f] rounded-2xl shadow-sm overflow-hidden border border-white/5 animate-pulse">
      <div className="aspect-[4/3] w-full bg-[#1a1a24]" />
      <div className="p-3 sm:p-4 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-5 bg-brand-400/20 rounded w-1/3 mt-3" />
      </div>
    </div>
  );
}

// ========== Main Page ==========

export default function MenuDomicilioPage() {
  const { setModalidad, cantidadTotal } = useCarrito();
  const { setQrMesa } = useQrMesa();
  const [todosProductos, setTodosProductos] = useState<ProductoMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

  // Siempre DOMICILIO — clear any QR mesa data
  useEffect(() => {
    setModalidad('DOMICILIO');
    setQrMesa(null); // Clear stale QR mesa from localStorage
  }, [setModalidad, setQrMesa]);

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

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const categoriasDinamicas = [
    { value: 'todas', label: 'Todas' },
    ...Array.from(new Set(todosProductos.map(p => p.categoria)))
      .sort()
      .map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))
  ];

  const productosFiltrados = categoriaActiva === 'todas'
    ? todosProductos
    : todosProductos.filter(p => p.categoria === categoriaActiva);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Nuestro Menú
          </h2>
          <p className="text-sm text-gray-500 mt-1">🛵 Entrega a domicilio</p>
          <div className="mt-3 w-16 h-0.5 bg-gradient-to-r from-brand-400 to-fire-500 rounded-full" />
        </div>
        {cantidadTotal > 0 && (
          <Link
            href="/pedido"
            className="
              flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-gradient-to-r from-brand-400 to-brand-600 text-black text-sm font-bold
              shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all
            "
          >
            🛒 Ver pedido ({cantidadTotal})
          </Link>
        )}
      </div>

      {/* Gradient separator */}
      <div className="mb-4 sm:mb-6 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />

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
                className={`
                  flex items-center gap-1.5 px-3 py-2
                  rounded-xl text-xs font-semibold
                  transition-all duration-200 motion-reduce:transition-none
                  focus:outline-none focus:ring-2 focus:ring-brand-400
                  ${
                    isActive
                      ? 'bg-brand-500 text-black shadow-md shadow-brand-500/30'
                      : 'bg-[#1a1a24] text-gray-400 border border-white/5 hover:border-brand-400/30 hover:text-brand-300'
                  }
                `}
                aria-pressed={isActive}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-black' : 'bg-white/5 text-gray-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-fire-900/30 border border-fire-500/20 text-fire-300 text-sm" role="alert">
          <p className="font-medium">Error al cargar el menú</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={fetchProductos}
            className="mt-2 text-sm font-medium text-fire-400 underline hover:text-fire-300 min-h-[44px] inline-flex items-center"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductoSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && productosFiltrados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 stagger-children">
          {productosFiltrados.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && productosFiltrados.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <span className="text-5xl block mb-4" aria-hidden="true">🍽️</span>
          <h3 className="text-lg font-semibold text-white mb-2">No hay productos disponibles</h3>
          <p className="text-sm text-gray-500">
            {categoriaActiva !== 'todas'
              ? 'No se encontraron productos en esta categoría.'
              : 'El menú estará disponible pronto.'}
          </p>
          {categoriaActiva !== 'todas' && (
            <button
              onClick={() => setCategoriaActiva('todas')}
              className="mt-4 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium text-brand-400 bg-brand-400/10 hover:bg-brand-400/20 transition-colors"
            >
              Ver todas las categorías
            </button>
          )}
        </div>
      )}

      {/* Restaurant Info Bar — same as /menu */}
      <div className="mt-8 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5" aria-hidden="true">📍</span>
            <div>
              <p className="text-xs font-bold text-black uppercase tracking-wide">Dirección</p>
              <p className="text-sm text-black/80 font-medium">
                San Pablo Autopan, sobre calle Felipe Villanueva, casi esquina calle Independencia
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-shrink-0">
            <div className="flex items-start gap-2">
              <span className="text-lg" aria-hidden="true">📞</span>
              <div>
                <p className="text-xs font-bold text-black uppercase tracking-wide">Servicio a Domicilio</p>
                <a href="tel:7226802734" className="text-sm font-bold text-black hover:underline">
                  722 680 2734
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
