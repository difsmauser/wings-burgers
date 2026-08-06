import { DomainError } from './DomainError';

/**
 * Error lanzado cuando un número de teléfono no tiene 10 dígitos válidos.
 */
export class TelefonoInvalidoError extends DomainError {
  readonly code = 'TELEFONO_INVALIDO';
  readonly statusCode = 400;
  readonly valor: string;

  constructor(valor: string) {
    super(
      `El teléfono "${valor}" no es válido. Debe contener exactamente 10 dígitos`
    );
    this.valor = valor;
  }
}
