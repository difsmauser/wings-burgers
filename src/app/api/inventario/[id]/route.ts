import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../../_lib/errorHandler';
import { verificarAutenticacion, verificarRol } from '../../_lib/auth';
import { getContainer } from '@/shared/container';
import { ValidacionError } from '@/shared/errors';
import type { TipoMovimiento } from '@/shared/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/inventario/[id]
 * Actualiza la cantidad de un artículo de inventario.
 * Solo accesible por el rol 'admin'.
 *
 * Body (JSON):
 * - cantidad: number (requerido, > 0)
 * - tipoMovimiento: 'entrada' | 'salida' (requerido)
 *
 * Requirements: 4.3
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

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

    // 4. Validar campos requeridos del request
    if (!body.cantidad || !body.tipoMovimiento) {
      throw new ValidacionError(
        'Se requiere cantidad y tipoMovimiento',
        ['cantidad', 'tipoMovimiento'].filter(campo => !body[campo])
      );
    }

    const tiposValidos: TipoMovimiento[] = ['entrada', 'salida'];
    if (!tiposValidos.includes(body.tipoMovimiento)) {
      throw new ValidacionError(
        'tipoMovimiento debe ser "entrada" o "salida"',
        ['tipoMovimiento']
      );
    }

    // 5. Ejecutar caso de uso
    const container = getContainer();
    const actualizarCantidad = container.getActualizarCantidad();

    const articulo = await actualizarCantidad.ejecutar(
      id,
      body.cantidad,
      body.tipoMovimiento as TipoMovimiento,
      authResult.usuario.id
    );

    return NextResponse.json({ data: articulo }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
