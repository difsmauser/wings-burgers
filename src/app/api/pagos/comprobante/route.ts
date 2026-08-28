export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { ValidacionError } from '@/shared/errors';

/**
 * POST /api/pagos/comprobante
 * Sube un comprobante de transferencia bancaria o verifica uno existente.
 *
 * Para subir comprobante (multipart/form-data):
 *   - pedidoId: string
 *   - archivo: File (JPG, PNG, PDF, max 5MB)
 *
 * Para verificar comprobante (JSON):
 *   - pedidoId: string
 *   - aprobado: boolean
 *   - motivo?: string (requerido si aprobado es false)
 *
 * @requirements 13.3, 13.5, 13.7, 13.9
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const container = getContainer();

    if (contentType.includes('multipart/form-data')) {
      // Subir comprobante
      const formData = await request.formData();
      const pedidoId = formData.get('pedidoId') as string | null;
      const archivo = formData.get('archivo') as File | null;

      if (!pedidoId || typeof pedidoId !== 'string') {
        throw new ValidacionError('Se requiere el campo pedidoId', ['pedidoId']);
      }

      if (!archivo) {
        throw new ValidacionError('Se requiere un archivo de comprobante', ['archivo']);
      }

      // Validar formato y tamaño
      const formatosPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!formatosPermitidos.includes(archivo.type)) {
        throw new ValidacionError(
          'El comprobante debe ser JPG, PNG o PDF',
          ['archivo']
        );
      }

      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (archivo.size > MAX_SIZE) {
        throw new ValidacionError(
          'El comprobante no debe exceder 5MB',
          ['archivo']
        );
      }

      // Subir archivo al storage
      const storageService = container.getStorageService();
      const ruta = `comprobantes/${pedidoId}/${archivo.name}`;
      const url = await storageService.subirImagen(archivo, ruta);

      // Guardar URL del comprobante en el pedido y marcar como validando
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      await fetch(
        `${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            metodo_pago: 'transferencia',
            observaciones: `[COMPROBANTE] ${url}`,
            actualizado_en: new Date().toISOString(),
          }),
          cache: 'no-store',
        }
      );

      return NextResponse.json({ data: { pedidoId, comprobanteUrl: url } }, { status: 201 });
    } else {
      // Verificar comprobante (admin aprueba/rechaza)
      const body = await request.json();
      const { pedidoId, aprobado, motivo } = body;

      if (!pedidoId || typeof pedidoId !== 'string') {
        throw new ValidacionError('Se requiere el campo pedidoId', ['pedidoId']);
      }

      if (typeof aprobado !== 'boolean') {
        throw new ValidacionError('Se requiere el campo aprobado (boolean)', ['aprobado']);
      }

      const useCase = container.getVerificarComprobante();
      await useCase.ejecutar(pedidoId, aprobado, motivo);

      return NextResponse.json({ data: { pedidoId, aprobado } });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
