import { Pedido } from '@/domain/entities';
import { Precio, EstadoPedido, ModalidadServicio } from '@/domain/value-objects';
import type { IPedidoRepository, IInventarioRepository } from '@/domain/ports';
import type { INotificacionService } from '@/domain/ports';
import { RecursoNoEncontradoError, ValidacionError } from '@/shared/errors';

/**
 * Caso de uso: Confirmar un pedido.
 *
 * Valida que el pedido tenga items y modalidad definida,
 * transiciona a EN_PREPARACION, decrementa inventario
 * y notifica al vendedor.
 *
 * Requirements: 7.5, 7.6
 */
export class ConfirmarPedido {
  constructor(
    private readonly pedidoRepo: IPedidoRepository,
    private readonly inventarioRepo: IInventarioRepository,
    private readonly notificacionService: INotificacionService
  ) {}

  /**
   * Ejecuta la confirmación del pedido.
   * @param pedidoId - Identificador único del pedido a confirmar
   * @throws RecursoNoEncontradoError si el pedido no existe
   * @throws ValidacionError si el pedido no tiene items, modalidad, o no está en estado RECIBIDO
   */
  async ejecutar(pedidoId: string): Promise<void> {
    // 1. Obtener el pedido
    const pedidoData = await this.pedidoRepo.obtenerPorId(pedidoId);
    if (!pedidoData) {
      throw new RecursoNoEncontradoError('Pedido', pedidoId);
    }

    // 2. Reconstruir entidad de dominio
    const pedido = reconstruirPedido(pedidoData);

    // 3. Validar que tiene modalidad
    if (!pedido.modalidad) {
      throw new ValidacionError(
        'No se puede confirmar un pedido sin modalidad de servicio',
        ['modalidad']
      );
    }

    // 4. Confirmar el pedido (valida items y transiciona a EN_PREPARACION)
    pedido.confirmar();

    // 5. Decrementar inventario para cada item del pedido
    for (const item of pedido.items) {
      const articulos = await this.inventarioRepo.obtenerArticulosPorProducto(item.productoId);
      for (const articulo of articulos) {
        await this.inventarioRepo.actualizar(
          articulo.id,
          articulo.cantidad - item.cantidad,
          'salida',
          'sistema'
        );
      }
    }

    // 6. Persistir el cambio de estado
    await this.pedidoRepo.actualizar(pedidoId, {
      estado: 'en_preparacion',
      actualizadoEn: new Date(),
    });

    // 7. Notificar al vendedor sobre el pedido confirmado
    await this.notificacionService.notificarCambioEstado(
      pedidoId,
      EstadoPedido.EN_PREPARACION.toLowerCase() as import('@/shared/domain-types').EstadoPedido
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
      personalizaciones: (item.personalizaciones ?? []).map((p) => ({ nombre: p, opcion: p })),
      comentario: item.comentario ?? null,
    })) ?? [],
  });
}
