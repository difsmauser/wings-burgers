import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pedidos/estacion?tipo=bar|cocina
 * Returns pedidos that have items belonging to the specified station's categories.
 * Each pedido only includes the items relevant to that station.
 * 
 * - tipo=bar: only items with category 'bar'
 * - tipo=cocina: items with categories NOT 'bar' (alitas, hamburguesas, platillos, complementos, combos)
 * 
 * Also returns item-level status (item_estado) stored in pedido_detalle for per-station tracking.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'cocina';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Fetch active pedidos with their items + product category
    const estados = ['recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido'];
    const allPedidos: Array<Record<string, unknown>> = [];

    for (const estado of estados) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/pedido?estado=eq.${estado}&select=id,numero,estado,modalidad,canal,total,mesa_zona,observaciones,mesero_nombre,creado_en,actualizado_en,pedido_detalle(id,producto_id,cantidad,precio_unitario,comentario,personalizaciones,item_estado,producto:producto_id(nombre,categoria))&order=creado_en.asc`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        allPedidos.push(...(data || []));
      }
    }

    // Filter: only pedidos that have items for this station
    const barCategories = ['bar', 'bebidas'];
    const isBarItem = (item: Record<string, unknown>) => {
      const producto = item.producto as Record<string, unknown> | null;
      return barCategories.includes((producto?.categoria as string) || '');
    };

    const filtered = allPedidos
      .map(pedido => {
        const detalles = (pedido.pedido_detalle as Array<Record<string, unknown>>) || [];
        const stationItems = tipo === 'bar'
          ? detalles.filter(isBarItem)
          : detalles.filter(d => !isBarItem(d));

        if (stationItems.length === 0) return null;

        return {
          id: pedido.id,
          numero: pedido.numero,
          estado: pedido.estado,
          modalidad: pedido.modalidad,
          canal: pedido.canal || null,
          total: pedido.total,
          mesaZona: pedido.mesa_zona,
          meseroNombre: pedido.mesero_nombre,
          observaciones: pedido.observaciones,
          creadoEn: pedido.creado_en,
          items: stationItems.map(d => ({
            id: d.id,
            productoId: d.producto_id,
            nombre: (d.producto as Record<string, unknown> | null)?.nombre || 'Producto',
            categoria: (d.producto as Record<string, unknown> | null)?.categoria || '',
            cantidad: d.cantidad,
            precioUnitario: d.precio_unitario,
            comentario: d.comentario,
            personalizaciones: d.personalizaciones,
            itemEstado: d.item_estado || 'pendiente', // pendiente | preparando | listo
          })),
          // Determine station-level status based on items
          stationEstado: (() => {
            const itemEstados = stationItems.map(d => (d.item_estado as string) || 'pendiente');
            if (itemEstados.every(e => e === 'listo')) return 'listo';
            if (itemEstados.some(e => e === 'preparando' || e === 'listo')) return 'preparando';
            return 'pendiente';
          })(),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data: filtered }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}

/**
 * PUT /api/pedidos/estacion
 * Updates item-level status for a specific station.
 * Body: { itemId: string, itemEstado: 'pendiente' | 'preparando' | 'listo' }
 * 
 * When ALL items across ALL stations are 'listo', automatically advances the pedido to listo_para_servir.
 */
export async function PUT(request: NextRequest) {
  try {
    const { itemId, itemEstado } = await request.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

    // 1. Update the item status
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/pedido_detalle?id=eq.${itemId}`, {
      method: 'PATCH', headers, cache: 'no-store',
      body: JSON.stringify({ item_estado: itemEstado }),
    });

    if (!updateRes.ok) {
      return NextResponse.json({ error: { message: await updateRes.text() } }, { status: 500 });
    }

    // 2. Check if ALL items in this pedido are now 'listo'
    // First get the pedido_id for this item
    const itemRes = await fetch(`${supabaseUrl}/rest/v1/pedido_detalle?id=eq.${itemId}&select=pedido_id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    });
    const itemData = await itemRes.json();
    if (!itemData || itemData.length === 0) {
      return NextResponse.json({ data: { success: true } });
    }

    const pedidoId = itemData[0].pedido_id;

    // Get ALL items for this pedido
    const allItemsRes = await fetch(`${supabaseUrl}/rest/v1/pedido_detalle?pedido_id=eq.${pedidoId}&select=item_estado`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    });
    const allItems = await allItemsRes.json();

    // 3. If ALL items are 'listo', advance pedido through proper state chain
    //    For LOCAL/RETIRO: advance to listo_para_servir and auto-assign mesero
    //    For DOMICILIO: advance only to empacado (repartidor picks it up from there)
    const allListo = (allItems || []).every((i: { item_estado: string }) => i.item_estado === 'listo');
    if (allListo && allItems.length > 0) {
      // Get current pedido state and modalidad
      const pedidoRes = await fetch(`${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}&select=estado,modalidad,mesero_id,mesero_nombre`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
      });
      const pedidoData = await pedidoRes.json();
      const pedido = pedidoData?.[0];

      if (pedido) {
        const isDomicilio = (pedido.modalidad || '').toLowerCase() === 'domicilio';
        // Target state: empacado for domicilio, listo_para_servir for local/retiro
        const targetState = isDomicilio ? 'empacado' : 'listo_para_servir';

        // Build the state chain from current to target
        const stateChain: string[] = [];
        const fullChain = isDomicilio
          ? ['en_preparacion', 'empacado']
          : ['en_preparacion', 'empacado', 'listo_para_servir'];

        const currentIdx = fullChain.indexOf(pedido.estado);
        const targetIdx = fullChain.indexOf(targetState);

        if (targetIdx >= 0) {
          // Add states from current+1 to target (inclusive)
          const startFrom = currentIdx >= 0 ? currentIdx + 1 : 0;
          for (let i = startFrom; i <= targetIdx; i++) {
            stateChain.push(fullChain[i]);
          }
        }

        // Apply state transitions
        for (const nextState of stateChain) {
          await fetch(`${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}`, {
            method: 'PATCH', headers, cache: 'no-store',
            body: JSON.stringify({ estado: nextState, actualizado_en: new Date().toISOString() }),
          });
        }

        // Auto-assign a mesero only for LOCAL/RETIRO orders when reaching listo_para_servir
        if (!isDomicilio && !pedido.mesero_id && !pedido.mesero_nombre) {
          try {
            const meserosRes = await fetch(`${supabaseUrl}/rest/v1/mesero?activo=eq.true&select=id,nombre&order=nombre.asc`, {
              headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
            });
            const meseros = await meserosRes.json();

            if (meseros && meseros.length > 0) {
              const assignmentsRes = await fetch(`${supabaseUrl}/rest/v1/pedido?estado=eq.listo_para_servir&select=mesero_id`, {
                headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
              });
              const assignments = await assignmentsRes.json() || [];

              const countMap: Record<string, number> = {};
              for (const m of meseros) countMap[m.id] = 0;
              for (const a of assignments) {
                if (a.mesero_id && countMap[a.mesero_id] !== undefined) countMap[a.mesero_id]++;
              }

              const sorted = meseros.sort((a: { id: string }, b: { id: string }) =>
                (countMap[a.id] || 0) - (countMap[b.id] || 0)
              );
              const chosen = sorted[0];

              await fetch(`${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}`, {
                method: 'PATCH', headers, cache: 'no-store',
                body: JSON.stringify({ mesero_id: chosen.id, mesero_nombre: chosen.nombre }),
              });
            }
          } catch {
            // Mesero assignment is best-effort
          }
        }
      }
    } else {
      // At least one item is being prepared, ensure pedido is in en_preparacion
      const somePrep = (allItems || []).some((i: { item_estado: string }) => i.item_estado === 'preparando' || i.item_estado === 'listo');
      if (somePrep) {
        await fetch(`${supabaseUrl}/rest/v1/pedido?id=eq.${pedidoId}&estado=eq.recibido`, {
          method: 'PATCH', headers, cache: 'no-store',
          body: JSON.stringify({ estado: 'en_preparacion', actualizado_en: new Date().toISOString() }),
        });
      }
    }

    return NextResponse.json({ data: { success: true, allListo } });
  } catch (e) {
    return NextResponse.json({ error: { message: (e as Error).message } }, { status: 500 });
  }
}
