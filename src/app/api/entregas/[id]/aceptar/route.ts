export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/entregas/[id]/aceptar
 * Repartidor acepta la entrega — cambia estado de la entrega a 'en_camino'.
 * NO toca el estado del pedido (ya está en 'en_camino' desde que se creó la entrega).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Actualizar estado de la entrega a 'en_camino'
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/entrega?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          estado: 'en_camino',
          aceptada_en: new Date().toISOString(),
        }),
        cache: 'no-store',
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return NextResponse.json(
        { error: { message: `Error al aceptar: ${errText}` } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { message: 'Entrega aceptada', entregaId: id },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
