import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../../_lib/errorHandler';
import { verificarAutenticacion, verificarRol } from '../../_lib/auth';
import { getContainer } from '@/shared/container';
import { RecursoNoEncontradoError } from '@/shared/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/productos/[id]
 * Obtiene un producto por su ID.
 *
 * Requirements: 1.1
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const container = getContainer();
    const productoRepo = container.getProductoRepository();

    const producto = await productoRepo.obtenerPorId(id);
    if (!producto) {
      throw new RecursoNoEncontradoError('Producto', id);
    }

    return NextResponse.json({ data: producto }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/productos/[id]
 * Actualiza un producto existente.
 * Solo accesible por el rol 'admin'.
 *
 * Requirements: 1.2, 1.3
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

    // 4. Ejecutar caso de uso
    const container = getContainer();
    const editarProducto = container.getEditarProducto();

    const producto = await editarProducto.ejecutar(id, {
      nombre: body.nombre,
      descripcion: body.descripcion,
      categoria: body.categoria,
      precio: body.precio,
      eliminarImagen: body.eliminarImagen,
      opcionesPersonalizacion: body.opcionesPersonalizacion,
    });

    return NextResponse.json({ data: producto }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/productos/[id]
 * Elimina un producto (soft delete - marca como inactivo).
 * Solo accesible por el rol 'admin'.
 *
 * Requirements: 1.3
 */
export async function DELETE(
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

    // 3. Ejecutar caso de uso
    const container = getContainer();
    const eliminarProducto = container.getEliminarProducto();
    await eliminarProducto.ejecutar(id);

    return NextResponse.json(
      { data: { message: 'Producto eliminado correctamente' } },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
