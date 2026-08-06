import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../_lib/errorHandler';
import { verificarAutenticacion, verificarRol } from '../_lib/auth';
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
    // 1. Verificar autenticación
    const authResult = await verificarAutenticacion(request);
    if (!authResult.autenticado) {
      return authResult.respuesta;
    }

    // 2. Verificar autorización (solo admin)
    const errorRol = verificarRol(authResult.usuario, ['admin']);
    if (errorRol) return errorRol;

    const { searchParams } = new URL(request.url);
    const bajoMinimo = searchParams.get('bajoMinimo') === 'true';

    const container = getContainer();
    const inventarioRepo = container.getInventarioRepository();

    let articulos;
    if (bajoMinimo) {
      articulos = await inventarioRepo.listarBajoMinimo();
    } else {
      articulos = await inventarioRepo.listarBajoMinimo();
    }

    return NextResponse.json({ data: articulos }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/inventario
 * Registra un nuevo artículo de inventario.
 * Solo accesible por el rol 'admin'.
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
    // 1. Verificar autenticación
    const authResult = await verificarAutenticacion(request);
    if (!authResult.autenticado) {
      return authResult.respuesta;
    }

    // 2. Verificar autorización (solo admin)
    const errorRol = verificarRol(authResult.usuario, ['admin']);
    if (errorRol) return errorRol;

    // 3. Parsear body
    const body = await request.json();

    // 4. Ejecutar caso de uso
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
