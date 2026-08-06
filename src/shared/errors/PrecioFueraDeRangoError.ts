import { DomainError } from './DomainError';

/**
 * Error lanzado cuando un precio está fuera del rango permitido (0.01 - 99,999.99).
 */
export class PrecioFueraDeRangoError extends DomainError {
  readonly code = 'PRECIO_FUERA_DE_RANGO';
  readonly statusCode = 400;
  readonly valor: number;

  constructor(valor: number) {
    super(
      `El precio ${valor} está fuera del rango permitido (0.01 - 99,999.99)`
    );
    this.valor = valor;
  }
}
