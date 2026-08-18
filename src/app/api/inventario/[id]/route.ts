import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../../_lib/errorHandler';
import { requireAuth } from '../../_lib/auth';
import { isValidUUID } from '../../_lib/validation';
import { getContainer } from '@/shared/container';
import { ValidacionError } from '@/shared/errors';
import type { TipoMovimiento } from '@/shared/types';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/inventario/[id]
 * Actualiza la cantidad de un artículo de inventario.
 * Auth: admin
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, ['admin']);
  if ('respuesta' in auth) return auth.respuesta;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: { message: 'ID inválido' } }, { status: 400 });
    }

    const body = await request.json();

    if (body.cantidad === undefined || body.cantidad === null) {
      throw new ValidacionError(
        'Se requiere cantidad',
        ['cantidad']
      );
    }

    const container = getContainer();
    const inventarioRepo = container.getInventarioRepository();

    // Get current article to compute delta
    const articuloActual = await inventarioRepo.obtenerPorId(id);
    if (!articuloActual) {
      throw new ValidacionError('Artículo no encontrado', ['id']);
    }

    const nuevaCantidad = body.cantidad;
    const delta = nuevaCantidad - articuloActual.cantidad;

    if (delta === 0) {
      // No change needed
      return NextResponse.json({ data: articuloActual }, { status: 200 });
    }

    // Determine effective movement type based on delta
    const tipoMovimiento: TipoMovimiento = delta > 0 ? 'entrada' : 'salida';
    const cantidadDelta = Math.abs(delta);

    const actualizarCantidad = container.getActualizarCantidad();
    const articulo = await actualizarCantidad.ejecutar(
      id,
      cantidadDelta,
      tipoMovimiento,
      'admin' // Auth handled by middleware
    );

    return NextResponse.json({ data: articulo }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/inventario/[id]
 * Elimina un artículo de inventario.
 * Auth: admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, ['admin']);
  if ('respuesta' in auth) return auth.respuesta;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: { message: 'ID inválido' } }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('articulo_inventario')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: { code: 'DELETE_ERROR', message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
