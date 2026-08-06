import { Pedido, EstadoPedido, ArticuloInventario } from '@/shared/domain-types';
import { ResultadoEnvio } from '@/shared/types';

/**
 * Puerto de servicio para notificaciones del sistema.
 * Define las operaciones disponibles para enviar notificaciones
 * en tiempo real a los diferentes actores del sistema.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface INotificacionService {
  /**
   * Notifica al vendedor sobre un nuevo pedido recibido.
   * Incluye alerta visual y sonido audible.
   * @param pedido - Pedido recién creado
   */
  notificarNuevoPedido(pedido: Pedido): Promise<void>;

  /**
   * Notifica al cliente sobre un cambio de estado en su pedido.
   * @param pedidoId - Identificador del pedido
   * @param nuevoEstado - Nuevo estado del pedido
   */
  notificarCambioEstado(pedidoId: string, nuevoEstado: EstadoPedido): Promise<void>;

  /**
   * Notifica al administrador que un artículo de inventario
   * alcanzó o bajó del nivel mínimo configurado.
   * @param articulo - Artículo con inventario bajo
   */
  notificarInventarioBajo(articulo: ArticuloInventario): Promise<void>;

  /**
   * Notifica que hay un pedido listo para entrega y se requiere repartidor.
   * @param pedidoId - Identificador del pedido listo para entrega
   */
  notificarRepartidorDisponible(pedidoId: string): Promise<void>;

  /**
   * Envía una notificación push a un usuario específico.
   * @param usuarioId - Identificador del usuario destinatario
   * @param titulo - Título de la notificación
   * @param cuerpo - Contenido de la notificación
   * @returns Resultado del envío con estado y posible error
   */
  enviarPush(usuarioId: string, titulo: string, cuerpo: string): Promise<ResultadoEnvio>;
}
