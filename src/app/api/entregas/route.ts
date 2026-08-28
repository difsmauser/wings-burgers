export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extrae la dirección de las observaciones del pedido.
 * Soporta múltiples formatos:
 *   - "Dirección: Calle 123 (ref) | Notas: ..."
 *   - "Dirección: Calle 123 [REPARTIDOR] ..."
 *   - "Dirección: Calle 123"
 *   - Solo texto (toda la observación es la dirección si no tiene prefijo)
 */
function extraerDireccionDeObservaciones(obs: string): string {
  if (!obs || obs.trim().length === 0) return '';

  // Intento 1: Formato con prefijo "Dirección:"
  const dirMatch = obs.match(/Direcci[oó]n:\s*(.+?)(?:\s*\|\s*Notas:|\s*\[REPARTIDOR\]|$)/i);
  if (dirMatch && dirMatch[1]) {
    return dirMatch[1].trim();
  }

  // Intento 2: Si empieza con "Dirección:" pero no matcheó el lazy (greedy fallback)
  const dirGreedy = obs.match(/Direcci[oó]n:\s*([^|[\]]+)/i);
  if (dirGreedy && dirGreedy[1]) {
    return dirGreedy[1].trim();
  }

  // Intento 3: Si la observación entera parece una dirección (sin prefijos especiales)
  // Solo si no contiene marcadores del sistema
  if (!obs.includes('[REPARTIDOR]') && !obs.includes('[COMPROBANTE]') && !obs.startsWith('Notas:')) {
    // Podría ser la dirección directa si es texto corto
    const sinNotas = obs.split('|')[0].trim();
    if (sinNotas.length > 3 && sinNotas.length < 200) {
      return sinNotas;
    }
  }

  return '';
}

// ============================================================================
// GET /api/entregas
// ============================================================================

/**
 * GET /api/entregas
 * Lista entregas para el panel del repartidor.
 * Incluye: datos del pedido, cliente, dirección, items del pedido.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    // 1. Fetch entregas (sin joins)
    const entregasRes = await fetch(
      `${supabaseUrl}/rest/v1/entrega?select=id,pedido_id,repartidor_id,estado,aceptada_en,completada_en,creado_en&order=creado_en.desc`,
      { headers, cache: 'no-store' }
    );

    if (!entregasRes.ok) {
      const errText = await entregasRes.text();
      if (errText.includes('relation') || entregasRes.status === 404) {
        return NextResponse.json({ data: [] });
      }
      return NextResponse.json({ data: [], error: errText });
    }

    const entregasRaw = await entregasRes.json();
    if (!entregasRaw || entregasRaw.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. Fetch pedidos relacionados (incluir canal)
    const pedidoIds = [...new Set(entregasRaw.map((e: { pedido_id: string }) => e.pedido_id))];
    const pedidosRes = await fetch(
      `${supabaseUrl}/rest/v1/pedido?id=in.(${pedidoIds.join(',')})&select=id,numero,total,mesa_zona,observaciones,metodo_pago,estado_pago,cliente_id,canal,modalidad`,
      { headers, cache: 'no-store' }
    );
    const pedidosRaw = pedidosRes.ok ? await pedidosRes.json() : [];
    const pedidosMap: Record<string, Record<string, unknown>> = {};
    for (const p of pedidosRaw) pedidosMap[p.id] = p;

    // 3. Fetch clientes relacionados
    const clienteIds = [...new Set(pedidosRaw.filter((p: { cliente_id: string | null }) => p.cliente_id).map((p: { cliente_id: string }) => p.cliente_id))];
    let clientesMap: Record<string, Record<string, unknown>> = {};
    if (clienteIds.length > 0) {
      const clientesRes = await fetch(
        `${supabaseUrl}/rest/v1/cliente?id=in.(${clienteIds.join(',')})&select=id,nombre,telefono,direccion`,
        { headers, cache: 'no-store' }
      );
      if (clientesRes.ok) {
        const clientesRaw = await clientesRes.json();
        for (const c of clientesRaw) clientesMap[c.id] = c;
      }
    }

    // 4. Fetch items de todos los pedidos (para mostrar qué lleva cada entrega)
    const itemsRes = await fetch(
      `${supabaseUrl}/rest/v1/pedido_detalle?pedido_id=in.(${pedidoIds.join(',')})&select=pedido_id,producto_id,cantidad,precio_unitario,precio_total,comentario,producto:producto_id(nombre,categoria)`,
      { headers, cache: 'no-store' }
    );
    const itemsRaw = itemsRes.ok ? await itemsRes.json() : [];
    // Agrupar items por pedido_id
    const itemsByPedido: Record<string, Array<{ nombre: string; cantidad: number; precioTotal: number; comentario?: string }>> = {};
    for (const item of itemsRaw) {
      const pid = item.pedido_id as string;
      if (!itemsByPedido[pid]) itemsByPedido[pid] = [];
      itemsByPedido[pid].push({
        nombre: (item.producto as Record<string, unknown>)?.nombre as string || 'Producto',
        cantidad: item.cantidad as number,
        precioTotal: item.precio_total as number,
        comentario: (item.comentario as string) || undefined,
      });
    }

    // 5. Map to frontend format
    const entregas = entregasRaw.map((e: Record<string, unknown>) => {
      const pedido = pedidosMap[e.pedido_id as string] || null;
      const cliente = pedido ? clientesMap[pedido.cliente_id as string] || null : null;

      // Extraer nombre del repartidor de observaciones
      const obs = (pedido?.observaciones as string) || '';
      const repMatch = obs.match(/\[REPARTIDOR\]\s*(\S+)/);
      const repartidorNombre = repMatch ? repMatch[1] : '';

      // Extraer dirección: prioridad cliente.direccion > observaciones > fallback
      const clienteDireccion = (cliente?.direccion as string) || '';
      const direccionObs = extraerDireccionDeObservaciones(obs);
      const direccionFinal = clienteDireccion || direccionObs || 'Sin dirección';

      // Extraer notas (sin la dirección ni repartidor)
      const notasMatch = obs.match(/Notas:\s*(.+?)(?:\s*\[|$)/i);
      const notas = notasMatch ? notasMatch[1].trim() : '';

      // Extraer info de pago del cliente
      const billeteMatch = obs.match(/Paga con \$(\d+)/);
      const billeteCliente = billeteMatch ? parseInt(billeteMatch[1], 10) : null;

      return {
        id: e.id as string,
        pedidoId: e.pedido_id as string,
        repartidorId: e.repartidor_id as string,
        repartidorNombre,
        numeroPedido: (pedido?.numero as string) || 'N/A',
        clienteNombre: (cliente?.nombre as string) || 'Cliente',
        direccion: direccionFinal,
        telefono: (cliente?.telefono as string) || '',
        estado: e.estado as string,
        metodoPago: (pedido?.metodo_pago as string) || null,
        estadoPago: (pedido?.estado_pago as string) || 'pendiente',
        observaciones: obs,
        notas,
        billeteCliente,
        aceptadaEn: e.aceptada_en as string | null,
        completadaEn: e.completada_en as string | null,
        total: (pedido?.total as number) || 0,
        items: itemsByPedido[e.pedido_id as string] || [],
      };
    });

    return NextResponse.json({ data: entregas });
  } catch (error) {
    return NextResponse.json(
      { data: [], error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
