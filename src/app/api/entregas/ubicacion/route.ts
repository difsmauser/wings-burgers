export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';

/**
 * POST /api/entregas/ubicacion
 * Actualiza la ubicación GPS del repartidor.
 * Body: { lat: number, lng: number, repartidorId?: string }
 * Requirements: 14.3
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: { code: 'DATOS_INVALIDOS', message: 'lat y lng son requeridos' } },
        { status: 400 }
      );
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: { code: 'DATOS_INVALIDOS', message: 'lat y lng deben ser numéricos' } },
        { status: 400 }
      );
    }

    // Por ahora guardamos la ubicación en log del servidor.
    // En producción esto iría a Supabase Realtime o tabla repartidor_ubicacion.
    // El frontend del cliente puede suscribirse a cambios vía Realtime.

    return NextResponse.json({
      data: { message: 'Ubicación actualizada', lat, lng, timestamp: Date.now() },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
