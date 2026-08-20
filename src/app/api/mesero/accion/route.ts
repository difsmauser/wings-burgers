import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mesero/accion
 * Endpoint dedicado para acciones del mesero (sin auth de Supabase).
 * Valida que el mesero exista por nombre antes de ejecutar.
 * 
 * Acciones permitidas:
 * - tomar: asignar pedido al mesero
 * - entregar: marcar pedido como servido
 * - liberar: liberar mesa (cambiar estado a disponible)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accion, pedidoId, meseroNombre, mesaNombre } = body;

    if (!accion || !meseroNombre) {
      return NextResponse.json(
        { error: { message: 'Se requiere accion y meseroNombre' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

    // Validate mesero exists
    const meseroRes = await fetch(
      `${supabaseUrl}/rest/v1/mesero?nombre=eq.${encodeURIComponent(meseroNombre)}&activo=eq.true&select=id,nombre`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
    );
    const meseros = await meseroRes.json();
    if (!meseros || meseros.length === 0) {
      return NextResponse.json(
        { error: { message: 'Mesero no encontrado o inactivo' } },
        { status: 403 }
      );
    }

    const mesero = meseros[0];

    switch (accion) {
      case 'tomar': {
        // Assign pedido to this mesero
        if (!pedidoId) {
          return NextResponse.json({ error: { message: 'pedidoId requerido' } }, { status: 400 });
        }
        await fetch(`${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}`, {
          method: 'PATCH', headers, cache: 'no-store',
          body: JSON.stringify({ mesero_id: mesero.id, mesero_nombre: mesero.nombre }),
        });
        return NextResponse.json({ data: { success: true, accion: 'tomar' } });
      }

      case 'entregar': {
        // Mark pedido as servido
        if (!pedidoId) {
          return NextResponse.json({ error: { message: 'pedidoId requerido' } }, { status: 400 });
        }
        await fetch(`${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}`, {
          method: 'PATCH', headers, cache: 'no-store',
          body: JSON.stringify({ estado: 'servido', actualizado_en: new Date().toISOString() }),
        });
        return NextResponse.json({ data: { success: true, accion: 'entregar' } });
      }

      case 'liberar': {
        // Liberar mesa
        if (!mesaNombre) {
          return NextResponse.json({ error: { message: 'mesaNombre requerido' } }, { status: 400 });
        }
        await fetch(`${supabaseUrl}/rest/v1/mesa?nombre=ilike.${encodeURIComponent(mesaNombre)}`, {
          method: 'PATCH', headers, cache: 'no-store',
          body: JSON.stringify({ estado: 'disponible', pedido_activo_id: null }),
        });
        return NextResponse.json({ data: { success: true, accion: 'liberar' } });
      }

      default:
        return NextResponse.json(
          { error: { message: `Acción no válida: ${accion}` } },
          { status: 400 }
        );
    }
  } catch (e) {
    return NextResponse.json(
      { error: { message: (e as Error).message } },
      { status: 500 }
    );
  }
}
