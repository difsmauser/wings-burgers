import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { ValidacionError } from '@/shared/errors';

/**
 * GET /api/qr/[codigo]
 * Valida un código QR y retorna la información de la mesa/zona asociada.
 * Accesible sin autenticación (el cliente escanea el QR y accede al menú).
 *
 * Requirements: 8.1, 8.2, 8.4
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

    // Query qr_mesa table in Supabase
    const { createServerClient } = await import('@/adapters/driven/persistence/supabase/SupabaseClient');
    const supabase = createServerClient();

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
            message: 'El código QR no es válido o ha expirado. Por favor solicita asistencia al personal del local.',
          },
        },
        { status: 404 }
      );
    }

    // QR válido: retornar info de la mesa
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
