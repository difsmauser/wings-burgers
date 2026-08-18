export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../_lib/auth';

/**
 * POST /api/upload
 * Uploads a file to Supabase Storage bucket "productos".
 * Auth: admin (only admin can upload product images)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin']);
  if ('respuesta' in auth) return auth.respuesta;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { message: 'No se proporcionó archivo' } },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { message: 'Tipo de archivo no permitido. Use JPG, PNG, WebP o GIF.' } },
        { status: 400 }
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: { message: 'El archivo no debe superar 5MB' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('productos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { error: { message: `Error al subir archivo: ${error.message}` } },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('productos')
      .getPublicUrl(fileName);

    return NextResponse.json({
      data: { url: urlData.publicUrl, path: data.path },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: { message: 'Error interno del servidor' } },
      { status: 500 }
    );
  }
}
