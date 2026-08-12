import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/app/api/_lib/errorHandler';
import { getContainer } from '@/shared/container';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';
import { RecursoNoEncontradoError } from '@/shared/errors';
import { EstadoPedido } from '@/domain/value-objects';

/**
 * GET /api/pedidos/[id]
 * Obtiene un pedido por su ID.
 * Joins pedido_detalle with producto to include product names.
 * Requirements: 7.1
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('pedido')
      .select('*, pedido_detalle(*, producto:producto_id(nombre))')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new RecursoNoEncontradoError('Pedido', id);
      }
      throw new Error(error.message);
    }

    // Map to include product names in items
    const pedido = {
      id: data.id,
      numero: data.numero,
      estado: data.estado,
      modalidad: data.modalidad,
      total: data.total,
      subtotal: data.subtotal,
      impuestos: data.impuestos,
      mesaZona: data.mesa_zona,
      observaciones: data.observaciones,
      estadoPago: data.estado_pago,
      metodoPago: data.metodo_pago,
      meseroId: data.mesero_id,
      meseroNombre: data.mesero_nombre,
      clienteId: data.cliente_id,
      creadoEn: data.creado_en,
      actualizadoEn: data.actualizado_en,
      items: (Array.isArray(data.pedido_detalle) ? data.pedido_detalle : []).map((d: Record<string, unknown>) => ({
        productoId: d.producto_id,
        nombre: (d.producto as Record<string, unknown> | null)?.nombre || 'Producto',
        cantidad: d.cantidad,
        precioUnitario: d.precio_unitario,
        precioTotal: d.precio_total,
        comentario: d.comentario,
        personalizaciones: d.personalizaciones ?? [],
      })),
    };

    return NextResponse.json({ data: pedido });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/pedidos/[id]
 * Actualiza el estado de un pedido, estado de pago, y/o método de pago.
 * Body: { estado?: string, estadoPago?: string, metodoPago?: string }
 * Requirements: 7.4, 14.2
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const container = getContainer();
    const pedidoRepo = container.getPedidoRepository();

    // Handle estado_pago and metodo_pago updates (for Caja module)
    if (body.estadoPago || body.metodoPago || body.meseroId !== undefined || body.meseroNombre !== undefined) {
      const updateFields: Record<string, unknown> = {};
      if (body.estadoPago) updateFields.estado_pago = body.estadoPago;
      if (body.metodoPago) updateFields.metodo_pago = body.metodoPago;
      if (body.meseroId !== undefined) updateFields.mesero_id = body.meseroId;
      if (body.meseroNombre !== undefined) updateFields.mesero_nombre = body.meseroNombre;

      // Direct update via the repository's underlying client
      // Since the PedidoMapper.toPartialDb doesn't handle these fields,
      // we do a raw update through the repo's actualizar method with observaciones hack
      // Actually let's use the pedidoRepo.actualizar with the fields we can update
      const pedido = await pedidoRepo.obtenerPorId(id);
      if (!pedido) {
        throw new RecursoNoEncontradoError('Pedido', id);
      }

      // For payment status, we need to update the DB directly
      // Use the Supabase client directly for estado_pago and metodo_pago
      const client = createServerClient();
      const { error } = await client
        .from('pedido')
        .update(updateFields)
        .eq('id', id);

      if (error) {
        return NextResponse.json(
          { error: { code: 'UPDATE_ERROR', message: error.message } },
          { status: 500 }
        );
      }

      // If also updating estado (order status), handle it below
      if (!body.estado) {
        return NextResponse.json({ data: { id, ...updateFields } });
      }
    }

    // Handle order estado update
    if (body.estado) {
      const estadoMap: Record<string, EstadoPedido> = {
        recibido: EstadoPedido.RECIBIDO,
        en_preparacion: EstadoPedido.EN_PREPARACION,
        empacado: EstadoPedido.EMPACADO,
        listo_para_servir: EstadoPedido.LISTO_PARA_SERVIR,
        servido: EstadoPedido.SERVIDO,
        en_camino: EstadoPedido.EN_CAMINO,
        entregado: EstadoPedido.ENTREGADO,
      };

      // Also handle listo -> map to LISTO_PARA_SERVIR for local orders (cocina marks listo)
      const estadoKey = body.estado === 'listo' ? 'listo_para_servir' : body.estado;
      const nuevoEstado = estadoMap[estadoKey];

      if (!nuevoEstado) {
        return NextResponse.json(
          { error: { code: 'ESTADO_INVALIDO', message: `Estado no válido: ${body.estado}` } },
          { status: 400 }
        );
      }

      const useCase = container.getActualizarEstadoPedido();
      await useCase.ejecutar(id, nuevoEstado);

      return NextResponse.json({ data: { id, estado: body.estado } });
    }

    return NextResponse.json(
      { error: { code: 'CAMPOS_REQUERIDOS', message: 'Se requiere al menos estado, estadoPago, o metodoPago' } },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
