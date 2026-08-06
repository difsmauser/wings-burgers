import { Precio, Categoria } from '@/domain/value-objects';
import { ValidacionError } from '@/shared/errors';

/**
 * Opciones de personalización disponibles para un producto.
 */
export interface OpcionPersonalizacion {
  nombre: string;
  opciones: { nombre: string; precioExtra?: number }[];
}

/**
 * Registro de historial de cambio de precio de un producto.
 */
export interface HistorialPrecio {
  productoId: string;
  precioAnterior: number;
  precioNuevo: number;
  fechaCambio: Date;
}

export interface ProductoProps {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: Categoria;
  precio: Precio;
  imagenUrl?: string | null;
  activo?: boolean;
  opcionesPersonalizacion?: OpcionPersonalizacion[];
  creadoEn?: Date;
  actualizadoEn?: Date;
}

/**
 * Entidad de dominio que representa un producto del menú.
 * Gestiona nombre, descripción, categoría, precio, imagen y opciones de personalización.
 */
export class Producto {
  readonly id: string;
  nombre: string;
  descripcion: string;
  categoria: Categoria;
  precio: Precio;
  imagenUrl: string | null;
  activo: boolean;
  opcionesPersonalizacion: OpcionPersonalizacion[];
  creadoEn: Date;
  actualizadoEn: Date;

  private constructor(props: ProductoProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.descripcion = props.descripcion ?? '';
    this.categoria = props.categoria;
    this.precio = props.precio;
    this.imagenUrl = props.imagenUrl ?? null;
    this.activo = props.activo ?? true;
    this.opcionesPersonalizacion = props.opcionesPersonalizacion ?? [];
    this.creadoEn = props.creadoEn ?? new Date();
    this.actualizadoEn = props.actualizadoEn ?? new Date();
  }

  /**
   * Crea una nueva instancia de Producto validando los datos de entrada.
   * @throws ValidacionError si faltan campos obligatorios o los datos exceden los límites.
   */
  static crear(props: ProductoProps): Producto {
    const producto = new Producto(props);
    producto.validar();
    return producto;
  }

  /**
   * Valida los campos obligatorios y restricciones del producto.
   * @throws ValidacionError si nombre está vacío o excede 100 chars,
   *         descripción excede 500 chars, categoría falta, o precio es inválido.
   */
  validar(): void {
    const errores: string[] = [];

    if (!this.nombre || this.nombre.trim().length === 0) {
      errores.push('nombre');
    } else if (this.nombre.trim().length > 100) {
      errores.push('nombre');
    }

    if (this.descripcion && this.descripcion.length > 500) {
      errores.push('descripcion');
    }

    if (!this.categoria) {
      errores.push('categoria');
    }

    if (!this.precio) {
      errores.push('precio');
    }

    if (errores.length > 0) {
      throw new ValidacionError(
        `Datos inválidos para producto: ${errores.join(', ')}`,
        errores
      );
    }
  }

  /**
   * Marca el producto como inactivo (soft delete).
   */
  desactivar(): void {
    this.activo = false;
    this.actualizadoEn = new Date();
  }

  /**
   * Actualiza el precio del producto y retorna un registro de historial de precio.
   * @param nuevoPrecio - Nuevo precio a asignar al producto.
   * @returns HistorialPrecio con el precio anterior, nuevo y fecha del cambio.
   */
  actualizarPrecio(nuevoPrecio: Precio): HistorialPrecio {
    const historial: HistorialPrecio = {
      productoId: this.id,
      precioAnterior: this.precio.valor,
      precioNuevo: nuevoPrecio.valor,
      fechaCambio: new Date(),
    };

    this.precio = nuevoPrecio;
    this.actualizadoEn = new Date();

    return historial;
  }
}
