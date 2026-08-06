import { DomainError } from './DomainError';

/**
 * Error lanzado cuando un precio tiene más de 2 decimales.
 */
export class PrecioDecimalesInvalidosError extends DomainError {
  readonly code = 'PRECIO_DECIMALES_INVALIDOS';
  readonly statusCode = 400;
  readonly valor: number;

  constructor(valor: number) {
    super(
      `El precio ${valor} tiene más de 2 decimales. El precio debe tener máximo 2 decimales`
    );
    this.valor = valor;
  }
}
