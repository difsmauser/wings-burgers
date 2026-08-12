import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { ValidacionError } from '@/shared/errors';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/qr/[codigo]
 * Valida un código QR y retorna la información de la mesa/zona asociada.
 * Accesible sin autenticación (el cliente escanea el QR y accede al menú).
 * Usa anon key directamente ya que es una operación pública de lectura.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params;

    if (!codigo || codigo.trim().length === 0) {
      throw new ValidacionError('Se requiere un código QR válido', ['codigo']);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: { code: 'CONFIG_ERROR', message: 'Configuración de Supabase incompleta' } },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: qrMesa, error } = await supabase
      .from('qr_mesa')
      .select('codigo, mesa_zona, activo')
      .eq('codigo', codigo)
      .single();

    if (error || !qrMesa || !qrMesa.activo) {
      return NextResponse.json(
        {
          error: {
            code: 'QR_INVALIDO',
            message: 'El código QR no es válido o ha expirado.',
            debug: error?.message || 'No data found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        valido: true,
        codigo: qrMesa.codigo,
        mesaZona: qrMesa.mesa_zona,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
