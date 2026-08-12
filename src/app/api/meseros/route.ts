import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/meseros
 * Lista todos los meseros registrados.
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('mesero')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/meseros
 * Crea un nuevo mesero.
 * Body: { nombre: string, telefono?: string, pin?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    if (!body.nombre?.trim()) {
      return NextResponse.json(
        { error: { message: 'Nombre es requerido' } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('mesero')
      .insert({
        nombre: body.nombre.trim(),
        telefono: body.telefono?.trim() || null,
        pin: body.pin?.trim() || null,
        activo: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/meseros
 * Actualiza un mesero existente.
 * Body: { id: string, nombre?: string, telefono?: string, pin?: string, activo?: boolean }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    if (!body.id) {
      return NextResponse.json(
        { error: { message: 'ID es requerido' } },
        { status: 400 }
      );
    }

    const updateFields: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateFields.nombre = body.nombre.trim();
    if (body.telefono !== undefined) updateFields.telefono = body.telefono?.trim() || null;
    if (body.pin !== undefined) updateFields.pin = body.pin?.trim() || null;
    if (body.activo !== undefined) updateFields.activo = body.activo;

    const { data, error } = await supabase
      .from('mesero')
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

/**
 * DELETE /api/meseros?id=xxx
 * Desactiva (soft-delete) un mesero.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: { message: 'ID es requerido' } },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('mesero')
      .update({ activo: false })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
