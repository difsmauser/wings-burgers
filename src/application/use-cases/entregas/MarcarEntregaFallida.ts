import { Entrega } from '@/domain/entities';
import { EstadoEntrega } from '@/domain/value-objects';
import type { IEntregaRepository } from '@/domain/ports/repositories';
import type { IPedidoRepository } from '@/domain/ports/repositories';
import type { IGeolocalizacionService } from '@/domain/ports/services';
import { RecursoNoEncontradoError } from '@/shared/errors';

/**
 * Caso de uso: Marcar una entrega como fallida con motivo.
 * Actualiza el estado de la entrega a FALLIDO, registra el motivo,
 * actualiza el pedido a "entrega_fallida" y desactiva el rastreo GPS.
 */
export class MarcarEntregaFallida {
  constructor(
    private readonly entregaRepo: IEntregaRepository,
    private readonly pedidoRepo: IPedidoRepository,
    private readonly geoService: IGeolocalizacionService
  ) {}

  async ejecutar(entregaId: string, motivo: string): Promise<void> {
    // 1. Obtener la entrega
    const entregaData = await this.entregaRepo.obtenerPorId(entregaId);
    if (!entregaData) {
      throw new RecursoNoEncontradoError('Entrega', entregaId);
    }

    // 2. Reconstruir entidad de dominio
    const entrega = Entrega.crear({
      id: entregaData.id,
      pedidoId: entregaData.pedidoId,
      repartidorId: entregaData.repartidorId,
      estado: entregaData.estado as EstadoEntrega,
      motivoNoEntrega: entregaData.motivoNoEntrega,
      aceptadaEn: entregaData.aceptadaEn,
      completadaEn: entregaData.completadaEn,
      creadoEn: entregaData.creadoEn,
    });

    // 3. Marcar la entrega como fallida (transición de estado en dominio)
    entrega.marcarFallida(motivo);

    // 4. Persistir cambios de la entrega
    await this.entregaRepo.actualizar({
      id: entrega.id,
      pedidoId: entrega.pedidoId,
      repartidorId: entrega.repartidorId,
      estado: entrega.estado,
      motivoNoEntrega: entrega.motivoNoEntrega,
      aceptadaEn: entrega.aceptadaEn,
      completadaEn: entrega.completadaEn,
      creadoEn: entrega.creadoEn,
    });

    // 5. Actualizar estado del pedido a entrega_fallida
    await this.pedidoRepo.actualizar(entrega.pedidoId, {
      estado: 'entrega_fallida',
    } as any);

    // 6. Desactivar rastreo GPS
    await this.geoService.actualizarUbicacion(entrega.repartidorId, 0, 0);
  }
}
