'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * Personalization option selected by the client for a product.
 */
export interface PersonalizacionSeleccionada {
  nombre: string;
  opcion: string;
  precioExtra: number;
}

/**
 * Item in the cart with product info, personalization, and comments.
 */
export interface ItemCarrito {
  id: string;
  productoId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  imagenUrl: string | null;
  personalizaciones: PersonalizacionSeleccionada[];
  comentario: string;
  opcionesDisponibles: OpcionPersonalizacionProducto[];
}

/**
 * Personalization options available for a product (from admin config).
 */
export interface OpcionPersonalizacionProducto {
  nombre: string;
  opciones: { nombre: string; precioExtra?: number }[];
}

/**
 * Modalidad type for the ordering flow.
 * LOCAL = eating in restaurant, RETIRO = takeout pickup, DOMICILIO = delivery.
 */
export type Modalidad = 'LOCAL' | 'RETIRO' | 'DOMICILIO' | null;

/**
 * Cart state interface.
 */
interface CarritoState {
  items: ItemCarrito[];
  modalidad: Modalidad;
  confirmado: boolean;
}

/**
 * Cart context value.
 */
interface CarritoContextValue {
  items: ItemCarrito[];
  modalidad: Modalidad;
  confirmado: boolean;
  agregarItem: (item: Omit<ItemCarrito, 'id' | 'personalizaciones' | 'comentario'> & { personalizaciones?: PersonalizacionSeleccionada[]; comentario?: string }) => void;
  eliminarItem: (id: string) => void;
  modificarCantidad: (id: string, cantidad: number) => void;
  actualizarPersonalizaciones: (id: string, personalizaciones: PersonalizacionSeleccionada[]) => void;
  actualizarComentario: (id: string, comentario: string) => void;
  setModalidad: (modalidad: 'LOCAL' | 'RETIRO' | 'DOMICILIO') => void;
  confirmarPedido: () => void;
  limpiarCarrito: () => void;
  subtotal: number;
  impuestos: number;
  total: number;
  cantidadTotal: number;
}

const STORAGE_KEY = 'wings-burgers-carrito';
const IVA_RATE = 0;

const CarritoContext = createContext<CarritoContextValue | null>(null);

/**
 * Calculates the line total for a cart item including personalizations.
 */
function calcularLineaTotal(item: ItemCarrito): number {
  const extrasTotal = item.personalizaciones.reduce((acc, p) => acc + p.precioExtra, 0);
  return (item.precioUnitario + extrasTotal) * item.cantidad;
}

/**
 * Provider that manages the shopping cart state with localStorage persistence.
 * Supports adding products, personalizations, comments, and order confirmation.
 */
export function CarritoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CarritoState>({
    items: [],
    modalidad: null,
    confirmado: false,
  });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CarritoState;
        setState(parsed);
      }
    } catch {
      // If parse fails, start fresh
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on state change
  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Storage full or unavailable
      }
    }
  }, [state, hydrated]);

  const agregarItem = useCallback((item: Omit<ItemCarrito, 'id' | 'personalizaciones' | 'comentario'> & { personalizaciones?: PersonalizacionSeleccionada[]; comentario?: string }) => {
    setState((prev) => {
      if (prev.confirmado) return prev;

      const newItem: ItemCarrito = {
        id: crypto.randomUUID(),
        productoId: item.productoId,
        nombre: item.nombre,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        imagenUrl: item.imagenUrl,
        personalizaciones: item.personalizaciones ?? [],
        comentario: item.comentario ?? '',
        opcionesDisponibles: item.opcionesDisponibles,
      };

      return { ...prev, items: [...prev.items, newItem] };
    });
  }, []);

  const eliminarItem = useCallback((id: string) => {
    setState((prev) => {
      if (prev.confirmado) return prev;
      return { ...prev, items: prev.items.filter((i) => i.id !== id) };
    });
  }, []);

  const modificarCantidad = useCallback((id: string, cantidad: number) => {
    setState((prev) => {
      if (prev.confirmado) return prev;
      if (cantidad < 1) return prev;
      return {
        ...prev,
        items: prev.items.map((i) => (i.id === id ? { ...i, cantidad } : i)),
      };
    });
  }, []);

  const actualizarPersonalizaciones = useCallback((id: string, personalizaciones: PersonalizacionSeleccionada[]) => {
    setState((prev) => {
      if (prev.confirmado) return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === id ? { ...i, personalizaciones } : i
        ),
      };
    });
  }, []);

  const actualizarComentario = useCallback((id: string, comentario: string) => {
    setState((prev) => {
      if (prev.confirmado) return prev;
      // Limit to 250 characters
      const trimmed = comentario.slice(0, 250);
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === id ? { ...i, comentario: trimmed } : i
        ),
      };
    });
  }, []);

  const setModalidad = useCallback((modalidad: 'LOCAL' | 'RETIRO' | 'DOMICILIO') => {
    setState((prev) => ({ ...prev, modalidad }));
  }, []);

  const confirmarPedido = useCallback(() => {
    setState((prev) => ({ ...prev, confirmado: true }));
  }, []);

  const limpiarCarrito = useCallback(() => {
    setState({ items: [], modalidad: null, confirmado: false });
  }, []);

  // Calculated values
  const subtotal = state.items.reduce((acc, item) => acc + calcularLineaTotal(item), 0);
  const subtotalRedondeado = Math.round(subtotal * 100) / 100;
  const impuestos = Math.round(subtotalRedondeado * IVA_RATE * 100) / 100;
  const total = Math.round((subtotalRedondeado + impuestos) * 100) / 100;
  const cantidadTotal = state.items.reduce((acc, item) => acc + item.cantidad, 0);

  const value: CarritoContextValue = {
    items: state.items,
    modalidad: state.modalidad,
    confirmado: state.confirmado,
    agregarItem,
    eliminarItem,
    modificarCantidad,
    actualizarPersonalizaciones,
    actualizarComentario,
    setModalidad,
    confirmarPedido,
    limpiarCarrito,
    subtotal: subtotalRedondeado,
    impuestos,
    total,
    cantidadTotal,
  };

  // Don't render children until hydrated to avoid hydration mismatch
  if (!hydrated) {
    return null;
  }

  return (
    <CarritoContext.Provider value={value}>
      {children}
    </CarritoContext.Provider>
  );
}

/**
 * Hook to access the carrito context.
 * Must be used within a CarritoProvider.
 */
export function useCarrito(): CarritoContextValue {
  const context = useContext(CarritoContext);
  if (!context) {
    throw new Error('useCarrito debe usarse dentro de un CarritoProvider');
  }
  return context;
}
