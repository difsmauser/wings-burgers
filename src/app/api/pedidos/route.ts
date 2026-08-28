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
      .select('*, pedido_detalle(*, producto:producto_id(nombre,categoria))')
      .order('creado_en', { ascending: false });

    if (estado) {
      query = query.eq('estado', estado);
    } else {
      query = query.eq('estado', 'recibido');
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Map to include product names in items
    const pedidos = (data ?? []).map((p: Record<string, unknown>) => {
      // Extraer URL de comprobante de observaciones si existe
      const obs = (p.observaciones as string) || '';
      const comprobanteMatch = obs.match(/\[COMPROBANTE\]\s*(https?:\/\/\S+)/);
      const comprobanteUrl = comprobanteMatch ? comprobanteMatch[1] : null;

      return {
        id: p.id,
        numero: p.numero,
        estado: p.estado,
        modalidad: p.modalidad,
        canal: p.canal || null,
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
        comprobanteUrl,
        items: (Array.isArray(p.pedido_detalle) ? p.pedido_detalle : []).map((d: Record<string, unknown>) => ({
          productoId: d.producto_id,
          nombre: (d.producto as Record<string, unknown> | null)?.nombre || 'Producto',
          categoria: (d.producto as Record<string, unknown> | null)?.categoria || '',
          cantidad: d.cantidad,
          precioUnitario: d.precio_unitario,
          precioTotal: d.precio_total,
          comentario: d.comentario,
          personalizaciones: d.personalizaciones ?? [],
          itemEstado: d.item_estado || 'pendiente',
      })),
    };
    });

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
    if (!['local', 'domicilio', 'retiro'].includes(modalidadRaw)) {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Modalidad debe ser "local", "retiro" o "domicilio"' } },
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

    // Determine the sales channel (5 channels)
    const rawCanal = body.canal as string | undefined;
    const modalidadLower = (body.modalidad as string || 'local').toLowerCase();
    const hasMesa = !!body.mesaZona;

    let canalVenta: string;
    if (modalidadLower === 'domicilio') {
      canalVenta = 'DOMICILIO';
    } else if (rawCanal === 'MESERO') {
      canalVenta = 'MESERO';
    } else if (rawCanal === 'PARA_LLEVAR' || modalidadLower === 'retiro') {
      canalVenta = hasMesa ? 'MESA_LLEVAR' : 'MOSTRADOR';
    } else {
      // QR mesa or default local
      canalVenta = 'MESA_LOCAL';
    }

    // Observaciones: clean, no channel prefixes
    const observaciones = (body.observaciones || '').trim();

    const pedido = await useCase.ejecutar({
      nombre: body.nombre,
      telefono: body.telefono,
      modalidad: (() => {
        if (modalidadLower === 'domicilio') return ModalidadServicio.DOMICILIO;
        return ModalidadServicio.LOCAL;
      })(),
      items: body.items,
      mesaZona: body.mesaZona,
      observaciones,
    });

    // Save the canal field and update the order number prefix
    try {
      const supabase = createServerClient();
      // Generate proper prefix based on channel
      const prefixMap: Record<string, string> = {
        MESA_LOCAL: 'MES', MESA_LLEVAR: 'LLEVAR', MOSTRADOR: 'LLEVAR', DOMICILIO: 'DOM', MESERO: 'MES',
      };
      const prefix = prefixMap[canalVenta] || 'PED';
      const currentNumero = pedido.numero as string;
      // Replace the prefix part (e.g., PED-20260819-1234 → MES-20260819-1234)
      const datePart = currentNumero.replace(/^[A-Z]+-/, '');
      const newNumero = `${prefix}-${datePart}`;

      await supabase
        .from('pedido')
        .update({ canal: canalVenta, numero: newNumero })
        .eq('id', pedido.id);

      // Ensure comments and personalizaciones are saved on items
      // (bypass domain entity limitation — save directly from frontend payload)
      if (body.items && Array.isArray(body.items)) {
        const { data: detalles } = await supabase
          .from('pedido_detalle')
          .select('id, producto_id')
          .eq('pedido_id', pedido.id)
          .order('id');

        if (detalles && detalles.length === body.items.length) {
          for (let i = 0; i < detalles.length; i++) {
            const frontendItem = body.items[i];
            const updateFields: Record<string, unknown> = {};
            if (frontendItem.comentario) updateFields.comentario = frontendItem.comentario;
            if (frontendItem.personalizaciones && Array.isArray(frontendItem.personalizaciones) && frontendItem.personalizaciones.length > 0) {
              updateFields.personalizaciones = frontendItem.personalizaciones;
            }
            if (Object.keys(updateFields).length > 0) {
              await supabase
                .from('pedido_detalle')
                .update(updateFields)
                .eq('id', detalles[i].id);
            }
          }
        }
      }
    } catch {
      // Non-critical — canal defaults to MESA_LOCAL in DB
    }

    // Mark mesa as occupied if order includes mesaZona (QR-based order)
    if (body.mesaZona) {
      try {
        const supabase = createServerClient();
        const mesaNombre = body.mesaZona.split(' - ')[0];
        await supabase
          .from('mesa')
          .update({ estado: 'ocupada' })
          .ilike('nombre', mesaNombre)
          .in('estado', ['disponible', 'ocupada']);
      } catch {
        // Non-critical
      }
    }

    // If order was taken by a mesero (canal=MESERO or DOMICILIO via mesero), auto-assign that mesero
    if ((canalVenta === 'MESERO' || canalVenta === 'DOMICILIO') && body.meseroNombre) {
      try {
        const supabase = createServerClient();
        await supabase
          .from('pedido')
          .update({ mesero_nombre: body.meseroNombre })
          .eq('id', pedido.id);
      } catch {
        // Non-critical — mesero name is best-effort
      }
    }

    return NextResponse.json({ data: pedido }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
