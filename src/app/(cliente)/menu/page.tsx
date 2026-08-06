'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useQrMesa } from '../_context/QrMesaContext';

/**
 * Tipos locales para los datos del menú del cliente.
 */
interface ProductoMenu {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  imagenUrl: string | null;
  activo: boolean;
  disponible: boolean;
}

type Modalidad = 'LOCAL' | 'DOMICILIO' | null;
type CategoriaFiltro = 'TODAS' | 'ALITAS' | 'HAMBURGUESAS' | 'BEBIDAS' | 'OTROS';

/**
 * QR validation state for mesa/zona identification (Req 8.1, 8.4).
 */
interface QrMesaInfo {
  codigo: string;
  mesaZona: string;
  valido: boolean;
}

type QrEstado = 'idle' | 'validando' | 'valido' | 'invalido';

/**
 * Categorías disponibles para filtrado.
 */
const CATEGORIAS: { value: CategoriaFiltro; label: string; icon: string }[] = [
  { value: 'TODAS', label: 'Todas', icon: '🍽️' },
  { value: 'ALITAS', label: 'Alitas', icon: '🍗' },
  { value: 'HAMBURGUESAS', label: 'Hamburguesas', icon: '🍔' },
  { value: 'BEBIDAS', label: 'Bebidas', icon: '🥤' },
  { value: 'OTROS', label: 'Otros', icon: '🍟' },
];

/**
 * Placeholder SVG component for products without images.
 * Displays a generic food icon (Req 10.5).
 */
function PlaceholderImage() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
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

/**
 * Modality selector component.
 * Asks the client to select between eating locally or delivery (Req 10.4).
 */
function ModalidadSelector({
  onSelect,
}: {
  onSelect: (modalidad: Modalidad) => void;
}) {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8
                    animate-fade-in motion-reduce:animate-none"
      >
        <div className="text-center mb-8">
          <span className="text-5xl sm:text-6xl mb-4 block" aria-hidden="true">
            🍗
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-wood-800 mb-2">
            ¡Bienvenido!
          </h2>
          <p className="text-wood-600 text-sm sm:text-base">
            ¿Cómo deseas disfrutar tu pedido?
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelect('LOCAL')}
            className="
              w-full flex items-center gap-4 p-4 sm:p-5
              min-h-[44px] rounded-xl border-2 border-wood-200
              bg-white hover:border-brand-400 hover:bg-brand-50
              transition-all duration-200 motion-reduce:transition-none
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
              group
            "
            aria-label="Comer en el local"
          >
            <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-200 motion-reduce:transition-none" aria-hidden="true">
              🏠
            </span>
            <div className="text-left">
              <span className="block text-lg font-semibold text-wood-800">
                Comer en el local
              </span>
              <span className="block text-sm text-wood-500">
                Disfruta en nuestro restaurante
              </span>
            </div>
          </button>

          <button
            onClick={() => onSelect('DOMICILIO')}
            className="
              w-full flex items-center gap-4 p-4 sm:p-5
              min-h-[44px] rounded-xl border-2 border-wood-200
              bg-white hover:border-brand-400 hover:bg-brand-50
              transition-all duration-200 motion-reduce:transition-none
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
              group
            "
            aria-label="Entrega a domicilio"
          >
            <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-200 motion-reduce:transition-none" aria-hidden="true">
              🛵
            </span>
            <div className="text-left">
              <span className="block text-lg font-semibold text-wood-800">
                Entrega a domicilio
              </span>
              <span className="block text-sm text-wood-500">
                Te lo llevamos a tu puerta
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual product card component.
 * Shows image (or placeholder), name, description, price, and availability (Req 10.1, 10.3, 10.5).
 */
