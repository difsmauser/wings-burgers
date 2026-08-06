/**
 * Clase base abstracta para todos los errores de dominio.
 * Proporciona un código de error y un statusCode HTTP estándar.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
