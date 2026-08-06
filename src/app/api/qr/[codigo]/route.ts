import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { ValidacionError } from '@/shared/errors';
import { getQrStore } from '@/shared/utils/qr-store';

/**
 * Interfaz del repositorio de QR mesas.
 */
interface QrMesaRecord {
  id: string;
  codigo: string;
  mesaZona: string;
  activo: boolean;
}

interface IQrMesaRepository {
  obtenerPorCodigo(codigo: string): Promise<QrMesaRecord | null>;
}

function getQrMesaRepository(): IQrMesaRepository {
  return {
    async obtenerPorCodigo(codigo: string): Promise<QrMesaRecord | null> {
      const store = getQrStore();
      return store.find((r) => r.codigo === codigo) ?? null;
    },
  };
}

/**
 * GET /api/qr/[codigo]
 * Valida un código QR y retorna la información de la mesa/zona asociada.
 * Accesible sin autenticación (el cliente escanea el QR y accede al menú).
 *
 * Params:
 * - codigo: código QR a validar (path param)
 *
 * Retorna si válido:
 * - valido: true
 * - mesaZona: identificación de la mesa/zona
 * - codigo: el código validado
 *
 * Retorna si inválido:
 * - error con código QR_INVALIDO y mensaje indicando solicitar asistencia
 *
 * Requirements: 8.1, 8.2, 8.4
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  try {
    const { codigo } = params;

    if (!codigo || codigo.trim().length === 0) {
      throw new ValidacionError(
        'Se requiere un código QR válido',
        ['codigo']
      );
    }

    // Buscar el QR en la base de datos
    const qrRepo = getQrMesaRepository();
    const qrMesa = await qrRepo.obtenerPorCodigo(codigo);

    // Si no existe o está inactivo, retornar error indicando QR inválido (Req 8.4)
    if (!qrMesa || !qrMesa.activo) {
      return NextResponse.json(
        {
          error: {
            code: 'QR_INVALIDO',
            message:
              'El código QR no es válido o ha expirado. Por favor solicita asistencia al personal del local.',
          },
        },
        { status: 404 }
      );
    }

    // QR válido: retornar info de la mesa (Req 8.1)
    return NextResponse.json({
      data: {
        valido: true,
        codigo: qrMesa.codigo,
        mesaZona: qrMesa.mesaZona,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