function ProductoCard({ producto }: { producto: ProductoMenu }) {
  const precioFormateado = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(producto.precio);

  return (
    <article
      className={`
        bg-white rounded-xl shadow-sm overflow-hidden
        border border-wood-100
        transition-shadow duration-200 motion-reduce:transition-none
        hover:shadow-md
        ${!producto.disponible ? 'opacity-60' : ''}
      `}
      aria-label={`${producto.nombre} - ${precioFormateado}${!producto.disponible ? ' - No disponible' : ''}`}
    >
      {/* Product Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-100">
        {producto.imagenUrl ? (
          <Image
            src={producto.imagenUrl}
            alt={producto.nombre}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <PlaceholderImage />
        )}

        {/* Availability Badge */}
        <div className="absolute top-2 right-2">
          {producto.disponible ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
              Disponible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
              No disponible
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold text-wood-800 line-clamp-1">
          {producto.nombre}
        </h3>

        {producto.descripcion && (
          <p className="mt-1 text-xs sm:text-sm text-wood-500 line-clamp-2">
            {producto.descripcion.length > 200
              ? `${producto.descripcion.slice(0, 200)}…`
              : producto.descripcion}
          </p>
        )}

        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold text-brand-600">
            {precioFormateado}
          </span>

          {producto.disponible && (
            <button
              className="
                min-w-[44px] min-h-[44px] flex items-center justify-center
                rounded-full bg-brand-500 hover:bg-brand-600
                text-white text-lg
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                active:scale-95 motion-reduce:active:scale-100
              "
              aria-label={`Agregar ${producto.nombre} al pedido`}
            >
              +
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Loading skeleton for product cards.
 */
function ProductoSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-wood-100 animate-pulse">
      <div className="aspect-[4/3] w-full bg-brand-100" />
      <div className="p-3 sm:p-4 space-y-2">
        <div className="h-4 bg-wood-100 rounded w-3/4" />
        <div className="h-3 bg-wood-100 rounded w-full" />
        <div className="h-5 bg-brand-100 rounded w-1/3 mt-3" />
      </div>
    </div>
  );
}

/**
 * QR Error component displayed when a scanned QR code is invalid (Req 8.4).
 * Shows error message and invites user to ask for staff assistance.
 */
function QrInvalidoMessage({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8
                    animate-fade-in motion-reduce:animate-none text-center"
        role="alert"
        aria-live="assertive"
      >
        <span className="text-5xl sm:text-6xl mb-4 block" aria-hidden="true">
          ⚠️
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-fire-700 mb-3">
          Código QR no válido
        </h2>
        <p className="text-wood-600 text-sm sm:text-base mb-6">
          El código QR escaneado no es válido o ha expirado. Por favor solicita
          asistencia al personal del local.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-wood-500 text-sm">
            <span aria-hidden="true">👋</span>
            <span>Llama a un mesero para que te ayude</span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="
                mt-4 min-h-[44px] px-6 py-3 rounded-xl
                text-sm font-medium text-white
                bg-brand-500 hover:bg-brand-600
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
              "
              aria-label="Ver menú sin mesa asignada"
            >
              Ver menú de todas formas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * QR Validating loading state.
 */
function QrValidandoMessage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center animate-pulse">
        <span className="text-5xl sm:text-6xl mb-4 block" aria-hidden="true">
          📱
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-wood-700 mb-2">
          Validando código QR...
        </h2>
        <p className="text-wood-500 text-sm">
          Un momento mientras identificamos tu mesa.
        </p>
      </div>
    </div>
  );
}

/**
 * Banner showing the mesa/zona identification from QR (Req 8.1).
 */
function QrMesaBanner({ mesaZona }: { mesaZona: string }) {
  return (
    <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
      <span className="text-green-600 text-lg" aria-hidden="true">📍</span>
      <span className="text-sm font-medium text-green-800">
        Mesa: {mesaZona}
      </span>
    </div>
  );
}

/**
 * Menu page for the cliente module.
 *
 * Displays the restaurant menu organized by categories with product images,
 * prices, and availability indicators (Req 10.1, 10.2, 10.3).
 * Shows a modality selector before the menu (Req 10.4).
 * Implements placeholder images for products without images (Req 10.5).
 * Detects QR parameter to identify mesa/zona (Req 8.1, 8.4).
 * Responsive design from 320px to 1920px with 44x44px touch targets (Req 18.2).
 * Animations 150-400ms with prefers-reduced-motion support (Req 18.4, 18.5).
 */
export default function MenuPage() {
  const searchParams = useSearchParams();
  const qrCodigo = searchParams.get('qr');
  const { setQrMesa } = useQrMesa();

  const [modalidad, setModalidad] = useState<Modalidad>(null);
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaFiltro>('TODAS');
  const [productos, setProductos] = useState<ProductoMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QR state (Req 8.1, 8.4)
  const [qrEstado, setQrEstado] = useState<QrEstado>(qrCodigo ? 'validando' : 'idle');
  const [qrMesaInfo, setQrMesaInfo] = useState<QrMesaInfo | null>(null);

  /**
   * Validates QR code against the API (Req 8.1, 8.4).
   * If valid, sets mesa/zona info. If invalid, shows error.
   * Must complete within 5 seconds (Req 8.1).
   */
  useEffect(() => {
    if (!qrCodigo) return;

    let cancelled = false;

    async function validarQr() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s max (Req 8.1)

        const response = await fetch(`/api/qr/${encodeURIComponent(qrCodigo!)}`, {
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (cancelled) return;

        if (!response.ok) {
          const json = await response.json().catch(() => null);
          if (json?.error?.code === 'QR_INVALIDO') {
            setQrEstado('invalido');
            return;
          }
          setQrEstado('invalido');
          return;
        }

        const json = await response.json();
        if (json.data?.valido) {
          setQrMesaInfo({
            codigo: json.data.codigo,
            mesaZona: json.data.mesaZona,
            valido: true,
          });
          setQrEstado('valido');
          // Set context for use in order flow (Req 8.2)
          setQrMesa({
            codigo: json.data.codigo,
            mesaZona: json.data.mesaZona,
          });
          // Auto-set modalidad to LOCAL for QR-based access (they're in the restaurant)
          setModalidad('LOCAL');
        } else {
          setQrEstado('invalido');
        }
      } catch (err) {
        if (cancelled) return;
        // Network error or timeout = invalid QR experience
        setQrEstado('invalido');
      }
    }

    validarQr();

    return () => {
      cancelled = true;
    };
  }, [qrCodigo, setQrMesa]);

  /**
   * Fetches products from the API.
   * Filters by category if one is selected (not 'TODAS').
   */
  const fetchProductos = useCallback(async (categoria: CategoriaFiltro) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (categoria !== 'TODAS') {
        params.set('categoria', categoria);
      }

      const url = `/api/productos${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al cargar el menú');
      }

      const json = await response.json();
      // Map API response to local type, defaulting disponible to activo status
      const productosData: ProductoMenu[] = (json.data || []).map(
        (p: Record<string, unknown>) => ({
          id: p.id as string,
          nombre: p.nombre as string,
          descripcion: (p.descripcion as string) || '',
          categoria: p.categoria as string,
          precio: typeof p.precio === 'object' && p.precio !== null
            ? (p.precio as { valor: number }).valor
            : (p.precio as number),
          imagenUrl: (p.imagenUrl as string) || null,
          activo: p.activo !== false,
          disponible: p.disponible !== false && p.activo !== false,
        })
      );

      setProductos(productosData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error desconocido al cargar productos'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch products when modalidad is selected or category changes
  useEffect(() => {
    if (modalidad) {
      fetchProductos(categoriaActiva);
    }
  }, [modalidad, categoriaActiva, fetchProductos]);

  // QR validating state - show loading while checking code (Req 8.1)
  if (qrEstado === 'validando') {
    return <QrValidandoMessage />;
  }

  // QR invalid state - show error and invite to ask for help (Req 8.4)
  if (qrEstado === 'invalido') {
    return (
      <QrInvalidoMessage
        onDismiss={() => {
          setQrEstado('idle');
        }}
      />
    );
  }

  // Show modality selector first (Req 10.4) — skipped when QR sets LOCAL automatically
  if (!modalidad) {
    return <ModalidadSelector onSelect={setModalidad} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* QR Mesa/Zona identification banner (Req 8.1) */}
      {qrMesaInfo && qrEstado === 'valido' && (
        <QrMesaBanner mesaZona={qrMesaInfo.mesaZona} />
      )}

      {/* Modality indicator */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-wood-800">
            Nuestro Menú
          </h2>
          <p className="text-sm text-wood-500 mt-0.5">
            {modalidad === 'LOCAL' ? '🏠 Comiendo en el local' : '🛵 Entrega a domicilio'}
          </p>
        </div>
        <button
          onClick={() => setModalidad(null)}
          className="
            min-w-[44px] min-h-[44px] flex items-center justify-center
            px-3 py-2 rounded-lg text-sm font-medium
            text-wood-600 bg-white border border-wood-200
            hover:bg-wood-50 hover:border-wood-300
            transition-colors duration-150 motion-reduce:transition-none
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
          "
          aria-label="Cambiar modalidad de servicio"
        >
          Cambiar
        </button>
      </div>

      {/* Category Filter Tabs (Req 10.2) */}
      <div className="mb-4 sm:mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 sm:gap-3 min-w-max pb-1">
          {CATEGORIAS.map((cat) => {
            const isActive = categoriaActiva === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setCategoriaActiva(cat.value)}
                className={`
                  inline-flex items-center gap-1.5 sm:gap-2
                  min-w-[44px] min-h-[44px] px-3 sm:px-4 py-2
                  rounded-full text-sm font-medium whitespace-nowrap
                  transition-all duration-200 motion-reduce:transition-none
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                  ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-200'
                      : 'bg-white text-wood-600 border border-wood-200 hover:border-brand-300 hover:text-brand-600'
                  }
                `}
                aria-pressed={isActive}
                aria-label={`Filtrar por categoría: ${cat.label}`}
              >
                <span aria-hidden="true">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div
          className="mb-4 p-4 rounded-lg bg-fire-50 border border-fire-200 text-fire-700 text-sm"
          role="alert"
        >
          <p className="font-medium">Error al cargar el menú</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={() => fetchProductos(categoriaActiva)}
            className="mt-2 text-sm font-medium text-fire-600 underline hover:text-fire-800
                       min-h-[44px] inline-flex items-center"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
          aria-label="Cargando productos..."
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductoSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && productos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {productos.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && productos.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <span className="text-5xl block mb-4" aria-hidden="true">🍽️</span>
          <h3 className="text-lg font-semibold text-wood-700 mb-2">
            No hay productos disponibles
          </h3>
          <p className="text-sm text-wood-500">
            {categoriaActiva !== 'TODAS'
              ? 'No se encontraron productos en esta categoría.'
              : 'El menú estará disponible pronto.'}
          </p>
          {categoriaActiva !== 'TODAS' && (
            <button
              onClick={() => setCategoriaActiva('TODAS')}
              className="
                mt-4 min-h-[44px] px-4 py-2 rounded-lg
                text-sm font-medium text-brand-600
                bg-brand-50 hover:bg-brand-100
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
              "
            >
              Ver todas las categorías
            </button>
          )}
        </div>
      )}
    </div>
  );
}
