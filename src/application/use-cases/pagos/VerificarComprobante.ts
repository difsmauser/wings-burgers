import type { IPedidoRepository } from '@/domain/ports/repositories';
import type { INotificacionService } from '@/domain/ports/services';
import type { EstadoPedido } from '@/shared/domain-types';
import { RecursoNoEncontradoError, ValidacionError } from '@/shared/errors';

/**
 * Caso de uso: Verificar un comprobante de transferencia bancaria.
 * El administrador aprueba o rechaza el comprobante subido por el cliente.
 * Si se aprueba, el estadoPago pasa a PAGADO y se notifica al cliente.
 * Si se rechaza, el estadoPago pasa a RECHAZADO y se notifica al cliente con el motivo.
 *
 * Requirements: 13.5, 13.7
 */
export class VerificarComprobante {
  constructor(
    private readonly pedidoRepo: IPedidoRepository,
    private readonly notificacionService: INotificacionService
  ) {}

  /**
   * Ejecuta la verificación del comprobante.
   * @param pedidoId - Identificador del pedido cuyo comprobante se verifica
   * @param aprobado - true si el admin aprueba, false si rechaza
   * @param motivo - Motivo del rechazo (obligatorio si aprobado es false)
   * @throws RecursoNoEncontradoError si el pedido no existe
   * @throws ValidacionError si se rechaza sin motivo
   */
  async ejecutar(pedidoId: string, aprobado: boolean, motivo?: string): Promise<void> {
    // 1. Validar que si se rechaza, haya un motivo
    if (!aprobado && (!motivo || motivo.trim().length === 0)) {
      throw new ValidacionError(
        'Se requiere un motivo al rechazar el comprobante',
        ['motivo']
      );
    }

    // 2. Obtener pedido
    const pedido = await this.pedidoRepo.obtenerPorId(pedidoId);

    if (!pedido) {
      throw new RecursoNoEncontradoError('Pedido', pedidoId);
    }

    if (aprobado) {
      // 3a. Aprobar: actualizar estadoPago a PAGADO
      await this.pedidoRepo.actualizar(pedido.id, {
        estado: 'pagado' as EstadoPedido,
      });

      // Notificar al cliente que su pago fue confirmado
      await this.notificacionService.notificarCambioEstado(
        pedido.id,
        'pagado' as EstadoPedido
      );
    } else {
      // 3b. Rechazar: actualizar estadoPago a RECHAZADO
      await this.pedidoRepo.actualizar(pedido.id, {
        estado: 'pago_rechazado' as EstadoPedido,
      });

      // Notificar al cliente indicando el motivo del rechazo
      await this.notificacionService.enviarPush(
        pedido.clienteId,
        'Comprobante rechazado',
        `Tu comprobante de pago fue rechazado: ${motivo!.trim()}. Por favor sube un nuevo comprobante.`
      );
    }
  }
}
