import { IInventarioRepository, IProductoRepository } from '@/domain/ports';
import { RecursoNoEncontradoError } from '@/shared/errors';

/**
 * Caso de uso: Verificar Disponibilidad de un Producto.
 *
 * Obtiene los artículos de inventario asociados a un producto,
 * verifica si está disponible (todos los artículos con stock > 0),
 * y actualiza la disponibilidad del producto si es necesario.
 *
 * Requirements: 4.4, 4.5
 */
export class VerificarDisponibilidad {
  constructor(
    private readonly inventarioRepo: IInventarioRepository,
    private readonly productoRepo: IProductoRepository
  ) {}

  /**
   * Ejecuta el caso de uso de verificar disponibilidad de un producto.
   * @param productoId - Identificador del producto a verificar
   * @returns true si el producto está disponible (todos sus artículos tienen stock), false en caso contrario
   * @throws RecursoNoEncontradoError si el producto no existe
   */
  async ejecutar(productoId: string): Promise<boolean> {
    // 1. Verificar que el producto existe
    const producto = await this.productoRepo.obtenerPorId(productoId);
    if (!producto) {
      throw new RecursoNoEncontradoError('Producto', productoId);
    }

    // 2. Obtener los artículos de inventario asociados al producto
    const articulos = await this.inventarioRepo.obtenerArticulosPorProducto(productoId);

    // 3. Verificar disponibilidad: producto disponible si todos los artículos tienen cantidad > 0
    const disponible = articulos.length > 0 && articulos.every((a) => a.cantidad > 0);

    // 4. Actualizar disponibilidad del producto si cambió
    if (producto.activo && disponible !== producto.disponible) {
      await this.productoRepo.actualizar(productoId, { disponible });
    }

    return disponible;
  }
}
