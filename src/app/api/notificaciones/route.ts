import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { verificarAutenticacion } from '@/app/api/_lib/auth';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';

/**
 * GET /api/notificaciones
 * Lista las notificaciones pendientes (no leídas) del usuario autenticado.
 * Accesible por cualquier rol autenticado.
 *
 * Nota: Se accede directamente a Supabase ya que no existe un caso de uso
 * dedicado para la consulta de notificaciones. En el futuro se puede crear
 * un NotificacionRepository en el container.
 *
 * Requirements: 19.5
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const authResult = await verificarAutenticacion(request);
    if (!authResult.autenticado) {
      return authResult.respuesta;
    }

    const userId = authResult.usuario.id;

    // 2. Obtener notificaciones pendientes del usuario via Supabase
    const supabase = createServerClient();
    const { data: notificaciones, error } = await supabase
      .from('notificacion')
      .select('*')
      .eq('usuario_id', userId)
      .eq('leida', false)
      .order('creado_en', { ascending: false });

    if (error) {
      throw new Error(`Error consultando notificaciones: ${error.message}`);
    }

    // 3. Retornar las notificaciones
    return NextResponse.json({
      data: {
        notificaciones: notificaciones ?? [],
        total: (notificaciones ?? []).length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
