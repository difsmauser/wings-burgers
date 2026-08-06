import type { INotificacionService } from '@/domain/ports/services';
import type { Pedido } from '@/shared/domain-types';

/**
 * Caso de uso: Notificar al vendedor sobre un nuevo pedido.
 *
 * Envía una alerta visual y sonido audible al vendedor cuando se recibe
 * un nuevo pedido en el sistema. La alerta persiste hasta que el vendedor
 * la reconozca manualmente o hasta un máximo de 5 minutos.
 *
 * Requirements: 19.1
 */
export class NotificarNuevoPedido {
  constructor(
    private readonly notificacionService: INotificacionService
  ) {}

  /**
   * Ejecuta la notificación de nuevo pedido al vendedor.
   * @param pedido - Pedido recién creado que se debe notificar
   */
  async ejecutar(pedido: Pedido): Promise<void> {
    await this.notificacionService.notificarNuevoPedido(pedido);
  }
}
