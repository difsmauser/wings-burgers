export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';

/**
 * POST /api/pagos/efectivo
 * Registra que el cliente eligió pagar en efectivo.
 * Actualiza el método de pago en la DB y notifica via Supabase Realtime
 * al panel de caja/mesero.
 *
 * Body: { pedidoId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pedidoId } = body;

    if (!pedidoId || typeof pedidoId !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Se requiere pedidoId' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Verificar que el pedido existe
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}&select=id,estado,metodo_pago,estado_pago,mesa_zona,mesero_id,observaciones`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    );

    if (!getRes.ok) {
      return NextResponse.json(
        { error: { message: 'Error al consultar pedido' } },
        { status: 500 }
      );
    }

    const pedidos = await getRes.json();
    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json(
        { error: { message: 'Pedido no encontrado' } },
        { status: 404 }
      );
    }

    const pedido = pedidos[0];

    // Si ya está pagado, no hacer nada
    if (pedido.estado_pago === 'pagado') {
      return NextResponse.json({
        data: { message: 'Pedido ya está pagado', pedidoId },
      });
    }

    // Actualizar metodo_pago a "efectivo" y estado_pago a "esperando_mesero"
    // También guardar billete en observaciones si viene
    const billeteInfo = body.billete && body.billete > 0
      ? `[EFECTIVO] Paga con $${body.billete}`
      : '[EFECTIVO] Monto exacto';

    const obsExistentes = pedido.observaciones || '';
    const nuevasObs = obsExistentes.includes('[EFECTIVO]')
      ? obsExistentes
      : obsExistentes ? `${obsExistentes}\n${billeteInfo}` : billeteInfo;

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          metodo_pago: 'efectivo',
          estado_pago: 'esperando_mesero',
          observaciones: nuevasObs,
          actualizado_en: new Date().toISOString(),
        }),
        cache: 'no-store',
      }
    );

    if (!updateRes.ok) {
      return NextResponse.json(
        { error: { message: 'Error al actualizar método de pago' } },
        { status: 500 }
      );
    }

    // Insertar una notificación en tabla (si existe) para que caja/mesero la vea
    // Usamos un canal de Supabase Realtime indirectamente al actualizar la tabla
    // El panel de caja ya hace polling/subscribe a cambios en pedidos

    return NextResponse.json({
      data: {
        message: 'Pago en efectivo registrado. Se notificó a caja.',
        pedidoId,
        metodoPago: 'efectivo',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
