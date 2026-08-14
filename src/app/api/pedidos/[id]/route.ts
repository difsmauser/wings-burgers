import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return { url, key };
}

/**
 * GET /api/pedidos/[id]
 * Obtiene un pedido por su ID con detalles y nombres de producto.
 * Usa fetch directo a Supabase REST (sin SDK cache).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { url, key } = getSupabaseConfig();

    const res = await fetch(
      `${url}/rest/v1/pedido?id=eq.${id}&select=*,pedido_detalle(*,producto:producto_id(nombre))`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: { message: 'Error al obtener pedido' } }, { status: 500 });
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      return NextResponse.json({ error: { message: 'Pedido no encontrado' } }, { status: 404 });
    }

    const p = data[0];
    const pedido = {
      id: p.id,
      numero: p.numero,
      estado: p.estado,
      modalidad: p.modalidad,
      total: p.total,
      subtotal: p.subtotal,
      impuestos: p.impuestos,
      mesaZona: p.mesa_zona,
      observaciones: p.observaciones,
      estadoPago: p.estado_pago,
      metodoPago: p.metodo_pago,
      meseroId: p.mesero_id,
      meseroNombre: p.mesero_nombre,
      clienteId: p.cliente_id,
      creadoEn: p.creado_en,
      actualizadoEn: p.actualizado_en,
      items: (Array.isArray(p.pedido_detalle) ? p.pedido_detalle : []).map((d: Record<string, unknown>) => ({
        productoId: d.producto_id,
        nombre: (d.producto as Record<string, unknown> | null)?.nombre || 'Producto',
        cantidad: d.cantidad,
        precioUnitario: d.precio_unitario,
        precioTotal: d.precio_total,
        comentario: d.comentario,
        personalizaciones: d.personalizaciones ?? [],
      })),
    };

    return NextResponse.json({ data: pedido }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pedidos/[id]
 * Actualiza estado, pago, y/o mesero de un pedido.
 * Usa fetch directo a Supabase REST (sin SDK cache).
 * Valida transiciones de estado antes de actualizar.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { url, key } = getSupabaseConfig();

    // Handle estado_pago, metodo_pago, mesero updates
    if (body.estadoPago || body.metodoPago || body.meseroId !== undefined || body.meseroNombre !== undefined) {
      const updateFields: Record<string, unknown> = {};
      if (body.estadoPago) updateFields.estado_pago = body.estadoPago;
      if (body.metodoPago) updateFields.metodo_pago = body.metodoPago;
      if (body.meseroId !== undefined) updateFields.mesero_id = body.meseroId;
      if (body.meseroNombre !== undefined) updateFields.mesero_nombre = body.meseroNombre;

      const updateRes = await fetch(`${url}/rest/v1/pedido?id=eq.${id}`, {
        method: 'PATCH',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(updateFields),
        cache: 'no-store',
      });

      if (!updateRes.ok) {
        return NextResponse.json({ error: { message: await updateRes.text() } }, { status: 500 });
      }

      if (!body.estado) {
        return NextResponse.json({ data: { id, ...updateFields } });
      }
    }

    // Handle order estado update
    if (body.estado) {
      const VALID_TRANSITIONS: Record<string, string[]> = {
        recibido: ['en_preparacion'],
        en_preparacion: ['empacado'],
        empacado: ['listo_para_servir', 'en_camino'],
        listo_para_servir: ['servido'],
        servido: [],
        en_camino: ['entregado'],
        entregado: [],
      };

      const targetEstado = body.estado === 'listo' ? 'listo_para_servir' : body.estado;

      if (!Object.keys(VALID_TRANSITIONS).includes(targetEstado) && !['servido', 'entregado'].includes(targetEstado)) {
        return NextResponse.json(
          { error: { code: 'ESTADO_INVALIDO', message: `Estado no válido: ${body.estado}` } },
          { status: 400 }
        );
      }

      // Read current state directly from DB
      const getRes = await fetch(`${url}/rest/v1/pedido?id=eq.${id}&select=estado`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      });
      const pedidoArr = await getRes.json();

      if (!pedidoArr || pedidoArr.length === 0) {
        return NextResponse.json({ error: { message: 'Pedido no encontrado' } }, { status: 404 });
      }

      const currentEstado = pedidoArr[0].estado;
      const allowed = VALID_TRANSITIONS[currentEstado] || [];

      if (!allowed.includes(targetEstado)) {
        return NextResponse.json(
          { error: { code: 'TRANSICION_ESTADO_INVALIDA', message: `No se puede cambiar de "${currentEstado}" a "${targetEstado}". Válidos: ${allowed.join(', ') || 'ninguno (estado terminal)'}` } },
          { status: 422 }
        );
      }

      // Update
      const updateRes = await fetch(`${url}/rest/v1/pedido?id=eq.${id}`, {
        method: 'PATCH',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ estado: targetEstado, actualizado_en: new Date().toISOString() }),
        cache: 'no-store',
      });

      if (!updateRes.ok) {
        return NextResponse.json({ error: { message: await updateRes.text() } }, { status: 500 });
      }

      return NextResponse.json({ data: { id, estado: targetEstado } });
    }

    return NextResponse.json(
      { error: { message: 'Se requiere al menos estado, estadoPago, o metodoPago' } },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Error' } },
      { status: 500 }
    );
  }
}
