import { Entrega } from '@/domain/entities';
import { EstadoEntrega } from '@/domain/value-objects';
import type { IEntregaRepository } from '@/domain/ports/repositories';
import type { IPedidoRepository } from '@/domain/ports/repositories';
import type { IGeolocalizacionService } from '@/domain/ports/services';
import { RecursoNoEncontradoError, LimiteEntregasExcedidoError } from '@/shared/errors';

const LIMITE_ENTREGAS_ACTIVAS = 3;

/**
 * Caso de uso: Aceptar una entrega asignada.
 * Valida que el repartidor no exceda el límite de 3 entregas concurrentes,
 * actualiza el estado a EN_CAMINO y activa el rastreo GPS.
 */
export class AceptarEntrega {
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

    // 3. Verificar límite de entregas activas del repartidor
    const entregasActivas = await this.entregaRepo.contarActivasPorRepartidor(
      entrega.repartidorId
    );
    if (entregasActivas >= LIMITE_ENTREGAS_ACTIVAS) {
      throw new LimiteEntregasExcedidoError(entrega.repartidorId, LIMITE_ENTREGAS_ACTIVAS);
    }

    // 4. Aceptar la entrega (transición de estado en dominio)
    entrega.aceptar();

    // 5. Persistir cambios de la entrega
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

    // 6. Actualizar estado del pedido a EN_CAMINO
    await this.pedidoRepo.actualizar(entrega.pedidoId, {
      estado: 'en_camino',
    } as any);

    // 7. Activar rastreo GPS (registrar ubicación inicial como 0,0 para activar)
    await this.geoService.actualizarUbicacion(entrega.repartidorId, 0, 0);
  }
}
