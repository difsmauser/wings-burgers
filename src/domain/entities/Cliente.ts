import { ValidacionError } from '@/shared/errors';
import { Telefono, Direccion } from '@/domain/value-objects';

export interface ClienteProps {
  id: string;
  nombre: string;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  creadoEn?: Date;
}

/**
 * Entidad de dominio que representa un cliente del negocio.
 * Nombre y teléfono son obligatorios; email y dirección son opcionales.
 */
export class Cliente {
  readonly id: string;
  readonly nombre: string;
  readonly telefono: Telefono;
  readonly email: string | null;
  readonly direccion: Direccion | null;
  readonly creadoEn: Date;

  private constructor(props: {
    id: string;
    nombre: string;
    telefono: Telefono;
    email: string | null;
    direccion: Direccion | null;
    creadoEn: Date;
  }) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.telefono = props.telefono;
    this.email = props.email;
    this.direccion = props.direccion;
    this.creadoEn = props.creadoEn;
  }

  /**
   * Crea una nueva instancia de Cliente validando todas las restricciones.
   * - nombre: obligatorio, max 100 caracteres
   * - telefono: obligatorio, 10 dígitos (validado por VO Telefono)
   * - email: opcional
   * - direccion: opcional, max 200 caracteres (validado por VO Direccion)
   */
  static crear(props: ClienteProps): Cliente {
    const errores: string[] = [];

    // Validar nombre
    if (!props.nombre || props.nombre.trim().length === 0) {
      errores.push('nombre');
    } else if (props.nombre.trim().length > 100) {
      errores.push('nombre');
    }

    // Validar teléfono (requerido)
    if (!props.telefono || props.telefono.trim().length === 0) {
      errores.push('telefono');
    }

    if (errores.length > 0) {
      throw new ValidacionError(
        `Datos inválidos para cliente: ${errores.join(', ')}`,
        errores
      );
    }

    // Telefono.crear lanza TelefonoInvalidoError si no tiene 10 dígitos
    const telefono = Telefono.crear(props.telefono);

    // Dirección es opcional - solo se valida si se proporciona
    let direccion: Direccion | null = null;
    if (props.direccion && props.direccion.trim().length > 0) {
      direccion = Direccion.crear(props.direccion);
    }

    return new Cliente({
      id: props.id,
      nombre: props.nombre.trim(),
      telefono,
      email: props.email?.trim() || null,
      direccion,
      creadoEn: props.creadoEn ?? new Date(),
    });
  }
}
