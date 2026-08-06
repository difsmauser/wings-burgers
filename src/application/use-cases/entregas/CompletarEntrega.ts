import { Entrega } from '@/domain/entities';
import { EstadoEntrega } from '@/domain/value-objects';
import type { IEntregaRepository } from '@/domain/ports/repositories';
import type { IPedidoRepository } from '@/domain/ports/repositories';
import type { IGeolocalizacionService } from '@/domain/ports/services';
import { RecursoNoEncontradoError } from '@/shared/errors';

/**
 * Caso de uso: Completar una entrega exitosamente.
 * Actualiza el estado de la entrega a ENTREGADO, el pedido a "entregado",
 * y desactiva el rastreo GPS del repartidor.
 */
export class CompletarEntrega {
  constructor(
    private readonly entregaRepo: IEntregaRepository,
    private readonly pedidoRepo: IPedidoRepository,
    private readonly geoService: IGeolocalizacionService
  ) {}

  async ejecutar(entregaId: string): Promise<void> {
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

    // 3. Completar la entrega (transición de estado en dominio)
    entrega.completar();

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

    // 5. Actualizar estado del pedido a ENTREGADO
    await this.pedidoRepo.actualizar(entrega.pedidoId, {
      estado: 'entregado',
    } as any);

    // 6. Desactivar rastreo GPS (limpiar ubicación del repartidor)
    await this.geoService.actualizarUbicacion(entrega.repartidorId, 0, 0);
  }
}
