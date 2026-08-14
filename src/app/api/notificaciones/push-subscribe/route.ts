export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';

/**
 * POST /api/notificaciones/push-subscribe
 *
 * Registra o actualiza la suscripción push del usuario.
 * Almacena el endpoint, claves p256dh y auth para enviar push notifications.
 *
 * Body:
 * {
 *   endpoint: string;
 *   keys: { p256dh: string; auth: string; }
 * }
 *
 * Requirements: 19.2, 19.5
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDACION_ERROR',
            message: 'endpoint, keys.p256dh y keys.auth son requeridos',
          },
        },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get current user from auth (if authenticated)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const usuarioId = user?.id || 'anonymous';

    // Upsert the push subscription (update if endpoint already exists)
    const { error } = await supabase.from('push_suscripcion').upsert(
      {
        usuario_id: usuarioId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        activa: true,
        actualizado_en: new Date().toISOString(),
      },
      {
        onConflict: 'endpoint',
      }
    );

    if (error) {
      console.error('[Push Subscribe] Error al guardar suscripción:', error);
      return NextResponse.json(
        {
          error: {
            code: 'SERVICIO_EXTERNO_ERROR',
            message: 'Error al registrar suscripción push',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Push Subscribe] Error inesperado:', err);
    return NextResponse.json(
      {
        error: {
          code: 'SERVICIO_EXTERNO_ERROR',
          message: 'Error interno del servidor',
        },
      },
      { status: 500 }
    );
  }
}
