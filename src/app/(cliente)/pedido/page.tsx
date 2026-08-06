'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useCarrito,
  ItemCarrito,
  PersonalizacionSeleccionada,
  OpcionPersonalizacionProducto,
} from '../_context/CarritoContext';

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
          <p className="text-xs font-semibold text-wood-700 mb-1.5">{grupo.nombre}</p>
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
                        : 'bg-white text-wood-700 border-wood-200 hover:border-brand-300'
                    }
                  `}
                  aria-pressed={isSelected}
                  aria-label={`${opcion.nombre}${extra > 0 ? ` +${formatPrecio(extra)}` : ''}`}
                >
                  <span>{opcion.nombre}</span>
                  {extra > 0 && (
                    <span className={`ml-1 text-[10px] ${isSelected ? 'text-brand-100' : 'text-brand-500'}`}>
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
      <label className="block text-xs font-semibold text-wood-700 mb-1">
        Comentarios especiales
      </label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
          disabled={disabled}
          maxLength={maxChars}
          rows={2}
          placeholder="Ej: Sin cebolla, bien cocido..."
          className={`
            w-full px-3 py-2 text-sm rounded-lg border border-wood-200
            bg-white text-wood-800 placeholder-wood-400
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
            resize-none transition-colors duration-150
            ${disabled ? 'opacity-60 cursor-not-allowed bg-wood-50' : ''}
          `}
          aria-label="Comentarios especiales para este producto"
        />
        <span
          className={`absolute bottom-2 right-2 text-[10px] ${
            remaining < 30 ? 'text-fire-500' : 'text-wood-400'
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
          rounded-full border border-wood-200 text-wood-600
          hover:bg-fire-50 hover:border-fire-300 hover:text-fire-600
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
      <span className="min-w-[28px] text-center text-sm font-semibold text-wood-800" aria-label={`Cantidad: ${cantidad}`}>
        {cantidad}
      </span>
      <button
        type="button"
        onClick={() => onChange(cantidad + 1)}
        disabled={disabled}
        className={`
          min-w-[44px] min-h-[44px] flex items-center justify-center
          rounded-full border border-brand-200 text-brand-600
          hover:bg-brand-50 hover:border-brand-400
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
  const [expanded, setExpanded] = useState(false);
  const lineTotal = calcularLineaTotal(item);
  const hasOpciones = item.opcionesDisponibles.length > 0;

  return (
    <article className="bg-white rounded-xl shadow-sm border border-wood-100 overflow-hidden">
      {/* Header row: product info + quantity + line total */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-wood-800 truncate">
              {item.nombre}
            </h3>
            <p className="text-xs text-wood-500 mt-0.5">
              {formatPrecio(item.precioUnitario)} c/u
              {item.personalizaciones.length > 0 && (
                <span className="text-brand-500 ml-1">
                  (+{formatPrecio(item.personalizaciones.reduce((a, p) => a + p.precioExtra, 0))} extras)
                </span>
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm sm:text-base font-bold text-brand-600">
              {formatPrecio(lineTotal)}
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

          {/* Toggle personalization/comments */}
          {(hasOpciones || !confirmado) && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="
                min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium
                text-brand-600 bg-brand-50 hover:bg-brand-100
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-500
              "
              aria-expanded={expanded}
              aria-label={expanded ? 'Ocultar personalización' : 'Personalizar'}
            >
              {expanded ? 'Ocultar' : 'Personalizar'}
            </button>
          )}
        </div>

        {/* Selected personalizations summary (when collapsed) */}
        {!expanded && item.personalizaciones.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.personalizaciones.map((p, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-brand-100 text-brand-700"
              >
                {p.opcion}
              </span>
            ))}
          </div>
        )}

        {/* Comment summary (when collapsed) */}
        {!expanded && item.comentario && (
          <p className="mt-1 text-[11px] text-wood-500 italic truncate">
            &quot;{item.comentario}&quot;
          </p>
        )}
      </div>

      {/* Expanded: Personalization options + comment field */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-wood-100 pt-3">
          {hasOpciones && (
            <PersonalizacionSelector
              opciones={item.opcionesDisponibles}
              seleccionadas={item.personalizaciones}
              onChange={onPersonalizacionesChange}
              disabled={confirmado}
            />
          )}

          <ComentarioInput
            value={item.comentario}
            onChange={onComentarioChange}
            disabled={confirmado}
          />
        </div>
      )}
    </article>
  );
}

/**
 * Empty cart state component.
 */
function CarritoVacio() {
  return (
    <div className="text-center py-16 px-4">
      <span className="text-6xl block mb-4" aria-hidden="true">🛒</span>
      <h2 className="text-xl font-bold text-wood-800 mb-2">
        Tu carrito está vacío
      </h2>
      <p className="text-sm text-wood-500 mb-6">
        Agrega productos desde el menú para armar tu pedido.
      </p>
      <Link
        href="/menu"
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
 * Confirmation success state after order is confirmed.
 */
function ConfirmacionExitosa() {
  return (
    <div className="text-center py-8 px-4 bg-green-50 rounded-xl border border-green-200 mt-4">
      <span className="text-5xl block mb-3" aria-hidden="true">✅</span>
      <h3 className="text-lg font-bold text-green-800 mb-1">
        Pedido Confirmado
      </h3>
      <p className="text-sm text-green-600">
        Tu pedido ha sido enviado. Puedes seguir su estado en la sección de Rastreo.
      </p>
      <Link
        href="/rastreo"
        className="
          inline-flex items-center mt-4 min-h-[44px] px-5 py-2.5 rounded-lg
          bg-green-600 hover:bg-green-700 text-white font-medium text-sm
          transition-colors duration-150 motion-reduce:transition-none
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
        "
      >
        Ver estado del pedido
      </Link>
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
    <div className="bg-white rounded-xl shadow-sm border border-wood-100 p-4 mt-4">
      <h3 className="text-sm font-semibold text-wood-800 mb-3">Resumen</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-wood-600">
          <span>Subtotal</span>
          <span>{formatPrecio(subtotal)}</span>
        </div>
        <div className="flex justify-between text-wood-600">
          <span>IVA (16%)</span>
          <span>{formatPrecio(impuestos)}</span>
        </div>
        <div className="border-t border-wood-100 pt-2 flex justify-between font-bold text-wood-800 text-base">
          <span>Total</span>
          <span className="text-brand-600">{formatPrecio(total)}</span>
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
    subtotal,
    impuestos,
    total,
  } = useCarrito();

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles order confirmation by calling POST /api/pedidos.
   */
  const handleConfirmar = async () => {
    if (items.length === 0) return;
    setEnviando(true);
    setError(null);

    try {
      const payload = {
        modalidad: modalidad || 'LOCAL',
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

      confirmarPedido();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setEnviando(false);
    }
  };

  // Empty cart
  if (items.length === 0 && !confirmado) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <CarritoVacio />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 animate-fade-in motion-reduce:animate-none">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-wood-800">
            Mi Pedido
          </h2>
          <p className="text-xs sm:text-sm text-wood-500 mt-0.5">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
            {modalidad && (
              <span className="ml-2">
                {modalidad === 'LOCAL' ? '🏠 Local' : '🛵 Domicilio'}
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
              text-fire-600 bg-fire-50 hover:bg-fire-100
              transition-colors duration-150 motion-reduce:transition-none
              focus:outline-none focus:ring-2 focus:ring-fire-500
            "
          >
            Vaciar
          </button>
        )}
      </div>

      {/* Confirmed banner */}
      {confirmado && <ConfirmacionExitosa />}

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

      {/* Error message */}
      {error && (
        <div
          className="mt-4 p-3 rounded-lg bg-fire-50 border border-fire-200 text-fire-700 text-sm"
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
              w-full min-h-[44px] py-4 rounded-xl font-bold text-base
              text-white shadow-lg
              transition-all duration-200 motion-reduce:transition-none
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
              ${
                enviando || items.length === 0
                  ? 'bg-wood-300 cursor-not-allowed'
                  : 'bg-brand-500 hover:bg-brand-600 active:scale-[0.98] motion-reduce:active:scale-100'
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
              `Confirmar Pedido - ${formatPrecio(total)}`
            )}
          </button>
        </div>
      )}

      {/* New order button after confirmation */}
      {confirmado && (
        <div className="mt-6 mb-4">
          <button
            type="button"
            onClick={limpiarCarrito}
            className="
              w-full min-h-[44px] py-3 rounded-xl font-medium text-sm
              text-brand-600 bg-brand-50 border border-brand-200
              hover:bg-brand-100 transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
            "
          >
            Hacer nuevo pedido
          </button>
        </div>
      )}
    </div>
  );
}
