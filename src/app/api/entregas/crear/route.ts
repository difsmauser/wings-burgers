export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/entregas/crear
 * Crea una nueva entrega para un pedido a domicilio.
 * Se llama cuando el mesero entrega el pedido al repartidor.
 *
 * Body: { pedidoId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pedidoId } = body;

    if (!pedidoId) {
      return NextResponse.json(
        { error: { message: 'pedidoId es requerido' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Verificar que no exista ya una entrega para este pedido
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/entrega?pedido_id=eq.${pedidoId}&select=id`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    );

    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return NextResponse.json({
          data: { message: 'Entrega ya existe', entregaId: existing[0].id },
        });
      }
    }

    // Buscar un repartidor disponible para asignar
    const repartidorRes = await fetch(
      `${supabaseUrl}/rest/v1/repartidor?activo=eq.true&select=id,nombre&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    );

    let repartidorId: string | null = null;
    let repartidorNombre: string = '';
    if (repartidorRes.ok) {
      const repartidores = await repartidorRes.json();
      if (repartidores && repartidores.length > 0) {
        repartidorId = repartidores[0].id;
        repartidorNombre = repartidores[0].nombre || '';
      }
    }

    if (!repartidorId) {
      return NextResponse.json(
        { error: { message: 'No hay repartidores disponibles. Registra al menos uno en Admin → Repartidores.' } },
        { status: 400 }
      );
    }

    // Crear la entrega
    const createRes = await fetch(
      `${supabaseUrl}/rest/v1/entrega`,
      {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          pedido_id: pedidoId,
          repartidor_id: repartidorId,
          estado: 'pendiente',
          creado_en: new Date().toISOString(),
        }),
        cache: 'no-store',
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json(
        { error: { message: `Error al crear entrega: ${errText}` } },
        { status: 500 }
      );
    }

    const entregaData = await createRes.json();

    // Actualizar estado del pedido a 'en_camino' + guardar repartidor
    // Leer observaciones actuales
    const getObsRes = await fetch(
      `${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}&select=observaciones`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
    );
    let obsActuales = '';
    if (getObsRes.ok) {
      const obsData = await getObsRes.json();
      if (obsData?.[0]) obsActuales = obsData[0].observaciones || '';
    }

    const repartidorInfo = `[REPARTIDOR] ${repartidorNombre}`;
    const nuevasObs = obsActuales.includes('[REPARTIDOR]')
      ? obsActuales
      : obsActuales ? `${obsActuales} ${repartidorInfo}` : repartidorInfo;

    await fetch(
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
          estado: 'en_camino',
          observaciones: nuevasObs,
          actualizado_en: new Date().toISOString(),
        }),
        cache: 'no-store',
      }
    );

    return NextResponse.json({
      data: {
        message: 'Entrega creada — disponible para repartidor',
        entregaId: entregaData[0]?.id || null,
        pedidoId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
