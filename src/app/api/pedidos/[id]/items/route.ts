import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { RecursoNoEncontradoError } from '@/shared/errors';

/**
 * POST /api/pedidos/[id]/items
 * Agrega un producto a un pedido existente.
 * Body: { productoId: string, cantidad: number, numeroPedido: string }
 * Requirements: 7.3
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { productoId, cantidad, numeroPedido } = body;

    if (!productoId || !cantidad) {
      return NextResponse.json(
        { error: { code: 'DATOS_INVALIDOS', message: 'productoId y cantidad son requeridos' } },
        { status: 400 }
      );
    }

    const container = getContainer();
    const useCase = container.getAgregarProductoAPedido();

    if (numeroPedido) {
      await useCase.ejecutar(numeroPedido, productoId, cantidad);
    } else {
      // Buscar el pedido por ID para obtener su número
      const pedidoRepo = container.getPedidoRepository();
      const pedido = await pedidoRepo.obtenerPorId(id);
      if (!pedido) {
        throw new RecursoNoEncontradoError('Pedido', id);
      }
      await useCase.ejecutar(pedido.numero, productoId, cantidad);
    }

    return NextResponse.json(
      { data: { message: 'Producto agregado al pedido' } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/pedidos/[id]/items
 * Elimina un producto de un pedido existente.
 * Body: { detalleId: string }
 * Requirements: 7.3
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { detalleId } = body;

    if (!detalleId) {
      return NextResponse.json(
        { error: { code: 'DATOS_INVALIDOS', message: 'detalleId es requerido' } },
        { status: 400 }
      );
    }

    const container = getContainer();
    const pedidoRepo = container.getPedidoRepository();

    // Obtener el pedido y eliminar el item
    const pedido = await pedidoRepo.obtenerPorId(id);
    if (!pedido) {
      throw new RecursoNoEncontradoError('Pedido', id);
    }

    // Filtrar el item a eliminar y recalcular
    const itemsActualizados = (pedido.items ?? []).filter(
      (item) => item.productoId !== detalleId
    );

    const nuevoTotal = itemsActualizados.reduce(
      (sum, item) => sum + item.precioUnitario * item.cantidad,
      0
    );

    await pedidoRepo.actualizar(id, {
      items: itemsActualizados,
      total: nuevoTotal,
      actualizadoEn: new Date(),
    });

    return NextResponse.json({ data: { message: 'Producto eliminado del pedido' } });
  } catch (error) {
    return handleApiError(error);
  }
}
