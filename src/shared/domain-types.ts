// Domain Types - Forward References
// Tipos de dominio usados como referencias en las interfaces de puertos.
// Estas son definiciones ligeras que serán reemplazadas por las entidades completas
// cuando se implementen en la capa de dominio.

/**
 * Categoría de producto
 */
export type Categoria = 'alitas' | 'hamburguesas' | 'bebidas' | 'otros';

/**
 * Estado del pedido en el flujo de trabajo
 */
export type EstadoPedido =
  | 'recibido'
  | 'en_preparacion'
  | 'empacado'
  | 'listo_para_servir'
  | 'servido'
  | 'en_camino'
  | 'entregado'
  | 'entrega_fallida'
  | 'cancelado'
  | 'pagado'
  | 'pago_rechazado';

/**
 * Referencia a la entidad Producto del dominio.
 * Será reemplazada por la entidad completa en la implementación.
 */
export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  imagen?: string;
  categoria: Categoria;
  precio: number;
  disponible: boolean;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Referencia a la entidad Pedido del dominio.
 */
export interface Pedido {
  id: string;
  numero: string;
  clienteId: string;
  items: ItemPedido[];
  estado: EstadoPedido;
  modalidad: 'local' | 'retiro' | 'domicilio';
  total: number;
  mesaZona?: string;
  observaciones?: string;
  estadoPago?: string;
  metodoPago?: string;
  meseroId?: string;
  meseroNombre?: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Item individual dentro de un pedido
 */
export interface ItemPedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  personalizaciones?: string[];
  comentario?: string;
}

/**
 * Referencia a la entidad Cliente del dominio.
 */
export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  direccion?: string;
  correo?: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Referencia a la entidad ArticuloInventario del dominio.
 */
export interface ArticuloInventario {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  nivelMinimo: number;
  productoIds: string[];
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Referencia a la entidad Gasto del dominio.
 */
export interface Gasto {
  id: string;
  monto: number;
  concepto: string;
  categoria: string;
  fecha: Date;
  creadoEn: Date;
}
