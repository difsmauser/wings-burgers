import { DomainError } from './DomainError';

/**
 * Error lanzado cuando un repartidor intenta aceptar más de 3 entregas concurrentes.
 */
export class LimiteEntregasExcedidoError extends DomainError {
  readonly code = 'LIMITE_ENTREGAS_EXCEDIDO';
  readonly statusCode = 409;
  readonly repartidorId: string;
  readonly limite: number;

  constructor(repartidorId: string, limite: number = 3) {
    super(
      `El repartidor "${repartidorId}" ya tiene ${limite} entregas activas. No puede aceptar más`
    );
    this.repartidorId = repartidorId;
    this.limite = limite;
  }
}
