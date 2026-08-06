import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../../../_lib/errorHandler';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/productos/[id]/historial-precios
 * Obtiene el historial de cambios de precio de un producto.
 * Retorna los registros ordenados por fecha descendente.
 *
 * Requirements: 2.2
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const supabase = createServerClient();
    const { data: historial, error } = await supabase
      .from('historial_precio')
      .select('*')
      .eq('producto_id', id)
      .order('fecha_cambio', { ascending: false });

    if (error) {
      throw new Error(`Error obteniendo historial de precios: ${error.message}`);
    }

    return NextResponse.json({ data: historial ?? [] }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
