import { Pedido } from '@/domain/entities';
import { Precio, EstadoPedido, ModalidadServicio } from '@/domain/value-objects';
import type { IPedidoRepository, IProductoRepository } from '@/domain/ports';
import { RecursoNoEncontradoError, ProductoNoDisponibleError } from '@/shared/errors';

/**
 * Caso de uso: Agregar un producto a un pedido existente.
 *
 * Busca el pedido por número, verifica que el producto esté activo,
 * agrega el item al pedido, recalcula el total y persiste los cambios.
 *
 * Requirements: 7.3
 */
export class AgregarProductoAPedido {
  constructor(
    private readonly pedidoRepo: IPedidoRepository,
    private readonly productoRepo: IProductoRepository
  ) {}

  /**
   * Ejecuta la adición de un producto al pedido.
   * @param numeroPedido - Número visible del pedido
   * @param productoId - Identificador del producto a agregar
   * @param cantidad - Cantidad a agregar (mínimo 1)
   * @throws RecursoNoEncontradoError si el pedido o producto no existe
   * @throws ProductoNoDisponibleError si el producto no está activo
   * @throws ValidacionError si el pedido no permite modificaciones
   */
  async ejecutar(numeroPedido: string, productoId: string, cantidad: number): Promise<void> {
    // 1. Buscar pedido por número
    const pedidoData = await this.pedidoRepo.obtenerPorNumero(numeroPedido);
    if (!pedidoData) {
      throw new RecursoNoEncontradoError('Pedido', numeroPedido);
    }

    // 2. Verificar que el producto exista y esté activo
    const producto = await this.productoRepo.obtenerPorId(productoId);
    if (!producto) {
      throw new RecursoNoEncontradoError('Producto', productoId);
    }
    if (!producto.activo) {
      throw new ProductoNoDisponibleError(productoId);
    }

    // 3. Reconstruir entidad de dominio
    const pedido = reconstruirPedido(pedidoData);

    // 4. Agregar item al pedido (valida estado y recalcula total internamente)
    pedido.agregarItem(
      { id: producto.id, nombre: producto.nombre, precio: Precio.crear(producto.precio) },
      cantidad
    );

    // 5. Persistir los cambios
    await this.pedidoRepo.actualizar(pedidoData.id, {
      items: pedido.items.map((item) => ({
        productoId: item.productoId,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario.valor,
        personalizaciones: item.personalizaciones.map((p) => p.nombre),
        comentario: item.comentario ?? undefined,
      })),
      total: pedido.total.valor,
      actualizadoEn: new Date(),
    });
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
