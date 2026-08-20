import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pedidos/mesa?mesaZona=Mesa 1 - Interior
 * Returns all active (non-paid, non-cancelled) orders for a specific mesa.
 * Uses direct fetch to Supabase REST API (no SDK cache).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mesaZona = searchParams.get('mesaZona');

    if (!mesaZona) {
      return NextResponse.json(
        { error: { message: 'mesaZona es requerido' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Direct fetch — no SDK, no cache
    const res = await fetch(
      `${supabaseUrl}/rest/v1/pedido?mesa_zona=eq.${encodeURIComponent(mesaZona)}&estado=neq.cancelado&select=id,numero,estado,modalidad,canal,total,subtotal,impuestos,mesa_zona,observaciones,estado_pago,metodo_pago,mesero_id,mesero_nombre,cliente_id,creado_en,actualizado_en,pedido_detalle(producto_id,cantidad,precio_unitario,precio_total,comentario,personalizaciones,item_estado,producto:producto_id(nombre,categoria,imagen))&order=creado_en.asc`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: { message: errBody } }, { status: res.status });
    }

    const data = await res.json();

    // Map to frontend format
    const pedidos = (data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id,
      numero: p.numero,
      estado: p.estado,
      modalidad: p.modalidad,
      total: p.total,
      subtotal: p.subtotal,
      impuestos: p.impuestos,
      mesaZona: p.mesa_zona,
      observaciones: p.observaciones,
      estadoPago: p.estado_pago,
      metodoPago: p.metodo_pago,
      meseroId: p.mesero_id,
      meseroNombre: p.mesero_nombre,
      clienteId: p.cliente_id,
      creadoEn: p.creado_en,
      actualizadoEn: p.actualizado_en,
      items: (Array.isArray(p.pedido_detalle) ? p.pedido_detalle : []).map((d: Record<string, unknown>) => ({
        productoId: d.producto_id,
        nombre: (d.producto as Record<string, unknown> | null)?.nombre || 'Producto',
        categoria: (d.producto as Record<string, unknown> | null)?.categoria || '',
        imagenUrl: (d.producto as Record<string, unknown> | null)?.imagen || null,
        cantidad: d.cantidad,
        precioUnitario: d.precio_unitario,
        precioTotal: d.precio_total,
        comentario: d.comentario,
        personalizaciones: d.personalizaciones ?? [],
        itemEstado: d.item_estado || 'pendiente',
      })),
    }));

    return NextResponse.json({ data: pedidos }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
