import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return { url, key };
}

/**
 * GET /api/repartidores — Lista repartidores activos
 */
export async function GET() {
  try {
    const { url, key } = getConfig();
    const res = await fetch(`${url}/rest/v1/repartidor?activo=eq.true&select=*&order=nombre.asc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    return NextResponse.json({ data: await res.json() });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}

/**
 * POST /api/repartidores — Crea un repartidor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, key } = getConfig();
    if (!body.nombre?.trim()) return NextResponse.json({ error: { message: 'Nombre requerido' } }, { status: 400 });

    const res = await fetch(`${url}/rest/v1/repartidor`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ nombre: body.nombre.trim(), telefono: body.telefono?.trim() || null, vehiculo: body.vehiculo?.trim() || null, activo: true }),
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ data: data[0] || data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}

/**
 * PUT /api/repartidores — Actualiza un repartidor
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, key } = getConfig();
    if (!body.id) return NextResponse.json({ error: { message: 'ID requerido' } }, { status: 400 });

    const fields: Record<string, unknown> = {};
    if (body.nombre !== undefined) fields.nombre = body.nombre.trim();
    if (body.telefono !== undefined) fields.telefono = body.telefono?.trim() || null;
    if (body.vehiculo !== undefined) fields.vehiculo = body.vehiculo?.trim() || null;
    if (body.activo !== undefined) fields.activo = body.activo;

    const res = await fetch(`${url}/rest/v1/repartidor?id=eq.${body.id}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(fields), cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    const data = await res.json();
    return NextResponse.json({ data: data[0] || data });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}

/**
 * DELETE /api/repartidores?id=xxx — Desactiva (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: { message: 'ID requerido' } }, { status: 400 });

    const { url, key } = getConfig();
    await fetch(`${url}/rest/v1/repartidor?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ activo: false }), cache: 'no-store',
    });
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}
