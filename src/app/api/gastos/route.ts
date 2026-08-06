import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { ValidacionError } from '@/shared/errors';
import { CategoriaGasto } from '@/domain/value-objects';
import type { FiltroGasto } from '@/shared/types';

/**
 * GET /api/gastos
 * Consulta gastos con filtros opcionales.
 *
 * Query params:
 *   - categoria?: string
 *   - fechaInicio?: string (ISO date)
 *   - fechaFin?: string (ISO date)
 *   - montoMin?: number
 *   - montoMax?: number
 *
 * @requirements 3.3
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filtros: FiltroGasto = {};

    const categoria = searchParams.get('categoria');
    if (categoria) {
      filtros.categoria = categoria;
    }

    const fechaInicio = searchParams.get('fechaInicio');
    if (fechaInicio) {
      const parsed = new Date(fechaInicio);
      if (isNaN(parsed.getTime())) {
        throw new ValidacionError('fechaInicio debe ser una fecha ISO válida', ['fechaInicio']);
      }
      filtros.fechaInicio = parsed;
    }

    const fechaFin = searchParams.get('fechaFin');
    if (fechaFin) {
      const parsed = new Date(fechaFin);
      if (isNaN(parsed.getTime())) {
        throw new ValidacionError('fechaFin debe ser una fecha ISO válida', ['fechaFin']);
      }
      filtros.fechaFin = parsed;
    }

    const montoMin = searchParams.get('montoMin');
    if (montoMin) {
      const parsed = parseFloat(montoMin);
      if (isNaN(parsed)) {
        throw new ValidacionError('montoMin debe ser un número válido', ['montoMin']);
      }
      filtros.montoMin = parsed;
    }

    const montoMax = searchParams.get('montoMax');
    if (montoMax) {
      const parsed = parseFloat(montoMax);
      if (isNaN(parsed)) {
        throw new ValidacionError('montoMax debe ser un número válido', ['montoMax']);
      }
      filtros.montoMax = parsed;
    }

    const container = getContainer();
    const useCase = container.getConsultarGastos();
    const gastos = await useCase.ejecutar(filtros);

    return NextResponse.json({ data: gastos });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/gastos
 * Registra un nuevo gasto en el sistema.
 *
 * Body: { monto: number, concepto: string, categoria: string, fecha: string (ISO), adminId: string }
 *
 * @requirements 3.1
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { monto, concepto, categoria, fecha, adminId } = body;

    if (monto === undefined || typeof monto !== 'number') {
      throw new ValidacionError('Se requiere el campo monto (número)', ['monto']);
    }

    if (!concepto || typeof concepto !== 'string') {
      throw new ValidacionError('Se requiere el campo concepto', ['concepto']);
    }

    if (!categoria || typeof categoria !== 'string') {
      throw new ValidacionError('Se requiere el campo categoria', ['categoria']);
    }

    // Validar que la categoría sea un valor válido del enum
    if (!Object.values(CategoriaGasto).includes(categoria as CategoriaGasto)) {
      throw new ValidacionError(
        `Categoría inválida. Valores permitidos: ${Object.values(CategoriaGasto).join(', ')}`,
        ['categoria']
      );
    }

    if (!fecha || typeof fecha !== 'string') {
      throw new ValidacionError('Se requiere el campo fecha (ISO string)', ['fecha']);
    }

    const fechaParsed = new Date(fecha);
    if (isNaN(fechaParsed.getTime())) {
      throw new ValidacionError('fecha debe ser una fecha ISO válida', ['fecha']);
    }

    if (!adminId || typeof adminId !== 'string') {
      throw new ValidacionError('Se requiere el campo adminId', ['adminId']);
    }

    const container = getContainer();
    const useCase = container.getRegistrarGasto();
    const gasto = await useCase.ejecutar({
      id: crypto.randomUUID(),
      monto,
      concepto,
      categoria: categoria as CategoriaGasto,
      fecha: fechaParsed,
      adminId,
    });

    return NextResponse.json(
      {
        data: {
          id: gasto.id,
          monto: gasto.monto.valor,
          concepto: gasto.concepto,
          categoria: gasto.categoria,
          fecha: gasto.fecha,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
