import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { ValidacionError } from '@/shared/errors';

/**
 * POST /api/pagos/mercadopago
 * Inicia un pago mediante MercadoPago para un pedido.
 *
 * Body: { pedidoId: string }
 * Returns: PreferenciaPago con URL de redirección
 *
 * @requirements 13.1, 13.2
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pedidoId } = body;

    if (!pedidoId || typeof pedidoId !== 'string') {
      throw new ValidacionError('Se requiere el campo pedidoId', ['pedidoId']);
    }

    const container = getContainer();
    const useCase = container.getIniciarPagoMercadoPago();
    const preferencia = await useCase.ejecutar(pedidoId);

    return NextResponse.json({ data: preferencia }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
