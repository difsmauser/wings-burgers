import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { ValidacionError } from '@/shared/errors';
import type { FiltroCliente } from '@/shared/types';

/**
 * GET /api/clientes
 * Lista clientes con filtros opcionales.
 *
 * Query params:
 *   - nombre?: string (búsqueda parcial)
 *   - pedidosMinimos?: number (pedidos en últimos 30 días)
 *   - montoTotalMin?: number (monto total gastado mínimo)
 *   - pagina?: number (default 1)
 *   - porPagina?: number (default 50)
 *
 * @requirements 6.4, 6.5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filtros: FiltroCliente = {};

    const nombre = searchParams.get('nombre');
    if (nombre) {
      filtros.nombre = nombre;
    }

    const pedidosMinimos = searchParams.get('pedidosMinimos');
    if (pedidosMinimos) {
      const parsed = parseInt(pedidosMinimos, 10);
      if (isNaN(parsed) || parsed < 0) {
        throw new ValidacionError('pedidosMinimos debe ser un número entero positivo', ['pedidosMinimos']);
      }
      filtros.pedidosMinimos = parsed;
    }

    const montoTotalMin = searchParams.get('montoTotalMin');
    if (montoTotalMin) {
      const parsed = parseFloat(montoTotalMin);
      if (isNaN(parsed) || parsed < 0) {
        throw new ValidacionError('montoTotalMin debe ser un número positivo', ['montoTotalMin']);
      }
      filtros.montoTotalMin = parsed;
    }

    const pagina = searchParams.get('pagina');
    const porPagina = searchParams.get('porPagina');

    filtros.paginacion = {
      pagina: pagina ? parseInt(pagina, 10) || 1 : 1,
      porPagina: porPagina ? parseInt(porPagina, 10) || 50 : 50,
    };

    const container = getContainer();
    const clienteRepo = container.getClienteRepository();
    const clientes = await clienteRepo.listar(filtros);

    return NextResponse.json({ data: clientes });
  } catch (error) {
    return handleApiError(error);
  }
}
