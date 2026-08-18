'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  useCarrito,
  ItemCarrito,
  PersonalizacionSeleccionada,
  OpcionPersonalizacionProducto,
} from '../_context/CarritoContext';
import { useQrMesa } from '../_context/QrMesaContext';

/**
 * Formats a number as Mexican Peso currency.
 */
function formatPrecio(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Calculates line total for a cart item including personalization extras.
 */
function calcularLineaTotal(item: ItemCarrito): number {
  const extras = item.personalizaciones.reduce((acc, p) => acc + p.precioExtra, 0);
  return (item.precioUnitario + extras) * item.cantidad;
}

/**
 * Personalization selector for a single product in the cart.
 * Shows options configured by admin (picante, extras, sides) with extra prices.
 * Req 11.1, 11.4
 */
function PersonalizacionSelector({
  opciones,
  seleccionadas,
  onChange,
  disabled,
}: {
  opciones: OpcionPersonalizacionProducto[];
  seleccionadas: PersonalizacionSeleccionada[];
  onChange: (personalizaciones: PersonalizacionSeleccionada[]) => void;
  disabled: boolean;
}) {
  if (opciones.length === 0) return null;

  const handleToggle = (grupoNombre: string, opcionNombre: string, precioExtra: number) => {
    if (disabled) return;
    const existing = seleccionadas.find(
      (p) => p.nombre === grupoNombre && p.opcion === opcionNombre
    );
    if (existing) {
      onChange(seleccionadas.filter((p) => !(p.nombre === grupoNombre && p.opcion === opcionNombre)));
    } else {
      // For single-select groups like "picante", replace existing selection in that group
      const isLevel = grupoNombre.toLowerCase().includes('picante');
      let updated: PersonalizacionSeleccionada[];
      if (isLevel) {
        updated = [
          ...seleccionadas.filter((p) => p.nombre !== grupoNombre),
          { nombre: grupoNombre, opcion: opcionNombre, precioExtra },
        ];
      } else {
        updated = [...seleccionadas, { nombre: grupoNombre, opcion: opcionNombre, precioExtra }];
      }
      onChange(updated);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {opciones.map((grupo) => (
        <div key={grupo.nombre}>
          <p className="text-xs font-semibold text-gray-400 mb-1.5">{grupo.nombre}</p>
          <div className="flex flex-wrap gap-2">
            {grupo.opciones.map((opcion) => {
              const isSelected = seleccionadas.some(
                (p) => p.nombre === grupo.nombre && p.opcion === opcion.nombre
              );
              const extra = opcion.precioExtra ?? 0;
              return (
                <button
                  key={opcion.nombre}
                  type="button"
                  onClick={() => handleToggle(grupo.nombre, opcion.nombre, extra)}
                  disabled={disabled}
                  className={`
                    min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-medium
                    border transition-all duration-150 motion-reduce:transition-none
                    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1
                    ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                    ${
                      isSelected
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:border-brand-300'
                    }
                  `}
                  aria-pressed={isSelected}
                  aria-label={`${opcion.nombre}${extra > 0 ? ` +${formatPrecio(extra)}` : ''}`}
                >
                  <span>{opcion.nombre}</span>
                  {extra > 0 && (
                    <span className={`ml-1 text-[10px] ${isSelected ? 'text-brand-100' : 'text-brand-400'}`}>
                      +{formatPrecio(extra)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Comment input with character counter for a product.
 * Max 250 characters (Req 11.2).
 */
function ComentarioInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const maxChars = 250;
  const remaining = maxChars - value.length;

  return (
    <div className="mt-3">
      <label className="block text-xs font-semibold text-gray-400 mb-1">
        Instrucciones para cocina
      </label>
      <p className="text-[10px] text-gray-500 mb-1.5">Indica sabor, combinación, o cómo lo quieres</p>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
          disabled={disabled}
          maxLength={maxChars}
          rows={2}
          placeholder="Ej: BBQ y Mango Habanero combinadas, sin cebolla, bien doraditas..."
          className={`
            w-full px-3 py-2 text-sm rounded-lg border border-white/10
            bg-white/5 text-white placeholder:text-gray-600
            focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400/50
            resize-none transition-colors duration-150
            ${disabled ? 'opacity-60 cursor-not-allowed bg-white/5' : ''}
          `}
          aria-label="Instrucciones para cocina"
        />
        <span
          className={`absolute bottom-2 right-2 text-[10px] ${
            remaining < 30 ? 'text-fire-500' : 'text-gray-500'
          }`}
          aria-live="polite"
        >
          {remaining}/{maxChars}
        </span>
      </div>
    </div>
  );
}

/**
 * Quantity controls for a cart item.
 */
function ControlCantidad({
  cantidad,
  onChange,
  onDelete,
  disabled,
}: {
  cantidad: number;
  onChange: (val: number) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => (cantidad <= 1 ? onDelete() : onChange(cantidad - 1))}
        disabled={disabled}
        className={`
          min-w-[44px] min-h-[44px] flex items-center justify-center
          rounded-full border border-white/10 text-gray-400
          hover:bg-fire-500/10 hover:border-fire-500/20 hover:text-fire-400
          transition-colors duration-150 motion-reduce:transition-none
          focus:outline-none focus:ring-2 focus:ring-brand-500
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
        aria-label={cantidad <= 1 ? 'Eliminar producto' : 'Reducir cantidad'}
      >
        {cantidad <= 1 ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ) : (
          <span className="text-lg font-bold">−</span>
        )}
      </button>
      <span className="min-w-[28px] text-center text-sm font-semibold text-white" aria-label={`Cantidad: ${cantidad}`}>
        {cantidad}
      </span>
      <button
        type="button"
        onClick={() => onChange(cantidad + 1)}
        disabled={disabled}
        className={`
          min-w-[44px] min-h-[44px] flex items-center justify-center
          rounded-full border border-brand-400/30 text-brand-400
          hover:bg-brand-500/10 hover:border-brand-400/40
          transition-colors duration-150 motion-reduce:transition-none
          focus:outline-none focus:ring-2 focus:ring-brand-500
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
        aria-label="Aumentar cantidad"
      >
        <span className="text-lg font-bold">+</span>
      </button>
    </div>
  );
}

/**
 * Individual cart item card with personalizations, comments, and quantity controls.
 */
function ItemCarritoCard({
  item,
  confirmado,
  onCantidadChange,
  onDelete,
  onPersonalizacionesChange,
  onComentarioChange,
}: {
  item: ItemCarrito;
  confirmado: boolean;
  onCantidadChange: (cantidad: number) => void;
  onDelete: () => void;
  onPersonalizacionesChange: (p: PersonalizacionSeleccionada[]) => void;
  onComentarioChange: (c: string) => void;
}) {
  const lineTotal = calcularLineaTotal(item);
  const hasOpciones = item.opcionesDisponibles.length > 0;

  return (
    <article className="bg-[#12121a] rounded-2xl border border-white/[0.06] overflow-hidden hover:border-brand-400/30 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(var(--brand-rgb,245,158,11),0.08)]">
      {/* Header row: product image + info + line total */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Product image */}
          {item.imagenUrl ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-white/5">
              <img src={item.imagenUrl} alt={item.nombre} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shrink-0 bg-[#1a1a24] border border-white/5 flex items-center justify-center">
              <span className="text-2xl opacity-30">🍔</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white/95 tracking-tight truncate">
                {item.nombre}
              </h3>
              <p className="text-sm sm:text-base font-black text-brand-400 drop-shadow-[0_0_6px_rgba(var(--brand-rgb,245,158,11),0.3)] shrink-0">
                {formatPrecio(lineTotal)}
              </p>
            </div>
            <p className="text-xs text-gray-400/80 mt-0.5">
              {formatPrecio(item.precioUnitario)} c/u
              {item.personalizaciones.length > 0 && (
                <span className="text-brand-400/90 ml-1.5 font-medium">
                  (+{formatPrecio(item.personalizaciones.reduce((a, p) => a + p.precioExtra, 0))} extras)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quantity controls */}
        <div className="mt-3 flex items-center justify-between">
          <ControlCantidad
            cantidad={item.cantidad}
            onChange={onCantidadChange}
            onDelete={onDelete}
            disabled={confirmado}
          />
        </div>

        {/* Personalization options (if configured in admin) */}
        {hasOpciones && (
          <div className="mt-3">
            <PersonalizacionSelector
              opciones={item.opcionesDisponibles}
              seleccionadas={item.personalizaciones}
              onChange={onPersonalizacionesChange}
              disabled={confirmado}
            />
          </div>
        )}

        {/* Selected personalizations badges */}
        {item.personalizaciones.length > 0 && !hasOpciones && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.personalizaciones.map((p, idx) => (
              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-brand-500/10 text-brand-400">{p.opcion}</span>
            ))}
          </div>
        )}

        {/* Always visible: instructions for kitchen */}
        {!confirmado && (
          <div className="mt-3">
            <div className="relative">
              <textarea
                value={item.comentario}
                onChange={(e) => onComentarioChange(e.target.value.slice(0, 250))}
                disabled={confirmado}
                maxLength={250}
                rows={1}
                placeholder="¿Cómo lo quieres? Ej: sabor BBQ, sin cebolla, bien frías..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-white/[0.06] bg-white/[0.02] text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40 focus:border-brand-400/30 resize-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Show comment when confirmed */}
        {confirmado && item.comentario && (
          <p className="mt-2 text-[11px] text-cyan-400 italic">
            💬 &quot;{item.comentario}&quot;
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * Empty cart state component.
 */
function CarritoVacio({ menuHref }: { menuHref: string }) {
  return (
    <div className="text-center py-16 px-4">
      <span className="text-6xl block mb-4" aria-hidden="true">🛒</span>
      <h2 className="text-xl font-bold text-white mb-2">
        Tu carrito está vacío
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        Agrega productos desde el menú para armar tu pedido.
      </p>
      <Link
        href={menuHref}
        className="
          inline-flex items-center min-h-[44px] px-6 py-3 rounded-xl
          bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm
          transition-colors duration-150 motion-reduce:transition-none
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
        "
      >
        Ver Menú
      </Link>
    </div>
  );
}

/**
 * Single order status tracker that polls the API.
 */
function SingleOrderTracker({ pedidoId, modalidad, numero }: { pedidoId: string; modalidad: string | null; numero?: string }) {
  const [estado, setEstado] = useState<string>('recibido');
  const [polling, setPolling] = useState(true);

  const pasos = modalidad === 'DOMICILIO'
    ? [
        { key: 'recibido', label: 'Recibido', icon: '📋', desc: 'Pedido recibido por el restaurante' },
        { key: 'en_preparacion', label: 'Preparando', icon: '👨‍🍳', desc: 'Tu comida se está preparando' },
        { key: 'empacado', label: 'Empaquetado', icon: '📦', desc: 'Listo para enviar' },
        { key: 'en_camino', label: 'En camino', icon: '🛵', desc: 'El repartidor va hacia ti' },
        { key: 'entregado', label: 'Entregado', icon: '✅', desc: 'Buen provecho' },
      ]
    : [
        { key: 'recibido', label: 'Recibido', icon: '📋', desc: 'Pedido recibido por cocina' },
        { key: 'en_preparacion', label: 'Preparando', icon: '👨‍🍳', desc: 'Cocinando tu pedido' },
        { key: 'empacado', label: 'Casi listo', icon: '📦', desc: 'Terminando de preparar' },
        { key: 'en_camino_mesa', label: 'En camino', icon: '🍽️', desc: 'El mesero lleva tu pedido' },
        { key: 'listo', label: 'Entregado', icon: '✅', desc: 'Buen provecho' },
      ];

  const mapEstado = (apiEstado: string): string => {
    if (apiEstado === 'servido' || apiEstado === 'listo') return 'listo';
    if (apiEstado === 'listo_para_servir') return 'en_camino_mesa';
    if (apiEstado === 'empacado' || apiEstado === 'empaquetado') return 'empacado';
    if (apiEstado === 'en_camino') return 'en_camino';
    if (apiEstado === 'entregado') return 'entregado';
    if (apiEstado === 'en_preparacion') return 'en_preparacion';
    return 'recibido';
  };

  useEffect(() => {
    if (!pedidoId || !polling) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/pedidos/${pedidoId}/estado`);
        if (res.ok) {
          const json = await res.json();
          const pedidoData = json?.data || json;
          const nuevoEstado = mapEstado(pedidoData?.estado || 'recibido');
          setEstado(nuevoEstado);

          if (nuevoEstado === 'entregado' || nuevoEstado === 'listo') {
            setPolling(false);
          }
        }
      } catch {
        // Silently retry on next interval
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId, polling]);

  const currentIdx = pasos.findIndex(p => p.key === estado);
  const currentPaso = pasos[currentIdx >= 0 ? currentIdx : 0];

  return (
    <div className="rounded-xl bg-[#0d0d14] border border-white/5 p-4">
      {/* Order number + status */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-white">
          {numero ? `#${numero}` : 'Pedido'}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          estado === 'listo' || estado === 'entregado'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : estado === 'en_preparacion'
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : estado === 'empacado' || estado === 'en_camino_mesa'
            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
        }`}>
          {currentPaso.icon} {currentPaso.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-[11px] text-gray-400 mb-3">{currentPaso.desc}</p>

      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {pasos.map((paso, idx) => (
          <div
            key={paso.key}
            className={`flex-1 h-2 rounded-full transition-all duration-500 ${
              idx <= currentIdx ? 'bg-brand-400' : 'bg-white/5'
            }`}
          />
        ))}
      </div>

      {/* Polling indicator */}
      {polling && (
        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-gray-500">
          <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
          Actualizando
        </div>
      )}
      {!polling && (
        <p className="mt-2 text-[10px] text-green-400 font-medium">
          {currentPaso.icon} {currentPaso.desc}
        </p>
      )}
    </div>
  );
}

/**
 * Individual order card within MesaOrdersTracker.
 * Receives estado from parent (no separate polling needed).
 */
function MesaOrderCard({ numero, estado, modalidad }: { numero: string; estado: string; modalidad: string | null }) {
  const pasos = modalidad === 'DOMICILIO'
    ? [
        { key: 'recibido', label: 'Recibido', icon: '📋', desc: 'Pedido recibido' },
        { key: 'en_preparacion', label: 'Preparando', icon: '👨‍🍳', desc: 'Cocinando' },
        { key: 'empacado', label: 'Empaquetado', icon: '📦', desc: 'Listo para enviar' },
        { key: 'en_camino', label: 'En camino', icon: '🛵', desc: 'En camino' },
        { key: 'entregado', label: 'Entregado', icon: '✅', desc: 'Entregado' },
      ]
    : [
        { key: 'recibido', label: 'Recibido', icon: '📋', desc: 'Pedido recibido por cocina' },
        { key: 'en_preparacion', label: 'Preparando', icon: '👨‍🍳', desc: 'Cocinando tu pedido' },
        { key: 'empacado', label: 'Casi listo', icon: '📦', desc: 'Terminando de preparar' },
        { key: 'listo_para_servir', label: 'En camino', icon: '🍽️', desc: 'El mesero lleva tu pedido' },
        { key: 'servido', label: 'Entregado', icon: '✅', desc: 'Buen provecho' },
      ];

  const mapEstado = (apiEstado: string): string => {
    if (apiEstado === 'servido') return 'servido';
    if (apiEstado === 'listo_para_servir' || apiEstado === 'listo') return 'listo_para_servir';
    if (apiEstado === 'empacado' || apiEstado === 'empaquetado') return 'empacado';
    if (apiEstado === 'en_camino') return 'en_camino';
    if (apiEstado === 'entregado') return 'entregado';
    if (apiEstado === 'en_preparacion') return 'en_preparacion';
    return 'recibido';
  };

  const mappedEstado = mapEstado(estado);
  const currentIdx = pasos.findIndex(p => p.key === mappedEstado);
  const currentPaso = pasos[currentIdx >= 0 ? currentIdx : 0];

  return (
    <div className="rounded-xl bg-[#0d0d14] border border-white/5 p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-white">#{numero}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          mappedEstado === 'servido' || mappedEstado === 'entregado'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : mappedEstado === 'en_preparacion'
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : mappedEstado === 'empacado' || mappedEstado === 'listo_para_servir'
            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
        }`}>
          {currentPaso.icon} {currentPaso.label}
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">{currentPaso.desc}</p>
      <div className="flex items-center gap-1">
        {pasos.map((paso, idx) => (
          <div
            key={paso.key}
            className={`flex-1 h-2 rounded-full transition-all duration-500 ${
              idx <= currentIdx ? 'bg-brand-400' : 'bg-white/5'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Multi-order tracker for mesa sessions.
 * Shows ALL active orders for the current mesa, with individual progress.
 */
function MesaOrdersTracker({ pedidoIds, modalidad, mesaZona }: {
  pedidoIds: string[];
  modalidad: string | null;
  mesaZona: string | null;
}) {
  const [pedidosMesa, setPedidosMesa] = useState<Array<{
    id: string;
    numero: string;
    estado: string;
    total: number;
    items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        // If we have mesaZona, fetch ALL orders for this mesa
        if (mesaZona) {
          const res = await fetch(`/api/pedidos/mesa?mesaZona=${encodeURIComponent(mesaZona)}`);
          if (res.ok) {
            const json = await res.json();
            const activos = (json.data || []).filter((p: { estadoPago?: string }) => p.estadoPago !== 'pagado');
            setPedidosMesa(activos);
          }
        } else {
          // Fallback: fetch each pedido individually
          const results = await Promise.all(
            pedidoIds.map(async (id) => {
              const res = await fetch(`/api/pedidos/${id}`);
              if (res.ok) {
                const json = await res.json();
                return json?.data || json;
              }
              return null;
            })
          );
          setPedidosMesa(results.filter(Boolean));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
    const interval = setInterval(fetchPedidos, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaZona, pedidoIds.length]);

  if (loading) {
    return (
      <div className="mt-4 rounded-xl bg-[#16161f] border border-white/5 p-5 text-center">
        <div className="animate-spin h-5 w-5 border-2 border-brand-400 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (pedidosMesa.length === 0) return null;

  const totalMesa = pedidosMesa.reduce((sum, p) => sum + (p.total || 0), 0);
  const todosListos = pedidosMesa.every(p =>
    ['listo', 'servido', 'entregado'].includes(p.estado)
  );

  return (
    <div className="mt-4 rounded-xl bg-[#16161f] border border-white/5 p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          📋 Tus Pedidos
          <span className="px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-[10px] font-bold">
            {pedidosMesa.length}
          </span>
        </h3>
        <span className="text-sm font-bold text-brand-400">
          Total: {formatPrecio(totalMesa)}
        </span>
      </div>

      {/* Individual order trackers — use data from MesaOrdersTracker fetch, no separate polling */}
      <div className="space-y-2">
        {pedidosMesa.map((pedido) => (
          <MesaOrderCard
            key={pedido.id}
            numero={pedido.numero}
            estado={pedido.estado}
            modalidad={modalidad}
          />
        ))}
      </div>

      {/* Summary */}
      {todosListos && (
        <div className="mt-3 space-y-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <p className="text-xs text-green-400 font-medium">
              🎉 ¡Todos tus pedidos están listos!
            </p>
          </div>
          <a
            href="/pagar"
            className="block w-full py-4 rounded-2xl font-bold text-base text-center text-black bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 shadow-xl shadow-brand-500/20 hover:shadow-2xl transition-all active:scale-[0.97]"
          >
            💳 Pagar — {formatPrecio(totalMesa)}
          </a>
        </div>
      )}

      {!todosListos && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-gray-500">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Actualizando en tiempo real
        </div>
      )}
    </div>
  );
}

/**
 * Legacy single-order tracker for backward compatibility (non-mesa orders).
 */
function PedidoStatusTracker({ pedidoId, modalidad }: { pedidoId: string | null; modalidad: string | null }) {
  const [estado, setEstado] = useState<string>('recibido');
  const [polling, setPolling] = useState(true);

  const pasos = modalidad === 'DOMICILIO'
    ? [
        { key: 'recibido', label: 'Recibido', icon: '📋', desc: 'Tu pedido fue recibido' },
        { key: 'en_preparacion', label: 'Preparando', icon: '👨‍🍳', desc: 'Estamos preparando tu pedido' },
        { key: 'empacado', label: 'Empaquetado', icon: '📦', desc: 'Tu pedido está listo para salir' },
        { key: 'en_camino', label: 'En camino', icon: '🛵', desc: 'Tu pedido va en camino' },
        { key: 'entregado', label: 'Entregado', icon: '✅', desc: '¡Buen provecho!' },
      ]
    : [
        { key: 'recibido', label: 'Recibido', icon: '📋', desc: 'Tu pedido fue recibido' },
        { key: 'en_preparacion', label: 'Preparando', icon: '👨‍🍳', desc: 'Estamos preparando tu pedido' },
        { key: 'empacado', label: 'Empaquetado', icon: '📦', desc: 'Casi listo...' },
        { key: 'en_camino_mesa', label: 'En camino', icon: '🍽️', desc: 'Tu mesero va en camino a tu mesa' },
        { key: 'listo', label: 'Listo', icon: '✅', desc: modalidad === 'RETIRO' ? '¡Pasa a recoger!' : '¡Buen provecho!' },
      ];

  const mapEstado = (apiEstado: string): string => {
    if (apiEstado === 'servido' || apiEstado === 'listo') return 'listo';
    if (apiEstado === 'listo_para_servir') return 'en_camino_mesa';
    if (apiEstado === 'empacado' || apiEstado === 'empaquetado') return 'empacado';
    if (apiEstado === 'en_camino') return 'en_camino';
    if (apiEstado === 'entregado') return 'entregado';
    if (apiEstado === 'en_preparacion') return 'en_preparacion';
    return 'recibido';
  };

  useEffect(() => {
    if (!pedidoId || !polling) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/pedidos/${pedidoId}/estado`);
        if (res.ok) {
          const json = await res.json();
          const pedidoData = json?.data || json;
          const nuevoEstado = mapEstado(pedidoData?.estado || 'recibido');
          setEstado(nuevoEstado);

          if (nuevoEstado === 'entregado' || nuevoEstado === 'listo') {
            setPolling(false);
          }
        }
      } catch {
        // Silently retry on next interval
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId, polling]);

  const currentIdx = pasos.findIndex(p => p.key === estado);
  const currentPaso = pasos[currentIdx >= 0 ? currentIdx : 0];

  return (
    <div className="mt-4 rounded-xl bg-[#16161f] border border-white/5 p-5 animate-fade-in">
      {/* Current status message */}
      <div className="text-center mb-6">
        <span className="text-4xl block mb-2" aria-hidden="true">{currentPaso.icon}</span>
        <h3 className="text-base font-bold text-white">{currentPaso.label}</h3>
        <p className="text-xs text-gray-400 mt-1">{currentPaso.desc}</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-between relative px-2">
        {/* Background line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/5" />
        {/* Progress line */}
        <div
          className="absolute top-4 left-4 h-0.5 bg-brand-400 transition-all duration-1000"
          style={{ width: `${Math.max(0, (currentIdx / (pasos.length - 1)) * 100)}%`, maxWidth: 'calc(100% - 32px)' }}
        />

        {pasos.map((paso, idx) => {
          const isCompleted = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={paso.key} className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
                isCurrent ? 'bg-brand-500 text-black ring-4 ring-brand-500/20 scale-110' :
                isCompleted ? 'bg-brand-500/80 text-black' :
                'bg-[#0d0d14] border border-white/10 text-gray-600'
              }`}>
                {isCompleted ? (idx === currentIdx ? paso.icon : '✓') : (idx + 1)}
              </div>
              <span className={`text-[9px] mt-1.5 font-medium ${isCurrent ? 'text-brand-400' : isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                {paso.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Polling indicator */}
      {polling && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-500">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Actualizando en tiempo real
        </div>
      )}

      {/* Final state message */}
      {!polling && (
        <div className="mt-4 text-center">
          <p className="text-xs text-green-400 font-medium">
            {modalidad === 'DOMICILIO' ? '¡Tu pedido ha sido entregado! Buen provecho 🎉' :
             modalidad === 'RETIRO' ? '¡Tu pedido está listo! Pasa a recogerlo 🎉' :
             '¡Tu pedido está listo! Llegará a tu mesa en un momento 🎉'}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Order summary section showing subtotal, IVA (16%), and total.
 */
function ResumenPedido({
  subtotal,
  impuestos,
  total,
}: {
  subtotal: number;
  impuestos: number;
  total: number;
}) {
  return (
    <div className="bg-[#12121a] rounded-2xl border border-white/[0.06] p-5 mt-4 shadow-[0_0_20px_rgba(0,0,0,0.4)]">
      <h3 className="text-sm font-bold text-white/90 mb-3 tracking-tight">Resumen</h3>
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between text-gray-400/80">
          <span>Subtotal</span>
          <span className="font-medium">{formatPrecio(subtotal)}</span>
        </div>
        {impuestos > 0 && (
          <div className="flex justify-between text-gray-400/80">
            <span>IVA (16%)</span>
            <span className="font-medium">{formatPrecio(impuestos)}</span>
          </div>
        )}
        <div className="border-t border-white/[0.06] pt-3 flex justify-between font-black text-white text-base">
          <span>Total</span>
          <span className="text-brand-400 drop-shadow-[0_0_8px_rgba(var(--brand-rgb,245,158,11),0.3)]">{formatPrecio(total)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Pedido (cart) page for the client module.
 *
 * Shows all selected products with quantities, personalizations, comments,
 * and order summary. Allows edits while not confirmed. Once confirmed,
 * all edits are locked and a confirmation state is shown.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */
export default function PedidoPage() {
  const {
    items,
    modalidad,
    confirmado,
    eliminarItem,
    modificarCantidad,
    actualizarPersonalizaciones,
    actualizarComentario,
    confirmarPedido,
    limpiarCarrito,
    limpiarParaNuevoPedido,
    subtotal,
    impuestos,
    total,
  } = useCarrito();

  const { qrMesa } = useQrMesa();

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  // Multi-order support: store array of pedido IDs for the mesa session
  const [pedidoIds, setPedidoIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('alaburguer-pedido-ids');
        if (stored) return JSON.parse(stored);
        // Backward compat: migrate single pedidoId
        const single = localStorage.getItem('alaburguer-pedido-id');
        if (single) return [single];
      } catch { /* ignore */ }
    }
    return [];
  });

  // Legacy single pedidoId for backward compat (last confirmed order)
  const pedidoId = pedidoIds.length > 0 ? pedidoIds[pedidoIds.length - 1] : null;

  // Persist pedidoIds to localStorage
  useEffect(() => {
    if (pedidoIds.length > 0) {
      localStorage.setItem('alaburguer-pedido-ids', JSON.stringify(pedidoIds));
      // Also keep the legacy key for backward compat
      localStorage.setItem('alaburguer-pedido-id', pedidoIds[pedidoIds.length - 1]);
    }
  }, [pedidoIds]);

  /**
   * Handles order confirmation by calling POST /api/pedidos.
   */
  const handleConfirmar = async () => {
    if (items.length === 0) return;
    setEnviando(true);
    setError(null);

    if (!nombre.trim()) {
      setError('Ingresa tu nombre');
      setEnviando(false);
      return;
    }
    if (!telefono.trim() || telefono.replace(/\D/g, '').length < 10) {
      setError('Ingresa un teléfono válido (10 dígitos)');
      setEnviando(false);
      return;
    }
    if (modalidad === 'DOMICILIO' && !direccion.trim()) {
      setError('Ingresa tu dirección para entrega a domicilio');
      setEnviando(false);
      return;
    }

    try {
      // Determine canal based on context
      const canal = modalidad === 'DOMICILIO' ? 'QR_REDES' : modalidad === 'RETIRO' ? 'PARA_LLEVAR' : 'QR';

      const payload = {
        nombre,
        telefono,
        modalidad: (modalidad || 'LOCAL').toLowerCase(),
        canal,
        mesaZona: modalidad === 'DOMICILIO' ? undefined : (qrMesa?.mesaZona || undefined),
        direccion: modalidad === 'DOMICILIO' ? direccion : undefined,
        items: items.map((item) => ({
          productoId: item.productoId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          personalizaciones: item.personalizaciones.map((p) => ({
            nombre: p.nombre,
            opcion: p.opcion,
            precioExtra: p.precioExtra,
          })),
          comentario: item.comentario || null,
        })),
      };

      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || 'Error al confirmar el pedido'
        );
      }

      const responseData = await response.json();
      const newPedidoId = responseData?.data?.id || null;
      if (newPedidoId) {
        setPedidoIds(prev => [...prev, newPedidoId]);
      }
      confirmarPedido();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setEnviando(false);
    }
  };

  // Check if session is complete (all paid) — clear everything
  useEffect(() => {
    if (!confirmado || !qrMesa) return;
    const checkPaid = async () => {
      try {
        const res = await fetch(`/api/pedidos/mesa?mesaZona=${encodeURIComponent(qrMesa.mesaZona)}`);
        if (res.ok) {
          const json = await res.json();
          const activos = (json.data || []).filter((p: { estadoPago?: string }) => p.estadoPago !== 'pagado');
          if (activos.length === 0 && json.data.length > 0) {
            // All paid — clean session
            limpiarCarrito();
            localStorage.removeItem('alaburguer-pedido-ids');
            localStorage.removeItem('alaburguer-pedido-id');
          }
        }
      } catch { /* */ }
    };
    const interval = setInterval(checkPaid, 10000);
    checkPaid();
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmado, qrMesa]);

  // Check if there are active orders on this mesa (regardless of cart state)
  const [hayPedidosActivos, setHayPedidosActivos] = useState(false);

  useEffect(() => {
    if (!qrMesa) return;
    const check = async () => {
      try {
        const res = await fetch(`/api/pedidos/mesa?mesaZona=${encodeURIComponent(qrMesa.mesaZona)}`);
        if (res.ok) {
          const json = await res.json();
          const activos = (json.data || []).filter((p: { estadoPago?: string }) => p.estadoPago !== 'pagado');
          setHayPedidosActivos(activos.length > 0);
        }
      } catch { /* */ }
    };
    check();
    const interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, [qrMesa]);

  // Empty cart — only show if NO active orders on mesa
  if (items.length === 0 && !confirmado && !hayPedidosActivos) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <CarritoVacio menuHref={qrMesa ? `/menu?qr=${qrMesa.codigo}` : '/menu'} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 animate-fade-in motion-reduce:animate-none">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {modalidad === 'DOMICILIO' ? 'Mi Pedido' : qrMesa ? `${qrMesa.mesaZona}` : 'Mi Pedido'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
            {modalidad && (
              <span className="ml-2">
                {modalidad === 'LOCAL' && '🍽️ Local'}
                {modalidad === 'RETIRO' && '🛍️ Para llevar'}
                {modalidad === 'DOMICILIO' && '🛵 Domicilio'}
              </span>
            )}
          </p>
        </div>
        {!confirmado && items.length > 0 && (
          <button
            type="button"
            onClick={limpiarCarrito}
            className="
              min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium
              text-fire-400 bg-fire-500/10 hover:bg-fire-500/20 border border-fire-500/20
              transition-colors duration-150 motion-reduce:transition-none
              focus:outline-none focus:ring-2 focus:ring-fire-500
            "
          >
            Vaciar
          </button>
        )}
      </div>

      {/* Real-time status tracker — show when there are active orders on mesa */}
      {(confirmado || hayPedidosActivos) && qrMesa && (
        <MesaOrdersTracker
          pedidoIds={pedidoIds}
          modalidad={modalidad}
          mesaZona={qrMesa.mesaZona}
        />
      )}
      {confirmado && !qrMesa && (
        <PedidoStatusTracker pedidoId={pedidoId} modalidad={modalidad} />
      )}

      {/* Cart items list */}
      <div className="space-y-3 mt-4">
        {items.map((item) => (
          <ItemCarritoCard
            key={item.id}
            item={item}
            confirmado={confirmado}
            onCantidadChange={(cantidad) => modificarCantidad(item.id, cantidad)}
            onDelete={() => eliminarItem(item.id)}
            onPersonalizacionesChange={(p) => actualizarPersonalizaciones(item.id, p)}
            onComentarioChange={(c) => actualizarComentario(item.id, c)}
          />
        ))}
      </div>

      {/* Order Summary */}
      <ResumenPedido subtotal={subtotal} impuestos={impuestos} total={total} />

      {/* Client Data Form */}
      {!confirmado && (
        <div className="bg-[#12121a] rounded-2xl border border-white/[0.06] p-5 mt-4 shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          <h3 className="text-sm font-bold text-white/90 mb-4 tracking-tight">Tus Datos</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="nombre" className="block text-xs font-semibold text-gray-400/80 mb-1.5">
                Nombre *
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
                className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/30 transition-all duration-200"
              />
            </div>
            <div>
              <label htmlFor="telefono" className="block text-xs font-semibold text-gray-400/80 mb-1.5">
                {modalidad === 'DOMICILIO'
                  ? 'Teléfono (para contactarte) *'
                  : 'Teléfono (para enviarte tu ticket) *'}
              </label>
              <input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                placeholder="5512345678"
                required
                maxLength={10}
                className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/30 transition-all duration-200"
              />
            </div>
            {modalidad === 'DOMICILIO' && (
              <div>
                <label htmlFor="direccion" className="block text-xs font-semibold text-gray-400/80 mb-1.5">
                  Dirección de entrega *
                </label>
                <input
                  id="direccion"
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número, colonia, referencias"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/30 transition-all duration-200"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="mt-4 p-3 rounded-lg bg-fire-500/10 border border-fire-500/20 text-fire-400 text-sm"
          role="alert"
        >
          <p className="font-medium">Error</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Confirm button */}
      {!confirmado && (
        <div className="mt-6 mb-4">
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={enviando || items.length === 0}
            className={`
              w-full min-h-[52px] py-4 rounded-2xl font-black text-base tracking-tight
              shadow-xl transition-all duration-300 motion-reduce:transition-none
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]
              ${
                enviando || items.length === 0
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 text-black hover:shadow-[0_0_30px_rgba(var(--brand-rgb,245,158,11),0.3)] active:scale-[0.97] motion-reduce:active:scale-100'
              }
            `}
            aria-label="Confirmar pedido"
          >
            {enviando ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Confirmando...
              </span>
            ) : (
              `Confirmar Pedido — ${formatPrecio(total)}`
            )}
          </button>
        </div>
      )}

      {/* New order button after confirmation */}
      {confirmado && (
        <div className="mt-6 mb-4">
          <Link
            href={qrMesa ? `/menu?qr=${qrMesa.codigo}` : '/menu'}
            onClick={() => { limpiarParaNuevoPedido(); }}
            className="
              block w-full min-h-[44px] py-3 rounded-xl font-medium text-sm text-center
              text-brand-400 bg-brand-50/10 border border-brand-400/20
              hover:bg-brand-400/10 transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
            "
          >
            {modalidad === 'DOMICILIO' ? '➕ Agregar más productos' : qrMesa ? '➕ Pedir algo más a esta mesa' : 'Hacer nuevo pedido'}
          </Link>
        </div>
      )}
    </div>
  );
}
