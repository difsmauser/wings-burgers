import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../_lib/errorHandler';

async function getSupabase() {
  const { createServerClient } = await import('@/adapters/driven/persistence/supabase/SupabaseClient');
  return createServerClient();
}

export async function GET() {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('mesa')
      .select()
      .eq('activa', true)
      .order('nombre', { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from('mesa')
      .insert({
        nombre: body.nombre,
        zona: body.zona || 'Interior',
        capacidad: body.capacidad || 4,
        pos_x: body.pos_x || 0,
        pos_y: body.pos_y || 0,
        estado: 'disponible',
        activa: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Also register QR code for this mesa
    const qrCodigo = body.nombre.replace(/\s+/g, '-').toUpperCase();
    await supabase.from('qr_mesa').upsert({
      codigo: qrCodigo,
      mesa_zona: body.nombre + ' - ' + (body.zona || 'Interior'),
      activo: true,
    }, { onConflict: 'codigo' });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = await getSupabase();

    if (!body.id) {
      return NextResponse.json({ error: { message: 'ID requerido' } }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateFields.nombre = body.nombre;
    if (body.zona !== undefined) updateFields.zona = body.zona;
    if (body.capacidad !== undefined) updateFields.capacidad = body.capacidad;
    if (body.pos_x !== undefined) updateFields.pos_x = body.pos_x;
    if (body.pos_y !== undefined) updateFields.pos_y = body.pos_y;
    if (body.estado !== undefined) updateFields.estado = body.estado;
    if (body.activa !== undefined) updateFields.activa = body.activa;
    if (body.pedido_activo_id !== undefined) updateFields.pedido_activo_id = body.pedido_activo_id;

    const { data, error } = await supabase
      .from('mesa')
      .update(updateFields)
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: { message: 'ID requerido' } }, { status: 400 });

    const supabase = await getSupabase();
    const { error } = await supabase.from('mesa').update({ activa: false }).eq('id', id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
