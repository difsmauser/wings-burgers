import { DomainError } from './DomainError';

/**
 * Error lanzado cuando la validación de datos falla.
 * Incluye los campos con errores para facilitar la respuesta al usuario.
 */
export class ValidacionError extends DomainError {
  readonly code = 'VALIDACION_ERROR';
  readonly statusCode = 400;
  readonly campos: string[];

  constructor(message: string, campos: string[] = []) {
    super(message);
    this.campos = campos;
  }
}
