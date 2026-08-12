import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { verificarAutenticacion, verificarRol } from '@/app/api/_lib/auth';
import { ValidacionError } from '@/shared/errors';
import { generarCodigoQr, buildQrMenuUrl } from '@/shared/utils/qr-generator';

export const dynamic = 'force-dynamic';
import { getQrStore, registrarQrEnStore, desactivarQr, type QrMesaRecord } from '@/shared/utils/qr-store';

/**
 * GET /api/qr
 * List all QR codes (admin only).
 *
 * Requirements: 8.3
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verificarAutenticacion(request);
    if (!authResult.autenticado) {
      return authResult.respuesta;
    }

    const errorRol = verificarRol(authResult.usuario, ['admin']);
    if (errorRol) return errorRol;

    const qrCodes = getQrStore();

    return NextResponse.json({
      data: qrCodes.map((qr) => ({
        id: qr.id,
        codigo: qr.codigo,
        mesaZona: qr.mesaZona,
        activo: qr.activo,
        url: buildQrMenuUrl(qr.codigo),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/qr
 * Create a new QR code for a mesa/zona (admin only).
 *
 * Body: { mesa_zona: string }
 *
 * Requirements: 8.1, 8.3
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verificarAutenticacion(request);
    if (!authResult.autenticado) {
      return authResult.respuesta;
    }

    const errorRol = verificarRol(authResult.usuario, ['admin']);
    if (errorRol) return errorRol;

    const body = await request.json();
    const { mesa_zona } = body;

    if (!mesa_zona || typeof mesa_zona !== 'string' || mesa_zona.trim().length === 0) {
      throw new ValidacionError(
        'Se requiere el campo "mesa_zona" para generar el código QR',
        ['mesa_zona']
      );
    }

    const codigo = generarCodigoQr();
    const record: QrMesaRecord = {
      id: crypto.randomUUID(),
      codigo,
      mesaZona: mesa_zona.trim(),
      activo: true,
    };
    registrarQrEnStore(record);
    const url = buildQrMenuUrl(record.codigo);

    return NextResponse.json(
      {
        data: {
          id: record.id,
          codigo: record.codigo,
          mesaZona: record.mesaZona,
          activo: record.activo,
          url,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/qr
 * Deactivate a QR code by ID (admin only).
 *
 * Body: { id: string }
 *
 * Requirements: 8.3
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verificarAutenticacion(request);
    if (!authResult.autenticado) {
      return authResult.respuesta;
    }

    const errorRol = verificarRol(authResult.usuario, ['admin']);
    if (errorRol) return errorRol;

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      throw new ValidacionError('Se requiere el campo "id" del QR a desactivar', ['id']);
    }

    desactivarQr(id);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
