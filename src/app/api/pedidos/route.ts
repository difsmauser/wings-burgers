import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';
import type { EstadoPedido } from '@/shared/domain-types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pedidos?estado=recibido
 * Lista pedidos filtrados por estado.
 * Joins pedido_detalle with producto to include product names.
 * Requirements: 7.1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') as EstadoPedido | null;

    const supabase = createServerClient();

    let query = supabase
      .from('pedido')
      .select('*, pedido_detalle(*, producto:producto_id(nombre))')
      .order('creado_en', { ascending: false });

    if (estado) {
      query = query.eq('estado', estado);
    } else {
      query = query.eq('estado', 'recibido');
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Map to include product names in items
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

/**
 * POST /api/pedidos
 * Crea un nuevo pedido.
 * Requirements: 7.1, 7.3, 7.4
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const container = getContainer();
    const useCase = container.getCrearPedido();

    // Store canal info in observaciones field as prefix: [CANAL:XX]
    const canal = body.canal as string | undefined;
    let observaciones = body.observaciones || '';
    if (canal && ['QR', 'QR_REDES', 'MESERO'].includes(canal)) {
      observaciones = `[${canal}] ${observaciones}`.trim();
    }

    const pedido = await useCase.ejecutar({
      nombre: body.nombre,
      telefono: body.telefono,
      modalidad: body.modalidad,
      items: body.items,
      mesaZona: body.mesaZona,
      observaciones,
    });

    // Mark mesa as occupied if order includes mesaZona (QR-based order)
    if (body.mesaZona) {
      try {
        const supabase = createServerClient();
        // mesaZona format is "Mesa 1 - Interior" → extract "Mesa 1" part
        const mesaNombre = body.mesaZona.split(' - ')[0];
        // Only mark as occupied if not already occupied (don't overwrite pedido_activo_id for multi-order)
        await supabase
          .from('mesa')
          .update({ estado: 'ocupada' })
          .ilike('nombre', mesaNombre)
          .in('estado', ['disponible', 'ocupada']);
      } catch {
        // Non-critical: don't fail the order if mesa update fails
      }
    }

    // If order was taken by a mesero (canal=MESERO), auto-assign that mesero
    if (canal === 'MESERO' && body.meseroNombre) {
      try {
        const supabase = createServerClient();
        await supabase
          .from('pedido')
          .update({ mesero_id: body.meseroNombre, mesero_nombre: body.meseroNombre })
          .eq('id', pedido.id);
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({ data: pedido }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
