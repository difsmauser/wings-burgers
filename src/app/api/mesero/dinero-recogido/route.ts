export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/mesero/dinero-recogido
 * El mesero confirma que recogió el dinero del cliente.
 * Actualiza observaciones del pedido con [MESERO_ENTREGO].
 * 
 * Body: { pedidoId: string, meseroNombre: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pedidoId, meseroNombre } = body;

    if (!pedidoId) {
      return NextResponse.json(
        { error: { message: 'pedidoId es requerido' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Leer observaciones actuales
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}&select=observaciones`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    );

    if (!getRes.ok) {
      return NextResponse.json(
        { error: { message: 'Error al leer pedido' } },
        { status: 500 }
      );
    }

    const data = await getRes.json();
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: { message: 'Pedido no encontrado' } },
        { status: 404 }
      );
    }

    const obsActuales = (data[0].observaciones as string) || '';

    // Si ya está marcado, no duplicar
    if (obsActuales.includes('[MESERO_ENTREGO]')) {
      return NextResponse.json({
        data: { message: 'Ya marcado como recogido', pedidoId },
      });
    }

    // Agregar marca
    const nuevasObs = obsActuales
      ? `${obsActuales} [MESERO_ENTREGO] ${meseroNombre || 'Mesero'}`
      : `[MESERO_ENTREGO] ${meseroNombre || 'Mesero'}`;

    // Actualizar
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          observaciones: nuevasObs,
          actualizado_en: new Date().toISOString(),
        }),
        cache: 'no-store',
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return NextResponse.json(
        { error: { message: `Error al actualizar: ${errText}` } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { message: 'Dinero recogido confirmado', pedidoId, meseroNombre },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
