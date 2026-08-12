import { Pedido, ItemPedido, EstadoPedido } from '@/shared/domain-types';

/**
 * Registro de pedido tal como se almacena en la tabla `pedido` de Supabase.
 */
export interface PedidoRecord {
  id: string;
  numero: string;
  cliente_id: string | null;
  estado: string;
  modalidad: string;
  subtotal: number;
  impuestos: number;
  total: number;
  mesa_zona: string | null;
  observaciones: string | null;
  metodo_pago: string | null;
  estado_pago: string;
  creado_en: string;
  actualizado_en: string;
}

/**
 * Registro de detalle de pedido tal como se almacena en la tabla `pedido_detalle`.
 */
export interface PedidoDetalleRecord {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  comentario: string | null;
  personalizaciones: unknown;
}

/**
 * Registro de pedido con sus detalles incluidos (join).
 */
export interface PedidoConDetallesRecord extends PedidoRecord {
  pedido_detalle?: PedidoDetalleRecord[];
}

/**
 * Mapper para transformar entre la entidad de dominio Pedido
 * y los registros de las tablas `pedido` y `pedido_detalle` en la base de datos.
 */
export class PedidoMapper {
  /**
   * Transforma un registro de DB (con detalles) a una entidad de dominio Pedido.
   */
  static toDomain(record: PedidoConDetallesRecord): Pedido {
    const items: ItemPedido[] = (record.pedido_detalle ?? []).map((detalle) => ({
      productoId: detalle.producto_id,
      nombre: '', // Se resuelve en la capa de aplicación si es necesario
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precio_unitario,
      personalizaciones: Array.isArray(detalle.personalizaciones)
        ? (detalle.personalizaciones as string[])
        : [],
      comentario: detalle.comentario ?? undefined,
    }));

    return {
      id: record.id,
      numero: record.numero,
      clienteId: record.cliente_id ?? '',
      items,
      estado: record.estado as EstadoPedido,
      modalidad: record.modalidad as 'local' | 'retiro' | 'domicilio',
      total: record.total,
      mesaZona: record.mesa_zona ?? undefined,
      observaciones: record.observaciones ?? undefined,
      estadoPago: record.estado_pago ?? 'pendiente',
      metodoPago: record.metodo_pago ?? undefined,
      creadoEn: new Date(record.creado_en),
      actualizadoEn: new Date(record.actualizado_en),
    };
  }

  /**
   * Transforma una entidad de dominio Pedido al registro de la tabla `pedido` (sin detalles).
   */
  static toDb(pedido: Pedido): Omit<PedidoRecord, 'creado_en' | 'actualizado_en'> {
    const subtotal = pedido.items.reduce(
      (acc, item) => acc + item.precioUnitario * item.cantidad,
      0
    );
    const impuestos = pedido.total - subtotal;

    return {
      id: pedido.id,
      numero: pedido.numero,
      cliente_id: pedido.clienteId || null,
      estado: pedido.estado,
      modalidad: pedido.modalidad,
      subtotal: Math.round(subtotal * 100) / 100,
      impuestos: Math.round(impuestos * 100) / 100,
      total: pedido.total,
      mesa_zona: pedido.mesaZona ?? null,
      observaciones: pedido.observaciones ?? null,
      metodo_pago: null,
      estado_pago: 'pendiente',
    };
  }

  /**
   * Transforma los items del pedido a registros de `pedido_detalle`.
   */
  static itemsToDb(pedidoId: string, items: ItemPedido[]): Omit<PedidoDetalleRecord, 'id'>[] {
    return items.map((item) => ({
      pedido_id: pedidoId,
      producto_id: item.productoId,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      precio_total: Math.round(item.precioUnitario * item.cantidad * 100) / 100,
      comentario: item.comentario ?? null,
      personalizaciones: item.personalizaciones ?? [],
    }));
  }

  /**
   * Transforma campos parciales de Pedido a campos parciales del registro DB.
   */
  static toPartialDb(datos: Partial<Pedido>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (datos.estado !== undefined) result.estado = datos.estado;
    if (datos.modalidad !== undefined) result.modalidad = datos.modalidad;
    if (datos.total !== undefined) result.total = datos.total;
    if (datos.observaciones !== undefined) result.observaciones = datos.observaciones ?? null;
    if (datos.clienteId !== undefined) result.cliente_id = datos.clienteId || null;

    return result;
  }
}
