import type { IProductoRepository } from '@/domain/ports/repositories';
import { RecursoNoEncontradoError } from '@/shared/errors';

/**
 * Caso de uso: Eliminar un producto (soft delete).
 * Marca el producto como inactivo sin eliminarlo de la base de datos.
 */
export class EliminarProducto {
  constructor(
    private readonly productoRepo: IProductoRepository
  ) {}

  async ejecutar(id: string): Promise<void> {
    // 1. Verificar que el producto existe
    const producto = await this.productoRepo.obtenerPorId(id);
    if (!producto) {
      throw new RecursoNoEncontradoError('Producto', id);
    }

    // 2. Desactivar producto via repositorio (soft delete)
    await this.productoRepo.desactivar(id);
  }
}
