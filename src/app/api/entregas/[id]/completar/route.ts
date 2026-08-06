import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';

/**
 * POST /api/entregas/[id]/completar
 * Marca una entrega como completada exitosamente.
 * Requirements: 14.5
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const container = getContainer();
    const useCase = container.getCompletarEntrega();
    await useCase.ejecutar(id);

    return NextResponse.json({
      data: { message: 'Entrega completada', entregaId: id },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
