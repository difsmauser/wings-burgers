import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';

// Force dynamic rendering since we use request.url
export const dynamic = 'force-dynamic';

/**
 * GET /api/pedidos/mesa?mesaZona=Mesa 1 - Interior
 * Returns all active (non-paid, non-cancelled) orders for a specific mesa.
 * Used by the client tracker to show all accumulated orders for a table session.
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

    const supabase = createServerClient();

    // Fetch all active orders for this mesa (not cancelled, not fully paid+delivered)
    const { data, error } = await supabase
      .from('pedido')
      .select('*, pedido_detalle(*, producto:producto_id(nombre))')
      .eq('mesa_zona', mesaZona)
      .not('estado', 'in', '(cancelado)')
      .order('creado_en', { ascending: true });

    if (error) throw new Error(error.message);

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
      clienteId: p.cliente_id,
      creadoEn: p.creado_en,
      actualizadoEn: p.actualizado_en,
      items: (Array.isArray(p.pedido_detalle) ? p.pedido_detalle : []).map((d: Record<string, unknown>) => ({
        productoId: d.producto_id,
        nombre: (d.producto as Record<string, unknown> | null)?.nombre || 'Producto',
        cantidad: d.cantidad,
        precioUnitario: d.precio_unitario,
        precioTotal: d.precio_total,
        comentario: d.comentario,
        personalizaciones: d.personalizaciones ?? [],
      })),
    }));

    return NextResponse.json({ data: pedidos });
  } catch (error) {
    return handleApiError(error);
  }
}
