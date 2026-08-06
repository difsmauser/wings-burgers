import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { RecursoNoEncontradoError, ValidacionError } from '@/shared/errors';

/**
 * GET /api/clientes/[id]
 * Obtiene el detalle de un cliente con su historial de pedidos.
 *
 * Path params:
 *   - id: string (identificador del cliente)
 *
 * Query params:
 *   - pagina?: number (default 1, para historial de pedidos)
 *   - porPagina?: number (default 50, max 50 por página según Req 6.4)
 *
 * @requirements 6.4, 6.5
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      throw new ValidacionError('Se requiere el parámetro id', ['id']);
    }

    const container = getContainer();
    const clienteRepo = container.getClienteRepository();
    const pedidoRepo = container.getPedidoRepository();

    // Obtener cliente
    const cliente = await clienteRepo.obtenerPorId(id);

    if (!cliente) {
      throw new RecursoNoEncontradoError('Cliente', id);
    }

    // Obtener historial de pedidos paginado
    const { searchParams } = new URL(request.url);
    const pagina = parseInt(searchParams.get('pagina') || '1', 10);
    const porPagina = Math.min(parseInt(searchParams.get('porPagina') || '50', 10), 50);

    const historialPedidos = await pedidoRepo.listarPorCliente(id, {
      pagina,
      porPagina,
    });

    return NextResponse.json({
      data: {
        cliente,
        pedidos: historialPedidos,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
