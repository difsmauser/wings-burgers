import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';

/**
 * Token de verificación configurado en Meta Developers para el webhook.
 * Debe coincidir con el valor ingresado en la configuración de la app de WhatsApp Business.
 */
function getVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN ?? '';
}

/**
 * Estructura de un mensaje entrante de WhatsApp Cloud API.
 */
interface WhatsAppMensajeEntrante {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

/**
 * Estructura del payload del webhook de WhatsApp Cloud API.
 */
interface WhatsAppWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value?: {
        messaging_product: string;
        metadata?: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: WhatsAppMensajeEntrante[];
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field?: string;
    }>;
  }>;
}

/**
 * GET /api/webhooks/whatsapp
 * Maneja el challenge de verificación de Meta para registrar el webhook.
 *
 * Requirements: 19.5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const verifyToken = getVerifyToken();

    // Verificar que el modo es "subscribe" y el token coincide
    if (mode === 'subscribe' && token === verifyToken) {
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Verificación fallida
    return NextResponse.json(
      {
        error: {
          code: 'WEBHOOK_VERIFICACION_FALLIDA',
          message: 'Token de verificación inválido',
        },
      },
      { status: 403 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/webhooks/whatsapp
 * Recibe notificaciones de mensajes y estados de WhatsApp Cloud API.
 * Siempre retorna 200 para evitar reintentos de Meta.
 *
 * Requirements: 9.2, 19.5
 */
export async function POST(request: NextRequest) {
  try {
    const payload: WhatsAppWebhookPayload = await request.json();

    // Validar que es un evento de WhatsApp
    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json(
        {
          error: {
            code: 'PAYLOAD_INVALIDO',
            message: 'El payload no corresponde a un evento de WhatsApp Business',
          },
        },
        { status: 400 }
      );
    }

    // Procesar mensajes entrantes de cada entry/change
    const mensajes: WhatsAppMensajeEntrante[] = [];

    if (payload.entry) {
      for (const entry of payload.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.value?.messages) {
              mensajes.push(...change.value.messages);
            }
          }
        }
      }
    }

    // Log mensajes recibidos (procesamiento asíncrono)
    if (mensajes.length > 0) {
      console.log(`[WhatsApp Webhook] Recibidos ${mensajes.length} mensajes`);
      // El procesamiento real de mensajes entrantes se puede implementar
      // conectando con un caso de uso dedicado en el futuro
    }

    // Siempre retornar 200 para indicar a Meta que el webhook fue recibido
    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    // Incluso en caso de error de parsing, retornar 200
    // para evitar que Meta desactive el webhook
    console.error('[WhatsApp Webhook] Error en procesamiento:', error);
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
