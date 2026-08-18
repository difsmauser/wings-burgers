import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/app/api/_lib/rateLimit';
import { getContainer } from '@/shared/container';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';
import { ModalidadServicio } from '@/domain/value-objects';
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
  // Rate limit: max 10 orders per minute per IP
  const ip = getClientIp(request);
  const rl = rateLimit(`pedidos:post:${ip}`, RATE_LIMITS.createOrder.max, RATE_LIMITS.createOrder.windowMs);
  if (rl.limited) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Intenta en un momento.' } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();

    // === INPUT VALIDATION ===
    // Validate nombre
    if (!body.nombre || typeof body.nombre !== 'string' || body.nombre.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Se requiere nombre del cliente' } },
        { status: 400 }
      );
    }
    if (body.nombre.length > 100) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Nombre no debe superar 100 caracteres' } },
        { status: 400 }
      );
    }

    // Validate telefono
    if (!body.telefono || typeof body.telefono !== 'string' || body.telefono.trim().length < 7) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Se requiere teléfono válido (mínimo 7 dígitos)' } },
        { status: 400 }
      );
    }
    if (body.telefono.length > 20) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Teléfono no debe superar 20 caracteres' } },
        { status: 400 }
      );
    }

    // Validate items
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Se requiere al menos un producto en el pedido' } },
        { status: 400 }
      );
    }
    if (body.items.length > 50) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'No se permiten más de 50 productos por pedido' } },
        { status: 400 }
      );
    }
    for (const item of body.items) {
      if (!item.productoId || typeof item.productoId !== 'string') {
        return NextResponse.json(
          { error: { code: 'VALIDACION', message: 'Cada item requiere productoId válido' } },
          { status: 400 }
        );
      }
      if (!item.cantidad || typeof item.cantidad !== 'number' || item.cantidad < 1 || item.cantidad > 99) {
        return NextResponse.json(
          { error: { code: 'VALIDACION', message: 'Cantidad debe ser entre 1 y 99' } },
          { status: 400 }
        );
      }
    }

    // Validate modalidad
    const modalidadRaw = (body.modalidad as string || 'local').toLowerCase();
    if (!['local', 'domicilio'].includes(modalidadRaw)) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Modalidad debe ser "local" o "domicilio"' } },
        { status: 400 }
      );
    }

    // Validate observaciones length
    if (body.observaciones && typeof body.observaciones === 'string' && body.observaciones.length > 500) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Observaciones no debe superar 500 caracteres' } },
        { status: 400 }
      );
    }

    const container = getContainer();
    const useCase = container.getCrearPedido();

    // Store canal info in observaciones field as prefix: [CANAL:XX]
    const canal = body.canal as string | undefined;
    let observaciones = body.observaciones || '';
    if (canal && ['QR', 'QR_REDES', 'MESERO', 'PARA_LLEVAR'].includes(canal)) {
      observaciones = `[${canal}] ${observaciones}`.trim();
    }

    const pedido = await useCase.ejecutar({
      nombre: body.nombre,
      telefono: body.telefono,
      modalidad: (() => {
        const m = (body.modalidad as string || 'local').toLowerCase();
        if (m === 'domicilio') return ModalidadServicio.DOMICILIO;
        return ModalidadServicio.LOCAL;
      })(),
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
