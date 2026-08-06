import { Producto, Categoria } from '@/shared/domain-types';
import { FiltroProducto } from '@/shared/types';

/**
 * Puerto de repositorio para la entidad Producto.
 * Define las operaciones de persistencia disponibles para productos.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IProductoRepository {
  /**
   * Crea un nuevo producto en el sistema.
   * @param producto - Datos del producto a crear
   * @returns El producto creado con su identificador asignado
   */
  crear(producto: Producto): Promise<Producto>;

  /**
   * Actualiza los campos de un producto existente.
   * @param id - Identificador único del producto
   * @param datos - Campos a actualizar (parcial)
   * @returns El producto actualizado
   */
  actualizar(id: string, datos: Partial<Producto>): Promise<Producto>;

  /**
   * Desactiva un producto (eliminación lógica).
   * El producto se oculta del menú visible para el cliente.
   * @param id - Identificador único del producto
   */
  desactivar(id: string): Promise<void>;

  /**
   * Obtiene un producto por su identificador único.
   * @param id - Identificador único del producto
   * @returns El producto encontrado o null si no existe
   */
  obtenerPorId(id: string): Promise<Producto | null>;

  /**
   * Lista todos los productos activos con filtros opcionales.
   * @param filtros - Criterios de filtrado opcionales
   * @returns Lista de productos activos que cumplen los filtros
   */
  listarActivos(filtros?: FiltroProducto): Promise<Producto[]>;

  /**
   * Lista todos los productos de una categoría específica.
   * @param categoria - Categoría a filtrar
   * @returns Lista de productos de la categoría indicada
   */
  listarPorCategoria(categoria: Categoria): Promise<Producto[]>;
}
