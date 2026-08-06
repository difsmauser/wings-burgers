import type { IPedidoRepository } from '@/domain/ports/repositories';
import type { IPagoGateway } from '@/domain/ports/services';
import type { PreferenciaPago } from '@/shared/types';
import { RecursoNoEncontradoError, PagoFallidoError } from '@/shared/errors';

/**
 * Caso de uso: Iniciar un pago mediante MercadoPago.
 * Obtiene el pedido, crea una preferencia de pago en el gateway y retorna la URL de redirección.
 *
 * Requirements: 13.1, 13.2
 */
export class IniciarPagoMercadoPago {
  constructor(
    private readonly pedidoRepo: IPedidoRepository,
    private readonly pagoGateway: IPagoGateway
  ) {}

  /**
   * Ejecuta el caso de uso.
   * @param pedidoId - Identificador del pedido a pagar
   * @returns Preferencia de pago con URL de redirección a MercadoPago
   * @throws RecursoNoEncontradoError si el pedido no existe
   * @throws PagoFallidoError si no se puede crear la preferencia
   */
  async ejecutar(pedidoId: string): Promise<PreferenciaPago> {
    // 1. Obtener pedido
    const pedido = await this.pedidoRepo.obtenerPorId(pedidoId);

    if (!pedido) {
      throw new RecursoNoEncontradoError('Pedido', pedidoId);
    }

    // 2. Crear preferencia de pago en MercadoPago con el total del pedido
    try {
      const preferencia = await this.pagoGateway.crearPreferencia(pedido);
      return preferencia;
    } catch (error) {
      if (error instanceof RecursoNoEncontradoError || error instanceof PagoFallidoError) {
        throw error;
      }
      throw new PagoFallidoError(
        pedidoId,
        error instanceof Error ? error.message : 'Error al crear preferencia de pago'
      );
    }
  }
}
