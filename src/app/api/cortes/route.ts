import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { ValidacionError } from '@/shared/errors';
import type { TipoCorte } from '@/domain/services';

export const dynamic = 'force-dynamic';

const TIPOS_VALIDOS: TipoCorte[] = ['diario', 'semanal', 'mensual'];

/**
 * GET /api/cortes
 * Genera un corte financiero por tipo y período.
 *
 * Query params:
 *   - tipo: 'diario' | 'semanal' | 'mensual' (requerido)
 *   - fecha?: string (ISO date, opcional, default: hoy)
 *
 * @requirements 5.1, 5.2, 5.3
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const tipo = searchParams.get('tipo') as TipoCorte | null;

    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      throw new ValidacionError(
        'Se requiere el parámetro tipo con valor: diario, semanal o mensual',
        ['tipo']
      );
    }

    let fecha: Date | undefined;
    const fechaParam = searchParams.get('fecha');

    if (fechaParam) {
      const parsed = new Date(fechaParam);
      if (isNaN(parsed.getTime())) {
        throw new ValidacionError('fecha debe ser una fecha ISO válida', ['fecha']);
      }
      fecha = parsed;
    }

    const container = getContainer();
    const useCase = container.getGenerarCorte();
    const corte = await useCase.ejecutar(tipo, fecha);

    return NextResponse.json({ data: corte });
  } catch (error) {
    return handleApiError(error);
  }
}
