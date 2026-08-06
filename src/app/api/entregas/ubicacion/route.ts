import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';

/**
 * POST /api/entregas/ubicacion
 * Actualiza la ubicación GPS del repartidor.
 * Body: { repartidorId: string, lat: number, lng: number }
 * Requirements: 14.3
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { repartidorId, lat, lng } = body;

    if (!repartidorId || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: { code: 'DATOS_INVALIDOS', message: 'repartidorId, lat y lng son requeridos' } },
        { status: 400 }
      );
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: { code: 'DATOS_INVALIDOS', message: 'lat y lng deben ser numéricos' } },
        { status: 400 }
      );
    }

    const container = getContainer();
    const useCase = container.getActualizarUbicacion();
    await useCase.ejecutar(repartidorId, lat, lng);

    return NextResponse.json({
      data: { message: 'Ubicación actualizada', repartidorId, lat, lng },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
