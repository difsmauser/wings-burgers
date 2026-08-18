import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { requireAuth } from '@/app/api/_lib/auth';
import { getContainer } from '@/shared/container';
import { ValidacionError } from '@/shared/errors';
import { CategoriaGasto } from '@/domain/value-objects';
import type { FiltroGasto } from '@/shared/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gastos
 * Consulta gastos con filtros opcionales.
 * Auth: admin
 */
export async function GET(request: NextRequest) {
  // Auth: solo admin puede ver gastos
  const auth = await requireAuth(request, ['admin']);
  if ('respuesta' in auth) return auth.respuesta;

  try {
    const { searchParams } = new URL(request.url);
    const filtros: FiltroGasto = {};

    const categoria = searchParams.get('categoria');
    if (categoria) filtros.categoria = categoria;

    const fechaInicio = searchParams.get('fechaInicio');
    if (fechaInicio) {
      const parsed = new Date(fechaInicio);
      if (isNaN(parsed.getTime())) throw new ValidacionError('fechaInicio inválido', ['fechaInicio']);
      filtros.fechaInicio = parsed;
    }

    const fechaFin = searchParams.get('fechaFin');
    if (fechaFin) {
      const parsed = new Date(fechaFin);
      if (isNaN(parsed.getTime())) throw new ValidacionError('fechaFin inválido', ['fechaFin']);
      filtros.fechaFin = parsed;
    }

    const montoMin = searchParams.get('montoMin');
    if (montoMin) {
      const parsed = parseFloat(montoMin);
      if (isNaN(parsed)) throw new ValidacionError('montoMin inválido', ['montoMin']);
      filtros.montoMin = parsed;
    }

    const montoMax = searchParams.get('montoMax');
    if (montoMax) {
      const parsed = parseFloat(montoMax);
      if (isNaN(parsed)) throw new ValidacionError('montoMax inválido', ['montoMax']);
      filtros.montoMax = parsed;
    }

    const container = getContainer();
    const gastos = await container.getConsultarGastos().ejecutar(filtros);
    return NextResponse.json({ data: gastos });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/gastos
 * Registra un nuevo gasto.
 * Auth: admin
 * Body: { monto: number, concepto: string, categoria: string, fecha: string }
 */
export async function POST(request: NextRequest) {
  // Auth: solo admin puede registrar gastos
  const auth = await requireAuth(request, ['admin']);
  if ('respuesta' in auth) return auth.respuesta;

  try {
    const body = await request.json();
    const { monto, concepto, categoria, fecha } = body;
    const adminId = body.adminId || 'admin';

    if (monto === undefined || isNaN(parseFloat(String(monto)))) {
      throw new ValidacionError('Se requiere monto (número)', ['monto']);
    }
    const montoNum = parseFloat(String(monto));
    if (montoNum <= 0 || montoNum > 9999999.99) {
      throw new ValidacionError('Monto debe ser entre $0.01 y $9,999,999.99', ['monto']);
    }
    if (!concepto?.trim()) {
      throw new ValidacionError('Se requiere concepto', ['concepto']);
    }
    if (concepto.trim().length > 200) {
      throw new ValidacionError('Concepto no debe superar 200 caracteres', ['concepto']);
    }
    if (!categoria?.trim()) {
      throw new ValidacionError('Se requiere categoria', ['categoria']);
    }
    if (!fecha?.trim()) {
      throw new ValidacionError('Se requiere fecha (ISO)', ['fecha']);
    }

    const fechaParsed = new Date(fecha);
    if (isNaN(fechaParsed.getTime())) {
      throw new ValidacionError('fecha debe ser una fecha ISO válida', ['fecha']);
    }

    // Normalize category — accept lowercase (insumos) or uppercase (INSUMOS)
    const categoriaUpper = (categoria as string).toUpperCase();
    const categoriaEnum = (Object.values(CategoriaGasto).find(v => v === categoriaUpper) || CategoriaGasto.OTROS) as CategoriaGasto;

    const container = getContainer();
    const gasto = await container.getRegistrarGasto().ejecutar({
      id: crypto.randomUUID(),
      monto: parseFloat(String(monto)),
      concepto: concepto.trim(),
      categoria: categoriaEnum,
      fecha: fechaParsed,
      adminId,
    });

    return NextResponse.json(
      { data: { id: gasto.id, monto: gasto.monto.valor, concepto: gasto.concepto, categoria: gasto.categoria, fecha: gasto.fecha } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
