import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pedidos/[id]/estado
 * Retorna SOLO el estado actual del pedido, directo de la DB sin cache ni SDK.
 * Endpoint ligero para el tracker del cliente.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Direct fetch to Supabase REST API — zero caching, zero SDK
  const res = await fetch(
    `${supabaseUrl}/rest/v1/pedido?id=eq.${id}&select=id,estado,mesa_zona,modalidad,total,numero`,
    {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const data = await res.json();
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const pedido = data[0];
  return NextResponse.json({
    data: {
      id: pedido.id,
      estado: pedido.estado,
      mesaZona: pedido.mesa_zona,
      modalidad: pedido.modalidad,
      total: pedido.total,
      numero: pedido.numero,
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    }
  });
}
