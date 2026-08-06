import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../_lib/errorHandler';
import { verificarAutenticacion, verificarRol } from '../_lib/auth';
import { getContainer } from '@/shared/container';
import type { Categoria } from '@/shared/domain-types';

/**
 * GET /api/productos
 * Lista productos activos con filtros opcionales por categoría.
 *
 * Query params:
 * - categoria: filtrar por categoría (alitas, hamburguesas, bebidas, otros)
 *
 * Requirements: 1.1, 1.5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria') as Categoria | null;

    const container = getContainer();
    const productoRepo = container.getProductoRepository();

    let productos;
    if (categoria) {
      productos = await productoRepo.listarPorCategoria(categoria);
    } else {
      productos = await productoRepo.listarActivos();
    }

    return NextResponse.json({ data: productos }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/productos
 * Crea un nuevo producto en el catálogo.
 * Solo accesible por el rol 'admin'.
 *
 * Body (JSON):
 * - nombre: string (requerido, max 100)
 * - descripcion?: string (max 500)
 * - categoria: Categoria (requerido)
 * - precio: number (requerido, 0.01-99999.99)
 * - opcionesPersonalizacion?: OpcionPersonalizacion[]
 *
 * Requirements: 1.1, 1.6
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
    const crearProducto = container.getCrearProducto();

    const producto = await crearProducto.ejecutar({
      nombre: body.nombre,
      descripcion: body.descripcion,
      categoria: body.categoria,
      precio: body.precio,
      opcionesPersonalizacion: body.opcionesPersonalizacion,
    });

    return NextResponse.json({ data: producto }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
