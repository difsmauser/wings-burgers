import { ValidacionError } from '@/shared/errors';
import { MovimientoInventario } from '@/shared/types';

export interface ArticuloInventarioProps {
  id: string;
  nombre: string;
  cantidad: number;
  unidadMedida: string;
  nivelMinimo: number;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

/**
 * Entidad de dominio que representa un artículo de inventario.
 * Controla existencias de ingredientes y productos disponibles.
 */
export class ArticuloInventario {
  readonly id: string;
  readonly nombre: string;
  private _cantidad: number;
  readonly unidadMedida: string;
  readonly nivelMinimo: number;
  readonly creadoEn: Date;
  readonly actualizadoEn: Date;

  private constructor(props: ArticuloInventarioProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this._cantidad = props.cantidad;
    this.unidadMedida = props.unidadMedida;
    this.nivelMinimo = props.nivelMinimo;
    this.creadoEn = props.creadoEn ?? new Date();
    this.actualizadoEn = props.actualizadoEn ?? new Date();
  }

  get cantidad(): number {
    return this._cantidad;
  }

  static crear(props: ArticuloInventarioProps): ArticuloInventario {
    const errores: string[] = [];

    if (!props.nombre || props.nombre.trim().length === 0) {
      errores.push('nombre');
    } else if (props.nombre.trim().length > 100) {
      errores.push('nombre');
    }

    if (props.cantidad < 0 || props.cantidad > 999_999) {
      errores.push('cantidad');
    }

    if (!props.unidadMedida || props.unidadMedida.trim().length === 0) {
      errores.push('unidadMedida');
    }

    if (props.nivelMinimo < 1) {
      errores.push('nivelMinimo');
    }

    if (errores.length > 0) {
      throw new ValidacionError(
        `Datos inválidos para artículo de inventario: ${errores.join(', ')}`,
        errores
      );
    }

    return new ArticuloInventario({
      ...props,
      nombre: props.nombre.trim(),
      unidadMedida: props.unidadMedida.trim(),
    });
  }

  /**
   * Retorna true si la cantidad actual está en o por debajo del nivel mínimo de alerta.
   */
  estaBajoMinimo(): boolean {
    return this._cantidad <= this.nivelMinimo;
  }

  /**
   * Retorna true si la cantidad actual es cero (agotado).
   */
  estaAgotado(): boolean {
    return this._cantidad === 0;
  }

  /**
   * Decrementa la cantidad del artículo y retorna el movimiento de inventario generado.
   * @param cantidadUsada - Cantidad a restar del inventario (debe ser > 0)
   * @param adminId - Identificador del administrador que realiza el cambio
   */
  decrementar(cantidadUsada: number, adminId: string = 'sistema'): MovimientoInventario {
    if (cantidadUsada <= 0) {
      throw new ValidacionError(
        'La cantidad a decrementar debe ser mayor a cero',
        ['cantidadUsada']
      );
    }

    const cantidadAnterior = this._cantidad;
    this._cantidad = Math.max(0, this._cantidad - cantidadUsada);

    return {
      articuloId: this.id,
      cantidadAnterior,
      cantidadNueva: this._cantidad,
      tipoMovimiento: 'salida',
      adminId,
      fecha: new Date(),
    };
  }

  /**
   * Incrementa la cantidad del artículo y retorna el movimiento de inventario generado.
   * @param cantidadAgregada - Cantidad a sumar al inventario (debe ser > 0)
   * @param adminId - Identificador del administrador que realiza el cambio
   */
  incrementar(cantidadAgregada: number, adminId: string = 'sistema'): MovimientoInventario {
    if (cantidadAgregada <= 0) {
      throw new ValidacionError(
        'La cantidad a incrementar debe ser mayor a cero',
        ['cantidadAgregada']
      );
    }

    const cantidadAnterior = this._cantidad;
    this._cantidad = Math.min(999_999, this._cantidad + cantidadAgregada);

    return {
      articuloId: this.id,
      cantidadAnterior,
      cantidadNueva: this._cantidad,
      tipoMovimiento: 'entrada',
      adminId,
      fecha: new Date(),
    };
  }
}
