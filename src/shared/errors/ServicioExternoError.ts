import { DomainError } from './DomainError';

/**
 * Error lanzado cuando un servicio externo (WhatsApp, MercadoPago, etc.) falla.
 */
export class ServicioExternoError extends DomainError {
  readonly code = 'SERVICIO_EXTERNO_ERROR';
  readonly statusCode = 502;
  readonly servicio: string;
  readonly causa?: string;

  constructor(servicio: string, causa?: string) {
    super(
      `Error al comunicarse con el servicio externo "${servicio}"${causa ? `: ${causa}` : ''}`
    );
    this.servicio = servicio;
    this.causa = causa;
  }
}
