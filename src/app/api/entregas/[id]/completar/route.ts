export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/entregas/[id]/completar
 * Repartidor confirma que entregó el pedido.
 * Cambia estado de la entrega a 'entregado' + pedido a 'entregado'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Obtener pedido_id de la entrega
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/entrega?id=eq.${id}&select=pedido_id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
    );

    let pedidoId: string | null = null;
    if (getRes.ok) {
      const data = await getRes.json();
      if (data?.[0]) pedidoId = data[0].pedido_id;
    }

    // Actualizar entrega a 'entregado'
    await fetch(
      `${supabaseUrl}/rest/v1/entrega?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          estado: 'entregado',
          completada_en: new Date().toISOString(),
        }),
        cache: 'no-store',
      }
    );

    // Actualizar pedido a 'entregado'
    if (pedidoId) {
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
            estado: 'entregado',
            actualizado_en: new Date().toISOString(),
          }),
          cache: 'no-store',
        }
      );
    }

    return NextResponse.json({
      data: { message: 'Entrega completada', entregaId: id, pedidoId },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
