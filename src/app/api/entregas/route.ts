export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';

/**
 * GET /api/entregas
 * Lista entregas para el panel del repartidor.
 * Retorna pendientes y activas con datos del pedido y cliente.
 * Requirements: 14.1
 */
export async function GET(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Check if filtering by repartidor name
    const { searchParams } = new URL(_request.url);
    const repartidorNombre = searchParams.get('nombre');

    // Build query — filter by repartidor if provided
    let queryUrl = `${supabaseUrl}/rest/v1/entrega?select=id,pedido_id,repartidor_id,estado,motivo_no_entrega,aceptada_en,completada_en,creado_en,repartidor:repartidor_id(nombre),pedido:pedido_id(numero,total,mesa_zona,observaciones,metodo_pago,estado_pago,cliente_id,cliente:cliente_id(nombre,telefono,direccion))&order=creado_en.desc`;

    const res = await fetch(queryUrl, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      // Si la tabla no existe aún, retornar vacío
      const errText = await res.text();
      if (errText.includes('relation') || res.status === 404) {
        return NextResponse.json({ data: [] });
      }
      throw new Error(`Error al consultar entregas: ${errText}`);
    }

    const rawData = await res.json();

    // Map to frontend format
    const entregas = (rawData ?? []).map((e: Record<string, unknown>) => {
      const pedido = e.pedido as Record<string, unknown> | null;
      const cliente = pedido?.cliente as Record<string, unknown> | null;
      const repartidor = e.repartidor as Record<string, unknown> | null;

      return {
        id: e.id as string,
        pedidoId: e.pedido_id as string,
        repartidorId: e.repartidor_id as string,
        repartidorNombre: (repartidor?.nombre as string) || '',
        numeroPedido: (pedido?.numero as string) || 'N/A',
        clienteNombre: (cliente?.nombre as string) || 'Cliente',
        direccion: (cliente?.direccion as string) || (pedido?.observaciones as string)?.split('[')[0]?.trim() || 'Sin dirección',
        telefono: (cliente?.telefono as string) || '',
        estado: e.estado as string,
        metodoPago: (pedido?.metodo_pago as string) || null,
        estadoPago: (pedido?.estado_pago as string) || 'pendiente',
        observaciones: (pedido?.observaciones as string) || '',
        aceptadaEn: e.aceptada_en as string | null,
        completadaEn: e.completada_en as string | null,
        total: (pedido?.total as number) || 0,
      };
    });

    // Si se filtró por nombre, solo retornar las del repartidor
    const resultado = repartidorNombre
      ? entregas.filter((e: { repartidorNombre: string }) => e.repartidorNombre === repartidorNombre)
      : entregas;

    return NextResponse.json({ data: resultado });
  } catch (error) {
    return handleApiError(error);
  }
}
