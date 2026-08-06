import { DomainError } from './DomainError';

/**
 * Error lanzado cuando un archivo no cumple con las restricciones de formato o tamaño.
 */
export class ArchivoInvalidoError extends DomainError {
  readonly code = 'ARCHIVO_INVALIDO';
  readonly statusCode = 400;
  readonly motivo: string;

  constructor(motivo: string) {
    super(`Archivo inválido: ${motivo}`);
    this.motivo = motivo;
  }
}
