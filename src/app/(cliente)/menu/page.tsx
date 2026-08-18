'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useQrMesa } from '../_context/QrMesaContext';
import { useCarrito } from '../_context/CarritoContext';

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

type Modalidad = 'LOCAL' | 'RETIRO' | 'DOMICILIO' | null;

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
 * Categorías se derivan dinámicamente de los productos cargados.
 */

/**
 * Placeholder SVG component for products without images.
 * Displays a generic food icon (Req 10.5).
 */
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

/**
 * Modality selector component.
 * Context-based options:
 * - If esQr (scanned from restaurant): "Comer aquí" (LOCAL) + "Para llevar" (RETIRO)
 * - If !esQr (from social media / direct): Only "A domicilio" (DOMICILIO)
 */
function ModalidadSelector({
  onSelect,
  esQr,
}: {
  onSelect: (modalidad: Modalidad) => void;
  esQr: boolean;
}) {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 relative overflow-hidden bg-[#0a0a0f]">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-fire-500/10 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[128px] animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fire-600/5 rounded-full blur-[96px] animate-pulse" style={{animationDelay: '2s'}} />
      </div>

      {/* Floating food elements with RED and GOLD glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-[8%] left-[8%] text-5xl opacity-20 animate-bounce" style={{animationDuration: '3s'}}>🍗</span>
        <span className="absolute top-[15%] right-[12%] text-4xl opacity-15 animate-bounce" style={{animationDuration: '4s', animationDelay: '1s'}}>🍔</span>
        <span className="absolute bottom-[25%] left-[15%] text-4xl opacity-15 animate-bounce" style={{animationDuration: '3.5s', animationDelay: '0.5s'}}>🔥</span>
        <span className="absolute bottom-[12%] right-[8%] text-5xl opacity-20 animate-bounce" style={{animationDuration: '4.5s', animationDelay: '1.5s'}}>🌶️</span>
        <span className="absolute top-[40%] left-[5%] text-3xl opacity-10 animate-bounce" style={{animationDuration: '5s', animationDelay: '2s'}}>🍟</span>
        <span className="absolute top-[60%] right-[5%] text-3xl opacity-10 animate-bounce" style={{animationDuration: '4s', animationDelay: '0.8s'}}>🧀</span>
      </div>

      {/* Main Card with animated border */}
      <div className="relative w-full max-w-md animate-slide-up">
        {/* Animated gradient border */}
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-fire-500 via-brand-400 to-fire-500 opacity-60 blur-sm animate-pulse" />
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-fire-500 via-brand-400 to-fire-500 opacity-30" />

        <div className="relative bg-[#12121a] rounded-3xl p-8 sm:p-10 border border-white/10 backdrop-blur-xl shadow-2xl shadow-fire-500/5">
          {/* Logo with glow */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-xl animate-pulse" />
              <img
                src="/logo.png"
                alt="A-la Burguer"
                className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-brand-400/50 shadow-lg shadow-brand-500/30 mx-auto animate-scale-in"
              />
            </div>
            <h2 className="mt-5 text-2xl sm:text-3xl font-extrabold text-white">
              ¡Bienvenido!
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              {esQr
                ? '¿Cómo deseas disfrutar tu pedido?'
                : '¡Pide a domicilio y te lo llevamos!'}
            </p>
            {/* Decorative gold line */}
            <div className="mt-4 mx-auto w-24 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
          </div>

          <div className="space-y-4">
            {esQr ? (
              <>
                {/* QR scan flow: Comer aquí + Para llevar */}
                <button
                  onClick={() => onSelect('LOCAL')}
                  className="
                    w-full flex items-center gap-4 p-5 sm:p-6
                    rounded-2xl border border-white/10
                    bg-white/5 backdrop-blur-sm
                    hover:border-brand-400/50 hover:bg-brand-500/5
                    hover:shadow-lg hover:shadow-brand-500/10
                    transition-all duration-300 motion-reduce:transition-none
                    focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-[#12121a]
                    group active:scale-[0.98]
                  "
                  aria-label="Comer aquí"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-400/20 flex items-center justify-center group-hover:bg-brand-500/20 group-hover:border-brand-400/40 group-hover:scale-110 transition-all duration-300">
                    <span className="text-2xl" aria-hidden="true">🍽️</span>
                  </div>
                  <div className="text-left flex-1">
                    <span className="block text-base font-bold text-white group-hover:text-brand-300 transition-colors duration-200">
                      Comer aquí
                    </span>
                    <span className="block text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-200">
                      Disfruta en nuestro restaurante
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-brand-400 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => onSelect('RETIRO')}
                  className="
                    w-full flex items-center gap-4 p-5 sm:p-6
                    rounded-2xl border border-white/10
                    bg-white/5 backdrop-blur-sm
                    hover:border-fire-400/50 hover:bg-fire-500/5
                    hover:shadow-lg hover:shadow-fire-500/10
                    transition-all duration-300 motion-reduce:transition-none
                    focus:outline-none focus:ring-2 focus:ring-fire-400 focus:ring-offset-2 focus:ring-offset-[#12121a]
                    group active:scale-[0.98]
                  "
                  aria-label="Para llevar (retiro en sucursal)"
                >
                  <div className="w-12 h-12 rounded-xl bg-fire-500/10 border border-fire-400/20 flex items-center justify-center group-hover:bg-fire-500/20 group-hover:border-fire-400/40 group-hover:scale-110 transition-all duration-300">
                    <span className="text-2xl" aria-hidden="true">🛍️</span>
                  </div>
                  <div className="text-left flex-1">
                    <span className="block text-base font-bold text-white group-hover:text-fire-300 transition-colors duration-200">
                      Para llevar
                    </span>
                    <span className="block text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-200">
                      Retiro en sucursal
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-fire-400 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {/* Social media / direct flow: Only domicilio */}
                <button
                  onClick={() => onSelect('DOMICILIO')}
                  className="
                    w-full flex items-center gap-4 p-5 sm:p-6
                    rounded-2xl border border-white/10
                    bg-white/5 backdrop-blur-sm
                    hover:border-fire-400/50 hover:bg-fire-500/5
                    hover:shadow-lg hover:shadow-fire-500/10
                    transition-all duration-300 motion-reduce:transition-none
                    focus:outline-none focus:ring-2 focus:ring-fire-400 focus:ring-offset-2 focus:ring-offset-[#12121a]
                    group active:scale-[0.98]
                  "
                  aria-label="Pedir a domicilio"
                >
                  <div className="w-12 h-12 rounded-xl bg-fire-500/10 border border-fire-400/20 flex items-center justify-center group-hover:bg-fire-500/20 group-hover:border-fire-400/40 group-hover:scale-110 transition-all duration-300">
                    <span className="text-2xl" aria-hidden="true">🛵</span>
                  </div>
                  <div className="text-left flex-1">
                    <span className="block text-base font-bold text-white group-hover:text-fire-300 transition-colors duration-200">
                      Pedir a domicilio
                    </span>
                    <span className="block text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-200">
                      Te lo llevamos a tu puerta
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-fire-400 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Bottom info */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-[11px] text-gray-600">
              📞 Servicio a domicilio: <span className="text-brand-400 font-medium">722 680 2734</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual product card component.
 * Shows image (or placeholder), name, description, price, and availability.
 * Tap on image opens detail modal with full description.
 */
function ProductoCard({ producto, onDetail }: { producto: ProductoMenu; onDetail: (p: ProductoMenu) => void }) {
  const { agregarItem } = useCarrito();

  const precioFormateado = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
    >
      {/* Product Image — tap to open detail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1a1a24] cursor-pointer" onClick={() => onDetail(producto)}>
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

        {/* Availability indicator — small dot on mobile, text on desktop */}
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
          {producto.disponible ? (
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="hidden sm:inline">Disponible</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="hidden sm:inline">Agotado</span>
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-2.5 sm:p-4">
        <h3 className="text-xs sm:text-base font-bold text-white line-clamp-1">
          {producto.nombre}
        </h3>

        {producto.descripcion && (
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-500 line-clamp-2">
            {producto.descripcion}
          </p>
        )}

        <div className="mt-2 sm:mt-3 flex items-center justify-between">
          <span className="text-base sm:text-xl font-extrabold text-brand-400">
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
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-[#14141c]
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

/**
 * Loading skeleton for product cards.
 */
function ProductoSkeleton() {
  return (
    <div className="bg-[#16161f] rounded-2xl shadow-sm overflow-hidden border border-white/5 animate-pulse">
      <div className="aspect-[4/3] w-full bg-[#1a1a24] animate-shimmer" />
      <div className="p-3 sm:p-4 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4 animate-shimmer" />
        <div className="h-3 bg-white/10 rounded w-full animate-shimmer" />
        <div className="h-5 bg-brand-400/20 rounded w-1/3 mt-3 animate-shimmer" />
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
        className="w-full max-w-md bg-[#16161f] rounded-2xl shadow-xl p-6 sm:p-8 border border-white/5
                    animate-fade-in motion-reduce:animate-none text-center"
        role="alert"
        aria-live="assertive"
      >
        <span className="text-5xl sm:text-6xl mb-4 block" aria-hidden="true">
          ⚠️
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-fire-400 mb-3">
          Código QR no válido
        </h2>
        <p className="text-gray-400 text-sm sm:text-base mb-6">
          El código QR escaneado no es válido o ha expirado. Por favor solicita
          asistencia al personal del local.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <span aria-hidden="true">👋</span>
            <span>Llama a un mesero para que te ayude</span>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="
                mt-4 min-h-[44px] px-6 py-3 rounded-xl
                text-sm font-medium text-black
                gradient-brand hover:opacity-90
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]
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
      <div className="w-full max-w-md bg-[#16161f] rounded-2xl shadow-xl p-6 sm:p-8 text-center animate-pulse border border-white/5">
        <span className="text-5xl sm:text-6xl mb-4 block" aria-hidden="true">
          📱
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Validando código QR...
        </h2>
        <p className="text-gray-400 text-sm">
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
    <div className="mb-4 px-3 py-2 rounded-lg bg-green-900/30 border border-green-500/20 flex items-center gap-2">
      <span className="text-green-400 text-lg" aria-hidden="true">📍</span>
      <span className="text-sm font-medium text-green-300">
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
  const { setQrMesa, qrMesa } = useQrMesa();
  const { setModalidad: setModalidadContext, modalidad: carritoModalidad, agregarItem, confirmado, limpiarParaNuevoPedido } = useCarrito();

  const [modalidad, setModalidadLocal] = useState<Modalidad>(null);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todas');
  const [todosProductos, setTodosProductos] = useState<ProductoMenu[]>([]);
  const [productos, setProductos] = useState<ProductoMenu[]>([]);
  const [selectedProducto, setSelectedProducto] = useState<ProductoMenu | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QR state (Req 8.1, 8.4)
  const [qrEstado, setQrEstado] = useState<QrEstado>(qrCodigo ? 'validando' : 'idle');
  const [qrMesaInfo, setQrMesaInfo] = useState<QrMesaInfo | null>(null);

  // Track if user explicitly clicked "Cambiar" to prevent auto-restore
  const [userReset, setUserReset] = useState(false);

  // Reset stale confirmado so user can add items again
  useEffect(() => {
    if (confirmado) limpiarParaNuevoPedido();
  }, [confirmado, limpiarParaNuevoPedido]);

  // Restore modalidad from CarritoContext (persisted in localStorage)
  // This ensures navigating back from /pedido skips the welcome screen
  useEffect(() => {
    if (carritoModalidad && !modalidad && !userReset) {
      setModalidadLocal(carritoModalidad);
    }
  }, [carritoModalidad, modalidad, userReset]);

  // If QR mesa is already in context (from localStorage), mark as valid without re-fetching
  // This handles returning to /menu after navigating to /pedido
  useEffect(() => {
    if (qrMesa && qrEstado === 'idle' && !qrCodigo) {
      setQrEstado('valido');
      setQrMesaInfo({
        codigo: qrMesa.codigo,
        mesaZona: qrMesa.mesaZona,
        valido: true,
      });
    }
  }, [qrMesa, qrEstado, qrCodigo]);

  // Derive categories dynamically from fetched products
  const categoriasDinamicas = [
    { value: 'todas', label: 'Todas' },
    ...Array.from(new Set(todosProductos.map(p => p.categoria)))
      .sort()
      .map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }))
  ];

  // Filter products client-side by selected category
  const productosFiltrados = categoriaActiva === 'todas'
    ? todosProductos
    : todosProductos.filter(p => p.categoria === categoriaActiva);

  /**
   * Sets both local and context modalidad.
   */
  const setModalidad = useCallback((m: Modalidad) => {
    setModalidadLocal(m);
    if (m) {
      setModalidadContext(m);
      setUserReset(false);
    }
  }, [setModalidadContext]);

  const handleCambiar = useCallback(() => {
    setModalidadLocal(null);
    setUserReset(true);
  }, []);

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
        const timeout = setTimeout(() => controller.abort(), 5000);

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
          setQrMesa({
            codigo: json.data.codigo,
            mesaZona: json.data.mesaZona,
          });
          // Don't auto-set modalidad, let user choose between LOCAL and RETIRO
        } else {
          setQrEstado('invalido');
        }
      } catch (err) {
        if (cancelled) return;
        setQrEstado('invalido');
      }
    }

    validarQr();

    return () => {
      cancelled = true;
    };
  }, [qrCodigo, setQrMesa]);

  /**
   * Fetches all products from the API.
   * Categories are derived client-side from the full product list.
   */
  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/productos');

      if (!response.ok) {
        throw new Error('Error al cargar el menú');
      }

      const json = await response.json();
      const productosData: ProductoMenu[] = (json.data || []).map(
        (p: Record<string, unknown>) => ({
          id: p.id as string,
          nombre: p.nombre as string,
          descripcion: (p.descripcion as string) || '',
          categoria: p.categoria as string,
          precio: typeof p.precio === 'object' && p.precio !== null
            ? (p.precio as { valor: number }).valor
            : (p.precio as number),
          imagenUrl: (p.imagen as string) || (p.imagenUrl as string) || (p.imagen_url as string) || null,
          activo: p.activo !== false,
          disponible: p.disponible !== false && p.activo !== false,
        })
      );

      setTodosProductos(productosData);
      setProductos(productosData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error desconocido al cargar productos'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch products once when modalidad is selected
  useEffect(() => {
    if (modalidad) {
      fetchProductos();
    }
  }, [modalidad, fetchProductos]);

  // QR validating state
  if (qrEstado === 'validando') {
    return <QrValidandoMessage />;
  }

  // QR invalid state
  if (qrEstado === 'invalido') {
    return (
      <QrInvalidoMessage
        onDismiss={() => {
          setQrEstado('idle');
        }}
      />
    );
  }

  // Show modality selector first (Req 10.4)
  if (!modalidad) {
    // esQr is true only when QR was successfully validated (restaurant scan)
    // When qrEstado is 'idle' (no QR or dismissed invalid), show only domicilio
    const esQr = qrEstado === 'valido';
    return <ModalidadSelector onSelect={setModalidad} esQr={esQr} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* QR Mesa/Zona identification banner (Req 8.1) */}
      {qrMesaInfo && qrEstado === 'valido' && (
        <QrMesaBanner mesaZona={qrMesaInfo.mesaZona} />
      )}

      {/* Modality indicator with decorative accent */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Nuestro Menú
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {modalidad === 'LOCAL' && '🍽️ Comiendo en el local'}
            {modalidad === 'RETIRO' && '🛍️ Para llevar (retiro en sucursal)'}
            {modalidad === 'DOMICILIO' && '🛵 Entrega a domicilio'}
          </p>
          {/* Decorative gold gradient line */}
          <div className="mt-3 w-16 h-0.5 bg-gradient-to-r from-brand-400 to-fire-500 rounded-full" />
        </div>
        <button
          onClick={handleCambiar}
          className="
            min-w-[44px] min-h-[44px] flex items-center justify-center
            px-4 py-2 rounded-xl text-sm font-medium
            text-gray-400 bg-white/5 border border-white/10
            hover:bg-white/10 hover:border-brand-400/30 hover:text-brand-400
            transition-all duration-200 motion-reduce:transition-none
            focus:outline-none focus:ring-2 focus:ring-brand-400
          "
          aria-label="Cambiar modalidad de servicio"
        >
          Cambiar
        </button>
      </div>

      {/* Animated gradient separator */}
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
        <div
          className="mb-4 p-4 rounded-lg bg-fire-900/30 border border-fire-500/20 text-fire-300 text-sm"
          role="alert"
        >
          <p className="font-medium">Error al cargar el menú</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={() => fetchProductos()}
            className="mt-2 text-sm font-medium text-fire-400 underline hover:text-fire-300
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
      {!loading && !error && productosFiltrados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 stagger-children">
          {productosFiltrados.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} onDetail={setSelectedProducto} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && productosFiltrados.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <span className="text-5xl block mb-4" aria-hidden="true">🍽️</span>
          <h3 className="text-lg font-semibold text-white mb-2">
            No hay productos disponibles
          </h3>
          <p className="text-sm text-gray-500">
            {categoriaActiva !== 'todas'
              ? 'No se encontraron productos en esta categoría.'
              : 'El menú estará disponible pronto.'}
          </p>
          {categoriaActiva !== 'todas' && (
            <button
              onClick={() => setCategoriaActiva('todas')}
              className="
                mt-4 min-h-[44px] px-4 py-2 rounded-lg
                text-sm font-medium text-brand-400
                bg-brand-400/10 hover:bg-brand-400/20
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]
              "
            >
              Ver todas las categorías
            </button>
          )}
        </div>
      )}

      {/* Restaurant Info Bar */}
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
                <a
                  href="tel:7226802734"
                  className="text-sm font-bold text-black hover:underline"
                >
                  722 680 2734
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProducto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={() => setSelectedProducto(null)}>
          <div className="w-full sm:max-w-md bg-[#12121a] sm:rounded-2xl rounded-t-3xl border border-white/[0.06] overflow-hidden animate-scale-in shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {selectedProducto.imagenUrl && (
              <div className="relative w-full aspect-[16/10] bg-[#1a1a24]">
                <Image src={selectedProducto.imagenUrl} alt={selectedProducto.nombre} fill className="object-cover" sizes="100vw" />
                <button onClick={() => setSelectedProducto(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center text-sm">✕</button>
              </div>
            )}
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold text-white">{selectedProducto.nombre}</h2>
                <span className="text-xl font-extrabold text-brand-400 shrink-0">${selectedProducto.precio}</span>
              </div>
              {selectedProducto.descripcion && (
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{selectedProducto.descripcion}</p>
              )}
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${selectedProducto.disponible ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  <span className={`w-2 h-2 rounded-full ${selectedProducto.disponible ? 'bg-green-400' : 'bg-red-400'}`} />
                  {selectedProducto.disponible ? 'Disponible' : 'Agotado'}
                </span>
                <span className="text-xs text-gray-600 capitalize">{selectedProducto.categoria}</span>
              </div>
              {selectedProducto.disponible && (
                <button
                  onClick={() => { agregarItem({ productoId: selectedProducto.id, nombre: selectedProducto.nombre, precioUnitario: selectedProducto.precio, cantidad: 1, imagenUrl: selectedProducto.imagenUrl, opcionesDisponibles: [] }); setSelectedProducto(null); }}
                  className="w-full py-4 rounded-2xl font-black text-sm text-black bg-gradient-to-r from-brand-400 via-brand-500 to-fire-500 shadow-[0_0_20px_rgba(245,166,35,0.3)] active:scale-[0.97] transition-all"
                >
                  Agregar al pedido — ${selectedProducto.precio}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
