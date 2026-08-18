/**
 * Script de LIMPIEZA + FOTOS + PRUEBAS REALES
 * 
 * 1. Actualiza imagen_url de todos los productos (fotos de internet temporales)
 * 2. Limpia tablas: pedidos, inventario, gastos, meseros, clientes (NO toca productos ni categorías)
 * 3. Crea datos de prueba: meseros, mesas, pedidos en cocina, pedidos servidos, domicilios, bar
 * 
 * Ejecutar con:
 *   npx tsx src/scripts/limpieza-y-pruebas.ts
 * 
 * Requiere env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!serviceRoleKey || !supabaseUrl) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ============================================================
// PASO 1: Mapeo de fotos por nombre de producto (Unsplash temporales)
// ============================================================
const FOTOS: Record<string, string> = {
  // ALITAS
  'Alitas al Carbón (7 pzas)': 'https://images.unsplash.com/photo-1527477396000-e27163b4bfca?w=500&q=80',
  'Alitas con Papitas (7 pzas)': 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=500&q=80',
  'Alitas (7 piezas)': 'https://images.unsplash.com/photo-1527477396000-e27163b4bfca?w=500&q=80',
  'Alitas con Papitas': 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=500&q=80',
  'Alitas BBQ (10 pzas)': 'https://images.unsplash.com/photo-1527477396000-e27163b4bfca?w=500&q=80',
  'Alitas Búfalo (10 pzas)': 'https://images.unsplash.com/photo-1527477396000-e27163b4bfca?w=500&q=80',
  'Alitas Mango Habanero (10 pzas)': 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=500&q=80',
  'Alitas Parmesano (10 pzas)': 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=500&q=80',
  'Boneless (7 pzas)': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&q=80',
  'Boneless (7 piezas)': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&q=80',
  'Boneless con Papitas': 'https://images.unsplash.com/photo-1585325701165-351af55efb3e?w=500&q=80',

  // HAMBURGUESAS
  'Hamburguesa Sencilla': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
  'Hamburguesa Sencilla con Papitas': 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80',
  'Hamburguesa Especial': 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=80',
  'Hamburguesa Especial con Papitas': 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=500&q=80',
  'Hamburguesa Suprema': 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=500&q=80',
  'Hamburguesa Suprema con Papitas': 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80',
  'Hamburguesa BBQ': 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=500&q=80',
  'Hamburguesa Clásica': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500&q=80',
  'Hamburguesa Doble': 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&q=80',

  // COMBOS
  'Combo Especial': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&q=80',
  'Combo Alitas + Papas + Bebida': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&q=80',

  // COMPLEMENTOS
  'Dedos de Queso (5 pzas)': 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=500&q=80',
  'Dedos de Queso (5 piezas)': 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=500&q=80',
  'Dedos de Queso con Papitas': 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&q=80',
  'Aros de Cebolla (5 pzas)': 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=500&q=80',
  'Aros de Cebolla (5 piezas)': 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=500&q=80',
  'Aros de Cebolla con Papitas': 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&q=80',
  'Aros de Cebolla': 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=500&q=80',
  'Papas a la Francesa': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80',
  'Papas Francesas': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80',
  'Chicharrón Preparado': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80',

  // PLATILLOS
  'Enchiladas de Pollo': 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=500&q=80',
  'Enchiladas de Huevo': 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=500&q=80',
  'Enchiladas de Longaniza': 'https://images.unsplash.com/photo-1629385701021-fcd568a743e8?w=500&q=80',
  'Enchiladas de Milanesa': 'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?w=500&q=80',
  'Chilaquiles de Pollo': 'https://images.unsplash.com/photo-1585816777126-f4ed9950f8de?w=500&q=80',
  'Chilaquiles de Huevo': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&q=80',
  'Chilaquiles de Longaniza': 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=500&q=80',
  'Chilaquiles de Milanesa': 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?w=500&q=80',

  // BEBIDAS
  'Coca-Cola 600ml': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=500&q=80',
  'Limonada Natural 1L': 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500&q=80',
  'Agua Natural 600ml': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=500&q=80',
  'Cerveza Artesanal': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=500&q=80',
  'Cerveza Artesanal IPA': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=500&q=80',
  'Michelada': 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80',
  'Michelada Clasica': 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&q=80',
  'Margarita Frozen': 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=500&q=80',

  // BAR
  'Cerveza Clara': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=500&q=80',
  'Cerveza Oscura': 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&q=80',
  'Copa de Vino Tinto': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500&q=80',
  'Margarita': 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=500&q=80',
  'Shot de Tequila': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500&q=80',
};

// ============================================================
// PASO 2: Limpieza de tablas
// ============================================================
async function limpiarTablas() {
  console.log('\n🧹 PASO 2: Limpiando tablas (NO toca productos ni categorías)...\n');

  const dummy = '00000000-0000-0000-0000-000000000000';

  // PRIMERO: liberar mesas (quitar FK a pedidos)
  const { error: e3 } = await supabase.from('mesa').update({ estado: 'disponible', pedido_activo_id: null }).neq('id', dummy);
  console.log(e3 ? `  ✗ mesas: ${e3.message}` : '  ✓ mesas liberadas');

  // pedido_detalle
  const { error: e1 } = await supabase.from('pedido_detalle').delete().neq('id', dummy);
  console.log(e1 ? `  ✗ pedido_detalle: ${e1.message}` : '  ✓ pedido_detalle limpio');

  // pedidos (ahora sin FK bloqueando)
  const { error: e2 } = await supabase.from('pedido').delete().neq('id', dummy);
  console.log(e2 ? `  ✗ pedido: ${e2.message}` : '  ✓ pedidos eliminados');

  // clientes (ahora sin FK de pedidos)
  const { error: e7 } = await supabase.from('cliente').delete().neq('id', dummy);
  console.log(e7 ? `  ✗ clientes: ${e7.message}` : '  ✓ clientes eliminados');

  // inventario
  const { error: e4 } = await supabase.from('articulo_inventario').delete().neq('id', dummy);
  console.log(e4 ? `  ✗ inventario: ${e4.message}` : '  ✓ inventario limpio');

  // gastos
  const { error: e5 } = await supabase.from('gasto').delete().neq('id', dummy);
  console.log(e5 ? `  ✗ gastos: ${e5.message}` : '  ✓ gastos eliminados');

  // meseros
  const { error: e6 } = await supabase.from('mesero').delete().neq('id', dummy);
  console.log(e6 ? `  ✗ meseros: ${e6.message}` : '  ✓ meseros eliminados');

  // Borrar mesas para recrearlas
  const { error: e8 } = await supabase.from('mesa').delete().neq('id', dummy);
  console.log(e8 ? `  ✗ mesas delete: ${e8.message}` : '  ✓ mesas eliminadas');

  // Borrar QR codes
  await supabase.from('qr_mesa').delete().neq('id', dummy);

  // Crear mesas nuevas (5 mesas)
  const mesasNuevas = [
    { nombre: 'Mesa 1', zona: 'Interior', capacidad: 4, estado: 'disponible', activa: true, pos_x: 15, pos_y: 25 },
    { nombre: 'Mesa 2', zona: 'Interior', capacidad: 4, estado: 'disponible', activa: true, pos_x: 35, pos_y: 25 },
    { nombre: 'Mesa 3', zona: 'Terraza', capacidad: 6, estado: 'disponible', activa: true, pos_x: 55, pos_y: 25 },
    { nombre: 'Mesa 4', zona: 'Terraza', capacidad: 4, estado: 'disponible', activa: true, pos_x: 15, pos_y: 65 },
    { nombre: 'Mesa 5', zona: 'Bar', capacidad: 2, estado: 'disponible', activa: true, pos_x: 35, pos_y: 65 },
  ];
  const { data: mesasCreated, error: eMesas } = await supabase.from('mesa').insert(mesasNuevas).select();
  console.log(eMesas ? `  ✗ crear mesas: ${eMesas.message}` : `  ✓ ${mesasCreated?.length} mesas creadas`);

  // Crear QR codes para mesas
  if (mesasCreated) {
    for (const m of mesasCreated) {
      const qrCodigo = m.nombre.replace(/\s+/g, '-').toUpperCase();
      await supabase.from('qr_mesa').upsert({
        codigo: qrCodigo,
        mesa_zona: `${m.nombre} - ${m.zona}`,
        activo: true,
      }, { onConflict: 'codigo' });
    }
    console.log('  ✓ QR codes creados para mesas');
  }

  console.log('\n  ✅ Limpieza completa');
}

// ============================================================
// PASO 3: Crear datos de prueba
// ============================================================
async function crearDatosPrueba() {
  console.log('\n🧪 PASO 3: Creando datos de prueba...\n');

  // 3a. Crear meseros
  console.log('  📋 Creando meseros...');
  const meseros = [
    { nombre: 'Carlos', telefono: '5512345678', pin: '1234', activo: true },
    { nombre: 'María', telefono: '5598765432', pin: '5678', activo: true },
    { nombre: 'Pedro', telefono: '5511223344', pin: '0000', activo: true },
  ];
  const { data: meserosData } = await supabase.from('mesero').insert(meseros).select();
  console.log(`     ✓ ${meserosData?.length || 0} meseros creados`);

  // 3b. Obtener productos para hacer pedidos
  const { data: productos } = await supabase.from('producto').select('id, nombre, precio, categoria').eq('activo', true);
  if (!productos || productos.length === 0) {
    console.log('  ❌ No hay productos para crear pedidos');
    return;
  }
  console.log(`     ✓ ${productos.length} productos disponibles`);

  // 3c. Obtener mesas
  const { data: mesas } = await supabase.from('mesa').select('id, nombre, zona');
  if (!mesas || mesas.length === 0) {
    console.log('  ❌ No hay mesas registradas');
    return;
  }
  console.log(`     ✓ ${mesas.length} mesas disponibles`);

  // Helper: pick random products for an order
  const pickItems = (count: number) => {
    const items: Array<{ producto_id: string; nombre: string; cantidad: number; precio_unitario: number }> = [];
    const shuffled = [...productos].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      items.push({
        producto_id: shuffled[i].id,
        nombre: shuffled[i].nombre,
        cantidad: Math.ceil(Math.random() * 3),
        precio_unitario: shuffled[i].precio,
      });
    }
    return items;
  };

  const calcTotal = (items: Array<{ cantidad: number; precio_unitario: number }>) =>
    items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  const mesero1 = meserosData?.[0];
  const mesero2 = meserosData?.[1];

  // 3d. Pedidos en COCINA (en_preparacion) — mesas ocupadas
  console.log('\n  🔥 Creando pedidos en cocina (en_preparacion)...');
  const pedidosCocina = [
    { mesa: mesas[0], items: pickItems(3), mesero: mesero1 },
    { mesa: mesas[1], items: pickItems(2), mesero: mesero2 },
    { mesa: mesas[2], items: pickItems(4), mesero: mesero1 },
  ];

  for (const pc of pedidosCocina) {
    const total = calcTotal(pc.items);
    const numero = `PED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const { data: pedido, error } = await supabase.from('pedido').insert({
      numero,
      estado: 'en_preparacion',
      estado_pago: 'pendiente',
      modalidad: 'local',
      mesa_zona: `${pc.mesa.nombre} - ${pc.mesa.zona}`,
      mesero_id: pc.mesero?.id || null,
      mesero_nombre: pc.mesero?.nombre || null,
      subtotal: total,
      impuestos: 0,
      total,
      observaciones: '[MESERO] Pedido tomado por mesero',
      creado_en: new Date(Date.now() - Math.random() * 1800000).toISOString(),
      actualizado_en: new Date().toISOString(),
    }).select().single();

    if (error) { console.log(`     ✗ Error: ${error.message}`); continue; }

    // Insert pedido_detalle
    const detallesCocina = pc.items.map(i => ({
      pedido_id: pedido.id,
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      precio_total: i.cantidad * i.precio_unitario,
      personalizaciones: [],
    }));
    await supabase.from('pedido_detalle').insert(detallesCocina);

    // Ocupar mesa
    await supabase.from('mesa').update({ estado: 'ocupada', pedido_activo_id: pedido.id }).eq('id', pc.mesa.id);
    console.log(`     ✓ #${numero.slice(-5)} — ${pc.mesa.nombre} (${pc.mesa.zona}) — $${total} — EN COCINA`);
  }

  // 3e. Pedidos LISTO PARA SERVIR (para que el mesero vea)
  console.log('\n  🍽️  Creando pedidos listos para servir...');
  const pedidosListos = [
    { mesa: mesas[3] || mesas[0], items: pickItems(2), mesero: mesero2 },
    { mesa: mesas[4] || mesas[1], items: pickItems(3), mesero: mesero1 },
  ];

  for (const pl of pedidosListos) {
    const total = calcTotal(pl.items);
    const numero = `PED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const { data: pedido, error } = await supabase.from('pedido').insert({
      numero,
      estado: 'listo_para_servir',
      estado_pago: 'pendiente',
      modalidad: 'local',
      mesa_zona: `${pl.mesa.nombre} - ${pl.mesa.zona}`,
      mesero_id: pl.mesero?.id || null,
      mesero_nombre: pl.mesero?.nombre || null,
      subtotal: total,
      impuestos: 0,
      total,
      observaciones: '[MESERO] Pedido listo',
      creado_en: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      actualizado_en: new Date().toISOString(),
    }).select().single();

    if (error) { console.log(`     ✗ Error: ${error.message}`); continue; }
    const detallesListo = pl.items.map(i => ({
      pedido_id: pedido.id,
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      precio_total: i.cantidad * i.precio_unitario,
      personalizaciones: [],
    }));
    await supabase.from('pedido_detalle').insert(detallesListo);
    await supabase.from('mesa').update({ estado: 'ocupada', pedido_activo_id: pedido.id }).eq('id', pl.mesa.id);
    console.log(`     ✓ #${numero.slice(-5)} — ${pl.mesa.nombre} — $${total} — LISTO PARA SERVIR`);
  }

  // 3f. Pedidos a DOMICILIO (recibido + en_preparacion)
  console.log('\n  🛵 Creando pedidos a domicilio...');
  const domicilios = [
    { items: pickItems(3), cliente: 'Juan García', direccion: 'Av. Reforma 123, Col. Centro', estado: 'recibido' },
    { items: pickItems(2), cliente: 'Ana López', direccion: 'Calle 5 de Mayo 456, Col. Norte', estado: 'en_preparacion' },
    { items: pickItems(4), cliente: 'Roberto Sánchez', direccion: 'Blvd. Hidalgo 789, Col. Sur', estado: 'empacado' },
  ];

  for (const dom of domicilios) {
    const total = calcTotal(dom.items);
    const numero = `DOM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const { data: pedidoDom, error } = await supabase.from('pedido').insert({
      numero,
      estado: dom.estado,
      estado_pago: 'pendiente',
      modalidad: 'domicilio',
      subtotal: total,
      impuestos: 0,
      total,
      observaciones: `[DOMICILIO] Cliente: ${dom.cliente} — Dir: ${dom.direccion}`,
      creado_en: new Date(Date.now() - Math.random() * 2400000).toISOString(),
      actualizado_en: new Date().toISOString(),
    }).select().single();

    if (error) { console.log(`     ✗ Error: ${error.message}`); continue; }
    const detallesDom = dom.items.map(i => ({
      pedido_id: pedidoDom.id,
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      precio_total: i.cantidad * i.precio_unitario,
      personalizaciones: [],
    }));
    await supabase.from('pedido_detalle').insert(detallesDom);
    console.log(`     ✓ #${numero.slice(-5)} — ${dom.cliente} — $${total} — ${dom.estado.toUpperCase()}`);
  }

  // 3g. Pedidos de BAR (en_preparacion)
  console.log('\n  🍺 Creando pedidos de bar...');
  const barProducts = productos.filter(p => p.categoria === 'bar' || p.nombre.includes('Cerveza') || p.nombre.includes('Michelada'));
  if (barProducts.length > 0) {
    const barItems = barProducts.slice(0, 3).map(p => ({
      producto_id: p.id,
      nombre: p.nombre,
      cantidad: Math.ceil(Math.random() * 2),
      precio_unitario: p.precio,
    }));
    const total = calcTotal(barItems);
    const numero = `BAR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const mesaBar = mesas[mesas.length - 1] || mesas[0];

    const { data: pedidoBar, error } = await supabase.from('pedido').insert({
      numero,
      estado: 'en_preparacion',
      estado_pago: 'pendiente',
      modalidad: 'local',
      mesa_zona: `${mesaBar.nombre} - ${mesaBar.zona}`,
      mesero_id: mesero1?.id || null,
      mesero_nombre: mesero1?.nombre || null,
      subtotal: total,
      impuestos: 0,
      total,
      observaciones: '[MESERO] Pedido de bar',
      creado_en: new Date(Date.now() - 600000).toISOString(),
      actualizado_en: new Date().toISOString(),
    }).select().single();

    if (error) { console.log(`     ✗ Error: ${error.message}`); }
    else {
      const detallesBar = barItems.map(i => ({
        pedido_id: pedidoBar.id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        precio_total: i.cantidad * i.precio_unitario,
        personalizaciones: [],
      }));
      await supabase.from('pedido_detalle').insert(detallesBar);
      await supabase.from('mesa').update({ estado: 'ocupada', pedido_activo_id: pedidoBar.id }).eq('id', mesaBar.id);
      console.log(`     ✓ #${numero.slice(-5)} — ${mesaBar.nombre} (Bar) — $${total} — EN PREPARACIÓN`);
    }
  } else {
    console.log('     ⚠️  No hay productos de bar, saltando...');
  }

  // 3h. Inventario básico
  console.log('\n  📦 Creando inventario básico...');
  const inventario = [
    { nombre: 'Pollo crudo', cantidad: 25, unidad_medida: 'kg', nivel_minimo: 10 },
    { nombre: 'Carne de res', cantidad: 15, unidad_medida: 'kg', nivel_minimo: 8 },
    { nombre: 'Pan para hamburguesa', cantidad: 50, unidad_medida: 'piezas', nivel_minimo: 20 },
    { nombre: 'Papas congeladas', cantidad: 30, unidad_medida: 'kg', nivel_minimo: 10 },
    { nombre: 'Aceite para freír', cantidad: 8, unidad_medida: 'litros', nivel_minimo: 5 },
    { nombre: 'Salsa BBQ', cantidad: 3, unidad_medida: 'litros', nivel_minimo: 4 },
    { nombre: 'Queso americano', cantidad: 5, unidad_medida: 'kg', nivel_minimo: 3 },
    { nombre: 'Lechuga', cantidad: 4, unidad_medida: 'kg', nivel_minimo: 3 },
    { nombre: 'Cerveza Corona (caja)', cantidad: 2, unidad_medida: 'cajas', nivel_minimo: 3 },
    { nombre: 'Refresco Coca-Cola', cantidad: 24, unidad_medida: 'piezas', nivel_minimo: 12 },
    { nombre: 'Servilletas', cantidad: 500, unidad_medida: 'piezas', nivel_minimo: 200 },
    { nombre: 'Desechables (vasos)', cantidad: 80, unidad_medida: 'piezas', nivel_minimo: 50 },
  ];

  const { data: invData, error: invError } = await supabase.from('articulo_inventario').insert(inventario).select();
  if (invError) console.log(`     ✗ inventario: ${invError.message}`);
  else console.log(`     ✓ ${invData?.length} artículos de inventario creados`);

  // Resumen final
  console.log('\n' + '═'.repeat(50));
  console.log('📊 RESUMEN DE PRUEBAS:');
  console.log('═'.repeat(50));
  console.log(`  🔥 Cocina: 3 pedidos en preparación (mesas ocupadas)`);
  console.log(`  🍽️  Listos: 2 pedidos listos para servir`);
  console.log(`  🛵 Domicilio: 3 pedidos (recibido, en_preparacion, empacado)`);
  console.log(`  🍺 Bar: 1 pedido en preparación`);
  console.log(`  🧑‍🍳 Meseros: Carlos (1234), María (5678), Pedro (0000)`);
  console.log(`  📦 Inventario: 12 artículos (algunos en alerta)`);
  console.log('═'.repeat(50));
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  🍗 A-LA BURGUER — Limpieza + Pruebas Reales   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // PASO 1: Actualizar fotos
  console.log('🖼️  PASO 1: Actualizando fotos de productos...\n');
  const { data: allProducts } = await supabase.from('producto').select('id, nombre');
  let fotosUpdated = 0;
  let fotosNotFound = 0;

  for (const prod of allProducts ?? []) {
    const url = FOTOS[prod.nombre];
    if (url) {
      const { error } = await supabase.from('producto').update({ imagen_url: url }).eq('id', prod.id);
      if (!error) { fotosUpdated++; console.log(`  ✓ ${prod.nombre}`); }
      else console.log(`  ✗ ${prod.nombre}: ${error.message}`);
    } else {
      fotosNotFound++;
      console.log(`  ⚠️  Sin foto mapeada: "${prod.nombre}"`);
    }
  }
  console.log(`\n  → ${fotosUpdated} fotos actualizadas, ${fotosNotFound} sin mapeo`);

  // PASO 2: Limpieza
  await limpiarTablas();

  // PASO 3: Pruebas
  await crearDatosPrueba();

  console.log('\n✅ ¡Todo listo! La app debería mostrar datos de prueba.');
  console.log('   - Cocina: pedidos en preparación');
  console.log('   - Mesero: pedidos listos para servir');
  console.log('   - Domicilio: 3 pedidos en diferentes estados');
  console.log('   - Dashboard: actividad reciente con datos');
}

main().catch(console.error);
