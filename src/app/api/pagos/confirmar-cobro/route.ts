export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/pagos/confirmar-cobro
 * Marca uno o más pedidos como pagados.
 * Endpoint que NO requiere auth (usa service role key directo).
 * 
 * Body: {
 *   pedidoIds: string[],
 *   metodoPago: 'efectivo' | 'transferencia',
 *   billete?: number,
 *   cambio?: number,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pedidoIds, metodoPago, billete, cambio, rechazar } = body;

    if (!Array.isArray(pedidoIds) || pedidoIds.length === 0) {
      return NextResponse.json(
        { error: { message: 'pedidoIds es requerido' } },
        { status: 400 }
      );
    }

    if (!metodoPago || !['efectivo', 'transferencia'].includes(metodoPago)) {
      return NextResponse.json(
        { error: { message: 'metodoPago debe ser efectivo o transferencia' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Si es rechazo, volver a pendiente
    if (rechazar) {
      for (const pedidoId of pedidoIds) {
        await fetch(
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
              estado_pago: 'pendiente',
              actualizado_en: new Date().toISOString(),
            }),
            cache: 'no-store',
          }
        );
      }
      return NextResponse.json({ data: { message: 'Transferencia rechazada', pedidoIds } });
    }

    // Actualizar cada pedido como pagado
    for (const pedidoId of pedidoIds) {
      // Construir observaciones adicionales si hay billete/cambio
      let obsExtra = '';
      if (metodoPago === 'efectivo' && billete !== undefined) {
        obsExtra = ` [COBRO_CAJA] Billete: $${billete} | Cambio: $${cambio || 0}`;
      }

      // Leer observaciones actuales
      const getRes = await fetch(
        `${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}&select=observaciones`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: 'no-store',
        }
      );

      let obs = '';
      if (getRes.ok) {
        const data = await getRes.json();
        if (data?.[0]) obs = data[0].observaciones || '';
      }

      const nuevasObs = obsExtra ? (obs ? `${obs} ${obsExtra}` : obsExtra) : obs;

      // Actualizar pedido
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
            estado_pago: 'pagado',
            metodo_pago: metodoPago,
            observaciones: nuevasObs,
            actualizado_en: new Date().toISOString(),
          }),
          cache: 'no-store',
        }
      );

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return NextResponse.json(
          { error: { message: `Error al marcar pedido ${pedidoId}: ${errText}` } },
          { status: 500 }
        );
      }
    }

    // Enviar ticket por WhatsApp automáticamente al confirmar pago
    // Se hace best-effort (no bloquea si falla)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      for (const pedidoId of pedidoIds) {
        fetch(`${baseUrl}/api/pedidos/${pedidoId}/ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).catch(() => {}); // Fire and forget
      }
    } catch { /* best-effort */ }

    return NextResponse.json({
      data: {
        message: 'Pago confirmado',
        pedidoIds,
        metodoPago,
        billete: billete || null,
        cambio: cambio || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
