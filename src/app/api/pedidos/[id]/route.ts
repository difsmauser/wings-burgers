import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { RecursoNoEncontradoError } from '@/shared/errors';
import { EstadoPedido } from '@/domain/value-objects';

/**
 * GET /api/pedidos/[id]
 * Obtiene un pedido por su ID.
 * Requirements: 7.1
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const container = getContainer();
    const pedidoRepo = container.getPedidoRepository();

    const pedido = await pedidoRepo.obtenerPorId(id);
    if (!pedido) {
      throw new RecursoNoEncontradoError('Pedido', id);
    }

    return NextResponse.json({ data: pedido });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/pedidos/[id]
 * Actualiza el estado de un pedido.
 * Body: { estado: "en_preparacion" | "empacado" | ... }
 * Requirements: 7.4, 14.2
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const estadoMap: Record<string, EstadoPedido> = {
      recibido: EstadoPedido.RECIBIDO,
      en_preparacion: EstadoPedido.EN_PREPARACION,
      empacado: EstadoPedido.EMPACADO,
      servido: EstadoPedido.SERVIDO,
      en_camino: EstadoPedido.EN_CAMINO,
      entregado: EstadoPedido.ENTREGADO,
    };

    const nuevoEstado = estadoMap[body.estado];
    if (!nuevoEstado) {
      return NextResponse.json(
        { error: { code: 'ESTADO_INVALIDO', message: `Estado no válido: ${body.estado}` } },
        { status: 400 }
      );
    }

    const container = getContainer();
    const useCase = container.getActualizarEstadoPedido();
    await useCase.ejecutar(id, nuevoEstado);

    return NextResponse.json({ data: { id, estado: body.estado } });
  } catch (error) {
    return handleApiError(error);
  }
}
