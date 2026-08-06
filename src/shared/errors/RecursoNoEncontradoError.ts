import { DomainError } from './DomainError';

/**
 * Error lanzado cuando un recurso solicitado no existe en el sistema.
 */
export class RecursoNoEncontradoError extends DomainError {
  readonly code = 'RECURSO_NO_ENCONTRADO';
  readonly statusCode = 404;
  readonly recurso: string;
  readonly identificador: string;

  constructor(recurso: string, identificador: string) {
    super(
      `${recurso} con identificador "${identificador}" no fue encontrado`
    );
    this.recurso = recurso;
    this.identificador = identificador;
  }
}
