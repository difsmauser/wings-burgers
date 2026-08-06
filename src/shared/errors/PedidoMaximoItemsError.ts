import { DomainError } from './DomainError';

/**
 * Error lanzado cuando se intenta agregar más de 50 items a un pedido.
 */
export class PedidoMaximoItemsError extends DomainError {
  readonly code = 'PEDIDO_MAXIMO_ITEMS';
  readonly statusCode = 400;
  readonly limite: number;

  constructor(limite: number = 50) {
    super(
      `El pedido ha alcanzado el máximo de ${limite} productos permitidos`
    );
    this.limite = limite;
  }
}
