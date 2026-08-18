import { Pedido } from '@/domain/entities';
import { Precio, EstadoPedido, ModalidadServicio } from '@/domain/value-objects';
import type { IPedidoRepository } from '@/domain/ports';
import type { INotificacionService } from '@/domain/ports';
import { RecursoNoEncontradoError } from '@/shared/errors';

/**
 * Caso de uso: Actualizar el estado de un pedido.
 *
 * Valida que la transición de estado sea válida según la máquina de estados
 * del dominio, actualiza el estado y emite notificación al cliente.
 *
 * Requirements: 7.4, 7.5
 */
export class ActualizarEstadoPedido {
  constructor(
    private readonly pedidoRepo: IPedidoRepository,
    private readonly notificacionService: INotificacionService
  ) {}

  /**
   * Ejecuta la actualización de estado del pedido.
   * @param pedidoId - Identificador único del pedido
   * @param nuevoEstado - Nuevo estado destino
   * @throws RecursoNoEncontradoError si el pedido no existe
   * @throws TransicionEstadoInvalidaError si la transición no es válida
   */
  async ejecutar(pedidoId: string, nuevoEstado: EstadoPedido): Promise<void> {
    // 1. Obtener el pedido existente
    const pedidoData = await this.pedidoRepo.obtenerPorId(pedidoId);
    if (!pedidoData) {
      throw new RecursoNoEncontradoError('Pedido', pedidoId);
    }

    // 2. Reconstruir entidad de dominio para validar transición
    const pedido = reconstruirPedido(pedidoData);

    // 3. Validar y ejecutar transición (lanza TransicionEstadoInvalidaError si es inválida)
    pedido.cambiarEstado(nuevoEstado);

    // 4. Persistir el cambio de estado
    await this.pedidoRepo.actualizar(pedidoId, {
      estado: nuevoEstado.toLowerCase() as 'recibido' | 'en_preparacion' | 'empacado' | 'listo_para_servir' | 'servido' | 'en_camino' | 'entregado',
      actualizadoEn: new Date(),
    });

    // 5. Notificar al cliente del cambio de estado
    await this.notificacionService.notificarCambioEstado(
      pedidoId,
      nuevoEstado.toLowerCase() as import('@/shared/domain-types').EstadoPedido
    );
  }
}

/**
 * Reconstruye una entidad Pedido desde los datos de persistencia.
 */
function reconstruirPedido(data: {
  id: string;
  numero: string;
  clienteId: string;
  estado: string;
  modalidad: string;
  items?: Array<{
    productoId: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    personalizaciones?: string[];
    comentario?: string;
  }>;
  total?: number;
  observaciones?: string;
}): Pedido {
  const estadoMap: Record<string, EstadoPedido> = {
    recibido: EstadoPedido.RECIBIDO,
    en_preparacion: EstadoPedido.EN_PREPARACION,
    empacado: EstadoPedido.EMPACADO,
    listo_para_servir: EstadoPedido.LISTO_PARA_SERVIR,
    servido: EstadoPedido.SERVIDO,
    en_camino: EstadoPedido.EN_CAMINO,
    entregado: EstadoPedido.ENTREGADO,
  };

  const modalidadMap: Record<string, ModalidadServicio> = {
    local: ModalidadServicio.LOCAL,
    domicilio: ModalidadServicio.DOMICILIO,
  };

  return Pedido.crear({
    id: data.id,
    numero: data.numero,
    clienteId: data.clienteId,
    estado: estadoMap[data.estado] ?? EstadoPedido.RECIBIDO,
    modalidad: modalidadMap[data.modalidad] ?? ModalidadServicio.LOCAL,
    items: data.items?.map((item) => ({
      id: crypto.randomUUID(),
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: Precio.crear(item.precioUnitario),
      personalizaciones: (item.personalizaciones ?? []).map((p: string) => ({ nombre: p, opcion: p })),
      comentario: item.comentario ?? null,
    })) ?? [],
  });
}
