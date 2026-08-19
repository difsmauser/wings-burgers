import { Pedido } from '@/domain/entities';
import { Cliente } from '@/domain/entities';
import { Precio, EstadoPedido, ModalidadServicio } from '@/domain/value-objects';
import type { IPedidoRepository, IClienteRepository, IInventarioRepository } from '@/domain/ports';
import type { INotificacionService } from '@/domain/ports';
import type { CrearPedidoDTO } from '@/application/dtos/PedidoDTO';
import type { Producto as ProductoData } from '@/shared/domain-types';
import { ValidacionError, ProductoNoDisponibleError } from '@/shared/errors';
import type { IProductoRepository } from '@/domain/ports';

/**
 * Caso de uso: Crear un nuevo pedido.
 *
 * Valida/crea cliente (nombre + teléfono requeridos), verifica disponibilidad
 * de productos, asigna número de pedido, crea el pedido en estado RECIBIDO,
 * decrementa inventario y notifica al vendedor.
 *
 * Requirements: 7.1, 7.2, 7.3, 4.6
 */
export class CrearPedido {
  constructor(
    private readonly pedidoRepo: IPedidoRepository,
    private readonly clienteRepo: IClienteRepository,
    private readonly inventarioRepo: IInventarioRepository,
    private readonly productoRepo: IProductoRepository,
    private readonly notificacionService: INotificacionService
  ) {}

  async ejecutar(input: CrearPedidoDTO): Promise<Pedido> {
    // 1. Validar campos obligatorios
    const errores: string[] = [];

    if (!input.nombre || input.nombre.trim().length === 0) {
      errores.push('nombre');
    }
    if (!input.telefono || input.telefono.trim().length === 0) {
      errores.push('telefono');
    }
    if (!input.modalidad) {
      errores.push('modalidad');
    }

    if (errores.length > 0) {
      throw new ValidacionError(
        `Datos inválidos para crear pedido: ${errores.join(', ')}`,
        errores
      );
    }

    // 2. Buscar o crear cliente por teléfono
    let clienteExistente = await this.clienteRepo.obtenerPorTelefono(input.telefono);

    if (!clienteExistente) {
      const nuevoCliente = Cliente.crear({
        id: crypto.randomUUID(),
        nombre: input.nombre.trim(),
        telefono: input.telefono.trim(),
      });

      clienteExistente = await this.clienteRepo.crear({
        id: nuevoCliente.id,
        nombre: nuevoCliente.nombre,
        telefono: nuevoCliente.telefono.valor,
        creadoEn: nuevoCliente.creadoEn,
        actualizadoEn: nuevoCliente.creadoEn,
      });
    }

    // 3. Verificar disponibilidad de productos si hay items iniciales
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const producto = await this.productoRepo.obtenerPorId(item.productoId);
        if (!producto || !producto.activo) {
          throw new ProductoNoDisponibleError(item.productoId);
        }

        // Verificar inventario para el producto
        const articulos = await this.inventarioRepo.obtenerArticulosPorProducto(item.productoId);
        for (const articulo of articulos) {
          if (articulo.cantidad < item.cantidad) {
            throw new ProductoNoDisponibleError(item.productoId);
          }
        }
      }
    }

    // 4. Generar número de pedido único con prefijo según modalidad/canal
    const numero = generarNumeroPedido(input.modalidad, input.observaciones);

    // 5. Crear entidad Pedido en estado RECIBIDO
    const pedido = Pedido.crear({
      id: crypto.randomUUID(),
      numero,
      clienteId: clienteExistente.id,
      estado: EstadoPedido.RECIBIDO,
      modalidad: input.modalidad,
      mesaZona: input.mesaZona ?? null,
      observaciones: input.observaciones ?? null,
    });

    // 6. Agregar items iniciales si existen
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const producto = (await this.productoRepo.obtenerPorId(item.productoId))!;
        pedido.agregarItem(
          { id: producto.id, nombre: producto.nombre, precio: Precio.crear(producto.precio) },
          item.cantidad,
          item.personalizaciones
        );
      }
    }

    // 7. Persistir pedido
    const pedidoData = mapearPedidoAData(pedido);
    await this.pedidoRepo.crear(pedidoData);

    // 8. Decrementar inventario para cada item
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
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
    }

    // 9. Notificar al vendedor
    await this.notificacionService.notificarNuevoPedido(pedidoData);

    return pedido;
  }
}

/**
 * Genera un número de pedido con prefijo según canal/modalidad:
 * - MES-YYYYMMDD-XXXX (mesa QR, local)
 * - DOM-YYYYMMDD-XXXX (domicilio)
 * - LLEVAR-YYYYMMDD-XXXX (para llevar/retiro)
 */
function generarNumeroPedido(modalidad?: unknown, observaciones?: string | null): string {
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const aleatorio = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');

  const mod = String(modalidad || '').toLowerCase();
  const obs = observaciones || '';

  let prefix = 'PED';
  if (mod === 'domicilio') {
    prefix = 'DOM';
  } else if (obs.includes('[PARA_LLEVAR]') || mod === 'retiro') {
    prefix = 'LLEVAR';
  } else if (obs.includes('[QR]') || obs.includes('[MESERO]') || mod === 'local') {
    prefix = 'MES';
  }

  return `${prefix}-${fecha}-${aleatorio}`;
}

/**
 * Mapea la entidad Pedido al tipo de datos de persistencia.
 */
function mapearPedidoAData(pedido: Pedido) {
  return {
    id: pedido.id,
    numero: pedido.numero,
    clienteId: pedido.clienteId,
    items: pedido.items.map((item) => ({
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario.valor,
      personalizaciones: item.personalizaciones.map((p) => p.nombre),
      comentario: item.comentario ?? undefined,
    })),
    estado: pedido.estado.toLowerCase() as 'recibido',
    modalidad: pedido.modalidad.toLowerCase() as 'local' | 'retiro' | 'domicilio',
    total: pedido.total.valor,
    mesaZona: pedido.mesaZona ?? undefined,
    observaciones: pedido.observaciones ?? undefined,
    creadoEn: pedido.creadoEn,
    actualizadoEn: pedido.actualizadoEn,
  };
}
