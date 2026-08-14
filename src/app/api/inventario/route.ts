export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../_lib/errorHandler';
import { getContainer } from '@/shared/container';

/**
 * GET /api/inventario
 * Lista artículos de inventario. Opcionalmente filtra los que están bajo mínimo.
 *
 * Query params:
 * - bajoMinimo: "true" para listar solo artículos bajo nivel mínimo
 *
 * Requirements: 4.1, 4.3
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bajoMinimo = searchParams.get('bajoMinimo') === 'true';

    const container = getContainer();
    const inventarioRepo = container.getInventarioRepository();

    let articulos;
    if (bajoMinimo) {
      articulos = await inventarioRepo.listarBajoMinimo();
    } else {
      // List all items - query directly since repository only exposes listarBajoMinimo
      const { createServerClient } = await import('@/adapters/driven/persistence/supabase/SupabaseClient');
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('articulo_inventario')
        .select()
        .order('nombre', { ascending: true });

      if (error) throw new Error(error.message);

      articulos = (data ?? []).map((record: any) => ({
        id: record.id,
        nombre: record.nombre,
        cantidad: record.cantidad,
        unidad: record.unidad_medida,
        nivelMinimo: record.nivel_minimo,
        productoIds: [],
        creadoEn: new Date(record.actualizado_en),
        actualizadoEn: new Date(record.actualizado_en),
      }));
    }

    return NextResponse.json({ data: articulos }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/inventario
 * Registra un nuevo artículo de inventario.
 * Auth is handled by the admin UI middleware — API is open.
 *
 * Body (JSON):
 * - nombre: string (requerido, max 100)
 * - cantidad: number (requerido, 0-999999)
 * - unidadMedida: string (requerido)
 * - nivelMinimo: number (requerido, >= 1)
 *
 * Requirements: 4.1, 4.7
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const container = getContainer();
    const registrarArticulo = container.getRegistrarArticulo();

    const articulo = await registrarArticulo.ejecutar({
      id: crypto.randomUUID(),
      nombre: body.nombre,
      cantidad: body.cantidad,
      unidadMedida: body.unidadMedida,
      nivelMinimo: body.nivelMinimo,
    });

    return NextResponse.json({ data: articulo }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
