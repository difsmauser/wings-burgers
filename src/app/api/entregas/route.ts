export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/entregas
 * Lista entregas para el panel del repartidor.
 * Query simple sin joins embebidos (evita problemas de RLS/FK).
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

    // 2. Fetch pedidos relacionados
    const pedidoIds = [...new Set(entregasRaw.map((e: { pedido_id: string }) => e.pedido_id))];
    const pedidosRes = await fetch(
      `${supabaseUrl}/rest/v1/pedido?id=in.(${pedidoIds.join(',')})&select=id,numero,total,mesa_zona,observaciones,metodo_pago,estado_pago,cliente_id`,
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

    // 4. Map to frontend format
    const entregas = entregasRaw.map((e: Record<string, unknown>) => {
      const pedido = pedidosMap[e.pedido_id as string] || null;
      const cliente = pedido ? clientesMap[pedido.cliente_id as string] || null : null;

      // Extraer nombre del repartidor de observaciones
      const obs = (pedido?.observaciones as string) || '';
      const repMatch = obs.match(/\[REPARTIDOR\]\s*(\S+)/);
      const repartidorNombre = repMatch ? repMatch[1] : '';

      // Extraer dirección de observaciones (puede tener varios formatos)
      const dirMatch = obs.match(/Direcci[oó]n:\s*(.+?)(?:\s*\||$|\s*\[)/i);
      const direccionObs = dirMatch ? dirMatch[1].trim() : '';

      return {
        id: e.id as string,
        pedidoId: e.pedido_id as string,
        repartidorId: e.repartidor_id as string,
        repartidorNombre,
        numeroPedido: (pedido?.numero as string) || 'N/A',
        clienteNombre: (cliente?.nombre as string) || 'Cliente',
        direccion: (cliente?.direccion as string) || direccionObs || 'Sin dirección',
        telefono: (cliente?.telefono as string) || '',
        estado: e.estado as string,
        metodoPago: (pedido?.metodo_pago as string) || null,
        estadoPago: (pedido?.estado_pago as string) || 'pendiente',
        observaciones: obs,
        aceptadaEn: e.aceptada_en as string | null,
        completadaEn: e.completada_en as string | null,
        total: (pedido?.total as number) || 0,
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
