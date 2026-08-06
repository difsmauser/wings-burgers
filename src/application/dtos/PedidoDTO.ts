import type { ModalidadServicio } from '@/domain/value-objects';
import type { Personalizacion } from '@/domain/entities';

/**
 * DTO para la creación de un nuevo pedido.
 */
export interface CrearPedidoDTO {
  /** Nombre del cliente (obligatorio) */
  nombre: string;
  /** Teléfono del cliente (obligatorio, 10 dígitos) */
  telefono: string;
  /** Modalidad del servicio (LOCAL o DOMICILIO) */
  modalidad: ModalidadServicio;
  /** Items iniciales del pedido (opcional) */
  items?: ItemPedidoDTO[];
  /** Mesa o zona (solo para LOCAL) */
  mesaZona?: string;
  /** Observaciones generales */
  observaciones?: string;
}

/**
 * DTO para un item dentro de un pedido.
 */
export interface ItemPedidoDTO {
  productoId: string;
  cantidad: number;
  personalizaciones?: Personalizacion[];
  comentario?: string;
}
