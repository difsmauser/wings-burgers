import type { INotificacionService } from '@/domain/ports/services';
import type { EstadoPedido } from '@/shared/domain-types';

/**
 * Caso de uso: Notificar al cliente sobre un cambio de estado en su pedido.
 *
 * Envía una notificación push al cliente dentro de los 10 segundos siguientes
 * al cambio de estado, incluyendo el nombre del pedido y el nuevo estado.
 * Si el cliente tiene la aplicación abierta, se muestra en pantalla.
 *
 * Requirements: 19.2
 */
export class NotificarCambioEstado {
  constructor(
    private readonly notificacionService: INotificacionService
  ) {}

  /**
   * Ejecuta la notificación de cambio de estado al cliente.
   * @param pedidoId - Identificador del pedido cuyo estado cambió
   * @param nuevoEstado - Nuevo estado del pedido
   */
  async ejecutar(pedidoId: string, nuevoEstado: EstadoPedido): Promise<void> {
    await this.notificacionService.notificarCambioEstado(pedidoId, nuevoEstado);
  }
}
