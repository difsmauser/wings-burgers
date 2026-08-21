export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { WHATSAPP_TEMPLATES } from '@/adapters/driven/messaging/WhatsAppAdapter';

/**
 * POST /api/pedidos/[id]/ticket
 * Envía el recibo/ticket del pedido al cliente vía WhatsApp.
 *
 * Busca el pedido con sus items y datos del cliente, genera un resumen
 * formateado y lo envía al teléfono registrado del cliente.
 *
 * Body (opcional): { telefono?: string } — override del teléfono del cliente
 *
 * @requirements 15.1
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Obtener pedido con items y datos del cliente
    const res = await fetch(
      `${supabaseUrl}/rest/v1/pedido?id=eq.${id}&select=id,numero,estado,modalidad,canal,subtotal,impuestos,total,mesa_zona,observaciones,metodo_pago,estado_pago,creado_en,cliente_id,pedido_detalle(cantidad,precio_unitario,precio_total,comentario,personalizaciones,producto:producto_id(nombre))`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: { message: 'Error al obtener pedido' } },
        { status: 500 }
      );
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: { message: 'Pedido no encontrado' } },
        { status: 404 }
      );
    }

    const pedido = data[0];

    // Obtener teléfono del cliente
    let telefonoDestino = body.telefono || '';

    if (!telefonoDestino && pedido.cliente_id) {
      const clienteRes = await fetch(
        `${supabaseUrl}/rest/v1/cliente?id=eq.${pedido.cliente_id}&select=nombre,telefono`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: 'no-store',
        }
      );

      if (clienteRes.ok) {
        const clientes = await clienteRes.json();
        if (clientes && clientes.length > 0) {
          telefonoDestino = clientes[0].telefono || '';
        }
      }
    }

    if (!telefonoDestino) {
      return NextResponse.json(
        { error: { code: 'SIN_TELEFONO', message: 'No se encontró teléfono del cliente. Envía el campo "telefono" en el body.' } },
        { status: 400 }
      );
    }

    // Construir resumen del pedido
    const items = Array.isArray(pedido.pedido_detalle) ? pedido.pedido_detalle : [];
    const lineasResumen = items.map((item: Record<string, unknown>) => {
      const nombre = (item.producto as Record<string, unknown> | null)?.nombre || 'Producto';
      const cantidad = item.cantidad as number;
      const precioTotal = item.precio_total as number;
      const personalizaciones = item.personalizaciones as Array<{ opcion: string }> | null;
      const extras = personalizaciones && personalizaciones.length > 0
        ? ` (${personalizaciones.map(p => p.opcion).join(', ')})`
        : '';
      return `  ${cantidad}x ${nombre}${extras} — $${precioTotal}`;
    });

    const resumen = lineasResumen.join('\n');
    const totalFormateado = String(pedido.total);

    // Obtener nombre del cliente
    let nombreCliente = 'Cliente';
    if (pedido.cliente_id) {
      const clienteRes = await fetch(
        `${supabaseUrl}/rest/v1/cliente?id=eq.${pedido.cliente_id}&select=nombre`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: 'no-store',
        }
      );
      if (clienteRes.ok) {
        const clientes = await clienteRes.json();
        if (clientes && clientes.length > 0 && clientes[0].nombre) {
          nombreCliente = clientes[0].nombre;
        }
      }
    }

    // Generar mensaje del ticket
    const fecha = new Date(pedido.creado_en).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const metodoPago = pedido.metodo_pago || 'pendiente';
    const estadoPago = pedido.estado_pago || 'pendiente';

    const mensaje =
      `🍔 *A-la Burguer — Ticket #${pedido.numero}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📅 ${fecha}\n` +
      `📋 Canal: ${pedido.canal || pedido.modalidad}\n` +
      (pedido.mesa_zona ? `📍 ${pedido.mesa_zona}\n` : '') +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `*Detalle:*\n${resumen}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      (pedido.subtotal !== pedido.total
        ? `  Subtotal: $${pedido.subtotal}\n  Impuestos: $${pedido.impuestos}\n`
        : '') +
      `  💰 *TOTAL: $${totalFormateado}*\n\n` +
      `💳 Método: ${metodoPago}\n` +
      `📌 Estado pago: ${estadoPago}\n\n` +
      `¡Gracias por tu preferencia, ${nombreCliente}! 🙏`;

    // Enviar por WhatsApp
    const container = getContainer();
    const mensajeria = container.getMensajeriaService();
    const resultado = await mensajeria.enviarWhatsApp(telefonoDestino, mensaje);

    if (!resultado.exitoso) {
      return NextResponse.json(
        {
          error: {
            code: 'WHATSAPP_ERROR',
            message: resultado.error || 'Error al enviar WhatsApp',
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: {
        message: 'Ticket enviado por WhatsApp',
        pedidoId: id,
        telefono: telefonoDestino,
        mensajeId: resultado.mensajeId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
