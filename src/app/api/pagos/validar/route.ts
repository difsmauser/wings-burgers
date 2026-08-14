import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pagos/validar
 * Caja valida un comprobante de pago.
 * Marca el comprobante como validado, todos los pedidos de la mesa como pagados,
 * y libera la mesa automáticamente.
 * 
 * Body: { comprobanteId: string, pedidoId: string, mesaZona: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { comprobanteId, pedidoId, mesaZona } = await request.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

    // 1. Mark comprobante as validated
    if (comprobanteId) {
      await fetch(`${supabaseUrl}/rest/v1/comprobante_pago?id=eq.${comprobanteId}`, {
        method: 'PATCH', headers, cache: 'no-store',
        body: JSON.stringify({ estado: 'validado' }),
      });
    }

    // 2. Mark ALL pedidos for this mesa as pagado
    if (mesaZona) {
      await fetch(`${supabaseUrl}/rest/v1/pedido?mesa_zona=eq.${encodeURIComponent(mesaZona)}&estado_pago=neq.pagado`, {
        method: 'PATCH', headers, cache: 'no-store',
        body: JSON.stringify({ estado_pago: 'pagado', metodo_pago: 'transferencia' }),
      });
    } else if (pedidoId) {
      await fetch(`${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}`, {
        method: 'PATCH', headers, cache: 'no-store',
        body: JSON.stringify({ estado_pago: 'pagado' }),
      });
    }

    // 3. Liberate the mesa
    if (mesaZona) {
      const mesaNombre = mesaZona.split(' - ')[0]; // "Mesa 1 - Interior" → "Mesa 1"
      // Find mesa by name and set to disponible
      const findRes = await fetch(
        `${supabaseUrl}/rest/v1/mesa?nombre=ilike.${encodeURIComponent(mesaNombre)}&select=id`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
      );
      const mesaArr = await findRes.json();
      if (mesaArr && mesaArr.length > 0) {
        await fetch(`${supabaseUrl}/rest/v1/mesa?id=eq.${mesaArr[0].id}`, {
          method: 'PATCH', headers, cache: 'no-store',
          body: JSON.stringify({ estado: 'disponible', pedido_activo_id: null }),
        });
      }
    }

    return NextResponse.json({ data: { success: true, message: 'Pago validado, mesa liberada' } });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}
