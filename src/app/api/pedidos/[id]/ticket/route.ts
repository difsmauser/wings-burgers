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

    // Generar mensaje del ticket — formato premium WhatsApp
    const fecha = new Date(pedido.creado_en).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Extraer dirección si existe en observaciones
    const dirMatch = (pedido.observaciones || '').match(/Dirección:\s*([^|[\n]+)/);
    const direccion = dirMatch ? dirMatch[1].trim() : '';
    const refMatch = (pedido.observaciones || '').match(/\(([^)]+)\)/);
    const referencia = refMatch ? refMatch[1].trim() : '';

    // Canal legible
    const canalMap: Record<string, string> = {
      'MESA_LOCAL': '🍽️ En sucursal',
      'MESA_LLEVAR': '🛍️ Para llevar',
      'MOSTRADOR': '📱 Mostrador',
      'DOMICILIO': '🛵 A domicilio',
      'MESERO': '🧑‍🍳 Pedido en mesa',
    };
    const canalTexto = canalMap[pedido.canal] || pedido.canal || pedido.modalidad;

    // Construir items formateados
    const itemsFormateados = items.map((item: Record<string, unknown>) => {
      const nombre = (item.producto as Record<string, unknown> | null)?.nombre || 'Producto';
      const cantidad = item.cantidad as number;
      const precioTotal = item.precio_total as number;
      return `   ${cantidad}x ${nombre}  —  $${precioTotal}`;
    }).join('\n');

    const mensaje =
      `╔══════════════════════╗\n` +
      `   🍔 *A-LA BURGUER*\n` +
      `╚══════════════════════╝\n\n` +
      `📋 *Ticket de Pedido*\n` +
      `▸ Pedido: *#${pedido.numero}*\n` +
      `▸ Fecha: ${fecha}\n` +
      `▸ Canal: ${canalTexto}\n` +
      (pedido.mesa_zona ? `▸ Mesa: ${pedido.mesa_zona}\n` : '') +
      `\n` +
      `👤 *Cliente:* ${nombreCliente}\n` +
      (direccion ? `📍 *Dirección:* ${direccion}\n` : '') +
      (referencia ? `📌 *Referencia:* ${referencia}\n` : '') +
      `\n` +
      `─────────────────────\n` +
      `🛒 *Tu pedido:*\n\n` +
      `${itemsFormateados}\n\n` +
      `─────────────────────\n` +
      `💰 *TOTAL:  $${totalFormateado}*\n` +
      `─────────────────────\n\n` +
      (pedido.canal === 'DOMICILIO'
        ? `⏱️ *Tiempo estimado:* 30-45 min\n` +
          `📦 Tu pedido está siendo preparado\n\n`
        : pedido.mesa_zona
          ? `🍽️ Tu pedido se servirá en tu mesa\n\n`
          : `📦 Te avisaremos cuando esté listo\n\n`
      ) +
      `¡Gracias por tu preferencia! 🙏\n\n` +
      `Para tu próximo pedido, usa nuestra app:\n` +
      `🔗 https://wings-burgers-mocha.vercel.app/menu-domicilio`;

    // Intentar enviar por WhatsApp Cloud API
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (whatsappToken && whatsappPhoneId) {
      // API configurada — enviar por servidor
      try {
        const container = getContainer();
        const mensajeria = container.getMensajeriaService();
        const resultado = await mensajeria.enviarWhatsApp(telefonoDestino, mensaje);

        if (resultado.exitoso) {
          return NextResponse.json({
            data: {
              mode: 'api',
              message: 'Ticket enviado por WhatsApp',
              pedidoId: id,
              telefono: telefonoDestino,
              mensajeId: resultado.mensajeId,
            },
          });
        }
      } catch {
        // API falló — caer al fallback wa.me
      }
    }

    // Fallback: generar link wa.me para envío manual desde el navegador
    const telefonoLimpio = telefonoDestino.replace(/\D/g, '');
    const telefonoConPais = telefonoLimpio.length <= 10 ? `52${telefonoLimpio}` : telefonoLimpio;
    const mensajeCodificado = encodeURIComponent(mensaje);
    const waLink = `https://wa.me/${telefonoConPais}?text=${mensajeCodificado}`;

    return NextResponse.json({
      data: {
        mode: 'link',
        message: 'Link de WhatsApp generado (API no configurada)',
        pedidoId: id,
        telefono: telefonoDestino,
        waLink,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
