import { Pedido, EstadoPedido } from '@/shared/domain-types';
import { Paginacion, PedidoPaginado } from '@/shared/types';

/**
 * Puerto de repositorio para la entidad Pedido.
 * Define las operaciones de persistencia disponibles para pedidos.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IPedidoRepository {
  /**
   * Crea un nuevo pedido en el sistema.
   * @param pedido - Datos del pedido a crear
   * @returns El pedido creado con su identificador y número asignados
   */
  crear(pedido: Pedido): Promise<Pedido>;

  /**
   * Actualiza los campos de un pedido existente.
   * @param id - Identificador único del pedido
   * @param datos - Campos a actualizar (parcial)
   * @returns El pedido actualizado
   */
  actualizar(id: string, datos: Partial<Pedido>): Promise<Pedido>;

  /**
   * Obtiene un pedido por su identificador único.
   * @param id - Identificador único del pedido
   * @returns El pedido encontrado o null si no existe
   */
  obtenerPorId(id: string): Promise<Pedido | null>;

  /**
   * Obtiene un pedido por su número visible.
   * @param numero - Número de pedido visible al usuario
   * @returns El pedido encontrado o null si no existe
   */
  obtenerPorNumero(numero: string): Promise<Pedido | null>;

  /**
   * Lista todos los pedidos con un estado específico.
   * @param estado - Estado del pedido a filtrar
   * @returns Lista de pedidos en el estado indicado
   */
  listarPorEstado(estado: EstadoPedido): Promise<Pedido[]>;

  /**
   * Lista los pedidos de un cliente con paginación.
   * @param clienteId - Identificador del cliente
   * @param paginacion - Parámetros de paginación
   * @returns Resultado paginado de pedidos del cliente
   */
  listarPorCliente(clienteId: string, paginacion: Paginacion): Promise<PedidoPaginado>;

  /**
   * Lista los pedidos dentro de un período de tiempo.
   * @param inicio - Fecha de inicio del período
   * @param fin - Fecha de fin del período
   * @returns Lista de pedidos en el período
   */
  listarPorPeriodo(inicio: Date, fin: Date): Promise<Pedido[]>;

  /**
   * Cuenta los pedidos dentro de un período de tiempo.
   * Útil para reportes y cortes financieros.
   * @param inicio - Fecha de inicio del período
   * @param fin - Fecha de fin del período
   * @returns Número total de pedidos en el período
   */
  contarPorPeriodo(inicio: Date, fin: Date): Promise<number>;
}
