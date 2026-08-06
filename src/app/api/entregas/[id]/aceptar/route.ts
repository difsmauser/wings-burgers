import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';

/**
 * POST /api/entregas/[id]/aceptar
 * Acepta una entrega pendiente. Valida límite de 3 entregas activas.
 * Requirements: 14.2, 14.5
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const container = getContainer();
    const useCase = container.getAceptarEntrega();
    await useCase.ejecutar(id);

    return NextResponse.json({
      data: { message: 'Entrega aceptada', entregaId: id },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
