import { ValidacionError } from '@/shared/errors';
import { Precio, CategoriaGasto } from '@/domain/value-objects';

export interface GastoProps {
  id: string;
  monto: number;
  concepto: string;
  categoria: CategoriaGasto;
  fecha: Date;
  adminId: string;
  creadoEn?: Date;
}

/**
 * Entidad de dominio que representa un gasto registrado del negocio.
 */
export class Gasto {
  readonly id: string;
  readonly monto: Precio;
  readonly concepto: string;
  readonly categoria: CategoriaGasto;
  readonly fecha: Date;
  readonly adminId: string;
  readonly creadoEn: Date;

  private constructor(props: {
    id: string;
    monto: Precio;
    concepto: string;
    categoria: CategoriaGasto;
    fecha: Date;
    adminId: string;
    creadoEn: Date;
  }) {
    this.id = props.id;
    this.monto = props.monto;
    this.concepto = props.concepto;
    this.categoria = props.categoria;
    this.fecha = props.fecha;
    this.adminId = props.adminId;
    this.creadoEn = props.creadoEn;
  }

  /**
   * Crea una nueva instancia de Gasto validando todas las restricciones.
   * El monto usa el Value Object Precio (rango 0.01-999999.99, max 2 decimales).
   */
  static crear(props: GastoProps): Gasto {
    const errores: string[] = [];

    // Validar concepto
    if (!props.concepto || props.concepto.trim().length === 0) {
      errores.push('concepto');
    } else if (props.concepto.trim().length > 200) {
      errores.push('concepto');
    }

    // Validar categoría
    if (!props.categoria || !Object.values(CategoriaGasto).includes(props.categoria)) {
      errores.push('categoria');
    }

    // Validar fecha
    if (!props.fecha || !(props.fecha instanceof Date) || isNaN(props.fecha.getTime())) {
      errores.push('fecha');
    }

    // Validar adminId
    if (!props.adminId || props.adminId.trim().length === 0) {
      errores.push('adminId');
    }

    if (errores.length > 0) {
      throw new ValidacionError(
        `Datos inválidos para gasto: ${errores.join(', ')}`,
        errores
      );
    }

    // Precio.crear lanza PrecioFueraDeRangoError o PrecioDecimalesInvalidosError si el monto es inválido
    const monto = Precio.crear(props.monto);

    return new Gasto({
      id: props.id,
      monto,
      concepto: props.concepto.trim(),
      categoria: props.categoria,
      fecha: props.fecha,
      adminId: props.adminId.trim(),
      creadoEn: props.creadoEn ?? new Date(),
    });
  }

  /**
   * Valida que el gasto cumple con todas las restricciones de negocio.
   * Retorna true si es válido. Lanza ValidacionError si algún campo es inválido.
   */
  validar(): boolean {
    const errores: string[] = [];

    if (!this.concepto || this.concepto.length === 0) {
      errores.push('concepto');
    }
    if (this.concepto.length > 200) {
      errores.push('concepto');
    }
    if (!Object.values(CategoriaGasto).includes(this.categoria)) {
      errores.push('categoria');
    }
    if (!this.fecha || isNaN(this.fecha.getTime())) {
      errores.push('fecha');
    }

    if (errores.length > 0) {
      throw new ValidacionError(
        `Gasto inválido: ${errores.join(', ')}`,
        errores
      );
    }

    return true;
  }
}
