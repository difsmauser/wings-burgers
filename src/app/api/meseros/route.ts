import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { requireAuth } from '@/app/api/_lib/auth';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/meseros
 * Lista todos los meseros registrados.
 * Public: needed for mesero login screen (PIN-based auth).
 */
export async function GET(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Direct fetch to bypass any Supabase client initialization issues
    const res = await fetch(
      `${supabaseUrl}/rest/v1/mesero?activo=eq.true&select=id,nombre,pin&order=nombre.asc`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }

    const data = await res.json();
    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

/**
 * POST /api/meseros
 * Crea un nuevo mesero.
 * Auth: admin
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin']);
  if ('respuesta' in auth) return auth.respuesta;

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
        foto_url: body.foto_url?.trim() || null,
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
 * Auth: admin
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, ['admin']);
  if ('respuesta' in auth) return auth.respuesta;

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
    if (body.foto_url !== undefined) updateFields.foto_url = body.foto_url?.trim() || null;

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
 * Auth: admin
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request, ['admin']);
  if ('respuesta' in auth) return auth.respuesta;

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
