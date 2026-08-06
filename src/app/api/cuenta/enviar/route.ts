import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { verificarAutenticacion, verificarRol } from '@/app/api/_lib/auth';
import { getContainer } from '@/shared/container';
import { ValidacionError } from '@/shared/errors';
import type { CanalEnvio } from '@/application/use-cases/notificaciones';

/** Canales válidos para el envío de cuenta */
const CANALES_VALIDOS: CanalEnvio[] = ['whatsapp', 'email', 'app'];

/**
 * POST /api/cuenta/enviar
 * Envía la cuenta/resumen de un pedido al cliente por el canal seleccionado.
 * Solo accesible por roles 'vendedor' y 'admin'.
 *
 * Body (JSON):
 * - pedidoId: string (requerido) - Identificador del pedido
 * - canal: 'whatsapp' | 'email' | 'app' (requerido) - Canal de envío
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const authResult = await verificarAutenticacion(request);
    if (!authResult.autenticado) {
      return authResult.respuesta;
    }

    // 2. Verificar autorización (vendedor o admin)
    const errorRol = verificarRol(authResult.usuario, ['vendedor', 'admin']);
    if (errorRol) return errorRol;

    // 3. Parsear body
    const body = await request.json();
    const { pedidoId, canal } = body;

    // 4. Validar campos requeridos
    if (!pedidoId || typeof pedidoId !== 'string') {
      throw new ValidacionError(
        'Se requiere el campo "pedidoId" como identificador del pedido',
        ['pedidoId']
      );
    }

    if (!canal || !CANALES_VALIDOS.includes(canal)) {
      throw new ValidacionError(
        `Se requiere el campo "canal" con uno de los valores válidos: ${CANALES_VALIDOS.join(', ')}`,
        ['canal']
      );
    }

    // 5. Ejecutar caso de uso
    const container = getContainer();
    const useCase = container.getEnviarCuentaCliente();
    await useCase.ejecutar(pedidoId, canal as CanalEnvio);

    // 6. Retornar confirmación
    return NextResponse.json({
      data: {
        mensaje: `Cuenta enviada exitosamente por ${canal}`,
        canal,
        pedidoId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
