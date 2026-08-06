import { TransicionEstadoInvalidaError } from '@/shared/errors';
import { EstadoEntrega } from '@/domain/value-objects';

export interface EntregaProps {
  id: string;
  pedidoId: string;
  repartidorId: string;
  estado?: EstadoEntrega;
  motivoNoEntrega?: string | null;
  aceptadaEn?: Date | null;
  completadaEn?: Date | null;
  creadoEn?: Date;
}

/**
 * Entidad de dominio que representa una entrega a domicilio.
 * Gestiona el ciclo de vida: PENDIENTE → EN_CAMINO → ENTREGADO | FALLIDO
 */
export class Entrega {
  readonly id: string;
  readonly pedidoId: string;
  readonly repartidorId: string;
  private _estado: EstadoEntrega;
  private _motivoNoEntrega: string | null;
  private _aceptadaEn: Date | null;
  private _completadaEn: Date | null;
  readonly creadoEn: Date;

  private constructor(props: EntregaProps) {
    this.id = props.id;
    this.pedidoId = props.pedidoId;
    this.repartidorId = props.repartidorId;
    this._estado = props.estado ?? EstadoEntrega.PENDIENTE;
    this._motivoNoEntrega = props.motivoNoEntrega ?? null;
    this._aceptadaEn = props.aceptadaEn ?? null;
    this._completadaEn = props.completadaEn ?? null;
    this.creadoEn = props.creadoEn ?? new Date();
  }

  get estado(): EstadoEntrega {
    return this._estado;
  }

  get motivoNoEntrega(): string | null {
    return this._motivoNoEntrega;
  }

  get aceptadaEn(): Date | null {
    return this._aceptadaEn;
  }

  get completadaEn(): Date | null {
    return this._completadaEn;
  }

  static crear(props: EntregaProps): Entrega {
    return new Entrega(props);
  }

  /**
   * Acepta la entrega, transitando de PENDIENTE a EN_CAMINO.
   * Registra la fecha de aceptación.
   * @throws TransicionEstadoInvalidaError si el estado actual no es PENDIENTE
   */
  aceptar(): void {
    if (this._estado !== EstadoEntrega.PENDIENTE) {
      throw new TransicionEstadoInvalidaError(this._estado, EstadoEntrega.EN_CAMINO);
    }
    this._estado = EstadoEntrega.EN_CAMINO;
    this._aceptadaEn = new Date();
  }

  /**
   * Marca la entrega como completada, transitando de EN_CAMINO a ENTREGADO.
   * Registra la fecha de completado.
   * @throws TransicionEstadoInvalidaError si el estado actual no es EN_CAMINO
   */
  completar(): void {
    if (this._estado !== EstadoEntrega.EN_CAMINO) {
      throw new TransicionEstadoInvalidaError(this._estado, EstadoEntrega.ENTREGADO);
    }
    this._estado = EstadoEntrega.ENTREGADO;
    this._completadaEn = new Date();
  }

  /**
   * Marca la entrega como fallida, transitando de EN_CAMINO a FALLIDO.
   * Requiere motivo de no entrega. Registra la fecha de completado.
   * @param motivo - Razón por la que no se pudo completar la entrega
   * @throws TransicionEstadoInvalidaError si el estado actual no es EN_CAMINO
   */
  marcarFallida(motivo: string): void {
    if (this._estado !== EstadoEntrega.EN_CAMINO) {
      throw new TransicionEstadoInvalidaError(this._estado, EstadoEntrega.FALLIDO);
    }
    this._estado = EstadoEntrega.FALLIDO;
    this._motivoNoEntrega = motivo;
    this._completadaEn = new Date();
  }
}
