import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import type { EstadoPedido } from '@/shared/domain-types';

/**
 * GET /api/pedidos?estado=recibido
 * Lista pedidos filtrados por estado.
 * Requirements: 7.1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') as EstadoPedido | null;

    const container = getContainer();
    const pedidoRepo = container.getPedidoRepository();

    if (estado) {
      const pedidos = await pedidoRepo.listarPorEstado(estado);
      return NextResponse.json({ data: pedidos });
    }

    // Sin filtro: retornar pedidos recientes (por defecto "recibido")
    const pedidos = await pedidoRepo.listarPorEstado('recibido');
    return NextResponse.json({ data: pedidos });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/pedidos
 * Crea un nuevo pedido.
 * Requirements: 7.1, 7.3, 7.4
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const container = getContainer();
    const useCase = container.getCrearPedido();

    const pedido = await useCase.ejecutar({
      nombre: body.nombre,
      telefono: body.telefono,
      modalidad: body.modalidad,
      items: body.items,
      mesaZona: body.mesaZona,
      observaciones: body.observaciones,
    });

    return NextResponse.json({ data: pedido }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
