import { DomainError } from './DomainError';

/**
 * Error lanzado cuando un pago no puede ser procesado.
 */
export class PagoFallidoError extends DomainError {
  readonly code = 'PAGO_FALLIDO';
  readonly statusCode = 402;
  readonly pedidoId: string;
  readonly motivo?: string;

  constructor(pedidoId: string, motivo?: string) {
    super(
      `El pago para el pedido "${pedidoId}" falló${motivo ? `: ${motivo}` : ''}`
    );
    this.pedidoId = pedidoId;
    this.motivo = motivo;
  }
}
