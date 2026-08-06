import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';

/**
 * GET /api/entregas
 * Lista entregas pendientes disponibles para repartidores.
 * Requirements: 14.1
 */
export async function GET(_request: NextRequest) {
  try {
    const container = getContainer();
    const entregaRepo = container.getEntregaRepository();
    const entregas = await entregaRepo.listarPendientes();

    return NextResponse.json({ data: entregas });
  } catch (error) {
    return handleApiError(error);
  }
}
