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
    `${supabaseUrl}/rest/v1/pedido?id=eq.${id}&select=id,estado,mesa_zona,modalidad,total,numero,mesero_nombre,pedido_detalle(item_estado,producto:producto_id(categoria))`,
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

  // Compute station progress from items
  const barCategories = ['bar', 'bebidas'];
  const detalles = Array.isArray(pedido.pedido_detalle) ? pedido.pedido_detalle : [];
  const cocinaItems = detalles.filter((d: Record<string, unknown>) => {
    const cat = (d.producto as Record<string, unknown> | null)?.categoria as string || '';
    return !barCategories.includes(cat);
  });
  const barItems = detalles.filter((d: Record<string, unknown>) => {
    const cat = (d.producto as Record<string, unknown> | null)?.categoria as string || '';
    return barCategories.includes(cat);
  });

  const getStationStatus = (items: Array<Record<string, unknown>>): string | null => {
    if (items.length === 0) return null; // No items for this station
    const estados = items.map(i => (i.item_estado as string) || 'pendiente');
    if (estados.every(e => e === 'listo')) return 'listo';
    if (estados.some(e => e === 'preparando' || e === 'listo')) return 'preparando';
    return 'pendiente';
  };

  return NextResponse.json({
    data: {
      id: pedido.id,
      estado: pedido.estado,
      mesaZona: pedido.mesa_zona,
      modalidad: pedido.modalidad,
      total: pedido.total,
      numero: pedido.numero,
      meseroNombre: pedido.mesero_nombre,
      estaciones: {
        cocina: getStationStatus(cocinaItems),
        bar: getStationStatus(barItems),
      },
    }
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    }
  });
}
