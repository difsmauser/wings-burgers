export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';

/**
 * POST /api/pagos/efectivo/confirmar
 * Confirma el cobro en efectivo desde caja.
 * Registra el billete con el que pagó el cliente y el cambio entregado.
 *
 * Body: {
 *   pedidoIds: string[],  // IDs de los pedidos de la cuenta
 *   billete: number,      // Monto del billete (0 = exacto)
 *   cambio: number,       // Cambio entregado
 *   total: number         // Total cobrado
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pedidoIds, billete, cambio, total, nota } = body;

    if (!Array.isArray(pedidoIds) || pedidoIds.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Se requiere al menos un pedidoId' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Construir texto a agregar a observaciones
    let datosCobro: string;
    if (nota) {
      // Viene del mesero confirmando que recogió dinero
      datosCobro = nota;
    } else {
      // Viene de caja confirmando el cobro final
      datosCobro = `[COBRO_EFECTIVO] Billete: $${billete || 'exacto'} | Cambio: $${cambio || 0} | Total: $${total}`;
    }

    // Actualizar cada pedido con la nota
    for (const pedidoId of pedidoIds) {
      const getRes = await fetch(
        `${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}&select=observaciones`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: 'no-store',
        }
      );

      let obsExistentes = '';
      if (getRes.ok) {
        const data = await getRes.json();
        if (data && data.length > 0) {
          obsExistentes = data[0].observaciones || '';
        }
      }

      // No duplicar si ya tiene la misma marca
      if (nota && obsExistentes.includes('[MESERO_ENTREGO]')) {
        continue;
      }

      const nuevasObs = obsExistentes
        ? `${obsExistentes} ${datosCobro}`
        : datosCobro;

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
            observaciones: nuevasObs,
            actualizado_en: new Date().toISOString(),
          }),
          cache: 'no-store',
        }
      );
    }

    return NextResponse.json({
      data: {
        message: nota ? 'Mesero confirmó dinero recogido' : 'Cobro en efectivo registrado',
        pedidoIds,
        billete,
        cambio,
        total,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
