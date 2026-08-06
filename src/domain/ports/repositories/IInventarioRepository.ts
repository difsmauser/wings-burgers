import { ArticuloInventario } from '@/shared/domain-types';
import { TipoMovimiento, MovimientoInventario } from '@/shared/types';

/**
 * Puerto de repositorio para la entidad ArticuloInventario.
 * Define las operaciones de persistencia disponibles para el inventario.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IInventarioRepository {
  /**
   * Registra un nuevo artículo de inventario.
   * @param articulo - Datos del artículo a registrar
   * @returns El artículo registrado con su identificador asignado
   */
  registrar(articulo: ArticuloInventario): Promise<ArticuloInventario>;

  /**
   * Actualiza la cantidad de un artículo de inventario y registra el movimiento.
   * @param id - Identificador único del artículo
   * @param cantidad - Nueva cantidad del artículo
   * @param tipoMovimiento - Tipo de movimiento (entrada o salida)
   * @param adminId - Identificador del administrador que realiza el cambio
   * @returns El artículo actualizado
   */
  actualizar(
    id: string,
    cantidad: number,
    tipoMovimiento: TipoMovimiento,
    adminId: string
  ): Promise<ArticuloInventario>;

  /**
   * Obtiene un artículo de inventario por su identificador.
   * @param id - Identificador único del artículo
   * @returns El artículo encontrado o null si no existe
   */
  obtenerPorId(id: string): Promise<ArticuloInventario | null>;

  /**
   * Lista los artículos cuya cantidad está por debajo del nivel mínimo.
   * Útil para generar alertas de inventario bajo.
   * @returns Lista de artículos con cantidad menor o igual al nivel mínimo
   */
  listarBajoMinimo(): Promise<ArticuloInventario[]>;

  /**
   * Obtiene los artículos de inventario asociados a un producto específico.
   * @param productoId - Identificador del producto
   * @returns Lista de artículos de inventario requeridos por el producto
   */
  obtenerArticulosPorProducto(productoId: string): Promise<ArticuloInventario[]>;

  /**
   * Registra un movimiento de inventario en el historial.
   * @param movimiento - Datos del movimiento a registrar
   */
  registrarMovimiento(movimiento: MovimientoInventario): Promise<void>;
}
