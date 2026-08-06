import { ArticuloInventario } from '@/domain/entities';
import { MovimientoInventario } from '@/shared/types';

/**
 * Servicio de dominio para la gestión de inventario.
 * Controla disponibilidad de productos, decremento al confirmar pedidos
 * y alertas de bajo nivel de stock.
 *
 * Servicio puro de dominio - sin dependencias de infraestructura.
 */
export class InventarioService {
  /**
   * Verifica si un producto está disponible basándose en sus artículos de inventario.
   * Un producto está disponible si TODOS sus artículos tienen cantidad > 0.
   *
   * @param productoId - Identificador del producto a verificar.
   * @param articulos - Artículos de inventario asociados al producto.
   * @returns true si todos los artículos tienen cantidad > 0, false si alguno tiene cantidad === 0.
   */
  verificarDisponibilidad(productoId: string, articulos: ArticuloInventario[]): boolean {
    if (articulos.length === 0) {
      return false;
    }
    return articulos.every((articulo) => articulo.cantidad > 0);
  }

  /**
   * Decrementa el inventario de artículos al confirmar un pedido.
   * Para cada item del pedido, decrementa cada artículo asociado según la receta:
   * cantidad a decrementar = item.cantidad * cantidadRequerida
   *
   * @param items - Items del pedido con productoId y cantidad solicitada.
   * @param articulosPorProducto - Mapa de productoId a sus artículos con cantidad requerida por receta.
   * @returns Array de todos los movimientos de inventario generados.
   */
  decrementarPorPedido(
    items: { productoId: string; cantidad: number }[],
    articulosPorProducto: Map<
      string,
      { articulo: ArticuloInventario; cantidadRequerida: number }[]
    >
  ): MovimientoInventario[] {
    const movimientos: MovimientoInventario[] = [];

    for (const item of items) {
      const articulosRequeridos = articulosPorProducto.get(item.productoId);
      if (!articulosRequeridos) {
        continue;
      }

      for (const { articulo, cantidadRequerida } of articulosRequeridos) {
        const cantidadTotal = item.cantidad * cantidadRequerida;
        const movimiento = articulo.decrementar(cantidadTotal);
        movimientos.push(movimiento);
      }
    }

    return movimientos;
  }

  /**
   * Verifica qué artículos de inventario están en o por debajo de su nivel mínimo de alerta.
   *
   * @param articulos - Artículos de inventario a verificar.
   * @returns Artículos que están en o por debajo de su nivel mínimo.
   */
  verificarAlertasBajoMinimo(articulos: ArticuloInventario[]): ArticuloInventario[] {
    return articulos.filter((articulo) => articulo.estaBajoMinimo());
  }
}
