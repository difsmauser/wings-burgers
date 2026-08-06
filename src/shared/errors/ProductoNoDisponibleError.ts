import { DomainError } from './DomainError';

/**
 * Error lanzado cuando se intenta agregar un producto que no está disponible.
 */
export class ProductoNoDisponibleError extends DomainError {
  readonly code = 'PRODUCTO_NO_DISPONIBLE';
  readonly statusCode = 409;
  readonly productoId: string;

  constructor(productoId: string) {
    super(
      `El producto con id "${productoId}" no está disponible actualmente`
    );
    this.productoId = productoId;
  }
}
