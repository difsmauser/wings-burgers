import { DomainError } from './DomainError';

/**
 * Error lanzado cuando se intenta una transición de estado no permitida en la máquina de estados.
 */
export class TransicionEstadoInvalidaError extends DomainError {
  readonly code = 'TRANSICION_ESTADO_INVALIDA';
  readonly statusCode = 422;
  readonly estadoActual: string;
  readonly estadoDestino: string;

  constructor(estadoActual: string, estadoDestino: string) {
    super(
      `No se puede cambiar del estado "${estadoActual}" al estado "${estadoDestino}"`
    );
    this.estadoActual = estadoActual;
    this.estadoDestino = estadoDestino;
  }
}
