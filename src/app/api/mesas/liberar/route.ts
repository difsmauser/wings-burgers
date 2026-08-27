export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';

/**
 * POST /api/mesas/liberar
 * Libera una mesa poniendo su estado como 'disponible'.
 * Se llama cuando caja confirma el pago de todos los pedidos de la mesa.
 *
 * Body: { mesaZona: string }  — e.g. "Mesa 1 - Interior"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mesaZona } = body;

    if (!mesaZona || typeof mesaZona !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDACION', message: 'Se requiere mesaZona' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Parse mesaZona to get nombre and zona
    // Format: "Mesa 1 - Interior" → nombre="Mesa 1", zona="Interior"
    const parts = mesaZona.split(' - ');
    const nombre = parts[0]?.trim();
    const zona = parts[1]?.trim();

    if (!nombre) {
      return NextResponse.json(
        { error: { message: 'No se pudo parsear la mesa' } },
        { status: 400 }
      );
    }

    // Update mesa estado to 'disponible'
    let filter = `nombre=eq.${encodeURIComponent(nombre)}`;
    if (zona) {
      filter += `&zona=eq.${encodeURIComponent(zona)}`;
    }

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/mesa?${filter}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ estado: 'disponible' }),
        cache: 'no-store',
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return NextResponse.json(
        { error: { message: `Error al liberar mesa: ${errText}` } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { message: 'Mesa liberada', mesaZona, estado: 'disponible' },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
