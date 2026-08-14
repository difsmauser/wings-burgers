export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';

/**
 * POST /api/webhooks/mercadopago
 * Webhook callback para recibir notificaciones de pago de MercadoPago.
 * No requiere autenticación (webhooks vienen directamente de MercadoPago).
 *
 * Body: payload crudo de MercadoPago (varía según tipo de notificación)
 * Returns: 200 OK si se procesó correctamente
 *
 * @requirements 13.4
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const container = getContainer();
    const useCase = container.getConfirmarPago();
    await useCase.ejecutar(payload);

    return NextResponse.json({ data: { received: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
