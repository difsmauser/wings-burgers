import type { IPedidoRepository } from '@/domain/ports/repositories';
import type { IPagoGateway, INotificacionService } from '@/domain/ports/services';
import type { EstadoPedido } from '@/shared/domain-types';
import { RecursoNoEncontradoError, PagoFallidoError } from '@/shared/errors';

/**
 * Caso de uso: Confirmar un pago recibido vía webhook de MercadoPago.
 * Verifica la firma del webhook a través del gateway, actualiza el estado de pago
 * del pedido a PAGADO y notifica al vendedor.
 *
 * Requirements: 13.4, 13.6
 */
export class ConfirmarPago {
  constructor(
    private readonly pedidoRepo: IPedidoRepository,
    private readonly pagoGateway: IPagoGateway,
    private readonly notificacionService: INotificacionService
  ) {}

  /**
   * Procesa un webhook de MercadoPago.
   * @param payload - Datos crudos recibidos del webhook
   * @throws RecursoNoEncontradoError si el pedido asociado no existe
   * @throws PagoFallidoError si el pago fue rechazado por el gateway
   */
  async ejecutar(payload: unknown): Promise<void> {
    // 1. Verificar firma y procesar webhook a través del gateway
    const notificacion = await this.pagoGateway.procesarWebhook(payload);

    // 2. Obtener el pedido asociado
    const pedido = await this.pedidoRepo.obtenerPorId(notificacion.pedidoId);

    if (!pedido) {
      throw new RecursoNoEncontradoError('Pedido', notificacion.pedidoId);
    }

    // 3. Evaluar estado del pago
    if (notificacion.estado === 'aprobado') {
      // Actualizar estadoPago a PAGADO
      await this.pedidoRepo.actualizar(pedido.id, {
        estado: 'pagado' as EstadoPedido,
      });

      // 4. Notificar al vendedor
      await this.notificacionService.notificarCambioEstado(
        pedido.id,
        'pagado' as EstadoPedido
      );
    } else if (notificacion.estado === 'rechazado') {
      // Actualizar estadoPago a RECHAZADO
      await this.pedidoRepo.actualizar(pedido.id, {
        estado: 'pago_rechazado' as EstadoPedido,
      });

      throw new PagoFallidoError(
        pedido.id,
        'El pago fue rechazado por MercadoPago'
      );
    }
    // Para estados 'pendiente' o 'en_proceso', no se actualiza nada
  }
}
